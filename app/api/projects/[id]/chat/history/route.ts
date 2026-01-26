/**
 * Chat History API Route
 *
 * GET /api/projects/[id]/chat/history - Get chat history
 * DELETE /api/projects/[id]/chat/history - Clear chat history
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProjectAccess } from '@/lib/project-auth'
import { isChatbotEnabled } from '@/lib/feature-flags'
import { chatRepository } from '@/infrastructure/repositories/PrismaChatRepository'
import { logger } from '@/lib/logger'
import { createChatError } from '@/lib/constants/chat-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET - Retrieve chat history
 */
export async function GET(
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
    if (!accessResult.hasAccess) {
      return Response.json(createChatError('NO_ACCESS'), { status: 403 })
    }

    // 4. Get chat session
    const chatSession = await chatRepository.getSessionByProjectAndUser(projectId, userId)
    if (!chatSession) {
      return Response.json({ messages: [] })
    }

    // 5. Get messages with pagination
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const before = searchParams.get('before')

    const messages = await chatRepository.getMessages(chatSession.id, {
      limit,
      before: before ? new Date(before) : undefined,
    })

    // Transform messages for frontend
    const transformedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      places: msg.places || [],
      createdAt: msg.createdAt.toISOString(),
    }))

    return Response.json({
      messages: transformedMessages,
      sessionId: chatSession.id,
    })
  } catch (error) {
    logger.error('Chat history API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(createChatError('UNKNOWN_ERROR'), { status: 500 })
  }
}

/**
 * DELETE - Clear chat history
 */
export async function DELETE(
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

    // 2. Project access check
    const accessResult = await checkProjectAccess(projectId, userId)
    if (!accessResult.hasAccess) {
      return Response.json(createChatError('NO_ACCESS'), { status: 403 })
    }

    // 3. Get chat session
    const chatSession = await chatRepository.getSessionByProjectAndUser(projectId, userId)
    if (!chatSession) {
      return Response.json({ success: true, message: '삭제할 대화가 없습니다.' })
    }

    // 4. Clear messages
    await chatRepository.clearSession(chatSession.id)

    logger.chat('history_cleared', { sessionId: chatSession.id, userId })

    return Response.json({ success: true, message: '대화 내용이 삭제되었습니다.' })
  } catch (error) {
    logger.error('Clear chat history API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(createChatError('UNKNOWN_ERROR'), { status: 500 })
  }
}
