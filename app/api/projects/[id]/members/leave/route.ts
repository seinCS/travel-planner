/**
 * Leave Project API Route
 *
 * POST /api/projects/[id]/members/leave - Leave a project (non-owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { realtimeBroadcast } from '@/infrastructure/services/realtime'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/projects/[id]/members/leave
 * Leave the project (current user)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Check project exists and user is not owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Owner cannot leave their own project
    if (project.userId === session.user.id) {
      return NextResponse.json(
        { error: 'Project owner cannot leave. Transfer ownership first.' },
        { status: 400 }
      )
    }

    // Find the membership
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'You are not a member of this project' },
        { status: 404 }
      )
    }

    // Delete the membership
    await prisma.projectMember.delete({
      where: { id: member.id },
    })

    // Broadcast realtime event
    realtimeBroadcast.memberLeft(projectId, session.user.id, session.user.id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error leaving project:', error)
    return NextResponse.json(
      { error: 'Failed to leave project' },
      { status: 500 }
    )
  }
}
