'use client'

import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ItineraryDayTabs } from './ItineraryDayTabs'
import { ItineraryTimeline } from './ItineraryTimeline'
import { ItineraryCreateForm } from './ItineraryCreateForm'
import { FlightSection } from './FlightSection'
import { AccommodationSection } from './AccommodationSection'
import { TravelSummaryBar } from './TravelSummaryBar'
import { useItinerary } from '@/hooks/queries/useItinerary'
import { useItineraryMutations } from '@/hooks/mutations/useItineraryMutations'
import type { Place } from '@/types'
import type { ItineraryDay as ItineraryDayType } from '@/infrastructure/api-client/itinerary.api'

interface ItineraryViewProps {
  projectId: string
  places: Place[]
  onDaySelect?: (dayNumber: number | null, placeIds: string[]) => void
  onPlaceClick?: (placeId: string) => void
}

export function ItineraryView({
  projectId,
  places,
  onDaySelect,
  onPlaceClick,
}: ItineraryViewProps) {
  const { itinerary, isLoading, error, mutate } = useItinerary(projectId)
  const {
    createItinerary,
    deleteItinerary,
    addItem,
    deleteItem,
    reorderItems,
    moveItemToDay,
    addFlight,
    updateFlight,
    deleteFlight,
    addAccommodation,
    updateAccommodation,
    deleteAccommodation,
    isLoading: mutationLoading,
  } = useItineraryMutations(projectId)

  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(1)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Get the selected day
  const selectedDay = useMemo(() => {
    if (!itinerary?.days || selectedDayNumber === null) return null
    return itinerary.days.find((d) => d.dayNumber === selectedDayNumber) || null
  }, [itinerary?.days, selectedDayNumber])

  // Get place IDs for the selected day (숙소 아이템 제외)
  const selectedDayPlaceIds = useMemo(() => {
    if (!selectedDay) return []
    return selectedDay.items
      .map((item) => item.placeId)
      .filter((id): id is string => id !== null)
  }, [selectedDay])

  // Handle day selection
  const handleDaySelect = useCallback(
    (dayNumber: number | null) => {
      setSelectedDayNumber(dayNumber)
      if (dayNumber === null) {
        onDaySelect?.(null, [])
      } else {
        const day = itinerary?.days.find((d) => d.dayNumber === dayNumber)
        const placeIds = day?.items
          .map((item) => item.placeId)
          .filter((id): id is string => id !== null) || []
        onDaySelect?.(dayNumber, placeIds)
      }
    },
    [itinerary?.days, onDaySelect]
  )

  // Handle itinerary creation
  const handleCreate = async (startDate: string, endDate: string, title?: string) => {
    try {
      await createItinerary({ startDate, endDate })
      setShowCreateForm(false)
      mutate()
    } catch (err) {
      // Check if error is due to existing itinerary
      if (err instanceof Error && err.message.includes('409')) {
        toast.error('이미 일정이 존재합니다. 페이지를 새로고침 해주세요.')
        mutate() // Refresh to load existing itinerary
      } else {
        toast.error('일정 생성에 실패했습니다.')
      }
    }
  }

  // Handle adding a place to the day
  const handleAddPlace = async (placeId: string) => {
    if (!itinerary || !selectedDay) return
    await addItem(itinerary.id, {
      dayId: selectedDay.id,
      placeId,
      order: selectedDay.items.length,
    })
  }

  // Handle removing an item
  const handleRemoveItem = async (itemId: string) => {
    await deleteItem(itemId)
  }

  // Handle reordering items within a day
  const handleReorderItems = useCallback(
    async (items: { id: string; order: number }[]) => {
      if (!itinerary || !selectedDay) return
      try {
        // Extract item IDs in new order
        const itemIds = items.sort((a, b) => a.order - b.order).map((item) => item.id)
        await reorderItems(itinerary.id, selectedDay.id, itemIds)
        toast.success('순서가 변경되었습니다.')
      } catch (error) {
        console.error('Failed to reorder items:', error)
        toast.error('순서 변경에 실패했습니다.')
      }
    },
    [itinerary, selectedDay, reorderItems]
  )

  // Handle moving an item to a different day
  const handleMoveToDay = useCallback(
    async (itemId: string, targetDayId: string) => {
      try {
        await moveItemToDay(itemId, { targetDayId })
        const targetDay = itinerary?.days.find((d) => d.id === targetDayId)
        toast.success(`Day ${targetDay?.dayNumber || ''}로 이동했습니다.`)
      } catch (error) {
        console.error('Failed to move item:', error)
        toast.error('이동에 실패했습니다.')
      }
    },
    [itinerary?.days, moveItemToDay]
  )

  // Handle delete itinerary
  const handleDelete = async () => {
    if (confirm('일정을 삭제하시겠습니까? 모든 항목이 삭제됩니다.')) {
      try {
        await deleteItinerary()
        toast.success('일정이 삭제되었습니다.')
      } catch (error) {
        console.error('Failed to delete itinerary:', error)
        toast.error('일정 삭제에 실패했습니다.')
      }
    }
  }

  // Flight handlers
  const handleAddFlight = useCallback(
    async (data: Parameters<typeof addFlight>[1]) => {
      if (!itinerary) return
      await addFlight(itinerary.id, data)
    },
    [itinerary, addFlight]
  )

  const handleUpdateFlight = useCallback(
    async (flightId: string, data: Parameters<typeof updateFlight>[1]) => {
      await updateFlight(flightId, data)
    },
    [updateFlight]
  )

  const handleDeleteFlight = useCallback(
    async (flightId: string) => {
      await deleteFlight(flightId)
    },
    [deleteFlight]
  )

  // Accommodation handlers
  const handleAddAccommodation = useCallback(
    async (data: Parameters<typeof addAccommodation>[1]) => {
      if (!itinerary) return
      await addAccommodation(itinerary.id, data)
    },
    [itinerary, addAccommodation]
  )

  const handleUpdateAccommodation = useCallback(
    async (accommodationId: string, data: Parameters<typeof updateAccommodation>[1]) => {
      await updateAccommodation(accommodationId, data)
    },
    [updateAccommodation]
  )

  const handleDeleteAccommodation = useCallback(
    async (accommodationId: string) => {
      await deleteAccommodation(accommodationId)
    },
    [deleteAccommodation]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">일정 로딩 중...</div>
      </div>
    )
  }

  // Error state - any error loading itinerary
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-muted-foreground mb-4">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">일정 데이터 로드 오류</p>
          <p className="text-sm mb-4">{error.message || '일정 데이터를 불러올 수 없습니다.'}</p>
          {error.code && (
            <p className="text-xs text-muted-foreground mb-2">오류 코드: {error.code}</p>
          )}
        </div>
        <Button
          onClick={() => mutate()}
          variant="outline"
        >
          다시 시도
        </Button>
      </div>
    )
  }

  // No itinerary - show create form
  if (!itinerary) {
    if (showCreateForm) {
      return (
        <div className="p-4">
          <ItineraryCreateForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isLoading={mutationLoading}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-muted-foreground mb-4">
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
          <p className="text-sm">여행 일정을 만들어 장소들을 정리해보세요.</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          일정 만들기
        </Button>
      </div>
    )
  }

  // Format date range
  const dateRange = `${format(new Date(itinerary.startDate), 'M/d', { locale: ko })} - ${format(new Date(itinerary.endDate), 'M/d', { locale: ko })}`

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-semibold">
              {itinerary.title || '여행 일정'}
            </h2>
            <p className="text-sm text-muted-foreground">{dateRange}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700"
            onClick={handleDelete}
          >
            삭제
          </Button>
        </div>

        {/* Day tabs */}
        <ItineraryDayTabs
          days={itinerary.days as ItineraryDayType[]}
          selectedDayNumber={selectedDayNumber}
          onDaySelect={handleDaySelect}
        />
      </div>

      {/* Flight & Accommodation sections - Responsive */}
      {/* Mobile: Summary bar only */}
      <div className="flex-shrink-0 border-b p-3 md:hidden">
        <TravelSummaryBar
          flights={itinerary.flights || []}
          accommodations={itinerary.accommodations || []}
        />
      </div>

      {/* Desktop: Collapsible sections */}
      <div className="flex-shrink-0 border-b p-4 space-y-4 hidden md:block">
        <FlightSection
          flights={itinerary.flights || []}
          itineraryId={itinerary.id}
          onAddFlight={handleAddFlight}
          onUpdateFlight={handleUpdateFlight}
          onDeleteFlight={handleDeleteFlight}
          isLoading={mutationLoading}
          defaultExpanded={false}
        />
        <AccommodationSection
          accommodations={itinerary.accommodations || []}
          itineraryId={itinerary.id}
          places={places}
          onAddAccommodation={handleAddAccommodation}
          onUpdateAccommodation={handleUpdateAccommodation}
          onDeleteAccommodation={handleDeleteAccommodation}
          isLoading={mutationLoading}
          defaultExpanded={false}
        />
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {selectedDay ? (
          <ItineraryTimeline
            day={selectedDay as ItineraryDayType}
            allDays={itinerary.days as ItineraryDayType[]}
            places={places}
            itemPlaceIds={selectedDayPlaceIds}
            onAddPlace={handleAddPlace}
            onRemoveItem={handleRemoveItem}
            onReorderItems={handleReorderItems}
            onMoveToDay={handleMoveToDay}
            onPlaceClick={onPlaceClick}
            isLoading={mutationLoading}
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
