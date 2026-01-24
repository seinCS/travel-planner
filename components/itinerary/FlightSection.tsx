'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { Flight } from '@/infrastructure/api-client/itinerary.api'

interface FlightSectionProps {
  flights: Flight[]
  itineraryId: string
  onAddFlight: (data: {
    departureCity: string
    arrivalCity: string
    airline?: string
    flightNumber?: string
    departureDate: string
    arrivalDate?: string
    note?: string
  }) => Promise<void>
  onUpdateFlight: (
    flightId: string,
    data: {
      departureCity?: string
      arrivalCity?: string
      airline?: string | null
      flightNumber?: string | null
      departureDate?: string
      arrivalDate?: string | null
      note?: string | null
    }
  ) => Promise<void>
  onDeleteFlight: (flightId: string) => Promise<void>
  isLoading?: boolean
  defaultExpanded?: boolean
}

interface FlightFormData {
  departureCity: string
  arrivalCity: string
  airline: string
  flightNumber: string
  departureDate: string
  departureTime: string
  arrivalDate: string
  arrivalTime: string
  note: string
}

const emptyFormData: FlightFormData = {
  departureCity: '',
  arrivalCity: '',
  airline: '',
  flightNumber: '',
  departureDate: '',
  departureTime: '',
  arrivalDate: '',
  arrivalTime: '',
  note: '',
}

export function FlightSection({
  flights,
  onAddFlight,
  onUpdateFlight,
  onDeleteFlight,
  isLoading,
  defaultExpanded = false,
}: FlightSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showModal, setShowModal] = useState(false)
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null)
  const [formData, setFormData] = useState<FlightFormData>(emptyFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenCreate = useCallback(() => {
    setEditingFlight(null)
    setFormData(emptyFormData)
    setShowModal(true)
  }, [])

  const handleOpenEdit = useCallback((flight: Flight) => {
    const departureDate = new Date(flight.departureDate)
    const arrivalDate = flight.arrivalDate ? new Date(flight.arrivalDate) : null

    setEditingFlight(flight)
    setFormData({
      departureCity: flight.departureCity,
      arrivalCity: flight.arrivalCity,
      airline: flight.airline || '',
      flightNumber: flight.flightNumber || '',
      departureDate: format(departureDate, 'yyyy-MM-dd'),
      departureTime: format(departureDate, 'HH:mm'),
      arrivalDate: arrivalDate ? format(arrivalDate, 'yyyy-MM-dd') : '',
      arrivalTime: arrivalDate ? format(arrivalDate, 'HH:mm') : '',
      note: flight.note || '',
    })
    setShowModal(true)
  }, [])

  const handleClose = useCallback(() => {
    setShowModal(false)
    setEditingFlight(null)
    setFormData(emptyFormData)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!formData.departureCity || !formData.arrivalCity || !formData.departureDate || !formData.departureTime) {
      toast.error('출발지, 도착지, 출발 날짜와 시간을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const departureDateTime = `${formData.departureDate}T${formData.departureTime}:00`
      const arrivalDateTime = formData.arrivalDate && formData.arrivalTime
        ? `${formData.arrivalDate}T${formData.arrivalTime}:00`
        : undefined

      if (editingFlight) {
        await onUpdateFlight(editingFlight.id, {
          departureCity: formData.departureCity,
          arrivalCity: formData.arrivalCity,
          airline: formData.airline || null,
          flightNumber: formData.flightNumber || null,
          departureDate: departureDateTime,
          arrivalDate: arrivalDateTime || null,
          note: formData.note || null,
        })
        toast.success('항공편이 수정되었습니다.')
      } else {
        await onAddFlight({
          departureCity: formData.departureCity,
          arrivalCity: formData.arrivalCity,
          airline: formData.airline || undefined,
          flightNumber: formData.flightNumber || undefined,
          departureDate: departureDateTime,
          arrivalDate: arrivalDateTime,
          note: formData.note || undefined,
        })
        toast.success('항공편이 추가되었습니다.')
      }
      handleClose()
    } catch {
      toast.error(editingFlight ? '항공편 수정에 실패했습니다.' : '항공편 추가에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, editingFlight, onAddFlight, onUpdateFlight, handleClose])

  const handleDelete = useCallback(async (flightId: string) => {
    if (!confirm('이 항공편을 삭제하시겠습니까?')) return

    try {
      await onDeleteFlight(flightId)
      toast.success('항공편이 삭제되었습니다.')
    } catch {
      toast.error('항공편 삭제에 실패했습니다.')
    }
  }, [onDeleteFlight])

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      {/* Collapsible Header */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 hover:bg-gray-50 rounded px-2 py-1 -ml-2 transition-colors">
          <span className="text-xs text-muted-foreground">
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 className="font-medium text-sm flex items-center gap-2">
            <span>✈️</span> 항공편
            {flights.length > 0 && (
              <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                {flights.length}
              </span>
            )}
          </h3>
        </CollapsibleTrigger>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenCreate()
          }}
          disabled={isLoading}
        >
          + 추가
        </Button>
      </div>

      {/* Collapsible Content */}
      <CollapsibleContent className="mt-3">
        {/* Flight list */}
        {flights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            등록된 항공편이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {flights.map((flight) => {
              const departureDate = new Date(flight.departureDate)
              const arrivalDate = flight.arrivalDate ? new Date(flight.arrivalDate) : null

              return (
                <div
                  key={flight.id}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
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
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {flight.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleOpenEdit(flight)}
                        disabled={isLoading}
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(flight.id)}
                        disabled={isLoading}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleContent>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFlight ? '항공편 수정' : '항공편 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Route */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="departureCity">출발지 *</Label>
                <Input
                  id="departureCity"
                  placeholder="서울/인천"
                  value={formData.departureCity}
                  onChange={(e) =>
                    setFormData({ ...formData, departureCity: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="arrivalCity">도착지 *</Label>
                <Input
                  id="arrivalCity"
                  placeholder="도쿄/나리타"
                  value={formData.arrivalCity}
                  onChange={(e) =>
                    setFormData({ ...formData, arrivalCity: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Airline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="airline">항공사</Label>
                <Input
                  id="airline"
                  placeholder="대한항공"
                  value={formData.airline}
                  onChange={(e) =>
                    setFormData({ ...formData, airline: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="flightNumber">편명</Label>
                <Input
                  id="flightNumber"
                  placeholder="KE123"
                  value={formData.flightNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, flightNumber: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Departure */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="departureDate">출발 날짜 *</Label>
                <Input
                  id="departureDate"
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) =>
                    setFormData({ ...formData, departureDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="departureTime">출발 시간 *</Label>
                <Input
                  id="departureTime"
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) =>
                    setFormData({ ...formData, departureTime: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Arrival */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="arrivalDate">도착 날짜</Label>
                <Input
                  id="arrivalDate"
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) =>
                    setFormData({ ...formData, arrivalDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="arrivalTime">도착 시간</Label>
                <Input
                  id="arrivalTime"
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) =>
                    setFormData({ ...formData, arrivalTime: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <Label htmlFor="note">메모</Label>
              <Input
                id="note"
                placeholder="예약번호, 터미널 정보 등"
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : editingFlight ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}
