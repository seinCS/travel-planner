'use client'

import { useState } from 'react'
import DOMPurify from 'dompurify'
import { MapPin, Plus, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAddPlaceFromChat } from '@/hooks/mutations/useAddPlaceFromChat'
import type { RecommendedPlace } from '@/domain/interfaces/ILLMService'
import { cn } from '@/lib/utils'
import { CATEGORY_STYLES, type PlaceCategory } from '@/lib/constants'

interface PlaceCardProps {
  place: RecommendedPlace
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
  const categoryIcon = categoryStyle.icon

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
            <span className="text-lg">{categoryIcon}</span>
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
