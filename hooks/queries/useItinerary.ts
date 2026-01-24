/**
 * useItinerary Hook
 *
 * SWR-based hook for fetching itinerary by project.
 */

import useSWR from 'swr'
import { itineraryApi, type ItineraryWithDetails } from '@/infrastructure/api-client/itinerary.api'
import { ApiError } from '@/infrastructure/api-client'

export interface UseItineraryOptions {
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

export interface ItineraryError {
  code?: string
  message: string
  itineraryId?: string
}

export function useItinerary(projectId: string | undefined, options: UseItineraryOptions = {}) {
  const { revalidateOnFocus = false, dedupingInterval = 30000 } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ itinerary: ItineraryWithDetails | null }>(
    projectId ? `/projects/${projectId}/itinerary` : null,
    async () => {
      if (!projectId) return Promise.reject('No project ID')
      try {
        const response = await itineraryApi.get(projectId)
        // API now returns { itinerary: null } when no itinerary exists
        return response
      } catch (err) {
        // Handle legacy 404 error for backwards compatibility
        if (err instanceof Error && err.message.includes('404')) {
          return { itinerary: null }
        }
        throw err
      }
    },
    {
      revalidateOnFocus,
      dedupingInterval,
    }
  )

  // Parse error for specific error codes
  const parsedError: ItineraryError | null = error
    ? {
        code: error instanceof ApiError ? (error as ApiError & { code?: string }).code : undefined,
        message: error.message || 'Unknown error',
        itineraryId: undefined,
      }
    : null

  return {
    itinerary: data?.itinerary ?? null,
    isLoading,
    isValidating,
    error: parsedError,
    mutate,
  }
}
