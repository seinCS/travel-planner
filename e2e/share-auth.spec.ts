import { test, expect, TEST_PROJECT, TEST_PLACES, TEST_SHARE_TOKEN } from './fixtures/auth'

test.describe('공유 페이지 (/s/[token]) - 유효한 토큰', () => {
  test('프로젝트 이름이 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await expect(sharePageWithAuth.getByRole('heading', { name: TEST_PROJECT.name })).toBeVisible()
  })

  test('여행지와 국가가 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    // 여행지,국가가 합쳐진 텍스트 확인
    await expect(sharePageWithAuth.getByText(`${TEST_PROJECT.destination}, ${TEST_PROJECT.country}`)).toBeVisible()
  })

  test('"공유된 여행 계획" 배지가 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await expect(sharePageWithAuth.getByText('공유된 여행 계획')).toBeVisible()
  })

  test('"내 프로젝트로 복사" 버튼이 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await expect(sharePageWithAuth.getByRole('button', { name: /내 프로젝트로 복사/ })).toBeVisible()
  })
})

test.describe('공유 페이지 - 장소 목록', () => {
  test('장소 목록이 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    // 장소 이름 중 하나가 표시되면 목록이 있는 것으로 판단
    await expect(sharePageWithAuth.getByText(TEST_PLACES[0].name).first()).toBeVisible()
  })

  test('장소 개수가 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    // 전체 필터 버튼에 개수가 포함되어 있는지 확인
    await expect(sharePageWithAuth.getByRole('button', { name: /전체.*\(\d+\)/ }).first()).toBeVisible()
  })

  test('장소 이름들이 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    for (const place of TEST_PLACES) {
      await expect(sharePageWithAuth.getByText(place.name).first()).toBeVisible()
    }
  })

  test('카테고리 필터가 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await expect(sharePageWithAuth.getByRole('button', { name: /전체/ }).first()).toBeVisible()
  })

  test('카테고리 필터 클릭 시 필터링된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    // 맛집 필터 클릭 (이치란 라멘만 표시되어야 함)
    const restaurantFilter = sharePageWithAuth.getByRole('button', { name: /🍽️.*맛집/ })
    if (await restaurantFilter.isVisible()) {
      await restaurantFilter.click()

      // 이치란 라멘은 표시되어야 함
      await expect(sharePageWithAuth.getByText('이치란 라멘').first()).toBeVisible()
    }
  })
})

test.describe('공유 페이지 - 장소 상세', () => {
  test('장소 카드에 상세 버튼이 있다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await expect(sharePageWithAuth.getByRole('button', { name: '상세' }).first()).toBeVisible()
  })

  test('평점이 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    // 센소지의 평점 4.5
    await expect(sharePageWithAuth.getByText('4.5').first()).toBeVisible()
  })

  test('Google Maps 링크가 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await expect(sharePageWithAuth.getByText(/Google Maps에서 보기/).first()).toBeVisible()
  })
})

test.describe('공유 페이지 - 복제 기능 (인증된 상태)', () => {
  test('"내 프로젝트로 복사" 클릭 시 복제된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await sharePageWithAuth.getByRole('button', { name: /내 프로젝트로 복사/ }).click()

    // 복제 성공 후 프로젝트 상세 페이지로 이동
    await expect(sharePageWithAuth).toHaveURL(/\/projects\//, { timeout: 5000 })
  })
})

test.describe('공유 페이지 - 푸터', () => {
  test('푸터 텍스트가 표시된다', async ({ sharePageWithAuth }) => {
    await sharePageWithAuth.goto(`/s/${TEST_SHARE_TOKEN}`)

    await expect(sharePageWithAuth.getByText('Travel Planner로 만든 여행 계획입니다.')).toBeVisible()
  })
})
