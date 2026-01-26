/**
 * Realtime Client for Project Collaboration
 *
 * Supabase Realtime-based client for real-time collaboration features.
 * Handles event broadcasting, syncing, and presence tracking.
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import {
  RealtimeEvent,
  PresenceState,
  PresenceCallback,
  SyncCallback,
  UserInfo,
} from '@/types/realtime'

/**
 * Retry configuration for subscription
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  /** Jitter factor (0-1) to prevent thundering herd */
  jitterFactor: 0.3,
}

/**
 * Error types that are safe to retry
 * - CHANNEL_ERROR: Temporary channel issues
 * - TIMED_OUT: Network timeouts
 * - Network errors: Connection issues
 *
 * Non-retryable errors:
 * - Authentication errors (401, 403)
 * - Invalid configuration
 * - Resource not found (404)
 */
const RETRYABLE_ERROR_PATTERNS = [
  'channel_error',
  'timed_out',
  'timeout',
  'network',
  'connection',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
]

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase()
  return RETRYABLE_ERROR_PATTERNS.some(pattern =>
    errorMessage.includes(pattern.toLowerCase())
  )
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number): number {
  const baseDelay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs
  )
  // Add jitter to prevent thundering herd
  const jitter = baseDelay * RETRY_CONFIG.jitterFactor * Math.random()
  return Math.floor(baseDelay + jitter)
}

/**
 * Type guard for PresenceState validation
 * Validates that an unknown object conforms to PresenceState interface
 */
function isPresenceState(obj: unknown): obj is PresenceState {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const presence = obj as Record<string, unknown>

  return (
    typeof presence.id === 'string' &&
    typeof presence.name === 'string' &&
    typeof presence.email === 'string' &&
    (presence.image === null || typeof presence.image === 'string') &&
    typeof presence.onlineAt === 'string'
  )
}

/**
 * Get and validate Supabase credentials from environment
 * @throws Error if credentials are not configured
 */
function getSupabaseCredentials(): { url: string; anonKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }

  return { url: supabaseUrl, anonKey: supabaseAnonKey }
}

/**
 * ProjectRealtimeClient
 *
 * Manages real-time collaboration for a specific project.
 * Provides event broadcasting, syncing, and presence tracking.
 */
export class ProjectRealtimeClient {
  private supabase: SupabaseClient
  private channel: RealtimeChannel | null = null
  private projectId: string
  private syncCallbacks: Set<SyncCallback> = new Set()
  private presenceCallbacks: Set<PresenceCallback> = new Set()
  private currentUser: UserInfo | null = null
  private isSubscribed = false

  /**
   * Create a new ProjectRealtimeClient
   * @param projectId - The project ID to subscribe to
   * @throws Error if Supabase credentials are not configured
   */
  constructor(projectId: string) {
    this.projectId = projectId

    const { url, anonKey } = getSupabaseCredentials()

    this.supabase = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  /**
   * Subscribe to the project channel for real-time updates with retry logic
   *
   * Implements exponential backoff with jitter for retryable errors only.
   * Non-retryable errors (auth, config) will fail immediately.
   */
  async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      console.warn('[RealtimeClient] Already subscribed to channel')
      return
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        await this.subscribeOnce()
        return // 성공
      } catch (error) {
        lastError = error as Error

        // Check if error is retryable
        if (!isRetryableError(lastError)) {
          console.error('[RealtimeClient] Non-retryable error, failing immediately:', {
            projectId: this.projectId,
            error: lastError.message,
          })
          throw lastError
        }

        console.warn(`[RealtimeClient] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} failed:`, {
          projectId: this.projectId,
          error: lastError.message,
          retryable: true,
        })

        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          const delay = calculateRetryDelay(attempt)
          console.log(`[RealtimeClient] Retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    // 모든 재시도 실패
    console.error('[RealtimeClient] All retry attempts failed:', {
      projectId: this.projectId,
      error: lastError?.message,
      totalAttempts: RETRY_CONFIG.maxRetries,
    })
    throw lastError
  }

  /**
   * Internal method to perform a single subscription attempt
   */
  private async subscribeOnce(): Promise<void> {
    const channelName = `project:${this.projectId}`
    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Don't receive own broadcasts
        },
        presence: {
          key: this.currentUser?.id || 'anonymous',
        },
      },
    })

    // Set up broadcast listener for sync events
    this.channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      const event = payload as RealtimeEvent
      this.notifySyncCallbacks(event)
    })

    // Set up presence listeners
    this.channel.on('presence', { event: 'sync' }, () => {
      this.handlePresenceSync()
    })

    this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('[RealtimeClient] User joined:', newPresences)
      this.handlePresenceSync()
    })

    this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('[RealtimeClient] User left:', leftPresences)
      this.handlePresenceSync()
    })

    // Subscribe to the channel
    return new Promise<void>((resolve, reject) => {
      this.channel!.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeClient] Subscribed to channel:', channelName)
          this.isSubscribed = true

          // Track presence if user info is set
          // 에러 발생 시에도 구독은 성공으로 처리 (presence 실패가 구독을 막지 않도록)
          if (this.currentUser) {
            try {
              await this.trackPresenceInternal()
            } catch (error) {
              console.error('[RealtimeClient] Error tracking presence:', error)
              // Don't reject - presence tracking failure shouldn't block subscription
            }
          }
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[RealtimeClient] Channel subscription error:', {
            projectId: this.projectId,
            channelName,
          })
          this.isSubscribed = false
          reject(new Error('Channel subscription error'))
        } else if (status === 'TIMED_OUT') {
          console.error('[RealtimeClient] Channel subscription timed out:', {
            projectId: this.projectId,
            channelName,
          })
          this.isSubscribed = false
          reject(new Error('Channel subscription timed out'))
        }
      })
    })
  }

  /**
   * Broadcast an event to all subscribers
   */
  async broadcast(event: RealtimeEvent): Promise<void> {
    if (!this.channel || !this.isSubscribed) {
      console.warn('[RealtimeClient] Cannot broadcast: not subscribed')
      return
    }

    await this.channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event,
    })
  }

  /**
   * Register a callback for sync events
   *
   * Uses a Set internally to prevent duplicate callbacks.
   * Each call returns an unsubscribe function that removes the specific callback.
   *
   * Usage pattern (React):
   * ```
   * useEffect(() => {
   *   const unsubscribe = client.onSync(handleSync)
   *   return unsubscribe // Cleanup removes callback before re-adding on re-render
   * }, [client])
   * ```
   */
  onSync(callback: SyncCallback): () => void {
    this.syncCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.syncCallbacks.delete(callback)
    }
  }

  /**
   * Start tracking user presence
   */
  async trackPresence(userInfo: UserInfo): Promise<void> {
    this.currentUser = userInfo

    // If already subscribed, track presence immediately
    if (this.isSubscribed && this.channel) {
      await this.trackPresenceInternal()
    }
  }

  /**
   * Internal method to track presence
   */
  private async trackPresenceInternal(): Promise<void> {
    if (!this.channel || !this.currentUser) return

    const presenceState: PresenceState = {
      id: this.currentUser.id,
      name: this.currentUser.name,
      email: this.currentUser.email,
      image: this.currentUser.image,
      onlineAt: new Date().toISOString(),
    }

    await this.channel.track(presenceState)
  }

  /**
   * Register a callback for presence updates
   */
  onPresence(callback: PresenceCallback): () => void {
    this.presenceCallbacks.add(callback)

    // Immediately notify with current presence state
    if (this.channel) {
      const presences = this.getPresenceList()
      callback(presences)
    }

    // Return unsubscribe function
    return () => {
      this.presenceCallbacks.delete(callback)
    }
  }

  /**
   * Unsubscribe from the channel and clean up
   *
   * Safe to call multiple times - will only perform cleanup once.
   */
  async unsubscribe(): Promise<void> {
    // Prevent duplicate cleanup
    if (!this.isSubscribed && !this.channel) {
      return
    }

    // Mark as unsubscribed immediately to prevent race conditions
    this.isSubscribed = false

    const channelToClean = this.channel
    this.channel = null

    if (channelToClean) {
      try {
        await channelToClean.untrack()
      } catch (error) {
        console.warn('[RealtimeClient] Error during untrack:', error)
      }

      try {
        if (this.supabase) {
          await this.supabase.removeChannel(channelToClean)
        }
      } catch (error) {
        console.warn('[RealtimeClient] Error during removeChannel:', error)
      }
    }

    this.syncCallbacks.clear()
    this.presenceCallbacks.clear()
    this.currentUser = null

    console.log('[RealtimeClient] Unsubscribed from channel')
  }

  /**
   * Get the current subscription status
   */
  get subscribed(): boolean {
    return this.isSubscribed
  }

  /**
   * Get the current presence list
   *
   * Note: Supabase presence can have multiple entries for the same user
   * (e.g., multiple tabs/sessions). We deduplicate by user ID, keeping
   * the most recent entry (based on onlineAt timestamp).
   */
  getPresenceList(): PresenceState[] {
    if (!this.channel) return []

    const presenceState = this.channel.presenceState()
    const presenceMap = new Map<string, PresenceState>()

    Object.values(presenceState).forEach((presenceList) => {
      presenceList.forEach((presence) => {
        // Use type guard instead of unsafe type assertion
        if (isPresenceState(presence)) {
          const existing = presenceMap.get(presence.id)
          // Keep the most recent entry for each user
          if (!existing || presence.onlineAt > existing.onlineAt) {
            presenceMap.set(presence.id, presence)
          }
        } else {
          console.warn('[RealtimeClient] Invalid presence state:', presence)
        }
      })
    })

    return Array.from(presenceMap.values())
  }

  /**
   * Handle presence sync events
   */
  private handlePresenceSync(): void {
    const presences = this.getPresenceList()
    this.notifyPresenceCallbacks(presences)
  }

  /**
   * Notify all sync callbacks
   */
  private notifySyncCallbacks(event: RealtimeEvent): void {
    this.syncCallbacks.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        console.error('[RealtimeClient] Error in sync callback:', error)
      }
    })
  }

  /**
   * Notify all presence callbacks
   */
  private notifyPresenceCallbacks(presences: PresenceState[]): void {
    this.presenceCallbacks.forEach((callback) => {
      try {
        callback(presences)
      } catch (error) {
        console.error('[RealtimeClient] Error in presence callback:', error)
      }
    })
  }
}

/**
 * Create a new ProjectRealtimeClient instance
 *
 * Factory function for creating realtime clients.
 * @throws Error if Supabase credentials are not configured
 */
export function createProjectRealtimeClient(projectId: string): ProjectRealtimeClient {
  return new ProjectRealtimeClient(projectId)
}
