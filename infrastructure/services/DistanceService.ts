/**
 * DistanceService
 *
 * Haversine 공식을 사용한 직선 거리 계산 서비스
 * Google Distance Matrix API 대신 클라이언트 사이드 계산으로 비용 절감
 */

import type { RouteSegment, RouteItem } from '@/types/route'

/**
 * Haversine 공식으로 두 좌표 간 직선 거리 계산
 * @param lat1 출발지 위도
 * @param lng1 출발지 경도
 * @param lat2 도착지 위도
 * @param lng2 도착지 경도
 * @returns 거리 (km)
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // 지구 반지름 (km)
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

/**
 * 거리를 기반으로 도보 시간 추정
 * 평균 도보 속도: 4.5 km/h (일반적인 여행 속도)
 * @param distanceKm 거리 (km)
 * @returns 도보 시간 (분)
 */
export function estimateWalkingTime(distanceKm: number): number {
  const walkingSpeedKmH = 4.5
  const hours = distanceKm / walkingSpeedKmH
  return Math.round(hours * 60)
}

/**
 * 거리를 사람이 읽기 좋은 형식으로 포맷
 * @param meters 거리 (미터)
 * @returns 포맷된 문자열
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  const km = meters / 1000
  return `${km.toFixed(1)}km`
}

/**
 * 시간을 사람이 읽기 좋은 형식으로 포맷
 * @param seconds 시간 (초)
 * @returns 포맷된 문자열 (한글)
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)

  if (minutes < 60) {
    return `${minutes}분`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}시간`
  }

  return `${hours}시간 ${remainingMinutes}분`
}

/**
 * 일정 항목들 간의 경로 거리/시간 계산
 * @param items 일정 항목 배열 (order 순으로 정렬 필요)
 * @returns RouteSegment 배열
 */
export function calculateRouteDistances(items: RouteItem[]): RouteSegment[] {
  if (items.length < 2) {
    return []
  }

  // order 순으로 정렬
  const sortedItems = [...items].sort((a, b) => a.order - b.order)
  const segments: RouteSegment[] = []

  for (let i = 0; i < sortedItems.length - 1; i++) {
    const from = sortedItems[i]
    const to = sortedItems[i + 1]

    const distanceKm = calculateHaversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    )

    const distanceMeters = Math.round(distanceKm * 1000)
    const walkingMinutes = estimateWalkingTime(distanceKm)
    const walkingSeconds = walkingMinutes * 60

    segments.push({
      fromItemId: from.id,
      toItemId: to.id,
      distance: {
        value: distanceMeters,
        text: formatDistance(distanceMeters),
      },
      duration: {
        value: walkingSeconds,
        text: formatDuration(walkingSeconds),
      },
    })
  }

  return segments
}

/**
 * 총 거리와 시간 계산
 * @param segments RouteSegment 배열
 * @returns 총 거리와 시간
 */
export function calculateTotals(segments: RouteSegment[]): {
  totalDistance: { value: number; text: string }
  totalDuration: { value: number; text: string }
} {
  const totalDistanceMeters = segments.reduce((sum, seg) => sum + seg.distance.value, 0)
  const totalDurationSeconds = segments.reduce((sum, seg) => sum + seg.duration.value, 0)

  return {
    totalDistance: {
      value: totalDistanceMeters,
      text: formatDistance(totalDistanceMeters),
    },
    totalDuration: {
      value: totalDurationSeconds,
      text: formatDuration(totalDurationSeconds),
    },
  }
}

/**
 * Google Maps 길찾기 URL 생성
 * @param fromLat 출발지 위도
 * @param fromLng 출발지 경도
 * @param toLat 도착지 위도
 * @param toLng 도착지 경도
 * @param mode 이동 수단 (walking, driving, transit, bicycling)
 * @returns Google Maps 길찾기 URL
 */
export function generateGoogleMapsDirectionsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: 'walking' | 'driving' | 'transit' | 'bicycling' = 'walking'
): string {
  const origin = `${fromLat},${fromLng}`
  const destination = `${toLat},${toLng}`
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`
}

/**
 * 도보 30분 이상 기준 (초)
 */
export const WALKING_THRESHOLD_SECONDS = 30 * 60

/**
 * 도보 30분 이상 구간 식별
 * @param segments RouteSegment 배열
 * @returns 30분 이상 구간만 필터링
 */
export function identifyLongWalkingSegments(
  segments: RouteSegment[]
): RouteSegment[] {
  return segments.filter((seg) => seg.duration.value >= WALKING_THRESHOLD_SECONDS)
}

/**
 * 대중교통 시간 추정 (Google API 없이)
 * 평균 대중교통 속도: 20 km/h (도시 내 버스/지하철 평균)
 * @param distanceKm 거리 (km)
 * @returns 대중교통 시간 (분)
 */
export function estimateTransitTime(distanceKm: number): number {
  const transitSpeedKmH = 20
  const hours = distanceKm / transitSpeedKmH
  return Math.round(hours * 60)
}

/**
 * 대중교통 시간을 포함한 RouteSegment 계산
 * 도보 30분 이상 구간에만 transitDuration 추가
 */
export function calculateRouteDistancesWithTransit(items: RouteItem[]): RouteSegment[] {
  if (items.length < 2) {
    return []
  }

  const sortedItems = [...items].sort((a, b) => a.order - b.order)
  const segments: RouteSegment[] = []

  for (let i = 0; i < sortedItems.length - 1; i++) {
    const from = sortedItems[i]
    const to = sortedItems[i + 1]

    const distanceKm = calculateHaversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    )

    const distanceMeters = Math.round(distanceKm * 1000)
    const walkingMinutes = estimateWalkingTime(distanceKm)
    const walkingSeconds = walkingMinutes * 60

    const segment: RouteSegment = {
      fromItemId: from.id,
      toItemId: to.id,
      distance: {
        value: distanceMeters,
        text: formatDistance(distanceMeters),
      },
      duration: {
        value: walkingSeconds,
        text: formatDuration(walkingSeconds),
      },
    }

    // 도보 30분 이상이면 대중교통 시간 추가
    if (walkingSeconds >= WALKING_THRESHOLD_SECONDS) {
      const transitMinutes = estimateTransitTime(distanceKm)
      const transitSeconds = transitMinutes * 60
      segment.transitDuration = {
        value: transitSeconds,
        text: formatDuration(transitSeconds),
      }
    }

    segments.push(segment)
  }

  return segments
}

/**
 * 총 대중교통 시간 계산 (30분 이상 구간만)
 */
export function calculateTransitTotals(segments: RouteSegment[]): {
  totalTransitDuration: { value: number; text: string } | null
} {
  const transitSegments = segments.filter((seg) => seg.transitDuration)
  if (transitSegments.length === 0) {
    return { totalTransitDuration: null }
  }

  const totalTransitSeconds = transitSegments.reduce(
    (sum, seg) => sum + (seg.transitDuration?.value || 0),
    0
  )

  return {
    totalTransitDuration: {
      value: totalTransitSeconds,
      text: formatDuration(totalTransitSeconds),
    },
  }
}
