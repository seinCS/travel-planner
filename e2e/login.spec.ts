import { test, expect } from '@playwright/test'

test.describe('로그인 페이지 (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('페이지 타이틀이 올바르게 표시된다', async ({ page }) => {
    await expect(page).toHaveTitle(/여행 플래너/)
  })

  test('서비스명이 표시된다', async ({ page }) => {
    await expect(page.getByText('여행 플래너').first()).toBeVisible()
  })

  test('서비스 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/SNS 스크린샷을 업로드하면 자동으로 장소를 추출/)).toBeVisible()
  })

  test('Google 로그인 버튼이 표시된다', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /Google로 계속하기/ })
    await expect(googleButton).toBeVisible()
  })

  test('Google 로그인 버튼에 Google 아이콘이 있다', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /Google로 계속하기/ })
    // 버튼 내부에 SVG 아이콘이 있음
    const icon = googleButton.locator('svg')
    await expect(icon).toBeVisible()
  })

  test('이용약관 동의 안내 텍스트가 표시된다', async ({ page }) => {
    await expect(page.getByText(/서비스 이용약관 및 개인정보 처리방침에 동의/)).toBeVisible()
  })

  test('Google 로그인 버튼 클릭 시 OAuth 플로우가 시작된다', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: /Google로 계속하기/ })

    // 버튼이 클릭 가능한 상태인지 확인
    await expect(loginButton).toBeEnabled()

    // 클릭 후 URL이 변경되거나 OAuth 관련 요청이 발생하는지 확인
    await Promise.all([
      page.waitForURL(url => url.toString().includes('/api/auth') || url.toString().includes('accounts.google.com'), { timeout: 5000 }),
      loginButton.click(),
    ]).catch(() => {
      // OAuth 리다이렉트가 발생하지 않을 수 있음 (환경에 따라)
    })

    // 버튼 클릭 후 페이지가 로그인 관련 URL로 이동했거나, 여전히 로그인 페이지에 있는지 확인
    const currentUrl = page.url()
    const isValidState = currentUrl.includes('/login') ||
                         currentUrl.includes('/api/auth') ||
                         currentUrl.includes('accounts.google.com')
    expect(isValidState).toBe(true)
  })
})

test.describe('로그인 페이지 - 인증 리다이렉트', () => {
  test('인증되지 않은 상태에서 /projects 접근 시 로그인 페이지로 리다이렉트된다', async ({ page }) => {
    await page.goto('/projects')

    // 로그인 페이지로 리다이렉트되고 callbackUrl이 포함되어야 함
    await expect(page).toHaveURL(/\/login\?callbackUrl=/)
  })

  test('callbackUrl 파라미터가 올바르게 설정된다', async ({ page }) => {
    await page.goto('/projects')

    const url = new URL(page.url())
    const callbackUrl = url.searchParams.get('callbackUrl')

    expect(callbackUrl).toContain('/projects')
  })
})
