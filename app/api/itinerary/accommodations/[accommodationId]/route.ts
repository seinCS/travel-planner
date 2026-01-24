import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAccommodationItinerarySyncService } from '@/application/services/AccommodationItinerarySyncService'

const updateAccommodationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
})

interface RouteParams {
  params: Promise<{ accommodationId: string }>
}

/**
 * GET /api/itinerary/accommodations/[accommodationId]
 * Get a specific accommodation
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accommodationId } = await params

    const accommodation = await prisma.accommodation.findUnique({
      where: { id: accommodationId },
      include: {
        itinerary: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!accommodation) {
      return NextResponse.json({ error: 'Accommodation not found' }, { status: 404 })
    }

    if (accommodation.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ accommodation })
  } catch (error) {
    console.error('Error fetching accommodation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accommodation' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/itinerary/accommodations/[accommodationId]
 * Update an accommodation
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accommodationId } = await params
    const body = await request.json()
    const validatedData = updateAccommodationSchema.parse(body)

    // Verify accommodation exists and user has access
    const existingAccommodation = await prisma.accommodation.findUnique({
      where: { id: accommodationId },
      include: {
        itinerary: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!existingAccommodation) {
      return NextResponse.json({ error: 'Accommodation not found' }, { status: 404 })
    }

    if (existingAccommodation.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address
    }
    if (validatedData.checkIn !== undefined) {
      updateData.checkIn = new Date(validatedData.checkIn)
    }
    if (validatedData.checkOut !== undefined) {
      updateData.checkOut = new Date(validatedData.checkOut)
    }
    if (validatedData.latitude !== undefined) {
      updateData.latitude = validatedData.latitude
    }
    if (validatedData.longitude !== undefined) {
      updateData.longitude = validatedData.longitude
    }
    if (validatedData.note !== undefined) {
      updateData.note = validatedData.note
    }

    // 이전 체크인/체크아웃 날짜 저장
    const previousCheckIn = existingAccommodation.checkIn
    const previousCheckOut = existingAccommodation.checkOut

    const accommodation = await prisma.accommodation.update({
      where: { id: accommodationId },
      data: updateData,
    })

    // 체크인/체크아웃 날짜가 변경된 경우 일정 아이템 동기화
    if (validatedData.checkIn !== undefined || validatedData.checkOut !== undefined) {
      const syncService = createAccommodationItinerarySyncService(prisma)
      await syncService.syncItemsForAccommodation(
        accommodation,
        previousCheckIn,
        previousCheckOut
      )
    }

    return NextResponse.json({ accommodation })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating accommodation:', error)
    return NextResponse.json(
      { error: 'Failed to update accommodation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/itinerary/accommodations/[accommodationId]
 * Delete an accommodation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accommodationId } = await params

    // Verify accommodation exists and user has access
    const accommodation = await prisma.accommodation.findUnique({
      where: { id: accommodationId },
      include: {
        itinerary: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!accommodation) {
      return NextResponse.json({ error: 'Accommodation not found' }, { status: 404 })
    }

    if (accommodation.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.accommodation.delete({
      where: { id: accommodationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting accommodation:', error)
    return NextResponse.json(
      { error: 'Failed to delete accommodation' },
      { status: 500 }
    )
  }
}
