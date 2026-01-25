/**
 * Itinerary API Routes
 *
 * POST   /api/projects/[id]/itinerary - 일정 생성
 * GET    /api/projects/[id]/itinerary - 일정 조회
 * PUT    /api/projects/[id]/itinerary - 일정 수정
 * DELETE /api/projects/[id]/itinerary - 일정 삭제
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkProjectAccess, checkOwnerAccess } from '@/lib/project-auth'
import { z } from 'zod'

// Validation schemas
const createItinerarySchema = z.object({
  title: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
})

const updateItinerarySchema = z.object({
  title: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
})

// GET /api/projects/[id]/itinerary
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    console.log('[Itinerary GET] projectId:', id, 'userId:', session.user.id)

    // Owner 또는 Member 권한 확인
    console.log('[Itinerary GET] Starting access check...')
    const startTime = Date.now()
    const { hasAccess, role } = await checkProjectAccess(id, session.user.id)
    console.log('[Itinerary GET] Access check completed in', Date.now() - startTime, 'ms')

    if (!hasAccess) {
      console.log('[Itinerary GET] Access denied for project:', id)
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    console.log('[Itinerary GET] Access granted with role:', role)

    // First, check if itinerary exists (simple query)
    const itineraryExists = await prisma.itinerary.findUnique({
      where: { projectId: id },
      select: { id: true },
    })

    if (!itineraryExists) {
      console.log('[Itinerary GET] No itinerary exists for project:', id)
      return NextResponse.json({ itinerary: null })
    }

    console.log('[Itinerary GET] Itinerary exists:', itineraryExists.id)

    // Get full itinerary with relations - use more defensive query
    try {
      const itinerary = await prisma.itinerary.findUnique({
        where: { projectId: id },
        include: {
          days: {
            orderBy: { dayNumber: 'asc' },
            include: {
              items: {
                orderBy: { order: 'asc' },
                include: {
                  place: true,
                  accommodation: true,
                },
              },
            },
          },
          flights: {
            orderBy: { departureDate: 'asc' },
          },
          accommodations: {
            orderBy: { checkIn: 'asc' },
          },
        },
      })

      if (!itinerary) {
        console.log('[Itinerary GET] Itinerary disappeared during query - race condition?')
        return NextResponse.json({ itinerary: null })
      }

      const itemCount = itinerary.days.reduce((acc, d) => acc + d.items.length, 0)
      console.log('[Itinerary GET] Itinerary loaded successfully:', {
        id: itinerary.id,
        days: itinerary.days.length,
        items: itemCount,
        flights: itinerary.flights?.length || 0,
        accommodations: itinerary.accommodations?.length || 0,
      })

      // 기존 데이터 호환성: itemType이 없는 아이템에 기본값 설정
      const normalizedItinerary = {
        ...itinerary,
        days: itinerary.days.map(day => ({
          ...day,
          items: day.items.map(item => ({
            ...item,
            itemType: item.itemType || 'place',
            // Ensure accommodation is null if not present (defensive)
            accommodation: item.accommodation || null,
          })),
        })),
        // Ensure arrays are always arrays (defensive)
        flights: itinerary.flights || [],
        accommodations: itinerary.accommodations || [],
      }

      return NextResponse.json({ itinerary: normalizedItinerary })
    } catch (queryError) {
      // 일정은 존재하지만 관계 데이터 로드에 실패한 경우
      const errorMessage = queryError instanceof Error ? queryError.message : String(queryError)
      const errorStack = queryError instanceof Error ? queryError.stack : undefined
      console.error('[Itinerary GET] Failed to load itinerary relations:', {
        error: errorMessage,
        stack: errorStack,
        itineraryId: itineraryExists.id,
        projectId: id,
      })
      return NextResponse.json({
        error: 'Failed to load itinerary data',
        code: 'ITINERARY_LOAD_ERROR',
        itineraryId: itineraryExists.id,
        message: '일정 데이터를 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Itinerary GET] Unexpected error caught!')
    console.error('[Itinerary GET] Error type:', typeof error)
    console.error('[Itinerary GET] Error constructor:', error?.constructor?.name)
    if (error instanceof Error) {
      console.error('[Itinerary GET] Error message:', error.message)
      console.error('[Itinerary GET] Error stack:', error.stack)
    } else {
      console.error('[Itinerary GET] Error value:', JSON.stringify(error))
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/itinerary
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Owner 또는 Member 권한 확인
    const { hasAccess } = await checkProjectAccess(id, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Check if itinerary already exists
    const existingItinerary = await prisma.itinerary.findUnique({
      where: { projectId: id },
    })

    if (existingItinerary) {
      console.log('[Itinerary POST] Itinerary already exists:', existingItinerary.id)
      return NextResponse.json({
        error: 'Itinerary already exists for this project',
        code: 'ITINERARY_EXISTS',
        itineraryId: existingItinerary.id,
        message: '이미 일정이 존재합니다. 페이지를 새로고침 해주세요.',
      }, { status: 409 })
    }

    const body = await request.json()
    const validated = createItinerarySchema.parse(body)

    const startDate = new Date(validated.startDate)
    const endDate = new Date(validated.endDate)

    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Calculate number of days
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Create itinerary with days
    const itinerary = await prisma.itinerary.create({
      data: {
        projectId: id,
        title: validated.title,
        startDate,
        endDate,
        days: {
          create: Array.from({ length: dayCount }, (_, i) => ({
            dayNumber: i + 1,
            date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
          })),
        },
      },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: {
                place: true,
                accommodation: true,
              },
            },
          },
        },
        flights: true,
        accommodations: true,
      },
    })

    return NextResponse.json({ itinerary }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating itinerary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/projects/[id]/itinerary
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Owner 또는 Member 권한 확인
    const { hasAccess } = await checkProjectAccess(id, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const existingItinerary = await prisma.itinerary.findUnique({
      where: { projectId: id },
    })

    if (!existingItinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateItinerarySchema.parse(body)

    const updateData: {
      title?: string
      startDate?: Date
      endDate?: Date
    } = {}

    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.startDate) updateData.startDate = new Date(validated.startDate)
    if (validated.endDate) updateData.endDate = new Date(validated.endDate)

    const itinerary = await prisma.itinerary.update({
      where: { projectId: id },
      data: updateData,
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: {
                place: true,
                accommodation: true,
              },
            },
          },
        },
        flights: {
          orderBy: { departureDate: 'asc' },
        },
        accommodations: {
          orderBy: { checkIn: 'asc' },
        },
      },
    })

    return NextResponse.json({ itinerary })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error updating itinerary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/itinerary (Owner 전용)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Owner 전용 권한 확인
    const { isOwner, project } = await checkOwnerAccess(id, session.user.id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only project owner can delete the itinerary' },
        { status: 403 }
      )
    }

    const existingItinerary = await prisma.itinerary.findUnique({
      where: { projectId: id },
    })

    if (!existingItinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    await prisma.itinerary.delete({
      where: { projectId: id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting itinerary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
