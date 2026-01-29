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
import type { Flight, Accommodation } from '@/infrastructure/api-client/itinerary.api'
import type { Place } from '@/types'
import { Flight as FlightIcon, HotelIcon, MapPin, Expand, Next, Plus } from '@/components/icons'
import type { IconComponent } from '@/components/icons'

// ============================================================================
// Types
// ============================================================================

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

// Props for Flight resource
interface FlightSectionProps {
  type: 'flight'
  items: Flight[]
  itineraryId: string
  places?: never
  onAdd: (data: {
    departureCity: string
    arrivalCity: string
    airline?: string
    flightNumber?: string
    departureDate: string
    arrivalDate?: string
    note?: string
  }) => Promise<void>
  onUpdate: (
    id: string,
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
  onDelete: (id: string) => Promise<void>
  isLoading?: boolean
  defaultExpanded?: boolean
}

// Props for Accommodation resource
interface AccommodationSectionProps {
  type: 'accommodation'
  items: Accommodation[]
  itineraryId: string
  places: Place[]
  onAdd: (data: {
    name: string
    address?: string
    checkIn: string
    checkOut: string
    latitude?: number
    longitude?: number
    note?: string
  }) => Promise<void>
  onUpdate: (
    id: string,
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
  onDelete: (id: string) => Promise<void>
  isLoading?: boolean
  defaultExpanded?: boolean
}

type ResourceSectionProps = FlightSectionProps | AccommodationSectionProps

// ============================================================================
// Constants
// ============================================================================

const RESOURCE_CONFIG: Record<string, {
  Icon: IconComponent
  title: string
  cardColor: string
  emptyMessage: string
  addMessage: { success: string; error: string }
  updateMessage: { success: string; error: string }
  deleteMessage: { success: string; error: string }
  deleteConfirm: string
}> = {
  flight: {
    Icon: FlightIcon,
    title: '항공편',
    cardColor: 'bg-blue-50 border-blue-200',
    emptyMessage: '등록된 항공편이 없습니다.',
    addMessage: { success: '항공편이 추가되었습니다.', error: '항공편 추가에 실패했습니다.' },
    updateMessage: { success: '항공편이 수정되었습니다.', error: '항공편 수정에 실패했습니다.' },
    deleteMessage: { success: '항공편이 삭제되었습니다.', error: '항공편 삭제에 실패했습니다.' },
    deleteConfirm: '이 항공편을 삭제하시겠습니까?',
  },
  accommodation: {
    Icon: HotelIcon,
    title: '숙소',
    cardColor: 'bg-purple-50 border-purple-200',
    emptyMessage: '등록된 숙소가 없습니다.',
    addMessage: { success: '숙소가 추가되었습니다.', error: '숙소 추가에 실패했습니다.' },
    updateMessage: { success: '숙소 정보가 수정되었습니다.', error: '숙소 수정에 실패했습니다.' },
    deleteMessage: { success: '숙소가 삭제되었습니다.', error: '숙소 삭제에 실패했습니다.' },
    deleteConfirm: '이 숙소를 삭제하시겠습니까?',
  },
} as const

const emptyFlightForm: FlightFormData = {
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

const emptyAccommodationForm: AccommodationFormData = {
  placeId: '',
  name: '',
  address: '',
  checkIn: '',
  checkOut: '',
  note: '',
  latitude: null,
  longitude: null,
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ============================================================================
// Component
// ============================================================================

export function ResourceSection(props: ResourceSectionProps) {
  const {
    type,
    items,
    onAdd,
    onUpdate,
    onDelete,
    isLoading,
    defaultExpanded = false,
  } = props

  const config = RESOURCE_CONFIG[type]
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Flight | Accommodation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [flightForm, setFlightForm] = useState<FlightFormData>(emptyFlightForm)
  const [accommodationForm, setAccommodationForm] = useState<AccommodationFormData>(emptyAccommodationForm)

  // Accommodation-specific: filter places
  const accommodationPlaces = useMemo(() => {
    if (type !== 'accommodation') return []
    return props.places.filter((place) => place.category === 'accommodation')
  }, [type, props.type === 'accommodation' ? props.places : []])

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null)
    if (type === 'flight') {
      setFlightForm(emptyFlightForm)
    } else {
      setAccommodationForm(emptyAccommodationForm)
    }
    setShowModal(true)
  }, [type])

  const handleOpenEdit = useCallback((item: Flight | Accommodation) => {
    setEditingItem(item)

    if (type === 'flight') {
      const flight = item as Flight
      const departureDate = new Date(flight.departureDate)
      const arrivalDate = flight.arrivalDate ? new Date(flight.arrivalDate) : null

      setFlightForm({
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
    } else {
      const accommodation = item as Accommodation
      setAccommodationForm({
        placeId: '',
        name: accommodation.name,
        address: accommodation.address || '',
        checkIn: format(new Date(accommodation.checkIn), 'yyyy-MM-dd'),
        checkOut: format(new Date(accommodation.checkOut), 'yyyy-MM-dd'),
        note: accommodation.note || '',
        latitude: accommodation.latitude,
        longitude: accommodation.longitude,
      })
    }
    setShowModal(true)
  }, [type])

  const handleClose = useCallback(() => {
    setShowModal(false)
    setEditingItem(null)
    setFlightForm(emptyFlightForm)
    setAccommodationForm(emptyAccommodationForm)
  }, [])

  const handlePlaceSelect = useCallback((placeId: string) => {
    const selectedPlace = accommodationPlaces.find((p) => p.id === placeId)
    if (selectedPlace) {
      setAccommodationForm((prev) => ({
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
    setIsSubmitting(true)

    try {
      if (type === 'flight') {
        if (!flightForm.departureCity || !flightForm.arrivalCity || !flightForm.departureDate || !flightForm.departureTime) {
          toast.error('출발지, 도착지, 출발 날짜와 시간을 입력해주세요.')
          return
        }

        const departureDateTime = `${flightForm.departureDate}T${flightForm.departureTime}:00`
        const arrivalDateTime = flightForm.arrivalDate && flightForm.arrivalTime
          ? `${flightForm.arrivalDate}T${flightForm.arrivalTime}:00`
          : undefined

        if (editingItem) {
          await (onUpdate as FlightSectionProps['onUpdate'])(editingItem.id, {
            departureCity: flightForm.departureCity,
            arrivalCity: flightForm.arrivalCity,
            airline: flightForm.airline || null,
            flightNumber: flightForm.flightNumber || null,
            departureDate: departureDateTime,
            arrivalDate: arrivalDateTime || null,
            note: flightForm.note || null,
          })
          toast.success(config.updateMessage.success)
        } else {
          await (onAdd as FlightSectionProps['onAdd'])({
            departureCity: flightForm.departureCity,
            arrivalCity: flightForm.arrivalCity,
            airline: flightForm.airline || undefined,
            flightNumber: flightForm.flightNumber || undefined,
            departureDate: departureDateTime,
            arrivalDate: arrivalDateTime,
            note: flightForm.note || undefined,
          })
          toast.success(config.addMessage.success)
        }
      } else {
        if (!accommodationForm.name || !accommodationForm.checkIn || !accommodationForm.checkOut) {
          toast.error('숙소, 체크인/체크아웃 날짜를 입력해주세요.')
          return
        }

        if (editingItem) {
          await (onUpdate as AccommodationSectionProps['onUpdate'])(editingItem.id, {
            name: accommodationForm.name,
            address: accommodationForm.address || null,
            checkIn: accommodationForm.checkIn,
            checkOut: accommodationForm.checkOut,
            latitude: accommodationForm.latitude,
            longitude: accommodationForm.longitude,
            note: accommodationForm.note || null,
          })
          toast.success(config.updateMessage.success)
        } else {
          await (onAdd as AccommodationSectionProps['onAdd'])({
            name: accommodationForm.name,
            address: accommodationForm.address || undefined,
            checkIn: accommodationForm.checkIn,
            checkOut: accommodationForm.checkOut,
            latitude: accommodationForm.latitude || undefined,
            longitude: accommodationForm.longitude || undefined,
            note: accommodationForm.note || undefined,
          })
          toast.success(config.addMessage.success)
        }
      }
      handleClose()
    } catch (err) {
      console.error(`Failed to save ${type}:`, err)
      toast.error(editingItem ? config.updateMessage.error : config.addMessage.error)
    } finally {
      setIsSubmitting(false)
    }
  }, [type, flightForm, accommodationForm, editingItem, onAdd, onUpdate, config, handleClose])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(config.deleteConfirm)) return

    try {
      await onDelete(id)
      toast.success(config.deleteMessage.success)
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err)
      toast.error(config.deleteMessage.error)
    }
  }, [type, config, onDelete])

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderFlightCard = (flight: Flight) => {
    const departureDate = new Date(flight.departureDate)
    const arrivalDate = flight.arrivalDate ? new Date(flight.arrivalDate) : null

    return (
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
          <span>{format(departureDate, 'M월 d일 HH:mm', { locale: ko })}</span>
          {arrivalDate && (
            <span>
              {' → '}
              {format(arrivalDate, 'M월 d일 HH:mm', { locale: ko })}
            </span>
          )}
        </div>
        {flight.note && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{flight.note}</p>
        )}
      </div>
    )
  }

  const renderAccommodationCard = (accommodation: Accommodation) => {
    const checkIn = new Date(accommodation.checkIn)
    const checkOut = new Date(accommodation.checkOut)
    const nights = calculateNights(accommodation.checkIn, accommodation.checkOut)

    return (
      <div className="flex-1">
        <div className="font-medium text-sm">{accommodation.name}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {format(checkIn, 'M월 d일', { locale: ko })} ~ {format(checkOut, 'M월 d일', { locale: ko })}
          <span className="ml-2 bg-white px-2 py-0.5 rounded">{nights}박</span>
        </div>
        {accommodation.address && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            <MapPin className="w-3 h-3 inline mr-0.5" />{accommodation.address}
          </p>
        )}
        {accommodation.note && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{accommodation.note}</p>
        )}
      </div>
    )
  }

  const renderFlightForm = () => (
    <div className="space-y-4">
      {/* Route */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="departureCity">출발지 *</Label>
          <Input
            id="departureCity"
            placeholder="서울/인천"
            value={flightForm.departureCity}
            onChange={(e) => setFlightForm({ ...flightForm, departureCity: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="arrivalCity">도착지 *</Label>
          <Input
            id="arrivalCity"
            placeholder="도쿄/나리타"
            value={flightForm.arrivalCity}
            onChange={(e) => setFlightForm({ ...flightForm, arrivalCity: e.target.value })}
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
            value={flightForm.airline}
            onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="flightNumber">편명</Label>
          <Input
            id="flightNumber"
            placeholder="KE123"
            value={flightForm.flightNumber}
            onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })}
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
            value={flightForm.departureDate}
            onChange={(e) => setFlightForm({ ...flightForm, departureDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="departureTime">출발 시간 *</Label>
          <Input
            id="departureTime"
            type="time"
            value={flightForm.departureTime}
            onChange={(e) => setFlightForm({ ...flightForm, departureTime: e.target.value })}
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
            value={flightForm.arrivalDate}
            onChange={(e) => setFlightForm({ ...flightForm, arrivalDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="arrivalTime">도착 시간</Label>
          <Input
            id="arrivalTime"
            type="time"
            value={flightForm.arrivalTime}
            onChange={(e) => setFlightForm({ ...flightForm, arrivalTime: e.target.value })}
          />
        </div>
      </div>

      {/* Note */}
      <div>
        <Label htmlFor="flightNote">메모</Label>
        <Input
          id="flightNote"
          placeholder="예약번호, 터미널 정보 등"
          value={flightForm.note}
          onChange={(e) => setFlightForm({ ...flightForm, note: e.target.value })}
        />
      </div>
    </div>
  )

  const renderAccommodationForm = () => (
    <div className="space-y-4">
      {/* Place Selection (only for create) */}
      {!editingItem && (
        <div>
          <Label htmlFor="placeSelect">숙소 선택 *</Label>
          <Select
            value={accommodationForm.placeId}
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
      {(accommodationForm.name || editingItem) && (
        <div>
          <Label htmlFor="name">숙소명</Label>
          <Input
            id="name"
            value={accommodationForm.name}
            onChange={(e) => setAccommodationForm({ ...accommodationForm, name: e.target.value })}
            disabled={!editingItem && !!accommodationForm.placeId}
          />
        </div>
      )}

      {/* Address (readonly when selected from place) */}
      {accommodationForm.address && (
        <div>
          <Label htmlFor="address">주소</Label>
          <Input
            id="address"
            value={accommodationForm.address}
            onChange={(e) => setAccommodationForm({ ...accommodationForm, address: e.target.value })}
            disabled={!editingItem && !!accommodationForm.placeId}
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
            value={accommodationForm.checkIn}
            onChange={(e) => setAccommodationForm({ ...accommodationForm, checkIn: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="checkOut">체크아웃 *</Label>
          <Input
            id="checkOut"
            type="date"
            value={accommodationForm.checkOut}
            onChange={(e) => setAccommodationForm({ ...accommodationForm, checkOut: e.target.value })}
          />
        </div>
      </div>

      {/* Nights preview */}
      {accommodationForm.checkIn && accommodationForm.checkOut && (
        <div className="text-sm text-center text-muted-foreground bg-gray-50 p-2 rounded">
          {calculateNights(accommodationForm.checkIn, accommodationForm.checkOut)}박 숙박
        </div>
      )}

      {/* Note */}
      <div>
        <Label htmlFor="accommodationNote">메모</Label>
        <Input
          id="accommodationNote"
          placeholder="예약번호, 특이사항 등"
          value={accommodationForm.note}
          onChange={(e) => setAccommodationForm({ ...accommodationForm, note: e.target.value })}
        />
      </div>
    </div>
  )

  // Determine if add button should be disabled
  const isAddDisabled = type === 'accommodation' && accommodationPlaces.length === 0

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      {/* Collapsible Header */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 hover:bg-gray-50 rounded px-2 py-1 -ml-2 transition-colors">
          <span className="text-xs text-muted-foreground">
            {isExpanded ? <Expand className="w-3 h-3" /> : <Next className="w-3 h-3" />}
          </span>
          <h3 className="font-medium text-sm flex items-center gap-2">
            <config.Icon className="w-4 h-4" /> {config.title}
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                {items.length}
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
          disabled={isLoading || isAddDisabled}
          title={isAddDisabled ? '장소 탭에서 숙소를 먼저 추가하세요' : undefined}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> 추가
        </Button>
      </div>

      {/* Collapsible Content */}
      <CollapsibleContent className="mt-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            {type === 'accommodation' && accommodationPlaces.length === 0 ? (
              <p>장소 탭에서 숙소 카테고리 장소를 먼저 추가하세요.</p>
            ) : (
              <p>{config.emptyMessage}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 ${config.cardColor}`}
              >
                <div className="flex items-start justify-between">
                  {type === 'flight'
                    ? renderFlightCard(item as Flight)
                    : renderAccommodationCard(item as Accommodation)}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleOpenEdit(item)}
                      disabled={isLoading}
                    >
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(item.id)}
                      disabled={isLoading}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? `${config.title} 수정`
                : `${config.title} 추가`}
            </DialogTitle>
          </DialogHeader>

          {type === 'flight' ? renderFlightForm() : renderAccommodationForm()}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (type === 'accommodation' && !editingItem && !accommodationForm.placeId)
              }
            >
              {isSubmitting ? '저장 중...' : editingItem ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}
