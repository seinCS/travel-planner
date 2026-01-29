'use client'

import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { GoogleMap as GoogleMapComponent, useJsApiLoader, Marker, InfoWindow, Polyline, OverlayView } from '@react-google-maps/api'
import { CATEGORY_STYLES } from '@/lib/constants'
import { createMarkerIcon, createSelectedMarkerIcon, createAccommodationMarkerIcon } from '@/lib/map-icons'
import { Star } from '@/components/icons'

// 지도 설정 상수 (as const로 타입 안전성 확보)
const MAP_CONFIG = {
  DEFAULT_ZOOM_NO_PLACES: 11,
  MIN_ZOOM: 10,
  MAX_ZOOM: 16,
  DEFAULT_CENTER: { lat: 37.5665, lng: 126.9780 },
} as const

// 지도에 표시하기 위한 최소 장소 정보
interface MapPlace {
  id: string
  name: string
  category: string
  comment?: string | null
  latitude: number
  longitude: number
  rating?: number | null
  userRatingsTotal?: number | null
}

// 숙소 마커용 타입
interface MapAccommodation {
  id: string
  name: string
  address?: string | null
  latitude: number
  longitude: number
  checkIn?: string
  checkOut?: string
}

/** 경로 시각화용 좌표 배열 */
type RoutePathItemType = 'place' | 'accommodation'

interface RoutePathPoint {
  lat: number
  lng: number
  order: number
  placeId?: string
  accommodationId?: string
  itemType: RoutePathItemType
}

interface GoogleMapProps {
  places: MapPlace[]
  /** 숙소 목록 (지도에 별도 마커로 표시) */
  accommodations?: MapAccommodation[]
  selectedPlaceId: string | null
  onPlaceSelect: (placeId: string | null) => void
  onOpenDetails?: (placeId: string) => void
  center?: { lat: number; lng: number }
  /** 히든 핀으로 사용할 destination 좌표 (bounds 계산에만 사용) */
  destinationCenter?: { lat: number; lng: number }
  /** fitBounds 트리거 - 값이 변경되면 fitBounds 재실행 */
  fitBoundsKey?: string | number
  /** 장소 클릭 시 panTo 여부 (기본값: true) */
  enablePanToOnSelect?: boolean
  /** 경로 시각화 - 일정 순서대로 연결할 좌표 배열 */
  routePath?: RoutePathPoint[]
  /** 경로 표시 여부 (기본값: true, routePath가 있을 때) */
  showRoute?: boolean
  /** 마커에 순서 라벨 표시 여부 (기본값: false) */
  showOrderLabels?: boolean
}

/**
 * 히든 핀을 포함한 bounds 계산
 *
 * 실제 장소 마커들과 destination 히든 핀(표시되지 않음)을 포함하여
 * 지도의 적절한 bounds를 계산합니다. 히든 핀은 지도 중심을 destination으로
 * 유지하면서 장소들이 화면에 모두 보이도록 하는 역할을 합니다.
 *
 * @param places - 지도에 표시할 장소 배열
 * @param accommodations - 지도에 표시할 숙소 배열
 * @param destinationCenter - 히든 핀으로 사용할 destination 좌표 (선택)
 * @returns bounds 객체와 단일 점 여부 (isSinglePoint가 true면 fitBounds 대신 setCenter 사용 권장)
 */
const calculateBoundsWithHiddenPin = (
  places: MapPlace[],
  accommodations: MapAccommodation[],
  destinationCenter?: { lat: number; lng: number }
): { bounds: google.maps.LatLngBounds; isSinglePoint: boolean } => {
  const bounds = new google.maps.LatLngBounds()
  let pointCount = 0

  // 1. 히든 핀 (destination) 추가
  if (destinationCenter) {
    bounds.extend(destinationCenter)
    pointCount++
  }

  // 2. 실제 장소들 추가
  places.forEach((place) => {
    bounds.extend({ lat: place.latitude, lng: place.longitude })
    pointCount++
  })

  // 3. 숙소들 추가
  accommodations.forEach((acc) => {
    bounds.extend({ lat: acc.latitude, lng: acc.longitude })
    pointCount++
  })

  // 단일 점 여부 반환 (fitBounds가 예상치 못한 줌을 설정할 수 있음)
  return { bounds, isSinglePoint: pointCount <= 1 }
}

/**
 * zoom 제한이 적용된 fitBounds
 * @returns 리스너 정리 함수 (컴포넌트 unmount 시 호출 필요)
 */
const fitBoundsWithLimits = (
  map: google.maps.Map,
  bounds: google.maps.LatLngBounds,
  isSinglePoint: boolean = false
): (() => void) => {
  // 단일 점인 경우 fitBounds 대신 setCenter + setZoom 사용
  if (isSinglePoint) {
    map.setCenter(bounds.getCenter())
    map.setZoom(MAP_CONFIG.DEFAULT_ZOOM_NO_PLACES)
    return () => {} // 정리할 리스너 없음
  }

  map.fitBounds(bounds)

  // fitBounds 완료 후 zoom 보정
  const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
    const zoom = map.getZoom()
    if (zoom !== undefined) {
      if (zoom > MAP_CONFIG.MAX_ZOOM) {
        map.setZoom(MAP_CONFIG.MAX_ZOOM)
      } else if (zoom < MAP_CONFIG.MIN_ZOOM) {
        map.setZoom(MAP_CONFIG.MIN_ZOOM)
      }
    }
  })

  // 리스너 정리 함수 반환
  return () => {
    if (listener) {
      google.maps.event.removeListener(listener)
    }
  }
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

// 경로선 스타일 설정
const ROUTE_POLYLINE_OPTIONS: google.maps.PolylineOptions = {
  strokeColor: '#6B7280', // gray-500
  strokeOpacity: 0,
  strokeWeight: 3,
  geodesic: true,
  icons: [
    {
      icon: {
        path: 'M 0,-1 0,1',
        strokeOpacity: 0.7,
        strokeWeight: 3,
        scale: 3,
      },
      offset: '0',
      repeat: '12px',
    },
  ],
}

export function GoogleMap({
  places,
  accommodations = [],
  selectedPlaceId,
  onPlaceSelect,
  onOpenDetails,
  center,
  destinationCenter,
  fitBoundsKey,
  enablePanToOnSelect = true,
  routePath,
  showRoute = true,
  showOrderLabels = false,
}: GoogleMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const prevSelectedPlaceIdRef = useRef<string | null>(null)
  const fitBoundsCleanupRef = useRef<(() => void) | null>(null)

  // Google Maps API 키 검증
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
  })

  // [Critical] API 키가 없으면 에러 UI 반환
  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <p className="text-red-500 font-medium">Google Maps API 키가 설정되지 않았습니다.</p>
          <p className="text-gray-500 text-sm mt-1">
            환경 변수 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY를 설정해주세요.
          </p>
        </div>
      </div>
    )
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    // fitBounds 로직은 useEffect로 이전 (fitBoundsKey 기반)
  }, [])

  // places, accommodations를 ref로 저장하여 fitBounds useEffect 의존성에서 제거
  // fitBoundsKey가 변경될 때만 fitBounds를 실행하고, places/accommodations 배열 참조가 바뀌어도
  // fitBounds가 재실행되지 않도록 합니다. (핀 클릭 시 줌 유지)
  const placesForBoundsRef = useRef(places)
  const accommodationsForBoundsRef = useRef(accommodations)
  placesForBoundsRef.current = places
  accommodationsForBoundsRef.current = accommodations

  // 이전 fitBoundsKey를 추적하여 실제 변경 시에만 fitBounds 실행
  const prevFitBoundsKeyRef = useRef<string | number | undefined>(undefined)

  // fitBoundsKey 변경 시 fitBounds 실행
  useEffect(() => {
    if (!map) return
    if (fitBoundsKey === undefined) return

    // fitBoundsKey가 실제로 변경되지 않았으면 스킵 (places 배열 참조 변경 등으로 인한 재실행 방지)
    if (prevFitBoundsKeyRef.current === fitBoundsKey) return
    prevFitBoundsKeyRef.current = fitBoundsKey

    // 이전 리스너 정리 (메모리 누수 방지)
    // try-catch-finally로 cleanup 실패 시에도 ref를 null로 설정
    if (fitBoundsCleanupRef.current) {
      try {
        fitBoundsCleanupRef.current()
      } catch (error) {
        console.warn('[GoogleMap] Cleanup error:', error)
      } finally {
        fitBoundsCleanupRef.current = null
      }
    }

    const currentPlaces = placesForBoundsRef.current
    const currentAccommodations = accommodationsForBoundsRef.current

    // 장소가 없고 destinationCenter가 있는 경우
    if (currentPlaces.length === 0 && destinationCenter) {
      map.setCenter(destinationCenter)
      map.setZoom(MAP_CONFIG.DEFAULT_ZOOM_NO_PLACES)
      return
    }

    // 장소가 없고 destinationCenter도 없는 경우
    if (currentPlaces.length === 0 && !destinationCenter) {
      map.setCenter(MAP_CONFIG.DEFAULT_CENTER)
      map.setZoom(5)
      return
    }

    // 장소 또는 숙소가 있는 경우 - 히든 핀 포함 fitBounds
    if (currentPlaces.length > 0 || currentAccommodations.length > 0) {
      const { bounds, isSinglePoint } = calculateBoundsWithHiddenPin(currentPlaces, currentAccommodations, destinationCenter)
      fitBoundsCleanupRef.current = fitBoundsWithLimits(map, bounds, isSinglePoint)
    }

    // cleanup: 컴포넌트 unmount 또는 의존성 변경 시 리스너 정리
    return () => {
      if (fitBoundsCleanupRef.current) {
        try {
          fitBoundsCleanupRef.current()
        } catch (error) {
          console.warn('[GoogleMap] Cleanup error on unmount:', error)
        } finally {
          fitBoundsCleanupRef.current = null
        }
      }
    }
  }, [map, fitBoundsKey, destinationCenter])

  // places를 ref로 저장하여 useEffect 의존성에서 제거 (불필요한 panTo 방지)
  // 이 패턴은 selectedPlaceId 변경 시에만 panTo를 실행하고,
  // places 배열이 변경되어도 panTo가 재실행되지 않도록 합니다.
  const placesRef = useRef<MapPlace[]>(places)
  placesRef.current = places

  // 장소 선택 시 panTo (enablePanToOnSelect가 true일 때만)
  useEffect(() => {
    if (!map) return
    if (!enablePanToOnSelect) return

    // 이전 선택과 같으면 스킵 (같은 장소 재클릭 방지)
    if (selectedPlaceId === prevSelectedPlaceIdRef.current) return
    prevSelectedPlaceIdRef.current = selectedPlaceId

    if (!selectedPlaceId) return

    // placesRef.current 사용하여 places 의존성 제거
    const place = placesRef.current.find((p) => p.id === selectedPlaceId)
    if (place) {
      map.panTo({ lat: place.latitude, lng: place.longitude })
      // zoom은 유지 (변경하지 않음)
    }
  }, [map, selectedPlaceId, enablePanToOnSelect])

  const selectedPlace = places.find((p) => p.id === selectedPlaceId)

  // 맵 중심점 메모이제이션 - hooks는 조건부 return 전에 호출해야 함 (Rules of Hooks)
  // 우선순위: center prop > destinationCenter > places[0] > 기본값 (대한민국 중심)
  const mapCenter = useMemo(() => {
    if (center) return center
    if (destinationCenter) return destinationCenter
    if (places.length > 0) {
      return { lat: places[0].latitude, lng: places[0].longitude }
    }
    return MAP_CONFIG.DEFAULT_CENTER
  }, [center, destinationCenter, places])

  // center, destinationCenter, places 모두 없는 경우 (기본값 사용 중)
  const isUsingDefaultCenter = !center && !destinationCenter && places.length === 0

  // 마커 아이콘 캐싱 - isLoaded가 false면 빈 객체 반환
  // 커스텀 SVG 핀 마커 사용 (카테고리별 색상 + 아이콘)
  const markerIcons = useMemo(() => {
    if (!isLoaded) return {} as Record<string, google.maps.Icon>
    const icons: Record<string, google.maps.Icon> = {}
    Object.keys(CATEGORY_STYLES).forEach((key) => {
      icons[key] = createMarkerIcon(key)
    })
    return icons
  }, [isLoaded])

  // 선택된 마커용 아이콘 (더 큰 사이즈)
  const selectedMarkerIcons = useMemo(() => {
    if (!isLoaded) return {} as Record<string, google.maps.Icon>
    const icons: Record<string, google.maps.Icon> = {}
    Object.keys(CATEGORY_STYLES).forEach((key) => {
      icons[key] = createSelectedMarkerIcon(key)
    })
    return icons
  }, [isLoaded])

  // 마커들을 메모이제이션
  const markers = useMemo(() => {
    if (!isLoaded) return []
    return places.map((place) => {
      // 선택된 마커는 더 큰 아이콘 사용
      const isSelected = place.id === selectedPlaceId
      const icon = isSelected
        ? (selectedMarkerIcons[place.category] || selectedMarkerIcons.other)
        : (markerIcons[place.category] || markerIcons.other)

      return (
        <Marker
          key={place.id}
          position={{ lat: place.latitude, lng: place.longitude }}
          onClick={() => onPlaceSelect(place.id)}
          icon={icon}
          zIndex={isSelected ? 1000 : 1}
        />
      )
    })
  }, [places, markerIcons, selectedMarkerIcons, selectedPlaceId, onPlaceSelect, isLoaded])

  // 숙소 마커용 아이콘 (커스텀 핀)
  const accommodationIcon = useMemo(() => {
    if (!isLoaded) return undefined
    return createAccommodationMarkerIcon()
  }, [isLoaded])

  // 숙소 마커를 메모이제이션
  const accommodationMarkers = useMemo(() => {
    if (!isLoaded || !accommodationIcon) return []
    return accommodations.map((acc) => {
      return (
        <Marker
          key={`acc-${acc.id}`}
          position={{ lat: acc.latitude, lng: acc.longitude }}
          icon={accommodationIcon}
          title={acc.name}
        />
      )
    })
  }, [accommodations, accommodationIcon, isLoaded])

  // 경로 Polyline 좌표 계산
  const routeCoordinates = useMemo(() => {
    if (!routePath || routePath.length < 2) return []
    // order 순으로 정렬
    const sorted = [...routePath].sort((a, b) => a.order - b.order)
    return sorted.map((point) => ({ lat: point.lat, lng: point.lng }))
  }, [routePath])

  // 순서 라벨용 placeId → order 매핑
  const placeOrderMap = useMemo(() => {
    if (!routePath || !showOrderLabels) return new Map<string, number>()
    const map = new Map<string, number>()
    routePath.forEach((point) => {
      if (point.placeId) {
        map.set(point.placeId, point.order)
      }
    })
    return map
  }, [routePath, showOrderLabels])

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-red-500">지도를 불러오는데 실패했습니다.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-muted-foreground">지도 로딩 중...</p>
      </div>
    )
  }

  return (
    <div data-testid="google-map" className="w-full h-full relative">
    {/* 기본 위치 사용 중 안내 */}
    {isUsingDefaultCenter && (
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-full shadow-sm">
        장소를 추가하면 해당 위치로 이동합니다
      </div>
    )}
    <GoogleMapComponent
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={isUsingDefaultCenter ? 5 : 13}
      onLoad={onLoad}
      onClick={() => onPlaceSelect(null)}
    >
      {markers}
      {accommodationMarkers}

      {/* 경로 Polyline */}
      {showRoute && routeCoordinates.length >= 2 && (
        <Polyline
          path={routeCoordinates}
          options={ROUTE_POLYLINE_OPTIONS}
        />
      )}

      {/* 순서 라벨 오버레이 (장소 + 숙소 모두 표시) */}
      {showOrderLabels && routePath && routePath.map((point) => (
        <OverlayView
          key={`order-${point.placeId || point.accommodationId || point.order}`}
          position={{ lat: point.lat, lng: point.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ pointerEvents: 'none', marginTop: '-36px' }}
          >
            <div
              className={`text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md ${
                point.itemType === 'accommodation' ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              {point.order}
            </div>
          </div>
        </OverlayView>
      ))}

      {selectedPlace && (() => {
        const placeStyle = CATEGORY_STYLES[selectedPlace.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other
        return (
          <InfoWindow
            position={{ lat: selectedPlace.latitude, lng: selectedPlace.longitude }}
            onCloseClick={() => onPlaceSelect(null)}
          >
            <div className="min-w-[200px] max-w-[280px]">
              {/* 헤더: 카테고리 아이콘 + 이름 */}
              <div className="flex items-start gap-2 mb-2">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: placeStyle.color + '15', color: placeStyle.color }}
                >
                  <placeStyle.Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{selectedPlace.name}</h3>
                  <span
                    className="inline-block text-xs px-1.5 py-0.5 rounded mt-1"
                    style={{ backgroundColor: placeStyle.color + '15', color: placeStyle.color }}
                  >
                    {placeStyle.label}
                  </span>
                </div>
              </div>

              {/* 평점 */}
              {selectedPlace.rating && (
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-sm ${star <= Math.round(selectedPlace.rating!) ? 'text-yellow-400' : 'text-gray-200'}`}
                      >
                        <Star className="w-3 h-3" />
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-medium">{selectedPlace.rating.toFixed(1)}</span>
                  {selectedPlace.userRatingsTotal && (
                    <span className="text-xs text-gray-400">
                      ({selectedPlace.userRatingsTotal.toLocaleString()}개 리뷰)
                    </span>
                  )}
                </div>
              )}

              {/* 코멘트 (있는 경우) */}
              {selectedPlace.comment && (
                <p className="text-xs text-gray-600 mb-2 px-1 line-clamp-2">
                  {selectedPlace.comment}
                </p>
              )}

              {/* 액션 버튼 */}
              {onOpenDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDetails(selectedPlace.id)
                  }}
                  className="w-full text-sm font-medium text-white py-2 px-3 rounded-lg transition-colors"
                  style={{ backgroundColor: placeStyle.color }}
                >
                  상세 정보 보기
                </button>
              )}
            </div>
          </InfoWindow>
        )
      })()}
    </GoogleMapComponent>
    </div>
  )
}
