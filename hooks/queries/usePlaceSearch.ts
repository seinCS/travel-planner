/**
 * usePlaceSearch Hook
 *
 * SWR-based hook for searching places using Google Places Autocomplete.
 * Includes debouncing and location bias support.
 */

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import {
  placesApi,
  type PlaceSearchPrediction,
  type PlaceSearchDetails,
} from '@/infrastructure/api-client/places.api'

export interface UsePlaceSearchOptions {
  /** Location bias coordinates (project destination center) */
  locationBias?: { lat: number; lng: number }
  /** Search language (default: 'ko') */
  language?: string
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Minimum query length to trigger search (default: 2) */
  minQueryLength?: number
}

export interface UsePlaceSearchReturn {
  /** Current search query */
  query: string
  /** Set the search query */
  setQuery: (query: string) => void
  /** Search results (autocomplete predictions) */
  predictions: PlaceSearchPrediction[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Clear search results */
  clear: () => void
  /** Get detailed place information */
  getPlaceDetails: (placeId: string) => Promise<PlaceSearchDetails | null>
  /** Loading state for place details */
  isLoadingDetails: boolean
}

export function usePlaceSearch(
  options: UsePlaceSearchOptions = {}
): UsePlaceSearchReturn {
  const {
    locationBias,
    language = 'ko',
    debounceMs = 300,
    minQueryLength = 2,
  } = options

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Build the SWR key
  const shouldFetch = debouncedQuery.length >= minQueryLength
  const swrKey = shouldFetch
    ? [
        'place-search',
        debouncedQuery,
        locationBias?.lat,
        locationBias?.lng,
        language,
      ]
    : null

  // SWR fetch
  const { data, error, isLoading } = useSWR(
    swrKey,
    async () => {
      const response = await placesApi.search(debouncedQuery, {
        lat: locationBias?.lat,
        lng: locationBias?.lng,
        language,
      })
      return response.predictions
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000,
      // Keep previous data while loading new results
      keepPreviousData: true,
    }
  )

  const clear = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
  }, [])

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceSearchDetails | null> => {
      setIsLoadingDetails(true)
      try {
        const response = await placesApi.getSearchDetails(placeId)
        return response.place
      } catch (err) {
        console.error('Failed to get place details:', err)
        return null
      } finally {
        setIsLoadingDetails(false)
      }
    },
    []
  )

  return {
    query,
    setQuery,
    predictions: data ?? [],
    isLoading: isLoading && shouldFetch,
    error: error ?? null,
    clear,
    getPlaceDetails,
    isLoadingDetails,
  }
}
