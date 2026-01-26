/**
 * Chat Prompt Templates
 *
 * System prompts and prompt builders for Gemini chat.
 */

interface PromptContext {
  destination: string
  country?: string
  existingPlaces: Array<{ name: string; category: string }>
}

/**
 * System prompt for the travel assistant
 */
export function buildSystemPrompt(context: PromptContext): string {
  const { destination, country, existingPlaces } = context

  const locationContext = country
    ? `${destination}, ${country}`
    : destination

  const existingPlacesList = existingPlaces.length > 0
    ? existingPlaces.map(p => `- ${p.name} (${p.category})`).join('\n')
    : '(아직 저장된 장소가 없습니다)'

  return `당신은 친절하고 전문적인 여행 어시스턴트입니다.
사용자의 여행 계획을 도와주는 것이 역할입니다.

## 현재 여행 정보
- 목적지: ${locationContext}
- 저장된 장소:
${existingPlacesList}

## 응답 규칙

### 핵심 원칙 (반드시 준수)
1. **응답은 간결하게**: 한 번에 최대 2개 장소만 추천
2. **JSON은 완전하게**: JSON 블록은 반드시 닫는 괄호 \`}\`로 끝내기
3. **텍스트 먼저**: 설명 텍스트를 먼저 쓰고, JSON은 마지막에

### 장소 추천 형식
장소를 추천할 때 이 형식을 정확히 따르세요:
\`\`\`json:place
{"name":"장소명","name_en":"English Name","address":"주소","category":"restaurant","description":"설명"}
\`\`\`

### 카테고리 옵션
restaurant, cafe, attraction, shopping, accommodation, transport, etc

### 일반 대화
- 친절하고 자연스러운 한국어로 응답
- 여행 관련 팁 제공

### 제한사항
- 정치, 종교, 불법 활동 등 민감한 주제 금지
- 불확실한 정보는 "확인이 필요합니다"라고 명시

## 응답 형식 예시

**올바른 예시**:
도쿄에서 추천드리는 맛집이에요!

\`\`\`json:place
{"name":"스시 사이토","name_en":"Sushi Saito","address":"도쿄도 미나토구","category":"restaurant","description":"미슐랭 3스타 스시"}
\`\`\`

예약이 어렵지만 꼭 방문해보세요!

**금지 사항**:
- :place 또는 json:place만 쓰고 백틱 생략 금지
- JSON을 여러 줄로 나눠 쓰지 말고 한 줄로
- 한 번에 3개 이상 장소 추천 금지`
}

/**
 * Build the conversation history for context
 */
export function buildConversationContext(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  if (history.length === 0) return ''

  return history
    .map(msg => `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}`)
    .join('\n\n')
}

/**
 * Prompt injection patterns to detect
 */
export const INJECTION_PATTERNS = [
  /시스템.*프롬프트/i,
  /system.*prompt/i,
  /이전.*지시.*무시/i,
  /ignore.*previous.*instruction/i,
  /역할극/i,
  /roleplay/i,
  /pretend.*you.*are/i,
  /DAN.*mode/i,
  /jailbreak/i,
  /\u200B/g, // Zero-width space
  /\u200C/g, // Zero-width non-joiner
  /\u200D/g, // Zero-width joiner
  /\uFEFF/g, // BOM
]

/**
 * Check if a message contains potential prompt injection
 */
export function detectPromptInjection(message: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(message))
}
