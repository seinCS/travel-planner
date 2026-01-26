'use client'

/**
 * RealtimeContext
 *
 * Provides a single ProjectRealtimeClient instance per project.
 * Eliminates duplicate subscriptions from useRealtimeSync and usePresence.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

export function RealtimeProvider({ projectId, children }: RealtimeProviderProps) {
  const { data: session } = useSession()
  const [client, setClient] = useState<ProjectRealtimeClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          setClient(realtimeClient)
          setIsConnected(true)
          setError(null)
        } else {
          // 마운트 해제 중이면 정리
          await realtimeClient.unsubscribe()
        }
      } catch (err) {
        console.error('[RealtimeProvider] Subscribe failed:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setIsConnected(false)
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
      setClient(null)
      setIsConnected(false)
    }
  }, [projectId, session?.user])

  return (
    <RealtimeContext.Provider value={{ client, isConnected, error }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeClient() {
  return useContext(RealtimeContext)
}
