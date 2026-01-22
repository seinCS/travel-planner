# 공유 페이지 모바일 UI 개선 요구사항 명세서

> **작성일**: 2026-01-21
> **최종 수정**: 2026-01-21 (v1.0)
> **상태**: 📋 요구사항 정의 완료
> **다음 단계**: `/sc:design` 또는 `/sc:workflow`로 설계/구현 계획 수립

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **목표** | 공유 페이지(`/s/[token]`)에 메인 프로젝트 페이지와 동일한 3-tier 반응형 레이아웃 적용 |
| **범위** | 공유 페이지 전체 (헤더, 지도, 장소 목록, 장소 상세 패널) |
| **타겟 기기** | iPhone Safari (iOS), Android Chrome, Windows/Mac 브라우저 |
| **핵심 원칙** | **1) 메인 페이지와 일관된 UX 2) 읽기 전용 특성 반영 3) 컴포넌트 재사용** |
| **QA 전략** | Playwright E2E 테스트로 다양한 뷰포트 자동 검증 |

---

## 2. 현황 분석

### 2.1 메인 프로젝트 페이지 (`/projects/[id]`) - 참조 구현

| 브레이크포인트 | 레이아웃 | 특징 |
|---------------|---------|------|
| **Mobile (<640px)** | 탭 기반 전체 화면 전환 | MobileNavigation (지도/목록/입력 3탭) |
| **Tablet (640-1023px)** | 2컬럼 + 사이드바 탭 | ResponsiveSidebar (목록/입력 탭) |
| **Desktop (≥1024px)** | 3컬럼 그리드 | 지도 + 목록 + 입력 동시 표시 |

**사용 컴포넌트:**
- `MobileNavigation` - 하단 고정 탭 네비게이션
- `ResponsiveSidebar` - 태블릿용 탭 전환 사이드바
- `Sheet` (Bottom Sheet) - 장소 상세 패널 모바일 대응

### 2.2 현재 공유 페이지 (`/s/[token]`) - 문제점

| 문제 | 현재 상태 | 영향 |
|------|----------|------|
| **단일 레이아웃** | `lg:grid-cols-[2fr_1fr]` 데스크톱만 고려 | 모바일에서 세로 스택만 가능 |
| **하단 네비게이션 없음** | 탭 전환 UI 미제공 | 모바일에서 지도/목록 간 전환 불편 |
| **고정 너비 상세 패널** | `w-96` (384px) 고정 | 모바일 화면 벗어남, 사용 불가 |
| **반응형 컴포넌트 미사용** | 커스텀 레이아웃 | 메인과 일관성 없음 |
| **카테고리 필터 UI** | 데스크톱용 버튼 나열 | 모바일에서 줄바꿈, 공간 낭비 |

### 2.3 공유 페이지 특성 (메인과의 차이)

| 특성 | 메인 페이지 | 공유 페이지 |
|------|-----------|-----------|
| **입력 기능** | 이미지/텍스트/URL 입력 가능 | ❌ 없음 (읽기 전용) |
| **장소 수정/삭제** | 가능 | ❌ 없음 |
| **프로젝트 복사** | 해당 없음 | ✅ "내 프로젝트로 복사" 버튼 |
| **모바일 탭 수** | 3탭 (지도/목록/입력) | 2탭 (지도/목록) |

### 2.4 문제 파일 위치

```
app/s/[token]/page.tsx                    # 공유 페이지 전체 (리팩토링 대상)
components/mobile/MobileNavigation.tsx    # 2탭 모드 확장 필요
```

---

## 3. 기능 요구사항 (Functional Requirements)

### FR-1: 3-Tier 반응형 레이아웃 적용

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-1.1 | **Mobile (<640px) 탭 기반 레이아웃** | P0 | 하단 네비게이션으로 지도/목록 2탭 전환 |
| FR-1.2 | **Tablet (640-1023px) 2컬럼 레이아웃** | P0 | 지도 + 목록 동시 표시 |
| FR-1.3 | **Desktop (≥1024px) 2컬럼 레이아웃** | P0 | 기존과 동일, 지도(2fr) + 목록(1fr) |
| FR-1.4 | 모든 브레이크포인트에서 콘텐츠 접근 가능 | P0 | hidden 대신 탭 전환으로 접근성 보장 |

**브레이크포인트별 레이아웃:**

```
┌─────────────────────────────────┐
│ Mobile (<640px)                 │
│ ┌─────────────────────────────┐ │
│ │   지도 또는 목록 (탭 전환)     │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │  🗺️ 지도  │  📍 목록        │ │ ← 2탭 네비게이션
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Tablet (640-1023px)             │
│ ┌────────────┬────────────────┐ │
│ │   지도     │    장소 목록    │ │
│ │            │                │ │
│ └────────────┴────────────────┘ │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Desktop (≥1024px)               │
│ ┌──────────────┬──────────────┐ │
│ │     지도     │   장소 목록   │ │
│ │              │              │ │
│ └──────────────┴──────────────┘ │
└─────────────────────────────────┘
```

**구현 방향:**
```tsx
// 공유 페이지 3-tier 레이아웃
<div className="h-[calc(100vh-180px)] pb-16 sm:pb-0">
  {/* Mobile (<640px): 탭 기반 전체 화면 전환 */}
  <div className="sm:hidden h-full flex flex-col">
    {mobileTab === 'map' && (
      <div className="flex-1 bg-white rounded-lg border overflow-hidden">
        <GoogleMap />
      </div>
    )}
    {mobileTab === 'list' && (
      <div className="flex-1 bg-white rounded-lg border p-4 overflow-hidden flex flex-col">
        <PlaceList />
      </div>
    )}
  </div>

  {/* Tablet/Desktop (≥640px): 2컬럼 */}
  <div className="hidden sm:grid grid-cols-[1fr_320px] lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6 h-full">
    <div className="bg-white rounded-lg border overflow-hidden">
      <GoogleMap />
    </div>
    <div className="bg-white rounded-lg border p-4 overflow-hidden flex flex-col">
      <PlaceList />
    </div>
  </div>

  {/* 모바일 하단 네비게이션 */}
  <MobileNavigation
    variant="share"  // 2탭 모드
    activeTab={mobileTab}
    onTabChange={setMobileTab}
    placeCount={places.length}
  />
</div>
```

---

### FR-2: 모바일 하단 네비게이션 (2탭)

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-2.1 | **MobileNavigation 컴포넌트 2탭 모드 지원** | P0 | variant="share"로 지도/목록 2탭만 표시 |
| FR-2.2 | 활성 탭 시각적 강조 | P1 | 현재 탭 배경색/텍스트 색상 구분 |
| FR-2.3 | sm 이상 브레이크포인트에서 숨김 | P0 | `sm:hidden` 적용 |
| FR-2.4 | Safe area 대응 | P0 | `pb-safe` 적용으로 iOS 홈바 영역 고려 |

**UI 구성:**
```
┌─────────────────────────────────┐
│                                 │
│         (콘텐츠 영역)            │
│                                 │
├─────────────────────────────────┤
│     🗺️ 지도    │    📍 목록     │  ← 2탭 네비게이션 (공유 페이지)
└─────────────────────────────────┘
```

**MobileNavigation 확장:**
```tsx
// components/mobile/MobileNavigation.tsx 수정
export type MobileTab = 'map' | 'list' | 'input'
export type ShareMobileTab = 'map' | 'list'

interface MobileNavigationProps {
  activeTab: MobileTab | ShareMobileTab
  onTabChange: (tab: MobileTab | ShareMobileTab) => void
  placeCount?: number
  variant?: 'default' | 'share'  // 추가: 2탭/3탭 모드
}

export function MobileNavigation({
  activeTab,
  onTabChange,
  placeCount = 0,
  variant = 'default',
}: MobileNavigationProps) {
  const allTabs = [
    { id: 'map', label: '지도', icon: '🗺️' },
    { id: 'list', label: '목록', icon: '📍' },
    { id: 'input', label: '추가', icon: '➕' },
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
      {/* ... 기존 구현 유지 ... */}
    </nav>
  )
}
```

---

### FR-3: 장소 상세 패널 모바일 대응 (Bottom Sheet)

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-3.1 | **모바일에서 Bottom Sheet로 표시** | P0 | Sheet 컴포넌트 side="bottom" 사용 |
| FR-3.2 | 내용 전체 스크롤 가능 | P0 | `flex-1 min-h-0 overflow-y-auto` 패턴 |
| FR-3.3 | 최대 높이 90vh, 최소 높이 50vh | P0 | 화면 비율에 맞는 유연한 높이 |
| FR-3.4 | Desktop에서 기존 사이드 패널 유지 | P0 | `lg:block` 조건부 렌더링 |
| FR-3.5 | 닫기 버튼 명확 | P1 | SheetHeader에 닫기 버튼 포함 |

**현재 문제:**
```tsx
// 현재: 고정 너비, 모바일 화면 벗어남
<div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l z-50">
  <PlaceDetailsPanel />
</div>
```

**구현 방향:**
```tsx
// After: 메인 페이지와 동일한 패턴
{detailPlaceId && (
  <>
    {/* Mobile: Bottom Sheet */}
    <Sheet open={!!detailPlaceId} onOpenChange={(open) => !open && setDetailPlaceId(null)}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] h-auto min-h-[50vh] rounded-t-xl flex flex-col lg:hidden"
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

    {/* Desktop: Side Panel */}
    <div className="hidden lg:block fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l z-50">
      <PlaceDetailsPanel
        placeId={detailPlaceId}
        onClose={() => setDetailPlaceId(null)}
        shareToken={token}
      />
    </div>
  </>
)}
```

---

### FR-4: 헤더 모바일 최적화

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-4.1 | **"내 프로젝트로 복사" 버튼 헤더에 유지** | P0 | 모바일에서도 헤더에 고정 |
| FR-4.2 | 모바일에서 버튼 크기 축소 | P1 | `size="sm"` 또는 아이콘만 표시 |
| FR-4.3 | "공유된 여행 계획" 배지 축소 | P2 | 모바일에서 아이콘만 또는 숨김 |
| FR-4.4 | 프로젝트 정보 반응형 표시 | P1 | 긴 이름 truncate 처리 |

**구현 방향:**
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

---

### FR-5: 카테고리 필터 모바일 최적화

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-5.1 | 가로 스크롤 필터 | P1 | `overflow-x-auto` + `flex-nowrap` |
| FR-5.2 | 스크롤 인디케이터 | P2 | 좌우 그라데이션 또는 화살표 |
| FR-5.3 | 터치 타겟 크기 확보 | P0 | 최소 44px 높이 |

**구현 방향:**
```tsx
{/* 카테고리 필터 - 가로 스크롤 */}
<div className="mb-4 flex-shrink-0 -mx-4 px-4 overflow-x-auto scrollbar-hide">
  <div className="flex gap-2 min-w-max">
    <Button
      size="sm"
      className="h-9"  // 44px 확보
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

---

### FR-6: 스크롤 접근성 보장

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-6.1 | 장소 목록 전체 스크롤 가능 | P0 | 마지막 항목까지 접근 가능 |
| FR-6.2 | 중첩 스크롤 제거 | P0 | 단일 스크롤 컨테이너 |
| FR-6.3 | Safe area 패딩 적용 | P0 | `pb-safe` 또는 `pb-16 sm:pb-0` |

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

### NFR-1: 터치 친화성

| ID | 요구사항 | 기준 | 근거 |
|----|---------|------|------|
| NFR-1.1 | 터치 타겟 최소 44x44px | WCAG 2.1 AAA | Apple HIG |
| NFR-1.2 | 인접 타겟 간 최소 8px 간격 | Apple HIG | 실수 터치 방지 |

### NFR-2: 반응형 브레이크포인트

| ID | 요구사항 | 값 | 설명 |
|----|---------|-----|------|
| NFR-2.1 | 모바일 | < 640px | 탭 기반 레이아웃, 2탭 네비게이션 |
| NFR-2.2 | 태블릿/데스크톱 | ≥ 640px | 2컬럼 그리드 |

### NFR-3: 성능

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-3.1 | 지도 로딩 시 스켈레톤 UI | 로딩 중 빈 화면 방지 |
| NFR-3.2 | 터치 응답 100ms 이내 | 체감 즉각 반응 |

### NFR-4: 코드 재사용

| ID | 요구사항 | 설명 |
|----|---------|------|
| NFR-4.1 | MobileNavigation 컴포넌트 재사용 | variant prop으로 2탭/3탭 모드 전환 |
| NFR-4.2 | PlaceList 컴포넌트 재사용 | 공유 페이지에서 동일 컴포넌트 사용 가능 |
| NFR-4.3 | PlaceDetailsPanel 컴포넌트 재사용 | shareToken prop 지원 |

---

## 5. 사용자 스토리 (User Stories)

### US-1: 모바일에서 공유된 여행 계획 확인

> **As a** 공유 링크를 받은 모바일 사용자
> **I want to** 지도에서 장소들을 확인하고 싶다
> **So that** 여행 계획을 검토할 수 있다

**수락 기준 (Acceptance Criteria):**
- [ ] 지도가 화면에 꽉 차게 표시됨 (최소 300px 높이)
- [ ] 하단 탭으로 지도/목록 간 쉽게 전환 가능
- [ ] 장소 마커 터치 시 상세 정보 확인 가능
- [ ] 스크롤로 모든 장소에 접근 가능

---

### US-2: 모바일에서 장소 상세 확인

> **As a** 공유 페이지 방문자
> **I want to** 특정 장소의 상세 정보를 확인하고 싶다
> **So that** 방문 여부를 결정할 수 있다

**수락 기준 (Acceptance Criteria):**
- [ ] "상세" 버튼 터치 시 Bottom Sheet로 정보 표시
- [ ] 장소명, 카테고리, 코멘트, 주소, 평점 확인 가능
- [ ] Google Maps 링크로 외부 앱 연동 가능
- [ ] 닫기 버튼으로 쉽게 패널 닫기 가능

---

### US-3: 모바일에서 프로젝트 복사

> **As a** 공유 페이지 방문자
> **I want to** 이 여행 계획을 내 프로젝트로 복사하고 싶다
> **So that** 수정해서 내 여행 계획으로 사용할 수 있다

**수락 기준 (Acceptance Criteria):**
- [ ] 헤더의 복사 버튼이 명확하게 보임
- [ ] 버튼 터치 시 로그인 유도 또는 복사 진행
- [ ] 복사 완료 후 내 프로젝트 페이지로 이동

---

## 6. 구현 우선순위

### Phase 1 (P0 - 핵심)

1. **MobileNavigation 2탭 모드 확장**
   - 파일: `components/mobile/MobileNavigation.tsx`
   - 작업: `variant="share"` prop 추가, input 탭 조건부 렌더링

2. **공유 페이지 3-tier 레이아웃 적용**
   - 파일: `app/s/[token]/page.tsx`
   - 작업: Mobile 탭 기반 + Tablet/Desktop 2컬럼 레이아웃

3. **장소 상세 패널 Bottom Sheet 적용**
   - 파일: `app/s/[token]/page.tsx`
   - 작업: Sheet 컴포넌트 사용, 모바일/데스크톱 분기

4. **헤더 모바일 최적화**
   - 파일: `app/s/[token]/page.tsx`
   - 작업: 복사 버튼 축소, 배지 조건부 표시

### Phase 2 (P1 - 개선)

1. **카테고리 필터 가로 스크롤**
2. **터치 타겟 크기 조정**
3. **스크롤 접근성 검증 및 수정**

### Phase 3 (P2 - 추가)

1. **E2E 테스트 추가**
2. **애니메이션 개선**

---

## 7. Playwright E2E 테스트 요구사항

### 7.1 테스트할 뷰포트

| 기기 | 너비 | 높이 | 설명 |
|------|------|------|------|
| iPhone SE | 375px | 667px | 최소 모바일 |
| iPhone 14 Pro | 393px | 852px | 일반 모바일 |
| iPad Mini | 768px | 1024px | 태블릿 |
| Desktop | 1920px | 1080px | Full HD |

### 7.2 테스트 시나리오

#### E2E-Share-1: 공유 페이지 레이아웃

| ID | 시나리오 | 검증 항목 |
|----|---------|----------|
| E2E-Share-1.1 | 모바일에서 페이지 로드 | 2탭 네비게이션 표시, 지도 기본 표시 |
| E2E-Share-1.2 | 모바일 탭 전환 | 지도 ↔ 목록 탭 전환 시 즉시 콘텐츠 표시 |
| E2E-Share-1.3 | 태블릿/데스크톱 레이아웃 | 2컬럼 그리드 표시, 네비게이션 숨김 |

#### E2E-Share-2: 장소 상세 패널

| ID | 시나리오 | 검증 항목 |
|----|---------|----------|
| E2E-Share-2.1 | 모바일에서 상세 버튼 클릭 | Bottom Sheet 열림 |
| E2E-Share-2.2 | 상세 패널 스크롤 | 전체 내용 스크롤 가능 |
| E2E-Share-2.3 | 데스크톱에서 상세 버튼 클릭 | 사이드 패널 열림 |

#### E2E-Share-3: 복사 기능

| ID | 시나리오 | 검증 항목 |
|----|---------|----------|
| E2E-Share-3.1 | 비로그인 상태에서 복사 버튼 클릭 | 로그인 페이지로 이동 |
| E2E-Share-3.2 | 복사 버튼 모바일 표시 | 버튼 터치 가능, 텍스트 적절히 표시 |

---

## 8. 기술적 고려사항

### 8.1 컴포넌트 재사용 전략

| 컴포넌트 | 현재 상태 | 수정 필요 |
|---------|----------|----------|
| MobileNavigation | 3탭 고정 | variant prop 추가 |
| PlaceList | 공유 페이지에서 미사용 | 그대로 사용 가능 |
| PlaceDetailsPanel | shareToken prop 지원 | 그대로 사용 |
| GoogleMap | 공유 페이지에서 사용 중 | 수정 불필요 |

### 8.2 타입 정의

```typescript
// types/index.ts 또는 MobileNavigation.tsx
export type MobileTab = 'map' | 'list' | 'input'
export type ShareMobileTab = 'map' | 'list'
```

### 8.3 주의사항

- iOS Safari의 100vh 버그 고려
- Safe area insets 처리
- 공유 페이지는 인증 불필요하므로 useSession 결과에 따른 UI 분기 필요

---

## 9. 다음 단계

요구사항 정의가 완료되었습니다. 다음 단계를 선택하세요:

1. **`/sc:design`** - 상세 UI/UX 설계 및 컴포넌트 아키텍처 설계
2. **`/sc:workflow`** - 구현 작업 분해 및 단계별 계획 수립
3. **`/sc:implement`** - 바로 구현 시작

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-21 | 1.0 | 최초 작성 - 브레인스토밍 기반 요구사항 정의 | Claude |
