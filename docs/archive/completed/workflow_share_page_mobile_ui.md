# 공유 페이지 모바일 UI 개선 구현 워크플로우

> **생성일**: 2026-01-22
> **기반 문서**: `docs/SHARE_PAGE_MOBILE_UI_REQUIREMENTS.md`
> **상태**: 📋 워크플로우 정의 완료
> **다음 단계**: `/sc:implement`로 단계별 구현 시작

---

## 1. 워크플로우 개요

### 1.1 목표
공유 페이지(`/s/[token]`)에 메인 프로젝트 페이지와 동일한 3-tier 반응형 레이아웃을 적용하여 모바일 사용성을 개선한다.

### 1.2 범위
| 항목 | 설명 |
|------|------|
| **대상 파일** | `app/s/[token]/page.tsx`, `components/mobile/MobileNavigation.tsx` |
| **신규 생성** | 없음 (기존 컴포넌트 재사용 및 확장) |
| **테스트** | E2E 테스트 추가 (Playwright) |

### 1.3 브레이크포인트 정의
| 구간 | 너비 | 레이아웃 | 네비게이션 |
|------|------|---------|-----------|
| **Mobile** | < 640px | 탭 기반 전체 화면 전환 | 2탭 (지도/목록) |
| **Tablet** | 640-1023px | 2컬럼 그리드 | 없음 |
| **Desktop** | ≥ 1024px | 2컬럼 그리드 | 없음 |

---

## 2. 구현 Phase 정의

### Phase 1: MobileNavigation 2탭 모드 확장 (P0)
**예상 복잡도**: 낮음
**의존성**: 없음

### Phase 2: 공유 페이지 3-Tier 레이아웃 적용 (P0)
**예상 복잡도**: 중간
**의존성**: Phase 1 완료

### Phase 3: 장소 상세 패널 Bottom Sheet 적용 (P0)
**예상 복잡도**: 중간
**의존성**: Phase 2 완료

### Phase 4: 헤더 및 카테고리 필터 모바일 최적화 (P1)
**예상 복잡도**: 낮음
**의존성**: Phase 2 완료

### Phase 5: E2E 테스트 작성 (P2)
**예상 복잡도**: 중간
**의존성**: Phase 1-4 완료

---

## 3. Phase 1: MobileNavigation 2탭 모드 확장

### 3.1 작업 목록

| ID | 작업 | 파일 | 설명 |
|----|------|------|------|
| 1.1 | 타입 정의 확장 | `MobileNavigation.tsx` | `ShareMobileTab` 타입 및 `variant` prop 추가 |
| 1.2 | 조건부 탭 렌더링 | `MobileNavigation.tsx` | `variant="share"`일 때 input 탭 제외 |
| 1.3 | Export 추가 | `MobileNavigation.tsx` | `ShareMobileTab` 타입 export |

### 3.2 상세 구현

#### 1.1 타입 정의 확장

**현재 코드**:
```tsx
export type MobileTab = 'map' | 'list' | 'input'

interface MobileNavigationProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  placeCount?: number
}
```

**변경 후**:
```tsx
export type MobileTab = 'map' | 'list' | 'input'
export type ShareMobileTab = 'map' | 'list'

interface MobileNavigationProps {
  activeTab: MobileTab | ShareMobileTab
  onTabChange: (tab: MobileTab | ShareMobileTab) => void
  placeCount?: number
  variant?: 'default' | 'share'  // NEW: 모드 선택
}
```

#### 1.2 조건부 탭 렌더링

```tsx
export function MobileNavigation({
  activeTab,
  onTabChange,
  placeCount = 0,
  variant = 'default',  // 기본값: 3탭 모드
}: MobileNavigationProps) {
  const allTabs = [
    { id: 'map' as const, label: '지도', icon: '🗺️' },
    { id: 'list' as const, label: '목록', icon: '📍' },
    { id: 'input' as const, label: '추가', icon: '➕' },
  ]

  // share 모드에서는 input 탭 제외
  const tabs = variant === 'share'
    ? allTabs.filter(tab => tab.id !== 'input')
    : allTabs

  return (
    <nav
      data-testid="mobile-nav"
      className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 sm:hidden pb-safe"
    >
      {/* 기존 렌더링 로직 유지 */}
    </nav>
  )
}
```

### 3.3 검증 체크리스트
- [ ] `variant="default"` (기본): 3탭 (지도/목록/추가) 표시
- [ ] `variant="share"`: 2탭 (지도/목록) 표시
- [ ] 기존 메인 페이지 동작에 영향 없음
- [ ] TypeScript 타입 에러 없음

---

## 4. Phase 2: 공유 페이지 3-Tier 레이아웃 적용

### 4.1 작업 목록

| ID | 작업 | 파일 | 설명 |
|----|------|------|------|
| 2.1 | useState 추가 | `app/s/[token]/page.tsx` | `mobileTab` 상태 추가 |
| 2.2 | 모바일 레이아웃 추가 | `app/s/[token]/page.tsx` | `sm:hidden` 조건부 렌더링 |
| 2.3 | 태블릿/데스크톱 레이아웃 수정 | `app/s/[token]/page.tsx` | `hidden sm:grid` 적용 |
| 2.4 | MobileNavigation 통합 | `app/s/[token]/page.tsx` | 하단 네비게이션 추가 |
| 2.5 | 높이 계산 조정 | `app/s/[token]/page.tsx` | `pb-16 sm:pb-0` 적용 |

### 4.2 상세 구현

#### 2.1 useState 추가

```tsx
import { MobileNavigation, ShareMobileTab } from '@/components/mobile/MobileNavigation'

// 컴포넌트 내부
const [mobileTab, setMobileTab] = useState<ShareMobileTab>('map')
```

#### 2.2-2.4 레이아웃 구조 변경

**현재 코드**:
```tsx
<div className="grid lg:grid-cols-[2fr_1fr] gap-6 h-[calc(100vh-180px)]">
  {/* 지도 */}
  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
    <GoogleMap ... />
  </div>
  {/* 목록 */}
  <div className="bg-white rounded-lg shadow-sm border p-4 overflow-hidden flex flex-col">
    {/* PlaceList */}
  </div>
</div>
```

**변경 후**:
```tsx
{/* 메인 콘텐츠 - 하단 네비게이션 공간 확보 */}
<div className="h-[calc(100vh-180px)] pb-16 sm:pb-0">
  {/* Mobile (<640px): 탭 기반 전체 화면 전환 */}
  <div className="sm:hidden h-full flex flex-col">
    {mobileTab === 'map' && (
      <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
        <GoogleMap
          places={filteredPlaces}
          center={mapCenter}
          onMarkerClick={(placeId) => setDetailPlaceId(placeId)}
          selectedPlaceId={detailPlaceId}
        />
      </div>
    )}
    {mobileTab === 'list' && (
      <div className="flex-1 bg-white rounded-lg shadow-sm border p-4 overflow-hidden flex flex-col">
        {/* 카테고리 필터 + 장소 목록 */}
      </div>
    )}
  </div>

  {/* Tablet/Desktop (≥640px): 2컬럼 그리드 */}
  <div className="hidden sm:grid grid-cols-[1fr_320px] lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6 h-full">
    {/* 지도 */}
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <GoogleMap ... />
    </div>
    {/* 목록 */}
    <div className="bg-white rounded-lg shadow-sm border p-4 overflow-hidden flex flex-col">
      {/* 카테고리 필터 + 장소 목록 */}
    </div>
  </div>

  {/* 모바일 하단 네비게이션 */}
  <MobileNavigation
    variant="share"
    activeTab={mobileTab}
    onTabChange={setMobileTab}
    placeCount={filteredPlaces.length}
  />
</div>
```

### 4.3 검증 체크리스트
- [ ] Mobile (< 640px): 탭 기반 전체 화면 전환 동작
- [ ] Tablet (640-1023px): 2컬럼 (`1fr 320px`) 레이아웃 표시
- [ ] Desktop (≥ 1024px): 2컬럼 (`2fr 1fr`) 레이아웃 표시
- [ ] 하단 네비게이션: 모바일에서만 표시 (`sm:hidden`)
- [ ] 탭 전환 시 콘텐츠 즉시 전환
- [ ] 스크롤 정상 동작

---

## 5. Phase 3: 장소 상세 패널 Bottom Sheet 적용

### 5.1 작업 목록

| ID | 작업 | 파일 | 설명 |
|----|------|------|------|
| 3.1 | Sheet 컴포넌트 import | `app/s/[token]/page.tsx` | shadcn/ui Sheet 추가 |
| 3.2 | 모바일 Bottom Sheet 구현 | `app/s/[token]/page.tsx` | `side="bottom"` 적용 |
| 3.3 | 데스크톱 사이드 패널 유지 | `app/s/[token]/page.tsx` | `lg:block` 조건부 렌더링 |
| 3.4 | useIsMobile 훅 도입 | `app/s/[token]/page.tsx` | 모바일 판별 로직 |

### 5.2 상세 구현

#### 3.1-3.4 Bottom Sheet 구현

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useIsMobile'

// 컴포넌트 내부
const isMobile = useIsMobile()

// 렌더링
{detailPlaceId && (
  <>
    {/* Mobile: Bottom Sheet */}
    {isMobile && (
      <Sheet
        open={!!detailPlaceId}
        onOpenChange={(open) => !open && setDetailPlaceId(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[90vh] h-auto min-h-[50vh] rounded-t-xl flex flex-col"
        >
          <SheetHeader className="flex-shrink-0 pb-2 border-b">
            <SheetTitle>장소 상세</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pb-safe">
            <PlaceDetailsPanel
              placeId={detailPlaceId}
              onClose={() => setDetailPlaceId(null)}
              shareToken={token}
            />
          </div>
        </SheetContent>
      </Sheet>
    )}

    {/* Desktop: Side Panel */}
    {!isMobile && (
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l z-50 overflow-y-auto">
        <PlaceDetailsPanel
          placeId={detailPlaceId}
          onClose={() => setDetailPlaceId(null)}
          shareToken={token}
        />
      </div>
    )}
  </>
)}
```

### 5.3 검증 체크리스트
- [ ] 모바일: 장소 클릭 시 Bottom Sheet 열림
- [ ] 모바일: Bottom Sheet 최대 90vh, 최소 50vh
- [ ] 모바일: 내용 스크롤 가능
- [ ] 모바일: X 버튼 또는 외부 터치로 닫기
- [ ] 데스크톱: 기존 사이드 패널 동작 유지
- [ ] Safe area padding 적용 (iOS)

---

## 6. Phase 4: 헤더 및 카테고리 필터 모바일 최적화

### 6.1 작업 목록

| ID | 작업 | 파일 | 설명 |
|----|------|------|------|
| 4.1 | 헤더 반응형 최적화 | `app/s/[token]/page.tsx` | 복사 버튼 축소, 배지 조건부 표시 |
| 4.2 | 카테고리 필터 가로 스크롤 | `app/s/[token]/page.tsx` | `overflow-x-auto` + `flex-nowrap` |
| 4.3 | 터치 타겟 크기 조정 | `app/s/[token]/page.tsx` | 최소 44px 높이 확보 |

### 6.2 상세 구현

#### 4.1 헤더 반응형 최적화

```tsx
<header className="bg-white border-b sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
    <div className="flex items-center justify-between gap-2">
      {/* 프로젝트 정보 */}
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
          {project.name}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">
          {project.destination}
          {project.country && `, ${project.country}`}
        </p>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 공유 배지: 데스크톱만 */}
        <div className="hidden sm:block text-xs text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
          공유된 여행 계획
        </div>
        {/* 복사 버튼: 항상 표시 */}
        <Button
          size="sm"
          onClick={handleClone}
          disabled={cloning}
          className="whitespace-nowrap"
        >
          <span className="hidden sm:inline">{cloning ? '복사 중...' : '내 프로젝트로 복사'}</span>
          <span className="sm:hidden">{cloning ? '...' : '📋 복사'}</span>
        </Button>
      </div>
    </div>
  </div>
</header>
```

#### 4.2 카테고리 필터 가로 스크롤

```tsx
{/* 카테고리 필터 - 가로 스크롤 */}
<div className="mb-4 flex-shrink-0 -mx-4 px-4 overflow-x-auto scrollbar-hide">
  <div className="flex gap-2 min-w-max">
    <Button
      size="sm"
      className="h-9 whitespace-nowrap"
      variant={categoryFilter === null ? 'default' : 'outline'}
      onClick={() => setCategoryFilter(null)}
    >
      전체 ({places.length})
    </Button>
    {categories.map(([key, style]) => {
      const count = places.filter((p) => p.category === key).length
      if (count === 0) return null
      return (
        <Button
          key={key}
          size="sm"
          className="h-9 whitespace-nowrap"
          variant={categoryFilter === key ? 'default' : 'outline'}
          onClick={() => setCategoryFilter(key)}
        >
          {style.icon} {style.label} ({count})
        </Button>
      )
    })}
  </div>
</div>
```

### 6.3 검증 체크리스트
- [ ] 헤더: 모바일에서 복사 버튼 축소 표시
- [ ] 헤더: 공유 배지 데스크톱에서만 표시
- [ ] 헤더: 긴 프로젝트 이름 truncate 처리
- [ ] 필터: 가로 스크롤 동작
- [ ] 필터: 터치 타겟 최소 44px (h-9 = 36px + padding)

---

## 7. Phase 5: E2E 테스트 작성

### 7.1 작업 목록

| ID | 작업 | 파일 | 설명 |
|----|------|------|------|
| 5.1 | 테스트 파일 생성 | `e2e/share-page-mobile.spec.ts` | 공유 페이지 모바일 E2E 테스트 |
| 5.2 | 레이아웃 테스트 | - | 브레이크포인트별 레이아웃 검증 |
| 5.3 | 탭 전환 테스트 | - | 모바일 탭 네비게이션 검증 |
| 5.4 | 상세 패널 테스트 | - | Bottom Sheet / Side Panel 검증 |

### 7.2 테스트 시나리오

```typescript
// e2e/share-page-mobile.spec.ts
import { test, expect } from '@playwright/test'

const viewports = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone14Pro: { width: 393, height: 852 },
  iPadMini: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
}

test.describe('공유 페이지 모바일 UI', () => {
  // 테스트용 공유 토큰 (시드 데이터 필요)
  const shareToken = 'test-share-token'

  test.describe('레이아웃 테스트', () => {
    test('모바일에서 2탭 네비게이션 표시', async ({ page }) => {
      await page.setViewportSize(viewports.iPhoneSE)
      await page.goto(`/s/${shareToken}`)

      const mobileNav = page.getByTestId('mobile-nav')
      await expect(mobileNav).toBeVisible()

      // 2탭만 표시 (지도, 목록)
      await expect(page.getByRole('button', { name: /지도/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /목록/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /추가/ })).not.toBeVisible()
    })

    test('태블릿에서 2컬럼 레이아웃', async ({ page }) => {
      await page.setViewportSize(viewports.iPadMini)
      await page.goto(`/s/${shareToken}`)

      const mobileNav = page.getByTestId('mobile-nav')
      await expect(mobileNav).not.toBeVisible()

      // 지도와 목록이 동시에 표시
      await expect(page.getByTestId('google-map')).toBeVisible()
      await expect(page.getByTestId('place-list')).toBeVisible()
    })
  })

  test.describe('탭 전환 테스트', () => {
    test('모바일에서 지도/목록 탭 전환', async ({ page }) => {
      await page.setViewportSize(viewports.iPhoneSE)
      await page.goto(`/s/${shareToken}`)

      // 기본: 지도 탭 활성
      await expect(page.getByTestId('google-map')).toBeVisible()

      // 목록 탭 클릭
      await page.getByRole('button', { name: /목록/ }).click()
      await expect(page.getByTestId('place-list')).toBeVisible()
      await expect(page.getByTestId('google-map')).not.toBeVisible()

      // 지도 탭 클릭
      await page.getByRole('button', { name: /지도/ }).click()
      await expect(page.getByTestId('google-map')).toBeVisible()
    })
  })

  test.describe('상세 패널 테스트', () => {
    test('모바일에서 Bottom Sheet 열림', async ({ page }) => {
      await page.setViewportSize(viewports.iPhoneSE)
      await page.goto(`/s/${shareToken}`)

      // 목록 탭으로 전환
      await page.getByRole('button', { name: /목록/ }).click()

      // 첫 번째 장소의 상세 버튼 클릭
      await page.getByTestId('place-detail-btn').first().click()

      // Bottom Sheet 확인
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('장소 상세')).toBeVisible()
    })

    test('데스크톱에서 사이드 패널 열림', async ({ page }) => {
      await page.setViewportSize(viewports.desktop)
      await page.goto(`/s/${shareToken}`)

      // 첫 번째 장소의 상세 버튼 클릭
      await page.getByTestId('place-detail-btn').first().click()

      // 사이드 패널 확인 (fixed right-0)
      const sidePanel = page.locator('.fixed.right-0')
      await expect(sidePanel).toBeVisible()
    })
  })

  test.describe('복사 기능 테스트', () => {
    test('모바일에서 복사 버튼 표시', async ({ page }) => {
      await page.setViewportSize(viewports.iPhoneSE)
      await page.goto(`/s/${shareToken}`)

      const copyBtn = page.getByRole('button', { name: /복사/ })
      await expect(copyBtn).toBeVisible()
      await expect(copyBtn).toHaveText('📋 복사')
    })

    test('데스크톱에서 전체 텍스트 표시', async ({ page }) => {
      await page.setViewportSize(viewports.desktop)
      await page.goto(`/s/${shareToken}`)

      const copyBtn = page.getByRole('button', { name: /프로젝트로 복사/ })
      await expect(copyBtn).toBeVisible()
      await expect(copyBtn).toHaveText('내 프로젝트로 복사')
    })
  })
})
```

### 7.3 검증 체크리스트
- [ ] 모든 뷰포트에서 테스트 통과
- [ ] 레이아웃 전환 검증
- [ ] 탭 전환 검증
- [ ] 상세 패널 동작 검증
- [ ] 복사 버튼 동작 검증

---

## 8. 의존성 다이어그램

```
Phase 1: MobileNavigation 확장
    │
    ▼
Phase 2: 3-Tier 레이아웃 ──────┬──────► Phase 4: 헤더/필터 최적화
    │                         │
    ▼                         │
Phase 3: Bottom Sheet ────────┘
    │
    ▼
Phase 5: E2E 테스트
```

---

## 9. 수정 파일 요약

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `components/mobile/MobileNavigation.tsx` | 1 | `variant` prop 추가, 2탭 모드 지원 |
| `app/s/[token]/page.tsx` | 2, 3, 4 | 3-tier 레이아웃, Bottom Sheet, 헤더/필터 최적화 |
| `e2e/share-page-mobile.spec.ts` | 5 | E2E 테스트 추가 (신규) |

---

## 10. 체크포인트 및 검증

### 10.1 Phase 완료 기준

| Phase | 완료 기준 |
|-------|----------|
| **Phase 1** | MobileNavigation이 `variant="share"`에서 2탭만 표시 |
| **Phase 2** | 공유 페이지가 브레이크포인트별로 올바른 레이아웃 표시 |
| **Phase 3** | 모바일에서 Bottom Sheet, 데스크톱에서 Side Panel 동작 |
| **Phase 4** | 헤더/필터가 모바일에서 최적화되어 표시 |
| **Phase 5** | 모든 E2E 테스트 통과 |

### 10.2 최종 검증

```bash
# 개발 서버 실행
npm run dev

# 수동 검증
# 1. Chrome DevTools에서 각 뷰포트 테스트
# 2. 실제 모바일 기기에서 테스트

# E2E 테스트 실행
npx playwright test e2e/share-page-mobile.spec.ts
```

---

## 11. 롤백 전략

각 Phase는 독립적으로 롤백 가능:

1. **Phase 1 롤백**: `MobileNavigation.tsx`의 `variant` prop 관련 코드 제거
2. **Phase 2-4 롤백**: `app/s/[token]/page.tsx`를 이전 버전으로 복원
3. **Phase 5 롤백**: `e2e/share-page-mobile.spec.ts` 파일 삭제

---

## 12. 다음 단계

워크플로우 정의가 완료되었습니다. 구현을 시작하려면:

```bash
/sc:implement workflow_share_page_mobile_ui.md
```

또는 Phase별로 순차 구현:

1. Phase 1 시작: MobileNavigation 2탭 모드 확장
2. Phase 2 시작: 공유 페이지 3-Tier 레이아웃 적용
3. Phase 3 시작: 장소 상세 패널 Bottom Sheet 적용
4. Phase 4 시작: 헤더 및 카테고리 필터 모바일 최적화
5. Phase 5 시작: E2E 테스트 작성

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-22 | 1.0 | 최초 작성 - 요구사항 기반 워크플로우 정의 | Claude |
