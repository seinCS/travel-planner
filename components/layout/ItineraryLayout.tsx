'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo, useCallback } from 'react'
import { useItinerary } from '@/hooks/queries/useItinerary'
import type { Place } from '@/types'
import type { RoutePathPoint } from '@/components/itinerary/ItineraryView'

const GoogleMap = dynamic(() => import('@/components/map/GoogleMap').then(mod => mod.GoogleMap), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-white/40 animate-pulse rounded-2xl flex items-center justify-center backdrop-blur-sm">
      <span className="text-muted-foreground">지도 로딩 중...</span>
    </div>
  ),
})

const ItineraryView = dynamic(() => import('@/components/itinerary/ItineraryView').then(mod => mod.ItineraryView), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-2xl">
      <span className="text-muted-foreground">일정 로딩 중...</span>
    </div>
  ),
})

interface ItineraryLayoutProps {
  projectId: string
  places: Place[]
  selectedPlaceId: string | null
  mapCenter?: { lat: number; lng: number }
  /** destination 좌표 (히든 핀용) */
  destinationCenter?: { lat: number; lng: number }
  /** fitBounds 트리거 키 */
  fitBoundsKey?: string | number
  selectedDayPlaceIds: string[] | null
  onPlaceSelect: (placeId: string | null) => void
  onOpenDetails: (placeId: string) => void
  onDaySelect: (dayNumber: number | null, placeIds: string[]) => void
}

export function ItineraryLayout({
  projectId,
  places,
  selectedPlaceId,
  mapCenter,
  destinationCenter,
  fitBoundsKey,
  selectedDayPlaceIds,
  onPlaceSelect,
  onOpenDetails,
  onDaySelect,
}: ItineraryLayoutProps) {
  // 일정 데이터에서 숙소 정보 가져오기
  const { itinerary } = useItinerary(projectId)

  // 경로 시각화용 상태
  const [routePath, setRoutePath] = useState<RoutePathPoint[] | null>(null)

  // 경로 변경 핸들러
  const handleRouteChange = useCallback((path: RoutePathPoint[] | null) => {
    setRoutePath(path)
  }, [])

  // 숙소를 맵 마커용 형식으로 변환 (좌표가 있는 숙소만)
  const mapAccommodations = useMemo(() => {
    if (!itinerary?.accommodations) return []
    return itinerary.accommodations
      .filter((acc) => acc.latitude !== null && acc.longitude !== null)
      .map((acc) => ({
        id: acc.id,
        name: acc.name,
        address: acc.address,
        latitude: acc.latitude as number,
        longitude: acc.longitude as number,
        checkIn: acc.checkIn,
        checkOut: acc.checkOut,
      }))
  }, [itinerary?.accommodations])

  // 선택된 Day의 장소만 필터링
  // Day 미선택 시: 모든 장소 표시 (요구사항 2.4)
  const mapPlaces = selectedDayPlaceIds === null
    ? places  // Day 미선택 시 모든 장소 표시
    : places.filter((p) => selectedDayPlaceIds.includes(p.id))

  return (
    <>
      {/* 데스크탑 (≥1024px): 2컬럼 */}
      <div className="hidden lg:grid grid-cols-2 gap-5 h-full">
        <div className="glass-card overflow-hidden min-h-[400px]">
          <GoogleMap
            places={mapPlaces}
            accommodations={mapAccommodations}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={onPlaceSelect}
            onOpenDetails={onOpenDetails}
            center={mapCenter}
            destinationCenter={destinationCenter}
            fitBoundsKey={fitBoundsKey}
            enablePanToOnSelect={true}
            routePath={routePath || undefined}
            showRoute={!!routePath}
            showOrderLabels={!!routePath}
          />
        </div>

        <div className="glass-card overflow-hidden h-full">
          <ItineraryView
            projectId={projectId}
            places={places}
            onDaySelect={onDaySelect}
            onPlaceClick={(placeId) => {
              onPlaceSelect(placeId)
              onOpenDetails(placeId)
            }}
            onRouteChange={handleRouteChange}
          />
        </div>
      </div>

      {/* 태블릿 (640-1023px): 2컬럼 (작은 사이드바) */}
      <div className="hidden sm:grid lg:hidden grid-cols-[1fr_320px] gap-5 h-full">
        <div className="glass-card overflow-hidden min-h-[400px]">
          <GoogleMap
            places={mapPlaces}
            accommodations={mapAccommodations}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={onPlaceSelect}
            onOpenDetails={onOpenDetails}
            center={mapCenter}
            destinationCenter={destinationCenter}
            fitBoundsKey={fitBoundsKey}
            enablePanToOnSelect={true}
            routePath={routePath || undefined}
            showRoute={!!routePath}
            showOrderLabels={!!routePath}
          />
        </div>

        <div className="glass-card overflow-hidden h-full">
          <ItineraryView
            projectId={projectId}
            places={places}
            onDaySelect={onDaySelect}
            onPlaceClick={(placeId) => {
              onPlaceSelect(placeId)
              onOpenDetails(placeId)
            }}
            onRouteChange={handleRouteChange}
          />
        </div>
      </div>

      {/* 모바일 (<640px): 서브탭으로 전환 (page.tsx에서 처리) */}
    </>
  )
}
