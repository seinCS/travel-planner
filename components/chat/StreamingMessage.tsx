'use client'

import { useMemo } from 'react'
import { PlaceCard } from './PlaceCard'
import { ItineraryPreviewCard } from './ItineraryPreviewCard'
import type { RecommendedPlace, ItineraryPreviewData } from '@/domain/interfaces/ILLMService'
import { cleanChatResponse } from '@/lib/utils'

interface StreamingMessageProps {
  content: string
  places: RecommendedPlace[]
  projectId: string
  itineraryPreview?: ItineraryPreviewData | null
  onApplyItinerary?: () => void
  onRegenerateItinerary?: () => void
  isApplyingItinerary?: boolean
}

export function StreamingMessage({
  content,
  places,
  projectId,
  itineraryPreview,
  onApplyItinerary,
  onRegenerateItinerary,
  isApplyingItinerary = false,
}: StreamingMessageProps) {
  // Clean the streaming content to remove any JSON artifacts
  const cleanedContent = useMemo(() => cleanChatResponse(content), [content])

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg px-4 py-2 bg-gray-100">
        {cleanedContent ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {cleanedContent}
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span>응답 생성 중...</span>
          </div>
        )}

        {/* Streaming Place Cards */}
        {places.length > 0 && (
          <div className="mt-3 space-y-2">
            {places.map((place) => (
              <PlaceCard
                key={`streaming-${place.name}-${place.category}`}
                place={place}
                projectId={projectId}
              />
            ))}
          </div>
        )}

        {/* Itinerary Preview Card */}
        {itineraryPreview && onApplyItinerary && onRegenerateItinerary && (
          <div className="mt-3">
            <ItineraryPreviewCard
              preview={itineraryPreview}
              onApply={onApplyItinerary}
              onRegenerate={onRegenerateItinerary}
              isApplying={isApplyingItinerary}
            />
          </div>
        )}
      </div>
    </div>
  )
}
