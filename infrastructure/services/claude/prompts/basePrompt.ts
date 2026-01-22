/**
 * Base Prompt Template for Claude Place Extraction
 *
 * Extracts common prompt logic shared between image and text analysis.
 */

export type PlaceCategory = 'restaurant' | 'cafe' | 'attraction' | 'shopping' | 'accommodation' | 'other'

export interface PromptConfig {
  destination: string
  country: string
  maxPlaces: number
  sourceType: 'image' | 'text'
  /** Additional guidelines specific to the source type */
  additionalGuidelines?: string[]
  /** Source type specific intro (e.g., "screenshot from Korean social media") */
  sourceDescription: string
}

/**
 * Build destination context string
 */
export function buildDestinationContext(destination: string, country: string): string {
  return `${destination}${country ? `, ${country}` : ''}`
}

/**
 * Build common place extraction guidelines
 */
export function buildCommonGuidelines(): string[] {
  return [
    'Look for place names in ANY language (Korean 한국어, Chinese 中文, Japanese 日本語, English, etc.)',
    `Place names often appear as:
   - Store/restaurant names (e.g., "이치란 라멘", "스타벅스 리저브")
   - Landmark names (e.g., "에펠탑", "센소지", "경복궁")
   - Area/district names (e.g., "시부야", "명동", "홍대")`,
    `For better geocoding accuracy, extract the FULL place name including:
   - Branch/location suffix (e.g., "신주쿠점", "강남점", "본점")
   - District/area name (e.g., "란콰이펑", "센트럴", "명동")
   - Nearby landmarks if mentioned`,
    'Extract ALL distinct places mentioned, not just the main one',
    'For each place, extract useful tips/comments specific to that place (hours, recommendations, etc.)',
    'If the same place is mentioned multiple times, include it only once',
  ]
}

/**
 * Build geocoding optimization guidelines
 */
export function buildGeocodingGuidelines(): string {
  return `GEOCODING OPTIMIZATION:
- Include area/district names with place names for better search results
- For chain stores/franchises, include branch name (e.g., "스타벅스 IFC몰점")
- ALWAYS provide place_name_en with English name or romanized version for fallback search
- Prefer official/formal names over nicknames`
}

/**
 * Build confidence scoring guidelines
 */
export function buildConfidenceGuidelines(): string {
  return `CONFIDENCE SCORING (per place):
- 0.9-1.0: Clear, specific place name with location details
- 0.7-0.8: Place name mentioned but without specific branch/location
- 0.5-0.6: General area or vague location description
- 0.3-0.4: Only type of place identifiable (e.g., "a good cafe")
- 0.0: Cannot identify any specific place`
}

/**
 * Build JSON response format
 */
export function buildResponseFormat(): string {
  return `Respond ONLY in JSON format (no markdown, no code blocks):
{
  "places": [
    {
      "place_name": "full searchable place name including location",
      "place_name_en": "English name OR romanized version (REQUIRED for geocoding fallback)",
      "category": "restaurant|cafe|attraction|shopping|accommodation|other",
      "comment": "useful tips or description in Korean for this specific place",
      "confidence": number
    }
  ],
  "raw_text": "extracted text or summary"
}

If no places can be identified, return: { "places": [], "raw_text": "no places found" }`
}

/**
 * Build the complete prompt from config
 */
export function buildPrompt(config: PromptConfig): string {
  const destinationContext = buildDestinationContext(config.destination, config.country)
  const commonGuidelines = buildCommonGuidelines()
  const allGuidelines = config.additionalGuidelines
    ? [...commonGuidelines, ...config.additionalGuidelines]
    : commonGuidelines

  const guidelinesText = allGuidelines
    .map((g, i) => `${i + 1}. ${g}`)
    .join('\n')

  return `You are analyzing ${config.sourceDescription} about travel destinations.
The user is collecting places to visit in ${destinationContext}.

Your task: Extract ALL place/venue names that can be searched on Google Maps (maximum ${config.maxPlaces} places).

IMPORTANT GUIDELINES:
${guidelinesText}

${buildGeocodingGuidelines()}

${buildConfidenceGuidelines()}

${buildResponseFormat()}`
}
