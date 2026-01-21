import { test, expect, TEST_PROJECT, TEST_PLACES, TEST_SHARE_TOKEN } from './fixtures/auth'

// Helper to check if viewport is mobile (< 1024px)
function isMobile(viewport: { width: number; height: number } | null): boolean {
  return viewport ? viewport.width < 1024 : false
}

// Helper to navigate to input section on mobile
async function navigateToInputOnMobile(page: any, viewport: any) {
  if (isMobile(viewport)) {
    const inputNavButton = page.locator('[data-testid="mobile-nav"] button').filter({ hasText: '추가' })
    if (await inputNavButton.isVisible().catch(() => false)) {
      await inputNavButton.click()
      // Wait for the view to switch
      await page.waitForTimeout(500)
    }
  }
}

// Helper to navigate to list section on mobile
async function navigateToListOnMobile(page: any, viewport: any) {
  if (isMobile(viewport)) {
    const listNavButton = page.locator('[data-testid="mobile-nav"] button').filter({ hasText: '목록' })
    if (await listNavButton.isVisible().catch(() => false)) {
      await listNavButton.click()
      // Wait for drawer animation to complete
      await page.waitForTimeout(500)
      // Wait for the sheet content to be visible
      await page.locator('[data-state="open"]').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
    }
  }
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

    // On mobile, need to open the place list drawer first
    await navigateToListOnMobile(projectDetailPage, viewport)

    await expect(projectDetailPage.getByText(/📍 장소 목록/)).toBeVisible()
  })

  test('장소 개수가 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToListOnMobile(projectDetailPage, viewport)

    await expect(projectDetailPage.getByText(`(${TEST_PLACES.length}개)`)).toBeVisible()
  })

  test('장소 이름들이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToListOnMobile(projectDetailPage, viewport)

    for (const place of TEST_PLACES) {
      await expect(projectDetailPage.getByText(place.name).first()).toBeVisible()
    }
  })

  test('카테고리 필터 버튼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToListOnMobile(projectDetailPage, viewport)

    await expect(projectDetailPage.getByRole('button', { name: /전체/ })).toBeVisible()
  })
})

test.describe('프로젝트 상세 페이지 - 입력 탭', () => {
  test('이미지 탭이 기본 선택되어 있다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputOnMobile(projectDetailPage, viewport)

    // On mobile, only the icon is shown without text
    const imageTab = isMobile(viewport)
      ? projectDetailPage.getByRole('button', { name: /📸/ })
      : projectDetailPage.getByRole('button', { name: /📸.*이미지/ })
    await expect(imageTab.first()).toBeVisible()
  })

  test('텍스트 탭이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputOnMobile(projectDetailPage, viewport)

    const textTab = isMobile(viewport)
      ? projectDetailPage.getByRole('button', { name: /📝/ })
      : projectDetailPage.getByRole('button', { name: /📝.*텍스트/ })
    await expect(textTab.first()).toBeVisible()
  })

  test('URL 탭이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputOnMobile(projectDetailPage, viewport)

    const urlTab = isMobile(viewport)
      ? projectDetailPage.getByRole('button', { name: /🔗/ })
      : projectDetailPage.getByRole('button', { name: /🔗.*URL/ })
    await expect(urlTab.first()).toBeVisible()
  })

  test('이미지 업로드 영역이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputOnMobile(projectDetailPage, viewport)

    await expect(projectDetailPage.getByText(/이미지를 드래그하거나 클릭/)).toBeVisible()
  })

  test('텍스트 탭 클릭 시 텍스트 입력 폼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputOnMobile(projectDetailPage, viewport)

    const textTab = isMobile(viewport)
      ? projectDetailPage.getByRole('button', { name: /📝/ })
      : projectDetailPage.getByRole('button', { name: /📝.*텍스트/ })
    await textTab.first().click()

    await expect(projectDetailPage.getByPlaceholder(/여행지 정보|장소 정보|텍스트/i)).toBeVisible()
  })

  test('URL 탭 클릭 시 URL 입력 폼이 표시된다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)
    const viewport = projectDetailPage.viewportSize()

    await navigateToInputOnMobile(projectDetailPage, viewport)

    const urlTab = isMobile(viewport)
      ? projectDetailPage.getByRole('button', { name: /🔗/ })
      : projectDetailPage.getByRole('button', { name: /🔗.*URL/ })
    await urlTab.first().click()

    await expect(projectDetailPage.getByPlaceholder(/URL|블로그|https/i)).toBeVisible()
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
    const viewport = projectDetailPage.viewportSize()

    // TEST_IMAGES에 pending 상태 이미지가 있음
    // On mobile, the button shows a compact version: "분석 (N)"
    // On desktop, it shows: "📸 이미지 분석 (N)"
    const analyzeButton = isMobile(viewport)
      ? projectDetailPage.getByRole('button', { name: /분석/ })
      : projectDetailPage.getByRole('button', { name: /📸.*이미지 분석/ })
    await expect(analyzeButton.first()).toBeVisible()
  })
})
