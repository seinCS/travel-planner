/**
 * Chat Usage Hook
 *
 * SWR-based hook for fetching chat usage information.
 */

import useSWR from 'swr'

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  resetsAt: string
  minuteUsed: number
  minuteLimit: number
}

interface ChatUsageResponse {
  enabled: boolean
  usage: UsageInfo
}

const fetcher = async (url: string): Promise<ChatUsageResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || 'Failed to fetch usage')
  }
  return res.json()
}

export function useChatUsage() {
  const { data, error, isLoading, mutate } = useSWR<ChatUsageResponse>(
    '/api/chat/usage',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    enabled: data?.enabled ?? false,
    usage: data?.usage,
    isLoading,
    error,
    refresh: mutate,
  }
}
