/**
 * useImageMutations Hook
 *
 * Hook for image mutation operations including bulk delete.
 */

import { useState, useCallback } from 'react'
import { imagesApi, type BulkDeleteResponse } from '@/infrastructure/api-client/images.api'
import { useSWRConfig } from 'swr'

export interface UseImageMutationsOptions {
  onSuccess?: (result?: BulkDeleteResponse) => void
  onError?: (error: Error) => void
}

export function useImageMutations(projectId: string, options: UseImageMutationsOptions = {}) {
  const { onSuccess, onError } = options
  const { mutate } = useSWRConfig()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const revalidate = useCallback(async () => {
    await Promise.all([
      mutate(`/projects/${projectId}`),
      mutate(`/projects/${projectId}/images`),
      mutate(`/projects/${projectId}/places`),
    ])
  }, [mutate, projectId])

  /**
   * 단일 이미지 삭제
   */
  const deleteImage = useCallback(
    async (imageId: string): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        await imagesApi.delete(imageId)
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

  /**
   * 이미지 일괄 삭제
   */
  const deleteImages = useCallback(
    async (imageIds: string[]): Promise<BulkDeleteResponse> => {
      if (imageIds.length === 0) {
        throw new Error('No images selected for deletion')
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await imagesApi.bulkDelete(projectId, imageIds)
        await revalidate()
        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Bulk delete failed')
        setError(error)
        onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, revalidate, onSuccess, onError]
  )

  return {
    deleteImage,
    deleteImages,
    isLoading,
    error,
  }
}
