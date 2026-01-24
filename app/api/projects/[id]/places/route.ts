import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { geocodePlace } from '@/lib/google-maps'
import { z } from 'zod'

const createPlaceSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['restaurant', 'cafe', 'attraction', 'shopping', 'accommodation', 'other']),
  comment: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageIds: z.array(z.string()).optional(),
  // Google Place data (from search)
  googlePlaceId: z.string().optional(),
  formattedAddress: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  rating: z.number().nullable().optional(),
  userRatingsTotal: z.number().nullable().optional(),
  priceLevel: z.number().nullable().optional(),
})

// GET /api/projects/[id]/places - 장소 목록 조회
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

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const places = await prisma.place.findMany({
      where: { projectId: id },
      include: {
        placeImages: {
          include: {
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 실패한 이미지 목록
    const failedImages = await prisma.image.findMany({
      where: { projectId: id, status: 'failed' },
    })

    return NextResponse.json({ places, failedImages })
  } catch (error) {
    console.error('Error fetching places:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/places - 장소 수동 추가
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

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = createPlaceSchema.parse(body)

    let latitude = validated.latitude
    let longitude = validated.longitude

    // 좌표가 없으면 Geocoding
    if (!latitude || !longitude) {
      const geoResult = await geocodePlace(
        validated.name,
        project.destination,
        project.country || undefined
      )

      if (!geoResult) {
        return NextResponse.json({ error: 'Could not find location' }, { status: 400 })
      }

      latitude = geoResult.latitude
      longitude = geoResult.longitude
    }

    const place = await prisma.place.create({
      data: {
        projectId: id,
        name: validated.name,
        category: validated.category,
        comment: validated.comment,
        latitude,
        longitude,
        status: 'manual',
        // Google Place data (from search)
        googlePlaceId: validated.googlePlaceId,
        formattedAddress: validated.formattedAddress,
        googleMapsUrl: validated.googleMapsUrl,
        rating: validated.rating,
        userRatingsTotal: validated.userRatingsTotal,
        priceLevel: validated.priceLevel,
      },
    })

    // 이미지 연결
    if (validated.imageIds?.length) {
      await prisma.placeImage.createMany({
        data: validated.imageIds.map((imageId) => ({
          placeId: place.id,
          imageId,
        })),
      })

      // 연결된 이미지 상태 업데이트
      await prisma.image.updateMany({
        where: { id: { in: validated.imageIds } },
        data: { status: 'processed' },
      })
    }

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating place:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
