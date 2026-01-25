'use client'

import { useMemo, memo } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import type { ItineraryDay } from '@/infrastructure/api-client/itinerary.api'

interface ItineraryDayTabsProps {
  days: ItineraryDay[]
  selectedDayNumber: number | null
  onDaySelect: (dayNumber: number | null) => void
}

// rerender-memo 패턴: 탭 버튼 리렌더링 최적화
export const ItineraryDayTabs = memo(function ItineraryDayTabs({
  days,
  selectedDayNumber,
  onDaySelect,
}: ItineraryDayTabsProps) {
  // Memoize day buttons
  const dayButtons = useMemo(() => {
    return days.map((day) => {
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
          onClick={() => onDaySelect(day.dayNumber)}
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
    })
  }, [days, selectedDayNumber, onDaySelect])

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
      {dayButtons}
    </div>
  )
})
