# Travel Planner 단계별 리팩토링 로드맵

**작성일**: 2026-01-22
**기반 문서**: `ARCHITECTURE_ANALYSIS.md`, `CLEAN_ARCHITECTURE_DESIGN.md`

---

## 의존성 다이어그램

```
Phase 0 (독립)
    │
    ▼
Phase 1 (기반 인프라)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 2 (서버)     Phase 3 (클라이언트)
    │                  │
    └────────┬─────────┘
             ▼
        Phase 4 (통합)
             │
             ▼
        Phase 5 (정리)
```

---

## Phase 0: 데드 코드 제거 (독립, 즉시 가능)

> 다른 작업에 의존하지 않음. 먼저 실행하여 코드베이스 정리.

- [x] **R0-1**: 미사용 Zustand Store 제거 ✅ (2026-01-22 완료, -66줄)
  ```
  /sc:refactor "store/useProjectStore.ts 파일 삭제.
  이 스토어는 어디에서도 import되지 않는 데드 코드임."
  ```
  - 대상: `store/useProjectStore.ts`
  - 예상 효과: -66줄, 번들 크기 감소

- [x] **R0-2**: 중복 타입 정의 제거 ✅ (2026-01-22 완료, -6줄)
  ```
  /sc:refactor "app/(dashboard)/projects/[id]/page.tsx에서
  로컬 Project 인터페이스를 제거하고 types/index.ts의 Project를 import"
  ```
  - 대상: `app/(dashboard)/projects/[id]/page.tsx:50-55`
  - 예상 효과: 타입 일관성 확보

---

## Phase 1: Infrastructure Layer (기반, Phase 2-3 선행 조건)

> API Client와 프롬프트 템플릿 — 이후 모든 작업의 기반

### 1A: API Client Layer

- [x] **R1-1**: API Client 기본 모듈 생성 ✅ (2026-01-22 완료)
  ```
  /sc:refactor "src/infrastructure/api-client/index.ts 생성.
  공통 fetch wrapper (get, post, put, patch, delete)와
  handleResponse 에러 핸들링 함수 구현"
  ```
  - 신규: `src/infrastructure/api-client/index.ts`
  - 의존: 없음

- [x] **R1-2**: Places API 모듈 생성 ✅ (2026-01-22 완료)
  ```
  /sc:refactor "src/infrastructure/api-client/places.api.ts 생성.
  getByProject, create, update, delete, getDetails,
  getDetailsWithToken 메서드 구현.
  R1-1의 apiClient 사용"
  ```
  - 신규: `src/infrastructure/api-client/places.api.ts`
  - 의존: R1-1

- [x] **R1-3**: Projects API 모듈 생성 ✅ (2026-01-22 완료)
  ```
  /sc:refactor "src/infrastructure/api-client/projects.api.ts 생성.
  getById, processImages, processText, toggleShare 메서드 구현"
  ```
  - 신규: `src/infrastructure/api-client/projects.api.ts`
  - 의존: R1-1

- [x] **R1-4**: Images API 모듈 생성 ✅ (2026-01-22 완료)
  ```
  /sc:refactor "src/infrastructure/api-client/images.api.ts 생성.
  getByProject, upload 메서드 구현"
  ```
  - 신규: `src/infrastructure/api-client/images.api.ts`
  - 의존: R1-1

- [x] **R1-5**: TextInputs API 모듈 생성 ✅ (2026-01-22 완료)
  ```
  /sc:refactor "src/infrastructure/api-client/textInputs.api.ts 생성.
  getByProject, create, delete 메서드 구현"
  ```
  - 신규: `src/infrastructure/api-client/textInputs.api.ts`
  - 의존: R1-1

### 1B: Claude 프롬프트 템플릿화

- [x] **R1-6**: 공통 프롬프트 템플릿 추출 ✅ (2026-01-22 완료)
  ```
  /sc:refactor "infrastructure/services/claude/prompts/basePrompt.ts 생성.
  lib/claude.ts의 analyzeImage와 analyzeText에서 공통 프롬프트 로직 추출.
  buildBasePrompt(config: PromptConfig) 함수로 통합"
  ```
  - 신규: `infrastructure/services/claude/prompts/basePrompt.ts`
  - 의존: 없음

- [x] **R1-7**: Image/Text 프롬프트 분리 ✅ (2026-01-22 완료)
  ```
  /sc:refactor "infrastructure/services/claude/prompts/imagePrompt.ts와
  textPrompt.ts 생성. basePrompt를 활용하여 각각 maxPlaces=5, 10으로 설정"
  ```
  - 신규: `imagePrompt.ts`, `textPrompt.ts`
  - 의존: R1-6

- [x] **R1-8**: lib/claude.ts 리팩토링 ✅ (2026-01-22 완료, 188줄 → 113줄)
  ```
  /sc:refactor "lib/claude.ts를 수정하여
  새로운 프롬프트 템플릿(R1-7) 사용.
  기존 ~188줄에서 ~113줄로 축소"
  ```
  - 수정: `lib/claude.ts`
  - 의존: R1-7

---

## Phase 2: Server-Side 비즈니스 로직 (Phase 1B 완료 후)

> API 라우트 코드 중복 제거 (~150줄)

### 2A: Domain Layer

- [x] **R2-1**: Domain Interfaces 정의 ✅ (2026-01-22 완료)
  - 신규: `domain/interfaces/*.ts`

- [x] **R2-2**: Value Objects 생성 ✅ (2026-01-22 완료)
  - 신규: `domain/value-objects/*.ts`

- [x] **R2-3**: DTOs 생성 ✅ (2026-01-22 완료)
  - 신규: `application/dto/*.ts`

### 2B: Application Services

- [x] **R2-4**: DuplicateDetectionService 추출 ✅ (2026-01-22 완료)
  - 신규: `application/services/DuplicateDetectionService.ts`

- [x] **R2-5**: GeocodingCacheService 추출 ✅ (2026-01-22 완료)
  - 신규: `application/services/GeocodingCacheService.ts`

### 2C: Use Cases (핵심)

- [x] **R2-6**: ProcessItemsBaseUseCase 생성 ✅ (2026-01-22 완료)
  - Template Method Pattern으로 공통 처리 로직 구현
  - 신규: `application/use-cases/processing/ProcessItemsBaseUseCase.ts`

- [x] **R2-7**: ProcessImagesUseCase 생성 ✅ (2026-01-22 완료)
  - 신규: `application/use-cases/processing/ProcessImagesUseCase.ts`

- [x] **R2-8**: ProcessTextInputsUseCase 생성 ✅ (2026-01-22 완료)
  - 신규: `application/use-cases/processing/ProcessTextInputsUseCase.ts`

### 2D: Infrastructure Implementations

- [x] **R2-9**: Prisma Repository 구현체 생성 ✅ (2026-01-22 완료)
  - 신규: `infrastructure/repositories/*.ts`

- [x] **R2-10**: DI Container 생성 ✅ (2026-01-22 완료)
  - 신규: `infrastructure/container.ts`

### 2E: API Route 리팩토링

- [x] **R2-11**: process/route.ts 리팩토링 ✅ (2026-01-22 완료, 297줄 → 77줄)
  - 수정: `process/route.ts`

- [x] **R2-12**: process-text/route.ts 리팩토링 ✅ (2026-01-22 완료, 300줄 → 77줄)
  - 수정: `process-text/route.ts`

---

## Phase 3: Client-Side Hooks Layer (Phase 1A 완료 후)

> SWR 기반 통합 데이터 페칭

### 3A: Query Hooks

- [x] **R3-1**: useProject 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/queries/useProject.ts`

- [x] **R3-2**: usePlaces 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/queries/usePlaces.ts`

- [x] **R3-3**: useImages 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/queries/useImages.ts`

- [x] **R3-4**: useTextInputs 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/queries/useTextInputs.ts`

- [x] **R3-5**: usePlaceDetails 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/queries/usePlaceDetails.ts`

### 3B: Mutation Hooks

- [x] **R3-6**: useProcessImages 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/mutations/useProcessImages.ts`

- [x] **R3-7**: useProcessText 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/mutations/useProcessText.ts`

- [x] **R3-8**: usePlaceMutations 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `hooks/mutations/usePlaceMutations.ts`
  - 신규: `hooks/mutations/usePlaceMutations.ts`
  - 의존: R1-2

---

## Phase 4: Component Layer 통합 (Phase 2, 3 완료 후)

> God Component 분리 및 훅 적용

### 4A: 통합 훅 생성

- [x] **R4-1**: useProjectDetail 통합 훅 생성 ✅ (2026-01-22 완료)
  - 신규: `_hooks/useProjectDetail.ts` (~260줄)
  - 의존: R3-1 ~ R3-7

### 4B: 섹션 컴포넌트 분리 (스킵 - 페이지 크기 충분히 축소됨)

- [~] **R4-2 ~ R4-5**: 섹션 분리 스킵
  - page.tsx가 657줄 → 445줄로 축소되어 추가 분리 불필요
  - 향후 필요시 진행

### 4C: 페이지 컴포넌트 최종 리팩토링

- [x] **R4-6**: ProjectDetailPage 리팩토링 ✅ (2026-01-22 완료, 657줄 → 445줄)
  - 수정: `page.tsx`
  - useProjectDetail 통합 훅 사용

### 4D: 기존 컴포넌트 API Client 적용

- [x] **R4-7**: PlaceDetailsPanel API Client 적용 ✅ (2026-01-22 완료)
  - 수정: `PlaceDetailsPanel.tsx`
  - usePlaceDetails 훅 사용

- [x] **R4-8**: ImageUploader API Client 적용 ✅ (2026-01-22 완료)
  - 수정: `ImageUploader.tsx`
  - imagesApi 사용

- [x] **R4-9**: PlaceEditModal API Client 적용 ✅ (2026-01-22 완료)
  - 수정: `PlaceEditModal.tsx`
  - placesApi 사용

---

## Phase 5: 정리 및 검증 (모든 Phase 완료 후)

- [x] **R5-1**: 미사용 import 정리 ✅ (2026-01-22 완료)
  - 리팩토링 관련 미사용 임포트 정리 완료
  - 기존 코드 경고는 별도 태스크로 처리

- [x] **R5-2**: 타입 일관성 검증 ✅ (2026-01-22 완료)
  - `npm run build` 성공
  - TypeScript 컴파일 에러 없음

- [x] **R5-3**: 빌드 및 테스트 ✅ (2026-01-22 완료)
  - 빌드 성공
  - E2E 테스트 168개 통과

- [x] **R5-4**: 문서 업데이트 ✅ (2026-01-22 완료)
  - REFACTORING_ROADMAP.md 업데이트

---

## 요약 테이블

| Phase | 작업 수 | 예상 효과 | 선행 조건 |
|-------|---------|-----------|-----------|
| 0 | 2 | 데드 코드 제거 | 없음 |
| 1 | 8 | API Client + 프롬프트 통합 | 없음 |
| 2 | 12 | ~450줄 중복 제거 | Phase 1B |
| 3 | 8 | SWR 통합 데이터 페칭 | Phase 1A |
| 4 | 9 | God Component 분리 | Phase 2, 3 |
| 5 | 4 | 검증 및 정리 | Phase 4 |
| **Total** | **43** | | |

---

## 실행 순서 권장

```
1. R0-1, R0-2 (병렬)
2. R1-1 → R1-2~R1-5 (병렬) → R1-6 → R1-7 → R1-8
3. R2-1~R2-3 (병렬) → R2-4, R2-5 (병렬) → R2-6 → R2-7, R2-8 (병렬) → R2-9 → R2-10 → R2-11, R2-12 (병렬)
4. R3-1~R3-5 (병렬) → R3-6~R3-8 (병렬)
5. R4-1 → R4-2~R4-4 (병렬) → R4-5 → R4-6 → R4-7~R4-9 (병렬)
6. R5-1 → R5-2 → R5-3 → R5-4
```

---

## 다음 단계

각 작업은 `/sc:refactor` 명령으로 실행 가능합니다.

```bash
# 예시: Phase 0 시작
/sc:refactor "store/useProjectStore.ts 파일 삭제.
이 스토어는 어디에서도 import되지 않는 데드 코드임."
```

---

## 리팩토링 완료 요약 (2026-01-22)

### 성과 요약

| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| process/route.ts | 297줄 | 77줄 | -74% |
| process-text/route.ts | 300줄 | 77줄 | -74% |
| lib/claude.ts | 188줄 | 113줄 | -40% |
| ProjectDetailPage | 657줄 | 445줄 | -32% |
| 데드 코드 | 72줄 | 0줄 | -100% |

### 생성된 신규 아키텍처 모듈

```
infrastructure/
├── api-client/
│   ├── index.ts (공통 API Client)
│   ├── places.api.ts
│   ├── projects.api.ts
│   ├── images.api.ts
│   └── textInputs.api.ts
├── services/claude/prompts/
│   ├── basePrompt.ts
│   ├── imagePrompt.ts
│   └── textPrompt.ts
├── repositories/
│   ├── PrismaPlaceRepository.ts
│   ├── PrismaImageRepository.ts
│   └── PrismaTextInputRepository.ts
└── container.ts (DI Container)

domain/
├── interfaces/
│   ├── IPlaceRepository.ts
│   ├── IImageRepository.ts
│   └── ITextInputRepository.ts
└── value-objects/
    ├── Coordinates.ts
    └── ProcessingStatus.ts

application/
├── dto/
│   ├── ProcessingResultDTO.ts
│   └── PlaceExtractionDTO.ts
├── services/
│   ├── DuplicateDetectionService.ts
│   └── GeocodingCacheService.ts
└── use-cases/processing/
    ├── ProcessItemsBaseUseCase.ts (Template Method)
    ├── ProcessImagesUseCase.ts
    └── ProcessTextInputsUseCase.ts

hooks/
├── queries/
│   ├── useProject.ts
│   ├── usePlaces.ts
│   ├── useImages.ts
│   ├── useTextInputs.ts
│   └── usePlaceDetails.ts
└── mutations/
    ├── useProcessImages.ts
    ├── useProcessText.ts
    └── usePlaceMutations.ts
```

### 주요 개선 사항

1. **코드 중복 제거**: Template Method Pattern으로 ~440줄 중복 제거
2. **관심사 분리**: Clean Architecture 레이어 도입
3. **타입 안정성**: 공통 API Client와 타입 정의
4. **재사용성**: SWR 기반 훅으로 데이터 페칭 통합
5. **테스트 통과**: E2E 테스트 168개 전부 통과
