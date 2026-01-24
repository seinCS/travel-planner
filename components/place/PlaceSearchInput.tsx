'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PlaceSearchPrediction } from '@/infrastructure/api-client/places.api'

interface PlaceSearchInputProps {
  /** Search query value */
  value: string
  /** Called when query changes */
  onChange: (value: string) => void
  /** Autocomplete predictions */
  predictions: PlaceSearchPrediction[]
  /** Called when a prediction is selected */
  onSelect: (prediction: PlaceSearchPrediction) => void
  /** Loading state */
  isLoading?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Auto focus on mount */
  autoFocus?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Custom className for the container */
  className?: string
}

export function PlaceSearchInput({
  value,
  onChange,
  predictions,
  onSelect,
  isLoading = false,
  placeholder = '장소 검색...',
  autoFocus = false,
  disabled = false,
  className,
}: PlaceSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  // Open dropdown when there are predictions
  useEffect(() => {
    if (predictions.length > 0 && value.length >= 2) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [predictions, value])

  // Reset highlighted index when predictions change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [predictions])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || predictions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < predictions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : predictions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
            onSelect(predictions[highlightedIndex])
            setIsOpen(false)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    },
    [isOpen, predictions, highlightedIndex, onSelect]
  )

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Map place types to icons
  const getTypeIcon = (types: string[]): string => {
    if (types.includes('restaurant') || types.includes('food')) return '🍽️'
    if (types.includes('cafe')) return '☕'
    if (types.includes('lodging')) return '🏨'
    if (types.includes('tourist_attraction') || types.includes('point_of_interest'))
      return '📸'
    if (types.includes('store') || types.includes('shopping_mall')) return '🛍️'
    if (types.includes('airport') || types.includes('train_station')) return '✈️'
    return '📍'
  }

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true)
          }}
          onBlur={() => {
            // Delay to allow click on prediction
            setTimeout(() => setIsOpen(false), 200)
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className="pr-10"
          aria-label="장소 검색"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="place-search-listbox"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        )}

        {/* Search Icon (when not loading) */}
        {!isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <ul
          ref={listRef}
          id="place-search-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border bg-white shadow-lg"
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.placeId}
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                'cursor-pointer px-3 py-3 transition-colors',
                'border-b border-gray-100 last:border-b-0',
                'hover:bg-gray-50',
                index === highlightedIndex && 'bg-blue-50'
              )}
              onClick={() => {
                onSelect(prediction)
                setIsOpen(false)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-3">
                {/* Type Icon */}
                <span className="mt-0.5 text-lg flex-shrink-0">
                  {getTypeIcon(prediction.types)}
                </span>

                {/* Text Content */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {prediction.mainText}
                  </p>
                  {prediction.secondaryText && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {prediction.secondaryText}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Empty State */}
      {isOpen && value.length >= 2 && predictions.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white p-4 text-center text-sm text-muted-foreground shadow-lg">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  )
}
