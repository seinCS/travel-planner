/**
 * Text Analysis Prompt for Claude
 *
 * Specialized prompt for extracting places from text content.
 */

import { buildPrompt, type PromptConfig } from './basePrompt'

const TEXT_MAX_PLACES = 10

const TEXT_ADDITIONAL_GUIDELINES = [
  'If the text mentions "near X" or "in front of Y", include that context in place_name',
  'If an address is mentioned, include it in place_name',
]

/**
 * Build prompt for text analysis
 */
export function buildTextPrompt(destination: string, country: string): string {
  const config: PromptConfig = {
    destination,
    country,
    maxPlaces: TEXT_MAX_PLACES,
    sourceType: 'text',
    sourceDescription: 'text content',
    additionalGuidelines: TEXT_ADDITIONAL_GUIDELINES,
  }

  return buildPrompt(config)
}

/**
 * Wrap text content with delimiters for Claude analysis
 */
export function wrapTextContent(text: string): string {
  return `TEXT TO ANALYZE:
"""
${text}
"""`
}

export { TEXT_MAX_PLACES }
