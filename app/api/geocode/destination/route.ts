import { NextRequest, NextResponse } from 'next/server'

/**
 * 인메모리 캐시 및 Rate Limiting
 *
 * ⚠️ 서버리스 환경 제한사항:
 * Vercel 등 서버리스 환경에서는 각 요청이 다른 인스턴스에서 처리될 수 있어
 * 인메모리 캐시와 rate limiting이 완벽하게 작동하지 않을 수 있습니다.
 * 프로덕션에서 완전한 기능이 필요하면 Vercel KV 또는 Upstash Redis 사용을 권장합니다.
 *
 * 현재 구현은:
 * - 같은 인스턴스 내에서의 중복 요청 방지
 * - 콜드 스타트 시 캐시가 비어있어도 정상 동작
 * - API 비용 절감에 부분적 효과
 */
const geocodeCache = new Map<string, { lat: number; lng: number; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24시간
const MAX_CACHE_SIZE = 1000

// Rate limiting 설정 (서버리스 환경에서는 인스턴스별로 적용됨)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 20 // 분당 20회 (비용 보호)
const RATE_WINDOW = 60 * 1000 // 1분

/**
 * 클라이언트 IP 추출 (프록시 우회 방지)
 * x-forwarded-for 헤더에서 첫 번째 IP만 신뢰
 */
function getClientIp(request: NextRequest): string {
  // Vercel 환경에서는 x-real-ip 또는 x-vercel-forwarded-for 우선
  const vercelIp = request.headers.get('x-real-ip')
  if (vercelIp) return vercelIp

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // 첫 번째 IP만 신뢰 (프록시 체인의 원본 클라이언트)
    return forwardedFor.split(',')[0].trim()
  }

  return 'unknown'
}

// IP 추출 실패 시 더 엄격한 제한 (분당 5회)
const UNKNOWN_IP_RATE_LIMIT = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  // IP 추출 실패 시 더 엄격한 제한 적용
  const limit = ip === 'unknown' ? UNKNOWN_IP_RATE_LIMIT : RATE_LIMIT

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

/**
 * 좌표 유효성 검증
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/**
 * 캐시 정리 (FIFO 방식으로 초과분 일괄 삭제)
 */
function trimCache(): void {
  if (geocodeCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(geocodeCache.keys()).slice(
      0,
      geocodeCache.size - MAX_CACHE_SIZE
    )
    keysToDelete.forEach((key) => geocodeCache.delete(key))
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting 체크
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const destination = searchParams.get('destination')
  const country = searchParams.get('country')

  if (!destination) {
    return NextResponse.json({ error: 'destination is required' }, { status: 400 })
  }

  // 서버 전용 API 키 사용 (NEXT_PUBLIC_ 접두사 없음)
  // TODO: NEXT_PUBLIC_ fallback은 2026-03-01까지 유지 후 제거 예정
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.error('Google Maps API key not configured (GOOGLE_MAPS_API_KEY)')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // 캐시 키 생성
  const cacheKey = `${destination}:${country || ''}`

  // 캐시 확인
  const cached = geocodeCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ lat: cached.lat, lng: cached.lng })
  }

  const searchQuery = country ? `${destination}, ${country}` : destination
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    searchQuery
  )}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0]

      // 응답 구조 검증
      const lat = result?.geometry?.location?.lat
      const lng = result?.geometry?.location?.lng

      // 좌표 유효성 검증 (타입 + 범위)
      if (!isValidCoordinate(lat, lng)) {
        console.error('Invalid geocoding response - invalid coordinates:', { lat, lng, result })
        return NextResponse.json(
          { error: 'Invalid geocoding response' },
          { status: 500 }
        )
      }

      // 캐시 저장 및 정리
      geocodeCache.set(cacheKey, { lat, lng, timestamp: Date.now() })
      trimCache()

      return NextResponse.json({ lat, lng })
    }

    console.error('Geocoding destination failed:', data.status, data.error_message)
    return NextResponse.json(
      { error: 'Geocoding failed', status: data.status },
      { status: 404 }
    )
  } catch (error) {
    console.error('Geocoding destination error:', error)
    return NextResponse.json({ error: 'Geocoding error' }, { status: 500 })
  }
}
