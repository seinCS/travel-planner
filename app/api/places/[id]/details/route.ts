import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlaceDetails, PlaceDetails } from '@/lib/google-maps'

// LRU 캐시 구현 (server-cache-lru 패턴)
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

  // TTL 체크
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    placeDetailsCache.delete(placeId)
    return undefined
  }

  return entry.data
}

function setCachedDetails(placeId: string, data: PlaceDetails | null): void {
  // LRU: 캐시가 가득 차면 가장 오래된 항목 제거
  if (placeDetailsCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = placeDetailsCache.keys().next().value
    if (oldestKey) placeDetailsCache.delete(oldestKey)
  }

  placeDetailsCache.set(placeId, {
    data,
    timestamp: Date.now(),
  })
}

// GET /api/places/[id]/details - 구글 장소 상세 정보 조회
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

    // 장소 조회 (권한 확인 포함)
    const place = await prisma.place.findFirst({
      where: { id },
      include: {
        project: { select: { userId: true } }
      }
    })

    if (!place || place.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
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
        }
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
        }
      })
    }

    return NextResponse.json({
      hasGoogleData: true,
      place: {
        // 기본 정보 (DB)
        id: place.id,
        name: place.name,
        category: place.category,
        comment: place.comment,
        latitude: place.latitude,
        longitude: place.longitude,
        // Google 상세 정보 (API)
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
      }
    })
  } catch (error) {
    console.error('Error fetching place details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
