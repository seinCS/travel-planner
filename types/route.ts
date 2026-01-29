/**
 * Route Distance/Duration Types
 *
 * 일정 항목 간 거리/시간 정보를 위한 타입 정의
 */

export type TravelMode = 'walking' | 'transit'

export interface RouteSegment {
  fromItemId: string
  toItemId: string
  distance: {
    value: number  // meters
    text: string   // "1.2 km"
  }
  duration: {
    value: number  // seconds
    text: string   // "15분"
  }
  // 대중교통 시간 (30분 이상 구간에만 제공)
  transitDuration?: {
    value: number  // seconds
    text: string   // "20분"
  }
}

export interface DayRouteInfo {
  dayId: string
  segments: RouteSegment[]
  totalDistance: {
    value: number  // meters
    text: string   // "5.4 km"
  }
  totalDuration: {
    value: number  // seconds
    text: string   // "1시간 5분"
  }
}

export interface DistanceRequest {
  dayId: string
  items: Array<{
    id: string
    placeId?: string
    accommodationId?: string
    itemType: RouteItemType
    latitude: number
    longitude: number
    order: number
  }>
}

export interface DistanceResponse {
  segments: RouteSegment[]
  totalDistance: {
    value: number  // meters
    text: string
  }
  totalDuration: {
    value: number  // seconds
    text: string
  }
  // 대중교통 총 시간 (30분 이상 구간 합계)
  totalTransitDuration?: {
    value: number
    text: string
  }
}

export type RouteItemType = 'place' | 'accommodation'

export interface RouteItem {
  id: string
  placeId?: string
  accommodationId?: string
  itemType: RouteItemType
  latitude: number
  longitude: number
  order: number
}
