# 반응형 UI 설계 문서

> **작성일**: 2026-01-21
> **상태**: 설계 완료 - 구현 승인 대기
> **기반 문서**: `MOBILE_UI_REQUIREMENTS.md` v2.0

---

## 1. 설계 개요

### 1.1 핵심 설계 원칙

| 원칙 | 설명 |
|------|------|
| **탭 즉시 전환** | 바텀시트(슬라이드업) 제거, 탭 선택 시 즉시 전체 화면 표시 |
| **점진적 축소** | lg(3칼럼) → md(2칼럼) → sm(탭 기반) 단계적 레이아웃 변화 |
| **스크롤 접근성** | 모든 화면 크기에서 모든 콘텐츠에 스크롤로 접근 가능 |
| **터치 친화성** | 최소 44x44px 터치 타겟, safe area 지원 |

### 1.2 브레이크포인트 전략

```
┌─────────────────────────────────────────────────────────────────┐
│                      브레이크포인트 시스템                         │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   <640px     │  640-767px   │  768-1023px  │    ≥1024px        │
│   (모바일)    │    (sm)      │    (md)      │     (lg+)         │
├──────────────┼──────────────┼──────────────┼───────────────────┤
│  탭 네비      │   2칼럼      │    2칼럼     │     3칼럼         │
│  전체화면     │ 지도+우측탭   │  지도+우측탭  │ 지도+목록+입력    │
│  전환 방식    │             │              │                   │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

---

## 2. 컴포넌트 아키텍처

### 2.1 컴포넌트 계층 구조

```
ProjectDetailPage
├── Header (반응형 버튼)
├── ResponsiveLayout (NEW - 핵심 레이아웃 컴포넌트)
│   ├── MapSection
│   │   └── GoogleMap
│   ├── ContentSection (sm/md: 탭, lg: 분리)
│   │   ├── PlaceListSection
│   │   │   ├── PlaceList
│   │   │   └── FailedImages
│   │   └── InputSection
│   │       ├── InputTabs
│   │       ├── TextInputList
│   │       └── ImageList
│   └── MobileTabView (모바일 전용)
│       └── TabContent (지도/목록/입력 중 하나)
├── MobileNavigation (모바일 전용, 하단 고정)
├── PlaceDetailsSheet (모바일: 바텀시트)
└── PlaceDetailsSidePanel (데스크톱: 사이드 패널)
```

### 2.2 변경되는 컴포넌트

| 컴포넌트 | 변경 유형 | 설명 |
|---------|---------|------|
| `ProjectDetailPage` | **대폭 수정** | 레이아웃 로직 재구성 |
| `MobileNavigation` | 수정 | 탭 전환 시 바로 콘텐츠 표시 |
| `PlaceListDrawer` | **제거** | 바텀시트 방식 폐기 |
| `PlaceList` | 수정 | 스크롤 패턴 개선, 부모 의존 제거 |
| `PlaceDetailsPanel` | 수정 | 스크롤 보장, flex 레이아웃 개선 |
| `ResponsiveSidebar` | **신규** | sm/md용 탭 전환 사이드바 |

---

## 3. 상세 레이아웃 설계

### 3.1 모바일 레이아웃 (<640px)

```
┌─────────────────────────────────┐
│           Header                │ h-auto
├─────────────────────────────────┤
│                                 │
│                                 │
│     Active Tab Content          │ flex-1 (나머지 공간 전부)
│     (지도 OR 목록 OR 입력)       │ overflow-y-auto
│                                 │
│                                 │
├─────────────────────────────────┤
│  🗺️ 지도 │ 📍 목록 │ ➕ 입력    │ h-16 + pb-safe
└─────────────────────────────────┘
```

**핵심 변경사항:**
- PlaceListDrawer(바텀시트) 완전 제거
- 탭 선택 시 전체 화면에 해당 콘텐츠 즉시 표시
- 각 탭 콘텐츠는 `flex-1 overflow-y-auto`로 스크롤 가능

### 3.2 태블릿/소형 데스크톱 레이아웃 (640px - 1023px)

```
┌─────────────────────────────────────────────────┐
│                    Header                        │
├────────────────────────┬────────────────────────┤
│                        │   ┌─────────────────┐  │
│                        │   │ [목록] [입력]   │  │ ← 탭 헤더
│       GoogleMap        │   ├─────────────────┤  │
│       (flex-1)         │   │                 │  │
│                        │   │   Tab Content   │  │ ← 스크롤 영역
│                        │   │   (목록/입력)    │  │
│                        │   │                 │  │
│                        │   └─────────────────┘  │
├────────────────────────┴────────────────────────┤
│                    (하단 네비 없음)               │
└─────────────────────────────────────────────────┘

Grid: grid-cols-[1fr_320px] 또는 grid-cols-[1fr_360px]
```

**핵심 변경사항:**
- 2칼럼 레이아웃 신규 도입
- 우측에 목록/입력 탭으로 전환 가능한 사이드바
- 하단 네비게이션 숨김 (sm 이상에서)

### 3.3 데스크톱 레이아웃 (≥1024px)

```
┌────────────────────────────────────────────────────────────────┐
│                           Header                                │
├──────────────────────┬─────────────────┬───────────────────────┤
│                      │                 │                        │
│                      │   PlaceList     │     InputTabs          │
│     GoogleMap        │   (flex-1       │     TextInputList      │
│     (2fr)            │    overflow-y)  │     ImageList          │
│                      │                 │     (280px, overflow-y)│
│                      │   FailedImages  │                        │
│                      │   (flex-shrink) │                        │
├──────────────────────┴─────────────────┴───────────────────────┤
│                        (기존 유지)                               │
└────────────────────────────────────────────────────────────────┘

Grid: grid-cols-[2fr_1fr_280px]
```

**핵심 변경사항:**
- 기존 3칼럼 레이아웃 유지
- 각 칼럼에 `overflow-y-auto` 추가로 개별 스크롤 보장

---

## 4. 데이터 흐름 및 상태 관리

### 4.1 상태 구조

```typescript
// ProjectDetailPage 상태
interface PageState {
  // 기존 상태 유지
  project: Project | null
  places: Place[]
  images: Image[]
  textInputs: TextInput[]
  selectedPlaceId: string | null
  detailPlaceId: string | null
  // ...

  // 모바일 탭 상태 (변경)
  mobileTab: 'map' | 'list' | 'input'  // 유지

  // 중간 브레이크포인트용 상태 (신규)
  sidebarTab: 'list' | 'input'  // sm/md에서 사용
}

// 제거되는 상태
// isPlaceListDrawerOpen: boolean  // PlaceListDrawer 제거로 불필요
```

### 4.2 탭 전환 로직

```typescript
// 모바일 탭 변경 핸들러 (변경됨)
const handleMobileTabChange = (tab: MobileTab) => {
  setMobileTab(tab)
  // PlaceListDrawer 열기 로직 제거됨
  // 탭 변경만으로 콘텐츠 즉시 전환
}

// 사이드바 탭 변경 핸들러 (신규)
const handleSidebarTabChange = (tab: 'list' | 'input') => {
  setSidebarTab(tab)
}
```

### 4.3 반응형 조건부 렌더링

```typescript
// 브레이크포인트별 렌더링 전략
const renderLayout = () => {
  return (
    <>
      {/* 모바일: 탭 기반 전체 화면 전환 */}
      <div className="sm:hidden h-full flex flex-col">
        {mobileTab === 'map' && <MapSection className="flex-1" />}
        {mobileTab === 'list' && <PlaceListSection className="flex-1 overflow-y-auto" />}
        {mobileTab === 'input' && <InputSection className="flex-1 overflow-y-auto" />}
      </div>

      {/* sm/md: 2칼럼 + 탭 사이드바 */}
      <div className="hidden sm:grid lg:hidden grid-cols-[1fr_320px] h-full gap-4">
        <MapSection />
        <ResponsiveSidebar
          activeTab={sidebarTab}
          onTabChange={handleSidebarTabChange}
        >
          {sidebarTab === 'list' ? <PlaceListSection /> : <InputSection />}
        </ResponsiveSidebar>
      </div>

      {/* lg+: 3칼럼 */}
      <div className="hidden lg:grid grid-cols-[2fr_1fr_280px] h-full gap-4">
        <MapSection />
        <PlaceListSection />
        <InputSection />
      </div>
    </>
  )
}
```

---

## 5. 컴포넌트 상세 설계

### 5.1 MobileNavigation (수정)

```typescript
// 변경 전
const handleMobileTabChange = (tab: MobileTab) => {
  setMobileTab(tab)
  if (tab === 'list') {
    setIsPlaceListDrawerOpen(true)  // 드로어 열기
  }
}

// 변경 후
const handleMobileTabChange = (tab: MobileTab) => {
  setMobileTab(tab)
  // 드로어 로직 제거 - 탭 전환만으로 콘텐츠 표시
}
```

**CSS 변경:**
```css
/* 기존 유지 */
.mobile-nav {
  @apply fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50;
  @apply lg:hidden pb-safe;
}

/* 변경: sm 이상에서 숨김 */
.mobile-nav {
  @apply fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50;
  @apply sm:hidden pb-safe;  /* lg:hidden → sm:hidden */
}
```

### 5.2 ResponsiveSidebar (신규 컴포넌트)

```typescript
interface ResponsiveSidebarProps {
  activeTab: 'list' | 'input'
  onTabChange: (tab: 'list' | 'input') => void
  children: React.ReactNode
  placeCount?: number
  pendingCount?: number
}

export function ResponsiveSidebar({
  activeTab,
  onTabChange,
  children,
  placeCount = 0,
  pendingCount = 0,
}: ResponsiveSidebarProps) {
  return (
    <div className="bg-white rounded-lg border flex flex-col h-full overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex border-b flex-shrink-0">
        <button
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            "min-h-[44px]", // 터치 타겟
            activeTab === 'list'
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
          onClick={() => onTabChange('list')}
        >
          📍 목록 {placeCount > 0 && `(${placeCount})`}
        </button>
        <button
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            "min-h-[44px]",
            activeTab === 'input'
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
          onClick={() => onTabChange('input')}
        >
          ➕ 입력 {pendingCount > 0 && `(${pendingCount})`}
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  )
}
```

### 5.3 PlaceList (수정)

**문제점:**
- 내부에 `overflow-y-auto` 중복
- 부모 컨테이너와 스크롤 충돌

**해결책:**
```typescript
// 변경 전
<div className="h-full flex flex-col">
  <div className="flex flex-wrap gap-2 mb-4">필터</div>
  <div className="flex-1 overflow-y-auto space-y-2">목록</div>
</div>

// 변경 후
<div className="flex flex-col h-full">
  {/* 필터: 고정 */}
  <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">필터</div>

  {/* 목록: 부모에서 스크롤 관리 시 overflow 제거 가능 */}
  <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
    {/* 또는 부모가 스크롤 담당 시: overflow-visible */}
    {filteredPlaces.map(...)}
  </div>
</div>
```

**스크롤 전략:**
- 모바일: `PlaceList` 자체가 `flex-1 overflow-y-auto`
- sm/md: `ResponsiveSidebar` 내부에서 스크롤 (PlaceList는 overflow 불필요)
- lg: 부모 div에서 스크롤 관리

### 5.4 PlaceDetailsPanel (수정)

**문제점:**
- `h-[85vh]` 고정으로 safe area와 충돌
- 내용 하단 잘림

**해결책:**
```typescript
// 모바일 바텀시트 (변경)
<Sheet open={!!detailPlaceId} onOpenChange={handleClose}>
  <SheetContent
    side="bottom"
    className={cn(
      "rounded-t-xl flex flex-col",
      "max-h-[90vh]",  // 고정 → 최대 높이
      "h-auto"         // 콘텐츠에 맞게 조절
    )}
  >
    <SheetHeader className="flex-shrink-0 pb-2 border-b">
      <SheetTitle>장소 상세</SheetTitle>
    </SheetHeader>
    <div className="flex-1 min-h-0 overflow-y-auto pb-safe">
      <PlaceDetailsPanel ... />
    </div>
  </SheetContent>
</Sheet>
```

**PlaceDetailsPanel 내부 수정:**
```typescript
// 변경 전
<div className="flex flex-col h-full">
  <div className="p-4 border-b flex-shrink-0">헤더</div>
  <div className="flex-1 overflow-y-auto p-4 space-y-4">콘텐츠</div>
  <div className="p-4 border-t flex-shrink-0">버튼</div>
</div>

// 변경 후: 부모가 스크롤 담당 시
<div className="flex flex-col">
  <div className="p-4 border-b">헤더</div>
  <div className="p-4 space-y-4">콘텐츠 (overflow 제거)</div>
  <div className="p-4 border-t">버튼</div>
</div>
```

---

## 6. CSS 유틸리티 클래스

### 6.1 스크롤 컨테이너 패턴

```css
/* 권장 패턴: Flex 기반 스크롤 */
.scroll-container {
  @apply flex-1 min-h-0 overflow-y-auto;
}

/* Safe area 지원 */
.scroll-container-safe {
  @apply flex-1 min-h-0 overflow-y-auto pb-safe;
}
```

### 6.2 터치 타겟

```css
/* 이미 정의됨: button.tsx size="touch" */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* 컴팩트 모드 (md+) */
.touch-target-responsive {
  @apply min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0;
}
```

### 6.3 그리드 레이아웃

```css
/* 2칼럼 (sm/md) */
.grid-sidebar {
  @apply grid grid-cols-[1fr_320px] gap-4;
}

/* 3칼럼 (lg+) */
.grid-desktop {
  @apply grid grid-cols-[2fr_1fr_280px] gap-4;
}
```

---

## 7. 마이그레이션 계획

### 7.1 Phase 1: 스크롤 문제 해결 (비파괴적)

1. `PlaceList.tsx`: `min-h-0` 추가
2. `PlaceDetailsPanel.tsx`: 스크롤 영역 최적화
3. 바텀시트: `h-[85vh]` → `max-h-[90vh] h-auto`

### 7.2 Phase 2: 모바일 탭 즉시 전환

1. `PlaceListDrawer` 임포트 및 사용 제거
2. `page.tsx`: 모바일 탭 콘텐츠 직접 렌더링
3. `isPlaceListDrawerOpen` 상태 제거

### 7.3 Phase 3: 중간 브레이크포인트 추가

1. `ResponsiveSidebar` 컴포넌트 생성
2. `page.tsx`: 3단계 레이아웃 구현
3. `MobileNavigation`: `lg:hidden` → `sm:hidden`

### 7.4 Phase 4: 정리 및 테스트

1. `PlaceListDrawer.tsx` 파일 삭제
2. 불필요한 상태/props 제거
3. E2E 테스트 실행 및 검증

---

## 8. 테스트 시나리오

### 8.1 뷰포트별 테스트

| 뷰포트 | 테스트 항목 |
|--------|------------|
| 375px (iPhone SE) | 탭 전환 즉시 표시, 목록 스크롤 끝까지 |
| 640px (sm) | 2칼럼 표시, 사이드바 탭 전환 |
| 768px (md) | 2칼럼 유지, 스크롤 정상 |
| 1024px (lg) | 3칼럼 표시, 기존 동작 유지 |

### 8.2 스크롤 테스트

```typescript
test('모바일에서 목록 마지막 항목까지 스크롤', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/projects/test-id')

  // 목록 탭 클릭
  await page.click('[data-testid="mobile-nav"] button:has-text("목록")')

  // 마지막 항목 visible 확인
  const lastItem = page.locator('[data-testid="place-item"]').last()
  await lastItem.scrollIntoViewIfNeeded()
  await expect(lastItem).toBeVisible()
})
```

---

## 9. 다음 단계

설계 문서가 완료되었습니다. 다음 단계를 선택하세요:

1. **`/sc:workflow`** - 구현 작업 분해 및 상세 단계 계획
2. **`/sc:implement`** - Phase 1부터 순차 구현 시작
3. **검토 요청** - 설계에 대한 추가 피드백

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-21 | 1.0 | 초안 작성 - 브레인스토밍 결과 기반 |
