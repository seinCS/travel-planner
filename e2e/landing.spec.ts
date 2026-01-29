import { test, expect } from '@playwright/test'

/**
 * 랜딩 페이지 E2E 테스트
 *
 * 2026-01 리디자인 반영:
 * - 4개 feature 카드 (기존 3개 → 4개)
 * - How It Works, Social Proof, Collaboration 섹션 추가
 * - Lucide 아이콘 시스템 적용
 */
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
    const loginButton = page.locator('header').getByRole('link', { name: '로그인' })
    await expect(loginButton).toBeVisible()
  })

  test('로그인 버튼 클릭 시 로그인 페이지로 이동한다', async ({ page }) => {
    await page.locator('header').getByRole('link', { name: '로그인' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('히어로 섹션 텍스트가 표시된다', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /SNS 스크린샷으로[\s\S]*여행 계획[\s\S]*한번에/ })).toBeVisible()
  })

  test('서비스 설명 텍스트가 표시된다', async ({ page }) => {
    await expect(page.getByText(/인스타그램, 유튜브, X에서 캡처한/)).toBeVisible()
  })

  test('"무료로 시작하기" CTA 버튼이 표시된다', async ({ page }) => {
    const ctaButton = page.getByRole('link', { name: '무료로 시작하기' })
    await expect(ctaButton).toBeVisible()
  })

  test('"무료로 시작하기" 버튼 클릭 시 로그인 페이지로 이동한다', async ({ page }) => {
    await page.getByRole('link', { name: '무료로 시작하기' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('기능 소개 카드 4개가 표시된다', async ({ page }) => {
    const featureSection = page.locator('section').filter({ hasText: '여행 계획의 모든 것' })

    await expect(featureSection.locator('h4').filter({ hasText: '스크린샷 업로드' })).toBeVisible()
    await expect(featureSection.locator('h4').filter({ hasText: 'AI 자동 추출' })).toBeVisible()
    await expect(featureSection.locator('h4').filter({ hasText: '지도 시각화' })).toBeVisible()
    await expect(featureSection.locator('h4').filter({ hasText: '일정 관리 & 공유' })).toBeVisible()
  })

  test('스크린샷 업로드 기능 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/드래그앤드롭으로 간편하게 업로드/)).toBeVisible()
  })

  test('AI 자동 추출 기능 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/Claude AI가 자동 추출/)).toBeVisible()
  })

  test('지도 시각화 기능 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/Google Maps에 핀으로 표시/)).toBeVisible()
  })

  test('일정 관리 기능 설명이 표시된다', async ({ page }) => {
    await expect(page.getByText(/그룹과 함께 협업/)).toBeVisible()
  })

  test('How It Works 섹션이 표시된다', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '3단계로 완성하는 여행 계획' })).toBeVisible()
  })

  test('Social Proof 섹션 통계가 표시된다', async ({ page }) => {
    await expect(page.getByText('1,000+')).toBeVisible()
    await expect(page.getByText('5,000+')).toBeVisible()
  })

  test('Footer가 표시된다', async ({ page }) => {
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: /GitHub/ })).toBeVisible()
  })
})
