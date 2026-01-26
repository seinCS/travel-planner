/**
 * Prisma Chat Repository
 *
 * Implementation of IChatRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type { ChatSession, ChatMessage } from '@prisma/client'
import type {
  IChatRepository,
  CreateSessionData,
  CreateMessageData,
} from '@/domain/interfaces/IChatRepository'

class PrismaChatRepository implements IChatRepository {
  async findOrCreateSession(data: CreateSessionData): Promise<ChatSession> {
    const existing = await prisma.chatSession.findUnique({
      where: {
        projectId_userId: {
          projectId: data.projectId,
          userId: data.userId,
        },
      },
    })

    if (existing) {
      return existing
    }

    return prisma.chatSession.create({
      data: {
        projectId: data.projectId,
        userId: data.userId,
      },
    })
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return prisma.chatSession.findUnique({
      where: { id: sessionId },
    })
  }

  async getSessionByProjectAndUser(
    projectId: string,
    userId: string
  ): Promise<ChatSession | null> {
    return prisma.chatSession.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    })
  }

  async createMessage(data: CreateMessageData): Promise<ChatMessage> {
    return prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        places: data.places ? JSON.parse(JSON.stringify(data.places)) : undefined,
      },
    })
  }

  async getMessages(
    sessionId: string,
    options?: { limit?: number; before?: Date }
  ): Promise<ChatMessage[]> {
    const { limit = 50, before } = options || {}

    return prisma.chatMessage.findMany({
      where: {
        sessionId,
        ...(before && { createdAt: { lt: before } }),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  async getRecentMessages(sessionId: string, limit = 10): Promise<ChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Return in chronological order
    return messages.reverse()
  }

  async clearSession(sessionId: string): Promise<void> {
    await prisma.chatMessage.deleteMany({
      where: { sessionId },
    })
  }

  async countUserMessagesInWindow(userId: string, windowMs: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowMs)

    return prisma.chatMessage.count({
      where: {
        session: { userId },
        role: 'user',
        createdAt: { gte: windowStart },
      },
    })
  }
}

export const chatRepository = new PrismaChatRepository()
