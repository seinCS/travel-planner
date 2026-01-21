import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// .env.test 파일 로드 (없으면 .env.local 사용)
dotenv.config({ path: path.resolve(__dirname, '.env.test') })
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Desktop Chrome (기본)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
