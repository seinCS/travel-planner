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
   */
  constructor(projectId: string) {
    this.projectId = projectId

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  /**
   * Subscribe to the project channel for real-time updates
   */
  async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      console.warn('[RealtimeClient] Already subscribed to channel')
      return
    }

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
          if (this.currentUser) {
            await this.trackPresenceInternal()
          }
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[RealtimeClient] Channel subscription error')
          this.isSubscribed = false
          reject(new Error('Channel subscription error'))
        } else if (status === 'TIMED_OUT') {
          console.error('[RealtimeClient] Channel subscription timed out')
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
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.channel.untrack()
      await this.supabase.removeChannel(this.channel)
      this.channel = null
    }

    this.isSubscribed = false
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
   */
  getPresenceList(): PresenceState[] {
    if (!this.channel) return []

    const presenceState = this.channel.presenceState()
    const presences: PresenceState[] = []

    Object.values(presenceState).forEach((presenceList) => {
      presenceList.forEach((presence) => {
        presences.push(presence as unknown as PresenceState)
      })
    })

    return presences
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
 */
export function createProjectRealtimeClient(projectId: string): ProjectRealtimeClient {
  return new ProjectRealtimeClient(projectId)
}
