'use client'

import { Calendar, Clock, Loader2 } from '@/components/icons'
import { Button } from '@/components/ui/button'
import type { ItineraryPreviewData } from '@/domain/interfaces/ILLMService'
import { CATEGORY_STYLES, type PlaceCategory } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ItineraryPreviewCardProps {
  preview: ItineraryPreviewData
  onApply: () => void
  onRegenerate: () => void
  isApplying: boolean
}

export function ItineraryPreviewCard({
  preview,
  onApply,
  onRegenerate,
  isApplying,
}: ItineraryPreviewCardProps) {
  const totalDays = preview.days.length
  const nights = Math.max(totalDays - 1, 0)

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blue-50 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <h4 className="font-semibold text-blue-900">{preview.title}</h4>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          {nights > 0 ? `${nights}박 ${totalDays}일` : `${totalDays}일`} 일정
        </p>
      </div>

      {/* Days */}
      <div className="px-4 py-3 space-y-4 max-h-[400px] overflow-y-auto">
        {preview.days.map((day) => (
          <div key={day.dayNumber}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center">
                {day.dayNumber}
              </span>
              <span className="text-sm font-medium text-gray-700">
                Day {day.dayNumber}
              </span>
              {day.date && (
                <span className="text-xs text-gray-400">{day.date}</span>
              )}
            </div>

            {/* Timeline items */}
            <div className="ml-3 border-l-2 border-gray-200 pl-4 space-y-2">
              {day.items.map((item, idx) => {
                const style = CATEGORY_STYLES[item.category as PlaceCategory] || CATEGORY_STYLES.other
                const CategoryIcon = style.Icon

                return (
                  <div key={`${day.dayNumber}-${idx}`} className="relative">
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: style.color }}
                    />

                    <div className="flex items-start gap-2">
                      {item.startTime && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400 min-w-[50px]">
                          <Clock className="h-3 w-3" />
                          {item.startTime}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <CategoryIcon className="h-3.5 w-3.5 shrink-0" style={{ color: style.color }} />
                          <span className={cn(
                            'text-sm font-medium truncate',
                            item.matched === false ? 'text-gray-400' : 'text-gray-800'
                          )}>
                            {item.placeName}
                          </span>
                          {item.matched === false && (
                            <span className="text-[10px] text-orange-500 shrink-0">(미등록)</span>
                          )}
                        </div>
                        {item.note && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                        )}
                      </div>
                      {item.duration && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center gap-2">
        <Button
          onClick={onApply}
          disabled={isApplying}
          size="sm"
          className="flex-1"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              적용 중...
            </>
          ) : (
            '일정 적용하기'
          )}
        </Button>
        <Button
          onClick={onRegenerate}
          disabled={isApplying}
          variant="outline"
          size="sm"
        >
          다시 생성
        </Button>
      </div>
    </div>
  )
}
