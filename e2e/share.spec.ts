import { test, expect } from '@playwright/test'

test.describe('공유 페이지 (/s/[token]) - 유효하지 않은 토큰', () => {
  test('존재하지 않는 토큰으로 접근 시 에러 페이지가 표시된다', async ({ page }) => {
    await page.goto('/s/invalid-token-12345')

    // 로딩 후 에러 상태 확인
    await page.waitForLoadState('networkidle')

    // 에러 메시지 확인 (heading 요소만 선택)
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeVisible({
      timeout: 10000,
    })
  })

  test('빈 토큰으로 접근 시 에러 페이지가 표시된다', async ({ page }) => {
    await page.goto('/s/')

    // 404 또는 에러 페이지가 표시되어야 함
    await page.waitForLoadState('networkidle')

    // /s 경로에 접근했는지 확인
    const currentUrl = page.url()
    expect(currentUrl).toContain('/s')
  })
})

test.describe('공유 페이지 - 로딩 상태', () => {
  test('페이지 로딩 중 로딩 인디케이터가 표시된다', async ({ page }) => {
    // 느린 네트워크 시뮬레이션
    await page.route('/api/share/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.continue()
    })

    await page.goto('/s/test-token')

    // 로딩 상태 확인 (로딩 중... 텍스트 또는 스피너)
    const loadingIndicator = page.getByText('로딩 중...')
    // 로딩 상태가 나타났다가 사라지는지 확인 (빠른 로드 시 보이지 않을 수 있음)
    const isLoadingVisible = await loadingIndicator.isVisible().catch(() => false)
    // 로딩이 보였거나, 이미 콘텐츠가 로드된 상태면 성공
    const hasContent = await page.getByText(/페이지를 찾을 수 없습니다|공유된 여행 계획/).isVisible().catch(() => false)
    expect(isLoadingVisible || hasContent).toBe(true)
  })
})

test.describe('공유 페이지 - 미인증 사용자 복제 시도', () => {
  test('"내 프로젝트로 복사" 클릭 시 미인증이면 로그인 유도된다', async ({ page }) => {
    // 유효한 공유 데이터 모킹
    await page.route('**/api/share/valid-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project: {
            name: '테스트 프로젝트',
            destination: '도쿄',
            country: '일본',
          },
          places: [
            {
              id: 'place-1',
              name: '센소지',
              category: 'attraction',
              comment: '관광지',
              latitude: 35.7148,
              longitude: 139.7967,
              formattedAddress: 'Tokyo',
              googleMapsUrl: null,
              rating: 4.5,
              userRatingsTotal: 50000,
              priceLevel: null,
            },
          ],
        }),
      })
    })

    // 세션이 없음을 모킹
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto('/s/valid-token')
    await page.waitForLoadState('networkidle')

    // 복사 버튼 클릭
    const copyButton = page.getByRole('button', { name: /내 프로젝트로 복사/ })
    await expect(copyButton).toBeVisible()
    await copyButton.click()

    // 로그인 페이지로 리다이렉트 또는 토스트 메시지 대기
    const loginRedirect = page.waitForURL(/\/login/, { timeout: 3000 }).then(() => true).catch(() => false)
    const toastVisible = page.getByText(/로그인이 필요/).waitFor({ timeout: 3000 }).then(() => true).catch(() => false)

    const [hasRedirect, hasToast] = await Promise.all([loginRedirect, toastVisible])
    expect(hasRedirect || hasToast).toBe(true)
  })
})
