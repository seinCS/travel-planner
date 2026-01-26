# 챗봇 아키텍처 디베이트 로그

> **대상 문서**: `docs/features/chatbot/CHATBOT_ARCHITECTURE.md`
> **작성일**: 2026-01-25
> **토론 형식**: 20라운드 기술 토론

---

## 기술 품질 대시보드

| 항목 | 점수 (1-5) | 설명 |
|------|------------|------|
| **Robustness (견고성)** | 4.0 | 재시도, graceful degradation 존재. 부분 응답 저장 고려됨 |
| **Scalability (확장성)** | 4.0 | Vercel 서버리스 기반, 수평 확장 가능. 세션 스토리지 병목 잠재 |
| **Maintainability (유지보수성)** | 4.5 | Clean Architecture 준수, 계층 분리 명확 |
| **Cost-Efficiency (비용 효율성)** | 4.0 | Gemini Flash 선택, 사용량 제한 적용. 캐싱 전략 보완 필요 |

**설계 합의 상태**: ✅ **Proven** (검증됨)

**아키텍처 신뢰도**: **82%**

---

## 핵심 아키텍처 변경 사항 (토론 결과)

1. **Circuit Breaker 패턴 추가** (Round 3)
2. **Redis 기반 Rate Limiting 검토** (Round 5)
3. **응답 캐싱 레이어 추가 권장** (Round 8)
4. **SSE 연결 풀링/재사용 전략 명시** (Round 9)
5. **메시지 암호화 at-rest 고려** (Round 14)
6. **구조화 로깅 + 분산 트레이싱 추가** (Round 16)
7. **Blue-Green 배포 전략 명시** (Round 20)

---

## 전체 20라운드 기술 토론 기록

---

### ROUND 1 / 20

**FOCUS**: 핵심 아키텍처 패턴 선정 - 레이어드 아키텍처 + SSE 스트리밍

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
레이어드 아키텍처와 SSE 스트리밍의 조합은 탁월한 선택입니다. 기존 Clean Architecture 기반 위에 챗봇 기능을 자연스럽게 통합할 수 있으며, SSE는 Vercel 서버리스 환경에서 WebSocket보다 운영 복잡도가 낮습니다.

**설계 근거**:
- **확장성**: 레이어 분리로 각 계층 독립 스케일링 가능
- **성능**: SSE는 단방향 스트리밍에 최적화, 낮은 오버헤드
- **유연성**: 도메인 계층 분리로 LLM 교체(Gemini → Claude) 용이

**Architecture 제안**:
- 향후 양방향 통신 필요 시 WebSocket 레이어 추가 확장 가능
- Event-Driven 패턴으로 비동기 처리 확장 고려

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
SSE 선택은 합리적이나, Vercel 서버리스의 Cold Start와 60초 타임아웃 제약을 고려해야 합니다. 또한 SSE 연결이 끊어졌을 때의 복구 전략이 명확하지 않습니다.

**위험 요소**:
- **복잡도**: SSE 상태 관리가 클라이언트 측에서 복잡해질 수 있음
- **단일 장애점**: Gemini API 장애 시 전체 챗봇 기능 중단
- **연결 안정성**: 모바일 환경에서 네트워크 전환 시 SSE 연결 끊김

**설계 보완 제안**:
```typescript
// 연결 복구 전략 추가 필요
interface SSEReconnectionStrategy {
  maxRetries: number      // 최대 재시도 횟수
  backoffMs: number       // 지수 백오프 시작값
  maxBackoffMs: number    // 최대 대기 시간
}
```

**합의점**: 레이어드 아키텍처 + SSE 유지, 연결 복구 전략 문서화 필요

---

### ROUND 2 / 20

**FOCUS**: 레이어 간 의존성 및 DI 구조

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
`infrastructure/container.ts`를 통한 DI Factory 패턴은 테스트 용이성과 유연성을 제공합니다. 도메인 인터페이스(IChatRepository, ILLMService)가 인프라 구현체와 분리되어 있어 모킹이 용이합니다.

**설계 근거**:
- **확장성**: 새로운 LLM 제공자 추가 시 ILLMService 구현체만 추가
- **성능**: 인터페이스 기반 설계로 캐싱 레이어 삽입 용이
- **유연성**: 테스트 시 Mock 구현체 주입 간편

**Architecture 제안**:
```typescript
// 캐싱 데코레이터 패턴 적용 가능
class CachedLLMService implements ILLMService {
  constructor(
    private readonly inner: ILLMService,
    private readonly cache: ICache
  ) {}

  async streamChat(context, message, onChunk) {
    const cacheKey = this.buildCacheKey(context, message)
    // FAQ 응답 캐싱 가능
  }
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
DI 구조는 적절하나, 런타임 의존성 해결 시 성능 오버헤드가 있을 수 있습니다. 또한 TypeScript의 컴파일 타임 DI 지원 한계로 런타임 에러 가능성이 있습니다.

**위험 요소**:
- **복잡도**: DI 컨테이너 설정 오류 시 런타임 에러
- **학습 곡선**: 신규 개발자가 의존성 흐름 파악에 시간 소요
- **디버깅 어려움**: 추상화로 인한 스택 트레이스 복잡화

**설계 보완 제안**:
- 의존성 그래프 문서화
- 필수 의존성 누락 시 명확한 에러 메시지
- 개발 모드에서 의존성 트리 로깅

**합의점**: DI Factory 패턴 유지, 의존성 그래프 문서화 추가

---

### ROUND 3 / 20

**FOCUS**: 외부 서비스 의존성 및 장애 대응

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
Gemini API 장애 시 1회 자동 재시도와 graceful degradation이 설계되어 있어 기본적인 복원력을 갖추고 있습니다. 단, 더 강력한 Circuit Breaker 패턴 도입을 제안합니다.

**설계 근거**:
- **확장성**: Circuit Breaker로 장애 전파 차단
- **성능**: 장애 시 빠른 실패로 리소스 낭비 방지
- **유연성**: 부분 기능 제공 (일반 Q&A는 캐시 응답)

**Architecture 제안**:
```typescript
// Circuit Breaker 패턴
interface CircuitBreakerConfig {
  failureThreshold: 5      // 실패 임계값
  successThreshold: 2      // 복구 임계값
  timeout: 30000           // 반개방 상태 대기 시간
}

class GeminiServiceWithCircuitBreaker implements ILLMService {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private failures = 0

  async streamChat(context, message, onChunk) {
    if (this.state === 'OPEN') {
      throw new ServiceUnavailableError('AI 서비스 점검 중입니다')
    }
    // ...
  }
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
Circuit Breaker는 좋은 제안이나, Vercel 서버리스 환경에서 상태 공유가 어렵습니다. 각 함수 인스턴스가 독립적이므로 전역 상태 관리에 외부 저장소(Redis)가 필요합니다.

**위험 요소**:
- **인프라 복잡도**: Redis 추가 시 운영 부담 증가
- **비용**: Redis 서비스 추가 비용
- **단일 장애점**: Redis 장애 시 Circuit Breaker도 실패

**설계 보완 제안**:
- 로컬 Circuit Breaker (인스턴스 단위)로 시작
- 심각한 장애 패턴 발생 시 Redis 기반으로 업그레이드
- Gemini API 상태 엔드포인트 주기적 헬스체크

**합의점**: 로컬 Circuit Breaker 먼저 도입, 모니터링 후 분산 상태 검토

---

### ROUND 4 / 20

**FOCUS**: 데이터 아키텍처 - Prisma 스키마 설계

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
ChatSession, ChatMessage, ChatUsage 모델 설계가 정규화되어 있고, 인덱스 전략이 적절합니다. 특히 `@@unique([projectId, userId])`로 프로젝트당 사용자 세션 1개 제약이 명확합니다.

**설계 근거**:
- **확장성**: 메시지 테이블 분리로 대용량 히스토리 처리 가능
- **성능**: sessionId, createdAt 인덱스로 조회 최적화
- **유연성**: metadata JSON 필드로 구조화 데이터 저장

**Architecture 제안**:
- 향후 메시지 아카이빙을 위한 파티셔닝 전략 고려
- 30일 이상 된 메시지 Cold Storage 이관

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
메시지 content가 `@db.Text` (64KB)로 정의되어 있으나, LLM 응답이 길어질 경우 제약이 될 수 있습니다. 또한 metadata JSON 필드는 쿼리 성능에 영향을 줄 수 있습니다.

**위험 요소**:
- **데이터 크기**: 장문 응답 시 64KB 초과 가능성
- **JSON 쿼리**: metadata 내 필드 검색 시 성능 저하
- **마이그레이션**: 스키마 변경 시 대용량 테이블 ALTER 비용

**설계 보완 제안**:
```prisma
model ChatMessage {
  // content를 MEDIUMTEXT로 변경 권장 (16MB)
  content     String   @db.MediumText

  // metadata 대신 정규화된 테이블 고려
  // 또는 PostgreSQL JSONB 인덱싱 활용
}
```

**합의점**: PostgreSQL에서는 TEXT가 무제한이므로 현재 설계 유지, JSONB GIN 인덱스 추가 고려

---

### ROUND 5 / 20

**FOCUS**: Rate Limiting 구현 전략

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
UsageLimitService의 일일 50회 + 분당 10회 제한은 비용 통제와 남용 방지에 효과적입니다. KST 기준 자정 리셋 로직도 한국 사용자 UX에 적합합니다.

**설계 근거**:
- **확장성**: 사용자별/플랜별 한도 차등화 가능
- **성능**: DB 기반 카운터로 정확한 추적
- **비용 효율**: 과도한 API 비용 방지

**Architecture 제안**:
```typescript
// 티어별 사용량 제한
const USAGE_TIERS = {
  free: { daily: 50, perMinute: 10 },
  pro: { daily: 200, perMinute: 30 },
  enterprise: { daily: 1000, perMinute: 100 }
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
DB 기반 Rate Limiting은 정확하지만, 매 요청마다 DB 읽기/쓰기가 발생합니다. 고부하 시 DB가 병목이 될 수 있습니다.

**위험 요소**:
- **성능**: 매 요청 DB 왕복 레이턴시
- **경합 조건**: 동시 요청 시 카운트 정확도
- **DB 부하**: 대량 사용자 시 ChatUsage 테이블 핫스팟

**설계 보완 제안**:
```typescript
// 분산 Rate Limiting 패턴
// Phase 1: 현재 DB 기반 (충분한 수준)
// Phase 2: Redis INCR + TTL (필요 시)
// Phase 3: Sliding Window 알고리즘 (정밀 제어 필요 시)

// 낙관적 락 적용
await prisma.chatUsage.upsert({
  where: { userId_date: { userId, date } },
  update: { count: { increment: 1 } },
  create: { userId, date, count: 1 }
})
```

**합의점**: DB 기반 유지, Prisma upsert로 경합 조건 최소화. 추후 Redis 검토

---

### ROUND 6 / 20

**FOCUS**: 일관성 모델 및 트랜잭션 처리

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
메시지 저장과 사용량 증가는 단일 트랜잭션으로 처리되어야 합니다. Prisma의 `$transaction`을 활용하면 원자성을 보장할 수 있습니다.

**설계 근거**:
- **확장성**: 트랜잭션 범위 최소화로 락 경합 감소
- **성능**: 필요한 곳에만 트랜잭션 적용
- **유연성**: 롤백 시나리오 명확화

**Architecture 제안**:
```typescript
async function sendMessage(sessionId: string, content: string) {
  return prisma.$transaction(async (tx) => {
    // 1. 메시지 저장
    const message = await tx.chatMessage.create({ data: { sessionId, content, ... } })

    // 2. 사용량 증가
    await tx.chatUsage.upsert({ ... })

    return message
  })
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
트랜잭션 내에서 외부 API(Gemini) 호출은 피해야 합니다. 긴 트랜잭션은 DB 커넥션을 점유하고 데드락 위험이 있습니다.

**위험 요소**:
- **데드락**: 긴 트랜잭션 + 동시 요청
- **타임아웃**: Gemini 응답 지연 시 트랜잭션 타임아웃
- **부분 실패**: 메시지 저장 후 Gemini 실패 시 복구 복잡

**설계 보완 제안**:
```typescript
// 트랜잭션 분리 전략
// Step 1: 사용량 체크 (읽기 전용)
// Step 2: Gemini API 호출 (트랜잭션 외부)
// Step 3: 메시지 + 사용량 저장 (단일 트랜잭션)

// 실패 시 보상 트랜잭션
if (geminiError) {
  await markMessageAsError(pendingMessageId)
}
```

**합의점**: Gemini 호출은 트랜잭션 외부, 사후 DB 저장은 단일 트랜잭션으로 분리

---

### ROUND 7 / 20

**FOCUS**: API 설계 - RESTful vs SSE 하이브리드

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
REST + SSE 하이브리드 설계는 적절합니다. 조회 API는 REST로, 실시간 스트리밍은 SSE로 분리하여 각 프로토콜의 장점을 활용합니다.

**설계 근거**:
- **확장성**: API 엔드포인트별 독립 스케일링
- **성능**: 스트리밍과 조회 분리로 캐싱 전략 차별화
- **유연성**: 클라이언트 구현 선택권 (SSE 미지원 시 폴링 대안)

**Architecture 제안**:
```typescript
// API 일관성을 위한 응답 래퍼
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
  meta?: { timestamp: string; requestId: string }
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
SSE 엔드포인트(`POST /chat`)가 POST 메서드를 사용하는데, 이는 HTTP 의미론적으로 혼란을 줄 수 있습니다. 또한 SSE 연결 중 클라이언트가 새로운 메시지를 보낼 수 없습니다.

**위험 요소**:
- **의미론적 혼란**: POST인데 스트리밍 응답
- **동시성**: 스트리밍 중 새 메시지 전송 불가
- **브라우저 제약**: 동일 도메인 SSE 연결 6개 제한

**설계 보완 제안**:
- POST는 메시지 전송 + 스트리밍 응답 시작으로 명확히 문서화
- 스트리밍 중 UI에서 입력 비활성화 (현재 설계에 반영됨)
- X-Request-Id 헤더로 요청-응답 추적

**합의점**: 현재 설계 유지, API 문서에 의미론 명확히 기술

---

### ROUND 8 / 20

**FOCUS**: 응답 캐싱 전략

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
현재 설계에 캐싱 레이어가 명시적으로 없습니다. FAQ 형태의 일반적인 질문(환율, 날씨, 교통)에 대해 캐싱을 적용하면 비용과 응답 시간을 크게 절감할 수 있습니다.

**설계 근거**:
- **확장성**: 캐시 히트 시 Gemini API 호출 없이 즉시 응답
- **성능**: 반복 질문에 대한 TTFB 극적 개선
- **비용 효율**: API 호출 비용 절감

**Architecture 제안**:
```typescript
// 시맨틱 캐싱 전략
interface ResponseCache {
  // 정확히 일치하는 질문 캐싱
  exactMatch: Map<string, CachedResponse>

  // 의미적으로 유사한 질문 캐싱 (Phase 2)
  semanticMatch?: VectorStore
}

// 캐시 키 생성
function buildCacheKey(projectId: string, message: string): string {
  const normalized = message.toLowerCase().trim()
  return `${projectId}:${hash(normalized)}`
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
캐싱은 좋지만, 캐시 무효화 전략이 복잡합니다. 특히 프로젝트 컨텍스트(destination, country)가 포함된 응답은 캐시 키 설계가 까다롭습니다.

**위험 요소**:
- **Stale 데이터**: 오래된 정보 제공 (환율, 영업시간)
- **컨텍스트 불일치**: 다른 프로젝트에서 캐시된 응답 반환
- **메모리 사용량**: 서버리스 환경에서 캐시 지속성 없음

**설계 보완 제안**:
- TTL 기반 캐싱 (1시간 이하)
- 프로젝트별 캐시 네임스페이스
- 실시간 정보 질문은 캐싱 제외
- 장소 추천은 캐싱 제외 (개인화 필요)

**합의점**: FAQ 응답에 한해 TTL 기반 캐싱 추가 권장 (Phase 2)

---

### ROUND 9 / 20

**FOCUS**: SSE 연결 관리 및 리소스 최적화

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
`useChatStream` 훅에서 AbortController를 사용하여 연결 해제를 관리하고 있어 리소스 누수를 방지합니다. 컴포넌트 언마운트 시 정리가 적절합니다.

**설계 근거**:
- **확장성**: 연결당 리소스 사용량 최소화
- **성능**: 불필요한 연결 즉시 정리
- **유연성**: 사용자 중단 시 서버 리소스 해제

**Architecture 제안**:
```typescript
// 연결 상태 모니터링
interface ConnectionMetrics {
  activeConnections: number
  averageDuration: number
  abortRate: number
}

// 서버 측 연결 추적
const activeStreams = new Map<string, StreamContext>()
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
Vercel 서버리스에서 SSE 연결은 함수 실행 시간에 포함됩니다. 긴 응답 시 60초 타임아웃에 도달할 수 있으며, 이 경우 연결이 강제 종료됩니다.

**위험 요소**:
- **타임아웃**: 60초 제한으로 긴 응답 중단
- **비용**: 연결 유지 시간 = 함수 실행 비용
- **좀비 연결**: 클라이언트 비정상 종료 시 서버 리소스 점유

**설계 보완 제안**:
```typescript
// 타임아웃 가드
const STREAM_TIMEOUT = 55_000 // 60초보다 약간 짧게

async function streamWithTimeout(generator: AsyncGenerator) {
  const timeout = setTimeout(() => {
    // 부분 응답 저장 후 종료
    generator.return({ partial: true })
  }, STREAM_TIMEOUT)

  try {
    for await (const chunk of generator) {
      yield chunk
    }
  } finally {
    clearTimeout(timeout)
  }
}
```

**합의점**: 55초 타임아웃 가드 추가, 부분 응답 저장 로직 구현

---

### ROUND 10 / 20

**FOCUS**: 에러 처리 및 복구 전략

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
에러 코드가 체계적으로 정의되어 있고(RATE_LIMIT_EXCEEDED, UNAUTHORIZED 등), 각 에러에 대한 HTTP 상태 코드 매핑이 명확합니다.

**설계 근거**:
- **확장성**: 새로운 에러 타입 추가 용이
- **성능**: 에러 시 빠른 응답 반환
- **유연성**: 클라이언트별 에러 핸들링 가능

**Architecture 제안**:
```typescript
// 에러 복구 전략 열거
enum ErrorRecoveryStrategy {
  RETRY_IMMEDIATELY,     // 즉시 재시도
  RETRY_WITH_BACKOFF,    // 지수 백오프 재시도
  FALLBACK_RESPONSE,     // 대체 응답 제공
  USER_ACTION_REQUIRED,  // 사용자 조치 필요
  FATAL                  // 복구 불가
}

const ERROR_RECOVERY_MAP: Record<ChatErrorCode, ErrorRecoveryStrategy> = {
  AI_ERROR: ErrorRecoveryStrategy.RETRY_WITH_BACKOFF,
  RATE_LIMIT_EXCEEDED: ErrorRecoveryStrategy.USER_ACTION_REQUIRED,
  VALIDATION_ERROR: ErrorRecoveryStrategy.USER_ACTION_REQUIRED,
  // ...
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
에러 복구 전략이 코드에 하드코딩되어 있습니다. 또한 연속 실패 시의 백오프 전략이 무한 재시도로 이어질 수 있습니다.

**위험 요소**:
- **무한 재시도**: 백오프 없이 재시도 시 서버 부하
- **사용자 혼란**: 에러 메시지가 기술적일 수 있음
- **로깅 부재**: 에러 패턴 분석 어려움

**설계 보완 제안**:
```typescript
// 최대 재시도 횟수 및 백오프 설정
const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  multiplier: 2
}

// 사용자 친화적 에러 메시지 매핑
const USER_ERROR_MESSAGES: Record<ChatErrorCode, string> = {
  AI_ERROR: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
  RATE_LIMIT_EXCEEDED: '오늘 사용량을 초과했어요. 내일 다시 이용해 주세요.',
  GEOCODING_FAILED: '장소 위치를 찾을 수 없어요. 다른 이름으로 검색해 보세요.',
}
```

**합의점**: 최대 재시도 2회로 제한, 사용자 친화적 메시지 매핑 추가

---

### ROUND 11 / 20

**FOCUS**: 프롬프트 인젝션 방어

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
`PromptInjectionFilter`가 정규식 기반으로 구현되어 있어 빠른 검사가 가능합니다. 한국어와 영어 패턴을 모두 커버하고 있습니다.

**설계 근거**:
- **확장성**: 새로운 패턴 추가 용이
- **성능**: O(n*m) 복잡도 (n=입력 길이, m=패턴 수)
- **유연성**: 화이트리스트/블랙리스트 조합 가능

**Architecture 제안**:
```typescript
// 다층 방어 전략
class MultiLayerPromptFilter {
  // Layer 1: 정규식 기반 빠른 필터링
  private regexFilter: RegexPromptFilter

  // Layer 2: 의미론적 분석 (Phase 2)
  private semanticFilter?: SemanticPromptFilter

  // Layer 3: 출력 필터링
  private outputSanitizer: OutputSanitizer
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
정규식 기반 필터링은 우회 가능성이 높습니다. 유니코드 변환, 동음이의어, 맞춤법 오류 등으로 우회할 수 있습니다.

**위험 요소**:
- **우회 가능성**: `시 스 템 프 롬 프 트` 같은 변형
- **거짓 양성**: 정상적인 "역할" 언급도 차단
- **진화하는 공격**: 새로운 인젝션 기법 등장

**설계 보완 제안**:
```typescript
// 정규화 전처리 추가
function normalizeInput(input: string): string {
  return input
    .replace(/\s+/g, ' ')           // 공백 정규화
    .replace(/[\u200B-\u200D]/g, '') // 제로 너비 문자 제거
    .toLowerCase()
}

// 컨텍스트 기반 필터링
function isContextuallyDangerous(input: string, sessionContext: SessionContext): boolean {
  // 이전 대화에서 "시스템 프롬프트"를 여러 번 언급한 경우 경고
}
```

**합의점**: 정규화 전처리 추가, 시스템 프롬프트에 "역할 유지" 명시적 강조

---

### ROUND 12 / 20

**FOCUS**: 출력 필터링 및 XSS 방지

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
DOMPurify를 사용한 XSS 방지가 설계에 포함되어 있습니다. URL 화이트리스트 검증도 적절합니다.

**설계 근거**:
- **확장성**: 허용 URL 도메인 설정 가능
- **성능**: DOMPurify는 최적화된 라이브러리
- **유연성**: 사용자 정의 필터 규칙 추가 가능

**Architecture 제안**:
```typescript
// 출력 필터링 파이프라인
class OutputSanitizer {
  sanitize(content: string): string {
    // 1. HTML 태그 제거/이스케이프
    const sanitized = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })

    // 2. URL 검증
    return this.validateUrls(sanitized)
  }

  private validateUrls(content: string): string {
    const urlPattern = /https?:\/\/[^\s]+/g
    return content.replace(urlPattern, (url) => {
      return this.isAllowedUrl(url) ? url : '[링크 제거됨]'
    })
  }

  private readonly ALLOWED_DOMAINS = [
    'google.com',
    'maps.google.com',
    'tripadvisor.com',
    'yelp.com'
  ]
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
LLM이 생성한 마크다운 내 코드 블록, 이미지 삽입 시도 등도 필터링해야 합니다. 또한 과도한 필터링은 정상적인 응답을 손상시킬 수 있습니다.

**위험 요소**:
- **기능 손상**: 과도한 필터링으로 유용한 정보 제거
- **마크다운 처리**: 코드 블록 내 악의적 내용
- **이미지 URL**: 외부 이미지 삽입 시도

**설계 보완 제안**:
```typescript
// 마크다운 인식 필터링
const MARKDOWN_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [],      // 모든 HTML 태그 제거
  ALLOW_DATA_ATTR: false,
  RETURN_DOM: false
}

// 코드 블록은 보존하되 내용 검증
function sanitizeMarkdown(content: string): string {
  return content.replace(/```[\s\S]*?```/g, (codeBlock) => {
    // JSON 코드 블록만 허용 (장소 데이터)
    if (codeBlock.startsWith('```json')) {
      return codeBlock
    }
    return '[코드 블록 제거됨]'
  })
}
```

**합의점**: JSON 코드 블록만 허용, 나머지 코드 블록 및 이미지 URL 제거

---

### ROUND 13 / 20

**FOCUS**: 인증 및 인가

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
NextAuth.js 기반 인증과 `requireProjectAccess()` 미들웨어로 프로젝트별 권한 검증이 적절히 구현되어 있습니다.

**설계 근거**:
- **확장성**: 역할 기반 접근 제어 확장 가능 (owner/member)
- **성능**: JWT 세션으로 DB 조회 최소화
- **유연성**: 프로젝트별, 사용자별 권한 세분화 가능

**Architecture 제안**:
```typescript
// 권한 레벨 정의
enum ChatPermission {
  READ_HISTORY = 'chat:read',
  SEND_MESSAGE = 'chat:write',
  ADD_PLACE = 'chat:place:add',
  CLEAR_SESSION = 'chat:session:clear'
}

// 역할별 권한 매핑
const ROLE_PERMISSIONS: Record<MemberRole, ChatPermission[]> = {
  owner: [ChatPermission.READ_HISTORY, ChatPermission.SEND_MESSAGE, ChatPermission.ADD_PLACE, ChatPermission.CLEAR_SESSION],
  member: [ChatPermission.READ_HISTORY, ChatPermission.SEND_MESSAGE, ChatPermission.ADD_PLACE]
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
JWT 세션은 토큰 만료 전까지 무효화가 어렵습니다. 사용자 탈퇴나 프로젝트에서 제외된 경우에도 토큰이 유효할 수 있습니다.

**위험 요소**:
- **토큰 무효화**: 즉시 접근 차단 어려움
- **세션 하이재킹**: 토큰 탈취 시 오용 가능
- **권한 동기화**: 프로젝트 멤버십 변경 시 실시간 반영 지연

**설계 보완 제안**:
```typescript
// 실시간 권한 검증 (크리티컬 작업)
async function requireProjectAccess(userId: string, projectId: string) {
  // 캐시된 권한이 있어도 DB 재검증
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId }
  })

  if (!membership) {
    throw new ForbiddenError('프로젝트 접근 권한이 없습니다')
  }

  return { authorized: true, role: membership.role }
}
```

**합의점**: 메시지 전송, 장소 추가 등 크리티컬 작업은 실시간 DB 권한 검증

---

### ROUND 14 / 20

**FOCUS**: 데이터 보안 및 프라이버시

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
로깅에서 메시지 내용을 제외하고 ID/타임스탬프만 기록하는 것은 개인정보 보호에 적절합니다. GDPR/CCPA 준수를 위한 기반이 됩니다.

**설계 근거**:
- **확장성**: 데이터 보존 정책 적용 용이
- **성능**: 로그 저장소 부하 감소
- **유연성**: 규정 준수 요구사항 충족

**Architecture 제안**:
```typescript
// 데이터 보존 정책
interface DataRetentionPolicy {
  chatMessages: 90,    // 일 단위
  chatSessions: 90,
  chatUsage: 365,      // 집계 데이터는 더 오래 보관
}

// 자동 삭제 스케줄러
async function cleanupExpiredData() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)

  await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: cutoffDate } }
  })
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
메시지 내용이 DB에 평문으로 저장됩니다. DB 유출 시 모든 대화 내용이 노출될 수 있습니다.

**위험 요소**:
- **데이터 유출**: DB 침해 시 대화 내용 노출
- **내부자 위협**: DB 접근 권한자의 데이터 열람
- **백업 보안**: 백업 파일에 평문 저장

**설계 보완 제안**:
```typescript
// 클라이언트 사이드 암호화 (E2EE) - Phase 2
// 또는 서버 사이드 암호화 (at-rest)

// PostgreSQL pgcrypto 확장 활용
// ALTER TABLE "ChatMessage"
// ALTER COLUMN "content" TYPE bytea
// USING pgp_sym_encrypt(content, 'encryption_key');

// 또는 애플리케이션 레벨 암호화
import { encrypt, decrypt } from '@/lib/crypto'

class EncryptedChatRepository implements IChatRepository {
  async createMessage(data: CreateMessageInput) {
    return prisma.chatMessage.create({
      data: {
        ...data,
        content: await encrypt(data.content, this.encryptionKey)
      }
    })
  }
}
```

**합의점**: Phase 1은 현재 설계 유지, Phase 2에서 at-rest 암호화 검토

---

### ROUND 15 / 20

**FOCUS**: 성능 최적화 및 TTFB

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
TTFB P50 < 1초 목표는 Gemini Flash와 SSE 스트리밍 조합으로 달성 가능합니다. 컴포넌트 지연 로딩으로 채팅창 오픈 시간도 최적화되어 있습니다.

**설계 근거**:
- **확장성**: Vercel Edge Functions 활용 가능
- **성능**: 스트리밍으로 체감 응답 시간 단축
- **유연성**: 모델 업그레이드 시 성능 향상

**Architecture 제안**:
```typescript
// Edge Runtime 활용 (가능한 경우)
export const runtime = 'edge'

// 응답 시작 최적화
async function optimizedStreamChat(message: string) {
  // 1. 즉시 SSE 연결 설정
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // 2. "생각 중..." 표시 즉시 전송
      controller.enqueue(encoder.encode(`data: {"type":"thinking"}\n\n`))

      // 3. Gemini 호출
      await geminiService.streamChat(/* ... */)
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
Edge Runtime은 Node.js API의 일부만 지원합니다. Prisma는 Edge에서 제한적으로 동작하며, 일부 기능(트랜잭션)이 지원되지 않을 수 있습니다.

**위험 요소**:
- **호환성**: Edge Runtime의 API 제약
- **Cold Start**: 첫 요청 시 지연
- **DB 연결**: Edge에서 DB 연결 풀 관리 어려움

**설계 보완 제안**:
```typescript
// Node.js Runtime 유지, 최적화 포인트
// 1. DB 연결 풀 최적화
// datasource db {
//   url = env("DATABASE_URL")
//   relationMode = "prisma"
// }

// 2. Prisma 쿼리 최적화
const session = await prisma.chatSession.findUnique({
  where: { projectId_userId: { projectId, userId } },
  select: { id: true }  // 필요한 필드만 선택
})

// 3. 병렬 실행
const [session, usage] = await Promise.all([
  chatRepository.getSession(projectId, userId),
  usageRepository.getUsageForDate(userId, today)
])
```

**합의점**: Node.js Runtime 유지, 쿼리 최적화 및 병렬 실행으로 성능 확보

---

### ROUND 16 / 20

**FOCUS**: 모니터링 및 관찰 가능성 (Observability)

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
현재 로깅이 console.log로 구현되어 있습니다. 구조화된 로깅과 분산 트레이싱을 도입하면 운영 가시성이 크게 향상됩니다.

**설계 근거**:
- **확장성**: 로그 집계 및 분석 가능
- **성능**: 성능 병목 식별
- **유연성**: 다양한 모니터링 도구 연동

**Architecture 제안**:
```typescript
// 구조화된 로깅
import { logger } from '@/lib/logger'

logger.info({
  event: 'chat_message_sent',
  projectId,
  sessionId,
  requestId: headers.get('X-Request-Id'),
  duration: Date.now() - startTime,
  tokenCount: response.usage?.totalTokens
})

// 분산 트레이싱 (OpenTelemetry)
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('chatbot-service')
const span = tracer.startSpan('sendMessage')
try {
  // ...
} finally {
  span.end()
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
OpenTelemetry 도입은 복잡도를 증가시킵니다. Vercel 환경에서는 Vercel Analytics와 Log Drain이 더 간단한 대안입니다.

**위험 요소**:
- **복잡도**: 트레이싱 인프라 구축 필요
- **비용**: 외부 APM 서비스 비용
- **오버헤드**: 트레이싱 데이터 전송 레이턴시

**설계 보완 제안**:
```typescript
// Phase 1: Vercel 내장 도구 활용
// - Vercel Analytics (Core Web Vitals)
// - Vercel Logs (실시간 로그)
// - Sentry (에러 트래킹)

// Phase 2: 필요 시 확장
// - Datadog / New Relic 연동
// - Custom 메트릭 대시보드

// 간단한 구조화 로깅
function logChatEvent(event: ChatLogEvent) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: event.level || 'info',
    service: 'chatbot',
    ...event
  }))
}
```

**합의점**: Phase 1은 Vercel 내장 도구 + JSON 로깅, Phase 2에서 APM 검토

---

### ROUND 17 / 20

**FOCUS**: 장애 시나리오 및 복구 전략

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
주요 장애 시나리오에 대한 대응이 설계되어 있습니다. Gemini API 장애, DB 장애, 네트워크 장애 등에 대한 graceful degradation이 가능합니다.

**설계 근거**:
- **확장성**: 장애 유형별 대응 전략 확장
- **성능**: 장애 시 빠른 실패 (fail-fast)
- **유연성**: 부분 기능 제공 가능

**Architecture 제안**:
```typescript
// 장애 시나리오 매트릭스
const FAILURE_SCENARIOS = {
  GEMINI_TIMEOUT: {
    detection: 'API 응답 > 30초',
    response: '1회 재시도 → 실패 시 에러 메시지',
    fallback: '캐시된 FAQ 응답 제공 (가능한 경우)'
  },
  DB_CONNECTION_FAILED: {
    detection: 'Prisma 연결 에러',
    response: '메시지 저장 실패 → 로컬 버퍼링',
    fallback: '읽기 전용 모드 (히스토리 제외)'
  },
  RATE_LIMIT_EXCEEDED: {
    detection: '429 응답 또는 사용량 초과',
    response: '명확한 에러 메시지 + 리셋 시간 안내',
    fallback: '읽기 전용 (히스토리 조회만 가능)'
  }
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
장애 복구 후 데이터 일관성 검증이 필요합니다. 특히 스트리밍 중단 시 부분 저장된 메시지 처리가 중요합니다.

**위험 요소**:
- **데이터 불일치**: 부분 저장된 메시지
- **상태 불일치**: 클라이언트/서버 상태 차이
- **복구 실패**: 연속 장애 시 복구 불가

**설계 보완 제안**:
```typescript
// 메시지 상태 복구
async function reconcileMessageStatus(sessionId: string) {
  // 'streaming' 상태로 남아있는 오래된 메시지 정리
  const staleMessages = await prisma.chatMessage.findMany({
    where: {
      sessionId,
      status: 'streaming',
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } // 5분 이상
    }
  })

  for (const msg of staleMessages) {
    await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { status: msg.content ? 'complete' : 'error' }
    })
  }
}

// 클라이언트 재연결 시 호출
// GET /chat/history → reconcileMessageStatus() 선행 실행
```

**합의점**: 히스토리 조회 시 stale 메시지 상태 정리 로직 추가

---

### ROUND 18 / 20

**FOCUS**: 테스트 전략 및 품질 보증

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
단위 테스트, 통합 테스트, E2E 테스트가 계층별로 설계되어 있습니다. PromptInjectionFilter, API 라우트, 사용자 플로우에 대한 테스트가 포함됩니다.

**설계 근거**:
- **확장성**: 테스트 피라미드 구조
- **성능**: 빠른 피드백 루프
- **유연성**: 모킹으로 외부 의존성 격리

**Architecture 제안**:
```typescript
// 테스트 커버리지 목표
const COVERAGE_TARGETS = {
  unit: 80,        // 비즈니스 로직
  integration: 70, // API 엔드포인트
  e2e: 50          // 핵심 사용자 플로우
}

// Gemini API 모킹
class MockGeminiService implements ILLMService {
  async streamChat(context, message, onChunk) {
    const mockResponse = this.getMockResponse(message)
    for (const chunk of mockResponse.split(' ')) {
      onChunk(chunk + ' ')
      await new Promise(r => setTimeout(r, 50))
    }
    return mockResponse
  }
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
SSE 스트리밍 테스트가 복잡합니다. 또한 Gemini API의 비결정적 응답을 테스트하기 어렵습니다.

**위험 요소**:
- **비결정적 테스트**: LLM 응답 변동성
- **SSE 테스트**: 스트리밍 검증 어려움
- **환경 차이**: 로컬 vs CI vs 프로덕션

**설계 보완 제안**:
```typescript
// SSE 테스트 헬퍼
async function collectSSEEvents(response: Response): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = []
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  while (reader) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        events.push(JSON.parse(line.slice(6)))
      }
    }
  }

  return events
}

// 스냅샷 테스트 대신 구조 검증
expect(events).toContainEqual(expect.objectContaining({ type: 'text' }))
expect(events).toContainEqual(expect.objectContaining({ type: 'done' }))
```

**합의점**: SSE 테스트 헬퍼 함수 추가, LLM 응답은 구조 검증으로 대체

---

### ROUND 19 / 20

**FOCUS**: 비용 분석 및 최적화

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
Gemini Flash 선택과 일일 50회 사용량 제한은 비용 통제에 효과적입니다. 예상 비용이 월 $20 미만으로 합리적입니다.

**설계 근거**:
- **확장성**: 사용량 증가 시 비용 예측 가능
- **성능**: Flash 모델로 비용-성능 균형
- **비용 효율**: 캐싱으로 추가 절감 가능

**Architecture 제안**:
```typescript
// 비용 추적 및 알림
interface CostMonitor {
  daily: { threshold: 10, alert: 'slack' }
  monthly: { threshold: 100, alert: 'email' }
}

async function trackApiCost(usage: { inputTokens: number, outputTokens: number }) {
  const cost = (usage.inputTokens * 0.000075) + (usage.outputTokens * 0.0003)
  await prisma.apiCostLog.create({ data: { cost, timestamp: new Date() } })

  // 임계값 체크
  const todayCost = await getTodayTotalCost()
  if (todayCost > DAILY_THRESHOLD) {
    await sendAlert('Daily cost threshold exceeded')
  }
}
```

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
사용자 수 증가 시 비용이 선형적으로 증가합니다. 100명 사용자가 각각 50회 사용 시 5,000회/일 API 호출이 발생합니다.

**위험 요소**:
- **비용 폭주**: 바이럴 성장 시 예산 초과
- **남용**: 봇/스크립트에 의한 대량 호출
- **비효율적 사용**: 불필요한 재시도

**설계 보완 제안**:
```typescript
// 비용 보호 장치
const COST_PROTECTION = {
  // 1. 전역 일일 한도
  globalDailyLimit: 10000, // 메시지

  // 2. 토큰 제한
  maxInputTokens: 1000,
  maxOutputTokens: 2000,

  // 3. 버스트 방지
  burstLimit: 20, // 동시 요청

  // 4. 긴급 차단
  emergencyShutdown: {
    dailyCost: 50,  // $50 초과 시 서비스 중단
    action: 'disable_chatbot'
  }
}
```

**합의점**: 전역 일일 한도 및 긴급 차단 메커니즘 추가

---

### ROUND 20 / 20

**FOCUS**: 최종 합의 및 기술 부채 정리

#### 👤 진보적 아키텍트 (The Visionary)

**기술적 반응**:
전체적으로 잘 설계된 아키텍처입니다. Clean Architecture 준수, SSE 스트리밍, 보안 계층, 비용 통제 모두 적절합니다. 몇 가지 개선점을 반영하면 프로덕션 준비가 완료됩니다.

**최종 평가**:
- **장점**: 기존 아키텍처 호환, 명확한 계층 분리, 보안 고려
- **단점**: 캐싱 부재, 모니터링 미흡, 암호화 미적용

**권장 개선사항**:
1. Circuit Breaker 패턴 추가
2. FAQ 응답 캐싱 검토
3. 구조화 로깅 적용
4. 55초 타임아웃 가드

#### 👤 방어적 시니어 엔지니어 (The Pragmatist)

**기술적 반응**:
아키텍처 기본 구조는 견고합니다. 다만 운영 단계에서 발생할 수 있는 엣지 케이스들에 대한 대비가 필요합니다.

**기술 부채 목록**:
1. **P1 (MVP 전 해결)**: SSE 타임아웃 가드, 에러 메시지 사용자화
2. **P2 (MVP 직후)**: Circuit Breaker, 구조화 로깅
3. **P3 (Phase 2)**: 응답 캐싱, at-rest 암호화, APM 통합

**배포 전 체크리스트**:
```markdown
- [ ] GEMINI_API_KEY 환경 변수 설정
- [ ] Prisma 마이그레이션 실행
- [ ] 로컬 테스트 통과
- [ ] Staging 배포 및 검증
- [ ] 비용 알림 설정
- [ ] 롤백 절차 문서화
```

**운영 이관 계획**:
1. **Week 1**: Feature Flag로 내부 테스트
2. **Week 2**: 베타 사용자 10% 롤아웃
3. **Week 3**: 전체 배포 + 모니터링 강화

---

## 향후 해결해야 할 기술적 부채

| 우선순위 | 항목 | 설명 | 예상 공수 |
|----------|------|------|----------|
| P1 | SSE 타임아웃 가드 | 55초 제한 + 부분 응답 저장 | 0.5일 |
| P1 | 사용자 친화적 에러 메시지 | 에러 코드별 한국어 메시지 매핑 | 0.5일 |
| P2 | Circuit Breaker | 로컬 상태 기반 구현 | 1일 |
| P2 | 구조화 로깅 | JSON 로깅 + Vercel Log Drain | 0.5일 |
| P2 | 메시지 상태 정리 | stale streaming 메시지 복구 | 0.5일 |
| P3 | FAQ 응답 캐싱 | TTL 기반 인메모리 캐시 | 1일 |
| P3 | at-rest 암호화 | 메시지 내용 암호화 | 2일 |
| P3 | APM 통합 | Datadog/Sentry 연동 | 1일 |

---

## 결론

**설계 합의 상태**: ✅ Proven (검증됨)

본 아키텍처는 Travel Planner 프로젝트의 기존 Clean Architecture와 잘 통합되며, SSE 스트리밍, 보안 계층, 비용 통제 메커니즘이 적절히 설계되어 있습니다.

20라운드 토론을 통해 도출된 주요 개선점:
1. **Circuit Breaker**: 외부 API 장애 전파 방지
2. **타임아웃 가드**: Vercel 60초 제한 대응
3. **구조화 로깅**: 운영 가시성 확보
4. **비용 보호**: 전역 한도 및 긴급 차단

이러한 개선점들을 반영하면 프로덕션 환경에서 안정적으로 운영 가능한 아키텍처가 완성됩니다.

---

*최종 업데이트: 2026-01-25*
*토론 참여자: The Visionary (진보적 아키텍트), The Pragmatist (방어적 시니어 엔지니어)*
