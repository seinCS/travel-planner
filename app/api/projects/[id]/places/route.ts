import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { geocodePlace } from '@/lib/google-maps'
import { checkProjectAccess } from '@/lib/project-auth'
import { z } from 'zod'
import { API_ERRORS } from '@/lib/constants'

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
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id } = await params

    // Owner 또는 Member 권한 확인
    const { hasAccess } = await checkProjectAccess(id, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: API_ERRORS.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // 병렬 쿼리로 places와 failedImages 동시 조회 (async-parallel 패턴)
    // Promise.allSettled 사용으로 개별 에러 처리
    const [placesResult, failedImagesResult] = await Promise.allSettled([
      prisma.place.findMany({
        where: { projectId: id },
        include: {
          placeImages: {
            include: {
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.image.findMany({
        where: { projectId: id, status: 'failed' },
      }),
    ])

    // places 조회 실패는 에러로 처리 (핵심 데이터)
    if (placesResult.status === 'rejected') {
      console.error('Failed to fetch places:', placesResult.reason)
      return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
    }

    // 결과 추출
    const places = placesResult.value

    // failedImages 조회 실패는 로깅 후 빈 배열로 대체 (부수적 데이터)
    const failedImages =
      failedImagesResult.status === 'fulfilled'
        ? failedImagesResult.value
        : (() => {
            console.error('Failed to fetch failed images (non-critical):', failedImagesResult.reason)
            return []
          })()

    return NextResponse.json({ places, failedImages })
  } catch (error) {
    console.error('Error fetching places:', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
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
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id } = await params

    // Owner 또는 Member 권한 확인 + Geocoding에 필요한 정보 함께 조회 (중복 쿼리 방지)
    const { hasAccess, project } = await checkProjectAccess(id, session.user.id, {
      include: { destination: true, country: true },
    })

    if (!hasAccess || !project) {
      return NextResponse.json({ error: API_ERRORS.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const projectWithGeo = project as { destination?: string; country?: string | null }

    const body = await request.json()
    const validated = createPlaceSchema.parse(body)

    let latitude = validated.latitude
    let longitude = validated.longitude

    // 좌표가 없으면 Geocoding
    if (!latitude || !longitude) {
      const geoResult = await geocodePlace(
        validated.name,
        projectWithGeo.destination ?? '',
        projectWithGeo.country || undefined
      )

      if (!geoResult) {
        return NextResponse.json({ error: API_ERRORS.LOCATION_NOT_FOUND }, { status: 400 })
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

    // 이미지 연결 (병렬 처리로 최적화)
    if (validated.imageIds?.length) {
      await Promise.all([
        prisma.placeImage.createMany({
          data: validated.imageIds.map((imageId) => ({
            placeId: place.id,
            imageId,
          })),
        }),
        // 연결된 이미지 상태 업데이트 (병렬 실행)
        prisma.image.updateMany({
          where: { id: { in: validated.imageIds } },
          data: { status: 'processed' },
        }),
      ])
    }

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating place:', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
