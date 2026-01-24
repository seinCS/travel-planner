'use client'

import { useState, useCallback, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Accommodation } from '@/infrastructure/api-client/itinerary.api'
import type { Place } from '@/types'

interface AccommodationSectionProps {
  accommodations: Accommodation[]
  itineraryId: string
  places: Place[]
  onAddAccommodation: (data: {
    name: string
    address?: string
    checkIn: string
    checkOut: string
    latitude?: number
    longitude?: number
    note?: string
  }) => Promise<void>
  onUpdateAccommodation: (
    accommodationId: string,
    data: {
      name?: string
      address?: string | null
      checkIn?: string
      checkOut?: string
      latitude?: number | null
      longitude?: number | null
      note?: string | null
    }
  ) => Promise<void>
  onDeleteAccommodation: (accommodationId: string) => Promise<void>
  isLoading?: boolean
  defaultExpanded?: boolean
}

interface AccommodationFormData {
  placeId: string
  name: string
  address: string
  checkIn: string
  checkOut: string
  note: string
  latitude: number | null
  longitude: number | null
}

const emptyFormData: AccommodationFormData = {
  placeId: '',
  name: '',
  address: '',
  checkIn: '',
  checkOut: '',
  note: '',
  latitude: null,
  longitude: null,
}

export function AccommodationSection({
  accommodations,
  places,
  onAddAccommodation,
  onUpdateAccommodation,
  onDeleteAccommodation,
  isLoading,
  defaultExpanded = false,
}: AccommodationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showModal, setShowModal] = useState(false)
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null)
  const [formData, setFormData] = useState<AccommodationFormData>(emptyFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter places to only show accommodation category
  const accommodationPlaces = useMemo(() => {
    return places.filter((place) => place.category === 'accommodation')
  }, [places])

  const handleOpenCreate = useCallback(() => {
    setEditingAccommodation(null)
    setFormData(emptyFormData)
    setShowModal(true)
  }, [])

  const handleOpenEdit = useCallback((accommodation: Accommodation) => {
    setEditingAccommodation(accommodation)
    setFormData({
      placeId: '',
      name: accommodation.name,
      address: accommodation.address || '',
      checkIn: format(new Date(accommodation.checkIn), 'yyyy-MM-dd'),
      checkOut: format(new Date(accommodation.checkOut), 'yyyy-MM-dd'),
      note: accommodation.note || '',
      latitude: accommodation.latitude,
      longitude: accommodation.longitude,
    })
    setShowModal(true)
  }, [])

  const handleClose = useCallback(() => {
    setShowModal(false)
    setEditingAccommodation(null)
    setFormData(emptyFormData)
  }, [])

  const handlePlaceSelect = useCallback((placeId: string) => {
    const selectedPlace = accommodationPlaces.find((p) => p.id === placeId)
    if (selectedPlace) {
      setFormData((prev) => ({
        ...prev,
        placeId,
        name: selectedPlace.name,
        address: selectedPlace.formattedAddress || '',
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
      }))
    }
  }, [accommodationPlaces])

  const handleSubmit = useCallback(async () => {
    if (!formData.name || !formData.checkIn || !formData.checkOut) {
      toast.error('숙소, 체크인/체크아웃 날짜를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingAccommodation) {
        await onUpdateAccommodation(editingAccommodation.id, {
          name: formData.name,
          address: formData.address || null,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          latitude: formData.latitude,
          longitude: formData.longitude,
          note: formData.note || null,
        })
        toast.success('숙소 정보가 수정되었습니다.')
      } else {
        await onAddAccommodation({
          name: formData.name,
          address: formData.address || undefined,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          note: formData.note || undefined,
        })
        toast.success('숙소가 추가되었습니다.')
      }
      handleClose()
    } catch {
      toast.error(editingAccommodation ? '숙소 수정에 실패했습니다.' : '숙소 추가에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, editingAccommodation, onAddAccommodation, onUpdateAccommodation, handleClose])

  const handleDelete = useCallback(async (accommodationId: string) => {
    if (!confirm('이 숙소를 삭제하시겠습니까?')) return

    try {
      await onDeleteAccommodation(accommodationId)
      toast.success('숙소가 삭제되었습니다.')
    } catch {
      toast.error('숙소 삭제에 실패했습니다.')
    }
  }, [onDeleteAccommodation])

  // Calculate nights
  const calculateNights = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diff = end.getTime() - start.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      {/* Collapsible Header */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 hover:bg-gray-50 rounded px-2 py-1 -ml-2 transition-colors">
          <span className="text-xs text-muted-foreground">
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 className="font-medium text-sm flex items-center gap-2">
            <span>🏨</span> 숙소
            {accommodations.length > 0 && (
              <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                {accommodations.length}
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
          disabled={isLoading || accommodationPlaces.length === 0}
          title={accommodationPlaces.length === 0 ? '장소 탭에서 숙소를 먼저 추가하세요' : undefined}
        >
          + 추가
        </Button>
      </div>

      {/* Collapsible Content */}
      <CollapsibleContent className="mt-3">
        {/* Accommodation list */}
        {accommodations.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            {accommodationPlaces.length === 0 ? (
              <p>장소 탭에서 숙소 카테고리 장소를 먼저 추가하세요.</p>
            ) : (
              <p>등록된 숙소가 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {accommodations.map((accommodation) => {
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{accommodation.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(checkIn, 'M월 d일', { locale: ko })} ~{' '}
                        {format(checkOut, 'M월 d일', { locale: ko })}
                        <span className="ml-2 bg-white px-2 py-0.5 rounded">
                          {nights}박
                        </span>
                      </div>
                      {accommodation.address && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          📍 {accommodation.address}
                        </p>
                      )}
                      {accommodation.note && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {accommodation.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleOpenEdit(accommodation)}
                        disabled={isLoading}
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(accommodation.id)}
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
              {editingAccommodation ? '숙소 수정' : '숙소 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Place Selection (only for create) */}
            {!editingAccommodation && (
              <div>
                <Label htmlFor="placeSelect">숙소 선택 *</Label>
                <Select
                  value={formData.placeId}
                  onValueChange={handlePlaceSelect}
                >
                  <SelectTrigger id="placeSelect">
                    <SelectValue placeholder="장소 리스트에서 숙소 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {accommodationPlaces.length === 0 ? (
                      <SelectItem value="none" disabled>
                        숙소 카테고리 장소가 없습니다
                      </SelectItem>
                    ) : (
                      accommodationPlaces.map((place) => (
                        <SelectItem key={place.id} value={place.id}>
                          {place.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  장소 탭에서 숙소 카테고리로 추가된 장소만 선택 가능합니다.
                </p>
              </div>
            )}

            {/* Name (readonly when selected from place) */}
            {(formData.name || editingAccommodation) && (
              <div>
                <Label htmlFor="name">숙소명</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={!editingAccommodation && !!formData.placeId}
                />
              </div>
            )}

            {/* Address (readonly when selected from place) */}
            {formData.address && (
              <div>
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={!editingAccommodation && !!formData.placeId}
                />
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="checkIn">체크인 *</Label>
                <Input
                  id="checkIn"
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) =>
                    setFormData({ ...formData, checkIn: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="checkOut">체크아웃 *</Label>
                <Input
                  id="checkOut"
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) =>
                    setFormData({ ...formData, checkOut: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Nights preview */}
            {formData.checkIn && formData.checkOut && (
              <div className="text-sm text-center text-muted-foreground bg-gray-50 p-2 rounded">
                {calculateNights(formData.checkIn, formData.checkOut)}박 숙박
              </div>
            )}

            {/* Note */}
            <div>
              <Label htmlFor="note">메모</Label>
              <Input
                id="note"
                placeholder="예약번호, 특이사항 등"
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
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!editingAccommodation && !formData.placeId)}
            >
              {isSubmitting ? '저장 중...' : editingAccommodation ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}
