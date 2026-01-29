'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CATEGORY_STYLES, PlaceCategory } from '@/lib/constants'
import type { Place } from '@/types'
import { Star } from '@/components/icons'

interface PlacePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  places: Place[]
  onSelectPlace: (placeId: string) => void
  excludePlaceIds?: string[]
  isLoading?: boolean
}

type CategoryFilter = PlaceCategory | 'all'

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'restaurant', label: '맛집' },
  { value: 'cafe', label: '카페' },
  { value: 'attraction', label: '관광지' },
  { value: 'shopping', label: '쇼핑' },
  { value: 'accommodation', label: '숙소' },
  { value: 'other', label: '기타' },
]

export function PlacePickerModal({
  open,
  onOpenChange,
  places,
  onSelectPlace,
  excludePlaceIds = [],
  isLoading = false,
}: PlacePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)

  // Reset state when modal closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('')
      setCategoryFilter('all')
      setAddingPlaceId(null)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // Filter available places
  const filteredPlaces = useMemo(() => {
    let result = places.filter((p) => !excludePlaceIds.includes(p.id))

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.formattedAddress?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      )
    }

    return result
  }, [places, excludePlaceIds, categoryFilter, searchQuery])

  // Count by category for filter badges
  const categoryCounts = useMemo(() => {
    const available = places.filter((p) => !excludePlaceIds.includes(p.id))
    const counts: Record<CategoryFilter, number> = {
      all: available.length,
      restaurant: 0,
      cafe: 0,
      attraction: 0,
      shopping: 0,
      accommodation: 0,
      other: 0,
    }
    available.forEach((p) => {
      const cat = p.category as PlaceCategory
      if (cat in counts) {
        counts[cat]++
      } else {
        counts.other++
      }
    })
    return counts
  }, [places, excludePlaceIds])

  // Handle place selection
  const handleSelectPlace = useCallback(
    async (placeId: string) => {
      if (addingPlaceId || isLoading) return

      setAddingPlaceId(placeId)
      try {
        await onSelectPlace(placeId)
        handleOpenChange(false)
      } catch {
        // Error handled by parent, just reset loading state
        setAddingPlaceId(null)
      }
    },
    [addingPlaceId, isLoading, onSelectPlace, handleOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle>장소 선택</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="장소 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 h-10"
              autoFocus
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map(({ value, label }) => {
              const count = categoryCounts[value]
              const isActive = categoryFilter === value
              const style = value !== 'all' ? CATEGORY_STYLES[value] : null

              return (
                <Button
                  key={value}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(value)}
                  className={`h-7 text-xs px-2.5 ${
                    isActive && style
                      ? ''
                      : !isActive && style
                        ? 'hover:border-current'
                        : ''
                  }`}
                  style={
                    style
                      ? {
                          ...(isActive
                            ? { backgroundColor: style.color, borderColor: style.color }
                            : { color: style.color, borderColor: style.color + '40' }),
                        }
                      : undefined
                  }
                  disabled={count === 0}
                >
                  {style && <style.Icon className="w-3.5 h-3.5 mr-1 inline" />}
                  {label}
                  <span className="ml-1 opacity-70">({count})</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Place List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {searchQuery || categoryFilter !== 'all'
                  ? '검색 결과가 없습니다.'
                  : '추가할 장소가 없습니다.'}
              </p>
              {(searchQuery || categoryFilter !== 'all') && (
                <button
                  className="text-xs text-primary mt-2 hover:underline"
                  onClick={() => {
                    setSearchQuery('')
                    setCategoryFilter('all')
                  }}
                >
                  필터 초기화
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredPlaces.map((place) => {
                const style =
                  CATEGORY_STYLES[place.category as keyof typeof CATEGORY_STYLES] ||
                  CATEGORY_STYLES.other
                const isAdding = addingPlaceId === place.id
                const isDisabled = addingPlaceId !== null || isLoading

                return (
                  <div
                    key={place.id}
                    className={`flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-transparent transition-all ${
                      isAdding
                        ? 'opacity-70 cursor-wait border-primary bg-primary/5'
                        : isDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:border-gray-200 hover:bg-white hover:shadow-sm active:scale-[0.99]'
                    }`}
                    onClick={() => !isDisabled && handleSelectPlace(place.id)}
                    role="button"
                    tabIndex={isDisabled ? -1 : 0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        !isDisabled && handleSelectPlace(place.id)
                      }
                    }}
                  >
                    {/* Category Icon */}
                    <div
                      className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                      style={{
                        backgroundColor: style.color + '15',
                        color: style.color,
                      }}
                    >
                      {isAdding ? (
                        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <style.Icon className="w-5 h-5" />
                      )}
                    </div>

                    {/* Place Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm truncate max-w-[180px]">
                          {place.name}
                        </h4>
                        <span
                          className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-md font-medium"
                          style={{
                            backgroundColor: style.color + '15',
                            color: style.color,
                          }}
                        >
                          {style.label}
                        </span>
                      </div>

                      {/* Rating */}
                      {place.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">
                            {place.rating.toFixed(1)}
                          </span>
                          {place.userRatingsTotal && (
                            <span className="text-xs text-muted-foreground">
                              ({place.userRatingsTotal.toLocaleString()})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Address */}
                      {place.formattedAddress && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[280px]">
                          {place.formattedAddress}
                        </p>
                      )}
                    </div>

                    {/* Add indicator */}
                    {isAdding && (
                      <span className="flex-shrink-0 text-xs text-primary font-medium self-center">
                        추가 중...
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with count */}
        <div className="px-4 py-3 border-t bg-gray-50/50 text-center">
          <p className="text-xs text-muted-foreground">
            {filteredPlaces.length}개 장소 선택 가능
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
