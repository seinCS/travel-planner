import { test as base, Page } from '@playwright/test'

// 테스트용 사용자 데이터
export const TEST_USER = {
  id: 'test-user-id-12345',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/avatar.png',
}

// 테스트용 프로젝트 데이터
export const TEST_PROJECT = {
  id: 'test-project-id-12345',
  name: '도쿄 여행 2026',
  destination: '도쿄',
  country: '일본',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: {
    places: 3,
    images: 5,
  },
}

// 테스트용 장소 데이터
export const TEST_PLACES = [
  {
    id: 'place-1',
    name: '센소지',
    category: 'attraction',
    comment: '도쿄의 대표적인 관광지',
    latitude: 35.7148,
    longitude: 139.7967,
    status: 'confirmed',
    googlePlaceId: 'ChIJ8T1GpMGOGGARDYGSgpooDWw',
    formattedAddress: '2-chōme-3-1 Asakusa, Taito City, Tokyo 111-0032',
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
    status: 'confirmed',
    googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
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
    comment: '아오야마점',
    latitude: 35.6654,
    longitude: 139.7119,
    status: 'confirmed',
    googlePlaceId: 'ChIJGaK-SZKLGGARKtSMohnj1K',
    formattedAddress: '3-13-14 Minamiaoyama, Minato City, Tokyo',
    googleMapsUrl: 'https://maps.google.com/?cid=789',
    rating: 4.3,
    userRatingsTotal: 5000,
    priceLevel: 2,
  },
]

// 테스트용 이미지 데이터
export const TEST_IMAGES = [
  {
    id: 'image-1',
    url: 'https://example.com/image1.jpg',
    status: 'processed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'image-2',
    url: 'https://example.com/image2.jpg',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
]

// 공유 토큰
export const TEST_SHARE_TOKEN = 'test-share-token-abc123'

// 세션 모킹 - NextAuth의 /api/auth/session 엔드포인트를 모킹
async function mockAuthSession(page: Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: TEST_USER.id,
          name: TEST_USER.name,
          email: TEST_USER.email,
          image: TEST_USER.image,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
  })
}

// API 모킹 함수들
async function mockProjectsAPI(page: Page, projects = [TEST_PROJECT]) {
  await page.route('**/api/projects', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(projects),
      })
    } else if (method === 'POST') {
      const body = route.request().postDataJSON()
      const newProject = {
        id: `project-${Date.now()}`,
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { places: 0, images: 0 },
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newProject),
      })
    } else {
      await route.continue()
    }
  })
}

async function mockProjectDetailAPI(page: Page) {
  await page.route('**/api/projects/*/places', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ places: TEST_PLACES }),
    })
  })

  await page.route('**/api/projects/*/text-inputs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ textInputs: [] }),
    })
  })

  await page.route('**/api/projects/*/share', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shareEnabled: false,
          shareToken: null,
          shareUrl: null,
        }),
      })
    } else if (method === 'POST') {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shareEnabled: body.enabled,
          shareToken: body.enabled ? TEST_SHARE_TOKEN : null,
          shareUrl: body.enabled ? `http://localhost:3000/s/${TEST_SHARE_TOKEN}` : null,
        }),
      })
    } else {
      await route.continue()
    }
  })

  await page.route(/\/api\/projects\/[^/]+$/, async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...TEST_PROJECT,
          images: TEST_IMAGES,
        }),
      })
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.continue()
    }
  })
}

async function mockShareAPI(page: Page) {
  await page.route(`**/api/share/${TEST_SHARE_TOKEN}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: {
          name: TEST_PROJECT.name,
          destination: TEST_PROJECT.destination,
          country: TEST_PROJECT.country,
        },
        places: TEST_PLACES,
      }),
    })
  })

  await page.route(`**/api/share/${TEST_SHARE_TOKEN}/clone`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        newProjectId: 'cloned-project-id',
        placesCount: TEST_PLACES.length,
      }),
    })
  })
}

// 공통 컨텍스트 생성 헬퍼
async function createAuthenticatedContext(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await mockAuthSession(page)
  return { context, page }
}

// 인증된 테스트를 위한 fixture
// 주의: 인증이 필요한 페이지 테스트는 실제 인증 환경에서만 동작합니다.
// 로컬 테스트 시 NEXTAUTH_SECRET 환경변수와 테스트 DB가 필요합니다.
export const test = base.extend<{
  authenticatedPage: Page
  projectsPage: Page
  projectDetailPage: Page
  sharePageWithAuth: Page
}>({
  // 기본 인증 페이지 (API 모킹 없음, 커스텀 모킹용)
  authenticatedPage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedContext(browser)
    await use(page)
    await context.close()
  },

  projectsPage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedContext(browser)
    await mockProjectsAPI(page)
    await use(page)
    await context.close()
  },

  projectDetailPage: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedContext(browser)
    await mockProjectsAPI(page)
    await mockProjectDetailAPI(page)
    await use(page)
    await context.close()
  },

  sharePageWithAuth: async ({ browser }, use) => {
    const { context, page } = await createAuthenticatedContext(browser)
    await mockShareAPI(page)
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
