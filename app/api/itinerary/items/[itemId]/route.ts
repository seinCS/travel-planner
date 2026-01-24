/**
 * Itinerary Item API Routes
 *
 * PUT    /api/itinerary/items/[itemId] - 일정 항목 수정
 * DELETE /api/itinerary/items/[itemId] - 일정 항목 삭제
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateItemSchema = z.object({
  order: z.number().int().min(0).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  note: z.string().nullable().optional(),
})

// PUT /api/itinerary/items/[itemId]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await params

    // Verify item ownership through itinerary -> project
    const item = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      include: {
        day: {
          include: {
            itinerary: {
              include: { project: true },
            },
          },
        },
      },
    })

    if (!item || item.day.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateItemSchema.parse(body)

    const updateData: {
      order?: number
      startTime?: string | null
      note?: string | null
    } = {}

    if (validated.order !== undefined) updateData.order = validated.order
    if (validated.startTime !== undefined) updateData.startTime = validated.startTime
    if (validated.note !== undefined) updateData.note = validated.note

    const updatedItem = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: updateData,
      include: { place: true },
    })

    return NextResponse.json({ item: updatedItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error updating itinerary item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/itinerary/items/[itemId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await params

    // Verify item ownership through itinerary -> project
    const item = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      include: {
        day: {
          include: {
            itinerary: {
              include: { project: true },
            },
          },
        },
      },
    })

    if (!item || item.day.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    await prisma.itineraryItem.delete({
      where: { id: itemId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting itinerary item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
