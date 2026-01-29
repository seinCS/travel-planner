/**
 * Playwright Auth Fixture
 *
 * E2E 테스트에서 인증된 상태로 테스트를 실행하기 위한 fixture입니다.
 *
 * 인증 방식:
 * - globalSetup에서 chromium으로 로그인 후 storageState 파일(.auth/storage-state.json)에 저장
 * - playwright.config.ts에서 모든 프로젝트에 storageState 설정
 * - 이 fixture는 storageState가 이미 로드된 상태에서 페이지를 제공
 */
import { test as base, expect, Page } from '@playwright/test'

// 테스트 상수
export const TEST_PROJECT_ID = 'e2e-test-project-id'
export const TEST_USER = {
  id: 'e2e-test-user-id',
  email: 'e2e-test@example.com',
  name: 'E2E Test User',
}

// Auth fixture 타입 정의
type AuthFixtures = {
  authenticatedPage: Page
  testProjectId: string
}

/**
 * 인증된 페이지를 제공하는 fixture
 *
 * 주의:
 * - globalSetup에서 테스트 데이터가 미리 생성됩니다.
 * - storageState가 playwright.config.ts에서 설정되어 있어 모든 브라우저에서 인증 상태가 유지됩니다.
 * - storageState가 없는 경우에만 test-login API를 호출합니다 (fallback).
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, context }, use) => {
    // storageState가 이미 설정되어 있는지 확인 (쿠키 존재 여부로 판단)
    const cookies = await context.cookies()
    const hasAuthCookie = cookies.some(
      cookie => cookie.name.includes('next-auth') || cookie.name.includes('session')
    )

    // storageState가 없는 경우에만 test-login API 호출 (fallback)
    if (!hasAuthCookie) {
      console.log('No auth cookie found, calling test-login API as fallback...')
      const loginResponse = await page.request.post('/api/auth/test-login')

      if (!loginResponse.ok()) {
        const errorText = await loginResponse.text()
        // E2E_TEST_MODE가 비활성화된 경우 스킵
        if (errorText.includes('only available in E2E test mode')) {
          test.skip(true, 'E2E_TEST_MODE is not enabled')
        }
        throw new Error(`Test login failed: ${errorText}`)
      }
    }

    // 인증된 페이지 제공
    await use(page)
  },

  testProjectId: async ({}, use) => {
    await use(TEST_PROJECT_ID)
  },
})

export { expect }

/**
 * 헬퍼 함수: 프로젝트 상세 페이지로 이동
 */
export async function goToProjectPage(page: Page, projectId: string = TEST_PROJECT_ID) {
  await page.goto(`/projects/${projectId}`)

  // 로딩 스피너가 사라질 때까지 대기 (최대 30초)
  await page.waitForFunction(
    () => {
      const loadingText = document.body.innerText
      return !loadingText.includes('로딩 중') && !loadingText.includes('Loading')
    },
    { timeout: 30000 }
  ).catch(() => {
    // 로딩 텍스트가 없으면 계속 진행
  })

  // 실제 콘텐츠가 로드될 때까지 대기 (탭 버튼 또는 프로젝트 제목)
  await page.waitForSelector('button:has-text("장소"), button:has-text("일정"), h1', {
    timeout: 15000,
  }).catch(() => {
    // 선택자를 찾지 못해도 계속 진행
  })

  // 네트워크 안정화 대기
  await page.waitForLoadState('networkidle')
}

/**
 * 헬퍼 함수: 일정 탭으로 이동
 */
export async function goToItineraryTab(page: Page) {
  // 일정 탭 클릭 (여러 가능한 선택자 시도)
  const itineraryTab = page.locator('button, [role="tab"]').filter({ hasText: /일정|Itinerary/i }).first()
  if (await itineraryTab.isVisible()) {
    await itineraryTab.click()
  }
  // 탭 전환 대기
  await page.waitForTimeout(500)
}

/**
 * 헬퍼 함수: 항공편 섹션 열기
 * Desktop에서만 표시되는 ResourceSection 내 Collapsible 열기
 */
export async function openFlightSection(page: Page) {
  // CollapsibleTrigger: "▶ ✈️ 항공편" 또는 "▼ ✈️ 항공편" 버튼
  const flightTrigger = page.locator('button').filter({ hasText: /✈️\s*항공편/ }).first()

  if (await flightTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
    // 이미 펼쳐져 있는지 확인 (▼ 포함 여부)
    const text = await flightTrigger.textContent()
    if (text?.includes('▶')) {
      await flightTrigger.click()
      // 섹션 열림 대기
      await page.waitForTimeout(300)
    }
  }
}

/**
 * 헬퍼 함수: 항공편 추가 모달 열기
 * 항공편 섹션의 "+ 추가" 버튼 클릭
 */
export async function openFlightAddModal(page: Page) {
  // 페이지 구조 (error-context.md에서 확인):
  // generic [ref=e185]:
  //   - button "▶ ✈️ 항공편" [ref=e186]
  //   - button "+ 추가" [ref=e190]  <- 이 버튼을 클릭해야 함
  // generic [ref=e192]:
  //   - button "▶ 🏨 숙소" [ref=e193]
  //   - button "+ 추가" [ref=e197]

  // 항공편 섹션 영역을 정확히 찾아서 그 안의 "+ 추가" 버튼 클릭
  // 방법: "✈️ 항공편" 버튼의 형제 버튼 중 "+ 추가" 찾기

  // 항공편 섹션의 "+ 추가" 버튼을 직접 찾기
  // "✈️ 항공편"을 포함하는 div(부모)의 형제인 button "+ 추가"
  const flightSection = page.locator('div').filter({
    has: page.locator('button').filter({ hasText: /✈️\s*항공편/ })
  }).first()

  // 해당 섹션 내의 "+ 추가" 버튼 찾기
  const flightAddBtn = flightSection.locator('button').filter({ hasText: /^\+\s*추가$/ }).first()

  // 버튼이 보일 때까지 명시적으로 대기
  try {
    await flightAddBtn.waitFor({ state: 'visible', timeout: 5000 })
    await flightAddBtn.click()
    // 모달 열림 대기
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
  } catch (e) {
    // 실패 시 fallback: 모든 "+ 추가" 버튼 중 첫 번째 클릭
    console.log('Primary method failed, trying fallback...')
    const allAddBtns = page.locator('button').filter({ hasText: /^\+\s*추가$/ })
    const firstAddBtn = allAddBtns.first()
    await firstAddBtn.waitFor({ state: 'visible', timeout: 3000 })
    await firstAddBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
  }
}
