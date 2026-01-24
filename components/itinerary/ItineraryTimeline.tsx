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
import { CATEGORY_STYLES } from '@/lib/constants'
import { SortableTimelineItem } from './SortableTimelineItem'
import type { Place } from '@/types'
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
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)
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

  // Available places (not yet added to this day)
  const availablePlaces = useMemo(() => {
    return places.filter((p) => !itemPlaceIds.includes(p.id))
  }, [places, itemPlaceIds])

  // Item IDs for SortableContext
  const itemIds = useMemo(() => localItems.map((item) => item.id), [localItems])

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
      } catch {
        // Rollback on error - restore original order
        setLocalItems(originalItems)
      }
    },
    [localItems, onReorderItems]
  )

  // Handle add place with loading state
  const handleAddPlace = useCallback(
    async (placeId: string) => {
      if (addingPlaceId) return // Prevent duplicate clicks

      setAddingPlaceId(placeId)
      try {
        await onAddPlace(placeId)
        setShowAddPlace(false)
      } finally {
        setAddingPlaceId(null)
      }
    },
    [addingPlaceId, onAddPlace]
  )

  // Format day date
  const dayDate = format(new Date(day.date), 'M월 d일 (EEEE)', { locale: ko })

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">
          Day {day.dayNumber} - {dayDate}
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddPlace(!showAddPlace)}
          disabled={isLoading || availablePlaces.length === 0 || addingPlaceId !== null}
        >
          {showAddPlace ? '취소' : '+ 장소 추가'}
        </Button>
      </div>

      {/* Add place dropdown */}
      {showAddPlace && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
          <p className="text-sm text-muted-foreground mb-2">추가할 장소를 선택하세요:</p>
          {availablePlaces.map((place) => {
            const style = CATEGORY_STYLES[place.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other
            const isAdding = addingPlaceId === place.id

            return (
              <div
                key={place.id}
                className={`flex items-center justify-between p-2 bg-white rounded border transition-colors ${
                  isAdding
                    ? 'opacity-50 cursor-wait border-primary'
                    : addingPlaceId
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:border-primary'
                }`}
                onClick={() => !addingPlaceId && handleAddPlace(place.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: style.color + '20', color: style.color }}
                  >
                    {isAdding ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      style.icon
                    )}
                  </span>
                  <span className="font-medium text-sm">{place.name}</span>
                </div>
                {isAdding && (
                  <span className="text-xs text-muted-foreground">추가 중...</span>
                )}
              </div>
            )
          })}
          {availablePlaces.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              추가할 장소가 없습니다.
            </p>
          )}
        </div>
      )}

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
              <div className="space-y-4">
                {localItems.map((item, index) => {
                  // 장소 아이템만 순번 계산 (숙소 아이템 제외)
                  const placeIndex = localItems
                    .slice(0, index)
                    .filter((i) => i.itemType === 'place').length
                  return (
                    <SortableTimelineItem
                      key={item.id}
                      item={item}
                      index={placeIndex}
                      currentDayId={day.id}
                      allDays={allDays}
                      onPlaceClick={onPlaceClick}
                      onRemoveItem={onRemoveItem}
                      onMoveToDay={onMoveToDay}
                      isLoading={isLoading || isDragging}
                    />
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
