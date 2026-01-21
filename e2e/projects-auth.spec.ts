import { test, expect, TEST_PROJECT, TEST_USER } from './fixtures/auth'

test.describe('프로젝트 목록 페이지 (/projects) - 인증된 상태', () => {
  test('페이지 제목이 표시된다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await expect(projectsPage.getByRole('heading', { name: '내 여행 프로젝트' })).toBeVisible()
  })

  test('서브 설명이 표시된다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await expect(projectsPage.getByText(/SNS 스크린샷을 업로드하여/)).toBeVisible()
  })

  test('새 프로젝트 버튼이 표시된다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await expect(projectsPage.getByRole('button', { name: /새 프로젝트/ })).toBeVisible()
  })

  test('프로젝트 카드가 표시된다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')

    // 프로젝트 이름 확인
    await expect(projectsPage.getByText(TEST_PROJECT.name)).toBeVisible()

    // 여행지,국가 확인
    await expect(projectsPage.getByText(`${TEST_PROJECT.destination}, ${TEST_PROJECT.country}`)).toBeVisible()
  })

  test('프로젝트 카드에 장소/이미지 수가 표시된다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')

    // 장소 수 확인
    await expect(projectsPage.getByText(/3개 장소|장소 3/)).toBeVisible()
  })
})

test.describe('프로젝트 생성 Dialog - 인증된 상태', () => {
  test('새 프로젝트 버튼 클릭 시 Dialog가 열린다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await projectsPage.getByRole('button', { name: /새 프로젝트/ }).click()

    await expect(projectsPage.getByRole('dialog')).toBeVisible()
    await expect(projectsPage.getByRole('heading', { name: '새 여행 프로젝트' })).toBeVisible()
  })

  test('Dialog에 필수 입력 필드가 있다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await projectsPage.getByRole('button', { name: /새 프로젝트/ }).click()

    await expect(projectsPage.getByLabel('프로젝트 이름')).toBeVisible()
    await expect(projectsPage.getByLabel('여행지 (도시)')).toBeVisible()
    await expect(projectsPage.getByLabel('국가 (선택)')).toBeVisible()
  })

  test('필수 필드가 비어있으면 생성 버튼이 비활성화된다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await projectsPage.getByRole('button', { name: /새 프로젝트/ }).click()

    const submitButton = projectsPage.getByRole('button', { name: '생성' })
    await expect(submitButton).toBeDisabled()
  })

  test('취소 버튼 클릭 시 Dialog가 닫힌다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await projectsPage.getByRole('button', { name: /새 프로젝트/ }).click()

    await projectsPage.getByRole('button', { name: '취소' }).click()
    await expect(projectsPage.getByRole('dialog')).not.toBeVisible()
  })

  test('프로젝트 정보 입력 후 생성 버튼이 활성화된다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await projectsPage.getByRole('button', { name: /새 프로젝트/ }).click()

    await projectsPage.getByLabel('프로젝트 이름').fill('오사카 여행')
    await projectsPage.getByLabel('여행지 (도시)').fill('오사카')

    const submitButton = projectsPage.getByRole('button', { name: '생성' })
    await expect(submitButton).toBeEnabled()
  })

  test('프로젝트 생성 후 Dialog가 닫힌다', async ({ projectsPage }) => {
    await projectsPage.goto('/projects')
    await projectsPage.getByRole('button', { name: /새 프로젝트/ }).click()

    await projectsPage.getByLabel('프로젝트 이름').fill('오사카 여행')
    await projectsPage.getByLabel('여행지 (도시)').fill('오사카')
    await projectsPage.getByLabel('국가 (선택)').fill('일본')

    await projectsPage.getByRole('button', { name: '생성' }).click()

    // Dialog가 닫히고 성공 토스트가 표시되어야 함
    await expect(projectsPage.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('프로젝트 목록 - 빈 상태', () => {
  test('프로젝트가 없을 때 빈 상태 UI가 표시된다', async ({ authenticatedPage }) => {
    // 빈 프로젝트 목록 모킹
    await authenticatedPage.route('**/api/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else {
        await route.continue()
      }
    })

    await authenticatedPage.goto('/projects')

    await expect(authenticatedPage.getByText('아직 프로젝트가 없습니다')).toBeVisible()
    await expect(authenticatedPage.getByText('첫 번째 여행 프로젝트를 만들어보세요!')).toBeVisible()
  })
})
