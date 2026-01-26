/**
 * Chat API Route
 *
 * POST /api/projects/[id]/chat - Send a chat message and receive streaming response
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProjectAccess } from '@/lib/project-auth'
import { isChatbotEnabled } from '@/lib/feature-flags'
import { SendMessageUseCase } from '@/application/use-cases/chat/SendMessageUseCase'
import { chatRepository } from '@/infrastructure/repositories/PrismaChatRepository'
import { usageRepository } from '@/infrastructure/repositories/PrismaUsageRepository'
import { geminiService } from '@/infrastructure/services/gemini/GeminiService'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createChatError, CHAT_ERRORS } from '@/lib/constants/chat-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel Pro: 최대 60초

interface ChatRequestBody {
  message: string
  messageId?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // 1. Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json(createChatError('UNAUTHORIZED'), { status: 401 })
    }

    const userId = session.user.id

    // 2. Feature flag check
    if (!isChatbotEnabled(userId)) {
      return Response.json(
        { error: { code: 'FEATURE_DISABLED', message: '챗봇 기능이 비활성화되어 있습니다.' } },
        { status: 403 }
      )
    }

    // 3. Project access check
    const accessResult = await checkProjectAccess(projectId, userId)
    if (!accessResult.hasAccess || !accessResult.project) {
      return Response.json(createChatError('NO_ACCESS'), { status: 403 })
    }

    // 4. Parse request body
    const body: ChatRequestBody = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return Response.json(createChatError('INVALID_REQUEST'), { status: 400 })
    }

    // 5. Get existing places for context (fail gracefully with empty array)
    let existingPlaces: Array<{ name: string; category: string }> = []
    try {
      existingPlaces = await prisma.place.findMany({
        where: { projectId },
        select: { name: true, category: true },
      })
    } catch (dbError) {
      logger.warn('Failed to fetch existing places, continuing with empty list', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        projectId,
      })
      // Continue with empty array - not critical for chat functionality
    }

    // 6. Execute use case
    const useCase = new SendMessageUseCase(chatRepository, geminiService, usageRepository)

    const result = await useCase.execute({
      projectId,
      userId,
      message,
      destination: accessResult.project.destination,
      country: accessResult.project.country || undefined,
      existingPlaces,
    })

    if (!result.success || !result.stream) {
      return Response.json(
        { error: { code: 'CHAT_ERROR', message: result.error || CHAT_ERRORS.UNKNOWN_ERROR } },
        { status: 400 }
      )
    }

    // 7. Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream!) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        } catch (error) {
          logger.error('SSE stream error', {
            error: error instanceof Error ? error.message : String(error),
            projectId,
          })
          const errorData = `data: ${JSON.stringify({ type: 'error', content: CHAT_ERRORS.STREAM_ERROR })}\n\n`
          controller.enqueue(encoder.encode(errorData))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    logger.error('Chat API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(createChatError('UNKNOWN_ERROR'), { status: 500 })
  }
}
