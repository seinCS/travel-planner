# Travel Planner 아키텍처 분석 보고서

**분석일**: 2026-01-22
**분석 대상**: travel-planner 프로젝트
**분석 버전**: Phase 4 (Production)

---

## 1. 개요

이 문서는 Travel Planner 프로젝트의 코드베이스를 분석하여 유지보수성, 확장성, 코드 품질 측면에서 발견된 문제점과 개선 방안을 정리한 것입니다.

### 1.1 분석 범위

- 프로젝트 구조 및 아키텍처 패턴
- 컴포넌트 간 결합도 및 의존성
- 코드 중복 및 스파게티 코드 패턴
- 상태 관리 전략
- 데이터 페칭 패턴

### 1.2 분석 요약

| 영역 | 상태 | 심각도 |
|------|------|--------|
| 코드 중복 | 심각 | 🔴 Critical |
| 컴포넌트 크기 | 개선 필요 | 🟠 High |
| 미사용 코드 | 정리 필요 | 🟡 Medium |
| 결합도 | 양호 | 🟢 Good |
| 순환 의존성 | 없음 | 🟢 Good |

---

## 2. Critical Issues

### 2.1 API 라우트 간 대규모 코드 중복 (~150줄)

**파일:**
- `app/api/projects/[id]/process/route.ts` (297줄)
- `app/api/projects/[id]/process-text/route.ts` (300줄)

**문제 설명:**

두 파일의 핵심 처리 로직이 **90% 이상 동일**합니다. 이미지 처리와 텍스트 처리의 차이는 Claude API 호출 부분(`analyzeImage` vs `analyzeText`)과 연결 테이블(`placeImage` vs `placeTextInput`)뿐입니다.

**중복된 코드 영역:**

| 라인 범위 | 기능 |
|-----------|------|
| 40-47 | 재시도 대상 pending 상태로 변경 |
| 49-57 | 병렬 데이터 조회 (Promise.all) |
| 63-67 | existingPlaces 복사, geocodingCache 생성 |
| 74-98 | Claude API 병렬 호출 래퍼 |
| 104-131 | 분석 실패/빈 결과 처리 |
| 138-172 | 신뢰도 체크, 중복 체크, Geocoding 캐시 로직 |
| 176-192 | 프로젝트 내 중복 장소 확인 (3단계 fallback) |
| 194-250 | 장소 생성 또는 연결 로직 |
| 258-287 | 상태 업데이트 (성공/실패) |

**코드 비교 예시:**

```typescript
// process/route.ts (Line 176-185)
const duplicate = existingPlaces.find(
  (p) =>
    (p.googlePlaceId && geoResult!.googlePlaceId &&
     p.googlePlaceId === geoResult!.googlePlaceId) ||
    p.name.toLowerCase() === placeNameLower ||
    isDuplicatePlace(p.latitude, p.longitude,
                     geoResult!.latitude, geoResult!.longitude)
)

// process-text/route.ts (Line 184-192) - 완전히 동일
const duplicate = existingPlaces.find(
  (p) =>
    (p.googlePlaceId && geoResult!.googlePlaceId &&
     p.googlePlaceId === geoResult!.googlePlaceId) ||
    p.name.toLowerCase() === placeNameLower ||
    isDuplicatePlace(p.latitude, p.longitude,
                     geoResult!.latitude, geoResult!.longitude)
)
```

**영향:**
- 버그 수정 시 두 곳 모두 수정 필요 → 누락 위험
- 로직 변경 시 불일치 발생 가능
- 테스트 코드 중복
- 유지보수 비용 2배

---

### 2.2 거대한 페이지 컴포넌트 (God Component)

**파일:** `app/(dashboard)/projects/[id]/page.tsx` (657줄)

**문제 설명:**

단일 컴포넌트에 **22개의 상태 변수**와 **13개 이상의 핸들러 함수**가 존재하여 Single Responsibility Principle(SRP)을 위반합니다.

**상태 변수 목록 (Line 61-82):**

```typescript
const [project, setProject] = useState<Project | null>(null)
const [places, setPlaces] = useState<PlaceWithPlaceImages[]>([])
const [images, setImages] = useState<Image[]>([])
const [textInputs, setTextInputs] = useState<TextInput[]>([])
const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
const [loading, setLoading] = useState(true)
const [processing, setProcessing] = useState(false)
const [processingText, setProcessingText] = useState(false)
const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
const [selectedImage, setSelectedImage] = useState<Image | null>(null)
const [isImageModalOpen, setIsImageModalOpen] = useState(false)
const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)
const [editingPlace, setEditingPlace] = useState<PlaceWithPlaceImages | null>(null)
const [isEditModalOpen, setIsEditModalOpen] = useState(false)
const [isShareModalOpen, setIsShareModalOpen] = useState(false)
const [mobileTab, setMobileTab] = useState<MobileTab>('map')
const [sidebarTab, setSidebarTab] = useState<'list' | 'input'>('list')
```

**혼합된 책임 영역:**

| 책임 | 관련 상태/함수 |
|------|----------------|
| 프로젝트 데이터 관리 | project, fetchProject |
| 장소 목록 관리 | places, fetchPlaces, handlePlaceDelete, handleEditPlace |
| 이미지 목록 관리 | images, fetchProject (images 포함), handleUploadComplete |
| 텍스트 입력 관리 | textInputs, fetchTextInputs, handleTextInputComplete |
| 처리 상태 관리 | processing, processingText, handleProcess, handleProcessText |
| UI 상태 관리 | selectedPlaceId, categoryFilter, mobileTab, sidebarTab |
| 모달 상태 관리 | isImageModalOpen, isEditModalOpen, isShareModalOpen, detailPlaceId |
| 맵 상태 관리 | mapCenter, geocodeDestination 호출 |

**영향:**
- 코드 가독성 저하
- 테스트 작성 어려움
- 상태 변경 시 전체 컴포넌트 리렌더링
- 새 기능 추가 시 복잡도 급증

---

## 3. High Priority Issues

### 3.1 Zustand Store 정의되었으나 미사용

**파일:** `store/useProjectStore.ts` (66줄)

**현황:**

```typescript
// 정의된 인터페이스와 스토어
interface ProjectState {
  selectedPlaceId: string | null
  places: Place[]
  images: Image[]
  isProcessing: boolean
  processingProgress: number
  categoryFilter: string | null
  // ... setters
}

export const useProjectStore = create<ProjectState>((set) => ({
  // 18개의 상태와 메서드 정의
}))
```

**사용 현황:**

```bash
$ grep -r "useProjectStore" --include="*.ts" --include="*.tsx"
# 결과: store/useProjectStore.ts 파일만 검색됨 (정의 파일)
# import하는 파일: 0개
```

**영향:**
- 개발자 혼란: 상태 관리 전략 불명확
- 불필요한 번들 크기 증가
- 데드 코드로 인한 유지보수 부담

---

### 3.2 Claude API 프롬프트 중복 (~80%)

**파일:** `lib/claude.ts`

**중복 영역:**

| 영역 | analyzeImage | analyzeText |
|------|--------------|-------------|
| 모델 설정 | claude-sonnet-4-20250514 | 동일 |
| max_tokens | 2048 | 동일 |
| 카테고리 enum | restaurant\|cafe\|... | 동일 |
| 신뢰도 점수 설명 | 0.9-1.0: Clear... | 거의 동일 |
| JSON 응답 형식 | { places: [...] } | 동일 |
| 에러 처리 | markdown cleanup | 동일 |
| **차이점** | image 메시지 구조 | text 메시지 구조 |
| **차이점** | 최대 5개 장소 | 최대 10개 장소 |

---

### 3.3 데이터 페칭 패턴 불일치

**현황 비교:**

| 컴포넌트 | 방식 | 캐싱 | 재검증 |
|----------|------|------|--------|
| `PlaceDetailsPanel` | SWR | ✅ 60초 캐시 | ✅ dedupingInterval |
| `ProjectDetailPage` | 직접 fetch | ❌ 없음 | ❌ 매번 호출 |

**좋은 패턴 (PlaceDetailsPanel):**

```typescript
const { data: details, isLoading } = useSWR<PlaceDetailsResponse>(
  apiUrl,
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1분 캐시
  }
)
```

**문제 있는 패턴 (ProjectDetailPage):**

```typescript
const fetchPlaces = async () => {
  const res = await fetch(`/api/projects/${id}/places`)
  if (res.ok) setPlaces(data.places || [])
}

useEffect(() => {
  Promise.all([fetchProject(), fetchPlaces(), fetchTextInputs()])
}, [id]) // 캐싱 없이 매번 호출
```

---

## 4. Medium Priority Issues

### 4.1 타입 중복 정의

**파일:** `app/(dashboard)/projects/[id]/page.tsx` (Line 50-55)

```typescript
// 이미 types/index.ts에 정의되어 있는 타입을 로컬에서 재정의
interface Project {
  id: string
  name: string
  destination: string
  country: string | null
}
```

**권장:** `types/index.ts`의 타입을 import하여 사용

---

### 4.2 컴포넌트-API 강한 결합

컴포넌트들이 API 경로를 하드코딩하여 직접 참조합니다.

```typescript
// PlaceDetailsPanel.tsx
const apiUrl = shareToken
  ? `/api/share/${shareToken}/places/${placeId}/details`
  : `/api/places/${placeId}/details`

// ImageUploader.tsx
await fetch(`/api/projects/${projectId}/images`, { method: 'POST' })

// PlaceEditModal.tsx
await fetch(`/api/places/${place.id}`, { method: 'PUT' })
```

**문제점:**
- API 경로 변경 시 여러 파일 수정 필요
- 테스트 시 API 모킹 어려움
- 타입 안정성 부족

---

## 5. 긍정적인 발견

### 5.1 순환 의존성 없음 ✅

컴포넌트 import 그래프가 단방향으로 구성되어 있습니다.

```
ProjectDetailPage
├── GoogleMap (dynamic)
├── PlaceDetailsPanel (dynamic)
├── PlaceEditModal (dynamic)
├── ShareModal (dynamic)
├── PlaceList (direct)
├── InputTabs
│   ├── ImageUploader
│   ├── TextInputForm
│   └── UrlInputForm
├── TextInputList
├── ImageList
├── FailedImages
└── lib/* (no back-references)
```

### 5.2 성능 최적화 적용됨 ✅

| 최적화 기법 | 적용 위치 |
|-------------|-----------|
| Dynamic imports | GoogleMap, PlaceDetailsPanel, PlaceEditModal |
| Promise.all 병렬 처리 | 데이터 페칭, Claude API 호출, Geocoding |
| useMemo/useCallback | GoogleMap 마커 생성 |
| React.cache() | lib/queries.ts |
| SWR 캐싱 | PlaceDetailsPanel |

### 5.3 잘 조직된 유틸리티 ✅

| 파일 | 역할 |
|------|------|
| `lib/google-maps.ts` | 4단계 fallback 전략의 Geocoding |
| `lib/constants.ts` | 중앙집중화된 상수 (카테고리, 업로드 제한) |
| `lib/queries.ts` | 캐시된 서버 사이드 쿼리 |
| `lib/auth.ts` | NextAuth 설정 |

---

## 6. 개선 권장 사항

### Phase 1: 데드 코드 제거 (쉬움, 즉시 적용)

**작업:**
- `store/useProjectStore.ts` 삭제 또는 활용 결정
- 중복 타입 정의 제거

**예상 효과:**
- 번들 크기 감소
- 코드베이스 명확성 향상

---

### Phase 2: 처리 로직 추출 (중요, 1주)

**작업:**
- `lib/services/processingService.ts` 생성
- 공통 처리 로직 추출

**제안 인터페이스:**

```typescript
// lib/services/processingService.ts
interface ProcessingInput {
  id: string
  content: string
  type: 'image' | 'text'
}

interface ProcessingResult {
  processed: number
  failed: number
}

export async function processItems(
  items: ProcessingInput[],
  analyzeFunction: (content: string) => Promise<PlaceExtractionResult>,
  linkFunction: (placeId: string, itemId: string) => Promise<void>,
  projectId: string,
  destination: string,
  country?: string
): Promise<ProcessingResult>
```

**예상 효과:**
- ~150줄 코드 중복 제거
- 단일 수정 지점
- 테스트 용이성 향상

---

### Phase 3: 페이지 컴포넌트 분리 (중요, 1-2주)

**작업:**
- 커스텀 훅으로 데이터 로직 추출
- 섹션별 컴포넌트 분리

**제안 구조:**

```
ProjectDetailPage (오케스트레이터, ~100줄)
├── hooks/
│   └── useProjectData.ts (데이터 페칭 + 상태)
├── sections/
│   ├── MapSection.tsx (맵 + 상세 패널)
│   ├── PlaceSection.tsx (장소 목록 + 필터)
│   └── InputSection.tsx (입력 탭 + 목록)
└── modals/
    └── (기존 모달 컴포넌트 활용)
```

**예상 효과:**
- 컴포넌트당 단일 책임
- 테스트 작성 용이
- 재사용성 향상

---

### Phase 4: API 클라이언트 레이어 (선택, 2주)

**작업:**
- API 호출 로직을 별도 레이어로 분리

**제안 구조:**

```typescript
// lib/api/places.ts
export const placesApi = {
  getAll: (projectId: string) =>
    fetch(`/api/projects/${projectId}/places`).then(handleResponse),

  create: (projectId: string, data: CreatePlaceInput) =>
    fetch(`/api/projects/${projectId}/places`, {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(handleResponse),

  update: (placeId: string, data: UpdatePlaceInput) =>
    fetch(`/api/places/${placeId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }).then(handleResponse),

  delete: (placeId: string) =>
    fetch(`/api/places/${placeId}`, { method: 'DELETE' }).then(handleResponse),
}
```

**예상 효과:**
- API 경로 중앙 관리
- 타입 안정성 향상
- 테스트 시 모킹 용이

---

## 7. 결론

Travel Planner 프로젝트는 **좋은 기반 아키텍처**를 가지고 있으며, 성능 최적화와 유틸리티 조직화가 잘 되어 있습니다. 그러나 **코드 중복**과 **거대한 페이지 컴포넌트**가 유지보수의 주요 병목입니다.

**우선순위별 조치 사항:**

| 순위 | 작업 | 효과 |
|------|------|------|
| 1 | 처리 로직 통합 | ~150줄 중복 제거, 버그 수정 단일화 |
| 2 | 미사용 코드 제거 | 코드베이스 명확성 |
| 3 | 페이지 컴포넌트 분리 | 유지보수성, 테스트 용이성 |
| 4 | API 클라이언트 레이어 | 확장성, 타입 안정성 |

이 작업들은 기존 아키텍처를 유지하면서 점진적으로 적용 가능합니다.

---

## 부록: 파일별 분석 결과

| 파일 | 줄 수 | 상태 | 주요 이슈 |
|------|-------|------|-----------|
| `app/api/projects/[id]/process/route.ts` | 297 | 🔴 | 코드 중복 |
| `app/api/projects/[id]/process-text/route.ts` | 300 | 🔴 | 코드 중복 |
| `app/(dashboard)/projects/[id]/page.tsx` | 657 | 🟠 | God Component |
| `store/useProjectStore.ts` | 66 | 🟡 | 미사용 |
| `lib/claude.ts` | 188 | 🟡 | 프롬프트 중복 |
| `lib/google-maps.ts` | 359 | 🟢 | 잘 설계됨 |
| `lib/queries.ts` | 268 | 🟢 | React.cache 활용 |
| `components/map/GoogleMap.tsx` | ~150 | 🟢 | 최적화 적용 |
