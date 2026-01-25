/**
 * Custom error class for geocoding failures
 * Used to distinguish Google Maps API errors from other errors
 */
export class GeocodingError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'GeocodingError'
  }
}

export interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
  // Google Place 연동
  googlePlaceId: string | null
  googleMapsUrl: string | null
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
}

// 도시/국가명으로 좌표 가져오기 (지도 초기 중심점용)
// 서버 API를 통해 호출하여 CORS 문제 방지
export async function geocodeDestination(
  destination: string,
  country?: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ destination })
  if (country) {
    params.append('country', country)
  }

  try {
    const response = await fetch(`/api/geocode/destination?${params.toString()}`)

    if (!response.ok) {
      console.error('Geocoding destination failed:', response.status)
      return null
    }

    const data = await response.json()
    return {
      lat: data.lat,
      lng: data.lng,
    }
  } catch (error) {
    console.error('Geocoding destination error:', error)
    return null
  }
}

/**
 * 서버 전용 Google Maps API 키 가져오기
 * TODO: NEXT_PUBLIC_ fallback은 2026-03-01까지 유지 후 제거 예정
 */
function getServerApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
}

// 기본 geocodePlace (단일 검색어)
export async function geocodePlace(
  placeName: string,
  destination: string,
  country?: string
): Promise<GeocodingResult | null> {
  const apiKey = getServerApiKey()

  if (!apiKey) {
    console.error('Google Maps API key not configured')
    return null
  }

  // Build search query with context for better accuracy
  const searchQuery = country
    ? `${placeName} ${destination} ${country}`
    : `${placeName} ${destination}`

  // Step 1: Try Places API (Text Search) first - better for POI/business names
  const placesResult = await searchPlaceWithPlacesAPI(searchQuery, apiKey)
  if (placesResult) {
    console.log(`[Geocoding] Found via Places API: ${placeName} -> ${placesResult.formattedAddress}`)
    return placesResult
  }

  // Step 2: Fallback to Geocoding API for addresses
  console.log(`[Geocoding] Places API failed, trying Geocoding API for: ${placeName}`)
  const geocodeQuery = country
    ? `${placeName}, ${destination}, ${country}`
    : `${placeName}, ${destination}`

  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    geocodeQuery
  )}&key=${apiKey}`

  try {
    const response = await fetch(geocodeUrl)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      console.log(`[Geocoding] Found via Geocoding API: ${placeName} -> ${result.formatted_address}`)
      const placeId = result.place_id || null
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        // Geocoding API에서도 place_id 반환 가능
        googlePlaceId: placeId,
        googleMapsUrl: placeId
          ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
          : null,
        rating: null,
        userRatingsTotal: null,
        priceLevel: null,
      }
    }

    console.error(`[Geocoding] Both APIs failed for: ${placeName}`, data.status)
    return null
  } catch (error) {
    console.error('[Geocoding] Error:', error)
    return null
  }
}

// 영문명 fallback을 포함한 확장 geocodePlace (async-parallel 최적화)
export async function geocodePlaceWithFallback(
  placeName: string,
  placeNameEn: string | null,
  destination: string,
  country?: string
): Promise<GeocodingResult | null> {
  const apiKey = getServerApiKey()

  // 병렬로 모든 전략을 동시에 시도하여 첫 번째 성공 결과 반환
  // Promise.allSettled를 사용하여 모든 결과를 수집 후 우선순위대로 반환
  console.log(`[Geocoding Fallback] Starting parallel search for: ${placeName}`)

  const strategies: Promise<{ priority: number; result: GeocodingResult | null }>[] = [
    // 우선순위 1: 원본 장소명 + 지역 컨텍스트
    geocodePlace(placeName, destination, country).then(result => ({ priority: 1, result })),
  ]

  // 우선순위 2: 영문명 + 지역 컨텍스트 (있는 경우)
  if (placeNameEn && placeNameEn !== placeName) {
    strategies.push(
      geocodePlace(placeNameEn, destination, country).then(result => ({ priority: 2, result }))
    )
  }

  // 우선순위 3, 4: 장소명만으로 시도 (apiKey가 있는 경우)
  if (apiKey) {
    strategies.push(
      searchPlaceWithPlacesAPI(placeName, apiKey).then(result => ({ priority: 3, result }))
    )

    if (placeNameEn && placeNameEn !== placeName) {
      strategies.push(
        searchPlaceWithPlacesAPI(placeNameEn, apiKey).then(result => ({ priority: 4, result }))
      )
    }
  }

  // 모든 전략을 병렬 실행
  const results = await Promise.allSettled(strategies)

  // 성공한 결과들을 우선순위 순으로 정렬하여 첫 번째 반환
  const successfulResults = results
    .filter((r): r is PromiseFulfilledResult<{ priority: number; result: GeocodingResult | null }> =>
      r.status === 'fulfilled' && r.value.result !== null
    )
    .map(r => r.value)
    .sort((a, b) => a.priority - b.priority)

  if (successfulResults.length > 0) {
    console.log(`[Geocoding Fallback] Found via strategy ${successfulResults[0].priority}: ${placeName}`)
    return successfulResults[0].result
  }

  console.error(`[Geocoding Fallback] All strategies failed for: ${placeName} (${placeNameEn || 'no English name'})`)
  return null
}

// Places API Text Search - optimized for POI/business name search
async function searchPlaceWithPlacesAPI(
  query: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  // Use Places API (New) Text Search
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Get the first (most relevant) result
      const result = data.results[0]

      // Verify the result has location data
      if (result.geometry?.location) {
        const placeId = result.place_id || null
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address || result.name,
          // Google Place 연동 정보
          googlePlaceId: placeId,
          googleMapsUrl: placeId
            ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
            : null,
          rating: result.rating || null,
          userRatingsTotal: result.user_ratings_total || null,
          priceLevel: result.price_level ?? null,
        }
      }
    }

    // Places API didn't return valid results
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[Places API] Error status:', data.status, data.error_message)
    }
    return null
  } catch (error) {
    console.error('[Places API] Error:', error)
    return null
  }
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula for distance in km
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Check if two places are likely duplicates (within 100m)
export function isDuplicatePlace(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  thresholdKm = 0.1
): boolean {
  return calculateDistance(lat1, lng1, lat2, lng2) < thresholdKm
}

// Place Details API 응답 타입
export interface PlaceDetails {
  name: string
  formattedAddress: string
  formattedPhoneNumber: string | null
  website: string | null
  openingHours: {
    openNow: boolean
    weekdayText: string[]
  } | null
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
  reviews: Array<{
    authorName: string
    rating: number
    text: string
    relativeTimeDescription: string
  }>
  photos: Array<{
    photoReference: string
    width: number
    height: number
  }>
  googleMapsUrl: string
}

// Place Details API 호출
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const apiKey = getServerApiKey()
  if (!apiKey) {
    console.error('Google Maps API key not configured')
    return null
  }

  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'website',
    'opening_hours',
    'rating',
    'user_ratings_total',
    'price_level',
    'reviews',
    'photos',
    'url'
  ].join(',')

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=ko&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.result) {
      const r = data.result
      return {
        name: r.name,
        formattedAddress: r.formatted_address,
        formattedPhoneNumber: r.formatted_phone_number || null,
        website: r.website || null,
        openingHours: r.opening_hours ? {
          openNow: r.opening_hours.open_now ?? false,
          weekdayText: r.opening_hours.weekday_text || []
        } : null,
        rating: r.rating || null,
        userRatingsTotal: r.user_ratings_total || null,
        priceLevel: r.price_level ?? null,
        reviews: (r.reviews || []).slice(0, 3).map((rev: {
          author_name: string
          rating: number
          text: string
          relative_time_description: string
        }) => ({
          authorName: rev.author_name,
          rating: rev.rating,
          text: rev.text,
          relativeTimeDescription: rev.relative_time_description
        })),
        photos: (r.photos || []).slice(0, 5).map((photo: {
          photo_reference: string
          width: number
          height: number
        }) => ({
          photoReference: photo.photo_reference,
          width: photo.width,
          height: photo.height
        })),
        googleMapsUrl: r.url
      }
    }

    console.error('[Place Details API] Error:', data.status, data.error_message)
    return null
  } catch (error) {
    console.error('[Place Details API] Error:', error)
    return null
  }
}

/**
 * 사진 URL 생성 헬퍼
 *
 * 주의: 이 함수는 클라이언트 컴포넌트에서 <img src=...>로 사용되므로
 * NEXT_PUBLIC_ 키를 사용해야 합니다 (브라우저에서 직접 Google 서버에 요청)
 */
export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`
}
