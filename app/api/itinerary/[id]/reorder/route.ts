/**
 * Itinerary Reorder API Routes
 *
 * PUT /api/itinerary/[id]/reorder - 일정 항목 순서 변경
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const reorderItemsSchema = z.object({
  dayId: z.string(),
  itemIds: z.array(z.string()),
})

// PUT /api/itinerary/[id]/reorder
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: itineraryId } = await params

    // Verify itinerary ownership through project
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: { project: true },
    })

    if (!itinerary || itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = reorderItemsSchema.parse(body)

    // Verify day belongs to this itinerary
    const day = await prisma.itineraryDay.findFirst({
      where: { id: validated.dayId, itineraryId },
    })

    if (!day) {
      return NextResponse.json({ error: 'Day not found in this itinerary' }, { status: 404 })
    }

    // Use transaction to update all items atomically
    await prisma.$transaction(
      validated.itemIds.map((id, index) =>
        prisma.itineraryItem.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    // Return updated items
    const items = await prisma.itineraryItem.findMany({
      where: { dayId: validated.dayId },
      orderBy: { order: 'asc' },
      include: { place: true },
    })

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error reordering itinerary items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
