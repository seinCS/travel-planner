/**
 * Add Place from Chat Hook
 *
 * Hook for adding recommended places from chat to the project.
 */

import { useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'
import type { RecommendedPlace } from '@/domain/interfaces/ILLMService'

interface AddPlaceResult {
  success: boolean
  error?: string
  place?: unknown
  isDuplicate?: boolean
}

export function useAddPlaceFromChat(projectId: string) {
  const [isAdding, setIsAdding] = useState(false)
  const [addedPlaces, setAddedPlaces] = useState<Set<string>>(new Set())
  const { mutate } = useSWRConfig()

  const addPlace = useCallback(
    async (place: RecommendedPlace): Promise<AddPlaceResult> => {
      // Check if already added (by name)
      if (addedPlaces.has(place.name)) {
        return { success: false, error: '이미 추가된 장소입니다.', isDuplicate: true }
      }

      setIsAdding(true)

      try {
        const response = await fetch(`/api/projects/${projectId}/chat/add-place`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409) {
            // Duplicate - mark as added
            setAddedPlaces((prev) => new Set(prev).add(place.name))
            return { success: false, error: data.error?.message, isDuplicate: true, place: data.place }
          }
          throw new Error(data.error?.message || '장소 추가에 실패했습니다.')
        }

        // Mark as added
        setAddedPlaces((prev) => new Set(prev).add(place.name))

        // Refresh places list
        await mutate(`/api/projects/${projectId}/places`)

        return { success: true, place: data.place }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : '장소 추가에 실패했습니다.',
        }
      } finally {
        setIsAdding(false)
      }
    },
    [projectId, addedPlaces, mutate]
  )

  const isPlaceAdded = useCallback(
    (placeName: string): boolean => {
      return addedPlaces.has(placeName)
    },
    [addedPlaces]
  )

  const resetAddedPlaces = useCallback(() => {
    setAddedPlaces(new Set())
  }, [])

  return {
    addPlace,
    isAdding,
    isPlaceAdded,
    resetAddedPlaces,
  }
}
