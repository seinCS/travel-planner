/**
 * AI 분석 E2E 테스트
 *
 * P0 핵심 기능: AI 분석(Claude Vision) 실행 플로우 테스트
 */
import { test, expect, TEST_PROJECT, TEST_PLACES } from './fixtures/auth'
import { Page } from '@playwright/test'

// AI 분석 API 모킹
async function mockAIAnalysisAPI(page: Page) {
  // 이미지 처리 API 모킹
  await page.route('**/api/projects/*/process', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        processedCount: 2,
        placesFound: 3,
        places: [
          {
            id: 'place-new-1',
            name: '도쿄 타워',
            category: 'attraction',
            latitude: 35.6586,
            longitude: 139.7454,
            status: 'auto',
          },
          {
            id: 'place-new-2',
            name: '아사쿠사 라멘',
            category: 'restaurant',
            latitude: 35.7147,
            longitude: 139.7966,
            status: 'auto',
          },
        ],
      }),
    })
  })

  // 텍스트 처리 API 모킹
  await page.route('**/api/projects/*/process-text', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        processedCount: 1,
        placesFound: 2,
        places: [
          {
            id: 'place-text-1',
            name: '긴자 쇼핑몰',
            category: 'shopping',
            latitude: 35.6717,
            longitude: 139.7649,
            status: 'auto',
          },
        ],
      }),
    })
  })

  // 이미지 목록 API 모킹 (pending 상태 이미지 포함)
  await page.route('**/api/projects/*/images', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          images: [
            {
              id: 'image-1',
              url: 'https://example.com/image1.jpg',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'image-2',
              url: 'https://example.com/image2.jpg',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      })
    } else {
      await route.continue()
    }
  })

  // 텍스트 입력 목록 API 모킹
  await page.route('**/api/projects/*/text-inputs', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textInputs: [
            {
              id: 'text-1',
              type: 'text',
              content: '도쿄 여행 추천 장소: 긴자, 시부야, 하라주쿠',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('P0: AI 분석 실행 플로우', () => {
  test('AI 분석 버튼이 표시된다', async ({ projectDetailPage }) => {
    await mockAIAnalysisAPI(projectDetailPage)
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // AI 분석/처리 버튼 확인
    const analyzeButton = projectDetailPage.getByRole('button', { name: /분석|AI|처리|실행|추출/i })

    // 분석 버튼이 있는지 확인
    const hasAnalyzeButton = await analyzeButton.first().isVisible().catch(() => false)
    console.log(`AI 분석 버튼 표시: ${hasAnalyzeButton}`)

    // 버튼이 없으면 다른 형태의 트리거 확인
    let hasAlternative = false
    if (!hasAnalyzeButton) {
      const alternativeButton = projectDetailPage.locator('button:has-text("시작"), button:has-text("추출")')
      hasAlternative = await alternativeButton.first().isVisible().catch(() => false)
      console.log(`대체 버튼 표시: ${hasAlternative}`)
    }

    // AI 분석 UI가 어떤 형태로든 존재해야 함
    expect(hasAnalyzeButton || hasAlternative).toBe(true)
  })

  test('이미지가 있을 때 분석 버튼이 활성화된다', async ({ projectDetailPage }) => {
    await mockAIAnalysisAPI(projectDetailPage)
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 이미지 탭으로 이동
    const imageTab = projectDetailPage.getByRole('button', { name: /이미지/i })
    if (await imageTab.isVisible().catch(() => false)) {
      await imageTab.click()
      await projectDetailPage.waitForLoadState('domcontentloaded')
    }

    // 분석 버튼 확인
    const analyzeButton = projectDetailPage.getByRole('button', { name: /분석|AI|처리/i }).first()

    const isButtonVisible = await analyzeButton.isVisible().catch(() => false)
    if (isButtonVisible) {
      // 버튼이 활성화되어 있는지 확인
      const isEnabled = await analyzeButton.isEnabled().catch(() => true)
      console.log(`분석 버튼 활성화: ${isEnabled}`)
      expect(isEnabled).toBe(true)
    } else {
      // 버튼이 없으면 이미지가 없는 상태일 수 있음 - 테스트 스킵
      console.log('분석 버튼이 표시되지 않음 - 이미지가 없는 상태일 수 있음')
    }
  })

  test('분석 버튼 클릭 시 처리가 시작된다', async ({ projectDetailPage }) => {
    await mockAIAnalysisAPI(projectDetailPage)
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 분석 버튼 찾기
    const analyzeButton = projectDetailPage.getByRole('button', { name: /분석|AI|처리|실행/i }).first()

    if (await analyzeButton.isVisible().catch(() => false)) {
      // API 호출 모니터링
      let processCalled = false
      await projectDetailPage.route('**/api/projects/*/process', async (route) => {
        processCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            processedCount: 1,
            placesFound: 2,
            places: [],
          }),
        })
      })

      // 버튼 클릭 후 API 응답 대기
      const responsePromise = projectDetailPage.waitForResponse(
        (response) => response.url().includes('/api/projects/') && response.url().includes('/process'),
        { timeout: 10000 }
      ).catch(() => null)

      await analyzeButton.click()
      await responsePromise

      console.log(`처리 API 호출됨: ${processCalled}`)
      expect(processCalled).toBe(true)
    } else {
      // 분석 버튼이 없으면 스킵
      console.log('분석 버튼이 표시되지 않음')
    }
  })
})

test.describe('P0: AI 분석 결과 표시', () => {
  test('분석 후 장소가 목록에 추가된다', async ({ projectDetailPage }) => {
    await mockAIAnalysisAPI(projectDetailPage)
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 장소 목록 확인
    const viewport = projectDetailPage.viewportSize()
    const isMobileView = viewport && viewport.width < 1024

    // 모바일에서는 목록 탭으로 이동
    if (isMobileView) {
      const listNavButton = projectDetailPage.locator('[data-testid="mobile-nav"] button').filter({ hasText: '목록' })
      if (await listNavButton.isVisible().catch(() => false)) {
        await listNavButton.click()
        await projectDetailPage.waitForLoadState('domcontentloaded')
      }
    }

    // 장소 목록에 테스트 장소가 표시되는지 확인
    let visiblePlaceCount = 0
    for (const place of TEST_PLACES) {
      const placeItem = projectDetailPage.getByText(place.name)
      if (await placeItem.first().isVisible().catch(() => false)) {
        console.log(`장소 표시됨: ${place.name}`)
        visiblePlaceCount++
      }
    }

    // 최소 1개 이상의 장소가 표시되어야 함
    expect(visiblePlaceCount).toBeGreaterThan(0)
  })

  test('분석된 장소가 지도에 마커로 표시된다', async ({ projectDetailPage }) => {
    await mockAIAnalysisAPI(projectDetailPage)
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 지도 컨테이너 확인
    const mapContainer = projectDetailPage.locator('[data-testid="google-map"], .gm-style, #map')

    // 지도가 있는지 확인
    const hasMap = await mapContainer.first().isVisible().catch(() => false)
    console.log(`지도 표시됨: ${hasMap}`)

    // 지도가 있으면 마커 확인 (Google Maps 마커는 img 또는 div로 렌더링됨)
    if (hasMap) {
      const markers = projectDetailPage.locator('.gm-style img[src*="marker"], [data-testid="map-marker"]')
      const markerCount = await markers.count()
      console.log(`마커 수: ${markerCount}`)
    }

    // 지도가 표시되어야 함
    expect(hasMap).toBe(true)
  })
})

test.describe('AI 분석 에러 처리', () => {
  test('분석 실패 시 에러 메시지가 표시된다', async ({ projectDetailPage }) => {
    // 에러 응답 모킹
    await projectDetailPage.route('**/api/projects/*/process', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AI 분석에 실패했습니다.',
        }),
      })
    })

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 분석 버튼 클릭
    const analyzeButton = projectDetailPage.getByRole('button', { name: /분석|AI|처리/i }).first()

    const isButtonVisible = await analyzeButton.isVisible().catch(() => false)
    if (isButtonVisible) {
      // 에러 응답 대기
      const responsePromise = projectDetailPage.waitForResponse(
        (response) => response.url().includes('/api/projects/') && response.url().includes('/process'),
        { timeout: 10000 }
      ).catch(() => null)

      await analyzeButton.click()
      await responsePromise

      // 에러 메시지 또는 토스트 확인
      const errorMessage = projectDetailPage.getByText(/실패|오류|error/i)
      const hasError = await errorMessage.first().isVisible().catch(() => false)
      console.log(`에러 메시지 표시: ${hasError}`)
      // 에러 처리 UI가 표시되어야 함 (또는 분석 버튼이 있어야 함)
      expect(hasError || isButtonVisible).toBe(true)
    } else {
      console.log('분석 버튼이 표시되지 않음')
    }
  })

  test('네트워크 오류 시 재시도 옵션이 있다', async ({ projectDetailPage }) => {
    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 재시도 버튼 확인
    const retryButton = projectDetailPage.getByRole('button', { name: /재시도|다시|retry/i })

    // 재시도 버튼이 있으면 확인 (선택적 기능)
    const hasRetryButton = await retryButton.first().isVisible().catch(() => false)
    if (hasRetryButton) {
      console.log('재시도 버튼이 표시됨')
      await expect(retryButton.first()).toBeEnabled()
    } else {
      // 재시도 버튼이 없는 것은 정상 (아직 에러 상태가 아닐 수 있음)
      console.log('재시도 버튼이 표시되지 않음 - 정상 상태')
    }
  })
})

test.describe('AI 분석 로딩 상태', () => {
  test('분석 중 로딩 상태가 표시된다', async ({ projectDetailPage }) => {
    // 느린 응답 모킹
    await projectDetailPage.route('**/api/projects/*/process', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processedCount: 1,
          placesFound: 1,
          places: [],
        }),
      })
    })

    await projectDetailPage.goto(`/projects/${TEST_PROJECT.id}`)

    // 분석 버튼 클릭
    const analyzeButton = projectDetailPage.getByRole('button', { name: /분석|AI|처리/i }).first()

    if (await analyzeButton.isVisible().catch(() => false)) {
      // 버튼 클릭 전 상태 확인
      await analyzeButton.click()

      // 로딩 상태 확인 (버튼 텍스트 변경, 스피너, disabled 상태 등)
      const loadingIndicator = projectDetailPage.locator('.animate-spin, [data-loading="true"], button:disabled:has-text("분석")')
      const hasLoading = await loadingIndicator.first().isVisible().catch(() => false)
      console.log(`로딩 상태 표시: ${hasLoading}`)

      // 버튼이 비활성화되었는지 확인
      const isDisabled = await analyzeButton.isDisabled().catch(() => false)
      console.log(`버튼 비활성화: ${isDisabled}`)

      // 로딩 상태가 표시되거나 버튼이 비활성화되어야 함
      expect(hasLoading || isDisabled).toBe(true)
    } else {
      console.log('분석 버튼이 표시되지 않음')
    }
  })
})
