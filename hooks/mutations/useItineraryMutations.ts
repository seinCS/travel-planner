/**
 * useItineraryMutations Hook
 *
 * Provides mutation functions for itinerary operations.
 * Uses direct SWR cache updates from API responses instead of full revalidation.
 */

import { useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'
import {
  itineraryApi,
  type CreateItineraryInput,
  type UpdateItineraryInput,
  type CreateItineraryItemInput,
  type UpdateItineraryItemInput,
  type MoveItemInput,
  type CreateFlightInput,
  type UpdateFlightInput,
  type CreateAccommodationInput,
  type UpdateAccommodationInput,
  type ItineraryWithDetails,
  type ItineraryItem,
  type Flight,
  type Accommodation,
} from '@/infrastructure/api-client/itinerary.api'

type ItineraryCache = { itinerary: ItineraryWithDetails | null } | undefined

export function useItineraryMutations(projectId: string) {
  const { mutate } = useSWRConfig()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const cacheKey = `/projects/${projectId}/itinerary`

  const revalidateItinerary = useCallback(() => {
    return mutate(cacheKey)
  }, [cacheKey, mutate])

  // Helper: update SWR cache with an updater function (no revalidation)
  const updateCache = useCallback(
    (updater: (data: ItineraryWithDetails) => ItineraryWithDetails) => {
      return mutate(
        cacheKey,
        (currentData: ItineraryCache) => {
          if (!currentData?.itinerary) return currentData
          return { itinerary: updater(currentData.itinerary) }
        },
        { revalidate: false }
      )
    },
    [cacheKey, mutate]
  )

  // =========================================================================
  // Itinerary CRUD
  // =========================================================================

  const createItinerary = useCallback(
    async (data: CreateItineraryInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.create(projectId, data)
        // Create returns full itinerary with details - set directly
        await mutate(cacheKey, result, { revalidate: false })
        return result.itinerary
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create itinerary')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, cacheKey, mutate]
  )

  const updateItinerary = useCallback(
    async (data: UpdateItineraryInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.update(projectId, data)
        // Update returns full itinerary with details - set directly
        await mutate(cacheKey, result, { revalidate: false })
        return result.itinerary
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update itinerary')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, cacheKey, mutate]
  )

  const deleteItinerary = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await itineraryApi.delete(projectId)
      await mutate(cacheKey, { itinerary: null }, { revalidate: false })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete itinerary')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [projectId, cacheKey, mutate])

  // =========================================================================
  // Itinerary Items
  // =========================================================================

  const addItem = useCallback(
    async (itineraryId: string, data: CreateItineraryItemInput) => {
      setIsLoading(true)
      setError(null)

      // Optimistic update with temporary item
      const tempId = `temp-${Date.now()}`
      const now = new Date()
      const optimisticItem: ItineraryItem & { isOptimistic?: boolean } = {
        id: tempId,
        dayId: data.dayId,
        placeId: data.placeId,
        accommodationId: null,
        itemType: 'place',
        order: data.order ?? 999,
        startTime: data.startTime ?? null,
        note: data.note ?? null,
        place: null,
        accommodation: null,
        createdAt: now,
        updatedAt: now,
        isOptimistic: true,
      }

      await updateCache((itinerary) => ({
        ...itinerary,
        days: itinerary.days.map((day) =>
          day.id === data.dayId
            ? { ...day, items: [...day.items, optimisticItem] }
            : day
        ),
      }))

      try {
        const result = await itineraryApi.addItem(itineraryId, data)
        // Replace optimistic item with real item from API response
        await updateCache((itinerary) => ({
          ...itinerary,
          days: itinerary.days.map((day) =>
            day.id === data.dayId
              ? {
                  ...day,
                  items: day.items.map((item) =>
                    item.id === tempId ? { ...result.item, accommodation: null } : item
                  ),
                }
              : day
          ),
        }))
        return result.item
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add item')
        setError(error)
        // Rollback - remove optimistic item
        await updateCache((itinerary) => ({
          ...itinerary,
          days: itinerary.days.map((day) =>
            day.id === data.dayId
              ? { ...day, items: day.items.filter((item) => item.id !== tempId) }
              : day
          ),
        }))
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache]
  )

  const updateItem = useCallback(
    async (itemId: string, data: UpdateItineraryItemInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.updateItem(itemId, data)
        // Update the specific item in cache
        await updateCache((itinerary) => ({
          ...itinerary,
          days: itinerary.days.map((day) => ({
            ...day,
            items: day.items.map((item) =>
              item.id === itemId
                ? { ...item, ...result.item, accommodation: item.accommodation }
                : item
            ),
          })),
        }))
        return result.item
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update item')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await itineraryApi.deleteItem(itemId)
        // Remove item from cache
        await updateCache((itinerary) => ({
          ...itinerary,
          days: itinerary.days.map((day) => ({
            ...day,
            items: day.items.filter((item) => item.id !== itemId),
          })),
        }))
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete item')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache]
  )

  const reorderItems = useCallback(
    async (itineraryId: string, dayId: string, itemIds: string[]) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.reorderItems(itineraryId, dayId, itemIds)
        // Replace items for the specific day with reordered items from API
        await updateCache((itinerary) => ({
          ...itinerary,
          days: itinerary.days.map((day) =>
            day.id === dayId
              ? {
                  ...day,
                  items: result.items.map((apiItem) => {
                    const existingItem = day.items.find((i) => i.id === apiItem.id)
                    return existingItem
                      ? { ...existingItem, order: apiItem.order }
                      : { ...apiItem, accommodation: null }
                  }),
                }
              : day
          ),
        }))
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to reorder items')
        setError(error)
        await revalidateItinerary()
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache, revalidateItinerary]
  )

  const moveItemToDay = useCallback(
    async (itemId: string, data: MoveItemInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.moveItemToDay(itemId, data)
        // Move item between days in cache
        await updateCache((itinerary) => {
          let movedItem: ItineraryItem | undefined
          const updatedDays = itinerary.days.map((day) => {
            const itemInDay = day.items.find((i) => i.id === itemId)
            if (itemInDay) {
              movedItem = itemInDay
              return { ...day, items: day.items.filter((i) => i.id !== itemId) }
            }
            return day
          })

          if (!movedItem) return itinerary

          const updatedItem: ItineraryItem = {
            ...movedItem,
            ...result.item,
            accommodation: movedItem.accommodation,
            dayId: data.targetDayId,
          }

          return {
            ...itinerary,
            days: updatedDays.map((day) =>
              day.id === data.targetDayId
                ? { ...day, items: [...day.items, updatedItem].sort((a, b) => a.order - b.order) }
                : day
            ),
          }
        })
        return result.item
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to move item')
        setError(error)
        await revalidateItinerary()
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache, revalidateItinerary]
  )

  // =========================================================================
  // Flights
  // =========================================================================

  const addFlight = useCallback(
    async (itineraryId: string, data: CreateFlightInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.addFlight(itineraryId, data)
        await updateCache((itinerary) => ({
          ...itinerary,
          flights: [...itinerary.flights, result.flight],
        }))
        return result.flight
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add flight')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache]
  )

  const updateFlight = useCallback(
    async (flightId: string, data: UpdateFlightInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.updateFlight(flightId, data)
        await updateCache((itinerary) => ({
          ...itinerary,
          flights: itinerary.flights.map((f) =>
            f.id === flightId ? result.flight : f
          ),
        }))
        return result.flight
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update flight')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache]
  )

  const deleteFlight = useCallback(
    async (flightId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await itineraryApi.deleteFlight(flightId)
        await updateCache((itinerary) => ({
          ...itinerary,
          flights: itinerary.flights.filter((f) => f.id !== flightId),
        }))
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete flight')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache]
  )

  // =========================================================================
  // Accommodations
  // =========================================================================

  const addAccommodation = useCallback(
    async (itineraryId: string, data: CreateAccommodationInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.addAccommodation(itineraryId, data)
        // Accommodation creation also creates itinerary items via sync service,
        // so we need full revalidation to get the new items
        await revalidateItinerary()
        return result.accommodation
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add accommodation')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const updateAccommodation = useCallback(
    async (accommodationId: string, data: UpdateAccommodationInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.updateAccommodation(accommodationId, data)
        // If dates changed, sync service modifies itinerary items too
        if (data.checkIn !== undefined || data.checkOut !== undefined) {
          await revalidateItinerary()
        } else {
          await updateCache((itinerary) => ({
            ...itinerary,
            accommodations: itinerary.accommodations.map((a) =>
              a.id === accommodationId ? result.accommodation : a
            ),
          }))
        }
        return result.accommodation
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update accommodation')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [updateCache, revalidateItinerary]
  )

  const deleteAccommodation = useCallback(
    async (accommodationId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await itineraryApi.deleteAccommodation(accommodationId)
        // Deletion cascades to itinerary items, so revalidate to sync
        await revalidateItinerary()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete accommodation')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  return {
    isLoading,
    error,
    // Itinerary
    createItinerary,
    updateItinerary,
    deleteItinerary,
    // Items
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    moveItemToDay,
    // Flights
    addFlight,
    updateFlight,
    deleteFlight,
    // Accommodations
    addAccommodation,
    updateAccommodation,
    deleteAccommodation,
  }
}
