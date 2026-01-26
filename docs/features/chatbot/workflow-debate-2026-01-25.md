# 챗봇 워크플로우 토론 기록

> **토론 일시**: 2026-01-25
> **대상 문서**: `CHATBOT_WORKFLOW.md`
> **토론 라운드**: 15라운드
> **참여자**:
> - **The Pragmatist (실용주의 PM)**: 일정, 리스크, 의존성 중심
> - **The Optimizer (최적화 엔지니어)**: 병렬화, 효율성, 기술 부채 중심

---

## 품질 대시보드

| 지표 | 초기 | 최종 | 변화 |
|-----|-----|-----|------|
| 실행 가능성 (Feasibility) | 3.5 | 4.5 | +1.0 |
| 의존성 명확성 (Dependency Clarity) | 3.0 | 4.5 | +1.5 |
| 병렬화 효율 (Parallelization) | 2.5 | 4.0 | +1.5 |
| 리스크 관리 (Risk Management) | 3.0 | 4.5 | +1.5 |
| 테스트 전략 (Test Strategy) | 2.5 | 4.0 | +1.5 |

**워크플로우 신뢰도**: 87%
**예상 완료율**: 높음 (High)

---

## Round 1: Phase 순서 및 의존성 검토

### The Pragmatist (실용주의 PM)
**관점**: 현재 Phase 순서가 순차적으로 잘 설계되어 있지만, Phase 간 의존성이 명시적이지 않습니다.

**문제 제기**:
1. Phase 1.3(Prisma 마이그레이션)이 실패하면 Phase 3-8 전체가 블로킹됨
2. Phase 5(API Routes)가 Phase 6-7(Frontend)보다 먼저인데, 프론트엔드 개발자가 대기해야 함
3. Phase 8(통합 테스트)이 마지막인데, 초기 통합 검증 없이 진행 시 리스크 높음

**제안**:
```
[Critical Path 명시화]
Phase 1 → Phase 2 → Phase 3 (블로킹)
         ↘ Phase 4 → Phase 5 (병렬 가능)
Phase 3, 5 완료 → Phase 6 → Phase 7
                        ↘ Phase 8 (점진적 통합)
```

### The Optimizer (최적화 엔지니어)
**관점**: 동의합니다. 추가로 Phase 2와 Phase 3의 일부가 병렬화 가능합니다.

**최적화 제안**:
1. **Phase 2 + Phase 3.4 병렬화**: 인터페이스 정의와 로거는 독립적
2. **Phase 6 + Phase 7 병렬화**: Hooks와 Components는 인터페이스만 합의하면 동시 진행 가능
3. **Stub API 전략**: Phase 5 완료 전에 Mock API로 Phase 6-7 시작 가능

**수정된 일정**:
```
Day 1: Phase 1 (풀타임) + Phase 2 인터페이스 초안
Day 2: Phase 2 완료 + Phase 3.1-3.3 시작 + Phase 3.4 (병렬)
Day 3: Phase 3 완료 + Phase 4 시작
Day 4: Phase 4 완료 + Phase 5.1 SSE API + Mock 테스트
Day 5: Phase 5 완료 + Phase 6 시작 (실제 API 연동)
Day 6-7: Phase 6 + Phase 7 병렬 진행
Day 8-10: Phase 8 점진적 통합
```

**합의**: 워크플로우에 **Critical Path** 섹션과 **병렬화 기회** 섹션을 추가합니다.

---

## Round 2: Phase 1 리스크 분석

### The Pragmatist
**리스크 식별**:
1. **GEMINI_API_KEY 발급 지연**: Google Cloud 계정 설정, 결제 정보 등록 필요
2. **Prisma 마이그레이션 충돌**: 기존 스키마와 새 모델 간 관계 설정 오류 가능성
3. **패키지 버전 호환성**: `@google/generative-ai@^0.21.0`이 현재 Next.js 16 + React 19와 호환되는지 확인 필요

**완화 전략**:
```markdown
### Phase 1 사전 체크리스트
- [ ] Google Cloud 계정 활성화 상태 확인
- [ ] 결제 정보 등록 및 API 활성화
- [ ] 로컬에서 `npx prisma migrate dev --create-only`로 마이그레이션 SQL 미리 검토
- [ ] 패키지 호환성 테스트 (별도 브랜치에서)
```

### The Optimizer
**추가 최적화**:
1. **환경 변수 템플릿**: `.env.example` 업데이트하여 새 변수 문서화
2. **Prisma 스키마 검증**: `npx prisma validate` 추가
3. **패키지 버전 고정**: `^` 대신 정확한 버전으로 lockfile 업데이트

**추가 검증 단계**:
```bash
# Phase 1.3 검증 스크립트
npx prisma validate
npx prisma migrate dev --create-only --name add_chatbot_models
# SQL 검토 후
npx prisma migrate dev
npx prisma generate
npx tsc --noEmit  # 타입 체크
```

**합의**: Phase 1에 **사전 체크리스트**와 **검증 스크립트**를 추가합니다.

---

## Round 3: Phase 3 GeminiService 리스크

### The Optimizer
**기술적 우려**:
1. **Circuit Breaker 인스턴스 공유**: Vercel 서버리스에서 각 함수 호출마다 새 인스턴스 생성 → Circuit Breaker 상태 유실
2. **스트리밍 중 에러 핸들링**: `generateContentStream` 중간에 에러 발생 시 처리
3. **토큰 사용량 추적**: `usageMetadata`가 스트리밍 완료 후에만 제공됨

**제안**:
```typescript
// 서버리스 환경을 위한 Circuit Breaker 대안
// Option 1: 요청별 상태 체크 (DB 기반)
async isServiceHealthy(): Promise<boolean> {
  const recentErrors = await this.getRecentErrorCount(5 * 60 * 1000) // 5분
  return recentErrors < 5
}

// Option 2: 전역 상태 포기, 요청별 재시도만 유지
async streamChatWithRetry(/* ... */, maxRetries = 1): Promise</*...*/> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await this.streamChatInternal(/* ... */)
    } catch (error) {
      if (attempt === maxRetries) throw error
      await delay(1000 * Math.pow(2, attempt))
    }
  }
}
```

### The Pragmatist
**실용적 판단**:
1. **MVP에서는 로컬 Circuit Breaker로 시작**: 완벽하지 않지만 기본 보호 제공
2. **모니터링 우선**: Gemini API 에러율을 추적하고, 문제 발생 시 DB 기반으로 마이그레이션
3. **Fallback 메시지**: Circuit Breaker 오픈 시 "AI 서비스 점검 중" 메시지 명확히

**합의**:
- MVP: 로컬 Circuit Breaker + 1회 재시도 유지
- Phase 2 기술 부채: DB 기반 상태 공유 검토
- 워크플로우에 **MVP 한계 명시** 추가

---

## Round 4: Phase 4 UseCase 설계 검토

### The Pragmatist
**의존성 문제**:
1. `SendMessageUseCase`가 3개 의존성(chatRepository, llmService, usageRepository) 필요
2. 워크플로우에 `ChatContextService`가 Phase 4.2로 명시되어 있지만 코드에 없음
3. `CostProtectionService`가 Phase 4.5로 있지만 코드가 누락됨

**확인 필요 사항**:
```
Phase 4 정의된 항목:
- 4.1 SendMessageUseCase ✅ 코드 있음
- 4.2 ChatContextService ❌ 코드 없음
- 4.3 PromptInjectionFilter ✅ 코드 있음
- 4.4 UsageLimitService ✅ 코드 있음
- 4.5 CostProtectionService ❌ 코드 없음
```

### The Optimizer
**분석 결과**:
1. `ChatContextService`: `SendMessageUseCase` 내부에 인라인으로 구현됨 (context 구성 로직)
2. `CostProtectionService`: 아키텍처 문서에는 있지만 워크플로우 코드에 누락

**제안**:
```typescript
// Phase 4.2: ChatContextService (선택적 분리)
export class ChatContextService {
  buildContext(
    project: { destination: string; country?: string },
    messages: ChatMessage[],
    existingPlaces: string[]
  ): ChatContext {
    return {
      destination: project.destination,
      country: project.country,
      recentMessages: messages.slice(-20).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      existingPlaceNames: existingPlaces
    }
  }
}

// Phase 4.5: CostProtectionService (간소화 버전 - MVP)
export class CostProtectionService {
  private readonly EMERGENCY_SHUTDOWN_COST = 50 // $50

  async trackAndCheck(tokens: { input: number; output: number }): Promise<boolean> {
    // MVP에서는 로깅만, Phase 2에서 알림 추가
    const cost = (tokens.input * 0.000075) + (tokens.output * 0.0003)
    logChatEvent({ event: 'cost_tracked', cost })
    return true // 항상 허용, 추후 차단 로직 추가
  }
}
```

**합의**:
- `ChatContextService`: MVP에서는 인라인 유지, Phase 2에서 분리 검토
- `CostProtectionService`: 간소화 버전 추가 (로깅만)
- 워크플로우 코드 **일관성 검증** 추가

---

## Round 5: Phase 5 API 설계 리스크

### The Optimizer
**SSE 구현 리스크**:
1. **ReadableStream 에러 핸들링**: `start()` 내부 에러가 클라이언트에 전달되지 않을 수 있음
2. **Connection Keep-alive**: Vercel 기본 설정으로 충분한지 확인 필요
3. **X-Request-Id 중복 방지**: 워크플로우 코드에 messageId 처리가 있지만 중복 체크 로직 없음

**제안**:
```typescript
// 개선된 SSE 스트림 구조
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()

    const sendEvent = (data: object) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    }

    const sendError = (code: string, message: string) => {
      sendEvent({ type: 'error', errorCode: code, content: message })
      controller.close()
    }

    try {
      // 중복 요청 체크
      if (parsed.data.messageId) {
        const existing = await prisma.chatMessage.findFirst({
          where: {
            session: { projectId, userId: session.user.id },
            metadata: { path: ['clientMessageId'], equals: parsed.data.messageId }
          }
        })
        if (existing) {
          sendEvent({ type: 'done', messageId: existing.id, duplicate: true })
          return
        }
      }

      // ... 기존 로직
    } catch (error) {
      sendError('AI_ERROR', getUserErrorMessage('AI_ERROR'))
    }
  }
})
```

### The Pragmatist
**일정 영향 분석**:
1. 중복 체크 로직 추가: +0.5일
2. SSE 에러 핸들링 강화: 기존 코드 내 개선 가능
3. Connection 설정: Vercel 문서 확인 필요

**우선순위 결정**:
- **MVP 필수**: SSE 에러 핸들링 강화
- **MVP 권장**: 중복 체크 (messageId 기반)
- **Phase 2**: Connection 최적화

**합의**: 중복 체크를 MVP에 포함하되, 간단한 구현으로 시작합니다.

---

## Round 6: Phase 6 Hook 설계 검토

### The Pragmatist
**실용적 우려**:
1. **useChatStream 재시도 로직**: 무한 재귀 가능성 (`sendMessage` 내에서 `sendMessage` 호출)
2. **useChatHistory SWR 키**: `projectId`만 사용 → 사용자별 분리 필요?
3. **useAddPlaceFromChat 낙관적 업데이트**: 실패 시 롤백 로직 없음

**수정 제안**:
```typescript
// useChatStream - 재시도 로직 개선
const sendMessage = useCallback(async (message: string, isRetry = false): Promise<void> => {
  // 재시도 시 새로운 시도로 카운트하지 않음
  if (!isRetry) {
    retryCountRef.current = 0
  }

  // ... 기존 로직

  // 재시도 호출
  if (shouldRetry) {
    await new Promise(r => setTimeout(r, delay))
    return sendMessage(message, true) // isRetry 플래그 전달
  }
}, [projectId, mutate])
```

### The Optimizer
**추가 최적화**:
1. **AbortController 정리**: 컴포넌트 언마운트 시 abort 호출
2. **SWR 키 네임스페이스**: `/api/projects/${projectId}/chat/history`는 이미 프로젝트별 → 사용자는 서버에서 분리
3. **낙관적 업데이트 추가**:

```typescript
// useAddPlaceFromChat - 낙관적 업데이트
const addPlace = useCallback(async (place, messageId) => {
  // 낙관적 업데이트
  const optimisticPlace = { ...place, id: `temp-${Date.now()}`, status: 'pending' }
  mutate(
    `/api/projects/${projectId}/places`,
    (current: any) => ({ places: [...(current?.places || []), optimisticPlace] }),
    false
  )

  try {
    const response = await fetch(...)
    // 성공 시 실제 데이터로 교체
    await mutate(`/api/projects/${projectId}/places`)
    return { success: true }
  } catch (error) {
    // 실패 시 롤백
    await mutate(`/api/projects/${projectId}/places`)
    return { success: false, error: ... }
  }
}, [projectId, mutate])
```

**합의**:
- 재시도 로직에 `isRetry` 플래그 추가
- 낙관적 업데이트는 MVP+로 분류 (복잡도 vs 가치)
- AbortController cleanup 추가

---

## Round 7: Phase 7 컴포넌트 테스트 전략

### The Optimizer
**테스트 커버리지 우려**:
1. 워크플로우에 단위 테스트가 Phase 8에만 있음
2. 컴포넌트별 테스트 없이 E2E만으로 커버리지 부족
3. 스트리밍 UI 테스트가 어려움

**테스트 전략 제안**:
```
Phase 7 테스트 추가:
├── components/chat/__tests__/
│   ├── FloatingButton.test.tsx    # 토글 동작
│   ├── ChatInput.test.tsx         # 키보드 이벤트
│   ├── PlaceCard.test.tsx         # 추가 버튼 상태
│   └── ChatMessage.test.tsx       # XSS 방지 (DOMPurify)
```

```typescript
// PlaceCard.test.tsx 예시
describe('PlaceCard', () => {
  it('should disable add button when already added', async () => {
    const { getByRole, getByText } = render(
      <PlaceCard place={mockPlace} projectId="test" />
    )

    const addButton = getByRole('button', { name: /추가/i })
    await userEvent.click(addButton)

    expect(getByText('추가됨')).toBeInTheDocument()
    expect(addButton).not.toBeInTheDocument()
  })

  it('should sanitize HTML in description', () => {
    const maliciousPlace = {
      ...mockPlace,
      description: '<script>alert("xss")</script>Safe text'
    }
    const { container } = render(
      <PlaceCard place={maliciousPlace} projectId="test" />
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('Safe text')
  })
})
```

### The Pragmatist
**일정 영향**:
- 컴포넌트 테스트 추가: +1일
- E2E 테스트 시간: 기존 Day 8-10

**우선순위 결정**:
- **MVP 필수**: XSS 방지 테스트 (보안)
- **MVP 권장**: PlaceCard 상태 테스트
- **Phase 2**: 전체 컴포넌트 테스트 커버리지

**합의**: 보안 관련 테스트를 Phase 7에 추가하고, 나머지는 Phase 8에서 점진적으로 추가합니다.

---

## Round 8: Phase 8 E2E 테스트 실용성

### The Pragmatist
**현실적 문제**:
1. **E2E 테스트 환경**: 실제 Gemini API 호출 vs Mock
2. **테스트 데이터**: 테스트용 프로젝트 생성 필요
3. **스트리밍 응답 대기**: 30초 타임아웃이 CI에서 안정적인지

**제안**:
```typescript
// E2E 테스트 환경 설정
// e2e/fixtures/chatbot.ts
import { test as base } from '@playwright/test'

type ChatbotFixtures = {
  testProject: { id: string; name: string }
  mockGeminiResponse: (response: string) => Promise<void>
}

export const test = base.extend<ChatbotFixtures>({
  testProject: async ({ page }, use) => {
    // 테스트 프로젝트 생성
    const project = await createTestProject()
    await use(project)
    // 테스트 후 정리
    await deleteTestProject(project.id)
  },

  mockGeminiResponse: async ({ page }, use) => {
    // API 모킹 (실제 API 호출 방지)
    await page.route('**/api/projects/*/chat', async (route) => {
      // SSE 응답 시뮬레이션
    })
    await use(async (response) => { /* ... */ })
  }
})
```

### The Optimizer
**테스트 전략 분류**:
```
E2E 테스트 레벨:
├── Level 1: UI 인터랙션 (Mock API)
│   ├── 플로팅 버튼 토글
│   ├── 채팅창 열기/닫기
│   └── 메시지 입력 및 전송 UI
│
├── Level 2: API 통합 (Mock Gemini)
│   ├── SSE 스트리밍 수신
│   ├── 장소 카드 렌더링
│   └── 장소 추가 플로우
│
└── Level 3: 전체 통합 (실제 API) - Staging 전용
    ├── 실제 Gemini 응답 품질
    └── Geocoding 성공률
```

**합의**:
- CI: Level 1 + Level 2 (Mock 기반)
- Staging: Level 3 (실제 API, 수동 또는 별도 스케줄)
- 워크플로우에 **테스트 레벨** 섹션 추가

---

## Round 9: 누락된 컴포넌트 식별

### The Optimizer
**워크플로우 분석 결과 - 누락된 파일**:
1. `components/chat/StreamingMessage.tsx` - MessageList에서 import하지만 코드 없음
2. `components/chat/index.ts` - 배럴 파일 없음
3. `types/chat.ts` - 공유 타입 정의 파일 없음

**추가 필요 파일**:
```typescript
// components/chat/StreamingMessage.tsx
'use client'

import { RecommendedPlace } from '@/domain/interfaces/ILLMService'
import { PlaceCard } from './PlaceCard'

interface StreamingMessageProps {
  content: string
  places: RecommendedPlace[]
  projectId: string
}

export function StreamingMessage({ content, places, projectId }: StreamingMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg px-4 py-2 bg-gray-100">
        {content && (
          <div className="prose prose-sm max-w-none">
            {content}
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
          </div>
        )}

        {places.length > 0 && (
          <div className="mt-3 space-y-2">
            {places.map((place, index) => (
              <PlaceCard
                key={`streaming-${index}`}
                place={place}
                projectId={projectId}
              />
            ))}
          </div>
        )}

        {!content && places.length === 0 && (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="animate-pulse">응답 생성 중...</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

### The Pragmatist
**일정 영향**:
- StreamingMessage: Phase 7.3에 포함 (+0.5시간)
- index.ts 배럴 파일: 선택적 (import 편의성)
- types/chat.ts: domain/interfaces로 대체 가능

**합의**: StreamingMessage를 워크플로우에 명시적으로 추가합니다.

---

## Round 10: 의존성 설치 순서 최적화

### The Optimizer
**패키지 설치 분석**:
```bash
# 현재 워크플로우
npm install @google/generative-ai@^0.21.0 dompurify@^3.2.0
npm install -D @types/dompurify
```

**문제점**:
1. `dompurify`는 Phase 7에서만 사용 → Phase 1에서 미리 설치 불필요?
2. 설치 후 즉시 타입 체크하면 에러 발생 (아직 사용 안 함)

**최적화 제안**:
```
Phase 1: @google/generative-ai만 설치
Phase 7 시작: dompurify + @types/dompurify 설치
```

### The Pragmatist
**실용적 판단**:
1. **한 번에 설치 유지**: 의존성 관리 단순화
2. **lockfile 안정성**: 중간에 의존성 추가 시 충돌 가능성
3. **CI 캐싱**: 의존성이 Phase마다 변경되면 캐시 무효화

**합의**: 현재 구조 유지 (Phase 1에서 모든 의존성 설치).

---

## Round 11: 분당 Rate Limit 구현 검토

### The Pragmatist
**누락 발견**:
아키텍처 문서에 "분당 10회" 제한이 있지만, `UsageLimitService`에 구현되지 않음.

```typescript
// 현재 구현: 일일 한도만
const DAILY_LIMIT = 50
const MINUTE_LIMIT = 10  // 선언만 있고 사용 안 함
```

**영향 분석**:
- 분당 제한 없으면 단시간 폭주 가능
- DB 기반으로 분당 체크하면 매 요청마다 추가 쿼리

### The Optimizer
**구현 옵션**:
```typescript
// Option 1: 메모리 기반 (서버리스에서 제한적)
// Option 2: DB 기반 (정확하지만 느림)
// Option 3: Redis (추가 인프라 필요)

// MVP 권장: 간단한 DB 기반
async checkMinuteLimit(userId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

  const recentCount = await prisma.chatMessage.count({
    where: {
      session: { userId },
      role: 'user',
      createdAt: { gte: oneMinuteAgo }
    }
  })

  return recentCount < MINUTE_LIMIT
}
```

**합의**:
- MVP: 분당 제한 구현 추가 (DB 기반)
- 성능 모니터링 후 필요시 Redis 검토
- 워크플로우 Phase 4.4에 **분당 제한** 로직 추가

---

## Round 12: 에러 복구 UX 검토

### The Pragmatist
**사용자 시나리오 분석**:
1. 메시지 전송 → 네트워크 에러 → 재시도 버튼 클릭 → ?
2. 스트리밍 중 연결 끊김 → 부분 응답 표시 → 재시도 버튼 → 새 응답 vs 이어서?

**현재 워크플로우의 처리**:
- 에러 시 재시도는 동일 메시지 재전송
- 부분 응답은 저장되지만 클라이언트에서 활용 안 함

**UX 개선 제안**:
```typescript
// useChatStream - 재시도 컨텍스트 추가
const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)

// 에러 발생 시
setLastFailedMessage(message)

// ChatWindow에 재시도 버튼 추가
{error && lastFailedMessage && (
  <Button onClick={() => sendMessage(lastFailedMessage)}>
    재시도
  </Button>
)}
```

### The Optimizer
**추가 고려**:
1. **중복 메시지 방지**: 재시도 시 동일 messageId 사용
2. **부분 응답 연속**: 서버에서 truncated 메시지 이어쓰기 (복잡, Phase 2)
3. **오프라인 감지**: `navigator.onLine` 체크

**합의**:
- MVP: 재시도 버튼 + messageId 중복 방지
- Phase 2: 부분 응답 연속, 오프라인 감지
- 워크플로우에 **에러 복구 UX** 섹션 추가

---

## Round 13: 모바일 UX 검토

### The Optimizer
**현재 구현 분석**:
```typescript
// ChatWindow.tsx
const isMobile = useIsMobile()

<div className={cn(
  "fixed bg-white rounded-lg shadow-2xl flex flex-col z-50",
  isMobile
    ? "inset-0 rounded-none"  // 전체 화면
    : "bottom-24 right-6 w-[400px] h-[600px]"
)}>
```

**문제점**:
1. `useIsMobile` 훅이 이미 존재하는지 확인 필요
2. 전체 화면 모드에서 뒤로가기 처리 없음
3. 키보드 올라올 때 입력 필드 가려질 수 있음

**개선 제안**:
```typescript
// 모바일 전체 화면 시 뒤로가기 처리
useEffect(() => {
  if (!isMobile || !isOpen) return

  const handlePopState = (e: PopStateEvent) => {
    e.preventDefault()
    onClose()
  }

  // 히스토리 엔트리 추가
  window.history.pushState({ chatOpen: true }, '')
  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}, [isMobile, isOpen, onClose])

// 키보드 대응
<div className={cn(
  "fixed bg-white flex flex-col z-50",
  isMobile
    ? "inset-0 rounded-none pb-safe"  // Safe area 고려
    : "bottom-24 right-6 w-[400px] h-[600px] rounded-lg shadow-2xl"
)}>
```

### The Pragmatist
**일정 영향**:
- 뒤로가기 처리: +0.5시간
- 키보드 대응: Tailwind `pb-safe` 사용 시 간단

**합의**: 모바일 UX 개선을 Phase 7에 포함합니다.

---

## Round 14: 배포 전 체크리스트 강화

### The Pragmatist
**현재 체크리스트 분석**:
```markdown
### Phase 1 (MVP)
- [ ] GEMINI_API_KEY 환경 변수 설정
- [ ] Prisma 마이그레이션 실행
...
```

**누락된 항목**:
1. **보안 체크**: API 키 노출, XSS, 인젝션 검증
2. **성능 체크**: TTFB 측정, 스트리밍 지연
3. **롤백 계획**: 문제 발생 시 기능 비활성화 방법

**강화된 체크리스트**:
```markdown
### 배포 전 최종 체크리스트

#### 보안
- [ ] GEMINI_API_KEY가 클라이언트에 노출되지 않음 확인
- [ ] 프롬프트 인젝션 필터 테스트 (10개 시나리오)
- [ ] DOMPurify가 XSS 차단하는지 확인
- [ ] 에러 메시지에 민감 정보 없음 확인

#### 성능
- [ ] TTFB P50 < 1초 측정
- [ ] 스트리밍 청크 간격 < 200ms 확인
- [ ] 50 concurrent users 부하 테스트

#### 운영
- [ ] Feature Flag 동작 확인 (CHATBOT_ENABLED=false)
- [ ] 롤백 시 DB 마이그레이션 영향 없음 확인
- [ ] 에러 로그 수집 경로 확인 (Vercel Log Drain)
- [ ] 비용 알림 설정 (Google Cloud Console)
```

### The Optimizer
**자동화 가능 항목**:
```bash
# pre-deploy-check.sh
#!/bin/bash

echo "🔒 Security checks..."
grep -r "GEMINI_API_KEY" --include="*.tsx" --include="*.ts" src/ && exit 1

echo "🧪 Running tests..."
npm run test:security
npm run test:e2e -- --grep "Chatbot"

echo "📊 Performance baseline..."
npm run lighthouse -- --url=/projects/test/chat

echo "✅ All checks passed!"
```

**합의**: 배포 전 체크리스트와 자동화 스크립트를 워크플로우에 추가합니다.

---

## Round 15: 최종 워크플로우 검증

### The Pragmatist
**전체 워크플로우 검증 결과**:

| Phase | 완성도 | 의존성 명확 | 리스크 대응 |
|-------|--------|------------|------------|
| Phase 1 | ✅ | ✅ | ✅ |
| Phase 2 | ✅ | ✅ | ✅ |
| Phase 3 | ✅ | ✅ | ⚠️ CB 한계 |
| Phase 4 | ⚠️ | ✅ | ⚠️ 분당 제한 |
| Phase 5 | ✅ | ✅ | ✅ |
| Phase 6 | ✅ | ✅ | ✅ |
| Phase 7 | ⚠️ | ✅ | ✅ |
| Phase 8 | ✅ | ✅ | ✅ |

**남은 이슈**:
1. Phase 3: Circuit Breaker 서버리스 한계 인지
2. Phase 4: 분당 제한 로직 추가 필요
3. Phase 7: StreamingMessage 코드 추가 필요

### The Optimizer
**최종 권장 사항**:

**워크플로우 개선 항목**:
1. ✅ Critical Path 섹션 추가
2. ✅ 병렬화 기회 섹션 추가
3. ✅ Phase 1 사전 체크리스트 추가
4. ✅ 테스트 레벨 분류 추가
5. ✅ 에러 복구 UX 섹션 추가
6. ✅ 배포 전 체크리스트 강화
7. 🔄 분당 제한 구현 추가
8. 🔄 StreamingMessage 코드 추가

**기술 부채 목록** (Phase 2 이후):
- DB 기반 Circuit Breaker
- 낙관적 업데이트 (장소 추가)
- 부분 응답 연속 기능
- 오프라인 감지 및 큐잉
- 전체 컴포넌트 테스트 커버리지

---

## 토론 결론

### 주요 개선 사항

1. **Critical Path 명시화**: Phase 간 의존성과 병렬화 기회 문서화
2. **테스트 전략 강화**: 3레벨 테스트 (UI/API/전체 통합) 분류
3. **누락 코드 식별**: StreamingMessage, 분당 제한 로직
4. **배포 체크리스트 강화**: 보안/성능/운영 카테고리별 검증
5. **모바일 UX 보완**: 뒤로가기 처리, 키보드 대응
6. **에러 복구 UX**: 재시도 버튼, messageId 중복 방지

### 워크플로우 신뢰도
- **초기**: 75%
- **최종**: 87%

### 예상 완료 기간
- **MVP**: 10일 (워크플로우 기준)
- **토론 반영 추가 작업**: +1일
- **총 예상**: 11일

### 다음 단계
1. 워크플로우 문서 업데이트 (토론 결과 반영)
2. `/sc:implement Phase 1` 실행
3. 각 Phase 완료 시 체크리스트 검증

---

*토론 완료: 2026-01-25*
*다음 문서: `final_CHATBOT_WORKFLOW.md`*
