/**
 * Transfer Ownership API Route
 *
 * POST /api/projects/[id]/members/transfer - Transfer project ownership
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

const transferSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
})

/**
 * POST /api/projects/[id]/members/transfer
 * Transfer project ownership to another member
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { newOwnerId } = transferSchema.parse(body)

    // Only current owner can transfer
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only project owner can transfer ownership' },
        { status: 403 }
      )
    }

    // Cannot transfer to yourself
    if (newOwnerId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot transfer ownership to yourself' },
        { status: 400 }
      )
    }

    // Verify new owner is a member
    const newOwnerMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: newOwnerId,
        },
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

    if (!newOwnerMember) {
      return NextResponse.json(
        { error: 'New owner must be a project member' },
        { status: 400 }
      )
    }

    // Perform the transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update project owner
      await tx.project.update({
        where: { id: projectId },
        data: { userId: newOwnerId },
      })

      // Update new owner's role to owner
      const updatedMember = await tx.projectMember.update({
        where: { id: newOwnerMember.id },
        data: { role: 'owner' },
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

      // Add previous owner as member (if not already)
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId,
            userId: session.user.id,
          },
        },
        update: { role: 'member' },
        create: {
          projectId,
          userId: session.user.id,
          role: 'member',
        },
      })

      return updatedMember
    })

    return NextResponse.json({ member: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error transferring ownership:', error)
    return NextResponse.json(
      { error: 'Failed to transfer ownership' },
      { status: 500 }
    )
  }
}
