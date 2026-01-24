import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createFlightSchema = z.object({
  departureCity: z.string().min(1, 'Departure city is required'),
  arrivalCity: z.string().min(1, 'Arrival city is required'),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  departureDate: z.string().min(1, 'Departure date is required'),
  arrivalDate: z.string().optional(),
  note: z.string().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/itinerary/[id]/flights
 * Get all flights for an itinerary
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: itineraryId } = await params

    // Verify itinerary exists and user has access
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        project: true,
      },
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    if (itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const flights = await prisma.flight.findMany({
      where: { itineraryId },
      orderBy: { departureDate: 'asc' },
    })

    return NextResponse.json({ flights })
  } catch (error) {
    console.error('Error fetching flights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flights' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/itinerary/[id]/flights
 * Add a flight to an itinerary
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: itineraryId } = await params
    const body = await request.json()
    const validatedData = createFlightSchema.parse(body)

    // Verify itinerary exists and user has access
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        project: true,
      },
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    if (itinerary.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const flight = await prisma.flight.create({
      data: {
        itineraryId,
        departureCity: validatedData.departureCity,
        arrivalCity: validatedData.arrivalCity,
        airline: validatedData.airline || null,
        flightNumber: validatedData.flightNumber || null,
        departureDate: new Date(validatedData.departureDate),
        arrivalDate: validatedData.arrivalDate ? new Date(validatedData.arrivalDate) : null,
        note: validatedData.note || null,
      },
    })

    return NextResponse.json({ flight }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating flight:', error)
    return NextResponse.json(
      { error: 'Failed to create flight' },
      { status: 500 }
    )
  }
}
