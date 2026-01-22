/**
 * Claude API Client
 *
 * Provides AI-powered place extraction from images and text.
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  buildImagePrompt,
  buildTextPrompt,
  wrapTextContent,
  type PlaceCategory,
} from '@/infrastructure/services/claude/prompts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048

export interface ExtractedPlace {
  place_name: string
  place_name_en: string | null
  category: PlaceCategory
  comment: string | null
  confidence: number
}

export interface PlaceExtractionResult {
  places: ExtractedPlace[]
  raw_text: string
}

/**
 * Parse Claude response to PlaceExtractionResult
 */
function parseResponse(text: string): PlaceExtractionResult {
  try {
    // Clean up potential markdown formatting
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleanedText)
  } catch {
    return {
      places: [],
      raw_text: text,
    }
  }
}

/**
 * Analyze image (SNS screenshot) to extract places
 */
export async function analyzeImage(
  imageUrl: string,
  destination: string,
  country: string
): Promise<PlaceExtractionResult> {
  const prompt = buildImagePrompt(destination, country)

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseResponse(text)
}

/**
 * Analyze text content to extract places
 */
export async function analyzeText(
  text: string,
  destination: string,
  country: string
): Promise<PlaceExtractionResult> {
  const basePrompt = buildTextPrompt(destination, country)
  const fullPrompt = `${basePrompt}\n\n${wrapTextContent(text)}`

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: fullPrompt,
      },
    ],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseResponse(responseText)
}
