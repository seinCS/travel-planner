/**
 * Usage Limit Service
 *
 * Service for managing chat usage limits.
 *
 * Timezone Handling
 * =================
 * This service uses KST (Korea Standard Time, UTC+9) for daily limit resets.
 *
 * Design decision:
 * - Primary user base is in Korea, so KST provides intuitive "daily" behavior
 * - Daily limits reset at midnight KST (00:00 KST = 15:00 UTC previous day)
 * - All timestamps are stored in UTC in the database for consistency
 *
 * For international expansion, consider:
 * - Storing user's timezone preference in user profile
 * - Using user's local timezone for reset calculations
 * - Or switching to UTC-based 24-hour rolling windows instead of fixed daily resets
 *
 * Current implementation is suitable for Korean-focused service.
 */

import { prisma } from '@/lib/db'
import type { IUsageRepository } from '@/domain/interfaces/IUsageRepository'
import { logger } from '@/lib/logger'

/** User's daily message limit */
const DAILY_LIMIT = 50
/** Messages per minute rate limit */
const MINUTE_LIMIT = 10
/** Global daily limit across all users (cost control) */
const GLOBAL_DAILY_LIMIT = 10000

export interface LimitCheckResult {
  allowed: boolean
  reason?: string
  remaining?: number
  resetsAt?: Date
}

export interface UsageInfo {
  used: number
  limit: number
  remaining: number
  resetsAt: Date
  minuteUsed: number
  minuteLimit: number
}

export class UsageLimitService {
  constructor(private readonly usageRepository: IUsageRepository) {}

  /**
   * Check if user is allowed to send a message
   */
  async checkLimit(userId: string): Promise<LimitCheckResult> {
    const now = new Date()

    // 1. Check global daily limit
    const globalUsage = await this.usageRepository.getGlobalUsageForDate(now)
    if (globalUsage >= GLOBAL_DAILY_LIMIT) {
      logger.warn('Global daily limit exceeded', { globalUsage })
      return {
        allowed: false,
        reason: '서비스 일일 한도를 초과했습니다. 내일 다시 이용해 주세요.',
      }
    }

    // 2. Check minute rate limit
    const minuteUsage = await this.checkMinuteLimit(userId)
    if (!minuteUsage.allowed) {
      return {
        allowed: false,
        reason: '잠시 후 다시 시도해 주세요. (분당 요청 제한)',
        resetsAt: new Date(Date.now() + 60000),
      }
    }

    // 3. Check user daily limit
    const usage = await this.usageRepository.getUsageForDate(userId, now)
    const currentCount = usage?.count || 0

    if (currentCount >= DAILY_LIMIT) {
      return {
        allowed: false,
        reason: '오늘 사용량을 초과했습니다. 내일 다시 이용해 주세요.',
        remaining: 0,
        resetsAt: this.getNextResetTime(),
      }
    }

    return {
      allowed: true,
      remaining: DAILY_LIMIT - currentCount,
      resetsAt: this.getNextResetTime(),
    }
  }

  /**
   * Check minute rate limit (10 messages per minute)
   */
  private async checkMinuteLimit(userId: string): Promise<{ allowed: boolean; count: number }> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

    const recentCount = await prisma.chatMessage.count({
      where: {
        session: { userId },
        role: 'user',
        createdAt: { gte: oneMinuteAgo },
      },
    })

    return {
      allowed: recentCount < MINUTE_LIMIT,
      count: recentCount,
    }
  }

  /**
   * Get usage information for display
   */
  async getUsageInfo(userId: string): Promise<UsageInfo> {
    const usage = await this.usageRepository.getUsageForDate(userId, new Date())
    const used = usage?.count || 0
    const minuteUsage = await this.checkMinuteLimit(userId)

    return {
      used,
      limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - used),
      resetsAt: this.getNextResetTime(),
      minuteUsed: minuteUsage.count,
      minuteLimit: MINUTE_LIMIT,
    }
  }

  /**
   * Record usage after sending a message
   */
  async recordUsage(userId: string): Promise<void> {
    await this.usageRepository.incrementUsage(userId)
  }

  /**
   * Get the next reset time (midnight KST)
   */
  private getNextResetTime(): Date {
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000 // UTC+9
    const kstNow = new Date(now.getTime() + kstOffset)

    const nextMidnight = new Date(kstNow)
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)

    return new Date(nextMidnight.getTime() - kstOffset)
  }
}
