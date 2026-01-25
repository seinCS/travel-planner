import { NextRequest, NextResponse } from 'next/server'

// 간단한 인메모리 캐시 (프로덕션에서는 Redis 권장)
const geocodeCache = new Map<string, { lat: number; lng: number; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24시간

// Rate limiting: 분당 최대 요청 수
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 60 // 분당 60회
const RATE_WINDOW = 60 * 1000 // 1분

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

export async function GET(request: NextRequest) {
  // Rate limiting 체크
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
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
  // fallback으로 NEXT_PUBLIC_ 버전도 확인 (마이그레이션 기간)
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

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.error('Invalid geocoding response structure:', result)
        return NextResponse.json(
          { error: 'Invalid geocoding response' },
          { status: 500 }
        )
      }

      // 캐시 저장
      geocodeCache.set(cacheKey, { lat, lng, timestamp: Date.now() })

      // 캐시 크기 제한 (최대 1000개)
      if (geocodeCache.size > 1000) {
        const oldestKey = geocodeCache.keys().next().value
        if (oldestKey) geocodeCache.delete(oldestKey)
      }

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
