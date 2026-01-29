'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Flight, Accommodation } from '@/infrastructure/api-client/itinerary.api'
import { Plane, Hotel, MapPin, ChevronRight } from '@/lib/icons'

interface TravelSummaryBarProps {
  flights: Flight[]
  accommodations: Accommodation[]
  onFlightClick?: () => void
  onAccommodationClick?: () => void
}

export function TravelSummaryBar({
  flights,
  accommodations,
}: TravelSummaryBarProps) {
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Generate flight summary
  const flightSummary = useMemo(() => {
    if (flights.length === 0) return null

    // Show first flight info
    const firstFlight = flights[0]
    return `${firstFlight.departureCity}→${firstFlight.arrivalCity}`
  }, [flights])

  // Generate accommodation summary
  const accommodationSummary = useMemo(() => {
    if (accommodations.length === 0) return null

    // Calculate total nights
    let totalNights = 0
    accommodations.forEach((acc) => {
      const checkIn = new Date(acc.checkIn)
      const checkOut = new Date(acc.checkOut)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      totalNights += nights
    })

    // Show first accommodation name + total nights
    const firstName = accommodations[0].name
    const displayName = firstName.length > 10 ? firstName.slice(0, 10) + '...' : firstName
    return `${displayName} ${totalNights}박`
  }, [accommodations])

  // Don't render if nothing to show
  if (!flightSummary && !accommodationSummary) {
    return null
  }

  return (
    <>
      {/* Summary Bar */}
      <button
        className="w-full flex items-center justify-center gap-3 px-3 py-2 bg-gray-50 border rounded-lg text-sm hover:bg-gray-100 transition-colors"
        onClick={() => setShowDetailModal(true)}
      >
        {flightSummary && (
          <span className="flex items-center gap-1 text-blue-600">
            <Plane className="w-4 h-4" />
            <span>{flightSummary}</span>
          </span>
        )}
        {flightSummary && accommodationSummary && (
          <span className="text-gray-300">|</span>
        )}
        {accommodationSummary && (
          <span className="flex items-center gap-1 text-purple-600">
            <Hotel className="w-4 h-4" />
            <span>{accommodationSummary}</span>
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
      </button>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>항공편 & 숙소</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Flights */}
            <div>
              <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
                <Plane className="w-4 h-4 text-blue-500" /> 항공편
              </h3>
              {flights.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 항공편이 없습니다.</p>
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {flight.note}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Accommodations */}
            <div>
              <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
                <Hotel className="w-4 h-4 text-purple-500" /> 숙소
              </h3>
              {accommodations.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 숙소가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {accommodations.map((accommodation) => {
                    const checkIn = new Date(accommodation.checkIn)
                    const checkOut = new Date(accommodation.checkOut)
                    const nights = Math.ceil(
                      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
                    )

                    return (
                      <div
                        key={accommodation.id}
                        className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                      >
                        <div className="font-medium text-sm">{accommodation.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(checkIn, 'M월 d일', { locale: ko })} ~{' '}
                          {format(checkOut, 'M월 d일', { locale: ko })}
                          <span className="ml-2 bg-white px-2 py-0.5 rounded">
                            {nights}박
                          </span>
                        </div>
                        {accommodation.address && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {accommodation.address}
                          </p>
                        )}
                        {accommodation.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {accommodation.note}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
