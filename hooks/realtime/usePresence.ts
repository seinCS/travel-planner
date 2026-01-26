/**
 * usePresence Hook
 *
 * Real-time presence tracking hook for showing online collaborators.
 * Uses Supabase Realtime presence feature to track who is currently
 * viewing a project.
 *
 * Uses shared RealtimeClient from RealtimeContext to avoid duplicate subscriptions.
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRealtimeClient } from '@/contexts/RealtimeContext'
import type { PresenceState } from '@/types/realtime'

export function usePresence(projectId: string | null) {
  const { data: session } = useSession()
  const { client, isConnected } = useRealtimeClient()
  const [members, setMembers] = useState<PresenceState[]>([])

  useEffect(() => {
    if (!client || !projectId) return

    // Presence 상태 변경 리스너 등록
    const unsubscribe = client.onPresence((presenceMembers) => {
      setMembers(presenceMembers)
    })

    return () => {
      unsubscribe()
      setMembers([])
    }
  }, [client, projectId])

  return {
    members,
    currentUserId: session?.user?.id,
    isConnected,
  }
}
