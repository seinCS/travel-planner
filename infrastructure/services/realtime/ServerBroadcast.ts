/**
 * Server-side Realtime Broadcast Utility
 *
 * Enables API routes to broadcast realtime events to all connected clients.
 * Uses Supabase service role key for server-side access.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { RealtimeEvent, RealtimeEventType } from '@/types/realtime'

let serverSupabase: SupabaseClient | null = null

/**
 * Get or create the server-side Supabase client
 */
function getServerSupabase(): SupabaseClient {
  if (serverSupabase) {
    return serverSupabase
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  serverSupabase = createClient(supabaseUrl, supabaseServiceKey)
  return serverSupabase
}

/**
 * Broadcast a realtime event to all clients subscribed to a project channel
 *
 * @param projectId - The project ID to broadcast to
 * @param type - The event type
 * @param payload - The event payload data
 * @param userId - The user ID who triggered the event
 */
export async function broadcastToProject(
  projectId: string,
  type: RealtimeEventType,
  payload: Record<string, unknown>,
  userId: string
): Promise<void> {
  try {
    const supabase = getServerSupabase()
    const channelName = `project:${projectId}`

    const event: RealtimeEvent = {
      type,
      payload,
      userId,
      timestamp: Date.now(),
    }

    const channel = supabase.channel(channelName)

    await channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event,
    })

    // Clean up the channel after sending
    await supabase.removeChannel(channel)

    console.log(`[ServerBroadcast] Sent ${type} to ${channelName}`)
  } catch (error) {
    // Log but don't throw - broadcasting is non-critical
    console.error('[ServerBroadcast] Failed to broadcast:', error)
  }
}

/**
 * Helper functions for common broadcast events
 */
export const realtimeBroadcast = {
  // Item events
  itemCreated: (projectId: string, item: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'item:created', { item }, userId),

  itemUpdated: (projectId: string, item: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'item:updated', { item }, userId),

  itemDeleted: (projectId: string, itemId: string, userId: string) =>
    broadcastToProject(projectId, 'item:deleted', { itemId }, userId),

  itemsReordered: (projectId: string, dayId: string, items: Record<string, unknown>[], userId: string) =>
    broadcastToProject(projectId, 'items:reordered', { dayId, items }, userId),

  // Place events
  placeCreated: (projectId: string, place: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'place:created', { place }, userId),

  placeUpdated: (projectId: string, place: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'place:updated', { place }, userId),

  placeDeleted: (projectId: string, placeId: string, userId: string) =>
    broadcastToProject(projectId, 'place:deleted', { placeId }, userId),

  // Flight events
  flightCreated: (projectId: string, flight: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'flight:created', { flight }, userId),

  flightUpdated: (projectId: string, flight: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'flight:updated', { flight }, userId),

  flightDeleted: (projectId: string, flightId: string, userId: string) =>
    broadcastToProject(projectId, 'flight:deleted', { flightId }, userId),

  // Accommodation events
  accommodationCreated: (projectId: string, accommodation: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'accommodation:created', { accommodation }, userId),

  accommodationUpdated: (projectId: string, accommodation: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'accommodation:updated', { accommodation }, userId),

  accommodationDeleted: (projectId: string, accommodationId: string, userId: string) =>
    broadcastToProject(projectId, 'accommodation:deleted', { accommodationId }, userId),

  // Member events
  memberJoined: (projectId: string, member: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'member:joined', { member }, userId),

  memberLeft: (projectId: string, memberId: string, userId: string) =>
    broadcastToProject(projectId, 'member:left', { memberId }, userId),

  memberUpdated: (projectId: string, member: Record<string, unknown>, userId: string) =>
    broadcastToProject(projectId, 'member:updated', { member }, userId),
}
