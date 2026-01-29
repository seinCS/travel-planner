'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { SortableTimelineItem } from './SortableTimelineItem'
import { PlacePickerModal } from './PlacePickerModal'
import { DistanceIndicator } from './DistanceIndicator'
import { useDistances } from '@/hooks/queries/useDistances'
import type { Place } from '@/types'
import type { RouteItem } from '@/types/route'
import type { ItineraryDay, ItineraryItem } from '@/infrastructure/api-client/itinerary.api'

interface ItineraryTimelineProps {
  day: ItineraryDay
  allDays?: ItineraryDay[]
  places: Place[]
  itemPlaceIds: string[]
  onAddPlace: (placeId: string) => Promise<void>
  onRemoveItem: (itemId: string) => Promise<void>
  onReorderItems?: (items: { id: string; order: number }[]) => Promise<void>
  onMoveToDay?: (itemId: string, targetDayId: string) => Promise<void>
  onPlaceClick?: (placeId: string) => void
  isLoading?: boolean
}

export function ItineraryTimeline({
  day,
  allDays,
  places,
  itemPlaceIds,
  onAddPlace,
  onRemoveItem,
  onReorderItems,
  onMoveToDay,
  onPlaceClick,
  isLoading,
}: ItineraryTimelineProps) {
  const [showPlacePickerModal, setShowPlacePickerModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Local state for optimistic updates
  const [localItems, setLocalItems] = useState<ItineraryItem[]>(day.items)

  // Sync local state with props when day changes
  useEffect(() => {
    setLocalItems(day.items)
  }, [day.items])

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동해야 드래그 시작
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 모바일에서 200ms 홀드 후 드래그
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Count of available places (not yet added to this day)
  const availablePlacesCount = useMemo(() => {
    return places.filter((p) => !itemPlaceIds.includes(p.id)).length
  }, [places, itemPlaceIds])

  // Item IDs for SortableContext
  const itemIds = useMemo(() => localItems.map((item) => item.id), [localItems])

  // Distance calculation items - place items and accommodation items with coordinates
  const routeItems: RouteItem[] = useMemo(() => {
    const items: RouteItem[] = []
    let orderIndex = 0

    localItems.forEach((item) => {
      // 장소 아이템
      if (
        item.itemType === 'place' &&
        item.place?.latitude != null &&
        item.place?.longitude != null
      ) {
        items.push({
          id: item.id,
          placeId: item.placeId!,
          itemType: 'place',
          latitude: item.place.latitude,
          longitude: item.place.longitude,
          order: orderIndex++,
        })
      }
      // 숙소 아이템 (체크인/체크아웃/숙박)
      else if (
        item.accommodationId &&
        item.accommodation?.latitude != null &&
        item.accommodation?.longitude != null
      ) {
        items.push({
          id: item.id,
          accommodationId: item.accommodationId,
          itemType: 'accommodation',
          latitude: item.accommodation.latitude,
          longitude: item.accommodation.longitude,
          order: orderIndex++,
        })
      }
    })

    return items
  }, [localItems])

  // Fetch distances between items
  const { segments, totalDistance, totalDuration } = useDistances(day.id, routeItems)

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true)
  }, [])

  // Handle drag end with optimistic update
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setIsDragging(false)
      const { active, over } = event

      if (!over || active.id === over.id || !onReorderItems) {
        return
      }

      const oldIndex = localItems.findIndex((item) => item.id === active.id)
      const newIndex = localItems.findIndex((item) => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      // Store original order for rollback
      const originalItems = [...localItems]

      // Optimistic update - immediately update local state
      const reorderedItems = arrayMove(localItems, oldIndex, newIndex)
      setLocalItems(reorderedItems)

      // Generate new order values
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        order: index,
      }))

      try {
        await onReorderItems(updates)
      } catch (err) {
        // Rollback on error - restore original order
        console.error('Failed to reorder items:', err)
        setLocalItems(originalItems)
      }
    },
    [localItems, onReorderItems]
  )

  // Handle add place from modal
  const handleAddPlace = useCallback(
    async (placeId: string) => {
      await onAddPlace(placeId)
    },
    [onAddPlace]
  )

  // Format day date
  const dayDate = format(new Date(day.date), 'M월 d일 (EEEE)', { locale: ko })

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-lg">
            Day {day.dayNumber} - {dayDate}
          </h3>
          {/* Total distance/time summary */}
          {totalDistance && totalDuration && segments.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded-full">
              <span>{totalDistance.text}</span>
              <span className="text-gray-400">|</span>
              <span>{totalDuration.text}</span>
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPlacePickerModal(true)}
          disabled={isLoading || availablePlacesCount === 0}
        >
          + 장소 추가
          {availablePlacesCount > 0 && (
            <span className="ml-1 text-xs opacity-70">({availablePlacesCount})</span>
          )}
        </Button>
      </div>

      {/* Place Picker Modal */}
      <PlacePickerModal
        open={showPlacePickerModal}
        onOpenChange={setShowPlacePickerModal}
        places={places}
        excludePlaceIds={itemPlaceIds}
        onSelectPlace={handleAddPlace}
        isLoading={isLoading}
      />

      {/* Timeline items with DnD */}
      {localItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>아직 추가된 장소가 없습니다.</p>
          <p className="text-sm mt-1">위의 &apos;장소 추가&apos; 버튼을 눌러 장소를 추가해보세요.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200" />

          {/* Timeline items with drag and drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-0">
                {localItems.map((item, index) => {
                  // 장소 아이템만 순번 계산 (숙소 아이템 제외)
                  const placeIndex = localItems
                    .slice(0, index)
                    .filter((i) => i.itemType === 'place').length

                  // Find distance segment for this item
                  const segment = segments.find((seg) => seg.fromItemId === item.id)
                  const nextItem = localItems[index + 1]

                  // Get coordinates for current and next item (장소 또는 숙소)
                  const currentCoords =
                    item.itemType === 'place' && item.place
                      ? { latitude: item.place.latitude, longitude: item.place.longitude }
                      : item.accommodation?.latitude != null && item.accommodation?.longitude != null
                        ? { latitude: item.accommodation.latitude, longitude: item.accommodation.longitude }
                        : null
                  const nextCoords =
                    nextItem?.itemType === 'place' && nextItem?.place
                      ? { latitude: nextItem.place.latitude, longitude: nextItem.place.longitude }
                      : nextItem?.accommodation?.latitude != null && nextItem?.accommodation?.longitude != null
                        ? { latitude: nextItem.accommodation.latitude, longitude: nextItem.accommodation.longitude }
                        : null

                  return (
                    <div key={item.id}>
                      <div className="py-2">
                        <SortableTimelineItem
                          item={item}
                          index={placeIndex}
                          currentDayId={day.id}
                          allDays={allDays}
                          onPlaceClick={onPlaceClick}
                          onRemoveItem={onRemoveItem}
                          onMoveToDay={onMoveToDay}
                          isLoading={isLoading || isDragging}
                        />
                      </div>
                      {/* Distance indicator between items */}
                      {segment && currentCoords && nextCoords && !isDragging && (
                        <DistanceIndicator
                          segment={segment}
                          fromPlace={currentCoords}
                          toPlace={nextCoords}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Drag hint - updated text */}
      {localItems.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          카드를 드래그하여 순서를 변경할 수 있습니다
        </p>
      )}
    </div>
  )
}
