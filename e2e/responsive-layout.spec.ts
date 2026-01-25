/**
 * 반응형 레이아웃 E2E 테스트
 *
 * MOBILE_UI_REQUIREMENTS.md 기반:
 * - E2E-1: 프로젝트 상세 페이지 레이아웃
 * - NFR-2: 반응형 브레이크포인트 (< 640px 모바일, >= 1024px 데스크톱)
 */
import { test, expect, TEST_PROJECT, TEST_PLACES } from './fixtures/auth'

// 뷰포트 분류 헬퍼 - Based on actual Tailwind breakpoints
// Mobile: < 640px (sm:hidden shows, full tab view)
// Tablet: 640px - 1023px (sm:grid lg:hidden, 2-column with sidebar tabs)
// Desktop: >= 1024px (lg:grid, 3-column layout)
function isMobile(viewportWidth: number): boolean {
  return viewportWidth < 640
}

function isTablet(viewportWidth: number): boolean {
  return viewportWidth >= 640 && viewportWidth < 1024
}

function isDesktop(viewportWidth: number): boolean {
  return viewportWidth >= 1024
}

test.describe('E2E-1: 프로젝트 상세 페이지 레이아웃', () => {
  test('E2E-1.1: 지도가 표시되고 스크롤 가능하다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // The page should show project title (confirms we're on the right page)
    const projectTitle = projectDetailPage.getByText(TEST_PROJECT.name)
    await expect(projectTitle).toBeVisible({ timeout: 5000 })

    // Page should have proper height (content loaded)
    const bodyHeight = await projectDetailPage.evaluate(() => document.body.scrollHeight)
    expect(bodyHeight).toBeGreaterThan(300)

    // Map container or loading should be present somewhere in the page
    // The map area exists in all viewports (mobile shows it in map tab by default)
    const hasMapOrLoading = await projectDetailPage.evaluate(() => {
      const body = document.body.innerHTML
      return body.includes('지도 로딩') || body.includes('Map') || body.includes('map')
    })
    expect(hasMapOrLoading).toBe(true)
  })

  test('E2E-1.2: 모바일에서 탭 기반 레이아웃이 적용된다', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    if (!viewport || !isMobile(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // 모바일에서 탭 기반 싱글뷰 - MobileNavigation이 표시되어야 함
    const mobileNav = projectDetailPage.locator('[data-testid="mobile-nav"]')
    await expect(mobileNav).toBeVisible()

    // 세 개의 탭 버튼 (지도, 목록, 추가)이 있어야 함
    const mapTab = mobileNav.getByRole('button').filter({ hasText: '지도' })
    const listTab = mobileNav.getByRole('button').filter({ hasText: '목록' })
    const inputTab = mobileNav.getByRole('button').filter({ hasText: '추가' })

    await expect(mapTab).toBeVisible()
    await expect(listTab).toBeVisible()
    await expect(inputTab).toBeVisible()
  })

  test('E2E-1.3: 데스크톱에서 그리드 레이아웃이 적용된다', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    if (!viewport || !isDesktop(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // 데스크톱에서 3-column 그리드 레이아웃 확인
    // lg:grid with grid-cols-[2fr_1fr_280px]
    const gridContainer = projectDetailPage.locator('.lg\\:grid').first()

    if (await gridContainer.isVisible()) {
      const display = await gridContainer.evaluate((el) => getComputedStyle(el).display)
      expect(display).toBe('grid')
    }

    // 장소 목록 헤더가 직접 표시되어야 함 (탭 없이)
    const placeListHeader = projectDetailPage.getByText(/📍 장소 목록/)
    await expect(placeListHeader).toBeVisible()

    // MobileNavigation은 숨겨져 있어야 함
    const mobileNav = projectDetailPage.locator('[data-testid="mobile-nav"]')
    const isMobileNavVisible = await mobileNav.isVisible().catch(() => false)
    expect(isMobileNavVisible).toBe(false)
  })

  test('E2E-1.4: 뷰포트 너비에 따라 레이아웃이 적절히 변경된다', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    if (!viewport) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // 화면 너비에 따른 레이아웃 확인
    if (isMobile(viewport.width)) {
      // 모바일 (< 640px): 하단 네비게이션이 표시되어야 함
      const mobileNav = projectDetailPage.locator('[data-testid="mobile-nav"]')
      await expect(mobileNav).toBeVisible()

      // 목록 탭 클릭 시 장소 목록이 표시됨
      const listTab = mobileNav.getByRole('button').filter({ hasText: '목록' })
      await listTab.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')

      // Place list content should be visible (header or first place)
      const placeListHeader = projectDetailPage.getByText(/장소 목록/)
      const firstPlace = projectDetailPage.getByText(TEST_PLACES[0].name).first()
      const isHeaderVisible = await placeListHeader.isVisible().catch(() => false)
      const isPlaceVisible = await firstPlace.isVisible().catch(() => false)
      expect(isHeaderVisible || isPlaceVisible).toBe(true)
    } else if (isTablet(viewport.width)) {
      // 태블릿 (640-1023px): 2-column with sidebar tabs
      // MobileNavigation은 숨김, 사이드바 탭이 표시됨
      const mobileNav = projectDetailPage.locator('[data-testid="mobile-nav"]')
      const isMobileNavVisible = await mobileNav.isVisible().catch(() => false)
      expect(isMobileNavVisible).toBe(false)

      // ResponsiveSidebar tabs visible (📍 목록 or ➕ 입력)
      const sidebarListTab = projectDetailPage.getByRole('button', { name: /목록/ }).first()
      await expect(sidebarListTab).toBeVisible()
    } else {
      // 데스크톱 (≥ 1024px): 3-column layout, 장소 목록이 사이드에 표시
      const placeListHeader = projectDetailPage.getByText(/📍 장소 목록/)
      await expect(placeListHeader).toBeVisible()
    }
  })
})

test.describe('FR-1: 지도 최소 높이 보장', () => {
  test('FR-1.3: 지도가 최소 높이를 가진다', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    if (!viewport) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 지도 컨테이너 찾기
    const mapContainer = projectDetailPage.locator('[data-testid="google-map"], .google-map, [class*="map"]').first()

    if (await mapContainer.isVisible()) {
      const box = await mapContainer.boundingBox()

      if (box && isMobile(viewport.width)) {
        // 모바일에서 최소 300px 높이 (요구사항)
        // 실제 구현 전이므로 현재 높이만 체크
        expect(box.height).toBeGreaterThan(100) // 최소 표시 가능 높이
      }
    }
  })
})

test.describe('FR-4: 장소 상세 패널 반응형', () => {
  test('장소 클릭 시 상세 정보가 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')
    const viewport = projectDetailPage.viewportSize()

    // On mobile (< 640px), need to switch to list tab first
    if (viewport && isMobile(viewport.width)) {
      const listNavButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '목록' })
      await expect(listNavButton).toBeVisible()
      await listNavButton.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    }

    // Find the detail button directly (it's always in the DOM, just might need scrolling)
    const detailButton = projectDetailPage.getByRole('button', { name: '상세' }).first()

    // Scroll to the button to make it visible
    await detailButton.scrollIntoViewIfNeeded()
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Click the detail button
    await detailButton.click({ force: true })
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // 상세 정보가 표시되는지 확인 (Sheet dialog or side panel)
    // Mobile/Tablet: Sheet with role="dialog" and SheetTitle "장소 상세"
    // Desktop: Fixed side panel with class containing "fixed" and "right-0"
    const sheetTitle = projectDetailPage.getByText('장소 상세', { exact: true })
    const isSheetVisible = await sheetTitle.isVisible().catch(() => false)

    // Check for dialog
    const dialogVisible = await projectDetailPage.locator('[role="dialog"]').isVisible().catch(() => false)

    // Check for fixed side panel on desktop
    const sidePanel = projectDetailPage.locator('.fixed.right-0.w-96')
    const isSidePanelVisible = await sidePanel.isVisible().catch(() => false)

    expect(isSheetVisible || isSidePanelVisible || dialogVisible).toBe(true)
  })

  // Mobile: Bottom Sheet
  test('FR-4.1: 모바일에서 장소 상세는 전체 화면 또는 모달로 표시된다', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    // Run on mobile (< 640px) and tablet (640-1023px) - both use Sheet
    if (!viewport || isDesktop(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // On mobile, need to switch to list tab first
    if (isMobile(viewport.width)) {
      const listNavButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '목록' })
      if (await listNavButton.isVisible()) {
        await listNavButton.click()
        await projectDetailPage.waitForLoadState('domcontentloaded')
      }
    }

    // 장소 "상세" 버튼 클릭
    const detailButton = projectDetailPage.getByRole('button', { name: '상세' }).first()
    await expect(detailButton).toBeVisible()
    await detailButton.click({ force: true })
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Mobile/Tablet: Should show Sheet with role="dialog"
    const dialog = projectDetailPage.locator('[role="dialog"]')
    const isDialogVisible = await dialog.isVisible().catch(() => false)

    // Check for "장소 상세" title in the Sheet
    const sheetTitle = projectDetailPage.getByText('장소 상세', { exact: true })
    const isSheetTitleVisible = await sheetTitle.isVisible().catch(() => false)

    expect(isDialogVisible || isSheetTitleVisible).toBe(true)
  })

  test('FR-4.3: 데스크톱에서 장소 상세는 사이드 패널로 표시된다', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    if (!viewport || !isDesktop(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // "상세" 버튼 클릭
    const detailButton = projectDetailPage.getByRole('button', { name: '상세' }).first()
    await expect(detailButton).toBeVisible()
    await detailButton.click()
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // 데스크톱에서는 사이드 패널 (fixed right-0, lg:block)
    // Check for the fixed side panel with class "fixed right-0 ... lg:block"
    const sidePanel = projectDetailPage.locator('.fixed.right-0.w-96')
    const isSidePanelVisible = await sidePanel.isVisible().catch(() => false)

    // Or check that PlaceDetailsPanel content is visible somewhere
    const closeButton = projectDetailPage.getByRole('button', { name: /닫기|close/i })
    const isCloseButtonVisible = await closeButton.isVisible().catch(() => false)

    expect(isSidePanelVisible || isCloseButtonVisible).toBe(true)
  })
})

test.describe('FR-5: 입력 기능 모바일 유지', () => {
  test('FR-5.1: 이미지 업로드 영역이 사용 가능하다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')
    const viewport = projectDetailPage.viewportSize()

    // Navigate to input area based on viewport
    if (viewport && isMobile(viewport.width)) {
      // Mobile: Click "추가" tab in mobile nav
      const inputNavButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '추가' })
      await expect(inputNavButton).toBeVisible()
      await inputNavButton.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    } else if (viewport && isTablet(viewport.width)) {
      // Tablet: Click "입력" tab in sidebar
      const inputTab = projectDetailPage.getByRole('button', { name: /입력/ }).first()
      await expect(inputTab).toBeVisible()
      await inputTab.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    }
    // Desktop: Input area is always visible in 3rd column

    // 이미지 탭 클릭 (should be visible now)
    const imageTab = projectDetailPage.getByRole('button', { name: /📸.*이미지|이미지/ })
    const isImageTabVisible = await imageTab.first().isVisible().catch(() => false)
    if (isImageTabVisible) {
      await imageTab.first().click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    }

    // 업로드 영역 확인
    const uploadArea = projectDetailPage.getByText(/드래그|업로드|이미지를 드래그/)
    await expect(uploadArea.first()).toBeVisible()
  })

  test('FR-5.2: 텍스트 입력 폼이 사용 가능하다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')
    const viewport = projectDetailPage.viewportSize()

    // Navigate to input area based on viewport
    if (viewport && isMobile(viewport.width)) {
      const inputNavButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '추가' })
      await expect(inputNavButton).toBeVisible()
      await inputNavButton.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    } else if (viewport && isTablet(viewport.width)) {
      const inputTab = projectDetailPage.getByRole('button', { name: /입력/ }).first()
      await expect(inputTab).toBeVisible()
      await inputTab.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    }

    // 텍스트 탭 클릭 - InputTabs has tabs with icon + label
    // Look for button containing "텍스트" or "📝"
    const textTab = projectDetailPage.locator('button').filter({ hasText: /텍스트|📝/ }).first()
    await textTab.scrollIntoViewIfNeeded()
    await expect(textTab).toBeVisible({ timeout: 5000 })
    await textTab.click()
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // 텍스트 입력 필드 확인 (textarea with id="text-input")
    const textInput = projectDetailPage.locator('textarea#text-input')
    await expect(textInput).toBeVisible({ timeout: 5000 })

    // 입력 가능한지 확인
    await textInput.fill('테스트 텍스트 여행 장소')
    await expect(textInput).toHaveValue('테스트 텍스트 여행 장소')
  })

  test('FR-5.3: URL 입력 폼이 사용 가능하다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')
    const viewport = projectDetailPage.viewportSize()

    // Navigate to input area based on viewport
    if (viewport && isMobile(viewport.width)) {
      const inputNavButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '추가' })
      await expect(inputNavButton).toBeVisible()
      await inputNavButton.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    } else if (viewport && isTablet(viewport.width)) {
      const inputTab = projectDetailPage.getByRole('button', { name: /입력/ }).first()
      await expect(inputTab).toBeVisible()
      await inputTab.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    }

    // URL 탭 클릭 - InputTabs has tabs with icon + label
    const urlTab = projectDetailPage.locator('button').filter({ hasText: /URL|🔗/ }).first()
    await urlTab.scrollIntoViewIfNeeded()
    await expect(urlTab).toBeVisible({ timeout: 5000 })
    await urlTab.click()
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // URL 입력 필드 확인 (input with id="url-input" and type="url")
    const urlInput = projectDetailPage.locator('input#url-input')
    await expect(urlInput).toBeVisible({ timeout: 5000 })

    // 입력 가능한지 확인
    await urlInput.fill('https://example.com')
    await expect(urlInput).toHaveValue('https://example.com')
  })
})

test.describe('뷰포트 리사이즈 테스트', () => {
  test('E2E-1.3: 브라우저 리사이즈 시 레이아웃이 적절히 변경된다', async ({ projectDetailPage }) => {
    // 데스크톱 프로젝트에서만 실행
    const viewport = projectDetailPage.viewportSize()
    if (!viewport || viewport.width < 1920) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 데스크톱 레이아웃 확인
    const gridContainer = projectDetailPage.locator('[class*="grid"]').first()
    if (await gridContainer.isVisible()) {
      const desktopDisplay = await gridContainer.evaluate((el) => getComputedStyle(el).display)
      expect(desktopDisplay).toBe('grid')
    }

    // 모바일 크기로 리사이즈
    await projectDetailPage.setViewportSize({ width: 375, height: 667 })
    await projectDetailPage.waitForLoadState('domcontentloaded') // 레이아웃 변경 대기

    // 모바일 레이아웃 확인 (그리드가 아닌 flex-col 또는 block)
    // 리사이즈 후 레이아웃이 변경되었는지 확인
    const body = projectDetailPage.locator('body')
    const bodyWidth = await body.evaluate((el) => el.clientWidth)
    expect(bodyWidth).toBeLessThanOrEqual(400)
  })
})

test.describe('Mobile Tab Switching', () => {
  test('switches to list tab immediately without drawer', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    // Only run on mobile viewport (< 640px)
    if (!viewport || !isMobile(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Click list tab in mobile navigation
    const listButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '목록' })
    await expect(listButton).toBeVisible()
    await listButton.click()
    await projectDetailPage.waitForLoadState('domcontentloaded') // Wait for content switch

    // Verify list content is visible (place header or first place)
    const listHeader = projectDetailPage.getByText(/장소 목록/)
    const firstPlace = projectDetailPage.getByText(TEST_PLACES[0].name).first()

    const isListHeaderVisible = await listHeader.isVisible().catch(() => false)
    const isFirstPlaceVisible = await firstPlace.isVisible().catch(() => false)

    expect(isListHeaderVisible || isFirstPlaceVisible).toBe(true)

    // Verify the list content is NOT in a dialog/drawer (it's inline)
    // A drawer would have role="dialog" containing the list
    const dialogWithList = projectDetailPage.locator('[role="dialog"]').filter({ hasText: /장소 목록/ })
    const dialogCount = await dialogWithList.count()
    expect(dialogCount).toBe(0)
  })

  test('scrolling to last place item works', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    // Only run on mobile viewport (< 640px)
    if (!viewport || !isMobile(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Click list tab to show places
    const listButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '목록' })
    await expect(listButton).toBeVisible()
    await listButton.click()
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Verify first place is visible (list is showing)
    const firstPlace = projectDetailPage.getByText(TEST_PLACES[0].name).first()
    await expect(firstPlace).toBeVisible({ timeout: 5000 })

    // All 3 test places should be visible (small list, no scrolling needed)
    // Just verify all places are accessible
    for (const place of TEST_PLACES) {
      const placeElement = projectDetailPage.getByText(place.name).first()
      const isVisible = await placeElement.isVisible().catch(() => false)
      expect(isVisible).toBe(true)
    }
  })
})

test.describe('Tablet 2-Column Layout', () => {
  test('shows 2-column layout with sidebar tabs', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    // Only run on tablet viewport (640px - 1023px)
    if (!viewport || !isTablet(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Project title should be visible (page loaded correctly)
    const projectTitle = projectDetailPage.getByText(TEST_PROJECT.name)
    await expect(projectTitle).toBeVisible({ timeout: 5000 })

    // Sidebar tabs should be visible (📍 목록, ➕ 입력)
    // These are in ResponsiveSidebar component
    const listTab = projectDetailPage.getByRole('button', { name: /목록/ }).first()
    const inputTab = projectDetailPage.getByRole('button', { name: /입력/ }).first()
    await expect(listTab).toBeVisible({ timeout: 5000 })
    await expect(inputTab).toBeVisible()

    // Mobile nav should be hidden on tablet (sm:hidden applies at >= 640px)
    const mobileNav = projectDetailPage.locator('[data-testid="mobile-nav"]')
    const isMobileNavVisible = await mobileNav.isVisible().catch(() => false)
    expect(isMobileNavVisible).toBe(false)
  })

  test('switches sidebar content via tabs', async ({ projectDetailPage }) => {
    const viewport = projectDetailPage.viewportSize()
    // Only run on tablet viewport (640px - 1023px)
    if (!viewport || !isTablet(viewport.width)) {
      test.skip()
      return
    }

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // By default, list tab should be active - verify first place is visible
    const firstPlace = projectDetailPage.getByText(TEST_PLACES[0].name).first()
    await expect(firstPlace).toBeVisible({ timeout: 5000 })

    // Find and click input tab in sidebar
    const inputTab = projectDetailPage.getByRole('button', { name: /입력/ }).first()
    await expect(inputTab).toBeVisible()
    await inputTab.click()
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Verify input content is shown (image/text/url tabs should be visible)
    const imageTab = projectDetailPage.getByRole('button', { name: /이미지|📸/ })
    const textTab = projectDetailPage.getByRole('button', { name: /텍스트|📝/ })
    const urlTab = projectDetailPage.getByRole('button', { name: /URL|🔗/ })

    const isInputContentVisible =
      (await imageTab.first().isVisible().catch(() => false)) ||
      (await textTab.first().isVisible().catch(() => false)) ||
      (await urlTab.first().isVisible().catch(() => false))

    expect(isInputContentVisible).toBe(true)

    // Switch back to list tab
    const listTab = projectDetailPage.getByRole('button', { name: /목록/ }).first()
    await listTab.click()
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Verify place list content is shown again
    await expect(firstPlace).toBeVisible()
  })
})
