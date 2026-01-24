/**
 * usePlaceMutations Hook
 *
 * Hook for place CRUD operations.
 */

import { useState, useCallback } from 'react'
import { placesApi } from '@/infrastructure/api-client/places.api'
import { useSWRConfig } from 'swr'
import type { Place, UpdatePlaceInput, CreatePlaceInput } from '@/types'

export interface UsePlaceMutationsOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function usePlaceMutations(projectId: string, options: UsePlaceMutationsOptions = {}) {
  const { onSuccess, onError } = options
  const { mutate } = useSWRConfig()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const revalidate = useCallback(async () => {
    await Promise.all([
      mutate(`/projects/${projectId}`),
      mutate(`/projects/${projectId}/places`),
    ])
  }, [mutate, projectId])

  const createPlace = useCallback(
    async (data: CreatePlaceInput): Promise<Place> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await placesApi.create(projectId, data)
        await revalidate()
        onSuccess?.()
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Create failed')
        setError(error)
        onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, revalidate, onSuccess, onError]
  )

  const updatePlace = useCallback(
    async (placeId: string, data: UpdatePlaceInput): Promise<Place> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await placesApi.update(placeId, data)
        await revalidate()
        onSuccess?.()
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Update failed')
        setError(error)
        onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidate, onSuccess, onError]
  )

  const deletePlace = useCallback(
    async (placeId: string): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        await placesApi.delete(placeId)
        await revalidate()
        onSuccess?.()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Delete failed')
        setError(error)
        onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidate, onSuccess, onError]
  )

  const relocatePlace = useCallback(
    async (placeId: string, searchQuery: string): Promise<Place> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await placesApi.relocate(placeId, searchQuery)
        await revalidate()
        onSuccess?.()
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Relocate failed')
        setError(error)
        onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidate, onSuccess, onError]
  )

  return {
    createPlace,
    updatePlace,
    deletePlace,
    relocatePlace,
    isLoading,
    error,
  }
}
