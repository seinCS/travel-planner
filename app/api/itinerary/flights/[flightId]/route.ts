import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const updateFlightSchema = z.object({
  departureCity: z.string().min(1).optional(),
  arrivalCity: z.string().min(1).optional(),
  airline: z.string().nullable().optional(),
  flightNumber: z.string().nullable().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
})

interface RouteParams {
  params: Promise<{ flightId: string }>
}

/**
 * GET /api/itinerary/flights/[flightId]
 * Get a specific flight
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { flightId } = await params

    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        itinerary: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    if (flight.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ flight })
  } catch (error) {
    console.error('Error fetching flight:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flight' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/itinerary/flights/[flightId]
 * Update a flight
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { flightId } = await params
    const body = await request.json()
    const validatedData = updateFlightSchema.parse(body)

    // Verify flight exists and user has access
    const existingFlight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        itinerary: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!existingFlight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    if (existingFlight.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (validatedData.departureCity !== undefined) {
      updateData.departureCity = validatedData.departureCity
    }
    if (validatedData.arrivalCity !== undefined) {
      updateData.arrivalCity = validatedData.arrivalCity
    }
    if (validatedData.airline !== undefined) {
      updateData.airline = validatedData.airline
    }
    if (validatedData.flightNumber !== undefined) {
      updateData.flightNumber = validatedData.flightNumber
    }
    if (validatedData.departureDate !== undefined) {
      updateData.departureDate = new Date(validatedData.departureDate)
    }
    if (validatedData.arrivalDate !== undefined) {
      updateData.arrivalDate = validatedData.arrivalDate ? new Date(validatedData.arrivalDate) : null
    }
    if (validatedData.note !== undefined) {
      updateData.note = validatedData.note
    }

    const flight = await prisma.flight.update({
      where: { id: flightId },
      data: updateData,
    })

    return NextResponse.json({ flight })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating flight:', error)
    return NextResponse.json(
      { error: 'Failed to update flight' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/itinerary/flights/[flightId]
 * Delete a flight
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { flightId } = await params

    // Verify flight exists and user has access
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        itinerary: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    if (flight.itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.flight.delete({
      where: { id: flightId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting flight:', error)
    return NextResponse.json(
      { error: 'Failed to delete flight' },
      { status: 500 }
    )
  }
}
