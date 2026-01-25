/**
 * Realtime Types
 *
 * Type definitions for real-time collaboration features using Supabase Realtime.
 */

// ========================================
// Realtime Event Types
// ========================================

/**
 * All possible realtime event types for collaboration
 */
export type RealtimeEventType =
  // Itinerary events
  | 'itinerary:created'
  | 'itinerary:updated'
  | 'itinerary:deleted'
  // Itinerary item events
  | 'item:created'
  | 'item:updated'
  | 'item:deleted'
  | 'items:reordered'
  // Flight events
  | 'flight:created'
  | 'flight:updated'
  | 'flight:deleted'
  // Accommodation events
  | 'accommodation:created'
  | 'accommodation:updated'
  | 'accommodation:deleted'
  // Place events
  | 'place:created'
  | 'place:updated'
  | 'place:deleted'
  // Member events
  | 'member:joined'
  | 'member:left'
  | 'member:updated'

/**
 * Realtime event payload structure
 */
export interface RealtimeEvent {
  type: RealtimeEventType
  payload: Record<string, unknown>
  userId: string
  timestamp: number
}

// ========================================
// Presence Types
// ========================================

/**
 * User presence state for tracking online collaborators
 */
export interface PresenceState {
  id: string
  name: string
  email: string
  image: string | null
  onlineAt: string
}

/**
 * Presence callback type for handling presence updates
 */
export type PresenceCallback = (presences: PresenceState[]) => void

/**
 * Sync callback type for handling realtime events
 */
export type SyncCallback = (event: RealtimeEvent) => void

// ========================================
// Realtime Client Types
// ========================================

/**
 * User info required for presence tracking
 */
export interface UserInfo {
  id: string
  name: string
  email: string
  image: string | null
}
