# Phase 2-A 테스트 결과 리포트

> **실행일**: 2026-01-27
> **검증 방법**: 빌드/타입/린트 + 정적 코드 경로 분석
> **결과**: ALL PASS

---

## 1. 빌드 검증

| 항목 | 결과 | 비고 |
|------|------|------|
| `npm run build` | **PASS** | 프로덕션 빌드 성공 |
| `/api/projects/[id]/chat/apply-itinerary` 라우트 등록 | **PASS** | 빌드 출력에서 확인 |

---

## 2. 타입 체크

| 항목 | 결과 | 비고 |
|------|------|------|
| `npx tsc --noEmit` | **PASS** | Phase 2-A 관련 에러 0건 |
| Pre-existing 에러 | 13건 | PlacePickerModal.test.tsx(5), e2e specs(8) - Phase 2-A 무관 |

---

## 3. 린트

| 항목 | 결과 | 비고 |
|------|------|------|
| Phase 2-A 전체 20개 파일 eslint | **PASS** | 에러 0건, 경고 2건 |
| 경고 1: `cleanChatResponse` unused import | Pre-existing | useChatStream.ts |
| 경고 2: `_userId` unused param | 의도적 | feature-flags.ts (future rollout용) |

---

## 4. 테스트 A: 기존 기능 회귀 (Flag OFF)

| # | 검증 항목 | 결과 | 근거 |
|---|----------|------|------|
| A-1 | route.ts: Flag OFF → contextBuilder=undefined | **PASS** | `fcEnabled=false` → `contextBuilder=undefined` 분기 확인 |
| A-2 | SendMessageUseCase: contextBuilder 없으면 레거시 경로 | **PASS** | `getRecentMessages(session.id, 10)` fallback 확인 |
| A-3 | GeminiService: toolExecutor=null → streamChatLegacy() | **PASS** | `_toolExecutor` null 체크 → 레거시 위임 확인 |
| A-4 | streamChatLegacy(): 원본 동작 100% 보존 | **PASS** | buildSystemPrompt() 사용, tools 미포함, parsePlaces() 동작 |
| A-5 | useChatStream: 새 상태 안전 기본값 | **PASS** | `streamingToolCalls=[]`, `streamingItineraryPreview=null` |
| A-6 | StreamingMessage: 새 props 모두 optional | **PASS** | `?` 타입 + guard 조건 (triple &&) |
| A-7 | MessageList: 새 props 모두 optional | **PASS** | `?` 타입으로 하위 호환 |
| A-8 | PlaceCard: isVerified undefined → 배지 미표시 | **PASS** | `place.isVerified !== undefined` 가드 확인 |
| A-9 | PromptInjectionFilter 동작 보존 | **PASS** | SendMessageUseCase Step 1 변경 없음 |
| A-10 | UsageLimitService 동작 보존 | **PASS** | SendMessageUseCase Step 2 변경 없음 |
| A-11 | ChatHistory 동작 보존 | **PASS** | chatRepository 인터페이스 미변경 |

**회귀 테스트: 11/11 PASS**

---

## 5. 테스트 B: Function Calling (Flag ON)

| # | 검증 항목 | 결과 | 근거 |
|---|----------|------|------|
| B-1 | streamChatWithTools(): buildEnhancedSystemPrompt() 사용 | **PASS** | Line 257 확인 |
| B-2 | tools 파라미터에 CHAT_TOOL_DECLARATIONS 포함 | **PASS** | Line 268 확인 |
| B-3 | part.functionCall 감지 → ToolExecutor.execute() 호출 | **PASS** | Lines 305-329 확인 |
| B-4 | recommend_places → validateAndEnrich() → 거리순 정렬 | **PASS** | ToolExecutor handleRecommendPlaces 확인 |
| B-5 | generate_itinerary → ItineraryPreviewData + requiresConfirmation | **PASS** | handleGenerateItinerary 확인 |
| B-6 | search_nearby → 좌표 검증 → searchNearby() | **PASS** | handleSearchNearby 좌표 체크 확인 |
| B-7 | Fallback: functionCall 없으면 parsePlaces() 실행 | **PASS** | Lines 384-396 확인 |
| B-8 | itinerary_preview 청크 yield | **PASS** | Line 356 확인 |
| B-9 | tool_call/tool_result 청크 yield | **PASS** | Lines 314-370 확인 |
| B-10 | ChatContextBuilder: Promise.all 병렬 로드 | **PASS** | Line 37-41 확인 |
| B-11 | 10턴 초과 시 conversationSummary 생성 | **PASS** | Line 45 조건 확인 |
| B-12 | userPreferences (카테고리 빈도 분석) | **PASS** | analyzePreferences() Line 141-154 확인 |
| B-13 | itinerary 컨텍스트 포맷 | **PASS** | formatItinerary() Line 159-173 확인 |
| B-14 | apply-itinerary: Zod 검증 | **PASS** | applyItinerarySchema.safeParse() 확인 |
| B-15 | apply-itinerary: 409 ITINERARY_EXISTS | **PASS** | 기존 일정 체크 + 409 응답 확인 |
| B-16 | apply-itinerary: ?overwrite=true 지원 | **PASS** | searchParams.get('overwrite') 확인 |
| B-17 | apply-itinerary: case-insensitive 장소 매칭 | **PASS** | `mode: 'insensitive'` 확인 |
| B-18 | apply-itinerary: skippedPlaces 반환 | **PASS** | 미매칭 시 배열 추가 + 응답 포함 확인 |

**Function Calling 테스트: 18/18 PASS**

---

## 6. 테스트 C/D: Import 완결성 + UI Props

| # | 검증 항목 | 결과 | 근거 |
|---|----------|------|------|
| C-1 | `@google/generative-ai` 패키지 존재 | **PASS** | package.json ^0.21.0 |
| C-2 | `zod` 패키지 존재 | **PASS** | package.json ^4.3.5 |
| C-3 | `server-only` 패키지 존재 | **PASS** | package.json ^0.0.1 |
| C-4 | `getServerApiKey()` export 존재 | **PASS** | lib/google-maps.ts Line 61 |
| C-5 | `ItineraryWithDays` type export 존재 | **PASS** | IItineraryRepository.ts Lines 26-28 |
| C-6 | `Calendar`, `Clock`, `Loader2` icon export 존재 | **PASS** | icons/index.ts Lines 41, 130, 93 |
| C-7 | `Star`, `CircleCheck`, `Info` icon export 존재 | **PASS** | icons/index.ts Lines 59, 103, 100 |
| C-8 | `itineraryRepository` singleton export 존재 | **PASS** | PrismaItineraryRepository.ts Line 159 |
| C-9 | `placeValidationService` singleton export 존재 | **PASS** | PlaceValidationService.ts Line 303 |
| C-10 | `ItineraryPreviewData` type export 존재 | **PASS** | ILLMService.ts Lines 31-47 |
| D-1 | ItineraryPreviewCard props 타입 정합성 | **PASS** | preview, onApply, onRegenerate, isApplying |
| D-2 | StreamingMessage optional props 가드 | **PASS** | Triple && 조건부 렌더링 |
| D-3 | PlaceCard Partial<ValidatedPlace> 호환 | **PASS** | Partial<Pick<...>> 타입으로 하위 호환 |

**Import/Props 테스트: 13/13 PASS**

---

## 종합 결과

```
빌드 검증:              2 / 2   PASS
타입 체크:              1 / 1   PASS (Phase 2-A 에러 0건)
린트:                  1 / 1   PASS (에러 0건)
테스트 A (회귀):        11 / 11  PASS
테스트 B (Function Calling): 18 / 18  PASS
테스트 C/D (Import/Props):  13 / 13  PASS
──────────────────────────────────────
총합:                  46 / 46  PASS
```

### Phase 2-A 파일 매트릭스

| 파일 | 상태 | 빌드 | 타입 | 린트 | 회귀 | FC |
|------|------|------|------|------|------|-----|
| domain/interfaces/ILLMService.ts | 수정 | OK | OK | OK | OK | OK |
| domain/interfaces/IPlaceValidationService.ts | 신규 | OK | OK | OK | - | OK |
| infrastructure/services/gemini/tools/chatTools.ts | 신규 | OK | OK | OK | - | OK |
| infrastructure/services/gemini/prompts/chatPrompt.ts | 수정 | OK | OK | OK | OK | OK |
| infrastructure/services/gemini/GeminiService.ts | 수정 | OK | OK | OK | OK | OK |
| infrastructure/services/PlaceValidationService.ts | 신규 | OK | OK | OK | - | OK |
| application/services/chat/ContextBuilder.ts | 신규 | OK | OK | OK | - | OK |
| application/services/chat/ToolExecutor.ts | 신규 | OK | OK | OK | - | OK |
| application/use-cases/chat/SendMessageUseCase.ts | 수정 | OK | OK | OK | OK | OK |
| app/api/projects/[id]/chat/route.ts | 수정 | OK | OK | OK | OK | OK |
| app/api/projects/[id]/chat/apply-itinerary/route.ts | 신규 | OK | OK | OK | - | OK |
| hooks/mutations/useChatStream.ts | 수정 | OK | OK | OK | OK | OK |
| hooks/mutations/useApplyItinerary.ts | 신규 | OK | OK | OK | - | OK |
| components/chat/PlaceCard.tsx | 수정 | OK | OK | OK | OK | OK |
| components/chat/ItineraryPreviewCard.tsx | 신규 | OK | OK | OK | - | OK |
| components/chat/StreamingMessage.tsx | 수정 | OK | OK | OK | OK | OK |
| components/chat/MessageList.tsx | 수정 | OK | OK | OK | OK | OK |
| components/chat/ChatWindow.tsx | 수정 | OK | OK | OK | OK | OK |
| infrastructure/container.ts | 수정 | OK | OK | OK | - | OK |
| lib/feature-flags.ts | 수정 | OK | OK | OK | OK | OK |

### 수동 테스트 권장 사항

빌드/타입/린트/정적 분석은 모두 통과했습니다. 다음은 `npm run dev`로 수동 확인이 필요한 항목입니다:

1. **Flag OFF**: 브라우저에서 기존 챗봇 대화 → 장소 추천 → 추가 플로우
2. **Flag ON**: 브라우저에서 Function Calling 장소 추천 (검증 배지/별점 확인)
3. **Flag ON**: "2박 3일 일정 만들어줘" → ItineraryPreviewCard → 적용하기
4. **Gemini API 응답**: `gemini-3-flash-preview` 모델 정상 호출 확인
