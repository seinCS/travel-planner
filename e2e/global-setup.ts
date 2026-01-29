/**
 * Playwright Global Setup
 *
 * 모든 테스트 전에 한 번 실행되어 테스트 환경을 설정합니다.
 * 인증 상태를 storageState 파일로 저장하여 모든 브라우저에서 재사용합니다.
 */
import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// storageState 파일 경로
export const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'storage-state.json')

async function globalSetup(config: FullConfig) {
  // 웹 서버가 시작될 때까지 대기
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'

  console.log('Setting up E2E test environment...')

  // .auth 디렉토리 생성 (없으면)
  const authDir = path.dirname(STORAGE_STATE_PATH)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
    console.log('Created .auth directory')
  }

  // 브라우저를 사용하여 API 호출
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 페이지 방문하여 컨텍스트 초기화
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // 1. 테스트 로그인
    console.log('Creating test user session...')
    const loginResponse = await page.request.post(`${baseURL}/api/auth/test-login`)

    if (!loginResponse.ok()) {
      const error = await loginResponse.text()
      console.error('Test login failed:', error)
      console.warn('E2E_TEST_MODE may not be enabled. Skipping auth setup.')
    } else {
      console.log('Test user session created')

      // 로그인 후 쿠키 확인
      const cookies = await context.cookies()
      console.log('Cookies after login:', cookies.map(c => c.name).join(', '))

      // 2. 테스트 데이터 정리 후 생성 (같은 context 사용하여 쿠키 유지)
      console.log('Cleaning up old test data...')
      await page.request.delete(`${baseURL}/api/test-data`).catch(() => {})

      console.log('Creating test data...')
      const dataResponse = await page.request.post(`${baseURL}/api/test-data`)

      if (!dataResponse.ok()) {
        const error = await dataResponse.text()
        console.error('Test data creation failed:', error)

        // 재시도: 사용자가 이미 존재할 수 있음
        console.log('Retrying test data creation...')
        const retryResponse = await page.request.post(`${baseURL}/api/test-data`)
        if (retryResponse.ok()) {
          const data = await retryResponse.json()
          console.log('Test data created on retry:', data)
        }
      } else {
        const data = await dataResponse.json()
        console.log('Test data created:', data)

        // 4. 테스트 페이지 사전 컴파일 (pre-warm)
        console.log('Pre-warming test pages...')
        try {
          await page.goto(`${baseURL}/projects/${data.data.projectId}`, { timeout: 60000 })
          await page.waitForLoadState('networkidle')
          console.log('Project page pre-warmed')
        } catch (e) {
          console.warn('Pre-warming failed:', e)
        }
      }

      // 3. storageState 저장 (인증 상태를 파일로 저장하여 모든 브라우저에서 재사용)
      console.log('Saving authentication state to storage...')
      await context.storageState({ path: STORAGE_STATE_PATH })
      console.log('Authentication state saved to:', STORAGE_STATE_PATH)
    }
  } catch (error) {
    console.error('Global setup error:', error)
  } finally {
    await browser.close()
  }

  console.log('E2E test environment ready!')
}

export default globalSetup
