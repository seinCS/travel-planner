import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// .env.test 파일 로드 (없으면 .env.local 사용)
dotenv.config({ path: path.resolve(__dirname, '.env.test') })
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
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
  },
  projects: [
    // Desktop Chrome (기본)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Desktop Firefox
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Desktop Safari (WebKit)
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile - iPhone SE (최소 모바일, 375px) - Chromium 기반
    {
      name: 'mobile-iphone-se',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
    // Mobile - iPhone 14 Pro (일반 모바일, 393px) - Chromium 기반
    {
      name: 'mobile-iphone-14-pro',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true,
      },
    },
    // Mobile - iPhone 14 Pro Max (대형 모바일, 430px) - Chromium 기반
    {
      name: 'mobile-iphone-14-pro-max',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
      },
    },
    // Mobile - iPhone SE (WebKit 기반, 실제 Safari 엔진)
    {
      name: 'mobile-iphone-se-webkit',
      use: {
        ...devices['iPhone SE'],
      },
    },
    // Mobile - iPhone 14 (WebKit 기반, 실제 Safari 엔진)
    {
      name: 'mobile-iphone-14-webkit',
      use: {
        ...devices['iPhone 14'],
      },
    },
    // Tablet - iPad Mini (768px) - Chromium 기반
    {
      name: 'tablet-ipad-mini',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    // Tablet - iPad (WebKit 기반, 실제 Safari 엔진)
    {
      name: 'tablet-ipad-webkit',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
    // Windows 노트북 (소, 1366px)
    {
      name: 'laptop-small',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
    // Windows 노트북 (중, 1536px - FHD 스케일링)
    {
      name: 'laptop-medium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1536, height: 864 },
      },
    },
    // Desktop Full HD (1920px)
    {
      name: 'desktop-fhd',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      E2E_TEST_MODE: 'true',
    },
  },
})
