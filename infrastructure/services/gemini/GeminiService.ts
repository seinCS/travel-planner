/**
 * Gemini Service
 *
 * Implementation of ILLMService using Google Gemini API.
 * Supports both text-parsing mode (legacy) and Function Calling mode.
 *
 * SECURITY: This module is server-only and will cause build errors if imported
 * from client-side code. This prevents API key exposure.
 */

import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ILLMService, StreamChunk, ChatContext, RecommendedPlace } from '@/domain/interfaces/ILLMService'
import type { ValidatedPlace } from '@/domain/interfaces/IPlaceValidationService'
import { buildSystemPrompt, buildConversationContext, buildEnhancedSystemPrompt } from './prompts/chatPrompt'
import { CHAT_TOOL_DECLARATIONS } from './tools/chatTools'
import type { IToolExecutor, ToolExecutionContext } from '@/domain/interfaces/services/IToolExecutor'
import { logger } from '@/lib/logger'
import { geminiCircuitBreaker } from '@/lib/circuit-breaker'
import { cleanChatResponse } from '@/lib/chat-utils'

const GEMINI_MODEL = 'gemini-3-flash-preview'

/**
 * Validate API key at module load time (server startup)
 * This catches configuration errors early rather than at first request
 */
function validateApiKeyOnStartup(): void {
  // Only validate in production or when explicitly enabled
  // Skip during build time (process.env is not fully available)
  if (typeof window !== 'undefined') return

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey && process.env.NODE_ENV === 'production') {
    console.error('[GeminiService] CRITICAL: GEMINI_API_KEY is not configured in production')
    // Don't throw to allow build to complete, but log critical error
  }
}

// Run validation on module load
validateApiKeyOnStartup()

/**
 * Validate if an object is a valid place
 */
function isValidPlace(data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return typeof obj.name === 'string' && obj.name.length > 0 &&
         typeof obj.category === 'string' && obj.category.length > 0
}

/**
 * Parse place JSON from response text
 * Handles multiple formats: ```json:place, json:place (no backticks), ```json, and raw JSON
 */
function parsePlaces(text: string): { cleanText: string; places: RecommendedPlace[] } {
  const places: RecommendedPlace[] = []
  let cleanText = text

  // 1. Primary: Match ```json:place blocks (preferred format)
  const placeBlockRegex = /```json:place\s*([\s\S]*?)```/g
  let match

  while ((match = placeBlockRegex.exec(text)) !== null) {
    try {
      const placeData = JSON.parse(match[1].trim())
      if (isValidPlace(placeData)) {
        places.push({
          name: placeData.name as string,
          name_en: placeData.name_en as string | undefined,
          address: placeData.address as string | undefined,
          category: placeData.category as string,
          description: placeData.description as string | undefined,
          latitude: placeData.latitude as number | undefined,
          longitude: placeData.longitude as number | undefined,
        })
      }
      // Remove the JSON block from display text
      cleanText = cleanText.replace(match[0], '')
    } catch (e) {
      logger.warn('Failed to parse place JSON (json:place)', { error: String(e) })
    }
  }

  // 2. Fallback: Match json:place without backticks (LLM sometimes omits them)
  const noBacktickRegex = /json:place\s*(\{[\s\S]*?\})/gi

  while ((match = noBacktickRegex.exec(text)) !== null) {
    try {
      const placeData = JSON.parse(match[1].trim())
      if (isValidPlace(placeData)) {
        const isDuplicate = places.some(p => p.name === placeData.name)
        if (!isDuplicate) {
          places.push({
            name: placeData.name as string,
            name_en: placeData.name_en as string | undefined,
            address: placeData.address as string | undefined,
            category: placeData.category as string,
            description: placeData.description as string | undefined,
            latitude: placeData.latitude as number | undefined,
            longitude: placeData.longitude as number | undefined,
          })
        }
      }
      cleanText = cleanText.replace(match[0], '')
    } catch (e) {
      logger.warn('Failed to parse place JSON (no backticks)', { error: String(e) })
      // Still remove the malformed block
      cleanText = cleanText.replace(match[0], '')
    }
  }

  // 2.5. Fallback: Match :place without 'json' prefix (Gemini sometimes uses this)
  const colonPlaceRegex = /:place\s*(\{[\s\S]*?\})/gi

  while ((match = colonPlaceRegex.exec(text)) !== null) {
    try {
      const placeData = JSON.parse(match[1].trim())
      if (isValidPlace(placeData)) {
        const isDuplicate = places.some(p => p.name === placeData.name)
        if (!isDuplicate) {
          places.push({
            name: placeData.name as string,
            name_en: placeData.name_en as string | undefined,
            address: placeData.address as string | undefined,
            category: placeData.category as string,
            description: placeData.description as string | undefined,
            latitude: placeData.latitude as number | undefined,
            longitude: placeData.longitude as number | undefined,
          })
        }
      }
      cleanText = cleanText.replace(match[0], '')
    } catch (e) {
      logger.warn('Failed to parse place JSON (:place format)', { error: String(e) })
      // Still remove the malformed block
      cleanText = cleanText.replace(match[0], '')
    }
  }

  // 3. Fallback: Match generic ```json blocks that contain place-like data
  const genericJsonRegex = /```json\s*([\s\S]*?)```/g

  while ((match = genericJsonRegex.exec(text)) !== null) {
    try {
      const jsonContent = match[1].trim()
      const parsed = JSON.parse(jsonContent)

      // Check if it's a place object or array of places
      const placeArray = Array.isArray(parsed) ? parsed : [parsed]

      for (const placeData of placeArray) {
        if (isValidPlace(placeData)) {
          // Only add if not already added (by name)
          const isDuplicate = places.some(p => p.name === placeData.name)
          if (!isDuplicate) {
            places.push({
              name: placeData.name as string,
              name_en: placeData.name_en as string | undefined,
              address: placeData.address as string | undefined,
              category: placeData.category as string,
              description: placeData.description as string | undefined,
              latitude: placeData.latitude as number | undefined,
              longitude: placeData.longitude as number | undefined,
            })
          }
        }
      }
      // Remove the JSON block from display text
      cleanText = cleanText.replace(match[0], '')
    } catch (e) {
      logger.warn('Failed to parse generic JSON block', { error: String(e) })
      // Still remove malformed JSON blocks from display
      cleanText = cleanText.replace(match[0], '')
    }
  }

  // 4. Apply additional cleaning to remove any remaining JSON artifacts
  cleanText = cleanChatResponse(cleanText)

  return { cleanText, places }
}

/**
 * Convert a ValidatedPlace to RecommendedPlace for streaming
 */
function validatedToRecommended(place: ValidatedPlace): RecommendedPlace {
  return {
    name: place.name,
    name_en: place.name_en,
    address: place.address,
    category: place.category,
    description: place.description,
    latitude: place.latitude,
    longitude: place.longitude,
  }
}

/**
 * GeminiService - Server-side only
 *
 * SECURITY: This service must only be used in:
 * - API Routes (app/api/*)
 * - Server Components
 * - Server Actions
 *
 * Never import this in client components or 'use client' files.
 */
class GeminiService implements ILLMService {
  private client: GoogleGenerativeAI | null = null
  private _toolExecutor: IToolExecutor | null = null

  /**
   * Set the tool executor for Function Calling support.
   * When set, the service will use Function Calling instead of text parsing.
   */
  setToolExecutor(executor: IToolExecutor | null): void {
    this._toolExecutor = executor
  }

  private getClient(): GoogleGenerativeAI {
    // Runtime check to ensure server-side execution
    if (typeof window !== 'undefined') {
      throw new Error('GeminiService must only be used on the server side')
    }

    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured')
      }
      this.client = new GoogleGenerativeAI(apiKey)
    }
    return this.client
  }

  async *streamChat(
    message: string,
    context: ChatContext
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (this._toolExecutor) {
      yield* this.streamChatWithTools(message, context)
    } else {
      yield* this.streamChatLegacy(message, context)
    }
  }

  /**
   * Function Calling mode: uses tools for structured responses.
   * Falls back to text parsing if no function calls are made.
   */
  private async *streamChatWithTools(
    message: string,
    context: ChatContext
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const systemPrompt = buildEnhancedSystemPrompt(context)
    const conversationContext = buildConversationContext(context.conversationHistory)

    const fullPrompt = conversationContext
      ? `${conversationContext}\n\n사용자: ${message}`
      : `사용자: ${message}`

    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({
        model: GEMINI_MODEL,
        tools: [{ functionDeclarations: CHAT_TOOL_DECLARATIONS }],
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      })

      const result = await geminiCircuitBreaker.execute(async () => {
        return model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.7,
          },
        })
      })

      let accumulatedText = ''
      let hadFunctionCall = false
      const toolContext: ToolExecutionContext = {
        projectId: context.projectId,
        userId: '', // Will be filled by the caller if needed
        existingPlaces: context.existingPlaces,
        itinerary: context.itinerary,
        destination: context.destination,
        country: context.country,
      }

      for await (const chunk of result.stream) {
        const candidate = chunk.candidates?.[0]
        if (!candidate?.content?.parts) continue

        for (const part of candidate.content.parts) {
          // Handle text parts
          if (part.text) {
            accumulatedText += part.text
            yield { type: 'text', content: part.text }
          }

          // Handle function calls
          if (part.functionCall && this._toolExecutor) {
            hadFunctionCall = true
            const { name, args } = part.functionCall

            logger.info('Gemini function call', {
              toolName: name,
              projectId: context.projectId,
            })

            yield {
              type: 'tool_call',
              toolCall: {
                id: `tc-${Date.now()}`,
                name,
                args: (args || {}) as Record<string, unknown>,
                status: 'executing',
              },
            }

            // Execute the tool
            const toolResult = await this._toolExecutor.execute(
              name,
              (args || {}) as Record<string, unknown>,
              toolContext,
            )

            if (!toolResult.success) {
              logger.warn('Tool execution failed', {
                toolName: name,
                error: toolResult.error,
              })
              yield {
                type: 'text',
                content: `\n(${toolResult.error || '도구 실행 중 오류가 발생했습니다.'})\n`,
              }
              continue
            }

            // Yield results based on tool type
            if (name === 'recommend_places' && toolResult.data) {
              const data = toolResult.data as { places: ValidatedPlace[]; reasoning?: string }
              for (const place of data.places) {
                yield { type: 'place', place: validatedToRecommended(place) }
              }
            }

            if (name === 'generate_itinerary' && toolResult.data) {
              const data = toolResult.data as {
                preview: import('@/domain/interfaces/ILLMService').ItineraryPreviewData
                skippedPlaces?: string[]
              }
              yield { type: 'itinerary_preview', itineraryPreview: data.preview }
              if (data.skippedPlaces && data.skippedPlaces.length > 0) {
                yield {
                  type: 'text',
                  content: `\n(참고: 다음 장소는 프로젝트에 저장되지 않아 일정에 포함되지 않았습니다: ${data.skippedPlaces.join(', ')})`,
                }
              }
            }

            if (name === 'search_nearby_places' && toolResult.data) {
              const data = toolResult.data as { places: ValidatedPlace[] }
              for (const place of data.places) {
                yield { type: 'place', place: validatedToRecommended(place) }
              }
            }
          }
        }

        // Check for finish reason
        if (candidate.finishReason) {
          logger.info('Gemini stream finish reason', {
            finishReason: candidate.finishReason,
            hadFunctionCall,
            projectId: context.projectId,
          })
        }
      }

      // Fallback: If no function calls were made, try text parsing
      if (!hadFunctionCall && accumulatedText) {
        const { places } = parsePlaces(accumulatedText)
        if (places.length > 0) {
          logger.info('Function Calling fallback: parsed places from text', {
            count: places.length,
            projectId: context.projectId,
          })
          for (const place of places) {
            yield { type: 'place', place }
          }
        }
      }

      yield { type: 'done', messageId: `msg-${Date.now()}` }

    } catch (error) {
      logger.error('Gemini streaming error (tools mode)', {
        error: error instanceof Error ? error.message : String(error),
        projectId: context.projectId,
      })

      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'AI 서비스 오류가 발생했습니다.',
      }
    }
  }

  /**
   * Legacy text-parsing mode: original behavior without Function Calling.
   * Used when toolExecutor is not set.
   */
  private async *streamChatLegacy(
    message: string,
    context: ChatContext
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const systemPrompt = buildSystemPrompt({
      destination: context.destination,
      country: context.country,
      existingPlaces: context.existingPlaces,
    })

    const conversationContext = buildConversationContext(context.conversationHistory)

    const fullPrompt = conversationContext
      ? `${conversationContext}\n\n사용자: ${message}`
      : `사용자: ${message}`

    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ model: GEMINI_MODEL })

      const result = await geminiCircuitBreaker.execute(async () => {
        return model.generateContentStream({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n---\n\n${fullPrompt}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.7,
          },
        })
      })

      let accumulatedText = ''
      let lastYieldedLength = 0
      let lastYieldedPlaceCount = 0  // Track already yielded places to prevent duplicates

      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        if (chunkText) {
          accumulatedText += chunkText

          // Yield text incrementally
          const newText = accumulatedText.slice(lastYieldedLength)
          if (newText) {
            // Check for complete place blocks in accumulated text
            const { cleanText, places } = parsePlaces(accumulatedText)

            // Yield only NEW places found (not already yielded)
            for (let i = lastYieldedPlaceCount; i < places.length; i++) {
              yield { type: 'place', place: places[i] }
            }
            lastYieldedPlaceCount = places.length

            // Yield new clean text
            const cleanNewText = cleanText.slice(lastYieldedLength)
            if (cleanNewText) {
              yield { type: 'text', content: cleanNewText }
            }

            lastYieldedLength = cleanText.length
          }
        }

        // Check for finish reason (safety, max tokens, etc.)
        const candidates = chunk.candidates
        if (candidates?.[0]?.finishReason) {
          const finishReason = candidates[0].finishReason
          logger.info('Gemini stream finish reason', {
            finishReason,
            accumulatedLength: accumulatedText.length,
            projectId: context.projectId,
          })

          // If stopped for safety or other reasons, log it
          if (finishReason !== 'STOP') {
            logger.warn('Gemini stream ended unexpectedly', {
              finishReason,
              safetyRatings: candidates[0].safetyRatings,
            })
          }
        }
      }

      // Final processing for any remaining content
      const { cleanText, places } = parsePlaces(accumulatedText)

      // Yield only remaining places that haven't been yielded yet
      for (let i = lastYieldedPlaceCount; i < places.length; i++) {
        yield { type: 'place', place: places[i] }
      }

      // Yield any remaining text
      const remainingText = cleanText.slice(lastYieldedLength)
      if (remainingText) {
        yield { type: 'text', content: remainingText }
      }

      yield { type: 'done', messageId: `msg-${Date.now()}` }

    } catch (error) {
      logger.error('Gemini streaming error', {
        error: error instanceof Error ? error.message : String(error),
        projectId: context.projectId,
      })

      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'AI 서비스 오류가 발생했습니다.',
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ model: GEMINI_MODEL })

      // Simple health check
      const result = await model.generateContent('ping')
      return !!result.response
    } catch {
      return false
    }
  }
}

export const geminiService = new GeminiService()
