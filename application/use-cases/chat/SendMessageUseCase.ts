/**
 * Send Message Use Case
 *
 * Orchestrates the process of sending a chat message and receiving a response.
 */

import type { IChatRepository } from '@/domain/interfaces/IChatRepository'
import type { ILLMService, StreamChunk, RecommendedPlace } from '@/domain/interfaces/ILLMService'
import { promptInjectionFilter } from '@/application/services/PromptInjectionFilter'
import { UsageLimitService } from '@/application/services/UsageLimitService'
import { logger } from '@/lib/logger'
import type { IUsageRepository } from '@/domain/interfaces/IUsageRepository'

export interface SendMessageInput {
  projectId: string
  userId: string
  message: string
  destination: string
  country?: string
  existingPlaces: Array<{ name: string; category: string }>
}

export interface SendMessageResult {
  success: boolean
  error?: string
  stream?: AsyncGenerator<StreamChunk, void, unknown>
  sessionId?: string
}

export class SendMessageUseCase {
  private usageLimitService: UsageLimitService

  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly llmService: ILLMService,
    usageRepository: IUsageRepository
  ) {
    this.usageLimitService = new UsageLimitService(usageRepository)
  }

  async execute(input: SendMessageInput): Promise<SendMessageResult> {
    const { projectId, userId, message, destination, country, existingPlaces } = input

    // 1. Filter message for prompt injection
    const sanitizedMessage = promptInjectionFilter.sanitize(message)
    const filterResult = promptInjectionFilter.filter(sanitizedMessage)

    if (!filterResult.isClean) {
      logger.chat('prompt_injection_blocked', {
        userId,
        messageId: filterResult.matchedPattern,
      })
      return {
        success: false,
        error: filterResult.reason,
      }
    }

    // 2. Check usage limits
    const limitCheck = await this.usageLimitService.checkLimit(userId)
    if (!limitCheck.allowed) {
      logger.chat('rate_limit_exceeded', { userId })
      return {
        success: false,
        error: limitCheck.reason,
      }
    }

    // 3. Get or create chat session
    const session = await this.chatRepository.findOrCreateSession({
      projectId,
      userId,
    })

    // 4. Save user message
    await this.chatRepository.createMessage({
      sessionId: session.id,
      role: 'user',
      content: sanitizedMessage,
    })

    // 5. Record usage
    await this.usageLimitService.recordUsage(userId)

    // 6. Get conversation history for context
    const recentMessages = await this.chatRepository.getRecentMessages(session.id, 10)
    const conversationHistory = recentMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // 7. Create streaming response generator
    const chatRepo = this.chatRepository
    const llm = this.llmService
    async function* streamWithSave(): AsyncGenerator<StreamChunk, void, unknown> {
      let fullContent = ''
      const places: RecommendedPlace[] = []

      try {
        const stream = llm.streamChat(sanitizedMessage, {
          projectId,
          destination,
          country,
          existingPlaces,
          conversationHistory,
        })

        for await (const chunk of stream) {
          if (chunk.type === 'text' && chunk.content) {
            fullContent += chunk.content
          } else if (chunk.type === 'place' && chunk.place) {
            places.push(chunk.place)
          }

          yield chunk

          if (chunk.type === 'done') {
            // Save assistant message when streaming is complete
            if (fullContent || places.length > 0) {
              // De-duplicate places by name before saving to DB
              const uniquePlaces = Array.from(
                new Map(places.map(p => [p.name, p])).values()
              )
              await chatRepo.createMessage({
                sessionId: session.id,
                role: 'assistant',
                content: fullContent,
                places: uniquePlaces.length > 0 ? uniquePlaces : undefined,
              })
              logger.chat('message_saved', {
                sessionId: session.id,
                messageId: chunk.messageId,
              })
            }
          }
        }
      } catch (error) {
        logger.error('Stream error in SendMessageUseCase', {
          error: error instanceof Error ? error.message : String(error),
          sessionId: session.id,
        })
        yield {
          type: 'error',
          content: 'AI 응답 중 오류가 발생했습니다.',
        }
      }
    }

    logger.chat('message_sent', { sessionId: session.id, userId })

    return {
      success: true,
      stream: streamWithSave(),
      sessionId: session.id,
    }
  }
}
