'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlaceSearchInput } from './PlaceSearchInput'
import { usePlaceSearch } from '@/hooks/queries/usePlaceSearch'
import { CATEGORY_STYLES, type PlaceCategory } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type {
  PlaceSearchPrediction,
  PlaceSearchDetails,
} from '@/infrastructure/api-client/places.api'

interface PlaceSearchModalProps {
  /** Modal open state */
  open: boolean
  /** Called when modal open state changes */
  onOpenChange: (open: boolean) => void
  /** Location bias for search (project destination coordinates) */
  locationBias?: { lat: number; lng: number }
  /** Called when a place is added */
  onAddPlace: (data: {
    name: string
    category: PlaceCategory
    latitude: number
    longitude: number
    googlePlaceId?: string
    formattedAddress?: string
    googleMapsUrl?: string
    rating?: number | null
    userRatingsTotal?: number | null
    priceLevel?: number | null
  }) => Promise<boolean>
  /** Destination name for display */
  destinationName?: string
}

type Step = 'search' | 'confirm'

export function PlaceSearchModal({
  open,
  onOpenChange,
  locationBias,
  onAddPlace,
  destinationName,
}: PlaceSearchModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [selectedPrediction, setSelectedPrediction] =
    useState<PlaceSearchPrediction | null>(null)
  const [placeDetails, setPlaceDetails] = useState<PlaceSearchDetails | null>(
    null
  )
  const [selectedCategory, setSelectedCategory] =
    useState<PlaceCategory>('attraction')
  const [isAdding, setIsAdding] = useState(false)

  const {
    query,
    setQuery,
    predictions,
    isLoading,
    clear,
    getPlaceDetails,
    isLoadingDetails,
  } = usePlaceSearch({
    locationBias,
    language: 'ko',
    debounceMs: 300,
  })

  // Handle prediction selection
  const handleSelectPrediction = useCallback(
    async (prediction: PlaceSearchPrediction) => {
      setSelectedPrediction(prediction)

      // Get place details
      const details = await getPlaceDetails(prediction.placeId)
      if (details) {
        setPlaceDetails(details)
        // Auto-detect category from types
        setSelectedCategory(detectCategory(details.types))
        setStep('confirm')
      }
    },
    [getPlaceDetails]
  )

  // Detect category from Google Place types
  const detectCategory = (types: string[]): PlaceCategory => {
    if (types.includes('restaurant') || types.includes('food')) return 'restaurant'
    if (types.includes('cafe')) return 'cafe'
    if (types.includes('lodging') || types.includes('hotel')) return 'accommodation'
    if (types.includes('store') || types.includes('shopping_mall')) return 'shopping'
    if (
      types.includes('tourist_attraction') ||
      types.includes('museum') ||
      types.includes('park')
    )
      return 'attraction'
    return 'other'
  }

  // Handle add place
  const handleAddPlace = useCallback(async () => {
    if (!placeDetails) return

    setIsAdding(true)
    try {
      const success = await onAddPlace({
        name: placeDetails.name,
        category: selectedCategory,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        googlePlaceId: placeDetails.placeId,
        formattedAddress: placeDetails.formattedAddress,
        googleMapsUrl: placeDetails.googleMapsUrl || undefined,
        rating: placeDetails.rating,
        userRatingsTotal: placeDetails.userRatingsTotal,
        priceLevel: placeDetails.priceLevel,
      })

      if (success) {
        // Reset and close
        handleReset()
        onOpenChange(false)
      }
    } finally {
      setIsAdding(false)
    }
  }, [placeDetails, selectedCategory, onAddPlace, onOpenChange])

  // Reset modal state
  const handleReset = useCallback(() => {
    setStep('search')
    setSelectedPrediction(null)
    setPlaceDetails(null)
    setSelectedCategory('attraction')
    clear()
  }, [clear])

  // Handle modal close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleReset()
      }
      onOpenChange(open)
    },
    [onOpenChange, handleReset]
  )

  // Go back to search
  const handleBack = useCallback(() => {
    setStep('search')
    setSelectedPrediction(null)
    setPlaceDetails(null)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' ? '장소 검색' : '장소 추가'}
          </DialogTitle>
          <DialogDescription>
            {step === 'search'
              ? destinationName
                ? `${destinationName} 주변의 장소를 검색하세요`
                : 'Google Maps에서 장소를 검색하세요'
              : '카테고리를 선택하고 장소를 추가하세요'}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' ? (
          <div className="space-y-4">
            {/* Search Input */}
            <PlaceSearchInput
              value={query}
              onChange={setQuery}
              predictions={predictions}
              onSelect={handleSelectPrediction}
              isLoading={isLoading || isLoadingDetails}
              placeholder="장소 이름, 주소 검색..."
              autoFocus
            />

            {/* Loading state for details */}
            {isLoadingDetails && (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                <span className="ml-2 text-sm text-muted-foreground">
                  장소 정보를 불러오는 중...
                </span>
              </div>
            )}

            {/* Search hint */}
            {query.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                <p>장소 이름이나 주소를 입력하여 검색하세요</p>
                {destinationName && (
                  <p className="mt-1 text-xs">
                    {destinationName} 주변 결과가 우선 표시됩니다
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Place Preview Card */}
            {placeDetails && (
              <div className="rounded-lg border bg-gray-50 p-4">
                {/* Place Name & Address */}
                <h3 className="font-semibold text-lg">{placeDetails.name}</h3>
                {placeDetails.formattedAddress && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {placeDetails.formattedAddress}
                  </p>
                )}

                {/* Rating */}
                {placeDetails.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium">
                      {placeDetails.rating.toFixed(1)}
                    </span>
                    {placeDetails.userRatingsTotal && (
                      <span className="text-sm text-muted-foreground">
                        ({placeDetails.userRatingsTotal.toLocaleString()}개 리뷰)
                      </span>
                    )}
                  </div>
                )}

                {/* Price Level */}
                {placeDetails.priceLevel !== null &&
                  placeDetails.priceLevel !== undefined && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm text-muted-foreground">
                        가격대:
                      </span>
                      <span className="text-sm">
                        {'₩'.repeat(placeDetails.priceLevel + 1)}
                      </span>
                    </div>
                  )}
              </div>
            )}

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(value as PlaceCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
                disabled={isAdding}
              >
                뒤로
              </Button>
              <Button
                onClick={handleAddPlace}
                className="flex-1"
                disabled={isAdding || !placeDetails}
              >
                {isAdding ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    추가 중...
                  </>
                ) : (
                  '장소 추가'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
