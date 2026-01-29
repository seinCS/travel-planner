/**
 * Usage Repository Interface
 *
 * Defines the contract for tracking chat usage for rate limiting.
 */

import type { ChatUsage } from '@prisma/client'

export interface IUsageRepository {
  /**
   * Get usage record for a user on a specific date
   */
  getUsageForDate(userId: string, date: Date): Promise<ChatUsage | null>

  /**
   * Increment usage count for a user
   */
  incrementUsage(userId: string): Promise<ChatUsage>

  /**
   * Get global usage count for a specific date
   */
  getGlobalUsageForDate(date: Date): Promise<number>

  /**
   * Get usage statistics for a user (for display)
   */
  getUserUsageStats(userId: string): Promise<{
    today: number
    thisWeek: number
    thisMonth: number
  }>

  /**
   * Count recent user messages within a time window (for rate limiting)
   */
  countRecentUserMessages(userId: string, since: Date): Promise<number>
}
