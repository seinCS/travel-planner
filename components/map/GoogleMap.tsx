'use client'

import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { GoogleMap as GoogleMapComponent, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { CATEGORY_STYLES } from '@/lib/constants'

// 지도 설정 상수
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

interface GoogleMapProps {
  places: MapPlace[]
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
}

/**
 * 히든 핀을 포함한 bounds 계산
 */
const calculateBoundsWithHiddenPin = (
  places: MapPlace[],
  destinationCenter?: { lat: number; lng: number }
): google.maps.LatLngBounds => {
  const bounds = new google.maps.LatLngBounds()

  // 1. 히든 핀 (destination) 추가
  if (destinationCenter) {
    bounds.extend(destinationCenter)
  }

  // 2. 실제 장소들 추가
  places.forEach((place) => {
    bounds.extend({ lat: place.latitude, lng: place.longitude })
  })

  return bounds
}

/**
 * zoom 제한이 적용된 fitBounds
 */
const fitBoundsWithLimits = (
  map: google.maps.Map,
  bounds: google.maps.LatLngBounds
): void => {
  map.fitBounds(bounds)

  // fitBounds 완료 후 zoom 보정
  google.maps.event.addListenerOnce(map, 'idle', () => {
    const zoom = map.getZoom()
    if (zoom !== undefined) {
      if (zoom > MAP_CONFIG.MAX_ZOOM) {
        map.setZoom(MAP_CONFIG.MAX_ZOOM)
      } else if (zoom < MAP_CONFIG.MIN_ZOOM) {
        map.setZoom(MAP_CONFIG.MIN_ZOOM)
      }
    }
  })
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

export function GoogleMap({
  places,
  selectedPlaceId,
  onPlaceSelect,
  onOpenDetails,
  center,
  destinationCenter,
  fitBoundsKey,
  enablePanToOnSelect = true,
}: GoogleMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const prevSelectedPlaceIdRef = useRef<string | null>(null)

  // Google Maps API 키 검증
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey && typeof window !== 'undefined') {
    console.error(
      '[GoogleMap] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined. ' +
      'Please set this environment variable to enable Google Maps.'
    )
  }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
  })

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    // fitBounds 로직은 useEffect로 이전 (fitBoundsKey 기반)
  }, [])

  // fitBoundsKey 변경 시 fitBounds 실행
  useEffect(() => {
    if (!map) return
    if (fitBoundsKey === undefined) return

    // 장소가 없고 destinationCenter가 있는 경우
    if (places.length === 0 && destinationCenter) {
      map.setCenter(destinationCenter)
      map.setZoom(MAP_CONFIG.DEFAULT_ZOOM_NO_PLACES)
      return
    }

    // 장소가 없고 destinationCenter도 없는 경우
    if (places.length === 0 && !destinationCenter) {
      map.setCenter(MAP_CONFIG.DEFAULT_CENTER)
      map.setZoom(5)
      return
    }

    // 장소가 있는 경우 - 히든 핀 포함 fitBounds
    if (places.length > 0) {
      const bounds = calculateBoundsWithHiddenPin(places, destinationCenter)
      fitBoundsWithLimits(map, bounds)
    }
  }, [map, fitBoundsKey, places, destinationCenter])

  // 장소 선택 시 panTo (enablePanToOnSelect가 true일 때만)
  useEffect(() => {
    if (!map) return
    if (!enablePanToOnSelect) return

    // 이전 선택과 같으면 스킵 (같은 장소 재클릭 방지)
    if (selectedPlaceId === prevSelectedPlaceIdRef.current) return
    prevSelectedPlaceIdRef.current = selectedPlaceId

    if (!selectedPlaceId) return

    const place = places.find((p) => p.id === selectedPlaceId)
    if (place) {
      map.panTo({ lat: place.latitude, lng: place.longitude })
      // zoom은 유지 (변경하지 않음)
    }
  }, [map, selectedPlaceId, places, enablePanToOnSelect])

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
  // 의존성 배열: CATEGORY_STYLES는 lib/constants.ts에서 정의된 불변 상수이므로 의존성에서 제외
  // (런타임에 변경되지 않는 모듈 레벨 상수)
  const markerIcons = useMemo(() => {
    if (!isLoaded) return {} as Record<string, google.maps.Symbol>
    const icons: Record<string, google.maps.Symbol> = {}
    Object.entries(CATEGORY_STYLES).forEach(([key, style]) => {
      icons[key] = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: style.color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10,
      }
    })
    return icons
  }, [isLoaded])

  // 마커들을 메모이제이션
  const markers = useMemo(() => {
    if (!isLoaded) return []
    return places.map((place) => {
      const style = CATEGORY_STYLES[place.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other
      const icon = markerIcons[place.category] || markerIcons.other

      return (
        <Marker
          key={place.id}
          position={{ lat: place.latitude, lng: place.longitude }}
          onClick={() => onPlaceSelect(place.id)}
          icon={icon}
          label={{
            text: style.icon,
            fontSize: '14px',
          }}
        />
      )
    })
  }, [places, markerIcons, onPlaceSelect, isLoaded])

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

      {selectedPlace && (
        <InfoWindow
          position={{ lat: selectedPlace.latitude, lng: selectedPlace.longitude }}
          onCloseClick={() => onPlaceSelect(null)}
        >
          <div className="p-2 max-w-xs">
            <h3 className="font-semibold text-sm">{selectedPlace.name}</h3>

            {/* 평점 표시 */}
            {selectedPlace.rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500 text-xs">★</span>
                <span className="text-xs font-medium">{selectedPlace.rating.toFixed(1)}</span>
                {selectedPlace.userRatingsTotal && (
                  <span className="text-xs text-gray-400">
                    ({selectedPlace.userRatingsTotal.toLocaleString()})
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              {CATEGORY_STYLES[selectedPlace.category as keyof typeof CATEGORY_STYLES]?.label || '기타'}
            </p>

            {/* 상세 보기 버튼 */}
            {onOpenDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenDetails(selectedPlace.id)
                }}
                className="text-xs text-blue-600 mt-2 hover:underline block"
              >
                상세 정보 보기 →
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMapComponent>
    </div>
  )
}
