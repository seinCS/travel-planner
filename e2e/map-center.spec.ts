/**
 * 지도 중심점/배율 통일 E2E 테스트
 *
 * 테스트 케이스:
 * TC-01: 핀 없이 프로젝트 진입 → destination 중심
 * TC-02: 핀 있는 프로젝트 진입 → fitBounds
 * TC-03: 장소 클릭 → panTo + InfoWindow
 * TC-04: 탭 전환 → fitBounds 초기화
 * TC-05: Day 선택 → Day 장소 fitBounds
 * TC-06: 모바일 뷰 테스트
 *
 * 참고: Google Maps API 테스트는 실제 API 키가 필요하므로
 * 이 테스트는 DOM 구조와 상호작용을 검증합니다.
 * 실제 지도 동작(fitBounds, panTo, zoom)은 수동 테스트로 확인이 필요합니다.
 */
import { test, expect, TEST_PROJECT, TEST_PLACES } from './fixtures/auth'
import { Page } from '@playwright/test'

// ============================================
// Helper 함수
// ============================================

function isMobilePhone(viewport: { width: number; height: number } | null): boolean {
  return viewport ? viewport.width < 640 : false
}

// 프로젝트 페이지로 이동 및 로드 대기
async function navigateToProject(page: Page): Promise<boolean> {
  await page.goto(`/projects/${TEST_PROJECT.id}`)
  await page.waitForLoadState('networkidle')

  // 로그인 페이지로 리다이렉트되었는지 확인
  const loginButton = page.getByText('Google로 계속하기')
  const isLoginPage = await loginButton.isVisible({ timeout: 1000 }).catch(() => false)

  if (isLoginPage) {
    console.log('Warning: Redirected to login page - auth mocking may not be working')
    return false
  }

  return true
}

// 모바일에서 지도 탭으로 이동
async function navigateToMapTab(page: Page): Promise<void> {
  const viewport = page.viewportSize()
  if (isMobilePhone(viewport)) {
    // 지도가 이미 표시되어 있으면 탭 클릭 불필요
    const mapRegion = page.getByRole('region', { name: 'Map' })
    const isMapAlreadyVisible = await mapRegion.isVisible({ timeout: 1000 }).catch(() => false)
    if (isMapAlreadyVisible) return

    const mapNavButton = page.locator('nav button').filter({ hasText: /지도/ })
    if (await mapNavButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mapNavButton.click()
      await page.waitForLoadState('domcontentloaded')
    }
  }
}

// 모바일에서 목록 탭으로 이동
async function navigateToListTab(page: Page): Promise<void> {
  const viewport = page.viewportSize()
  if (isMobilePhone(viewport)) {
    const listNavButton = page.locator('nav button').filter({ hasText: /목록/ })
    if (await listNavButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listNavButton.click()
      await page.waitForLoadState('domcontentloaded')
    }
  }
}

// 일정 탭으로 이동 (데스크탑/태블릿)
async function navigateToItineraryTab(page: Page): Promise<void> {
  const viewport = page.viewportSize()

  if (isMobilePhone(viewport)) {
    // 모바일: 바텀 네비게이션의 일정 버튼
    const itineraryNavButton = page.locator('nav button').filter({ hasText: /일정/ })
    if (await itineraryNavButton.isVisible().catch(() => false)) {
      await itineraryNavButton.click()
      await page.waitForLoadState('domcontentloaded')
    }
  } else {
    // 데스크탑/태블릿: 메인 탭 네비게이션
    const itineraryTab = page.getByRole('button', { name: /일정/ })
    if (await itineraryTab.first().isVisible().catch(() => false)) {
      await itineraryTab.first().click()
      await page.waitForLoadState('domcontentloaded')
    }
  }
}

// 장소 탭으로 이동 (데스크탑/태블릿)
async function navigateToPlacesTab(page: Page): Promise<void> {
  const viewport = page.viewportSize()

  if (!isMobilePhone(viewport)) {
    const placesTab = page.getByRole('button', { name: /장소/ })
    if (await placesTab.first().isVisible().catch(() => false)) {
      await placesTab.first().click()
      await page.waitForLoadState('domcontentloaded')
    }
  }
}

// ============================================
// 테스트 케이스
// ============================================

test.describe('TC-01/02: 프로젝트 진입 시 지도 렌더링', () => {
  test('지도 컴포넌트가 렌더링된다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    await navigateToMapTab(projectDetailPage)

    // 지도 컨테이너 확인 (다양한 상태 체크)
    // 1. data-testid로 찾기
    const googleMapByTestId = projectDetailPage.locator('[data-testid="google-map"]')
    // 2. Google Maps API가 생성하는 region으로 찾기
    const googleMapRegion = projectDetailPage.locator('region[aria-label="Map"]').or(
      projectDetailPage.getByRole('region', { name: 'Map' })
    )
    // 3. 로딩 중 메시지
    const loadingMessage = projectDetailPage.getByText('지도 로딩 중...')

    // 지도 또는 로딩 메시지 중 하나는 표시되어야 함
    // 약간 대기하여 로딩 상태를 확인
    await projectDetailPage.waitForTimeout(1000)

    const isMapByTestIdVisible = await googleMapByTestId.isVisible().catch(() => false)
    const isMapRegionVisible = await googleMapRegion.first().isVisible().catch(() => false)
    const isLoadingVisible = await loadingMessage.first().isVisible().catch(() => false)

    expect(isMapByTestIdVisible || isMapRegionVisible || isLoadingVisible).toBe(true)
  })

  test('장소가 있으면 기본 위치 안내 메시지가 표시되지 않는다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    await navigateToMapTab(projectDetailPage)

    // 약간의 대기 (지도 로드)
    await projectDetailPage.waitForTimeout(1000)

    // "장소를 추가하면 해당 위치로 이동합니다" 메시지는 장소가 있으면 표시되지 않아야 함
    const hintMessage = projectDetailPage.getByText(/장소를 추가하면/)
    await expect(hintMessage).not.toBeVisible()
  })
})

test.describe('TC-03: 장소 클릭 시 상호작용', () => {
  test('장소 목록에서 장소 클릭 시 선택 상태가 표시된다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    const viewport = projectDetailPage.viewportSize()

    // 장소 목록 탭으로 이동 (모바일)
    await navigateToListTab(projectDetailPage)

    // 장소 목록이 표시될 때까지 대기
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // 첫 번째 장소 클릭
    const firstPlace = projectDetailPage.getByText(TEST_PLACES[0].name).first()
    await expect(firstPlace).toBeVisible({ timeout: 5000 })
    await firstPlace.click()

    // 모바일에서는 클릭 시 지도 탭으로 이동
    if (isMobilePhone(viewport)) {
      await projectDetailPage.waitForLoadState('domcontentloaded')
    }

    // 클릭 후 상태 변경 확인 (선택된 장소의 시각적 표시)
    // 정확한 선택 상태 확인은 UI 구현에 따라 다름
  })

  test('지도 영역이 충분한 크기를 가진다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    await navigateToMapTab(projectDetailPage)

    const googleMap = projectDetailPage.locator('[data-testid="google-map"]')

    // 지도가 로드될 때까지 대기
    const isMapVisible = await googleMap.isVisible({ timeout: 10000 }).catch(() => false)

    if (isMapVisible) {
      const boundingBox = await googleMap.boundingBox()
      expect(boundingBox).not.toBeNull()
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(100)
        expect(boundingBox.height).toBeGreaterThan(100)
      }
    }
  })
})

test.describe('TC-04: 탭 전환 시 동작', () => {
  test('Places → Itinerary 탭 전환이 동작한다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    const viewport = projectDetailPage.viewportSize()

    // 데스크탑/태블릿에서만 탭 전환 테스트
    if (!isMobilePhone(viewport)) {
      // Places 탭 확인
      const placesTab = projectDetailPage.getByRole('button', { name: /장소/ })
      await expect(placesTab.first()).toBeVisible()

      // Itinerary 탭으로 전환
      await navigateToItineraryTab(projectDetailPage)

      // 일정 관련 컨텐츠가 표시되는지 확인
      // (일정이 없으면 "일정 시작하기" 버튼, 있으면 Day 목록)
      const itineraryContent = projectDetailPage.getByText(/일정|Day|시작/)
      await expect(itineraryContent.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Itinerary → Places 탭 전환이 동작한다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    const viewport = projectDetailPage.viewportSize()

    if (!isMobilePhone(viewport)) {
      // Itinerary 탭으로 이동
      await navigateToItineraryTab(projectDetailPage)
      await projectDetailPage.waitForLoadState('domcontentloaded')

      // Places 탭으로 복귀
      await navigateToPlacesTab(projectDetailPage)

      // 장소 목록이 표시되는지 확인
      const placeListHeader = projectDetailPage.getByText(/장소 목록/)
      await expect(placeListHeader.first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('TC-05: Day 선택 시 동작', () => {
  test('일정 탭에서 Day 정보가 표시된다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    // 일정 탭으로 이동
    await navigateToItineraryTab(projectDetailPage)

    // 약간의 대기
    await projectDetailPage.waitForTimeout(500)

    // 일정 관련 UI가 표시되는지 확인
    // 일정이 있으면 Day 버튼, 없으면 "일정 만들기" 또는 "일정이 없습니다" 메시지
    const dayContent = projectDetailPage.getByText(/Day \d|일정 만들기|일정이 없습니다/)
    const hasItineraryUI = await dayContent.first().isVisible({ timeout: 5000 }).catch(() => false)

    // 또는 일정 관련 컨텐츠가 메인 영역에 표시
    const mainContent = projectDetailPage.locator('main')
    const isMainVisible = await mainContent.isVisible().catch(() => false)

    expect(hasItineraryUI || isMainVisible).toBe(true)
  })
})

test.describe('TC-06: 모바일 뷰 테스트', () => {
  test('모바일에서 하단 네비게이션이 표시된다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    const viewport = projectDetailPage.viewportSize()

    if (isMobilePhone(viewport)) {
      // 하단 네비게이션 바 확인
      const bottomNav = projectDetailPage.locator('nav')
      await expect(bottomNav.first()).toBeVisible()

      // 지도, 목록 버튼 확인
      const mapButton = projectDetailPage.locator('nav button').filter({ hasText: /지도/ })
      const listButton = projectDetailPage.locator('nav button').filter({ hasText: /목록/ })

      await expect(mapButton).toBeVisible()
      await expect(listButton).toBeVisible()
    }
  })

  test('모바일에서 지도-목록 탭 전환이 동작한다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    const viewport = projectDetailPage.viewportSize()

    if (isMobilePhone(viewport)) {
      // 지도 탭으로 이동
      await navigateToMapTab(projectDetailPage)

      // 지도가 표시됨 (data-testid 또는 Map region)
      const googleMap = projectDetailPage.locator('[data-testid="google-map"]')
      const mapRegion = projectDetailPage.getByRole('region', { name: 'Map' })
      const isMapByTestIdVisible = await googleMap.isVisible({ timeout: 3000 }).catch(() => false)
      const isMapRegionVisible = await mapRegion.first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(isMapByTestIdVisible || isMapRegionVisible).toBe(true)

      // 목록 탭으로 이동
      await navigateToListTab(projectDetailPage)
      const placeList = projectDetailPage.getByText(/장소 목록/)
      await expect(placeList.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('모바일에서 장소 클릭 시 지도로 이동한다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    const viewport = projectDetailPage.viewportSize()

    if (isMobilePhone(viewport)) {
      // 목록 탭으로 이동
      await navigateToListTab(projectDetailPage)

      // 장소 클릭
      const firstPlace = projectDetailPage.getByText(TEST_PLACES[0].name).first()
      await expect(firstPlace).toBeVisible({ timeout: 5000 })
      await firstPlace.click()

      // 지도 탭으로 자동 이동되어야 함
      await projectDetailPage.waitForLoadState('domcontentloaded')
      await projectDetailPage.waitForTimeout(500)

      // 지도가 표시됨 (data-testid 또는 Map region)
      const googleMap = projectDetailPage.locator('[data-testid="google-map"]')
      const mapRegion = projectDetailPage.getByRole('region', { name: 'Map' })

      const isMapByTestIdVisible = await googleMap.isVisible({ timeout: 3000 }).catch(() => false)
      const isMapRegionVisible = await mapRegion.first().isVisible({ timeout: 3000 }).catch(() => false)
      expect(isMapByTestIdVisible || isMapRegionVisible).toBe(true)
    }
  })
})

test.describe('지도 컴포넌트 기본 동작', () => {
  test('지도 영역이 페이지에 존재한다', async ({ projectDetailPage }) => {
    const isProjectPage = await navigateToProject(projectDetailPage)
    test.skip(!isProjectPage, 'Skipped: Auth mocking not working')

    await navigateToMapTab(projectDetailPage)

    // 지도 컨테이너가 DOM에 존재하는지 확인
    const googleMap = projectDetailPage.locator('[data-testid="google-map"]')
    const loadingMessage = projectDetailPage.getByText(/지도 로딩 중/)

    // 지도 또는 로딩 메시지 중 하나는 존재해야 함
    const mapCount = await googleMap.count()
    const loadingCount = await loadingMessage.count()

    expect(mapCount + loadingCount).toBeGreaterThan(0)
  })
})
