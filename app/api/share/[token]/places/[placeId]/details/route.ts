import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPlaceDetails, PlaceDetails } from '@/lib/google-maps'

// LRU 캐시 (기존 API와 동일한 패턴)
const CACHE_MAX_SIZE = 100
const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

interface CacheEntry {
  data: PlaceDetails | null
  timestamp: number
}

const placeDetailsCache = new Map<string, CacheEntry>()

function getCachedDetails(placeId: string): PlaceDetails | null | undefined {
  const entry = placeDetailsCache.get(placeId)
  if (!entry) return undefined

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    placeDetailsCache.delete(placeId)
    return undefined
  }

  return entry.data
}

function setCachedDetails(placeId: string, data: PlaceDetails | null): void {
  if (placeDetailsCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = placeDetailsCache.keys().next().value
    if (oldestKey) placeDetailsCache.delete(oldestKey)
  }

  placeDetailsCache.set(placeId, {
    data,
    timestamp: Date.now(),
  })
}

// GET /api/share/[token]/places/[placeId]/details - 공유 페이지용 장소 상세 (인증 불필요)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; placeId: string }> }
) {
  try {
    const { token, placeId } = await params

    // 공유 토큰으로 프로젝트 조회
    const project = await prisma.project.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        shareEnabled: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: '공유 링크를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!project.shareEnabled) {
      return NextResponse.json(
        { error: '이 프로젝트는 더 이상 공유되지 않습니다.' },
        { status: 403 }
      )
    }

    // 장소가 해당 프로젝트에 속하는지 확인
    const place = await prisma.place.findFirst({
      where: {
        id: placeId,
        projectId: project.id,
      },
    })

    if (!place) {
      return NextResponse.json(
        { error: '장소를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Google Place ID가 없으면 기본 정보만 반환
    if (!place.googlePlaceId) {
      return NextResponse.json({
        hasGoogleData: false,
        place: {
          id: place.id,
          name: place.name,
          category: place.category,
          comment: place.comment,
          latitude: place.latitude,
          longitude: place.longitude,
          formattedAddress: place.formattedAddress,
          googleMapsUrl: place.googleMapsUrl,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          priceLevel: place.priceLevel,
        },
      })
    }

    // Place Details API 호출 (캐시 우선)
    let details = getCachedDetails(place.googlePlaceId)
    if (details === undefined) {
      details = await getPlaceDetails(place.googlePlaceId)
      setCachedDetails(place.googlePlaceId, details)
    }

    if (!details) {
      return NextResponse.json({
        hasGoogleData: false,
        place: {
          id: place.id,
          name: place.name,
          category: place.category,
          comment: place.comment,
          latitude: place.latitude,
          longitude: place.longitude,
          formattedAddress: place.formattedAddress,
          googleMapsUrl: place.googleMapsUrl,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          priceLevel: place.priceLevel,
        },
      })
    }

    return NextResponse.json({
      hasGoogleData: true,
      place: {
        id: place.id,
        name: place.name,
        category: place.category,
        comment: place.comment,
        latitude: place.latitude,
        longitude: place.longitude,
        formattedAddress: details.formattedAddress,
        formattedPhoneNumber: details.formattedPhoneNumber,
        website: details.website,
        openingHours: details.openingHours,
        rating: details.rating,
        userRatingsTotal: details.userRatingsTotal,
        priceLevel: details.priceLevel,
        reviews: details.reviews,
        photos: details.photos,
        googleMapsUrl: details.googleMapsUrl,
      },
    })
  } catch (error) {
    console.error('[Share Place Details Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
