/**
 * Member Management API Route
 *
 * DELETE /api/projects/[id]/members/[userId] - Remove a member (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { realtimeBroadcast } from '@/infrastructure/services/realtime'

interface RouteParams {
  params: Promise<{ id: string; userId: string }>
}

/**
 * DELETE /api/projects/[id]/members/[userId]
 * Remove a member from the project (owner only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, userId: targetUserId } = await params

    // Only project owner can remove members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only project owner can remove members' },
        { status: 403 }
      )
    }

    // Cannot remove the owner
    if (targetUserId === project.userId) {
      return NextResponse.json(
        { error: 'Cannot remove project owner' },
        { status: 400 }
      )
    }

    // Find and delete the membership
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    await prisma.projectMember.delete({
      where: { id: member.id },
    })

    // Broadcast realtime event
    realtimeBroadcast.memberLeft(projectId, targetUserId, session.user.id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
