'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loading } from '@/components/icons'
import type { ItineraryDay } from '@/infrastructure/api-client/itinerary.api'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  days?: ItineraryDay[]
}

type ExportScope = 'all' | 'day'
type ExportFormat = 'kml'

export function ExportModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  days,
}: ExportModalProps) {
  const [scope, setScope] = useState<ExportScope>('all')
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [format] = useState<ExportFormat>('kml')
  const [isExporting, setIsExporting] = useState(false)

  const hasDays = days && days.length > 0

  const handleExport = async () => {
    try {
      setIsExporting(true)

      // API URL 구성
      const params = new URLSearchParams({ format })
      if (scope === 'day' && selectedDayId) {
        params.set('dayId', selectedDayId)
      }

      const response = await fetch(`/api/projects/${projectId}/export?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '내보내기 실패')
      }

      // Blob으로 변환하여 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Content-Disposition에서 파일명 추출 시도
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `${projectName}.kml`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) {
          fileName = match[1]
        }
      }

      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      onOpenChange(false)
    } catch (error) {
      console.error('Export error:', error)
      alert(error instanceof Error ? error.message : '내보내기 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>KML 내보내기</DialogTitle>
          <DialogDescription>
            장소 데이터를 Google Earth, Google Maps에서 사용 가능한 KML 파일로 내보냅니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 범위 선택 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">내보내기 범위</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => {
                    setScope('all')
                    setSelectedDayId(null)
                  }}
                  className="h-4 w-4 text-primary"
                />
                <div>
                  <div className="font-medium">전체 장소</div>
                  <div className="text-sm text-muted-foreground">
                    모든 장소를 내보냅니다
                    {hasDays && ' (일정별로 그룹화됨)'}
                  </div>
                </div>
              </label>

              {hasDays && (
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="day"
                    checked={scope === 'day'}
                    onChange={() => {
                      setScope('day')
                      if (!selectedDayId && days.length > 0) {
                        setSelectedDayId(days[0].id)
                      }
                    }}
                    className="h-4 w-4 text-primary mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">특정 날짜만</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      선택한 날짜의 장소만 내보냅니다
                    </div>
                    {scope === 'day' && (
                      <select
                        value={selectedDayId || ''}
                        onChange={(e) => setSelectedDayId(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {days.map((day) => (
                          <option key={day.id} value={day.id}>
                            Day {day.dayNumber} ({formatDate(day.date)}) - {day.items.length}개 장소
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* 형식 표시 (현재는 KML만 지원) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">파일 형식</label>
            <div className="p-3 rounded-lg bg-gray-50 border">
              <div className="flex items-center gap-2">
                <span className="font-medium">KML</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">기본</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Google Earth, Google Maps My Maps에서 가져오기 가능
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            취소
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (scope === 'day' && !selectedDayId)}
          >
            {isExporting ? (
              <>
                <Loading className="w-4 h-4 animate-spin" />
                내보내는 중...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                KML 다운로드
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
