# Chatbot Phase 2-A Implementation Workflow

> **버전**: v1.0
> **작성일**: 2026-01-27
> **기반 문서**: `CHATBOT_PHASE2A_ARCHITECTURE.md`
> **상태**: 구현 대기

---

## 개요

Phase 2-A를 5단계(Step)로 나누어 구현한다. 각 Step은 독립적으로 검증 가능하며, 이전 Step의 완료에 의존한다.

```
Step 1: 기반 타입 + 인터페이스          ← 의존성 없음
Step 2: 백엔드 서비스 구현              ← Step 1 의존
Step 3: GeminiService + UseCase 리팩토링 ← Step 1, 2 의존
Step 4: API + 프론트엔드                ← Step 1, 2, 3 의존
Step 5: DI 통합 + 검증                 ← Step 1~4 의존
```

---

## Step 1: 기반 타입 + 인터페이스

> **목표**: 도메인 계약 정의. 이후 모든 Step의 기초.

### Task 1.1: ILLMService.ts 확장

**파일**: `domain/interfaces/ILLMService.ts`
**작업**:
- `StreamChunk.type`에 `'tool_call' | 'tool_result' | 'itinerary_preview'` 추가
- `ToolCallChunk` 인터페이스 신규 정의
- `ItineraryPreviewData` 인터페이스 신규 정의
- `ChatContext` 확장:
  - `existingPlaces`에 `id`, `latitude`, `longitude` 필드 추가
  - `conversationSummary?: string` 추가
  - `itinerary?` 객체 추가 (id, startDate, endDate, days)
  - `userPreferences?` 객체 추가 (topCategories)
- 기존 `ILLMService` 인터페이스 시그니처는 변경 없음 (하위 호환)
- 기존 type guard 함수 유지 + `isToolCallChunk`, `isItineraryPreviewChunk` 추가

**검증**:
- `npm run build` 통과 (타입 에러 없음)
- 기존 코드에서 `ChatContext.existingPlaces` 사용하는 곳에 새 필드가 optional이라 깨지지 않음 확인

### Task 1.2: IPlaceValidationService.ts 신규 생성

**파일**: `domain/interfaces/IPlaceValidationService.ts`
**작업**:
- `ValidatedPlace` 인터페이스 정의:
  - 기존 `RecommendedPlace` 확장 + `isVerified`, `googlePlaceId`, `rating`, `userRatingsTotal`, `openNow`, `priceLevel`, `googleMapsUrl`, `distanceFromReference`
- `IPlaceValidationService` 인터페이스 정의:
  - `validateAndEnrich(places, destination, country?): Promise<ValidatedPlace[]>`
  - `searchNearby(lat, lng, category?, keyword?, maxResults?): Promise<ValidatedPlace[]>`

**검증**:
- 파일 생성 후 `npm run build` 통과

### Task 1.3: chatTools.ts Function Declaration 정의

**파일**: `infrastructure/services/gemini/tools/chatTools.ts`
**작업**:
- `CHAT_TOOL_DECLARATIONS` 배열 정의 (3개 도구):
  1. `recommend_places`: places 배열 + reasoning
  2. `generate_itinerary`: title + days 배열
  3. `search_nearby_places`: referencePlaceName + category + keyword + maxResults
- `@google/generative-ai`의 `FunctionDeclaration` 타입 사용
- Zod 검증 스키마도 함께 정의 (도구 인자 런타임 검증용):
  - `RecommendPlacesArgsSchema`
  - `GenerateItineraryArgsSchema`
  - `SearchNearbyArgsSchema`

**검증**:
- 타입 체크 통과
- Zod 스키마 단위 테스트 (유효/무효 인자)

### Step 1 체크포인트

```bash
npm run build   # 타입 에러 없음
npm run lint    # 린트 통과
```

기존 기능에 영향 없음 확인 (인터페이스 추가만, 구현 변경 없음)

---

## Step 2: 백엔드 서비스 구현

> **목표**: ContextBuilder, PlaceValidationService, ToolExecutor 구현

### Task 2.1: ChatContextBuilder 구현

**파일**: `application/services/chat/ContextBuilder.ts`
**의존**: `IChatRepository`, `IItineraryRepository`
**작업**:
- `ChatContextBuilder` 클래스 구현
- `build()` 메서드: 병렬로 recentMessages, itinerary, allMessages 로드
- `summarizeConversation()`: 키워드 기반 대화 요약
  - 카테고리 키워드 추출 (맛집, 카페, 관광, 쇼핑, 숙소, 교통)
  - 따옴표 안 장소명 추출
  - 대화 개수 포함
- `analyzePreferences()`: 장소 카테고리 빈도 분석 → 상위 3개
- `formatItinerary()`: ItineraryWithDays → ChatContext.itinerary 변환

**검증**:
- 단위 테스트:
  - 대화 10턴 이하: summary 없음
  - 대화 15턴: summary에 주제/장소 포함
  - 장소 5개 (restaurant 3, cafe 2): topCategories = ['restaurant', 'cafe']
  - 일정 있을 때: itinerary 포맷 정확성

### Task 2.2: PlaceValidationService 구현

**파일**: `infrastructure/services/PlaceValidationService.ts`
**의존**: Google Places API (Text Search, Nearby Search)
**작업**:
- `PlaceValidationService` 클래스 구현
- `validateAndEnrich()`:
  1. 각 장소에 대해 `Promise.allSettled`로 병렬 검증
  2. `textSearch()`: Google Places Text Search API 호출
     - 쿼리: `{장소명} {destination} {country}`
     - 응답에서 place_id, rating, user_ratings_total, formatted_address, geometry, opening_hours 추출
  3. 영문명 fallback: 1차 실패 시 `{name_en} {destination}` 재시도
  4. `mergeWithGoogleData()`: AI 추천 데이터 + Google 데이터 병합
  5. 검증 실패 시 `isVerified: false`로 반환 (에러가 아님)
- `searchNearby()`:
  1. Google Places Nearby Search API 호출
  2. category → Google Places type 매핑 (restaurant → restaurant, cafe → cafe 등)
  3. 결과를 ValidatedPlace로 변환
- 인메모리 LRU 캐시:
  - 키: `${placeName}:${destination}`
  - TTL: 24시간
  - 최대 500 항목

**환경변수**: 기존 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 사용 (서버사이드에서는 별도 키 권장)

**검증**:
- Google Places API 모킹 단위 테스트:
  - 검증 성공 케이스: isVerified=true, rating/coordinates 포함
  - 검증 실패 케이스: isVerified=false, 원본 데이터 유지
  - 캐시 히트 테스트
  - 영문명 fallback 테스트

### Task 2.3: ToolExecutor 구현

**파일**: `application/services/chat/ToolExecutor.ts`
**의존**: `IPlaceValidationService`, `IItineraryRepository`
**작업**:
- `ToolExecutor` 클래스 구현
- `execute()`: toolName으로 분기
- `handleRecommendPlaces()`:
  1. Zod로 args 검증
  2. `placeValidationService.validateAndEnrich()` 호출
  3. 기존 장소 중복 필터링 (`existingNames` Set)
  4. centroid 계산 → 거리순 정렬
  5. 결과 반환
- `handleGenerateItinerary()`:
  1. Zod로 args 검증
  2. `buildItineraryPreview()`: days 데이터를 `ItineraryPreviewData`로 변환
     - placeName → existingPlaces에서 매칭 확인
     - 미매칭 장소는 warning 표시
  3. `requiresConfirmation: true` 플래그 포함
- `handleSearchNearby()`:
  1. Zod로 args 검증
  2. referencePlaceName → existingPlaces에서 좌표 조회
  3. `placeValidationService.searchNearby()` 호출
- 유틸리티:
  - `calculateCentroid()`: 장소 좌표 중심점 계산
  - `haversineDistance()`: 두 좌표 간 거리 (km)

**검증**:
- 단위 테스트:
  - recommend_places: 검증+필터+정렬 통합 테스트
  - generate_itinerary: 프리뷰 생성 + 미매칭 장소 처리
  - search_nearby: 좌표 없는 기준 장소 에러 처리
  - 알 수 없는 도구명 에러 처리
  - Zod 검증 실패 케이스

### Step 2 체크포인트

```bash
npm run build   # 타입 에러 없음
npm run lint    # 린트 통과
# 단위 테스트 (Task 2.1~2.3)
```

기존 기능에 영향 없음 (신규 서비스만, 기존 코드 미수정)

---

## Step 3: GeminiService + UseCase 리팩토링

> **목표**: Function Calling 지원, 확장 프롬프트, UseCase 연동
> **주의**: 기존 동작을 깨뜨리지 않으면서 점진적으로 전환

### Task 3.1: chatPrompt.ts 확장

**파일**: `infrastructure/services/gemini/prompts/chatPrompt.ts`
**작업**:
- 기존 `buildSystemPrompt()` 유지 (하위 호환)
- `buildEnhancedSystemPrompt(context: ChatContext): string` 함수 추가:
  1. 기존 `buildSystemPrompt()` 호출로 베이스 생성
  2. 대화 요약 섹션 추가 (있을 때만)
  3. 현재 일정 섹션 추가 (있을 때만)
  4. 사용자 선호도 섹션 추가 (있을 때만)
  5. Function Calling 도구 사용 규칙 추가:
     - "장소 추천 시 반드시 recommend_places 도구 사용"
     - "일정 생성 시 반드시 generate_itinerary 도구 사용"
     - "텍스트 응답에 JSON 포함 금지"
- 기존 `buildSystemPrompt()`의 JSON 형식 가이드는 유지 (fallback용)

**검증**:
- 기존 `buildSystemPrompt()` 동작 변화 없음
- `buildEnhancedSystemPrompt()` 출력에 모든 섹션 포함 확인

### Task 3.2: GeminiService.ts 리팩토링

**파일**: `infrastructure/services/gemini/GeminiService.ts`
**작업**:
- 클래스에 `toolExecutor` 의존성 추가 (optional, setter 또는 factory)
- `streamChat()` 메서드 리팩토링:
  1. `buildEnhancedSystemPrompt()` 사용 (fallback: 기존 `buildSystemPrompt()`)
  2. `getGenerativeModel()` 호출 시 `tools` 파라미터 추가
     - `toolExecutor`가 설정된 경우에만 tools 포함
     - 미설정 시 기존 동작 유지 (하위 호환)
  3. `systemInstruction` 사용으로 시스템 프롬프트 분리
  4. 스트림 처리 로직 변경:
     - `part.text` → 텍스트 청크 yield (기존과 동일)
     - `part.functionCall` → ToolExecutor 실행 → 결과 청크 yield
  5. Function Call이 없었고 텍스트에 JSON이 포함된 경우 → 기존 `parsePlaces()` fallback
  6. `parsePlaces()` 함수는 모듈 내 유지 (fallback용)
- `toolContext` 구성: streamChat 파라미터의 ChatContext에서 추출

**주요 변경 포인트**:
```
기존: model.generateContentStream({ contents: [...] })
변경: model.generateContentStream({ contents: [...] })
      + tools: [{ functionDeclarations: CHAT_TOOL_DECLARATIONS }]
      + systemInstruction 분리

기존: 스트림 → accumulatedText → parsePlaces()
변경: 스트림 → part.functionCall 체크 → ToolExecutor
      fallback: 스트림 → accumulatedText → parsePlaces()
```

**하위 호환 전략**:
- `toolExecutor`가 null이면 기존 동작 100% 유지
- feature flag `CHATBOT_FUNCTION_CALLING_ENABLED`로 점진적 전환 가능

**검증**:
- 기존 텍스트 파싱 테스트 통과 (toolExecutor=null)
- Function Calling 모킹 테스트:
  - functionCall 파트 수신 시 ToolExecutor 호출 확인
  - text + functionCall 혼합 응답 처리
  - functionCall 없는 응답에서 parsePlaces fallback 동작

### Task 3.3: SendMessageUseCase.ts 업데이트

**파일**: `application/use-cases/chat/SendMessageUseCase.ts`
**작업**:
- 생성자에 `ChatContextBuilder` 의존성 추가 (optional)
- `execute()` 메서드 변경:
  1. 기존 Step 1~5 유지 (필터, 제한, 세션, 메시지 저장, 사용량 기록)
  2. Step 6 변경: `ChatContextBuilder.build()` 사용
     - builder가 있으면 → 확장 컨텍스트 구성 (일정, 선호도, 요약 포함)
     - builder가 없으면 → 기존 방식 (10턴 히스토리만)
  3. 확장된 existingPlaces 전달 (id, lat, lng 포함)
- `streamWithSave()` 내부: 새 StreamChunk 타입 처리
  - `tool_call`, `itinerary_preview` 청크도 yield
  - `fullContent`에는 text 청크만 누적 (기존과 동일)
  - places 배열에는 place 청크만 추가 (기존과 동일)

**검증**:
- 기존 동작 테스트 통과 (builder=null)
- 확장 컨텍스트 포함 테스트

### Step 3 체크포인트

```bash
npm run build
npm run lint
```

**핵심 검증**: 기존 챗봇 기능이 완전히 동일하게 동작하는지 확인
- Function Calling 없이 기존 텍스트 파싱 경로가 작동
- 신규 기능은 DI + feature flag로 활성화 전까지 비활성 상태

---

## Step 4: API + 프론트엔드

> **목표**: API 확장, 클라이언트 청크 처리, UI 컴포넌트

### Task 4.1: chat/route.ts API 확장

**파일**: `app/api/projects/[id]/chat/route.ts`
**작업**:
- 기존 existingPlaces 쿼리 확장:
  ```typescript
  // 기존: select: { name: true, category: true }
  // 변경: select: { id: true, name: true, category: true, latitude: true, longitude: true }
  ```
- `SendMessageUseCase` 생성 시 `ChatContextBuilder` 주입
- `ToolExecutor` + `PlaceValidationService` 인스턴스 생성 및 주입
- Feature flag 체크: `CHATBOT_FUNCTION_CALLING_ENABLED`
  - 활성화 시: toolExecutor 포함 GeminiService 사용
  - 비활성화 시: 기존 GeminiService 그대로

**검증**:
- 기존 POST /chat 동작 변화 없음 (feature flag off)
- feature flag on 시 확장 동작

### Task 4.2: apply-itinerary API 신규 생성

**파일**: `app/api/projects/[id]/chat/apply-itinerary/route.ts`
**작업**:
- POST 핸들러:
  1. NextAuth 인증
  2. 프로젝트 접근 확인
  3. Request body 검증 (Zod):
     - `preview: ItineraryPreviewData` (title, days 배열)
  4. 기존 일정 확인:
     - 있으면 → `{ error: 'ITINERARY_EXISTS', existingId: '...' }` 반환
     - 클라이언트에서 덮어쓰기 확인 후 `?overwrite=true` 쿼리로 재요청
  5. Itinerary 생성:
     - startDate/endDate 계산 (days 수로)
     - 각 day에 대해 ItineraryDay 생성
     - 각 item에 대해:
       - placeName으로 Place 조회 (`where: { projectId, name }`)
       - 매칭되면 ItineraryItem 생성 (placeId 연결)
       - 미매칭이면 건너뛰기 + skippedPlaces 배열에 추가
  6. 응답: `{ success: true, itineraryId: '...', skippedPlaces: [...] }`

**검증**:
- 정상 생성 케이스
- 기존 일정 존재 시 에러 반환
- overwrite=true 시 기존 삭제 후 재생성
- 미매칭 장소 건너뛰기

### Task 4.3: useChatStream.ts 청크 처리 확장

**파일**: `hooks/mutations/useChatStream.ts`
**작업**:
- 새 상태 추가:
  - `streamingToolCalls: ToolCallChunk[]`
  - `streamingItineraryPreview: ItineraryPreviewData | null`
- SSE 파싱 로직 확장:
  - `type === 'tool_call'` → `setStreamingToolCalls` 업데이트
  - `type === 'itinerary_preview'` → `setStreamingItineraryPreview` 설정
- 기존 `type === 'text'`, `type === 'place'`, `type === 'done'`, `type === 'error'` 처리 유지
- `reset()` 메서드에 새 상태 초기화 추가
- 반환 인터페이스에 새 상태 추가

**검증**:
- 기존 텍스트/장소 스트리밍 동작 유지
- 새 청크 타입 수신 시 상태 업데이트

### Task 4.4: useApplyItinerary.ts 신규 생성

**파일**: `hooks/mutations/useApplyItinerary.ts`
**작업**:
- `useApplyItinerary(projectId: string)` 훅:
  - `applyItinerary(preview: ItineraryPreviewData, overwrite?: boolean): Promise<ApplyResult>`
  - POST `/api/projects/${projectId}/chat/apply-itinerary`
  - overwrite 시 `?overwrite=true` 쿼리 추가
  - 성공 시 SWR itinerary 캐시 revalidation
  - 상태: `isApplying`, `error`, `result`

**검증**:
- API 호출 확인
- SWR revalidation 확인

### Task 4.5: PlaceCard.tsx 확장

**파일**: `components/chat/PlaceCard.tsx`
**작업**:
- `RecommendedPlace` → `ValidatedPlace` 지원 (하위 호환)
- 검증 배지 표시:
  - `isVerified: true` → 녹색 체크 아이콘 + "확인됨"
  - `isVerified: false` → 회색 물음표 + "미확인"
  - `isVerified` 미정의 (기존 데이터) → 배지 미표시
- 별점 표시: `rating` 있으면 별 아이콘 + 점수 + `(${userRatingsTotal})`
- 거리 표시: `distanceFromReference` 있으면 "~X.Xkm" 표시
- 기존 PlaceCard의 레이아웃 유지, 하단에 정보 추가

**검증**:
- 기존 PlaceCard (isVerified 없는 데이터) 렌더링 변화 없음
- 검증 데이터 포함 시 배지/별점/거리 표시

### Task 4.6: ItineraryPreviewCard.tsx 신규 생성

**파일**: `components/chat/ItineraryPreviewCard.tsx`
**작업**:
- Props: `preview`, `onApply`, `onRegenerate`, `isApplying`
- 레이아웃:
  - 헤더: 일정 제목 + 기간 (N박 M일)
  - Day별 섹션:
    - "Day N" 헤더 + 날짜
    - 아이템 목록: 시간 + 장소명 + 카테고리 아이콘 + 메모
    - 타임라인 스타일 (세로 라인 연결)
  - 푸터: "적용하기" 버튼 (primary) + "다시 생성" 버튼 (secondary)
  - 적용 중: 로딩 스피너
- 카테고리 아이콘: 기존 constants에서 가져오기
- 반응형: 채팅 윈도우 너비에 맞춤

**검증**:
- 프리뷰 데이터로 렌더링 확인
- "적용하기" 클릭 → onApply 호출
- "다시 생성" 클릭 → onRegenerate 호출
- isApplying=true 시 로딩 상태

### Task 4.7: StreamingMessage.tsx 확장

**파일**: `components/chat/StreamingMessage.tsx`
**작업**:
- `streamingItineraryPreview` prop 추가
- 프리뷰가 있으면 `ItineraryPreviewCard` 렌더링
- `onApply`/`onRegenerate` 핸들러 연결

**검증**:
- 기존 텍스트/장소 스트리밍 동작 유지
- 일정 프리뷰 청크 수신 시 카드 렌더링

### Task 4.8: ChatWindow.tsx 연동

**파일**: `components/chat/ChatWindow.tsx`
**작업**:
- `useApplyItinerary` 훅 통합
- StreamingMessage에 일정 프리뷰 관련 props 전달
- "적용하기" → `applyItinerary()` 호출
  - 기존 일정 존재 에러 시: 확인 다이얼로그 → overwrite=true 재시도
  - 성공 시: 토스트 메시지 "일정이 적용되었습니다"
  - 실패 시: 에러 메시지 표시
- "다시 생성" → 채팅에 "일정을 다시 만들어줘" 자동 전송

**검증**:
- 일정 적용 플로우 E2E
- 기존 일정 존재 시 확인 다이얼로그
- 에러 핸들링

### Step 4 체크포인트

```bash
npm run build
npm run lint
npm run dev     # 수동 테스트: 기존 챗봇 동작 확인
```

---

## Step 5: DI 통합 + 검증

> **목표**: 의존성 주입 연결, feature flag 설정, 통합 검증

### Task 5.1: container.ts 확장

**파일**: `infrastructure/container.ts`
**작업**:
- 새 팩토리 함수 추가:
  ```typescript
  export function createChatContextBuilder(): ChatContextBuilder
  export function createPlaceValidationService(): PlaceValidationService
  export function createToolExecutor(): ToolExecutor
  export function createEnhancedGeminiService(): GeminiService  // toolExecutor 포함
  export function createEnhancedSendMessageUseCase(): SendMessageUseCase
  ```
- 각 함수에서 의존성 자동 조립

**검증**:
- 팩토리 함수가 올바른 인스턴스 반환

### Task 5.2: feature-flags.ts 확장

**파일**: `lib/feature-flags.ts`
**작업**:
- `CHATBOT_FUNCTION_CALLING_ENABLED` 환경변수 추가
- `isFunctionCallingEnabled(userId?: string): boolean` 함수 추가
- 기존 chatbot feature flag와 독립적으로 동작

**검증**:
- flag on/off 에 따른 분기 확인

### Task 5.3: chat/route.ts 최종 연결

**파일**: `app/api/projects/[id]/chat/route.ts`
**작업**:
- `isFunctionCallingEnabled()` 체크:
  - true: `createEnhancedSendMessageUseCase()` 사용
  - false: 기존 `new SendMessageUseCase(chatRepository, geminiService, usageRepository)` 유지
- 기존 코드 경로 100% 보존

**검증**:
- flag off: 기존 동작 완전 동일
- flag on: Function Calling 활성화

### Task 5.4: 통합 테스트

**작업**:
1. **기존 기능 회귀 테스트** (flag off):
   - 일반 대화 응답
   - 장소 추천 (텍스트 파싱)
   - 장소 추가
   - 히스토리 조회/삭제
   - 사용량 제한
   - 프롬프트 인젝션 차단

2. **새 기능 테스트** (flag on):
   - Function Calling으로 장소 추천
   - 추천 장소에 Google Places 검증 데이터 포함
   - PlaceCard에 검증 배지/별점 표시
   - 일정 자동 생성 프리뷰
   - 일정 적용 (프리뷰 → DB 저장)
   - 확장 컨텍스트 (대화 요약, 일정 정보, 선호도)

3. **엣지 케이스**:
   - Gemini가 Function Call 대신 텍스트로 JSON 반환 → fallback 동작
   - Places API 장애 → isVerified=false로 graceful degradation
   - 일정 프리뷰에서 미매칭 장소 → skippedPlaces 반환
   - 기존 일정 존재 시 → 덮어쓰기 확인 플로우

### Task 5.5: 환경변수 문서 업데이트

**파일**: `CLAUDE.md` (Environment Variables 섹션)
**작업**:
- `CHATBOT_FUNCTION_CALLING_ENABLED=true/false` 추가

### Step 5 체크포인트

```bash
npm run build
npm run lint
npm run dev                    # 수동 테스트
npx playwright test            # E2E 테스트 (기존 23개 통과 확인)
```

---

## 전체 파일 변경 매트릭스

### 신규 파일 (8개)

| # | 파일 | Step | Task |
|---|------|------|------|
| 1 | `domain/interfaces/IPlaceValidationService.ts` | 1 | 1.2 |
| 2 | `infrastructure/services/gemini/tools/chatTools.ts` | 1 | 1.3 |
| 3 | `application/services/chat/ContextBuilder.ts` | 2 | 2.1 |
| 4 | `infrastructure/services/PlaceValidationService.ts` | 2 | 2.2 |
| 5 | `application/services/chat/ToolExecutor.ts` | 2 | 2.3 |
| 6 | `app/api/projects/[id]/chat/apply-itinerary/route.ts` | 4 | 4.2 |
| 7 | `components/chat/ItineraryPreviewCard.tsx` | 4 | 4.6 |
| 8 | `hooks/mutations/useApplyItinerary.ts` | 4 | 4.4 |

### 수정 파일 (10개)

| # | 파일 | Step | Task | 변경 규모 |
|---|------|------|------|-----------|
| 1 | `domain/interfaces/ILLMService.ts` | 1 | 1.1 | 중 (타입 추가) |
| 2 | `infrastructure/services/gemini/prompts/chatPrompt.ts` | 3 | 3.1 | 소 (함수 추가) |
| 3 | `infrastructure/services/gemini/GeminiService.ts` | 3 | 3.2 | 대 (핵심 리팩토링) |
| 4 | `application/use-cases/chat/SendMessageUseCase.ts` | 3 | 3.3 | 중 (DI 추가) |
| 5 | `app/api/projects/[id]/chat/route.ts` | 4 | 4.1 | 소 (쿼리 확장) |
| 6 | `hooks/mutations/useChatStream.ts` | 4 | 4.3 | 중 (상태 추가) |
| 7 | `components/chat/PlaceCard.tsx` | 4 | 4.5 | 소 (UI 추가) |
| 8 | `components/chat/StreamingMessage.tsx` | 4 | 4.7 | 소 (prop 추가) |
| 9 | `components/chat/ChatWindow.tsx` | 4 | 4.8 | 중 (핸들러 추가) |
| 10 | `infrastructure/container.ts` | 5 | 5.1 | 소 (팩토리 추가) |
| 11 | `lib/feature-flags.ts` | 5 | 5.2 | 소 (flag 추가) |

---

## 의존성 그래프

```
Task 1.1 ──┬──→ Task 2.1 ──→ Task 3.3 ──→ Task 4.1 ──→ Task 5.3
           │                                           ↗
Task 1.2 ──┼──→ Task 2.2 ──→ Task 2.3 ──→ Task 3.2 ─┤
           │                                           ↘
Task 1.3 ──┘                              Task 3.1     Task 5.1 ──→ Task 5.3
                                                        Task 5.2 ──→ Task 5.3

Task 4.2 (독립 - Step 1 타입만 의존)
Task 4.3 (Task 1.1 의존)
Task 4.4 (Task 4.2 의존)
Task 4.5 (Task 1.2 의존)
Task 4.6 (Task 1.1 의존)
Task 4.7 (Task 4.3, 4.6 의존)
Task 4.8 (Task 4.4, 4.7 의존)

Task 5.4 (전체 의존)
Task 5.5 (독립)
```

---

## 병렬 실행 가능 태스크

| 단계 | 병렬 실행 가능 | 순차 필요 |
|------|---------------|-----------|
| Step 1 | Task 1.1, 1.2, 1.3 (모두 병렬) | - |
| Step 2 | Task 2.1, 2.2 (병렬) | Task 2.3 (2.2 이후) |
| Step 3 | Task 3.1 (독립) | Task 3.2 (3.1 이후), 3.3 (3.2 이후) |
| Step 4 | Task 4.1~4.6 (대부분 병렬) | Task 4.7 (4.3+4.6 이후), 4.8 (4.4+4.7 이후) |
| Step 5 | Task 5.1, 5.2, 5.5 (병렬) | Task 5.3 (5.1+5.2 이후), 5.4 (전체 이후) |

---

## 롤백 전략

각 Step은 feature flag로 보호된다:

| 상황 | 조치 |
|------|------|
| Step 3 배포 후 문제 발견 | `CHATBOT_FUNCTION_CALLING_ENABLED=false` → 기존 동작 복원 |
| Places API 장애 | 자동 graceful degradation (isVerified=false) |
| 일정 적용 버그 | apply-itinerary API만 비활성화 (챗봇 자체는 정상) |

---

## 다음 단계

구현 시작: `/sc:implement Step 1`
