# 모바일 웹 UI 개선 요구사항 명세서

> **작성일**: 2026-01-21
> **상태**: 요구사항 정의 완료
> **다음 단계**: `/sc:design` 또는 `/sc:workflow`로 설계/구현 계획 수립

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **목표** | 모바일 및 다양한 화면 크기에서 기본 사용 가능한 수준으로 UI 개선 |
| **범위** | 프로젝트 상세 페이지, 이미지/텍스트 입력 UI, 공유 페이지 |
| **타겟 기기** | iPhone Safari (iOS), Windows 노트북 (다양한 해상도) |
| **목표 수준** | 기본 사용 가능 (핵심 기능: 장소 확인, 지도 보기) |
| **QA 전략** | Playwright E2E 테스트로 다양한 뷰포트 자동 검증 |

---

## 2. 현황 분석

### 2.1 심각한 문제 (레이아웃 깨짐)

| 문제 | 현재 상태 | 영향 |
|------|----------|------|
| 프로젝트 상세 페이지 | `lg:grid-cols-[2fr_1fr_280px]`만 정의 | sm/md에서 레이아웃 완전 붕괴 |
| 장소 상세 패널 | `fixed w-96 (384px)` 고정 | 모바일 화면 대부분 차지 |
| 이미지 목록 | `grid-cols-5` 고정 | 모바일에서 이미지 매우 작음 |

### 2.2 중간 문제 (터치 영역 부족)

| 문제 | 현재 상태 | 권장 |
|------|----------|------|
| 버튼 (sm 사이즈) | `h-8` (32px) | 최소 44px (WCAG 기준) |
| 수정/삭제 버튼 | `h-6` (24px) | 최소 44px |
| 입력 탭 버튼 | `py-2` (~36px) | 최소 44px |

### 2.3 문제 파일 위치

```
app/(dashboard)/projects/[id]/page.tsx:344  # 메인 그리드 레이아웃
components/place/PlaceDetailsPanel.tsx      # 고정 너비 사이드 패널
components/upload/ImageList.tsx:50          # grid-cols-5 고정
components/place/PlaceList.tsx              # 작은 버튼 크기
components/ui/button.tsx                    # sm 사이즈 정의
```

---

## 3. 기능 요구사항 (Functional Requirements)

### FR-1: 모바일 레이아웃 재구성

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-1.1 | 프로젝트 상세 페이지 세로 스택 | P0 | 모바일에서 지도 → 입력 → 목록 순서로 세로 배치 |
| FR-1.2 | lg 이상 3열 그리드 유지 | P0 | 데스크톱 레이아웃은 기존 유지 |
| FR-1.3 | 지도 최소 높이 보장 | P0 | 모바일에서 지도 최소 300px 높이 |

**구현 방향:**
```tsx
// Before (lg만 정의)
<div className="grid lg:grid-cols-[2fr_1fr_280px] gap-4">

// After (모바일 우선)
<div className="flex flex-col lg:grid lg:grid-cols-[2fr_1fr_280px] gap-4">
  <div className="order-1 lg:order-1 h-[300px] lg:h-full">지도</div>
  <div className="order-2 lg:order-2">입력</div>
  <div className="order-3 lg:order-3 hidden lg:block">목록</div>
</div>
```

---

### FR-2: 하단 네비게이션 바

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-2.1 | 하단 고정 네비게이션 | P0 | 지도/목록/입력 3개 아이콘 |
| FR-2.2 | 활성 탭 표시 | P1 | 현재 보고 있는 화면 강조 |
| FR-2.3 | lg 이상 숨김 | P0 | 데스크톱에서는 불필요 |

**UI 구성:**
```
┌─────────────────────────────────┐
│                                 │
│         (콘텐츠 영역)            │
│                                 │
├─────────────────────────────────┤
│  🗺️ 지도  │  📍 목록  │  ➕ 입력  │  ← 하단 네비게이션 (모바일만)
└─────────────────────────────────┘
```

---

### FR-3: 장소 목록 하단 드로어

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-3.1 | 하단 드로어(Sheet) 표시 | P0 | shadcn/ui Sheet 컴포넌트 활용 |
| FR-3.2 | 드로어 높이 조절 | P1 | 최소 30% ~ 최대 80% 화면 |
| FR-3.3 | 외부 터치 닫힘 | P1 | 드로어 외부 터치 시 닫힘 |

**동작 흐름:**
1. 하단 네비게이션에서 "목록" 탭 터치
2. 화면 하단에서 드로어가 올라옴
3. 장소 목록 스크롤 가능
4. 장소 터치 시 상세 모달 표시
5. 드로어 외부 또는 X 버튼으로 닫기

---

### FR-4: 장소 상세 패널 모바일 대응

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-4.1 | 전체 화면 모달 | P0 | 모바일에서 장소 상세를 풀스크린 모달로 |
| FR-4.2 | 닫기 버튼 명확 | P0 | 좌상단 또는 우상단에 닫기 버튼 |
| FR-4.3 | lg 이상 사이드 패널 유지 | P1 | 데스크톱은 기존 방식 유지 |

**구현 방향:**
```tsx
// Before (항상 fixed 사이드 패널)
<div className="fixed right-0 top-16 bottom-0 w-96">

// After (반응형)
{/* 모바일: 풀스크린 모달 */}
<Sheet open={!!detailPlaceId} className="lg:hidden">
  <SheetContent side="bottom" className="h-[90vh]">
    <PlaceDetailsPanel />
  </SheetContent>
</Sheet>

{/* 데스크톱: 사이드 패널 */}
<div className="hidden lg:block fixed right-0 top-16 bottom-0 w-96">
  <PlaceDetailsPanel />
</div>
```

---

### FR-5: 입력 기능 모바일 유지

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|---------|------|
| FR-5.1 | 이미지 업로드 사용 가능 | P0 | 갤러리/카메라 선택 지원 |
| FR-5.2 | 텍스트/URL 입력 사용 가능 | P0 | 키보드 입력 및 붙여넣기 지원 |
| FR-5.3 | 입력 탭 아이콘만 표시 | P1 | 공간 절약을 위해 아이콘만 (툴팁으로 설명) |

**입력 탭 모바일 UI:**
```
데스크톱: [📷 이미지] [📝 텍스트] [🔗 URL]
모바일:   [📷] [📝] [🔗]  ← 아이콘만 표시
```

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

### NFR-1: 터치 친화성

| ID | 요구사항 | 기준 | 근거 |
|----|---------|------|------|
| NFR-1.1 | 터치 타겟 최소 44x44px | WCAG 2.1 AAA | Apple Human Interface Guidelines |
| NFR-1.2 | 인접 타겟 간 최소 8px 간격 | Apple HIG | 실수 터치 방지 |
| NFR-1.3 | 버튼 내부 패딩 충분히 확보 | px-4 py-3 이상 | 터치 편의성 |

**영향받는 컴포넌트:**
- `components/ui/button.tsx` - sm 사이즈 조정 필요
- `components/place/PlaceList.tsx` - 수정/삭제 버튼 크기 조정
- `components/input/InputTabs.tsx` - 탭 버튼 크기 조정

---

### NFR-2: 반응형 브레이크포인트

| ID | 요구사항 | 값 | 설명 |
|----|---------|-----|------|
| NFR-2.1 | 모바일 | < 640px (default) | 세로 스택 레이아웃 |
| NFR-2.2 | 태블릿 | 640px ~ 1023px (sm, md) | 2열 레이아웃 고려 |
| NFR-2.3 | 데스크톱 | ≥ 1024px (lg+) | 기존 3열 레이아웃 |

**지원 뷰포트:**
- iPhone SE: 375px
- iPhone 14: 390px
- iPhone 14 Pro Max: 430px
- iPad Mini: 768px

---

### NFR-3: 성능

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-3.1 | 지도 로딩 시 스켈레톤 UI | 로딩 중 빈 화면 방지 |
| NFR-3.2 | 터치 응답 100ms 이내 | 체감 즉각 반응 |
| NFR-3.3 | 드로어 애니메이션 60fps | 부드러운 전환 |

---

## 5. 사용자 스토리 (User Stories)

### US-1: 모바일에서 장소 확인

> **As a** 모바일 사용자
> **I want to** 저장된 장소를 지도에서 확인하고 싶다
> **So that** 여행 계획을 검토할 수 있다

**수락 기준 (Acceptance Criteria):**
- [ ] 지도가 화면에 꽉 차게 표시됨 (최소 300px 높이)
- [ ] 장소 마커를 터치하면 상세 정보가 모달로 표시됨
- [ ] 하단 드로어로 장소 목록 확인 가능
- [ ] 장소 목록에서 항목 터치 시 지도에서 해당 위치로 이동

---

### US-2: 모바일에서 이미지 업로드

> **As a** 모바일 사용자
> **I want to** 스마트폰 갤러리에서 스크린샷을 업로드하고 싶다
> **So that** 바로 장소를 추출할 수 있다

**수락 기준 (Acceptance Criteria):**
- [ ] 업로드 버튼이 충분히 크고 터치하기 쉬움 (44px 이상)
- [ ] 갤러리 선택 또는 카메라 촬영 선택 가능
- [ ] 업로드 진행 상태 표시 (프로그레스 바 또는 스피너)
- [ ] 업로드 완료 후 처리 중 상태 표시

---

### US-3: 모바일에서 화면 전환

> **As a** 모바일 사용자
> **I want to** 지도, 장소 목록, 입력 화면을 쉽게 전환하고 싶다
> **So that** 앱처럼 사용할 수 있다

**수락 기준 (Acceptance Criteria):**
- [ ] 하단 네비게이션 바로 한 번의 터치로 화면 전환
- [ ] 현재 활성 탭이 시각적으로 구분됨 (색상, 아이콘 강조)
- [ ] 화면 전환 시 부드러운 애니메이션 (fade 또는 slide)
- [ ] 뒤로가기 버튼 동작이 예상대로 작동

---

### US-4: 모바일에서 장소 상세 확인

> **As a** 모바일 사용자
> **I want to** 특정 장소의 상세 정보를 확인하고 싶다
> **So that** 방문 여부를 결정할 수 있다

**수락 기준 (Acceptance Criteria):**
- [ ] 장소 터치 시 상세 정보가 전체 화면 모달로 표시
- [ ] 장소명, 카테고리, 코멘트, 주소, 평점 등 정보 확인 가능
- [ ] Google Maps 링크로 외부 앱 연동 가능
- [ ] 닫기 버튼이 명확하고 터치하기 쉬움

---

## 6. 구현 우선순위

### Phase 1 (P0 - 필수)

1. **프로젝트 상세 페이지 레이아웃 반응형 적용**
   - 파일: `app/(dashboard)/projects/[id]/page.tsx`
   - 작업: flex-col + lg:grid 조합으로 변경

2. **하단 네비게이션 바 추가**
   - 파일: 신규 `components/mobile/MobileNavigation.tsx`
   - 작업: 지도/목록/입력 탭 네비게이션

3. **장소 목록 하단 드로어**
   - 파일: 신규 `components/mobile/PlaceListDrawer.tsx`
   - 작업: shadcn/ui Sheet 활용

4. **장소 상세 모바일 모달**
   - 파일: `components/place/PlaceDetailsPanel.tsx`
   - 작업: 반응형 분기 (모바일: 모달, 데스크톱: 사이드패널)

5. **터치 타겟 크기 조정**
   - 파일: `components/ui/button.tsx`, PlaceList.tsx
   - 작업: sm 사이즈 44px 이상으로 조정

### Phase 2 (P1 - 개선)

1. 입력 탭 아이콘만 표시 (모바일)
2. 드로어 높이 조절 기능
3. 활성 탭 시각적 강조
4. 화면 전환 애니메이션

---

## 7. 기술적 고려사항

### 7.1 사용할 컴포넌트

- **Sheet** (shadcn/ui): 하단 드로어용
- **Dialog** (shadcn/ui): 모바일 모달용
- **Tabs** (shadcn/ui): 하단 네비게이션용

### 7.2 CSS 전략

```css
/* 모바일 우선 설계 */
.container {
  /* 기본: 모바일 */
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .container {
    /* lg 이상: 데스크톱 */
    display: grid;
    grid-template-columns: 2fr 1fr 280px;
  }
}
```

### 7.3 주의사항

- iOS Safari의 100vh 버그 (주소창 높이 고려)
- Safe area insets 처리 (노치, 홈바 영역)
- 키보드 올라올 때 레이아웃 처리

---

## 8. Playwright E2E 테스트 요구사항

### 8.1 테스트 환경 설정

```bash
# Playwright 설치
npm install -D @playwright/test
npx playwright install
```

### 8.2 테스트할 뷰포트

| 기기 | 너비 | 높이 | 설명 |
|------|------|------|------|
| iPhone SE | 375px | 667px | 최소 모바일 |
| iPhone 14 Pro | 393px | 852px | 일반 모바일 |
| iPhone 14 Pro Max | 430px | 932px | 대형 모바일 |
| Windows 노트북 (소) | 1366px | 768px | 일반적인 노트북 |
| Windows 노트북 (중) | 1536px | 864px | FHD 스케일링 |
| Desktop | 1920px | 1080px | Full HD |

### 8.3 테스트 시나리오

#### E2E-1: 프로젝트 상세 페이지 레이아웃

| ID | 시나리오 | 검증 항목 |
|----|---------|----------|
| E2E-1.1 | 모바일에서 페이지 로드 | 세로 스택 레이아웃, 스크롤 가능 |
| E2E-1.2 | 데스크톱에서 페이지 로드 | 3열 그리드 레이아웃 |
| E2E-1.3 | 뷰포트 리사이즈 | 브레이크포인트에서 레이아웃 전환 |

#### E2E-2: 터치/클릭 영역

| ID | 시나리오 | 검증 항목 |
|----|---------|----------|
| E2E-2.1 | 버튼 클릭 가능 | 모든 버튼이 클릭 가능하고 반응 |
| E2E-2.2 | 장소 목록 아이템 터치 | 선택 상태 변경, 지도 연동 |
| E2E-2.3 | 상세 버튼 클릭 | PlaceDetailsPanel 열림 |

#### E2E-3: 공유 페이지

| ID | 시나리오 | 검증 항목 |
|----|---------|----------|
| E2E-3.1 | 공유 페이지 로드 | 지도, 장소 목록 표시 |
| E2E-3.2 | 장소 상세 보기 | PlaceDetailsPanel 열림 (수정됨 ✅) |
| E2E-3.3 | 프로젝트 복사 | 로그인 유도 또는 복사 성공 |

### 8.4 테스트 코드 예시

```typescript
// tests/responsive.spec.ts
import { test, expect, devices } from '@playwright/test';

const viewports = [
  { name: 'iPhone SE', ...devices['iPhone SE'] },
  { name: 'iPhone 14 Pro Max', ...devices['iPhone 14 Pro Max'] },
  { name: 'Windows Laptop', viewport: { width: 1366, height: 768 } },
  { name: 'Desktop', viewport: { width: 1920, height: 1080 } },
];

for (const device of viewports) {
  test.describe(`${device.name}`, () => {
    test.use(device);

    test('프로젝트 상세 페이지 레이아웃', async ({ page }) => {
      await page.goto('/projects/test-id');

      // 지도가 표시되는지 확인
      await expect(page.locator('[data-testid="google-map"]')).toBeVisible();

      // 모바일에서는 세로 스택
      if (device.viewport?.width && device.viewport.width < 1024) {
        // 하단 네비게이션 표시 확인
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      }
    });

    test('버튼 클릭 가능 확인', async ({ page }) => {
      await page.goto('/projects/test-id');

      // 모든 버튼이 최소 터치 영역 확보
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(32); // 최소 32px
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    });
  });
}
```

### 8.5 CI 통합

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

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
| 2026-01-21 | 1.0 | 최초 작성 | Claude |
| 2026-01-21 | 1.1 | 윈도우 노트북 지원 추가, Playwright E2E 테스트 요구사항 추가, 공유 페이지 PlaceDetailsPanel 수정 완료 | Claude |
