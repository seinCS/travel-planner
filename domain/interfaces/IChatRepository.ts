/**
 * Chat Repository Interface
 *
 * Defines the contract for chat session and message persistence.
 */

import type { ChatSession, ChatMessage } from '@prisma/client'

export interface CreateSessionData {
  projectId: string
  userId: string
}

export interface CreateMessageData {
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  places?: RecommendedPlaceData[]
}

export interface RecommendedPlaceData {
  name: string
  name_en?: string
  address?: string
  category: string
  description?: string
  latitude?: number
  longitude?: number
}

export interface IChatRepository {
  /**
   * Find or create a chat session for a project and user
   */
  findOrCreateSession(data: CreateSessionData): Promise<ChatSession>

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Promise<ChatSession | null>

  /**
   * Get session by project and user
   */
  getSessionByProjectAndUser(projectId: string, userId: string): Promise<ChatSession | null>

  /**
   * Create a new message in a session
   */
  createMessage(data: CreateMessageData): Promise<ChatMessage>

  /**
   * Get messages for a session (with pagination)
   */
  getMessages(sessionId: string, options?: {
    limit?: number
    before?: Date
  }): Promise<ChatMessage[]>

  /**
   * Get recent messages for context (last N messages)
   */
  getRecentMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>

  /**
   * Delete all messages in a session (clear history)
   */
  clearSession(sessionId: string): Promise<void>

  /**
   * Count user messages in a time window (for rate limiting)
   */
  countUserMessagesInWindow(userId: string, windowMs: number): Promise<number>
}
