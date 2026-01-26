/**
 * Chat History Hook
 *
 * SWR-based hook for fetching and managing chat history.
 */

import useSWR from 'swr'
import type { RecommendedPlace } from '@/domain/interfaces/ILLMService'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  places: RecommendedPlace[]
  createdAt: string
}

interface ChatHistoryResponse {
  messages: ChatMessage[]
  sessionId?: string
}

const fetcher = async (url: string): Promise<ChatHistoryResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch chat history')
  }
  return res.json()
}

export function useChatHistory(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<ChatHistoryResponse>(
    projectId ? `/api/projects/${projectId}/chat/history` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    }
  )

  const clearHistory = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat/history`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to clear history')
      }
      // Clear local data
      await mutate({ messages: [], sessionId: data?.sessionId }, false)
    } catch (err) {
      console.error('Error clearing chat history:', err)
      throw err
    }
  }

  return {
    messages: data?.messages || [],
    sessionId: data?.sessionId,
    isLoading,
    error,
    mutate,
    clearHistory,
  }
}
