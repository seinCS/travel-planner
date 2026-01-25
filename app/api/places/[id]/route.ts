import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canEditProject } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { geocodePlaceWithFallback } from '@/lib/google-maps'
import { z } from 'zod'
import { realtimeBroadcast } from '@/infrastructure/services/realtime'

const updatePlaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(['restaurant', 'cafe', 'attraction', 'shopping', 'accommodation', 'other']).optional(),
  comment: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

// 위치 재검색 스키마
const relocatePlaceSchema = z.object({
  searchQuery: z.string().min(1).max(500),
})

// PUT /api/places/[id] - 장소 수정
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

    // 장소 조회
    const place = await prisma.place.findFirst({
      where: { id },
      include: { project: true },
    })

    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    // 멤버십 권한 확인
    if (!await canEditProject(place.projectId, session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updatePlaceSchema.parse(body)

    const updated = await prisma.place.update({
      where: { id },
      data: {
        ...validated,
        status: place.status === 'auto' ? 'edited' : place.status,
      },
    })

    // Broadcast realtime event
    realtimeBroadcast.placeUpdated(place.projectId, updated, session.user.id)

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error updating place:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/places/[id] - 위치 재검색
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 장소 조회
    const place = await prisma.place.findFirst({
      where: { id },
      include: { project: true },
    })

    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    // 멤버십 권한 확인
    if (!await canEditProject(place.projectId, session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { searchQuery } = relocatePlaceSchema.parse(body)

    // 새 위치 검색
    const geoResult = await geocodePlaceWithFallback(
      searchQuery,
      null,
      place.project.destination,
      place.project.country || undefined
    )

    if (!geoResult) {
      return NextResponse.json(
        { error: '위치를 찾을 수 없습니다. 다른 검색어를 시도해 주세요.' },
        { status: 400 }
      )
    }

    // 장소 업데이트
    const updated = await prisma.place.update({
      where: { id },
      data: {
        latitude: geoResult.latitude,
        longitude: geoResult.longitude,
        formattedAddress: geoResult.formattedAddress,
        googlePlaceId: geoResult.googlePlaceId,
        googleMapsUrl: geoResult.googleMapsUrl,
        rating: geoResult.rating,
        userRatingsTotal: geoResult.userRatingsTotal,
        priceLevel: geoResult.priceLevel,
        status: 'edited',
      },
    })

    // Broadcast realtime event
    realtimeBroadcast.placeUpdated(place.projectId, updated, session.user.id)

    return NextResponse.json({
      place: updated,
      newAddress: geoResult.formattedAddress,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error relocating place:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/places/[id] - 장소 삭제
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

    // 장소 조회
    const place = await prisma.place.findFirst({
      where: { id },
      include: { project: true },
    })

    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    // 멤버십 권한 확인
    if (!await canEditProject(place.projectId, session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.place.delete({ where: { id } })

    // Broadcast realtime event
    realtimeBroadcast.placeDeleted(place.projectId, id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting place:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
