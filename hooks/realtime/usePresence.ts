/**
 * usePresence Hook
 *
 * Real-time presence tracking hook for showing online collaborators.
 * Uses Supabase Realtime presence feature to track who is currently
 * viewing a project.
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ProjectRealtimeClient } from '@/infrastructure/services/realtime'
import type { PresenceState } from '@/types/realtime'

export function usePresence(projectId: string | null) {
  const { data: session } = useSession()
  const [members, setMembers] = useState<PresenceState[]>([])
  const [client, setClient] = useState<ProjectRealtimeClient | null>(null)

  useEffect(() => {
    if (!projectId || !session?.user) return

    const realtimeClient = new ProjectRealtimeClient(projectId)

    // Presence 상태 변경 리스너
    realtimeClient.onPresence((presenceMembers) => {
      setMembers(presenceMembers)
    })

    // 현재 사용자 Presence 등록
    const userPresence = {
      id: session.user.id,
      name: session.user.name || 'Anonymous',
      email: session.user.email || '',
      image: session.user.image || null,
    }

    realtimeClient.trackPresence(userPresence)
    realtimeClient.subscribe()
    setClient(realtimeClient)

    return () => {
      // Fire-and-forget cleanup with error handling
      realtimeClient.unsubscribe().catch((error) => {
        console.warn('[usePresence] Cleanup error (safe to ignore):', error)
      })
      setClient(null)
      setMembers([])
    }
  }, [projectId, session?.user])

  return {
    members,
    currentUserId: session?.user?.id,
    isConnected: !!client,
  }
}
