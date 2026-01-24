/**
 * useItineraryMutations Hook
 *
 * Provides mutation functions for itinerary operations.
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
} from '@/infrastructure/api-client/itinerary.api'

export function useItineraryMutations(projectId: string) {
  const { mutate } = useSWRConfig()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const revalidateItinerary = useCallback(() => {
    return mutate(`/projects/${projectId}/itinerary`)
  }, [projectId, mutate])

  // =========================================================================
  // Itinerary CRUD
  // =========================================================================

  const createItinerary = useCallback(
    async (data: CreateItineraryInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.create(projectId, data)
        await revalidateItinerary()
        return result.itinerary
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create itinerary')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, revalidateItinerary]
  )

  const updateItinerary = useCallback(
    async (data: UpdateItineraryInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.update(projectId, data)
        await revalidateItinerary()
        return result.itinerary
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update itinerary')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, revalidateItinerary]
  )

  const deleteItinerary = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await itineraryApi.delete(projectId)
      // Immediately set cache to null (no revalidation needed after delete)
      await mutate(`/projects/${projectId}/itinerary`, { itinerary: null }, false)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete itinerary')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [projectId, mutate])

  // =========================================================================
  // Itinerary Items
  // =========================================================================

  const addItem = useCallback(
    async (itineraryId: string, data: CreateItineraryItemInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.addItem(itineraryId, data)
        await revalidateItinerary()
        return result.item
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add item')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const updateItem = useCallback(
    async (itemId: string, data: UpdateItineraryItemInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.updateItem(itemId, data)
        await revalidateItinerary()
        return result.item
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update item')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await itineraryApi.deleteItem(itemId)
        await revalidateItinerary()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete item')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const reorderItems = useCallback(
    async (itineraryId: string, dayId: string, itemIds: string[]) => {
      setIsLoading(true)
      setError(null)
      try {
        await itineraryApi.reorderItems(itineraryId, dayId, itemIds)
        await revalidateItinerary()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to reorder items')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const moveItemToDay = useCallback(
    async (itemId: string, data: MoveItemInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.moveItemToDay(itemId, data)
        await revalidateItinerary()
        return result.item
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to move item')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
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
        await revalidateItinerary()
        return result.flight
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add flight')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const updateFlight = useCallback(
    async (flightId: string, data: UpdateFlightInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await itineraryApi.updateFlight(flightId, data)
        await revalidateItinerary()
        return result.flight
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update flight')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const deleteFlight = useCallback(
    async (flightId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await itineraryApi.deleteFlight(flightId)
        await revalidateItinerary()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete flight')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
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
        await revalidateItinerary()
        return result.accommodation
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update accommodation')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateItinerary]
  )

  const deleteAccommodation = useCallback(
    async (accommodationId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await itineraryApi.deleteAccommodation(accommodationId)
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
