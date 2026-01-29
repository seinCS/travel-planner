import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// .env.test 파일 로드 (없으면 .env.local 사용)
dotenv.config({ path: path.resolve(__dirname, '.env.test') })
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// storageState 파일 경로 (global-setup.ts와 동일)
const STORAGE_STATE_PATH = '.auth/storage-state.json'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI에서 재시도 1회로 제한 - flaky 테스트를 숨기지 않고 수정 권장
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html'], ['list']],

  // Global timeout settings
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5 * 1000, // 5 seconds for assertions
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10 * 1000, // 10 seconds for actions
    navigationTimeout: 15 * 1000, // 15 seconds for navigation
    // 모든 프로젝트에서 저장된 인증 상태 사용
    storageState: STORAGE_STATE_PATH,
  },
  projects: [
    // ===== 핵심 프로젝트 (6개) =====
    // 13개 → 6개로 축소하여 테스트 시간 단축 및 안정성 향상

    // Desktop Chrome (기본) - 주요 테스트 브라우저
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // NOTE: firefox, webkit 프로젝트는 브라우저 미설치로 제거
    // 필요 시 `npx playwright install` 실행 후 추가
    // Mobile - iPhone 14 Pro (모바일 대표, 393px) - Chromium 기반
    // SE, 14 Pro Max 대신 중간 사이즈로 대표
    {
      name: 'mobile-iphone-14-pro',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true,
      },
    },
    // Tablet - iPad Mini (태블릿 대표, 768px) - Chromium 기반
    // iPad WebKit 대신 Chromium 기반으로 안정성 확보
    {
      name: 'tablet-ipad-mini',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    // Desktop Full HD (1920px) - 데스크탑 대표
    // laptop-small, laptop-medium 대신 FHD로 대표
    {
      name: 'desktop-fhd',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  webServer: {
    command: 'E2E_TEST_MODE=true npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      E2E_TEST_MODE: 'true',
    },
  },
})
