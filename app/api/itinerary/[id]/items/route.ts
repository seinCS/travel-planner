/**
 * Itinerary Items API Routes
 *
 * POST /api/itinerary/[id]/items - 일정 항목 추가
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { realtimeBroadcast } from '@/infrastructure/services/realtime'

const createItemSchema = z.object({
  dayId: z.string(),
  placeId: z.string(),
  order: z.number().int().min(0).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  note: z.string().optional(),
})

// POST /api/itinerary/[id]/items
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: itineraryId } = await params

    const body = await request.json()
    const validated = createItemSchema.parse(body)

    // Verify itinerary (with auth), day, and place in a single parallel batch
    const [itinerary, day, place] = await Promise.all([
      prisma.itinerary.findUnique({
        where: { id: itineraryId },
        select: {
          id: true,
          projectId: true,
          project: {
            select: {
              userId: true,
              members: {
                where: { userId: session.user.id },
                select: { userId: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.itineraryDay.findFirst({
        where: { id: validated.dayId, itineraryId },
        select: { id: true },
      }),
      prisma.place.findFirst({
        where: { id: validated.placeId },
        select: { id: true, projectId: true },
      }),
    ])

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Auth check using data already fetched (no extra queries)
    const isOwner = itinerary.project.userId === session.user.id
    const isMember = itinerary.project.members.length > 0
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!day) {
      return NextResponse.json({ error: 'Day not found in this itinerary' }, { status: 404 })
    }

    if (!place || place.projectId !== itinerary.projectId) {
      return NextResponse.json({ error: 'Place not found in this project' }, { status: 404 })
    }

    // Get max order if not provided
    let order = validated.order
    if (order === undefined) {
      const maxOrder = await prisma.itineraryItem.findFirst({
        where: { dayId: validated.dayId },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      order = (maxOrder?.order ?? -1) + 1
    }

    const item = await prisma.itineraryItem.create({
      data: {
        dayId: validated.dayId,
        placeId: validated.placeId,
        order,
        startTime: validated.startTime,
        note: validated.note,
      },
      include: { place: true },
    })

    // Broadcast realtime event
    realtimeBroadcast.itemCreated(itinerary.projectId, item, session.user.id)

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating itinerary item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
