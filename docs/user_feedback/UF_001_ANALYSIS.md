# 사용자 피드백 분석 보고서 (UF_001)

> 생성일: 2026-01-27
> 상태: Sprint 1 구현 진행 중

## 원본 피드백

```
사용자 리뷰
 - 전체적으로 이모지, 아이콘들이 별로에요
 - |이미지|텍스트|URL|에서 ui 깨짐(URL이 밖으로 나감)
 - 일정 사용성이 너무 떨어져요 (트리플 같은 다른 앱이 훨씬 편함)
 - 일정 추가하는데 시간이 너무 오래걸려요, 하나 누리고 추가될 때까지 로딩이 한참 걸림
 - 일정 추가할 때 그냥 이름 리스트만 나오니깐 머가 먼지 모르겠어요
 - 일정에서 핀이 찍히는게 이상해요. (숙소는 핀에 안찍힘)
 - chatbot이 추천해서 추가한 장소는 아래에 별점이 안나와서 불편해요
 - 상세보기를 누른 채로 다른 핀을 누르면 (데스크탑) 상세보기 참조 위치가 변하지 않아요.
 - 핀을 눌렀을 때 나오는 ui가 너무 별로에요
 - 랜딩 페이지가 촌스러워요
 - 항공권 입력이 너무 귀찮아요 하나씩 다 찾아서 입력해야하잖아요
 - chat bot 응답에서 :place이게 자꾸 나오는데 의미도 모르겠고 보기 불편해요
 - **[챗봇 응답]** 이런 것들이 보기 불편해요. 보통 이런건 볼드 표시 처리 같은거 하지 않나요? 가독성이 너무 안좋아요
```

---

## 1단계: 피드백 분석 - Pain Point 재정의

| # | 원본 피드백 | 진정한 고충 (Pain Point) | 검증 가설 |
|---|------------|------------------------|-----------|
| 1 | 이모지, 아이콘들이 별로에요 | **시각적 일관성 부재**: 디자인 시스템 없이 임의 선택된 아이콘 | ① 아이콘 소스 혼재 여부 ② 사이즈/컬러 일관성 ③ 의미 전달력 |
| 2 | 이미지\|텍스트\|URL 탭 UI 깨짐 | **반응형 레이아웃 미흡**: 좁은 뷰포트에서 overflow | ① 탭 너비 계산 로직 ② flex/grid 설정 ③ 최소 너비 미지정 |
| 3 | 일정 사용성 떨어짐 (vs 트리플) | **인터랙션 복잡도**: 드래그앤드롭 외 빠른 추가 방식 부재 | ① 클릭 수 비교 ② 제스처 지원 ③ 일괄 추가 기능 |
| 4 | 일정 추가 로딩 오래 걸림 | **Optimistic UI 미적용**: API 응답 대기 동안 블로킹 | ① API latency 측정 ② 낙관적 업데이트 여부 ③ 로딩 상태 UX |
| 5 | 이름만 나와서 뭔지 모름 | **컨텍스트 부족**: 장소 선택 시 썸네일/카테고리 없음 | ① 선택 UI 컴포넌트 ② 데이터 표시 항목 ③ 호버 프리뷰 |
| 6 | 숙소 핀 안찍힘 | **데이터 타입 불일치**: 숙소가 Place가 아닌 별도 모델 | ① Accommodation 좌표 필드 ② 맵 마커 렌더링 조건 ③ 타입 통합 |
| 7 | 챗봇 추가 장소 별점 없음 | **데이터 불완전**: 챗봇 장소는 Google Places 연동 안됨 | ① 장소 생성 로직 ② rating 필드 채우기 ③ Places API 호출 |
| 8 | 핀 클릭해도 상세보기 안바뀜 | **상태 동기화 버그**: selectedPlace 변경 시 패널 미갱신 | ① 이벤트 핸들러 ② 상태 구독 ③ 조건부 렌더링 |
| 9 | 핀 클릭 UI 별로 | **정보 밀도 낮음**: 기본 InfoWindow만 사용 | ① 커스텀 오버레이 ② 표시 정보량 ③ 액션 버튼 |
| 10 | 랜딩 페이지 촌스러움 | **시각적 구시대성**: 2024 이전 디자인 패턴 | ① 히어로 섹션 ② 애니메이션 ③ 타이포그래피 |
| 11 | 항공권 입력 귀찮음 | **수동 입력 의존**: 자동완성/검색 API 없음 | ① 입력 필드 수 ② 항공편 검색 API ③ 이메일 파싱 |
| 12-13 | :place 노출, 볼드 미렌더링 | **마크다운 파싱 오류**: SSE 스트리밍 중 불완전 렌더링 | ① 파서 구현 ② 청크 병합 로직 ③ 실시간 렌더링 |

---

## 2단계: 가설 검증 - 코드베이스 분석 결과

| 피드백 | 상태 | 관련 파일 | 분석 결과 |
|--------|:----:|----------|----------|
| 1. 탭 UI 깨짐 | ✅ | `components/input/InputTabs.tsx` | 반응형 처리 완료, overflow 문제 미확인 |
| 2. 일정 추가 성능 | ⚠️ | `hooks/mutations/useItineraryMutations.ts` | 드래그만 optimistic, 추가는 API 대기 |
| 3. 장소 선택 UI | ✅ | `components/itinerary/ItineraryTimeline.tsx:205` | 이름만 표시됨 확인 |
| 4. 숙소 핀 | ❌ | `components/map/GoogleMap.tsx` | Accommodation 마커 미전달 |
| 5. 챗봇 별점 | ❌ | `domain/interfaces/ILLMService.ts` | rating 필드 미포함 |
| 6. 상세보기 상태 | ✅ | `components/place/PlaceDetailsPanel.tsx` | key prop으로 정상 작동 |
| 7. 핀 클릭 UI | ✅ | `components/map/GoogleMap.tsx:333-344` | 평점 표시, 상세 버튼 정상 |
| 8. 챗봇 마크다운 | ⚠️ | `lib/chat-utils.ts` | :place 제거됨, **볼드** 미지원 |

---

## 3단계: 구체적 해결책 설계

### 우선순위 매트릭스

| 우선순위 | 피드백 | 사용자 가치 | 구현 난이도 | 해결책 |
|:--------:|--------|:-----------:|:-----------:|--------|
| **P0** | 챗봇 마크다운 미렌더링 | ★★★★★ | ★☆☆☆☆ | `react-markdown` 통합 |
| **P0** | 일정 추가 로딩 지연 | ★★★★★ | ★★☆☆☆ | Optimistic Update 적용 |
| **P1** | 장소 선택 시 컨텍스트 부족 | ★★★★☆ | ★★☆☆☆ | Rich Place Picker 컴포넌트 |
| **P1** | 챗봇 장소 별점 없음 | ★★★★☆ | ★★★☆☆ | Places API Details 호출 |
| **P1** | 숙소 핀 미표시 | ★★★★☆ | ★★☆☆☆ | Accommodation 마커 추가 |
| **P2** | 탭 UI overflow | ★★★☆☆ | ★☆☆☆☆ | CSS overflow-hidden + truncate |
| **P2** | 핀 클릭 UI 개선 | ★★★☆☆ | ★★★☆☆ | Custom Overlay 컴포넌트 |
| **P3** | 항공권 자동입력 | ★★★★☆ | ★★★★★ | 항공편 검색 API 연동 |
| **P3** | 아이콘/이모지 일관성 | ★★☆☆☆ | ★★★☆☆ | Lucide 아이콘 통일 |
| **P4** | 랜딩 페이지 리디자인 | ★★☆☆☆ | ★★★★☆ | 2026 트렌드 적용 |

---

## 4단계: 구현 로드맵

### Sprint 1: Critical UX Fixes (P0) - Week 1

#### Task 1.1: 챗봇 마크다운 렌더링
- **파일**: `components/chat/ChatMessage.tsx`, `lib/chat-utils.ts`
- **작업**:
  1. `npm install react-markdown remark-gfm`
  2. ChatMessage에서 `dangerouslySetInnerHTML` 대신 `ReactMarkdown` 사용
  3. 커스텀 컴포넌트로 링크, 코드블록 스타일링
  4. `:place` 블록은 기존 정규식으로 사전 제거 유지
- **예상 변경**: ~50 LOC

#### Task 1.2: 일정 추가 Optimistic Update
- **파일**: `hooks/mutations/useItineraryMutations.ts`, `components/itinerary/ItineraryTimeline.tsx`
- **작업**:
  1. `addItem` 함수에 optimistic update 로직 추가
  2. 임시 아이템에 `isOptimistic: true` 플래그
  3. API 성공 시 revalidate, 실패 시 rollback
  4. 임시 아이템 스타일: `opacity-70` + pulse animation
- **예상 변경**: ~80 LOC

### Sprint 2: Enhanced Place Selection (P1) - Week 2

#### Task 2.1: Rich Place Picker 컴포넌트
- **파일**: `components/itinerary/PlacePicker.tsx` (신규)
- **작업**: shadcn/ui Combobox 기반, 썸네일/별점/주소 표시

#### Task 2.2: 챗봇 장소 별점 통합
- **파일**: `app/api/projects/[id]/chat/add-place/route.ts`
- **작업**: Google Places API로 rating 조회 후 저장

#### Task 2.3: 숙소 맵 마커 표시
- **파일**: `components/map/GoogleMap.tsx`, `components/layout/ItineraryLayout.tsx`
- **작업**: Accommodation 마커 렌더링 추가

### Sprint 3: Polish & Secondary Fixes (P2) - Week 3

#### Task 3.1: 탭 UI overflow 수정
#### Task 3.2: 맵 InfoWindow UI 개선

---

## 진행 상황

- [x] 피드백 분석 완료
- [x] 코드베이스 검증 완료
- [x] 해결책 설계 완료
- [x] Sprint 1 구현 완료 ✅
- [x] Sprint 2 구현 완료 ✅
- [x] Sprint 3 구현 완료 ✅

---

## Sprint 1 구현 결과 (2026-01-27)

### Task 1.1: 챗봇 마크다운 렌더링 ✅

**변경 파일**: `components/chat/ChatMessage.tsx`

**주요 변경사항**:
- `react-markdown` + `remark-gfm` 통합
- `dangerouslySetInnerHTML` 제거, `ReactMarkdown` 컴포넌트 사용
- 커스텀 스타일링: bold, italic, lists, links, code, blockquote
- 사용자/어시스턴트 메시지에 맞는 색상 테마 적용

**설치된 패키지**:
```bash
npm install react-markdown remark-gfm
```

### Task 1.2: 일정 추가 Optimistic Update ✅

**변경 파일**:
- `hooks/mutations/useItineraryMutations.ts`
- `components/itinerary/SortableTimelineItem.tsx`

**주요 변경사항**:
- `addItem` 함수에 optimistic update 로직 추가
- 임시 아이템 즉시 캐시에 추가 → API 완료 후 revalidate
- 실패 시 자동 롤백
- Optimistic 아이템 시각적 피드백:
  - `opacity-70` + `animate-pulse` 스타일
  - "저장 중..." 텍스트 + 스피너
  - 드래그 비활성화

**사용자 체감 개선**:
- 일정 추가 시 즉시 UI 반영 (체감 응답시간 0ms)
- 네트워크 지연 시에도 부드러운 UX

---

## Sprint 2 구현 결과 (2026-01-27)

### Task 2.1: Rich Place Picker ✅

**변경 파일**: `components/itinerary/ItineraryTimeline.tsx`

**주요 변경사항**:
- 장소 선택 드롭다운 리치 UI로 개선
- 검색 필터링 기능 추가 (이름, 주소, 카테고리)
- 각 장소에 표시되는 정보:
  - 카테고리 아이콘 (큰 크기, 배경색)
  - 카테고리 뱃지 라벨
  - 별점 및 리뷰 수
  - 주소 (1줄 truncate)
- 추가 중 상태 스피너 표시

### Task 2.2: 챗봇 장소 별점 통합 ✅

**변경 파일**: `app/api/projects/[id]/chat/add-place/route.ts`

**주요 변경사항**:
- 챗봇 장소 추가 시 Google Places API Details 호출
- `googlePlaceId`가 있으면 `rating`, `user_ratings_total` 조회
- Place 생성 시 rating 필드 저장
- 실패 시 graceful degradation (rating 없이 저장)

**API 비용**: ~$0.017/장소 (Places Details API)

### Task 2.3: 숙소 맵 마커 표시 ✅

**변경 파일**:
- `components/map/GoogleMap.tsx`
- `components/layout/ItineraryLayout.tsx`

**주요 변경사항**:
- GoogleMap에 `accommodations` prop 추가
- 숙소 마커 렌더링 (파란색 🏨 아이콘)
- bounds 계산에 숙소 좌표 포함
- ItineraryLayout에서 useItinerary로 숙소 데이터 조회
- 좌표가 있는 숙소만 지도에 표시

---

## Sprint 3 구현 결과 (2026-01-27)

### Task 3.1: 탭 UI overflow 수정 ✅

**변경 파일**: `components/input/InputTabs.tsx`

**주요 변경사항**:
- 탭 컨테이너에 `overflow-x-auto scrollbar-hide` 추가
- 각 탭 버튼에 `flex-shrink-0` 추가하여 축소 방지
- `min-w-[44px]` 제거 (불필요한 최소 너비)
- 좁은 뷰포트에서 가로 스크롤 가능

### Task 3.2: 맵 InfoWindow UI 개선 ✅

**변경 파일**: `components/map/GoogleMap.tsx`

**주요 변경사항**:
- InfoWindow 카드 형태 리디자인:
  - 카테고리 아이콘 (40x40, 배경색 적용)
  - 장소명 (line-clamp-2)
  - 카테고리 뱃지
  - 별점 시각화 (★ 5개 아이콘)
  - 리뷰 수 표시
  - 코멘트 표시 (있는 경우)
  - 풀 너비 액션 버튼 (카테고리 색상)
- 최소 너비 200px, 최대 너비 280px

---

## 전체 구현 완료 요약

### 해결된 피드백 (7/12)

| # | 피드백 | Sprint | 상태 |
|---|--------|--------|------|
| 1 | 챗봇 마크다운 미렌더링 | 1 | ✅ |
| 2 | 일정 추가 로딩 지연 | 1 | ✅ |
| 3 | 장소 선택 컨텍스트 부족 | 2 | ✅ |
| 4 | 챗봇 장소 별점 없음 | 2 | ✅ |
| 5 | 숙소 핀 미표시 | 2 | ✅ |
| 6 | 탭 UI overflow | 3 | ✅ |
| 7 | 핀 클릭 UI 별로 | 3 | ✅ |

### 미해결 피드백 (추후 진행)

| # | 피드백 | 우선순위 | 비고 |
|---|--------|----------|------|
| 1 | 아이콘/이모지 일관성 | P3 | 디자인 시스템 필요 |
| 2 | 항공권 자동입력 | P3 | 외부 API 연동 필요 |
| 3 | 랜딩 페이지 리디자인 | P4 | 별도 프로젝트 |
| 4 | 일정 사용성 (vs 트리플) | P4 | UX 리서치 필요 |
| 5 | 상세보기 상태 동기화 | - | 이미 정상 작동 확인 |
