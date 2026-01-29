/**
 * Chat Tool Declarations for Gemini Function Calling
 *
 * Defines the tools (functions) that Gemini can invoke during chat.
 * Each tool has a FunctionDeclaration for Gemini and a Zod schema for runtime validation.
 */

import { SchemaType, type FunctionDeclaration } from '@google/generative-ai'
import { z } from 'zod'

// ============================================================
// Gemini Function Declarations
// ============================================================

const recommendPlacesDeclaration: FunctionDeclaration = {
  name: 'recommend_places',
  description:
    '여행지에서 조건에 맞는 장소를 추천합니다. 장소를 추천할 때는 반드시 이 도구를 사용하세요.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      places: {
        type: SchemaType.ARRAY,
        description: '추천 장소 목록 (최대 3개)',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: '장소명 (현지어)' },
            name_en: { type: SchemaType.STRING, description: '영문명' },
            address: { type: SchemaType.STRING, description: '주소' },
            category: {
              type: SchemaType.STRING,
              description: '카테고리: restaurant, cafe, attraction, shopping, accommodation, transport, etc',
            },
            description: { type: SchemaType.STRING, description: '간단한 설명 (50자 이내)' },
          },
          required: ['name', 'category'],
        },
      },
      reasoning: {
        type: SchemaType.STRING,
        description: '추천 이유를 간단히 설명',
      },
    },
    required: ['places'],
  },
}

const generateItineraryDeclaration: FunctionDeclaration = {
  name: 'generate_itinerary',
  description:
    '저장된 장소를 기반으로 여행 일정을 자동 생성합니다. 일정을 만들어달라는 요청에 사용하세요.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: '일정 제목 (예: "도쿄 3박 4일")' },
      days: {
        type: SchemaType.ARRAY,
        description: '날짜별 일정',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            dayNumber: { type: SchemaType.NUMBER, description: '일차 (1부터 시작)' },
            items: {
              type: SchemaType.ARRAY,
              description: '해당 일차의 방문 장소 목록',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  placeName: {
                    type: SchemaType.STRING,
                    description: '저장된 장소명 (정확히 일치해야 함)',
                  },
                  startTime: { type: SchemaType.STRING, description: 'HH:mm 형식의 시작 시간' },
                  duration: { type: SchemaType.STRING, description: '예상 체류 시간 (예: 1.5h)' },
                  note: { type: SchemaType.STRING, description: '방문 팁이나 메모' },
                },
                required: ['placeName'],
              },
            },
          },
          required: ['dayNumber', 'items'],
        },
      },
    },
    required: ['title', 'days'],
  },
}

const searchNearbyDeclaration: FunctionDeclaration = {
  name: 'search_nearby_places',
  description: '특정 장소 근처의 다른 장소를 검색합니다.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      referencePlaceName: {
        type: SchemaType.STRING,
        description: '기준이 되는 장소명 (저장된 장소 중 하나)',
      },
      category: {
        type: SchemaType.STRING,
        description: '검색할 카테고리: restaurant, cafe, attraction, shopping',
      },
      keyword: { type: SchemaType.STRING, description: '추가 검색 키워드 (선택)' },
      maxResults: { type: SchemaType.NUMBER, description: '최대 결과 수 (기본 3, 최대 5)' },
    },
    required: ['referencePlaceName'],
  },
}

/**
 * All chat tool declarations for Gemini Function Calling
 */
export const CHAT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  recommendPlacesDeclaration,
  generateItineraryDeclaration,
  searchNearbyDeclaration,
]

// ============================================================
// Zod Schemas for Runtime Validation
// ============================================================

const placeItemSchema = z.object({
  name: z.string().min(1).max(200),
  name_en: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  category: z.enum([
    'restaurant', 'cafe', 'attraction', 'shopping',
    'accommodation', 'transport', 'etc',
  ]),
  description: z.string().max(200).optional(),
})

export const recommendPlacesArgsSchema = z.object({
  places: z.array(placeItemSchema).min(1).max(5),
  reasoning: z.string().max(500).optional(),
})

const itineraryItemSchema = z.object({
  placeName: z.string().min(1).max(200),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.string().max(20).optional(),
  note: z.string().max(300).optional(),
})

const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  items: z.array(itineraryItemSchema).min(1).max(20),
})

export const generateItineraryArgsSchema = z.object({
  title: z.string().min(1).max(100),
  days: z.array(itineraryDaySchema).min(1).max(30),
})

export const searchNearbyArgsSchema = z.object({
  referencePlaceName: z.string().min(1).max(200),
  category: z.enum(['restaurant', 'cafe', 'attraction', 'shopping']).optional(),
  keyword: z.string().max(100).optional(),
  maxResults: z.number().int().min(1).max(5).optional(),
})

/**
 * Validate tool arguments at runtime
 */
export function validateToolArgs(
  toolName: string,
  args: Record<string, unknown>,
): { success: true; data: unknown } | { success: false; error: string } {
  try {
    switch (toolName) {
      case 'recommend_places':
        return { success: true, data: recommendPlacesArgsSchema.parse(args) }
      case 'generate_itinerary':
        return { success: true, data: generateItineraryArgsSchema.parse(args) }
      case 'search_nearby_places':
        return { success: true, data: searchNearbyArgsSchema.parse(args) }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return { success: false, error: `Validation failed: ${messages.join(', ')}` }
    }
    return { success: false, error: String(err) }
  }
}
