/**
 * 공유 페이지 모바일 UI E2E 테스트
 *
 * 요구사항 문서: docs/workflow_share_page_mobile_ui.md
 * - Phase 5: E2E 테스트 작성
 * - 브레이크포인트별 레이아웃 검증
 * - 탭 전환 테스트
 * - 상세 패널 동작 검증
 */
import { test, expect, Page } from '@playwright/test'

// 뷰포트 정의
const VIEWPORTS = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone14Pro: { width: 393, height: 852 },
  iPadMini: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
}

// 테스트용 공유 데이터
const MOCK_SHARE_DATA = {
  project: {
    name: '도쿄 여행 2026',
    destination: '도쿄',
    country: '일본',
  },
  places: [
    {
      id: 'place-1',
      name: '센소지',
      category: 'attraction',
      comment: '도쿄의 대표적인 관광지',
      latitude: 35.7148,
      longitude: 139.7967,
      formattedAddress: '2-chōme-3-1 Asakusa, Taito City, Tokyo',
      googleMapsUrl: 'https://maps.google.com/?cid=123',
      rating: 4.5,
      userRatingsTotal: 50000,
      priceLevel: null,
    },
    {
      id: 'place-2',
      name: '이치란 라멘',
      category: 'restaurant',
      comment: '유명한 라멘 체인',
      latitude: 35.6595,
      longitude: 139.7004,
      formattedAddress: '1-22-7 Jinnan, Shibuya City, Tokyo',
      googleMapsUrl: 'https://maps.google.com/?cid=456',
      rating: 4.2,
      userRatingsTotal: 10000,
      priceLevel: 2,
    },
    {
      id: 'place-3',
      name: '블루보틀 커피',
      category: 'cafe',
      comment: '분위기 좋은 카페',
      latitude: 35.6612,
      longitude: 139.7054,
      formattedAddress: '1-6-6 Aobadai, Meguro City, Tokyo',
      googleMapsUrl: 'https://maps.google.com/?cid=789',
      rating: 4.3,
      userRatingsTotal: 3000,
      priceLevel: 2,
    },
  ],
}

const VALID_TOKEN = 'test-share-token-mobile'

// API 모킹 헬퍼
async function mockShareAPI(page: Page) {
  await page.route(`**/api/share/${VALID_TOKEN}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SHARE_DATA),
    })
  })

  // 세션 없음 (비로그인 상태)
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  // Google Maps API 스텁
  await page.route('**/maps.googleapis.com/**', async (route) => {
    await route.fulfill({ status: 200, body: '' })
  })
}

test.describe('공유 페이지 모바일 UI - 레이아웃 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await mockShareAPI(page)
  })

  test('모바일에서 3탭 네비게이션 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 모바일 네비게이션이 표시되어야 함
    const mobileNav = page.getByTestId('mobile-nav')
    await expect(mobileNav).toBeVisible()

    // 3탭 표시 (지도, 목록, 일정) - Phase 7에서 일정 탭 추가됨
    await expect(page.getByRole('button', { name: /지도/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /목록/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /일정/ })).toBeVisible()

    // '추가' 탭은 공유 페이지에서 표시되지 않아야 함
    await expect(page.getByRole('button', { name: /추가/ })).not.toBeVisible()
  })

  test('iPhone 14 Pro에서 3탭 네비게이션 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhone14Pro)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    const mobileNav = page.getByTestId('mobile-nav')
    await expect(mobileNav).toBeVisible()

    // 3탭 표시 (지도, 목록, 일정) - Phase 7에서 일정 탭 추가됨
    const tabs = mobileNav.getByRole('button')
    await expect(tabs).toHaveCount(3)
  })

  test('태블릿에서 2컬럼 레이아웃', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPadMini)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 모바일 네비게이션은 숨겨져야 함
    const mobileNav = page.getByTestId('mobile-nav')
    await expect(mobileNav).not.toBeVisible()

    // 지도와 목록이 동시에 표시
    const placeList = page.getByTestId('place-list')
    await expect(placeList).toBeVisible()
  })

  test('데스크톱에서 2컬럼 레이아웃', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 모바일 네비게이션은 숨겨져야 함
    const mobileNav = page.getByTestId('mobile-nav')
    await expect(mobileNav).not.toBeVisible()

    // 지도와 목록이 동시에 표시
    const placeList = page.getByTestId('place-list')
    await expect(placeList).toBeVisible()
  })
})

test.describe('공유 페이지 모바일 UI - 탭 전환 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await mockShareAPI(page)
  })

  test('모바일에서 지도/목록 탭 전환', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 기본: 지도 탭 활성
    const mapTab = page.getByRole('button', { name: /지도/ })
    const listTab = page.getByRole('button', { name: /목록/ })

    // 지도 탭이 활성화되어 있어야 함 (기본값)
    await expect(mapTab).toHaveClass(/bg-blue-50/)

    // 목록 탭 클릭
    await listTab.click()

    // 목록 탭이 활성화됨
    await expect(listTab).toHaveClass(/bg-blue-50/, { timeout: 3000 })

    // 장소 목록이 표시됨 (모바일/데스크톱 두 개가 있으므로 first() 사용)
    const placeList = page.getByTestId('place-list').first()
    await expect(placeList).toBeVisible()

    // 지도 탭 클릭
    await mapTab.click()

    // 지도 탭이 다시 활성화됨
    await expect(mapTab).toHaveClass(/bg-blue-50/)
  })

  test('목록 탭에서 장소 목록이 올바르게 표시됨', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 목록 탭으로 전환
    await page.getByRole('button', { name: /목록/ }).click()
    await page.waitForLoadState('domcontentloaded')

    // 모든 장소가 표시되어야 함
    for (const place of MOCK_SHARE_DATA.places) {
      await expect(page.getByText(place.name).first()).toBeVisible()
    }
  })
})

test.describe('공유 페이지 모바일 UI - 상세 패널 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await mockShareAPI(page)

    // Place Details API 모킹
    await page.route('**/api/places/*/details**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          formattedAddress: '2-chōme-3-1 Asakusa, Taito City, Tokyo',
          rating: 4.5,
          userRatingsTotal: 50000,
          openingHours: {
            weekdayText: ['월요일: 06:00 ~ 17:00'],
            openNow: true,
          },
          photos: [],
          reviews: [],
        }),
      })
    })
  })

  test('모바일에서 Bottom Sheet 열림', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 목록 탭으로 전환
    await page.getByRole('button', { name: /목록/ }).click()
    await page.waitForLoadState('domcontentloaded')

    // 첫 번째 장소의 상세 버튼 클릭
    const detailBtn = page.getByTestId('place-detail-btn').first()
    await expect(detailBtn).toBeVisible()
    await detailBtn.click()

    // Bottom Sheet (dialog) 확인
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // "장소 상세" 제목 확인
    await expect(page.getByText('장소 상세')).toBeVisible()
  })

  test('데스크톱에서 사이드 패널 열림', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 첫 번째 장소의 상세 버튼 클릭
    const detailBtn = page.getByTestId('place-detail-btn').first()
    await expect(detailBtn).toBeVisible()
    await detailBtn.click()

    // 사이드 패널 확인 (fixed right-0)
    const sidePanel = page.locator('.fixed.right-0.top-0.bottom-0')
    await expect(sidePanel).toBeVisible({ timeout: 5000 })
  })
})

test.describe('공유 페이지 모바일 UI - 복사 기능 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await mockShareAPI(page)
  })

  test('모바일에서 복사 버튼 축소 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 복사 버튼 확인 (축소된 텍스트)
    const copyBtn = page.getByRole('button', { name: /복사/ })
    await expect(copyBtn).toBeVisible()

    // "내 프로젝트로 복사" 전체 텍스트는 숨겨져야 함
    const fullText = page.getByText('내 프로젝트로 복사')
    await expect(fullText).not.toBeVisible()
  })

  test('데스크톱에서 전체 텍스트 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 전체 텍스트가 표시되어야 함
    const copyBtn = page.getByRole('button', { name: /내 프로젝트로 복사/ })
    await expect(copyBtn).toBeVisible()
  })

  test('공유 배지가 데스크톱에서만 표시', async ({ page }) => {
    // 모바일에서 숨김
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    const shareBadge = page.getByText('공유된 여행 계획')
    await expect(shareBadge).not.toBeVisible()

    // 데스크톱에서 표시
    await page.setViewportSize(VIEWPORTS.desktop)
    await page.waitForLoadState('domcontentloaded')

    await expect(shareBadge).toBeVisible()
  })
})

test.describe('공유 페이지 모바일 UI - 카테고리 필터 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await mockShareAPI(page)
  })

  test('카테고리 필터가 가로 스크롤 가능', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 목록 탭으로 전환
    await page.getByRole('button', { name: /목록/ }).click()
    await page.waitForLoadState('domcontentloaded')

    // 전체 버튼 확인
    const allButton = page.getByRole('button', { name: /전체/ })
    await expect(allButton).toBeVisible()

    // 필터 컨테이너가 overflow-x-auto 클래스를 가지는지 확인
    const filterContainer = page.locator('.overflow-x-auto').first()
    await expect(filterContainer).toBeVisible()
  })

  test('카테고리 필터 버튼이 터치 가능한 크기', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 목록 탭으로 전환
    await page.getByRole('button', { name: /목록/ }).click()
    await page.waitForLoadState('domcontentloaded')

    // 전체 버튼의 크기 확인
    const allButton = page.getByRole('button', { name: /전체/ })
    const box = await allButton.boundingBox()

    if (box) {
      // 최소 36px (h-9) 높이 확인
      expect(box.height).toBeGreaterThanOrEqual(36)
    }
  })
})

test.describe('공유 페이지 모바일 UI - 헤더 반응형 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await mockShareAPI(page)
  })

  test('프로젝트 이름이 truncate 처리됨', async ({ page }) => {
    // 긴 이름으로 테스트
    const longNameData = {
      ...MOCK_SHARE_DATA,
      project: {
        ...MOCK_SHARE_DATA.project,
        name: '매우 긴 프로젝트 이름이 들어가는 도쿄 여행 2026 계획서',
      },
    }

    await page.route(`**/api/share/${VALID_TOKEN}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(longNameData),
      })
    })

    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    // 제목이 truncate 클래스를 가지는지 확인
    const title = page.locator('h1.truncate')
    await expect(title).toBeVisible()
  })

  test('헤더 높이가 적절함', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE)
    await page.goto(`/s/${VALID_TOKEN}`)
    await page.waitForLoadState('networkidle')

    const header = page.locator('header')
    const box = await header.boundingBox()

    if (box) {
      // 헤더가 너무 크지 않아야 함 (모바일에서 py-3 = 12px * 2 + 콘텐츠)
      expect(box.height).toBeLessThan(120)
      expect(box.height).toBeGreaterThan(50)
    }
  })
})
