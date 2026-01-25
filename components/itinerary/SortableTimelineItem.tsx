'use client'

import { useRef, memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { CATEGORY_STYLES } from '@/lib/constants'
import type { ItineraryItem, ItineraryDay, ItineraryItemType } from '@/infrastructure/api-client/itinerary.api'

// 숙소 아이템 타입별 스타일 및 라벨
const ACCOMMODATION_STYLES: Record<string, { icon: string; label: string; color: string }> = {
  accommodation_checkin: { icon: '🏨', label: '체크인', color: '#10b981' },
  accommodation_checkout: { icon: '🧳', label: '체크아웃', color: '#f59e0b' },
  accommodation_stay: { icon: '🛏️', label: '숙박', color: '#6366f1' },
}

// 숙소 아이템인지 확인
function isAccommodationItem(itemType: ItineraryItemType): boolean {
  return itemType.startsWith('accommodation_')
}

interface SortableTimelineItemProps {
  item: ItineraryItem
  index: number
  currentDayId: string
  allDays?: ItineraryDay[]
  onPlaceClick?: (placeId: string) => void
  onRemoveItem: (itemId: string) => Promise<void>
  onMoveToDay?: (itemId: string, targetDayId: string) => Promise<void>
  isLoading?: boolean
}

// rerender-memo 패턴: 드래그 리스트 아이템 최적화
export const SortableTimelineItem = memo(function SortableTimelineItem({
  item,
  index,
  currentDayId,
  allDays,
  onPlaceClick,
  onRemoveItem,
  onMoveToDay,
  isLoading,
}: SortableTimelineItemProps) {
  const didDragRef = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 숙소 아이템인지 확인
  const isAccommodation = isAccommodationItem(item.itemType)
  const place = item.place
  const accommodation = item.accommodation

  // 카테고리 스타일 결정
  const categoryStyle = isAccommodation
    ? ACCOMMODATION_STYLES[item.itemType] || ACCOMMODATION_STYLES.accommodation_stay
    : place
      ? CATEGORY_STYLES[place.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other
      : CATEGORY_STYLES.other

  // 표시할 이름 결정
  const displayName = isAccommodation
    ? accommodation?.name || '숙소'
    : place?.name || '알 수 없는 장소'

  // 숙소 아이템의 경우 라벨 추가
  const itemLabel = isAccommodation ? ACCOMMODATION_STYLES[item.itemType]?.label : null

  // Filter out current day for move options
  const otherDays = allDays?.filter((day) => day.id !== currentDayId) || []

  // Handle click - only trigger if not dragging (숙소 아이템은 클릭 비활성화)
  const handleCardClick = () => {
    if (isAccommodation) return // 숙소 아이템은 클릭 무시

    // Small delay to check if drag happened
    setTimeout(() => {
      if (!didDragRef.current && place) {
        onPlaceClick?.(place.id)
      }
      didDragRef.current = false
    }, 0)
  }

  // Track drag start
  const handlePointerDown = () => {
    didDragRef.current = false
  }

  // Track if drag actually happened
  const handleDragStart = () => {
    didDragRef.current = true
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-start gap-4 pl-2 transition-all duration-200 ${
        isDragging ? 'z-50 scale-[1.02]' : ''
      }`}
      onPointerDown={handlePointerDown}
      {...attributes}
      {...listeners}
    >
      {/* Order number badge */}
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 ${
          isDragging ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
        style={{ backgroundColor: categoryStyle.color }}
      >
        {isAccommodation ? categoryStyle.icon : index + 1}
      </div>

      {/* Place/Accommodation card - entire area is draggable */}
      <div
        className={`flex-1 border rounded-lg p-3 transition-all duration-200 ${
          isAccommodation
            ? 'bg-gradient-to-r from-indigo-50 to-white border-indigo-200'
            : 'bg-white'
        } ${
          isDragging
            ? 'shadow-xl border-primary bg-primary/5 cursor-grabbing'
            : isAccommodation
              ? 'cursor-default hover:border-indigo-300'
              : 'cursor-grab hover:border-primary hover:shadow-md'
        }`}
        onClick={handleCardClick}
        onDragStart={handleDragStart}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                style={{ backgroundColor: categoryStyle.color + '20', color: categoryStyle.color }}
              >
                {categoryStyle.icon}
              </span>
              <h4 className="font-medium text-sm truncate">{displayName}</h4>
              {/* 숙소 라벨 표시 */}
              {itemLabel && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: categoryStyle.color + '20', color: categoryStyle.color }}
                >
                  {itemLabel}
                </span>
              )}
            </div>

            {/* Time if set */}
            {item.startTime && (
              <p className="text-xs text-muted-foreground mt-1 ml-7">
                {item.startTime}
              </p>
            )}

            {/* Address for accommodation */}
            {isAccommodation && accommodation?.address && (
              <p className="text-xs text-muted-foreground mt-1 ml-7 truncate">
                📍 {accommodation.address}
              </p>
            )}

            {/* Note if set */}
            {item.note && (
              <p className="text-xs text-muted-foreground mt-1 ml-7 line-clamp-2">
                {item.note}
              </p>
            )}
          </div>

          {/* Actions dropdown - 숙소 아이템은 수정/삭제 불가 (숙소 설정에서 관리) */}
          {!isAccommodation && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={isLoading}
                >
                  ⋮
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {/* Move to other day */}
                {otherDays.length > 0 && onMoveToDay && (
                  <>
                    <DropdownMenuLabel className="text-xs">다른 Day로 이동</DropdownMenuLabel>
                    {otherDays.map((day) => (
                      <DropdownMenuItem
                        key={day.id}
                        onClick={() => onMoveToDay(item.id, day.id)}
                        disabled={isLoading}
                      >
                        Day {day.dayNumber}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                {/* Remove */}
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-700"
                  onClick={() => {
                    if (confirm('이 장소를 일정에서 제거하시겠습니까?')) {
                      onRemoveItem(item.id)
                    }
                  }}
                  disabled={isLoading}
                >
                  제거
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
})
