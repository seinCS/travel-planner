import { test, expect } from '@playwright/test'

test.describe('프로젝트 목록 페이지 (/projects) - 미인증 상태', () => {
  test('미인증 접근 시 로그인 페이지로 리다이렉트된다', async ({ page }) => {
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/login/)
  })

  test('리다이렉트 시 callbackUrl이 포함된다', async ({ page }) => {
    await page.goto('/projects')

    const url = new URL(page.url())
    const callbackUrl = url.searchParams.get('callbackUrl')
    expect(callbackUrl).toContain('/projects')
  })
})

test.describe('프로젝트 상세 페이지 (/projects/[id]) - 미인증 상태', () => {
  test('미인증 접근 시 로그인 페이지로 리다이렉트된다', async ({ page }) => {
    await page.goto('/projects/some-project-id')
    await expect(page).toHaveURL(/\/login/)
  })
})
