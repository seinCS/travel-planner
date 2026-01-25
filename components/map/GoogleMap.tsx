'use client'

import { useCallback, useState, useMemo } from 'react'
import { GoogleMap as GoogleMapComponent, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { CATEGORY_STYLES } from '@/lib/constants'

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
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const defaultCenter = {
  lat: 35.6762,
  lng: 139.6503,
}

export function GoogleMap({ places, selectedPlaceId, onPlaceSelect, onOpenDetails, center }: GoogleMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)

    // 모든 마커가 보이도록 bounds 조정
    if (places.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      places.forEach((place) => {
        bounds.extend({ lat: place.latitude, lng: place.longitude })
      })
      map.fitBounds(bounds)
    }
  }, [places])

  const selectedPlace = places.find((p) => p.id === selectedPlaceId)

  // 맵 중심점 메모이제이션 - hooks는 조건부 return 전에 호출해야 함 (Rules of Hooks)
  const mapCenter = useMemo(() =>
    center || (places.length > 0
      ? { lat: places[0].latitude, lng: places[0].longitude }
      : defaultCenter),
    [center, places]
  )

  // 마커 아이콘 캐싱 - isLoaded가 false면 빈 객체 반환
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
    <div data-testid="google-map" className="w-full h-full">
    <GoogleMapComponent
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={13}
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
