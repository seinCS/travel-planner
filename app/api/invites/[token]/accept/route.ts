/**
 * Accept Invite API Route
 *
 * POST /api/invites/[token]/accept - Accept an invite and join the project
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * POST /api/invites/[token]/accept
 * Accept invite and join project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await params

    // Find project with this invite token
    const project = await prisma.project.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        userId: true,
        inviteEnabled: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Invite not found or expired' },
        { status: 404 }
      )
    }

    if (!project.inviteEnabled) {
      return NextResponse.json(
        { error: 'This invite link has been disabled' },
        { status: 410 }
      )
    }

    // Check if user is already the owner
    if (project.userId === session.user.id) {
      return NextResponse.json(
        { error: 'You are the owner of this project' },
        { status: 400 }
      )
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: session.user.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        {
          error: 'You are already a member of this project',
          member: existingMember,
          projectId: project.id,
        },
        { status: 409 }
      )
    }

    // Create membership
    const member = await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        role: 'member',
      },
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
    })

    return NextResponse.json({
      member,
      projectId: project.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}
