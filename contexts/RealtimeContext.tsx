'use client'

/**
 * RealtimeContext
 *
 * Provides a single ProjectRealtimeClient instance per project.
 * Eliminates duplicate subscriptions from useRealtimeSync and usePresence.
 */

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { ProjectRealtimeClient } from '@/infrastructure/services/realtime'

interface RealtimeContextValue {
  client: ProjectRealtimeClient | null
  isConnected: boolean
  error: string | null
}

const RealtimeContext = createContext<RealtimeContextValue>({
  client: null,
  isConnected: false,
  error: null,
})

interface RealtimeProviderProps {
  projectId: string
  children: ReactNode
}

/**
 * Combined state to prevent multiple re-renders
 * When client, isConnected, and error change together, only one render occurs
 */
interface RealtimeState {
  client: ProjectRealtimeClient | null
  isConnected: boolean
  error: string | null
}

const INITIAL_STATE: RealtimeState = {
  client: null,
  isConnected: false,
  error: null,
}

export function RealtimeProvider({ projectId, children }: RealtimeProviderProps) {
  const { data: session } = useSession()
  // Combined state to reduce re-renders (single setState instead of 3)
  const [state, setState] = useState<RealtimeState>(INITIAL_STATE)

  useEffect(() => {
    if (!projectId || !session?.user) return

    let realtimeClient: ProjectRealtimeClient | null = null
    let isMounted = true

    const initializeClient = async () => {
      try {
        realtimeClient = new ProjectRealtimeClient(projectId)

        // 사용자 정보 설정 (구독 전에 설정해야 presence가 제대로 작동)
        realtimeClient.trackPresence({
          id: session.user.id,
          name: session.user.name || 'Anonymous',
          email: session.user.email || '',
          image: session.user.image || null,
        })

        // 구독 시작
        await realtimeClient.subscribe()

        if (isMounted) {
          // Single state update instead of 3 separate updates
          setState({
            client: realtimeClient,
            isConnected: true,
            error: null,
          })
        } else {
          // 마운트 해제 중이면 정리
          await realtimeClient.unsubscribe()
        }
      } catch (err) {
        console.error('[RealtimeProvider] Subscribe failed:', err)
        if (isMounted) {
          setState({
            client: null,
            isConnected: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }
    }

    initializeClient()

    return () => {
      isMounted = false
      if (realtimeClient) {
        realtimeClient.unsubscribe().catch((cleanupError) => {
          console.warn('[RealtimeProvider] Cleanup error (safe to ignore):', cleanupError)
        })
      }
      setState(INITIAL_STATE)
    }
  }, [projectId, session?.user])

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => state, [state])

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeClient() {
  return useContext(RealtimeContext)
}
