/**
 * Members API Route
 *
 * GET  /api/projects/[id]/members - List all members of a project
 * POST /api/projects/[id]/members - Add a member directly (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/members
 * List all members of a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Check if user has access to the project (owner or member)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user is owner or member
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
    })

    const isOwner = project.userId === session.user.id

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    })

    // Determine current user's role
    const currentUserMember = members.find((m) => m.userId === session.user.id)
    const currentUserRole = isOwner ? 'owner' : currentUserMember?.role || 'member'

    return NextResponse.json({
      members,
      currentUserRole,
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
