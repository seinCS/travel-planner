/**
 * usePlaceDetails Hook
 *
 * SWR-based hook for fetching Google Place details.
 * Supports both authenticated and shared (token-based) access.
 */

import useSWR from 'swr'
import { placesApi, type PlaceDetailsResponse } from '@/infrastructure/api-client/places.api'

export interface UsePlaceDetailsOptions {
  shareToken?: string
  enabled?: boolean
}

export function usePlaceDetails(placeId: string | undefined, options: UsePlaceDetailsOptions = {}) {
  const { shareToken, enabled = true } = options

  const shouldFetch = enabled && !!placeId

  const { data, error, isLoading, isValidating, mutate } = useSWR<PlaceDetailsResponse>(
    shouldFetch ? `/places/${placeId}/details${shareToken ? `?token=${shareToken}` : ''}` : null,
    () => {
      if (!placeId) return Promise.reject('No place ID')
      return shareToken
        ? placesApi.getDetailsWithToken(placeId, shareToken)
        : placesApi.getDetails(placeId)
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
      keepPreviousData: false, // 새 placeId로 전환 시 이전 데이터 제거
    }
  )

  return {
    details: data,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
