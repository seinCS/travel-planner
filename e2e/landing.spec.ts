import { test, expect } from '@playwright/test'

test.describe('랜딩 페이지 (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('페이지 타이틀이 올바르게 표시된다', async ({ page }) => {
    await expect(page).toHaveTitle(/여행 플래너/)
  })

  test('헤더에 서비스 이름이 표시된다', async ({ page }) => {
    const header = page.locator('header')
    await expect(header.getByRole('heading', { name: '여행 플래너' })).toBeVisible()
  })

  test('헤더에 로그인 버튼이 표시된다', async ({ page }) => {
    const loginButton = page.locator('header').getByRole('button', { name: '로그인' })
    await expect(loginButton).toBeVisible()
  })

  test('로그인 버튼 클릭 시 로그인 페이지로 이동한다', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: '로그인' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('히어로 섹션 텍스트가 표시된다', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /SNS 스크린샷으로.*여행 계획을 한번에/s })).toBeVisible()
  })

  test('서비스 설명 텍스트가 표시된다', async ({ page }) => {
    await expect(page.getByText(/인스타그램, 유튜브, X에서 캡처한/)).toBeVisible()
  })

  test('"무료로 시작하기" CTA 버튼이 표시된다', async ({ page }) => {
    const ctaButton = page.getByRole('button', { name: '무료로 시작하기' })
    await expect(ctaButton).toBeVisible()
  })

  test('"무료로 시작하기" 버튼 클릭 시 로그인 페이지로 이동한다', async ({ page }) => {
    await page.getByRole('link', { name: '무료로 시작하기' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('기능 소개 카드 3개가 표시된다', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '스크린샷 업로드' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'AI 자동 추출' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '지도 시각화' })).toBeVisible()
  })

  test('스크린샷 업로드 기능 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/드래그앤드롭으로 간편하게 업로드/)).toBeVisible()
  })

  test('AI 자동 추출 기능 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/장소명, 카테고리, 설명을 자동으로 추출/)).toBeVisible()
  })

  test('지도 시각화 기능 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/Google Maps에 핀으로 표시/)).toBeVisible()
  })
})
