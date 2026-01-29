'use client'

import { memo, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ExternalLink, Footprints, Transit } from '@/lib/icons'
import {
  generateGoogleMapsDirectionsUrl,
  WALKING_THRESHOLD_SECONDS,
} from '@/infrastructure/services/DistanceService'
import type { RouteSegment, TravelMode } from '@/types/route'

interface DistanceIndicatorProps {
  segment: RouteSegment
  fromPlace: { latitude: number; longitude: number }
  toPlace: { latitude: number; longitude: number }
}

/**
 * DistanceIndicator 컴포넌트
 *
 * 두 일정 항목 사이의 거리/시간 정보를 표시하고
 * 도보 30분 이상일 경우 대중교통 시간도 표시합니다.
 */
export const DistanceIndicator = memo(function DistanceIndicator({
  segment,
  fromPlace,
  toPlace,
}: DistanceIndicatorProps) {
  // 30분 이상이고 대중교통 시간이 있으면 대중교통 모드로 시작
  const isLongWalk = segment.duration.value >= WALKING_THRESHOLD_SECONDS
  const hasTransit = !!segment.transitDuration

  // 기본 모드: 30분 이상이고 대중교통 있으면 transit, 아니면 walking
  const defaultMode: TravelMode = isLongWalk && hasTransit ? 'transit' : 'walking'
  const [mode, setMode] = useState<TravelMode>(defaultMode)

  // 현재 모드에 따른 시간 표시
  const displayDuration = useMemo(() => {
    if (mode === 'transit' && segment.transitDuration) {
      return segment.transitDuration
    }
    return segment.duration
  }, [mode, segment.duration, segment.transitDuration])

  // Google Maps 길찾기 URL (현재 모드에 따라)
  const directionsUrl = generateGoogleMapsDirectionsUrl(
    fromPlace.latitude,
    fromPlace.longitude,
    toPlace.latitude,
    toPlace.longitude,
    mode
  )

  const handleDirectionsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(directionsUrl, '_blank', 'noopener,noreferrer')
  }

  const toggleMode = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMode((prev) => (prev === 'walking' ? 'transit' : 'walking'))
  }

  return (
    <div className="relative flex items-center justify-center py-1 pl-2">
      {/* 점선 세로 라인 */}
      <div className="absolute left-[17px] top-0 bottom-0 border-l-2 border-dashed border-gray-300" />

      {/* 거리/시간 정보 박스 */}
      <div className="relative flex items-center gap-1.5 ml-4 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-muted-foreground z-10">
        {/* 모드 아이콘 (클릭 가능한 경우 토글) */}
        {hasTransit ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleMode}
                  className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                >
                  {mode === 'walking' ? (
                    <Footprints className="w-3 h-3 text-gray-500" />
                  ) : (
                    <Transit className="w-3 h-3 text-blue-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>
                  {mode === 'walking'
                    ? '대중교통으로 보기'
                    : '도보로 보기'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Footprints className="w-3 h-3 text-gray-400" />
        )}

        {/* 거리 */}
        <span className="font-medium text-gray-600">{segment.distance.text}</span>
        <span className="text-gray-400">|</span>

        {/* 시간 (모드에 따라 변경) */}
        <span className={`${mode === 'transit' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
          {displayDuration.text}
        </span>

        {/* 30분 이상 구간 표시 */}
        {isLongWalk && !hasTransit && (
          <span className="text-amber-500 text-[10px]">장거리</span>
        )}

        {/* 구글맵 길찾기 버튼 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-0.5 hover:bg-gray-200"
                onClick={handleDirectionsClick}
              >
                <ExternalLink className="w-3 h-3 text-blue-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <p>구글맵에서 길찾기 ({mode === 'walking' ? '도보' : '대중교통'})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
})
