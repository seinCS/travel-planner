/**
 * Chat Stream Hook
 *
 * Hook for handling SSE streaming chat responses.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { StreamChunk, RecommendedPlace } from '@/domain/interfaces/ILLMService'
import { useSWRConfig } from 'swr'
import { cleanChatResponse } from '@/lib/utils'

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

// HTTP status codes that should NOT be retried
// 4xx errors (except 408, 429) are client errors that won't succeed on retry
const NON_RETRYABLE_STATUS_CODES = new Set([
  400, // Bad Request
  401, // Unauthorized
  403, // Forbidden
  404, // Not Found
  405, // Method Not Allowed
  409, // Conflict
  422, // Unprocessable Entity
])

// HTTP status codes that SHOULD be retried
const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
])

interface SendMessageOptions {
  isRetry?: boolean
  messageId?: string
}

export function useChatStream(projectId: string) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingPlaces, setStreamingPlaces] = useState<RecommendedPlace[]>([])
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
      setStreamingContent('')
      setStreamingPlaces([])
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
          const error = new Error(errorData.error?.message || '오류가 발생했습니다.')
          // Attach status code to error for retry logic
          ;(error as Error & { statusCode?: number }).statusCode = response.status
          throw error
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
                } else if (chunk.type === 'error') {
                  setError(chunk.content || '오류가 발생했습니다.')
                  setLastFailedMessage(message)
                } else if (chunk.type === 'done') {
                  // Refresh chat history
                  await mutate(`/api/projects/${projectId}/chat/history`)
                  // Refresh usage
                  await mutate('/api/chat/usage')
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
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        // Check if error has a status code and determine retryability
        const statusCode = (err as Error & { statusCode?: number }).statusCode
        const isRetryable = statusCode
          ? RETRYABLE_STATUS_CODES.has(statusCode) || !NON_RETRYABLE_STATUS_CODES.has(statusCode)
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
  }, [])

  const retry = useCallback(() => {
    if (lastFailedMessage) {
      sendMessage(lastFailedMessage, { isRetry: true })
    }
  }, [lastFailedMessage, sendMessage])

  const reset = useCallback(() => {
    setStreamingContent('')
    setStreamingPlaces([])
    setError(null)
    setLastFailedMessage(null)
  }, [])

  return {
    sendMessage,
    abort,
    retry,
    reset,
    isStreaming,
    streamingContent,
    streamingPlaces,
    error,
    lastFailedMessage,
  }
}
