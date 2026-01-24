/**
 * Invite Info API Route
 *
 * GET /api/invites/[token] - Get invite information (public, for showing invite details)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/invites/[token]
 * Get public invite information
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    // Find project with this invite token
    const project = await prisma.project.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        destination: true,
        inviteEnabled: true,
        user: {
          select: {
            name: true,
          },
        },
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

    return NextResponse.json({
      invite: {
        projectName: project.name,
        projectDestination: project.destination,
        inviterName: project.user.name,
        isValid: true,
      },
    })
  } catch (error) {
    console.error('Error getting invite info:', error)
    return NextResponse.json(
      { error: 'Failed to get invite info' },
      { status: 500 }
    )
  }
}
