'use client'

/**
 * useDistances Hook
 *
 * 일정 항목들 간의 거리/시간 정보를 가져오는 SWR 기반 훅
 */

import useSWR from 'swr'
import type { DistanceResponse, RouteItem } from '@/types/route'

interface UseDistancesOptions {
  enabled?: boolean
}

/**
 * 항목 배열의 해시 생성 (캐시 키용)
 * order, 좌표, itemType 정보를 기반으로 해시 생성
 */
function generateItemsHash(items: RouteItem[]): string {
  if (items.length < 2) return ''

  const sortedItems = [...items].sort((a, b) => a.order - b.order)
  return sortedItems
    .map((item) => `${item.id}:${item.order}:${item.itemType}:${item.latitude.toFixed(6)}:${item.longitude.toFixed(6)}`)
    .join('|')
}

async function fetchDistances(
  dayId: string,
  items: RouteItem[]
): Promise<DistanceResponse | null> {
  if (items.length < 2) {
    return null
  }

  const response = await fetch('/api/itinerary/distances', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dayId, items }),
  })

  if (!response.ok) {
    throw new Error('거리 정보를 가져오는데 실패했습니다')
  }

  return response.json()
}

export function useDistances(
  dayId: string | null,
  items: RouteItem[],
  options: UseDistancesOptions = {}
) {
  const { enabled = true } = options

  // items가 2개 이상일 때만 fetch
  const shouldFetch = enabled && dayId && items.length >= 2
  const itemsHash = generateItemsHash(items)

  // 캐시 키: dayId + items hash
  const cacheKey = shouldFetch ? `distances:${dayId}:${itemsHash}` : null

  const { data, error, isLoading, isValidating, mutate } = useSWR<DistanceResponse | null>(
    cacheKey,
    () => (dayId ? fetchDistances(dayId, items) : Promise.resolve(null)),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1분 캐싱
      revalidateIfStale: false,
    }
  )

  return {
    distances: data,
    segments: data?.segments ?? [],
    totalDistance: data?.totalDistance ?? null,
    totalDuration: data?.totalDuration ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
