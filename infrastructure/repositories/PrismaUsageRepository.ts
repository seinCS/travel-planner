/**
 * Prisma Usage Repository
 *
 * Implementation of IUsageRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type { ChatUsage } from '@prisma/client'
import type { IUsageRepository } from '@/domain/interfaces/IUsageRepository'

/**
 * Get the start of the day in UTC
 */
function getDateOnly(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Get start of week (Sunday)
 */
function getStartOfWeek(date: Date): Date {
  const d = getDateOnly(date)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day)
  return d
}

/**
 * Get start of month
 */
function getStartOfMonth(date: Date): Date {
  const d = getDateOnly(date)
  d.setUTCDate(1)
  return d
}

class PrismaUsageRepository implements IUsageRepository {
  async getUsageForDate(userId: string, date: Date): Promise<ChatUsage | null> {
    const dateOnly = getDateOnly(date)

    return prisma.chatUsage.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateOnly,
        },
      },
    })
  }

  async incrementUsage(userId: string): Promise<ChatUsage> {
    const today = getDateOnly(new Date())

    return prisma.chatUsage.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId,
        date: today,
        count: 1,
      },
    })
  }

  async getGlobalUsageForDate(date: Date): Promise<number> {
    const dateOnly = getDateOnly(date)

    const result = await prisma.chatUsage.aggregate({
      where: {
        date: dateOnly,
      },
      _sum: {
        count: true,
      },
    })

    return result._sum.count || 0
  }

  async getUserUsageStats(userId: string): Promise<{
    today: number
    thisWeek: number
    thisMonth: number
  }> {
    const now = new Date()
    const today = getDateOnly(now)
    const startOfWeek = getStartOfWeek(now)
    const startOfMonth = getStartOfMonth(now)

    const [todayUsage, weekUsage, monthUsage] = await Promise.all([
      this.getUsageForDate(userId, today),
      prisma.chatUsage.aggregate({
        where: {
          userId,
          date: { gte: startOfWeek },
        },
        _sum: { count: true },
      }),
      prisma.chatUsage.aggregate({
        where: {
          userId,
          date: { gte: startOfMonth },
        },
        _sum: { count: true },
      }),
    ])

    return {
      today: todayUsage?.count || 0,
      thisWeek: weekUsage._sum.count || 0,
      thisMonth: monthUsage._sum.count || 0,
    }
  }

  async countRecentUserMessages(userId: string, since: Date): Promise<number> {
    return prisma.chatMessage.count({
      where: {
        session: { userId },
        role: 'user',
        createdAt: { gte: since },
      },
    })
  }
}

export const usageRepository = new PrismaUsageRepository()
