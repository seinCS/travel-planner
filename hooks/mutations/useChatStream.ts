/**
 * Chat Stream Hook
 *
 * Hook for handling SSE streaming chat responses.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { StreamChunk, RecommendedPlace, ToolCallChunk, ItineraryPreviewData } from '@/domain/interfaces/ILLMService'
import { useSWRConfig } from 'swr'
import { cleanChatResponse } from '@/lib/utils'
import { HttpError } from '@/lib/errors'

interface ReconnectionConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const RECONNECTION_CONFIG: ReconnectionConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
}

// HTTP status codes that SHOULD be retried
const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
])

/**
 * Check if an HTTP status code is retryable
 */
function isRetryableStatusCode(statusCode: number): boolean {
  return RETRYABLE_STATUS_CODES.has(statusCode)
}

interface SendMessageOptions {
  isRetry?: boolean
  messageId?: string
}

export function useChatStream(projectId: string) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingPlaces, setStreamingPlaces] = useState<RecommendedPlace[]>([])
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallChunk[]>([])
  const [streamingItineraryPreview, setStreamingItineraryPreview] = useState<ItineraryPreviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const retryCountRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { mutate } = useSWRConfig()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const sendMessage = useCallback(
    async (message: string, options?: SendMessageOptions): Promise<void> => {
      const { isRetry = false, messageId } = options || {}

      if (!isRetry) {
        retryCountRef.current = 0
        setLastFailedMessage(null)
      }

      // Abort any previous request before starting a new one (prevents memory leaks)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      setIsStreaming(true)
      setIsCancelled(false)
      setStreamingContent('')
      setStreamingPlaces([])
      setStreamingToolCalls([])
      setStreamingItineraryPreview(null)
      setError(null)

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch(`/api/projects/${projectId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            messageId: messageId || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          // Use HttpError for type-safe status code handling
          throw new HttpError(
            errorData.error?.message || '오류가 발생했습니다.',
            response.status,
            isRetryableStatusCode(response.status)
          )
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('스트림을 읽을 수 없습니다.')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const chunk: StreamChunk = JSON.parse(line.slice(6))

                if (chunk.type === 'text' && chunk.content) {
                  setStreamingContent((prev) => prev + chunk.content)
                } else if (chunk.type === 'place' && chunk.place) {
                  // De-duplicate places by name to prevent duplicate cards
                  setStreamingPlaces((prev) => {
                    const newPlace = chunk.place!
                    const isDuplicate = prev.some(
                      (p) => p.name === newPlace.name
                    )
                    return isDuplicate ? prev : [...prev, newPlace]
                  })
                } else if (chunk.type === 'tool_call' && chunk.toolCall) {
                  setStreamingToolCalls((prev) => {
                    const existing = prev.findIndex(t => t.id === chunk.toolCall!.id)
                    if (existing >= 0) {
                      const updated = [...prev]
                      updated[existing] = chunk.toolCall!
                      return updated
                    }
                    return [...prev, chunk.toolCall!]
                  })
                } else if (chunk.type === 'itinerary_preview' && chunk.itineraryPreview) {
                  setStreamingItineraryPreview(chunk.itineraryPreview)
                } else if (chunk.type === 'error') {
                  setError(chunk.content || '오류가 발생했습니다.')
                  setLastFailedMessage(message)
                } else if (chunk.type === 'done') {
                  // Refresh chat history and usage in parallel
                  await Promise.all([
                    mutate(`/api/projects/${projectId}/chat/history`),
                    mutate('/api/chat/usage'),
                  ])
                  retryCountRef.current = 0
                  setLastFailedMessage(null)
                }
              } catch {
                // JSON parsing failed, ignore
              }
            }
          }
        }
      } catch (err) {
        // Handle user cancellation explicitly
        if (err instanceof Error && err.name === 'AbortError') {
          setIsCancelled(true)
          return
        }

        // Determine retryability using HttpError or fallback
        const isRetryable = HttpError.isHttpError(err)
          ? err.isRetryable
          : true // Network errors without status codes are retryable

        // Retry logic with exponential backoff (only for retryable errors)
        if (isRetryable && retryCountRef.current < RECONNECTION_CONFIG.maxRetries) {
          const delay = Math.min(
            RECONNECTION_CONFIG.baseDelayMs * Math.pow(2, retryCountRef.current),
            RECONNECTION_CONFIG.maxDelayMs
          )
          retryCountRef.current++

          await new Promise((r) => setTimeout(r, delay))
          return sendMessage(message, { isRetry: true, messageId })
        }

        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
        setLastFailedMessage(message)
      } finally {
        setIsStreaming(false)
      }
    },
    [projectId, mutate]
  )

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setIsCancelled(true)
  }, [])

  const retry = useCallback(() => {
    if (lastFailedMessage) {
      sendMessage(lastFailedMessage, { isRetry: true })
    }
  }, [lastFailedMessage, sendMessage])

  const reset = useCallback(() => {
    setStreamingContent('')
    setStreamingPlaces([])
    setStreamingToolCalls([])
    setStreamingItineraryPreview(null)
    setError(null)
    setLastFailedMessage(null)
    setIsCancelled(false)
  }, [])

  return {
    sendMessage,
    abort,
    retry,
    reset,
    isStreaming,
    isCancelled,
    streamingContent,
    streamingPlaces,
    streamingToolCalls,
    streamingItineraryPreview,
    error,
    lastFailedMessage,
  }
}
