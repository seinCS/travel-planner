/**
 * Chat Usage API Route
 *
 * GET /api/chat/usage - Get current user's chat usage information
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isChatbotEnabled } from '@/lib/feature-flags'
import { UsageLimitService } from '@/application/services/UsageLimitService'
import { usageRepository } from '@/infrastructure/repositories/PrismaUsageRepository'
import { logger } from '@/lib/logger'
import { createChatError } from '@/lib/constants/chat-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json(createChatError('UNAUTHORIZED'), { status: 401 })
    }

    const userId = session.user.id

    // 2. Feature flag check
    const enabled = isChatbotEnabled(userId)

    // 3. Get usage info
    const usageService = new UsageLimitService(usageRepository)
    const usageInfo = await usageService.getUsageInfo(userId)

    return Response.json({
      enabled,
      usage: {
        used: usageInfo.used,
        limit: usageInfo.limit,
        remaining: usageInfo.remaining,
        resetsAt: usageInfo.resetsAt.toISOString(),
        minuteUsed: usageInfo.minuteUsed,
        minuteLimit: usageInfo.minuteLimit,
      },
    })
  } catch (error) {
    logger.error('Chat usage API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(createChatError('UNKNOWN_ERROR'), { status: 500 })
  }
}
