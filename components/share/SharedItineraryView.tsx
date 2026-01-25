'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CATEGORY_STYLES } from '@/lib/constants'

// Types for shared itinerary data
interface SharedPlace {
  id: string
  name: string
  category: string
  latitude: number
  longitude: number
}

interface SharedAccommodation {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
}

interface SharedItineraryItem {
  id: string
  dayId: string
  placeId: string | null
  accommodationId: string | null
  itemType: string
  order: number
  startTime: string | null
  note: string | null
  place: SharedPlace | null
  accommodation: SharedAccommodation | null
}

interface SharedItineraryDay {
  id: string
  dayNumber: number
  date: string
  items: SharedItineraryItem[]
}

interface SharedFlight {
  id: string
  departureCity: string
  arrivalCity: string
  airline: string | null
  flightNumber: string | null
  departureDate: string
  arrivalDate: string | null
  note: string | null
}

interface SharedAccommodationInfo {
  id: string
  name: string
  address: string | null
  checkIn: string
  checkOut: string
  note: string | null
}

export interface SharedItinerary {
  id: string
  title: string | null
  startDate: string
  endDate: string
  days: SharedItineraryDay[]
  flights: SharedFlight[]
  accommodations: SharedAccommodationInfo[]
}

interface SharedItineraryViewProps {
  itinerary: SharedItinerary | null
  onPlaceClick?: (placeId: string) => void
}

// Helper function moved outside component to prevent recreation on each render
function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function SharedItineraryView({
  itinerary,
  onPlaceClick,
}: SharedItineraryViewProps) {
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1)
  const [showFlights, setShowFlights] = useState(false)
  const [showAccommodations, setShowAccommodations] = useState(false)

  // Get the selected day
  const selectedDay = useMemo(() => {
    if (!itinerary?.days) return null
    return itinerary.days.find((d) => d.dayNumber === selectedDayNumber) || null
  }, [itinerary?.days, selectedDayNumber])

  // No itinerary state
  if (!itinerary) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-muted-foreground">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">일정이 없습니다</p>
          <p className="text-sm">이 프로젝트에는 아직 일정이 등록되지 않았습니다.</p>
        </div>
      </div>
    )
  }

  // Format date range
  const dateRange = `${format(new Date(itinerary.startDate), 'M월 d일', { locale: ko })} - ${format(new Date(itinerary.endDate), 'M월 d일', { locale: ko })}`
  const totalDays = itinerary.days.length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="mb-3">
          <h2 className="font-semibold text-lg">
            {itinerary.title || '여행 일정'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dateRange} ({totalDays}일)
          </p>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
          {itinerary.days.map((day) => {
            const isSelected = day.dayNumber === selectedDayNumber
            const dayLabel = `Day${day.dayNumber}`
            const dateLabel = format(new Date(day.date), 'M/d (E)', { locale: ko })
            const itemCount = day.items.length

            return (
              <Button
                key={day.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`flex-shrink-0 relative ${isSelected ? '' : 'bg-white'}`}
                onClick={() => setSelectedDayNumber(day.dayNumber)}
              >
                <div className="flex flex-col items-center">
                  <span className="font-medium">{dayLabel}</span>
                  <span className="text-xs opacity-70">{dateLabel}</span>
                </div>
                {itemCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                      isSelected
                        ? 'bg-white text-primary'
                        : 'bg-primary text-white'
                    }`}
                  >
                    {itemCount}
                  </span>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Flight & Accommodation sections (collapsible) */}
      {(itinerary.flights.length > 0 || itinerary.accommodations.length > 0) && (
        <div className="flex-shrink-0 border-b p-4 space-y-3">
          {/* Flights */}
          {itinerary.flights.length > 0 && (
            <Collapsible open={showFlights} onOpenChange={setShowFlights}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-gray-50 rounded px-2 py-1 -ml-2 transition-colors">
                <span className="text-xs text-muted-foreground">
                  {showFlights ? '▼' : '▶'}
                </span>
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <span>✈️</span> 항공편
                  <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                    {itinerary.flights.length}
                  </span>
                </h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {itinerary.flights.map((flight) => {
                  const departureDate = new Date(flight.departureDate)
                  const arrivalDate = flight.arrivalDate ? new Date(flight.arrivalDate) : null

                  return (
                    <div
                      key={flight.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {flight.departureCity} → {flight.arrivalCity}
                        </span>
                        {flight.airline && (
                          <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded">
                            {flight.airline} {flight.flightNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span>
                          {format(departureDate, 'M월 d일 HH:mm', { locale: ko })}
                        </span>
                        {arrivalDate && (
                          <span>
                            {' → '}
                            {format(arrivalDate, 'M월 d일 HH:mm', { locale: ko })}
                          </span>
                        )}
                      </div>
                      {flight.note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {flight.note}
                        </p>
                      )}
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Accommodations */}
          {itinerary.accommodations.length > 0 && (
            <Collapsible open={showAccommodations} onOpenChange={setShowAccommodations}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-gray-50 rounded px-2 py-1 -ml-2 transition-colors">
                <span className="text-xs text-muted-foreground">
                  {showAccommodations ? '▼' : '▶'}
                </span>
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <span>🏨</span> 숙소
                  <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                    {itinerary.accommodations.length}
                  </span>
                </h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {itinerary.accommodations.map((accommodation) => {
                  const checkIn = new Date(accommodation.checkIn)
                  const checkOut = new Date(accommodation.checkOut)
                  const nights = calculateNights(
                    accommodation.checkIn,
                    accommodation.checkOut
                  )

                  return (
                    <div
                      key={accommodation.id}
                      className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                    >
                      <div className="font-medium text-sm">{accommodation.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(checkIn, 'M월 d일', { locale: ko })} ~{' '}
                        {format(checkOut, 'M월 d일', { locale: ko })}
                        <span className="ml-2 bg-white px-2 py-0.5 rounded">
                          {nights}박
                        </span>
                      </div>
                      {accommodation.address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {accommodation.address}
                        </p>
                      )}
                      {accommodation.note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {accommodation.note}
                        </p>
                      )}
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {selectedDay ? (
          <SharedTimeline
            day={selectedDay}
            onPlaceClick={onPlaceClick}
          />
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Day를 선택해주세요.
          </div>
        )}
      </div>
    </div>
  )
}

// SharedTimeline component (read-only)
interface SharedTimelineProps {
  day: SharedItineraryDay
  onPlaceClick?: (placeId: string) => void
}

function SharedTimeline({ day, onPlaceClick }: SharedTimelineProps) {
  const dayDate = format(new Date(day.date), 'M월 d일 (EEEE)', { locale: ko })

  // Get item type label
  const getItemTypeLabel = (itemType: string): string | null => {
    switch (itemType) {
      case 'accommodation_checkin':
        return '체크인'
      case 'accommodation_checkout':
        return '체크아웃'
      case 'accommodation_stay':
        return '숙박'
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Day header */}
      <h3 className="font-medium text-lg">
        Day {day.dayNumber} - {dayDate}
      </h3>

      {/* Timeline items */}
      {day.items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>이 날에 등록된 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200" />

          {/* Timeline items */}
          <div className="space-y-4">
            {day.items.map((item, index) => {
              const isAccommodationItem = item.itemType !== 'place'
              const itemTypeLabel = getItemTypeLabel(item.itemType)

              // For place items
              if (item.place) {
                const style =
                  CATEGORY_STYLES[item.place.category as keyof typeof CATEGORY_STYLES] ||
                  CATEGORY_STYLES.other

                // Calculate display index (only for place items)
                const placeIndex = day.items
                  .slice(0, index)
                  .filter((i) => i.itemType === 'place').length + 1

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 items-start pl-1 cursor-pointer"
                    onClick={() => item.placeId && onPlaceClick?.(item.placeId)}
                  >
                    {/* Index bubble */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 z-10"
                      style={{ backgroundColor: style.color }}
                    >
                      {placeIndex}
                    </div>

                    {/* Content card */}
                    <div className="flex-1 bg-white border rounded-lg p-3 hover:border-gray-400 transition-colors">
                      <div className="flex items-start gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                          style={{
                            backgroundColor: style.color + '20',
                            color: style.color,
                          }}
                        >
                          {style.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {item.place.name}
                            </h4>
                            {item.startTime && (
                              <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                {item.startTime}
                              </span>
                            )}
                          </div>
                          {item.note && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // For accommodation items
              if (item.accommodation && isAccommodationItem) {
                return (
                  <div key={item.id} className="flex gap-3 items-start pl-1">
                    {/* Icon bubble */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-600 flex-shrink-0 z-10">
                      🏨
                    </div>

                    {/* Content card */}
                    <div className="flex-1 bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded">
                          {itemTypeLabel}
                        </span>
                        <h4 className="font-medium text-sm truncate">
                          {item.accommodation.name}
                        </h4>
                        {item.startTime && (
                          <span className="text-xs text-muted-foreground bg-white px-1.5 py-0.5 rounded flex-shrink-0">
                            {item.startTime}
                          </span>
                        )}
                      </div>
                      {item.accommodation.address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {item.accommodation.address}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              }

              return null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
