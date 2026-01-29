'use client'

import { useState } from 'react'
import DOMPurify from 'dompurify'
import { MapPin, Plus, Check, Loader2, Star, CircleCheck, Info } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useAddPlaceFromChat } from '@/hooks/mutations/useAddPlaceFromChat'
import type { RecommendedPlace } from '@/domain/interfaces/ILLMService'
import type { ValidatedPlace } from '@/domain/interfaces/IPlaceValidationService'
import { cn } from '@/lib/utils'
import { CATEGORY_STYLES, type PlaceCategory } from '@/lib/constants'

type PlaceCardPlace = RecommendedPlace & Partial<Pick<ValidatedPlace, 'isVerified' | 'rating' | 'userRatingsTotal' | 'distanceFromReference'>>

interface PlaceCardProps {
  place: PlaceCardPlace
  projectId: string
}


export function PlaceCard({ place, projectId }: PlaceCardProps) {
  const { addPlace, isAdding, isPlaceAdded } = useAddPlaceFromChat(projectId)
  const [addError, setAddError] = useState<string | null>(null)

  const isAdded = isPlaceAdded(place.name)

  // Sanitize description to prevent XSS
  const sanitizedDescription = place.description
    ? DOMPurify.sanitize(place.description, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] })
    : null

  const handleAdd = async () => {
    setAddError(null)
    const result = await addPlace(place)
    if (!result.success && !result.isDuplicate) {
      setAddError(result.error || '추가 실패')
    }
  }

  const categoryStyle = CATEGORY_STYLES[place.category as PlaceCategory] || CATEGORY_STYLES.other
  const categoryLabel = categoryStyle.label
  const CategoryIcon = categoryStyle.Icon

  return (
    <div
      className={cn(
        'bg-white border rounded-lg p-3 shadow-sm',
        'hover:shadow-md transition-shadow'
      )}
      data-testid="place-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CategoryIcon className="w-5 h-5 flex-shrink-0" style={{ color: categoryStyle.color }} />
            <h4 className="font-medium text-gray-900 truncate">{place.name}</h4>
          </div>
          {place.name_en && (
            <p className="text-xs text-gray-500 truncate">{place.name_en}</p>
          )}
        </div>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
          {categoryLabel}
        </span>
      </div>

      {/* Address */}
      {place.address && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{place.address}</span>
        </div>
      )}

      {/* Description */}
      {sanitizedDescription && (
        <p
          className="mt-2 text-sm text-gray-600 line-clamp-2"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      )}

      {/* Validation Info */}
      {(place.isVerified !== undefined || place.rating || place.distanceFromReference) && (
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          {place.isVerified !== undefined && (
            <span className={cn(
              'flex items-center gap-1',
              place.isVerified ? 'text-green-600' : 'text-gray-400'
            )}>
              {place.isVerified ? (
                <><CircleCheck className="h-3 w-3" /> 확인됨</>
              ) : (
                <><Info className="h-3 w-3" /> 미확인</>
              )}
            </span>
          )}
          {place.rating !== undefined && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {place.rating.toFixed(1)}
              {place.userRatingsTotal !== undefined && (
                <span className="text-gray-400">({place.userRatingsTotal})</span>
              )}
            </span>
          )}
          {place.distanceFromReference !== undefined && (
            <span className="text-gray-400">
              ~{place.distanceFromReference.toFixed(1)}km
            </span>
          )}
        </div>
      )}

      {/* Add Button */}
      <div className="mt-3 flex items-center justify-between">
        {addError && (
          <span className="text-xs text-red-500">{addError}</span>
        )}
        <div className="ml-auto">
          <Button
            variant={isAdded ? 'outline' : 'default'}
            size="sm"
            onClick={handleAdd}
            disabled={isAdding || isAdded}
            className="h-7 text-xs"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                추가 중...
              </>
            ) : isAdded ? (
              <>
                <Check className="h-3 w-3" />
                추가됨
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                추가
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
