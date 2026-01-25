/**
 * useRealtimeSync Hook
 *
 * SWR cache invalidation hook for real-time collaboration.
 * Listens to realtime events from Supabase and invalidates
 * relevant SWR cache entries when other users make changes.
 */

import { useEffect, useCallback, useState } from 'react'
import { useSWRConfig } from 'swr'
import { useSession } from 'next-auth/react'
import { ProjectRealtimeClient } from '@/infrastructure/services/realtime'
import type { RealtimeEvent, RealtimeEventType } from '@/types/realtime'

export function useRealtimeSync(projectId: string | null) {
  const { mutate } = useSWRConfig()
  const { data: session } = useSession()
  const [client, setClient] = useState<ProjectRealtimeClient | null>(null)

  useEffect(() => {
    if (!projectId || !session?.user) return

    const realtimeClient = new ProjectRealtimeClient(projectId)

    realtimeClient.onSync((event: RealtimeEvent) => {
      // 자신이 보낸 이벤트는 무시 (이미 로컬에서 처리됨)
      if (event.userId === session.user.id) return

      // 이벤트 타입별 캐시 무효화
      switch (event.type) {
        case 'itinerary:created':
        case 'itinerary:updated':
        case 'itinerary:deleted':
        case 'item:created':
        case 'item:updated':
        case 'item:deleted':
        case 'items:reordered':
        case 'flight:created':
        case 'flight:updated':
        case 'flight:deleted':
        case 'accommodation:created':
        case 'accommodation:updated':
        case 'accommodation:deleted':
          mutate(`/api/projects/${projectId}/itinerary`)
          break

        case 'place:created':
        case 'place:updated':
        case 'place:deleted':
          mutate(`/api/projects/${projectId}/places`)
          break

        case 'member:joined':
        case 'member:left':
        case 'member:updated':
          mutate(`/api/projects/${projectId}/members`)
          break
      }
    })

    realtimeClient.subscribe()
    setClient(realtimeClient)

    return () => {
      realtimeClient.unsubscribe()
      setClient(null)
    }
  }, [projectId, session?.user, mutate])

  const broadcast = useCallback(
    (type: RealtimeEventType, payload: Record<string, unknown> = {}) => {
      if (!client || !session?.user?.id) return

      client.broadcast({
        type,
        payload,
        userId: session.user.id,
        timestamp: Date.now(),
      })
    },
    [client, session?.user?.id]
  )

  return { broadcast, isConnected: !!client }
}
