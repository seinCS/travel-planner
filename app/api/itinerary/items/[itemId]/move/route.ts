import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { canEditProject } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'

const moveItemSchema = z.object({
  targetDayId: z.string().min(1),
  order: z.number().int().min(0).optional(),
})

interface RouteParams {
  params: Promise<{ itemId: string }>
}

/**
 * PUT /api/itinerary/items/[itemId]/move
 * Move an itinerary item to a different day
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await params
    const body = await request.json()
    const validatedData = moveItemSchema.parse(body)

    // Verify item exists and user has edit permission
    const item = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      include: {
        day: {
          include: {
            itinerary: {
              select: { id: true, projectId: true },
            },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (!await canEditProject(item.day.itinerary.projectId, session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify target day exists and belongs to same itinerary (select만 사용)
    const targetDay = await prisma.itineraryDay.findUnique({
      where: { id: validatedData.targetDayId },
      select: { id: true, itineraryId: true },
    })

    if (!targetDay) {
      return NextResponse.json({ error: 'Target day not found' }, { status: 404 })
    }

    if (targetDay.itineraryId !== item.day.itinerary.id) {
      return NextResponse.json(
        { error: 'Target day must belong to the same itinerary' },
        { status: 400 }
      )
    }

    // If moving to same day, just return success
    if (item.dayId === validatedData.targetDayId) {
      const updatedItem = await prisma.itineraryItem.findUnique({
        where: { id: itemId },
        include: {
          place: {
            select: {
              id: true,
              name: true,
              category: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      })
      return NextResponse.json({ item: updatedItem })
    }

    // Calculate new order - count 쿼리로 최적화 (전체 items 로드 대신)
    let newOrder = validatedData.order
    if (newOrder === undefined) {
      const itemCount = await prisma.itineraryItem.count({
        where: { dayId: validatedData.targetDayId },
      })
      newOrder = itemCount
    }

    // Use transaction for atomic operation
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Update orders in source day (shift down items after removed item)
      await tx.itineraryItem.updateMany({
        where: {
          dayId: item.dayId,
          order: { gt: item.order },
        },
        data: {
          order: { decrement: 1 },
        },
      })

      // Shift up orders in target day to make room
      await tx.itineraryItem.updateMany({
        where: {
          dayId: validatedData.targetDayId,
          order: { gte: newOrder },
        },
        data: {
          order: { increment: 1 },
        },
      })

      // Move the item to target day
      return tx.itineraryItem.update({
        where: { id: itemId },
        data: {
          dayId: validatedData.targetDayId,
          order: newOrder,
        },
        include: {
          place: {
            select: {
              id: true,
              name: true,
              category: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      })
    })

    return NextResponse.json({ item: updatedItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error moving itinerary item:', error)
    return NextResponse.json(
      { error: 'Failed to move itinerary item' },
      { status: 500 }
    )
  }
}
