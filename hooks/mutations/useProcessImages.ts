/**
 * useProcessImages Hook
 *
 * Hook for processing images with Claude AI.
 */

import { useState, useCallback } from 'react'
import { projectsApi, type ProcessingResult } from '@/infrastructure/api-client/projects.api'
import { useSWRConfig } from 'swr'

export interface UseProcessImagesOptions {
  onSuccess?: (result: ProcessingResult) => void
  onError?: (error: Error) => void
}

export function useProcessImages(projectId: string, options: UseProcessImagesOptions = {}) {
  const { onSuccess, onError } = options
  const { mutate } = useSWRConfig()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const processImages = useCallback(
    async (retryImageIds?: string[]) => {
      if (!projectId) return

      setIsProcessing(true)
      setError(null)

      try {
        const result = await projectsApi.processImages(projectId, retryImageIds)

        // Revalidate related data
        await Promise.all([
          mutate(`/projects/${projectId}`),
          mutate(`/projects/${projectId}/places`),
          mutate(`/projects/${projectId}/images`),
        ])

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Processing failed')
        setError(error)
        onError?.(error)
        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [projectId, mutate, onSuccess, onError]
  )

  return {
    processImages,
    isProcessing,
    error,
  }
}
