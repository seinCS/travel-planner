/**
 * usePlaces Hook
 *
 * SWR-based hook for fetching places by project.
 */

import useSWR from 'swr'
import { placesApi, type PlacesResponse } from '@/infrastructure/api-client/places.api'

export interface UsePlacesOptions {
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

export function usePlaces(projectId: string | undefined, options: UsePlacesOptions = {}) {
  const { revalidateOnFocus = false, dedupingInterval = 30000 } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<PlacesResponse>(
    projectId ? `/projects/${projectId}/places` : null,
    () => (projectId ? placesApi.getByProject(projectId) : Promise.reject('No project ID')),
    {
      revalidateOnFocus,
      dedupingInterval,
    }
  )

  return {
    places: data?.places ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
