/**
 * useApplyItinerary Hook
 *
 * Applies an AI-generated itinerary preview to the project.
 */

import { useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'
import type { ItineraryPreviewData } from '@/domain/interfaces/ILLMService'

interface ApplyResult {
  success: boolean
  itineraryId?: string
  skippedPlaces?: string[]
  error?: string
  existingId?: string
}

export function useApplyItinerary(projectId: string) {
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplyResult | null>(null)
  const { mutate } = useSWRConfig()

  const applyItinerary = useCallback(
    async (preview: ItineraryPreviewData, overwrite = false): Promise<ApplyResult> => {
      setIsApplying(true)
      setError(null)
      setResult(null)

      try {
        const url = `/api/projects/${projectId}/chat/apply-itinerary${overwrite ? '?overwrite=true' : ''}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preview }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409 && data.error === 'ITINERARY_EXISTS') {
            const existsResult: ApplyResult = {
              success: false,
              error: 'ITINERARY_EXISTS',
              existingId: data.existingId,
            }
            setResult(existsResult)
            return existsResult
          }

          const errorResult: ApplyResult = {
            success: false,
            error: data.error || '일정 적용 중 오류가 발생했습니다.',
          }
          setError(errorResult.error!)
          setResult(errorResult)
          return errorResult
        }

        const successResult: ApplyResult = {
          success: true,
          itineraryId: data.itineraryId,
          skippedPlaces: data.skippedPlaces,
        }
        setResult(successResult)

        // Revalidate itinerary data
        await mutate(`/projects/${projectId}/itinerary`)

        return successResult
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '일정 적용 중 오류가 발생했습니다.'
        setError(errorMsg)
        const errorResult: ApplyResult = { success: false, error: errorMsg }
        setResult(errorResult)
        return errorResult
      } finally {
        setIsApplying(false)
      }
    },
    [projectId, mutate]
  )

  return {
    applyItinerary,
    isApplying,
    error,
    result,
  }
}
