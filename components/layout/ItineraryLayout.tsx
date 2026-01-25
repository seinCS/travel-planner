'use client'

import dynamic from 'next/dynamic'
import type { Place } from '@/types'

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
  selectedDayPlaceIds,
  onPlaceSelect,
  onOpenDetails,
  onDaySelect,
}: ItineraryLayoutProps) {
  // 선택된 Day의 장소만 필터링
  const mapPlaces = selectedDayPlaceIds === null
    ? []  // 일정 탭에서는 Day 선택 전까지 빈 지도
    : places.filter((p) => selectedDayPlaceIds.includes(p.id))

  return (
    <>
      {/* 데스크탑 (≥1024px): 2컬럼 */}
      <div className="hidden lg:grid grid-cols-2 gap-5 h-full">
        <div className="glass-card overflow-hidden min-h-[400px]">
          <GoogleMap
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={onPlaceSelect}
            onOpenDetails={onOpenDetails}
            center={mapCenter}
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
          />
        </div>
      </div>

      {/* 태블릿 (640-1023px): 2컬럼 (작은 사이드바) */}
      <div className="hidden sm:grid lg:hidden grid-cols-[1fr_320px] gap-5 h-full">
        <div className="glass-card overflow-hidden min-h-[400px]">
          <GoogleMap
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={onPlaceSelect}
            onOpenDetails={onOpenDetails}
            center={mapCenter}
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
          />
        </div>
      </div>

      {/* 모바일 (<640px): 서브탭으로 전환 (page.tsx에서 처리) */}
    </>
  )
}
