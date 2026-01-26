/**
 * Gemini Service
 *
 * Implementation of ILLMService using Google Gemini API.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ILLMService, StreamChunk, ChatContext, RecommendedPlace } from '@/domain/interfaces/ILLMService'
import { buildSystemPrompt, buildConversationContext } from './prompts/chatPrompt'
import { logger } from '@/lib/logger'
import { geminiCircuitBreaker } from '@/lib/circuit-breaker'
import { cleanChatResponse } from '@/lib/chat-utils'

const GEMINI_MODEL = 'gemini-2.0-flash'

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
            maxOutputTokens: 2048,
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
