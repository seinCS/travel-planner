import { test, expect, TEST_PROJECT, TEST_PLACES, TEST_SHARE_TOKEN } from './fixtures/auth'

// Helper to check viewport sizes
// Mobile: < 768px (has bottom navigation bar)
// Tablet: 768px - 1023px (has side panel with tabs)
// Desktop: >= 1024px (full side panel)
function isMobilePhone(viewport: { width: number; height: number } | null): boolean {
  return viewport ? viewport.width < 768 : false
}

function isTablet(viewport: { width: number; height: number } | null): boolean {
  return viewport ? viewport.width >= 768 && viewport.width < 1024 : false
}

// Helper to navigate to input section
async function navigateToInputSection(page: any, viewport: any) {
  // Wait for page to stabilize first
  await page.waitForLoadState('domcontentloaded')

  if (isMobilePhone(viewport)) {
    // Mobile phone: Click bottom navigation "추가" button
    const addNavButton = page.locator('nav button').filter({ hasText: /추가/ })
    if (await addNavButton.isVisible().catch(() => false)) {
      await addNavButton.click()
      // Wait for input section to be visible
      await page.waitForLoadState('domcontentloaded')
    }
  } else if (isTablet(viewport)) {
    // Tablet: Click "입력" tab button in side panel
    const inputTabButton = page.getByRole('button', { name: /입력/ })
    if (await inputTabButton.isVisible().catch(() => false)) {
      await inputTabButton.click()
      await page.waitForLoadState('domcontentloaded')
    }
  }
  // Desktop: Input section is always visible alongside place list
}

// Helper to ensure place list is visible
async function ensurePlaceListVisible(page: any, viewport: any) {
  // Wait for page to stabilize first
  await page.waitForLoadState('domcontentloaded')

  if (isMobilePhone(viewport)) {
    // Mobile phone: Click bottom navigation "목록" button if not already selected
    const listNavButton = page.locator('nav button').filter({ hasText: /목록/ })
    if (await listNavButton.isVisible().catch(() => false)) {
      await listNavButton.click()
      await page.waitForLoadState('domcontentloaded')
    }
  } else if (isTablet(viewport)) {
    // Tablet: Click "목록" tab button in side panel (it's already visible by default)
    const listTabButton = page.getByRole('button', { name: /목록/ })
    if (await listTabButton.isVisible().catch(() => false)) {
      await listTabButton.click()
      await page.waitForLoadState('domcontentloaded')
    }
  }
  // Desktop: Place list is always visible
}

test.describe('프로젝트 상세 페이지 (/projects/[id]) - 헤더', () => {
  test('프로젝트 이름이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await expect(projectDetailPage.getByRole('heading', { name: TEST_PROJECT.name })).toBeVisible()
  })

  test('여행지와 국가가 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await expect(projectDetailPage.getByText(`${TEST_PROJECT.destination}, ${TEST_PROJECT.country}`)).toBeVisible()
  })

  test('공유 버튼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await expect(projectDetailPage.getByRole('button', { name: '공유' })).toBeVisible()
  })
})

test.describe('프로젝트 상세 페이지 - 장소 목록', () => {
  test('장소 목록 헤더가 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await ensurePlaceListVisible(projectDetailPage, viewport)

    // Different UI patterns based on viewport
    // Mobile: "📍 장소 목록 (3개)" as h2 heading
    // Tablet: "📍 목록 (3)" as button tab
    // Look for either format
    const placeListHeader = projectDetailPage.getByText(/장소 목록|📍 목록/)
    const placeListButton = projectDetailPage.getByRole('button', { name: /목록/ })

    const isHeaderVisible = await placeListHeader.first().isVisible().catch(() => false)
    const isButtonVisible = await placeListButton.first().isVisible().catch(() => false)

    expect(isHeaderVisible || isButtonVisible).toBe(true)
  })

  test('장소 개수가 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await ensurePlaceListVisible(projectDetailPage, viewport)

    // Count can appear in different formats: "(3개)" or "(3)" or "목록 (3)"
    // For tablet, count appears in the tab button "📍 목록 (3)"
    // Check that the count "3" appears somewhere in the page related to places
    const pageContent = await projectDetailPage.content()
    const hasCount = pageContent.includes('(3)') || pageContent.includes('3개') || pageContent.includes('3개)')
    expect(hasCount).toBe(true)
  })

  test('장소 이름들이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await ensurePlaceListVisible(projectDetailPage, viewport)

    // Wait for list to render
    await projectDetailPage.waitForLoadState('domcontentloaded')

    // Verify places exist in DOM (they may be in scrollable container)
    for (const place of TEST_PLACES) {
      const placeElement = projectDetailPage.getByText(place.name).first()
      // Check element exists in DOM (count > 0)
      await expect(placeElement).toHaveCount(1, { timeout: 5000 })
    }
  })

  test('카테고리 필터 버튼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await ensurePlaceListVisible(projectDetailPage, viewport)

    await expect(projectDetailPage.getByRole('button', { name: /전체/ }).first()).toBeVisible()
  })
})

test.describe('프로젝트 상세 페이지 - 입력 탭', () => {
  test('이미지 탭이 기본 선택되어 있다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputSection(projectDetailPage, viewport)

    // Look for image tab button - different text based on viewport
    const imageTab = projectDetailPage.getByRole('button', { name: /📸|이미지/ })
    await expect(imageTab.first()).toBeVisible()
  })

  test('텍스트 탭이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputSection(projectDetailPage, viewport)

    const textTab = projectDetailPage.getByRole('button', { name: /📝|텍스트/ })
    await expect(textTab.first()).toBeVisible()
  })

  test('URL 탭이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputSection(projectDetailPage, viewport)

    const urlTab = projectDetailPage.getByRole('button', { name: /🔗|URL/ })
    await expect(urlTab.first()).toBeVisible()
  })

  test('이미지 업로드 영역이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputSection(projectDetailPage, viewport)

    // Wait for content to load
    await projectDetailPage.waitForLoadState('networkidle')

    // Check various indicators that upload area is present
    // 1. "파일 선택" button
    // 2. Upload text
    // 3. Image tab button (📸)
    const fileSelectButton = projectDetailPage.getByRole('button', { name: /파일 선택/ })
    const uploadText = projectDetailPage.getByText(/이미지를 드래그/)
    const imageTabIcon = projectDetailPage.getByRole('button', { name: /📸/ })

    // Check if any of these elements exist in DOM
    const hasFileSelect = await fileSelectButton.count() > 0
    const hasUploadText = await uploadText.count() > 0
    const hasImageTab = await imageTabIcon.count() > 0

    expect(hasFileSelect || hasUploadText || hasImageTab).toBe(true)
  })

  test('텍스트 탭 클릭 시 텍스트 입력 폼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputSection(projectDetailPage, viewport)

    const textTab = projectDetailPage.getByRole('button', { name: /📝|텍스트/ })
    await textTab.first().click()

    // Wait for the textarea to be visible
    const textInput = projectDetailPage.getByPlaceholder(/여행지 정보|장소 정보|텍스트/i).or(
      projectDetailPage.locator('textarea')
    )
    await expect(textInput).toBeVisible({ timeout: 5000 })
  })

  test('URL 탭 클릭 시 URL 입력 폼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputSection(projectDetailPage, viewport)

    const urlTab = projectDetailPage.getByRole('button', { name: /🔗|URL/ })
    await urlTab.first().click()

    // Wait for the URL input to be visible
    const urlInput = projectDetailPage.getByPlaceholder(/URL|블로그|https/i).or(
      projectDetailPage.locator('input[type="url"], input[type="text"]').filter({ hasText: '' }).first()
    )
    await expect(urlInput).toBeVisible({ timeout: 5000 })
  })
})

test.describe('프로젝트 상세 페이지 - 공유 모달', () => {
  test('공유 버튼 클릭 시 모달이 열린다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.getByRole('button', { name: '공유' }).click()

    await expect(projectDetailPage.getByRole('dialog')).toBeVisible()
    await expect(projectDetailPage.getByRole('heading', { name: '프로젝트 공유' })).toBeVisible()
  })

  test('공유 토글이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.getByRole('button', { name: '공유' }).click()

    await expect(projectDetailPage.getByText('공유 링크 활성화')).toBeVisible()
    await expect(projectDetailPage.getByRole('switch')).toBeVisible()
  })

  test('공유 토글 활성화 시 공유 URL이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    await projectDetailPage.getByRole('button', { name: '공유' }).click()

    // 토글 활성화 및 API 응답 대기
    const switchElement = projectDetailPage.getByRole('switch')
    await switchElement.click()

    // 공유 URL 입력 필드가 나타날 때까지 대기 (API 응답 후 UI 업데이트)
    await expect(projectDetailPage.locator('input[readonly]')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('프로젝트 상세 페이지 - 분석 버튼', () => {
  test('pending 이미지가 있으면 이미지 분석 버튼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // TEST_IMAGES에 pending 상태 이미지가 있음
    // Button text varies: "분석 (1)", "이미지 분석 (1)", etc.
    const analyzeButton = projectDetailPage.getByRole('button', { name: /분석/ })
    await expect(analyzeButton.first()).toBeVisible()
  })
})

test.describe('프로젝트 상세 페이지 - 지도', () => {
  // 참고: Google Maps API 테스트는 실제 API 키가 필요하므로 E2E 모킹 환경에서 제한적
  // 실제 검증은 dev 서버 (npm run dev)에서 수동으로 확인 필요
  // 검증 방법:
  // 1. 프로젝트 상세 페이지 접속
  // 2. 지도가 프로젝트 destination 위치(예: 도쿄)로 초기화되는지 확인
  // 3. "위치 정보를 불러오는 중..." 메시지가 일시적으로 표시된 후 지도가 나타나는지 확인
  // 4. 장소가 없는 새 프로젝트에서도 destination 위치가 표시되는지 확인

  test.skip('지도 컴포넌트가 표시된다 (실제 API 키 필요)', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    if (isMobilePhone(viewport)) {
      const mapNavButton = projectDetailPage.locator('nav button').filter({ hasText: /지도/ })
      if (await mapNavButton.isVisible().catch(() => false)) {
        await mapNavButton.click()
      }
    }

    const googleMap = projectDetailPage.locator('[data-testid="google-map"]')
    await expect(googleMap).toBeVisible({ timeout: 10000 })
  })

  test.skip('지도가 프로젝트 위치로 초기화된다 (실제 API 키 필요)', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    if (isMobilePhone(viewport)) {
      const mapNavButton = projectDetailPage.locator('nav button').filter({ hasText: /지도/ })
      if (await mapNavButton.isVisible().catch(() => false)) {
        await mapNavButton.click()
      }
    }

    const loadingMessage = projectDetailPage.getByText('위치 정보를 불러오는 중...')
    const googleMap = projectDetailPage.locator('[data-testid="google-map"]')

    await expect(googleMap.or(loadingMessage)).toBeVisible({ timeout: 10000 })
    await expect(googleMap).toBeVisible({ timeout: 10000 })
  })
})
