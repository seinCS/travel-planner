import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { canEditProject } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { createAccommodationItinerarySyncService } from '@/application/services/AccommodationItinerarySyncService'
import { realtimeBroadcast } from '@/infrastructure/services/realtime'

const createAccommodationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  checkIn: z.string().min(1, 'Check-in date is required'),
  checkOut: z.string().min(1, 'Check-out date is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  note: z.string().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/itinerary/[id]/accommodations
 * Get all accommodations for an itinerary
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: itineraryId } = await params

    // Verify itinerary exists and user has access (select로 필요한 필드만)
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      select: { id: true, projectId: true },
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    if (!await canEditProject(itinerary.projectId, session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const accommodations = await prisma.accommodation.findMany({
      where: { itineraryId },
      orderBy: { checkIn: 'asc' },
    })

    return NextResponse.json({ accommodations })
  } catch (error) {
    console.error('Error fetching accommodations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accommodations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/itinerary/[id]/accommodations
 * Add an accommodation to an itinerary
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: itineraryId } = await params
    const body = await request.json()
    const validatedData = createAccommodationSchema.parse(body)

    // Verify itinerary exists and user has access (select로 필요한 필드만)
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      select: { id: true, projectId: true },
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    if (!await canEditProject(itinerary.projectId, session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 트랜잭션으로 숙소 생성 + 아이템 생성을 원자적으로 처리
    const accommodation = await prisma.$transaction(async (tx) => {
      const newAccommodation = await tx.accommodation.create({
        data: {
          itineraryId,
          name: validatedData.name,
          address: validatedData.address || null,
          checkIn: new Date(validatedData.checkIn),
          checkOut: new Date(validatedData.checkOut),
          latitude: validatedData.latitude || null,
          longitude: validatedData.longitude || null,
          note: validatedData.note || null,
        },
      })

      // 숙소 일정 아이템 자동 생성 (트랜잭션 컨텍스트 사용)
      const syncService = createAccommodationItinerarySyncService(tx)
      await syncService.createItemsForAccommodation(newAccommodation)

      return newAccommodation
    })

    // Broadcast realtime event
    realtimeBroadcast.accommodationCreated(itinerary.projectId, accommodation, session.user.id)

    return NextResponse.json({ accommodation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating accommodation:', error)
    return NextResponse.json(
      { error: 'Failed to create accommodation' },
      { status: 500 }
    )
  }
}
