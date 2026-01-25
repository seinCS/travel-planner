/**
 * E2E 테스트 유틸리티 함수
 *
 * waitForTimeout() anti-pattern을 대체하는 명시적 대기 함수들
 */
import { Page, Locator, expect } from '@playwright/test'

/**
 * 페이지 로드가 완료될 때까지 대기
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
}

/**
 * 네트워크 요청이 완료될 때까지 대기
 */
export async function waitForNetworkIdle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

/**
 * 요소가 표시될 때까지 대기
 */
export async function waitForElement(
  locator: Locator,
  options: { timeout?: number } = {}
): Promise<void> {
  await expect(locator).toBeVisible({ timeout: options.timeout ?? 5000 })
}

/**
 * 탭 전환 후 콘텐츠가 표시될 때까지 대기
 */
export async function switchToTab(
  tabButton: Locator,
  expectedContent: Locator,
  options: { timeout?: number } = {}
): Promise<void> {
  await tabButton.click()
  await expect(expectedContent).toBeVisible({ timeout: options.timeout ?? 3000 })
}

/**
 * 모달/다이얼로그가 열릴 때까지 대기
 */
export async function waitForModal(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  await expect(page.locator('[role="dialog"]')).toBeVisible({
    timeout: options.timeout ?? 5000,
  })
}

/**
 * 뷰포트 크기에 따른 모바일/태블릿/데스크톱 판별
 */
export function getViewportType(
  viewport: { width: number; height: number } | null
): 'mobile' | 'tablet' | 'desktop' {
  if (!viewport) return 'desktop'
  if (viewport.width < 640) return 'mobile'
  if (viewport.width < 1024) return 'tablet'
  return 'desktop'
}

/**
 * 뷰포트에 따라 입력 섹션으로 이동
 */
export async function navigateToInputSection(page: Page): Promise<void> {
  const viewport = page.viewportSize()
  const viewportType = getViewportType(viewport)

  if (viewportType === 'mobile') {
    // 모바일: 바텀 네비게이션의 "추가" 버튼 클릭
    const addNavButton = page.locator('nav button').filter({ hasText: /추가/ })
    if (await addNavButton.isVisible().catch(() => false)) {
      await addNavButton.click()
      await expect(
        page.getByRole('button', { name: /이미지|📸/ })
      ).toBeVisible({ timeout: 3000 })
    }
  } else if (viewportType === 'tablet') {
    // 태블릿: "입력" 탭 버튼 클릭
    const inputTabButton = page.getByRole('button', { name: /입력/ })
    if (await inputTabButton.isVisible().catch(() => false)) {
      await inputTabButton.click()
      await expect(
        page.getByRole('button', { name: /이미지|📸/ })
      ).toBeVisible({ timeout: 3000 })
    }
  }
  // 데스크톱: 이미 표시됨
}

/**
 * 뷰포트에 따라 장소 목록이 표시되도록 이동
 */
export async function ensurePlaceListVisible(page: Page): Promise<void> {
  const viewport = page.viewportSize()
  const viewportType = getViewportType(viewport)

  if (viewportType === 'mobile') {
    const listNavButton = page
      .locator('[data-testid="mobile-nav"] button, nav button')
      .filter({ hasText: /목록/ })
    if (await listNavButton.isVisible().catch(() => false)) {
      await listNavButton.click()
      // 목록이 표시될 때까지 대기
      await page.waitForLoadState('domcontentloaded')
    }
  }
}

/**
 * API 응답 대기
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number } = {}
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      if (typeof urlPattern === 'string') {
        return response.url().includes(urlPattern)
      }
      return urlPattern.test(response.url())
    },
    { timeout: options.timeout ?? 10000 }
  )
}

/**
 * 요소가 안정화될 때까지 대기 (애니메이션 완료)
 */
export async function waitForElementStable(
  locator: Locator,
  options: { timeout?: number } = {}
): Promise<void> {
  // 요소가 표시되고 위치가 안정화될 때까지 대기
  await expect(locator).toBeVisible({ timeout: options.timeout ?? 5000 })

  // 짧은 안정화 대기 (애니메이션 완료)
  await locator.evaluate((el) => {
    return new Promise<void>((resolve) => {
      if ('getAnimations' in el) {
        const animations = (el as Element & { getAnimations(): Animation[] }).getAnimations()
        if (animations.length === 0) {
          resolve()
          return
        }
        Promise.all(animations.map((a) => a.finished)).then(() => resolve())
      } else {
        resolve()
      }
    })
  })
}
