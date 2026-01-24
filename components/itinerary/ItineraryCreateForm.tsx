'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ItineraryCreateFormProps {
  onSubmit: (startDate: string, endDate: string, title?: string) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ItineraryCreateForm({
  onSubmit,
  onCancel,
  isLoading,
}: ItineraryCreateFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultEnd = format(addDays(new Date(), 3), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!startDate || !endDate) {
      setError('시작일과 종료일을 입력해주세요.')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('종료일은 시작일 이후여야 합니다.')
      return
    }

    // Calculate days
    const dayCount = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    if (dayCount > 30) {
      setError('일정은 최대 30일까지 가능합니다.')
      return
    }

    try {
      await onSubmit(startDate, endDate, title || undefined)
    } catch {
      setError('일정 생성에 실패했습니다.')
    }
  }

  // Calculate day count for preview
  const dayCount = startDate && endDate
    ? Math.max(1, Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1)
    : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-lg">새 일정 만들기</h3>

      {/* Title (optional) */}
      <div className="space-y-2">
        <Label htmlFor="title">일정 제목 (선택)</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 도쿄 여행"
          disabled={isLoading}
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">시작일</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              // Auto-adjust end date if it's before start date
              if (e.target.value > endDate) {
                setEndDate(e.target.value)
              }
            }}
            disabled={isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">종료일</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Day count preview */}
      {dayCount > 0 && (
        <p className="text-sm text-muted-foreground">
          총 {dayCount}일간의 일정이 생성됩니다.
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? '생성 중...' : '일정 만들기'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          취소
        </Button>
      </div>
    </form>
  )
}
