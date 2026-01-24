/**
 * Image Analysis Prompt for Claude
 *
 * Specialized prompt for extracting places from SNS screenshots.
 */

import { buildPrompt, type PromptConfig } from './basePrompt'

const IMAGE_MAX_PLACES = 5

const IMAGE_ADDITIONAL_GUIDELINES = [
  'Include nearby subway/MTR station if visible in the image',
  'For places with visible signage, extract the exact name shown',
]

/**
 * Build prompt for image analysis
 */
export function buildImagePrompt(destination: string, country: string): string {
  const config: PromptConfig = {
    destination,
    country,
    maxPlaces: IMAGE_MAX_PLACES,
    sourceType: 'image',
    sourceDescription: 'a screenshot from Korean social media (Instagram, YouTube, X/Twitter)',
    additionalGuidelines: IMAGE_ADDITIONAL_GUIDELINES,
  }

  return buildPrompt(config)
}

export { IMAGE_MAX_PLACES }
