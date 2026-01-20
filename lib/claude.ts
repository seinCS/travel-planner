import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ExtractedPlace {
  place_name: string
  place_name_en: string | null
  category: 'restaurant' | 'cafe' | 'attraction' | 'shopping' | 'accommodation' | 'other'
  comment: string | null
  confidence: number
}

export interface PlaceExtractionResult {
  places: ExtractedPlace[]
  raw_text: string
}

export async function analyzeImage(
  imageUrl: string,
  destination: string,
  country: string
): Promise<PlaceExtractionResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
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
            text: `You are analyzing a screenshot from Korean social media (Instagram, YouTube, X/Twitter) about travel destinations.
The user is collecting places to visit in ${destination}${country ? `, ${country}` : ''}.

Your task: Extract ALL place/venue names that can be searched on Google Maps (maximum 5 places).

IMPORTANT GUIDELINES:
1. Look for place names in ANY language (Korean 한국어, Chinese 中文, Japanese 日本語, English, etc.)
2. Place names often appear as:
   - Store/restaurant names (e.g., "이치란 라멘", "스타벅스 리저브", "미샹 프라다 동자이")
   - Landmark names (e.g., "에펠탑", "센소지", "와이탄")
   - Area/district names (e.g., "시부야", "난징동루", "홍대")
3. For better geocoding accuracy, extract the FULL place name including:
   - Branch/location suffix if visible (e.g., "신주쿠점", "센트럴점", "본점")
   - District/area name (e.g., "란콰이펑", "센트럴", "코즈웨이베이")
   - Nearby landmarks if mentioned (e.g., "MTR 센트럴역 근처")
4. Extract ALL distinct places mentioned, not just the main one
5. For each place, extract useful tips/comments specific to that place (hours, recommendations, etc.)
6. If the same place is mentioned multiple times, include it only once

GEOCODING OPTIMIZATION:
- For restaurants/cafes, include district or area name for better search accuracy
- For chain stores/franchises, include branch name (e.g., "스타벅스 IFC몰점")
- ALWAYS provide place_name_en with English name or romanized version for fallback search
- Include nearby subway/MTR station if visible in the image

CONFIDENCE SCORING (per place):
- 0.9-1.0: Clear, specific place name visible
- 0.7-0.8: Place name mentioned in text but not prominently displayed
- 0.5-0.6: Location identifiable from context/landmarks
- 0.3-0.4: Only general area/type of place identifiable
- 0.0: Cannot identify any specific place

Respond ONLY in JSON format (no markdown, no code blocks):
{
  "places": [
    {
      "place_name": "full searchable place name including district/area",
      "place_name_en": "English name OR romanized version (REQUIRED for geocoding fallback)",
      "category": "restaurant|cafe|attraction|shopping|accommodation|other",
      "comment": "useful tips or description in Korean for this specific place",
      "confidence": number
    }
  ],
  "raw_text": "all text extracted from image"
}

If no places can be identified, return: { "places": [], "raw_text": "extracted text" }`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

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

// 텍스트에서 장소 추출
export async function analyzeText(
  text: string,
  destination: string,
  country: string
): Promise<PlaceExtractionResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are analyzing text content about travel destinations.
The user is collecting places to visit in ${destination}${country ? `, ${country}` : ''}.

TEXT TO ANALYZE:
"""
${text}
"""

Your task: Extract ALL place/venue names that can be searched on Google Maps (maximum 10 places).

IMPORTANT GUIDELINES:
1. Look for place names in ANY language (Korean 한국어, Chinese 中文, Japanese 日本語, English, etc.)
2. Place names often appear as:
   - Store/restaurant names with specific location (e.g., "이치란 라멘 신주쿠점", "스타벅스 강남역점")
   - Landmark names (e.g., "에펠탑", "센소지", "경복궁")
   - Area/district names (e.g., "시부야", "명동", "홍대")
   - Specific addresses or location descriptions
3. For better geocoding accuracy, extract the FULL place name including:
   - Branch/location suffix (e.g., "신주쿠점", "강남점", "본점")
   - Nearby landmark or area (e.g., "도톤보리 근처", "명동 입구")
   - Full official name rather than abbreviations
4. If the text mentions "near X" or "in front of Y", include that context in place_name
5. Extract useful tips/comments specific to each place (hours, recommendations, prices, etc.)
6. If the same place is mentioned multiple times, include it only once

GEOCODING OPTIMIZATION:
- Include area/district names with place names for better search results
- Prefer official/formal names over nicknames
- If an address is mentioned, include it in place_name

CONFIDENCE SCORING (per place):
- 0.9-1.0: Clear, specific place name with location details
- 0.7-0.8: Place name mentioned but without specific branch/location
- 0.5-0.6: General area or vague location description
- 0.3-0.4: Only type of place identifiable (e.g., "a good cafe")
- 0.0: Cannot identify any specific place

Respond ONLY in JSON format (no markdown, no code blocks):
{
  "places": [
    {
      "place_name": "full searchable place name including location",
      "place_name_en": "English name if available, or romanized version",
      "category": "restaurant|cafe|attraction|shopping|accommodation|other",
      "comment": "useful tips or description in Korean for this specific place",
      "confidence": number
    }
  ],
  "raw_text": "summary of the analyzed text"
}

If no places can be identified, return: { "places": [], "raw_text": "no places found" }`,
      },
    ],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleanedText)
  } catch {
    return {
      places: [],
      raw_text: responseText,
    }
  }
}
