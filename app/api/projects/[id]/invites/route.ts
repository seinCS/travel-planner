/**
 * Invites API Route
 *
 * GET  /api/projects/[id]/invites - Get current invite info
 * POST /api/projects/[id]/invites - Create/regenerate invite link
 * DELETE /api/projects/[id]/invites - Disable invite link
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createInviteSchema = z.object({
  role: z.enum(['editor', 'viewer']).default('editor'),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
})

/**
 * Generate a secure random token
 */
function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * GET /api/projects/[id]/invites
 * Get current invite status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Only owner can view invite settings
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        userId: true,
        inviteToken: true,
        inviteEnabled: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!project.inviteEnabled || !project.inviteToken) {
      return NextResponse.json({
        invite: null,
        inviteEnabled: false,
      })
    }

    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${project.inviteToken}`

    return NextResponse.json({
      invite: {
        token: project.inviteToken,
        isActive: project.inviteEnabled,
      },
      inviteUrl,
      inviteEnabled: true,
    })
  } catch (error) {
    console.error('Error getting invite info:', error)
    return NextResponse.json(
      { error: 'Failed to get invite info' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/invites
 * Create or regenerate invite link
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Parse optional body
    let role = 'editor'
    try {
      const body = await request.json()
      const validated = createInviteSchema.parse(body)
      role = validated.role
    } catch {
      // Use defaults if no body or invalid body
    }

    // Only owner can create invites
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only project owner can create invites' },
        { status: 403 }
      )
    }

    // Generate new invite token
    const inviteToken = generateInviteToken()

    // Update project with new invite token
    await prisma.project.update({
      where: { id: projectId },
      data: {
        inviteToken,
        inviteEnabled: true,
      },
    })

    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${inviteToken}`

    return NextResponse.json({
      invite: {
        token: inviteToken,
        role,
        isActive: true,
      },
      inviteUrl,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id]/invites
 * Disable invite link
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Only owner can disable invites
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only project owner can disable invites' },
        { status: 403 }
      )
    }

    // Disable invite
    await prisma.project.update({
      where: { id: projectId },
      data: {
        inviteToken: null,
        inviteEnabled: false,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error disabling invite:', error)
    return NextResponse.json(
      { error: 'Failed to disable invite' },
      { status: 500 }
    )
  }
}
