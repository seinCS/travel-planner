'use client'

import { useMemo } from 'react'
import { CATEGORY_STYLES } from '@/lib/constants'
import { Place } from '@/types'
import { Button } from '@/components/ui/button'

interface PlaceListProps {
  places: Place[]
  selectedPlaceId: string | null
  onPlaceSelect: (placeId: string) => void
  onPlaceDelete: (placeId: string) => void
  onOpenDetails?: (placeId: string) => void
  onEditPlace?: (place: Place) => void
  categoryFilter: string | null
  onCategoryFilterChange: (category: string | null) => void
}

export function PlaceList({
  places,
  selectedPlaceId,
  onPlaceSelect,
  onPlaceDelete,
  onOpenDetails,
  onEditPlace,
  categoryFilter,
  onCategoryFilterChange,
}: PlaceListProps) {
  // 필터링된 장소 목록 메모이제이션 (rerender-memo 패턴)
  const filteredPlaces = useMemo(() =>
    categoryFilter
      ? places.filter((p) => p.category === categoryFilter)
      : places,
    [places, categoryFilter]
  )

  // 카테고리별 개수를 한 번에 계산 (js-combine-iterations 패턴)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    places.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1
    })
    return counts
  }, [places])

  // categories 배열 메모이제이션
  const categories = useMemo(() => Object.entries(CATEGORY_STYLES), [])

  return (
    <div className="h-full flex flex-col">
      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
        <Button
          size="sm"
          variant={categoryFilter === null ? 'default' : 'outline'}
          onClick={() => onCategoryFilterChange(null)}
        >
          전체 ({places.length})
        </Button>
        {categories.map(([key, style]) => {
          const count = categoryCounts[key] || 0
          if (count === 0) return null
          return (
            <Button
              key={key}
              size="sm"
              variant={categoryFilter === key ? 'default' : 'outline'}
              onClick={() => onCategoryFilterChange(key)}
              style={{
                borderColor: categoryFilter === key ? style.color : undefined,
                backgroundColor: categoryFilter === key ? style.color : undefined,
              }}
            >
              {style.icon} {style.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* 장소 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {places.length === 0 ? '아직 장소가 없습니다.' : '해당 카테고리에 장소가 없습니다.'}
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const style = CATEGORY_STYLES[place.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other
            const isSelected = place.id === selectedPlaceId

            return (
              <div
                key={place.id}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                `}
                onClick={() => onPlaceSelect(place.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={{ backgroundColor: style.color + '20', color: style.color }}
                      >
                        {style.icon}
                      </span>
                      <h3 className="font-medium text-sm truncate">{place.name}</h3>
                    </div>
                    {/* 평점 표시 */}
                    {place.rating && (
                      <div className="flex items-center gap-1 mt-1 ml-8">
                        <span className="text-yellow-500 text-xs">★</span>
                        <span className="text-xs">{place.rating.toFixed(1)}</span>
                        {place.userRatingsTotal && (
                          <span className="text-xs text-muted-foreground">
                            ({place.userRatingsTotal.toLocaleString()})
                          </span>
                        )}
                      </div>
                    )}
                    {place.comment && (
                      <p className="text-xs text-muted-foreground mt-1 ml-8 line-clamp-2">
                        {place.comment}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 md:gap-0 flex-shrink-0">
                    {onEditPlace && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditPlace(place)
                        }}
                      >
                        수정
                      </Button>
                    )}
                    {onOpenDetails && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-500 hover:text-blue-700 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDetails(place.id)
                        }}
                      >
                        상세
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('이 장소를 삭제하시겠습니까?')) {
                          onPlaceDelete(place.id)
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
