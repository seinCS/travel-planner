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
import type { ChatContextBuilder } from '@/application/services/chat/ContextBuilder'

export interface SendMessageInput {
  projectId: string
  userId: string
  message: string
  destination: string
  country?: string
  existingPlaces: Array<{
    id?: string
    name: string
    category: string
    latitude?: number
    longitude?: number
  }>
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
    usageRepository: IUsageRepository,
    private readonly contextBuilder?: ChatContextBuilder,
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

    // 6. Build context (enhanced or legacy)
    const chatContext = this.contextBuilder
      ? await this.contextBuilder.build({
          projectId,
          userId,
          sessionId: session.id,
          existingPlaces,
          destination,
          country,
        })
      : {
          projectId,
          destination,
          country,
          existingPlaces,
          conversationHistory: (await this.chatRepository.getRecentMessages(session.id, 10))
            .map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            })),
        }

    // 7. Create streaming response generator with proper resource cleanup
    const chatRepo = this.chatRepository
    const llm = this.llmService
    const sessionId = session.id

    async function* streamWithSave(): AsyncGenerator<StreamChunk, void, unknown> {
      let fullContent = ''
      const places: RecommendedPlace[] = []
      let streamCompleted = false
      let messageSaved = false
      // Mutex-like flag to prevent race condition in message saving
      let isSaving = false

      // Helper function to save message atomically
      const saveMessageIfNeeded = async (context: string): Promise<boolean> => {
        // Atomic check-and-set to prevent race condition
        if (isSaving || messageSaved) {
          return false
        }
        isSaving = true

        if (!(fullContent || places.length > 0)) {
          isSaving = false
          return false
        }

        try {
          const uniquePlaces = Array.from(
            new Map(places.map(p => [p.name, p])).values()
          )
          await chatRepo.createMessage({
            sessionId,
            role: 'assistant',
            content: fullContent || '(응답 중단됨)',
            places: uniquePlaces.length > 0 ? uniquePlaces : undefined,
          })
          messageSaved = true
          logger.chat(`message_saved_${context}`, { sessionId })
          return true
        } catch (saveError) {
          logger.error(`Failed to save message (${context})`, {
            error: saveError instanceof Error ? saveError.message : String(saveError),
            sessionId,
          })
          return false
        } finally {
          isSaving = false
        }
      }

      try {
        const stream = llm.streamChat(sanitizedMessage, chatContext)

        for await (const chunk of stream) {
          if (chunk.type === 'text' && chunk.content) {
            fullContent += chunk.content
          } else if (chunk.type === 'place' && chunk.place) {
            places.push(chunk.place)
          }
          // tool_call, tool_result, itinerary_preview chunks are yielded as-is
          // Only text content is accumulated for saving

          yield chunk

          if (chunk.type === 'done') {
            streamCompleted = true
            await saveMessageIfNeeded('stream_done')
          }
        }
      } catch (error) {
        logger.error('Stream error in SendMessageUseCase', {
          error: error instanceof Error ? error.message : String(error),
          sessionId,
        })
        yield {
          type: 'error',
          content: 'AI 응답 중 오류가 발생했습니다.',
        }
      } finally {
        // Ensure message is saved even if stream is aborted
        if (!streamCompleted) {
          await saveMessageIfNeeded('stream_abort')
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
