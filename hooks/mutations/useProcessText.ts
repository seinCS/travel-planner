/**
 * useProcessText Hook
 *
 * Hook for processing text inputs with Claude AI.
 */

import { useState, useCallback } from 'react'
import { projectsApi, type ProcessingResult } from '@/infrastructure/api-client/projects.api'
import { useSWRConfig } from 'swr'

export interface UseProcessTextOptions {
  onSuccess?: (result: ProcessingResult) => void
  onError?: (error: Error) => void
}

export function useProcessText(projectId: string, options: UseProcessTextOptions = {}) {
  const { onSuccess, onError } = options
  const { mutate } = useSWRConfig()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const processText = useCallback(
    async (retryTextInputIds?: string[]) => {
      if (!projectId) return

      setIsProcessing(true)
      setError(null)

      try {
        const result = await projectsApi.processText(projectId, retryTextInputIds)

        // Revalidate related data
        await Promise.all([
          mutate(`/projects/${projectId}`),
          mutate(`/projects/${projectId}/places`),
          mutate(`/projects/${projectId}/text-inputs`),
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
    processText,
    isProcessing,
    error,
  }
}
