# Chatbot Phase 2-A Architecture Design

> **버전**: v1.0
> **작성일**: 2026-01-27
> **범위**: Phase 2-A (P0 핵심 품질 + 기반 기술)
> **상태**: 설계 완료, 구현 대기

---

## 1. 설계 범위

Phase 2-A는 4가지 P0 요구사항을 다룬다:

| ID | 요구사항 | 핵심 변경 |
|----|----------|-----------|
| RQ-3.5 | Function Calling 아키텍처 | GeminiService 전면 리팩토링 |
| RQ-2.1 | 맥락 이해력 강화 | ChatContext 확장, 대화 요약 |
| RQ-2.2 | 추천 정확도 향상 | Places API 검증, 동선 고려 |
| RQ-3.1 | 일정 자동 생성 | 새로운 Use Case + Tool 함수 |

---

## 2. 전체 아키텍처 변경 개요

### 2.1 현재 아키텍처 (AS-IS)

```
User Message
  → PromptInjectionFilter
  → UsageLimitService
  → GeminiService.streamChat()
      → buildSystemPrompt() (텍스트 프롬프트)
      → model.generateContentStream() (자유 텍스트 생성)
      → parsePlaces() (4단계 regex fallback으로 JSON 추출)
  → SSE Stream (text | place | done | error)
```

**문제점**:
- 텍스트 파싱 기반 장소 추출은 불안정 (4단계 fallback 필요)
- 구조화된 액션(일정 수정 등) 불가
- 컨텍스트 제한 (10턴, 장소명+카테고리만)
- 추천 장소의 실존 여부 미검증

### 2.2 목표 아키텍처 (TO-BE)

```
User Message
  → PromptInjectionFilter
  → UsageLimitService
  → EnhancedContextBuilder (확장된 컨텍스트 구성)
  → GeminiService.streamChatWithTools()
      → buildEnhancedSystemPrompt() (확장 프롬프트)
      → model.generateContentStream() (Function Calling 활성화)
      → ToolExecutor (도구 호출 처리)
          ├── recommend_places → PlacesValidationService
          ├── generate_itinerary → ItineraryGenerationService
          ├── add_place_to_itinerary → ItineraryRepository
          └── search_nearby → Google Places API
  → SSE Stream (text | tool_call | place | itinerary_preview | done | error)
```

---

## 3. Function Calling 아키텍처 (RQ-3.5)

### 3.1 도구 정의

Gemini Function Calling을 위한 도구 스키마를 정의한다.

#### 3.1.1 도메인 인터페이스 확장

**파일**: `domain/interfaces/ILLMService.ts`

```typescript
// === 기존 유지 ===
export interface RecommendedPlace { /* 동일 */ }
export interface StreamChunk {
  type: 'text' | 'place' | 'tool_call' | 'tool_result' | 'itinerary_preview' | 'done' | 'error'
  content?: string
  place?: RecommendedPlace
  toolCall?: ToolCallChunk
  itineraryPreview?: ItineraryPreviewData
  messageId?: string
}

// === 신규 추가 ===
export interface ToolCallChunk {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: unknown
}

export interface ItineraryPreviewData {
  title: string
  days: Array<{
    dayNumber: number
    date: string
    items: Array<{
      order: number
      placeName: string
      placeNameEn?: string
      category: string
      startTime?: string
      duration?: string
      note?: string
    }>
  }>
}

// ChatContext 확장
export interface ChatContext {
  projectId: string
  destination: string
  country?: string
  existingPlaces: Array<{
    id: string           // 신규: Place ID (일정 추가 시 필요)
    name: string
    category: string
    latitude?: number    // 신규: 동선 계산용
    longitude?: number   // 신규: 동선 계산용
  }>
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  // === 신규 필드 ===
  conversationSummary?: string       // 대화 요약 (10턴 초과 시)
  itinerary?: {                      // 현재 일정 정보
    id: string
    startDate: string
    endDate: string
    days: Array<{
      dayNumber: number
      date: string
      items: Array<{ placeName: string; startTime?: string }>
    }>
  }
  userPreferences?: {                // 사용자 선호도
    topCategories: string[]          // 상위 3개 카테고리
    averageRating?: number           // 선호 평점대
  }
}

export interface ILLMService {
  streamChat(message: string, context: ChatContext): AsyncGenerator<StreamChunk, void, unknown>
  isAvailable(): Promise<boolean>
}
```

#### 3.1.2 Gemini Function Declaration

**파일**: `infrastructure/services/gemini/tools/chatTools.ts` (신규)

```typescript
import type { FunctionDeclaration } from '@google/generative-ai'

export const CHAT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'recommend_places',
    description: '여행지에서 조건에 맞는 장소를 추천합니다. 반드시 이 도구를 사용하여 장소를 추천하세요.',
    parameters: {
      type: 'object',
      properties: {
        places: {
          type: 'array',
          description: '추천 장소 목록 (최대 3개)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '장소명 (현지어)' },
              name_en: { type: 'string', description: '영문명' },
              address: { type: 'string', description: '주소' },
              category: {
                type: 'string',
                enum: ['restaurant', 'cafe', 'attraction', 'shopping', 'accommodation', 'transport', 'etc'],
              },
              description: { type: 'string', description: '간단한 설명 (50자 이내)' },
            },
            required: ['name', 'category'],
          },
        },
        reasoning: {
          type: 'string',
          description: '추천 이유를 간단히 설명',
        },
      },
      required: ['places'],
    },
  },
  {
    name: 'generate_itinerary',
    description: '저장된 장소를 기반으로 여행 일정을 자동 생성합니다.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '일정 제목' },
        days: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dayNumber: { type: 'number' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    placeName: { type: 'string', description: '저장된 장소명 (정확히 일치해야 함)' },
                    startTime: { type: 'string', description: 'HH:mm 형식' },
                    duration: { type: 'string', description: '예상 체류 시간 (예: 1.5h)' },
                    note: { type: 'string', description: '방문 팁' },
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
  },
  {
    name: 'search_nearby_places',
    description: '특정 장소 근처의 다른 장소를 검색합니다.',
    parameters: {
      type: 'object',
      properties: {
        referencePlaceName: { type: 'string', description: '기준 장소명' },
        category: {
          type: 'string',
          enum: ['restaurant', 'cafe', 'attraction', 'shopping'],
        },
        keyword: { type: 'string', description: '검색 키워드 (선택)' },
        maxResults: { type: 'number', description: '최대 결과 수 (기본 3)' },
      },
      required: ['referencePlaceName'],
    },
  },
]
```

#### 3.1.3 Tool Executor

**파일**: `application/services/chat/ToolExecutor.ts` (신규)

```typescript
export interface ToolExecutionContext {
  projectId: string
  userId: string
  existingPlaces: ChatContext['existingPlaces']
  itinerary?: ChatContext['itinerary']
  destination: string
  country?: string
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export class ToolExecutor {
  constructor(
    private readonly placeValidationService: IPlaceValidationService,
    private readonly itineraryRepository: IItineraryRepository,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    switch (toolName) {
      case 'recommend_places':
        return this.handleRecommendPlaces(args, context)
      case 'generate_itinerary':
        return this.handleGenerateItinerary(args, context)
      case 'search_nearby_places':
        return this.handleSearchNearby(args, context)
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  }

  private async handleRecommendPlaces(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    const places = args.places as Array<Record<string, string>>
    // Google Places API로 실존 검증 + 상세 정보 보강
    const validated = await this.placeValidationService.validateAndEnrich(
      places,
      context.destination,
      context.country,
    )
    return { success: true, data: { places: validated, reasoning: args.reasoning } }
  }

  private async handleGenerateItinerary(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    // 프리뷰 데이터 생성 (아직 저장하지 않음 - 사용자 확인 필요)
    const days = args.days as Array<Record<string, unknown>>
    const preview = this.buildItineraryPreview(args.title as string, days, context)
    return { success: true, data: { preview, requiresConfirmation: true } }
  }

  private async handleSearchNearby(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    const refPlace = context.existingPlaces.find(
      p => p.name === args.referencePlaceName
    )
    if (!refPlace?.latitude || !refPlace?.longitude) {
      return { success: false, error: '기준 장소의 좌표를 찾을 수 없습니다.' }
    }
    const nearby = await this.placeValidationService.searchNearby(
      refPlace.latitude,
      refPlace.longitude,
      args.category as string | undefined,
      args.keyword as string | undefined,
      (args.maxResults as number) || 3,
    )
    return { success: true, data: { places: nearby } }
  }

  private buildItineraryPreview(
    title: string,
    days: Array<Record<string, unknown>>,
    context: ToolExecutionContext,
  ): ItineraryPreviewData {
    // 장소명을 기존 장소와 매칭하여 프리뷰 구성
    // ... (구현 세부사항)
  }
}
```

### 3.2 GeminiService 리팩토링

**파일**: `infrastructure/services/gemini/GeminiService.ts`

핵심 변경: `generateContentStream`에 `tools` 파라미터를 추가하고, `functionCall` 응답을 처리하는 로직을 추가한다.

```typescript
// 변경 포인트 (streamChat 메서드)

async *streamChat(
  message: string,
  context: ChatContext
): AsyncGenerator<StreamChunk, void, unknown> {
  const systemPrompt = buildEnhancedSystemPrompt(context)  // 확장된 프롬프트
  const conversationContext = buildConversationContext(context.conversationHistory)

  const fullPrompt = conversationContext
    ? `${conversationContext}\n\n사용자: ${message}`
    : `사용자: ${message}`

  const client = this.getClient()
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    tools: [{ functionDeclarations: CHAT_TOOL_DECLARATIONS }],  // Function Calling 활성화
    systemInstruction: { parts: [{ text: systemPrompt }] },     // 시스템 프롬프트 분리
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

  for await (const chunk of result.stream) {
    const candidate = chunk.candidates?.[0]
    if (!candidate) continue

    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        // 텍스트 청크 처리 (기존과 동일, 단 parsePlaces 제거)
        yield { type: 'text', content: part.text }
      }
      if (part.functionCall) {
        // Function Call 처리
        const { name, args } = part.functionCall
        yield {
          type: 'tool_call',
          toolCall: { id: `tc-${Date.now()}`, name, args: args as Record<string, unknown>, status: 'executing' },
        }

        // 도구 실행
        const toolResult = await this.toolExecutor.execute(name, args as Record<string, unknown>, toolContext)

        // 결과에 따라 적절한 청크 yield
        if (name === 'recommend_places' && toolResult.success) {
          const data = toolResult.data as { places: ValidatedPlace[]; reasoning: string }
          for (const place of data.places) {
            yield { type: 'place', place: this.toRecommendedPlace(place) }
          }
        }
        if (name === 'generate_itinerary' && toolResult.success) {
          const data = toolResult.data as { preview: ItineraryPreviewData }
          yield { type: 'itinerary_preview', itineraryPreview: data.preview }
        }
      }
    }
  }

  yield { type: 'done', messageId: `msg-${Date.now()}` }
}
```

### 3.3 텍스트 파싱 Fallback 전략

Function Calling 전환 후에도 안정성을 위해 기존 `parsePlaces()` 로직을 fallback으로 유지한다:

```
1차: Gemini Function Calling (recommend_places 도구)
2차: parsePlaces() regex fallback (Function Call 미발생 시)
```

전환 완료 후 2차 fallback의 호출 빈도를 모니터링하고, 충분히 낮아지면 제거한다.

---

## 4. 맥락 이해력 강화 (RQ-2.1)

### 4.1 확장된 컨텍스트 빌더

**파일**: `application/services/chat/ContextBuilder.ts` (신규)

```typescript
export class ChatContextBuilder {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly itineraryRepository: IItineraryRepository,
  ) {}

  async build(input: {
    projectId: string
    userId: string
    sessionId: string
    existingPlaces: Array<{ id: string; name: string; category: string; latitude?: number; longitude?: number }>
    destination: string
    country?: string
  }): Promise<ChatContext> {
    // 병렬 로드
    const [recentMessages, itinerary, allMessages] = await Promise.all([
      this.chatRepository.getRecentMessages(input.sessionId, 10),
      this.itineraryRepository.findByProjectId(input.projectId),
      this.chatRepository.getMessages(input.sessionId),
    ])

    // 대화 요약 (10턴 초과 시)
    let conversationSummary: string | undefined
    if (allMessages.length > 10) {
      const olderMessages = allMessages.slice(0, -10)
      conversationSummary = this.summarizeConversation(olderMessages)
    }

    // 사용자 선호도 분석
    const userPreferences = this.analyzePreferences(input.existingPlaces)

    // 일정 정보 변환
    const itineraryContext = itinerary ? this.formatItinerary(itinerary) : undefined

    return {
      projectId: input.projectId,
      destination: input.destination,
      country: input.country,
      existingPlaces: input.existingPlaces,
      conversationHistory: recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      conversationSummary,
      itinerary: itineraryContext,
      userPreferences,
    }
  }

  /**
   * 이전 대화 요약 (로컬, LLM 미사용)
   * Phase 2-B에서 LLM 기반 요약으로 업그레이드 가능
   */
  private summarizeConversation(
    messages: Array<{ role: string; content: string }>
  ): string {
    // 키워드 추출 기반 요약
    const topics = new Set<string>()
    const mentionedPlaces: string[] = []

    for (const msg of messages) {
      // 카테고리 키워드
      const categories = ['맛집', '카페', '관광', '쇼핑', '숙소', '교통']
      for (const cat of categories) {
        if (msg.content.includes(cat)) topics.add(cat)
      }
      // 장소명 패턴 (따옴표 안)
      const placeMatches = msg.content.match(/[「『"'](.*?)[」』"']/g)
      if (placeMatches) {
        mentionedPlaces.push(...placeMatches.map(m => m.slice(1, -1)))
      }
    }

    const parts: string[] = []
    if (topics.size > 0) parts.push(`논의 주제: ${[...topics].join(', ')}`)
    if (mentionedPlaces.length > 0) {
      const unique = [...new Set(mentionedPlaces)].slice(0, 5)
      parts.push(`언급된 장소: ${unique.join(', ')}`)
    }
    parts.push(`이전 대화 ${messages.length}개 메시지`)

    return parts.join('. ')
  }

  private analyzePreferences(
    places: Array<{ category: string }>
  ): { topCategories: string[] } {
    const counts: Record<string, number> = {}
    for (const p of places) {
      counts[p.category] = (counts[p.category] || 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return { topCategories: sorted.slice(0, 3).map(([cat]) => cat) }
  }

  private formatItinerary(itinerary: ItineraryWithDays): ChatContext['itinerary'] {
    return {
      id: itinerary.id,
      startDate: itinerary.startDate.toISOString().split('T')[0],
      endDate: itinerary.endDate.toISOString().split('T')[0],
      days: itinerary.days.map(d => ({
        dayNumber: d.dayNumber,
        date: d.date.toISOString().split('T')[0],
        items: d.items.map(i => ({
          placeName: i.place.name,
          startTime: i.startTime || undefined,
        })),
      })),
    }
  }
}
```

### 4.2 확장된 시스템 프롬프트

**파일**: `infrastructure/services/gemini/prompts/chatPrompt.ts` (수정)

```typescript
export function buildEnhancedSystemPrompt(context: ChatContext): string {
  const base = buildSystemPrompt({
    destination: context.destination,
    country: context.country,
    existingPlaces: context.existingPlaces,
  })

  const sections: string[] = [base]

  // 대화 요약 주입
  if (context.conversationSummary) {
    sections.push(`\n## 이전 대화 요약\n${context.conversationSummary}`)
  }

  // 일정 정보 주입
  if (context.itinerary) {
    const itineraryText = context.itinerary.days.map(d => {
      const items = d.items.map(i =>
        i.startTime ? `  ${i.startTime} ${i.placeName}` : `  - ${i.placeName}`
      ).join('\n')
      return `Day ${d.dayNumber} (${d.date}):\n${items}`
    }).join('\n')
    sections.push(`\n## 현재 일정\n${itineraryText}`)
  }

  // 사용자 선호도
  if (context.userPreferences?.topCategories.length) {
    sections.push(`\n## 사용자 선호\n선호 카테고리: ${context.userPreferences.topCategories.join(', ')}`)
  }

  // Function Calling 지시
  sections.push(`\n## 도구 사용 규칙
- 장소를 추천할 때는 반드시 recommend_places 도구를 사용하세요.
- 일정을 생성할 때는 반드시 generate_itinerary 도구를 사용하세요.
- 텍스트 응답에는 JSON을 포함하지 마세요.
- 도구 호출 전후로 자연스러운 설명을 추가하세요.`)

  return sections.join('\n')
}
```

---

## 5. 추천 정확도 향상 (RQ-2.2)

### 5.1 Place Validation Service

**파일**: `domain/interfaces/IPlaceValidationService.ts` (신규)

```typescript
export interface ValidatedPlace {
  name: string
  name_en?: string
  address?: string
  category: string
  description?: string
  latitude?: number
  longitude?: number
  // 검증 정보
  isVerified: boolean              // Google Places에서 확인됨
  googlePlaceId?: string
  rating?: number
  userRatingsTotal?: number
  openNow?: boolean
  priceLevel?: number
  googleMapsUrl?: string
  distanceFromReference?: number   // 기존 장소로부터의 거리 (km)
}

export interface IPlaceValidationService {
  /**
   * 추천 장소를 Google Places API로 검증하고 상세 정보 보강
   */
  validateAndEnrich(
    places: Array<{ name: string; name_en?: string; address?: string; category: string; description?: string }>,
    destination: string,
    country?: string,
  ): Promise<ValidatedPlace[]>

  /**
   * 좌표 기준 주변 장소 검색
   */
  searchNearby(
    latitude: number,
    longitude: number,
    category?: string,
    keyword?: string,
    maxResults?: number,
  ): Promise<ValidatedPlace[]>
}
```

### 5.2 구현 전략

**파일**: `infrastructure/services/PlaceValidationService.ts` (신규)

```typescript
export class PlaceValidationService implements IPlaceValidationService {
  async validateAndEnrich(places, destination, country): Promise<ValidatedPlace[]> {
    // 병렬 검증
    const results = await Promise.allSettled(
      places.map(place => this.validateSinglePlace(place, destination, country))
    )

    return results.map((result, i) => {
      if (result.status === 'fulfilled') return result.value
      // 검증 실패 시 미검증 상태로 반환
      return {
        ...places[i],
        isVerified: false,
      }
    })
  }

  private async validateSinglePlace(place, destination, country): Promise<ValidatedPlace> {
    // 1. Text Search로 장소 찾기
    const query = `${place.name} ${destination} ${country || ''}`
    const searchResult = await this.textSearch(query)

    if (!searchResult) {
      // 2. 영문명 fallback
      if (place.name_en) {
        const enResult = await this.textSearch(`${place.name_en} ${destination}`)
        if (enResult) return this.mergeWithGoogleData(place, enResult)
      }
      return { ...place, isVerified: false }
    }

    return this.mergeWithGoogleData(place, searchResult)
  }

  async searchNearby(lat, lng, category, keyword, maxResults): Promise<ValidatedPlace[]> {
    // Google Places Nearby Search API
    // category → type 매핑 (restaurant, cafe 등)
    // 결과를 ValidatedPlace로 변환
  }
}
```

### 5.3 동선 고려 추천

기존 장소와의 거리를 계산하여 추천 정렬에 반영:

```typescript
// ToolExecutor.handleRecommendPlaces에서
const validated = await this.placeValidationService.validateAndEnrich(places, ...)

// 기존 장소의 centroid 계산
const centroid = this.calculateCentroid(context.existingPlaces)

// 거리 정보 추가
for (const place of validated) {
  if (place.latitude && place.longitude && centroid) {
    place.distanceFromReference = haversineDistance(
      centroid.lat, centroid.lng,
      place.latitude, place.longitude
    )
  }
}

// 거리순 정렬 (가까운 것 우선)
validated.sort((a, b) =>
  (a.distanceFromReference ?? Infinity) - (b.distanceFromReference ?? Infinity)
)
```

### 5.4 중복 추천 방지

시스템 프롬프트에 이미 포함되어 있지만, ToolExecutor에서도 한 번 더 필터링:

```typescript
// ToolExecutor.handleRecommendPlaces
const existingNames = new Set(context.existingPlaces.map(p => p.name))
const filtered = validated.filter(p => !existingNames.has(p.name))
```

---

## 6. 일정 자동 생성 (RQ-3.1)

### 6.1 흐름

```
사용자: "3박 4일 도쿄 일정 만들어줘"
  ↓
Gemini: generate_itinerary 도구 호출
  ↓
ToolExecutor: 프리뷰 데이터 구성 (아직 저장하지 않음)
  ↓
SSE: { type: 'itinerary_preview', itineraryPreview: {...} }
  ↓
클라이언트: 일정 프리뷰 카드 렌더링 + "적용하기" 버튼
  ↓
사용자: "적용하기" 클릭
  ↓
POST /api/projects/[id]/chat/apply-itinerary
  ↓
서버: Itinerary + ItineraryDay + ItineraryItem 생성
```

### 6.2 Apply Itinerary API

**파일**: `app/api/projects/[id]/chat/apply-itinerary/route.ts` (신규)

```typescript
// POST: 채팅에서 생성된 일정 프리뷰를 실제 일정으로 저장
interface ApplyItineraryBody {
  preview: ItineraryPreviewData
}

export async function POST(request, { params }) {
  // 인증 + 프로젝트 접근 확인
  // 기존 일정이 있으면 에러 또는 덮어쓰기 확인
  // preview.days를 순회하며:
  //   1. placeName으로 Place 조회 (없으면 건너뜀)
  //   2. Itinerary + ItineraryDay 생성
  //   3. ItineraryItem 생성 (place 연결)
  // 결과 반환
}
```

### 6.3 프리뷰 컴포넌트

**파일**: `components/chat/ItineraryPreviewCard.tsx` (신규)

```typescript
interface Props {
  preview: ItineraryPreviewData
  onApply: () => void
  onRegenerate: () => void
  isApplying: boolean
}

// 날짜별 타임라인 형태로 렌더링
// "적용하기" + "다시 생성" 버튼
// 장소별 카테고리 아이콘 + 시간 표시
```

---

## 7. 데이터 모델 변경

### 7.1 Prisma Schema 변경 없음

Phase 2-A에서는 기존 Prisma 모델을 그대로 사용한다:
- `ChatSession`, `ChatMessage`, `ChatUsage`: 변경 없음
- `Itinerary`, `ItineraryDay`, `ItineraryItem`: 변경 없음
- `Place`: 변경 없음

`ChatMessage.places` (JSON 필드)에 `isVerified`, `rating` 등 추가 필드가 자연스럽게 포함된다.

### 7.2 향후 고려 (Phase 2-B)

대화 요약을 LLM으로 수행할 경우 `ChatSession`에 `summary` 필드 추가 검토:
```prisma
model ChatSession {
  // ...기존 필드
  summary    String?  @db.Text  // 대화 요약 (Phase 2-B)
}
```

---

## 8. 파일 변경 목록

### 8.1 신규 파일

| 파일 | 레이어 | 목적 |
|------|--------|------|
| `domain/interfaces/IPlaceValidationService.ts` | Domain | 장소 검증 인터페이스 |
| `infrastructure/services/gemini/tools/chatTools.ts` | Infra | Function Declaration 정의 |
| `application/services/chat/ToolExecutor.ts` | App | 도구 실행 오케스트레이터 |
| `application/services/chat/ContextBuilder.ts` | App | 확장 컨텍스트 빌더 |
| `infrastructure/services/PlaceValidationService.ts` | Infra | Google Places 검증 구현 |
| `app/api/projects/[id]/chat/apply-itinerary/route.ts` | UI | 일정 적용 API |
| `components/chat/ItineraryPreviewCard.tsx` | UI | 일정 프리뷰 카드 |
| `hooks/mutations/useApplyItinerary.ts` | Hook | 일정 적용 훅 |

### 8.2 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `domain/interfaces/ILLMService.ts` | `StreamChunk` 타입 확장, `ChatContext` 필드 추가 |
| `infrastructure/services/gemini/GeminiService.ts` | Function Calling 지원, ToolExecutor 연동 |
| `infrastructure/services/gemini/prompts/chatPrompt.ts` | `buildEnhancedSystemPrompt()` 추가 |
| `application/use-cases/chat/SendMessageUseCase.ts` | ContextBuilder 사용, 확장된 context 전달 |
| `infrastructure/container.ts` | 새로운 서비스 팩토리 함수 추가 |
| `app/api/projects/[id]/chat/route.ts` | 확장된 장소 정보 조회 (id, lat, lng 포함) |
| `hooks/mutations/useChatStream.ts` | `tool_call`, `itinerary_preview` 청크 처리 |
| `components/chat/StreamingMessage.tsx` | 일정 프리뷰 렌더링 지원 |
| `components/chat/ChatWindow.tsx` | 일정 프리뷰 적용 핸들러 |
| `components/chat/PlaceCard.tsx` | 검증 배지, 별점, 거리 정보 표시 |

---

## 9. 시퀀스 다이어그램

### 9.1 Function Calling으로 장소 추천

```
User        ChatWindow   API Route   SendMessage   ContextBuilder   Gemini      ToolExecutor   PlaceValidation
 │              │            │           │              │              │              │              │
 │─ "라멘집 추천" ─→│            │           │              │              │              │              │
 │              │── POST ────→│           │              │              │              │              │
 │              │            │── execute ─→│              │              │              │              │
 │              │            │           │── build() ───→│              │              │              │
 │              │            │           │←── context ───│              │              │              │
 │              │            │           │── streamChat ─────────────→│              │              │
 │              │            │           │              │              │── functionCall: │              │
 │              │            │           │              │              │  recommend_places │             │
 │              │            │           │              │              │──────────────→│              │
 │              │            │           │              │              │              │── validate ──→│
 │              │            │           │              │              │              │←── validated ─│
 │              │            │           │              │              │←─ toolResult ─│              │
 │              │            │           │              │              │── text: "추천 맛집!" │         │
 │              │            │           │←─── StreamChunk(text) ──────│              │              │
 │              │            │           │←─── StreamChunk(place) ─────│ (검증된 장소)  │              │
 │              │            │           │←─── StreamChunk(done) ──────│              │              │
 │              │←── SSE ────│           │              │              │              │              │
 │←── 렌더링 ───│            │           │              │              │              │              │
```

### 9.2 일정 자동 생성

```
User         ChatWindow    API Route    Gemini       ToolExecutor     Client         Apply API
 │               │             │           │              │              │              │
 │─ "일정 만들어줘" ─→│          │           │              │              │              │
 │               │── POST ────→│           │              │              │              │
 │               │             │── stream ─→│              │              │              │
 │               │             │           │── functionCall: │             │              │
 │               │             │           │  generate_itinerary          │              │
 │               │             │           │──────────────→│              │              │
 │               │             │           │←── preview ───│              │              │
 │               │             │←── StreamChunk(itinerary_preview) ──────│              │
 │               │←── SSE ─────│           │              │              │              │
 │←── 프리뷰 카드 ──│            │           │              │              │              │
 │               │             │           │              │              │              │
 │─ "적용하기" ───→│            │           │              │              │              │
 │               │─────────────────────────────────────────── POST ────→│              │
 │               │             │           │              │              │── create ───→│
 │               │             │           │              │              │←── result ───│
 │               │←── 완료 ────│           │              │              │              │
 │←── 일정 반영 ──│            │           │              │              │              │
```

---

## 10. 에러 처리 전략

| 시나리오 | 처리 |
|----------|------|
| Function Call 미발생 (Gemini가 텍스트만 생성) | `parsePlaces()` fallback으로 기존 방식 시도 |
| Function Call 인자 부적합 | Zod 검증 후 에러 메시지 사용자에게 전달 |
| Places API 검증 실패 | `isVerified: false`로 표시, 장소 자체는 반환 |
| Places API 할당량 초과 | 미검증 상태로 반환 + 로그 |
| 일정 프리뷰 장소 미매칭 | 해당 아이템 건너뛰기 + 사용자에게 알림 |
| ToolExecutor 예외 | 에러 로그 + 사용자 친화적 메시지 |

---

## 11. 비용 영향

### 11.1 추가 비용 요소

| 항목 | 단가 | 월간 추정 (100 DAU) |
|------|------|---------------------|
| Google Places Text Search | $0.032/요청 | ~$48 (장소 추천 시) |
| Google Places Nearby Search | $0.032/요청 | ~$16 (근처 검색 시) |
| Gemini Function Calling | 기존과 동일 | $0 추가 |

### 11.2 비용 절감 요소

| 항목 | 절감 |
|------|------|
| Function Calling으로 파싱 실패 재시도 감소 | -10% API 호출 |
| 대화 요약으로 토큰 절감 | -15~20% 입력 토큰 |

### 11.3 총 비용 전망

| 항목 | 현재 | Phase 2-A |
|------|------|-----------|
| Gemini API | $58/월 | $50/월 (요약으로 절감) |
| Google Places | $24/월 | $88/월 (검증 추가) |
| **합계** | **$82/월** | **$138/월** |

Places API 캐싱(동일 장소 재검증 방지)으로 $88 → $50 수준으로 최적화 가능.

---

## 12. 구현 순서

```
Step 1: 기반 타입 확장
  ├── ILLMService.ts: StreamChunk, ChatContext 확장
  ├── IPlaceValidationService.ts: 신규 인터페이스
  └── chatTools.ts: Function Declaration 정의

Step 2: 서비스 구현
  ├── ContextBuilder.ts: 확장 컨텍스트 빌더
  ├── PlaceValidationService.ts: Google Places 연동
  └── ToolExecutor.ts: 도구 실행기

Step 3: GeminiService 리팩토링
  ├── GeminiService.ts: Function Calling 지원
  ├── chatPrompt.ts: 확장 프롬프트
  └── SendMessageUseCase.ts: ContextBuilder 연동

Step 4: API + 클라이언트
  ├── chat/route.ts: 확장 장소 조회
  ├── apply-itinerary/route.ts: 일정 적용 API
  ├── useChatStream.ts: 새 청크 타입 처리
  ├── PlaceCard.tsx: 검증 배지/별점
  ├── ItineraryPreviewCard.tsx: 일정 프리뷰
  └── StreamingMessage.tsx: 프리뷰 렌더링

Step 5: DI + 통합
  ├── container.ts: 팩토리 함수 추가
  └── 통합 테스트
```

---

## 13. 열린 설계 결정

| # | 결정 사항 | 권장안 | 대안 |
|---|-----------|--------|------|
| 1 | Function Call 결과를 Gemini에 다시 전달할지 | **전달하지 않음** (단일 턴 도구 호출). 결과를 직접 클라이언트에 스트리밍 | 멀티턴 도구 호출 (복잡도 증가) |
| 2 | Places API 캐싱 위치 | **인메모리 LRU** (서버리스 한계 있지만 단순) | Redis (별도 인프라 필요) |
| 3 | 일정 프리뷰에서 기존 일정 존재 시 | **병합 옵션 제공** (덮어쓰기/병합/취소) | 항상 새로 생성 |
| 4 | 대화 요약 방식 | **키워드 추출 (Phase 2-A)** → LLM 요약 (Phase 2-B) | 처음부터 LLM 요약 (비용 증가) |

---

## 14. 다음 단계

1. 이 설계 문서 승인
2. `/sc:workflow` → 구현 워크플로우 생성
3. `/sc:implement` → Step별 구현 진행
