import { test, expect, type Page } from '@playwright/test'

/**
 * User Feedback V2 - E2E Tests
 *
 * 테스트 대상:
 * - Phase 1: 아이콘 시스템 통일 (Lucide-react)
 * - Phase 2A: 항공권 자동완성 API (AirportCombobox)
 * - Phase 2B: 랜딩 페이지 리디자인
 * - Phase 2C: 일정 빠른 추가 UX (PlacePickerModal)
 */

// ============================================================================
// Landing Page Redesign Tests (Phase 2B)
// ============================================================================

test.describe('Landing Page Redesign', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
  })

  test.describe('Hero Section', () => {
    test('Hero 섹션이 올바르게 렌더링된다', async ({ page }) => {
      // AI 배지 확인
      const aiBadge = page.locator('text=AI 기반 여행 계획 도우미')
      await expect(aiBadge).toBeVisible()

      // 메인 타이틀 확인
      const mainTitle = page.getByRole('heading', { name: /SNS 스크린샷으로[\s\S]*여행 계획/ })
      await expect(mainTitle).toBeVisible()

      // 서브 설명 확인
      await expect(page.getByText(/인스타그램, 유튜브, X에서 캡처한/)).toBeVisible()
    })

    test('CTA 버튼들이 표시된다', async ({ page }) => {
      // 주요 CTA - 무료로 시작하기
      const primaryCta = page.getByRole('link', { name: /무료로 시작하기/ })
      await expect(primaryCta).toBeVisible()

      // 보조 CTA - 사용 방법 보기
      const secondaryCta = page.getByRole('link', { name: /사용 방법 보기/ })
      await expect(secondaryCta).toBeVisible()
    })

    test('주요 CTA 클릭 시 로그인 페이지로 이동한다', async ({ page }) => {
      await page.getByRole('link', { name: /무료로 시작하기/ }).first().click()
      await expect(page).toHaveURL('/login')
    })

    test('사용 방법 보기 클릭 시 해당 섹션으로 스크롤된다', async ({ page }) => {
      const howItWorksLink = page.getByRole('link', { name: /사용 방법 보기/ })
      await howItWorksLink.click()

      // URL에 #how-it-works 앵커가 포함되어야 함
      await expect(page).toHaveURL(/#how-it-works/)
    })

    test('앱 미리보기 카드가 표시된다', async ({ page }) => {
      // 미리보기 카드 내 제목
      await expect(page.getByText('도쿄 여행 계획')).toBeVisible()

      // 미리보기 장소 카드들
      await expect(page.getByText('센소지')).toBeVisible()
      await expect(page.getByText('이치란 라멘')).toBeVisible()
      await expect(page.getByText('시부야 스카이')).toBeVisible()
    })

    test('Hero 배경 그라데이션이 적용되어 있다', async ({ page }) => {
      const mainContainer = page.locator('div.min-h-screen')
      await expect(mainContainer).toHaveClass(/bg-gradient-to-br/)
    })
  })

  test.describe('Features Section', () => {
    test('4개의 기능 카드가 모두 표시된다', async ({ page }) => {
      // Features 섹션 내의 기능 카드들만 선택 (How It Works 섹션과 구분)
      const featuresSection = page.locator('section').filter({ hasText: '여행 계획의 모든 것' })

      const featureTitles = [
        '스크린샷 업로드',
        'AI 자동 추출',
        '지도 시각화',
        '일정 관리 & 공유'
      ]

      for (const title of featureTitles) {
        await expect(featuresSection.getByRole('heading', { name: title })).toBeVisible()
      }
    })

    test('기능 섹션 타이틀이 표시된다', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '여행 계획의 모든 것' })).toBeVisible()
      await expect(page.getByText('스크린샷 하나로 시작하는 스마트한 여행 계획')).toBeVisible()
    })

    test('각 기능 카드에 설명이 포함되어 있다', async ({ page }) => {
      // Features 섹션 내의 설명만 선택 (다른 섹션과 구분)
      const featuresSection = page.locator('section').filter({ hasText: '여행 계획의 모든 것' })

      const descriptions = [
        '드래그앤드롭으로 간편하게 업로드',
        'Claude AI가 자동 추출',
        'Google Maps에 핀으로 표시',
        '그룹과 함께 협업'
      ]

      for (const desc of descriptions) {
        await expect(featuresSection.getByText(new RegExp(desc))).toBeVisible()
      }
    })

    test('기능 카드에 호버 효과 클래스가 있다', async ({ page }) => {
      const featureCards = page.locator('.group.bg-white\\/80')
      const count = await featureCards.count()

      expect(count).toBe(4)

      // 첫 번째 카드의 호버 클래스 확인
      const firstCard = featureCards.first()
      await expect(firstCard).toHaveClass(/hover:shadow-xl/)
      await expect(firstCard).toHaveClass(/hover:-translate-y-1/)
    })
  })

  test.describe('How It Works Section', () => {
    test('섹션 타이틀이 표시된다', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '3단계로 완성하는 여행 계획' })).toBeVisible()
      await expect(page.getByText('복잡한 여행 계획, 이제 3단계면 충분합니다')).toBeVisible()
    })

    test('3단계 프로세스가 모두 표시된다', async ({ page }) => {
      // How It Works 섹션 내의 단계만 선택
      const howItWorksSection = page.locator('#how-it-works')

      const steps = [
        { step: '1', title: '스크린샷 업로드' },
        { step: '2', title: 'AI가 장소 추출' },
        { step: '3', title: '지도에서 확인 & 편성' }
      ]

      for (const step of steps) {
        await expect(howItWorksSection.getByRole('heading', { name: step.title })).toBeVisible()
        await expect(howItWorksSection.getByText(step.step, { exact: true })).toBeVisible()
      }
    })

    test('각 단계의 설명이 표시된다', async ({ page }) => {
      await expect(page.getByText(/Instagram, YouTube, X 등 SNS에서/)).toBeVisible()
      await expect(page.getByText(/Claude AI가 이미지를 분석해/)).toBeVisible()
      await expect(page.getByText(/추출된 장소를 지도에서 확인하고/)).toBeVisible()
    })

    test('섹션에 id="how-it-works"가 있다', async ({ page }) => {
      const section = page.locator('#how-it-works')
      await expect(section).toBeVisible()
    })
  })

  test.describe('Social Proof Section', () => {
    test('통계 정보가 표시된다', async ({ page }) => {
      await expect(page.getByText('1,000+')).toBeVisible()
      await expect(page.getByText('5,000+')).toBeVisible()
      await expect(page.getByText('500+')).toBeVisible()
    })

    test('통계 라벨이 표시된다', async ({ page }) => {
      // Social Proof 섹션의 통계 라벨만 선택
      const socialProofSection = page.locator('.bg-gradient-to-r.from-blue-600.to-indigo-600')

      await expect(socialProofSection.locator('.text-blue-100').filter({ hasText: '여행 계획' })).toBeVisible()
      await expect(socialProofSection.locator('.text-blue-100').filter({ hasText: '장소 추출' })).toBeVisible()
      await expect(socialProofSection.locator('.text-blue-100').filter({ hasText: '사용자' })).toBeVisible()
    })

    test('Social Proof 섹션에 그라데이션 배경이 있다', async ({ page }) => {
      // 실제 Social Proof 섹션의 배경 (div 요소, rounded-3xl 클래스로 구분)
      const socialProofBg = page.locator('.bg-gradient-to-r.from-blue-600.to-indigo-600.rounded-3xl')
      await expect(socialProofBg).toBeVisible()
    })

    test('지금 시작하기 버튼이 표시된다', async ({ page }) => {
      const startButton = page.getByRole('link', { name: /지금 시작하기/ })
      await expect(startButton).toBeVisible()
    })

    test('지금 시작하기 버튼 클릭 시 로그인으로 이동', async ({ page }) => {
      // Social Proof 섹션의 버튼을 정확히 선택
      const socialProofSection = page.locator('.bg-gradient-to-r.from-blue-600.to-indigo-600')
      const startButton = socialProofSection.getByRole('link', { name: /지금 시작하기/ })
      await startButton.click()
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Collaboration Section', () => {
    test('협업 섹션 타이틀이 표시된다', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '함께 계획하는 여행' })).toBeVisible()
    })

    test('그룹 멤버 미리보기가 표시된다', async ({ page }) => {
      await expect(page.getByText('그룹 멤버')).toBeVisible()
      await expect(page.getByText('김여행')).toBeVisible()
      await expect(page.getByText('이탐험')).toBeVisible()
      await expect(page.getByText('박모험')).toBeVisible()
    })

    test('멤버 역할이 표시된다', async ({ page }) => {
      await expect(page.getByText('Owner')).toBeVisible()
      // Member는 2명이므로 복수 개 존재
      const memberRoles = page.getByText('Member')
      await expect(memberRoles.first()).toBeVisible()
    })

    test('초대 링크 추가 버튼이 표시된다', async ({ page }) => {
      await expect(page.getByText('+ 초대 링크로 멤버 추가')).toBeVisible()
    })

    test('협업 기능 리스트가 표시된다', async ({ page }) => {
      const features = [
        '초대 링크로 간편하게 멤버 추가',
        '실시간 장소 공유 및 일정 편성',
        '공유 링크로 외부에 여행 계획 공유'
      ]

      for (const feature of features) {
        await expect(page.getByText(feature)).toBeVisible()
      }
    })
  })

  test.describe('Footer', () => {
    test('Footer가 표시된다', async ({ page }) => {
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
    })

    test('Footer에 서비스 이름이 표시된다', async ({ page }) => {
      const footer = page.locator('footer')
      // exact: true로 정확한 매칭
      await expect(footer.getByText('여행 플래너', { exact: true })).toBeVisible()
    })

    test('Footer에 로그인 링크가 있다', async ({ page }) => {
      const footer = page.locator('footer')
      const loginLink = footer.getByRole('link', { name: '로그인' })
      await expect(loginLink).toBeVisible()
    })

    test('Footer에 GitHub 링크가 있다', async ({ page }) => {
      const footer = page.locator('footer')
      const githubLink = footer.getByRole('link', { name: /GitHub/ })
      await expect(githubLink).toBeVisible()
      await expect(githubLink).toHaveAttribute('href', 'https://github.com/seinCS/travel-planner')
    })

    test('Footer에 저작권 정보가 표시된다', async ({ page }) => {
      await expect(page.getByText(/© 2026 여행 플래너/)).toBeVisible()
    })
  })
})

// ============================================================================
// Icon System Tests (Phase 1)
// ============================================================================

test.describe('Icon System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
  })

  test('모든 아이콘이 SVG로 렌더링된다', async ({ page }) => {
    // Lucide 아이콘은 모두 SVG 요소로 렌더링됨
    const svgIcons = page.locator('svg.lucide')
    const count = await svgIcons.count()

    // 랜딩 페이지에 최소 10개 이상의 아이콘이 있어야 함
    expect(count).toBeGreaterThanOrEqual(10)
  })

  test('아이콘이 적절한 크기로 렌더링된다', async ({ page }) => {
    // 다양한 크기의 아이콘 확인
    const smallIcons = page.locator('svg.w-4.h-4')
    const mediumIcons = page.locator('svg.w-5.h-5')
    const largeIcons = page.locator('svg.w-8.h-8')

    // 각 크기별 아이콘이 존재해야 함
    expect(await smallIcons.count()).toBeGreaterThan(0)
    expect(await mediumIcons.count()).toBeGreaterThan(0)
    expect(await largeIcons.count()).toBeGreaterThan(0)
  })

  test('Hero 섹션의 Sparkles 아이콘이 표시된다', async ({ page }) => {
    // AI 배지 내 Sparkles 아이콘 (lucide-sparkles 클래스로 특정)
    const sparklesIcon = page.locator('svg.lucide-sparkles').first()
    await expect(sparklesIcon).toBeVisible()
  })

  test('기능 카드의 아이콘이 올바르게 표시된다', async ({ page }) => {
    // 기능 카드 내 아이콘 컨테이너들
    const iconContainers = page.locator('.group.bg-white\\/80 .w-14.h-14')
    const count = await iconContainers.count()

    expect(count).toBe(4)

    // 각 컨테이너 내에 SVG 아이콘이 있는지 확인
    for (let i = 0; i < count; i++) {
      const svg = iconContainers.nth(i).locator('svg')
      await expect(svg).toBeVisible()
    }
  })

  test('MapPin 아이콘이 헤더와 Footer에 표시된다', async ({ page }) => {
    // 헤더의 MapPin 아이콘
    const headerIcon = page.locator('header svg').first()
    await expect(headerIcon).toBeVisible()

    // Footer의 MapPin 아이콘
    const footerIcon = page.locator('footer svg').first()
    await expect(footerIcon).toBeVisible()
  })

  test('아이콘 색상이 올바르게 적용된다', async ({ page }) => {
    // 헤더 로고 아이콘 (MapPin)
    const headerMapPin = page.locator('header svg.lucide-map-pin')
    await expect(headerMapPin).toBeVisible()

    // Footer 로고 아이콘
    const footerMapPin = page.locator('footer svg.lucide-map-pin')
    await expect(footerMapPin).toBeVisible()
  })
})

// ============================================================================
// Responsive Design Tests
// ============================================================================

test.describe('Responsive Design', () => {
  test.describe('Mobile View (375px)', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('모바일에서 Hero 섹션이 세로로 배치된다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Hero 컨텐츠가 세로로 배치됨 (grid-cols-1)
      const heroGrid = page.locator('section .grid').first()
      await expect(heroGrid).toBeVisible()
    })

    test('모바일에서 CTA 버튼이 풀 너비로 표시된다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const ctaButton = page.getByRole('link', { name: /무료로 시작하기/ })
      await expect(ctaButton).toBeVisible()

      // 버튼이 w-full 클래스를 가지고 있어야 함
      const button = ctaButton.locator('button')
      await expect(button).toHaveClass(/w-full/)
    })

    test('모바일에서 통계 섹션의 500+ 사용자가 숨겨진다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // 500+ 사용자 영역은 hidden sm:block 클래스를 가짐
      const userStat = page.locator('text=500+').locator('..')
      await expect(userStat).toHaveClass(/hidden/)
    })
  })

  test.describe('Tablet View (768px)', () => {
    test.use({ viewport: { width: 768, height: 1024 } })

    test('태블릿에서 기능 카드가 2열로 배치된다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const featuresGrid = page.locator('.grid.md\\:grid-cols-2')
      await expect(featuresGrid).toBeVisible()
    })
  })

  test.describe('Desktop View (1280px)', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('데스크탑에서 Hero 섹션이 2열로 배치된다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Hero 섹션의 첫 번째 grid (section 내 첫 번째 grid)
      const heroGrid = page.locator('section .grid.lg\\:grid-cols-2').first()
      await expect(heroGrid).toBeVisible()
    })

    test('데스크탑에서 기능 카드가 4열로 배치된다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const featuresGrid = page.locator('.grid.lg\\:grid-cols-4')
      await expect(featuresGrid).toBeVisible()
    })

    test('데스크탑에서 How It Works 연결선이 표시된다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // 연결선은 md:block 클래스를 가짐
      const connectionLine = page.locator('.hidden.md\\:block.absolute.top-16')
      await expect(connectionLine).toBeVisible()
    })
  })
})

// ============================================================================
// Airport Autocomplete Tests (Phase 2A) - Skip if not implemented
// ============================================================================

test.describe('Airport Autocomplete', () => {
  test.describe.configure({ mode: 'serial' })

  // AirportCombobox가 구현되지 않았으므로 skip 처리
  test.skip('AirportCombobox 컴포넌트가 존재하지 않아 스킵', () => {})

  // 향후 구현 시 활성화할 테스트들
  test.skip('공항 검색 입력 필드가 표시된다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('공항 코드로 검색 시 자동완성이 동작한다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('공항명으로 검색 시 자동완성이 동작한다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('자동완성 결과 선택 시 입력 필드에 반영된다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('키보드 네비게이션이 동작한다', async ({ page }) => {
    // 구현 후 활성화
  })
})

// ============================================================================
// Place Picker Modal Tests (Phase 2C) - Skip if not implemented
// ============================================================================

test.describe('Place Picker Modal', () => {
  test.describe.configure({ mode: 'serial' })

  // PlacePickerModal이 구현되지 않았으므로 skip 처리
  test.skip('PlacePickerModal 컴포넌트가 존재하지 않아 스킵', () => {})

  // 향후 구현 시 활성화할 테스트들
  test.skip('일정에서 빠른 추가 버튼이 표시된다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('빠른 추가 버튼 클릭 시 모달이 열린다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('모달에서 장소 검색이 가능하다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('장소 선택 시 일정에 추가된다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('모달 닫기 버튼이 동작한다', async ({ page }) => {
    // 구현 후 활성화
  })

  test.skip('ESC 키로 모달을 닫을 수 있다', async ({ page }) => {
    // 구현 후 활성화
  })
})

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
  })

  test('모든 버튼에 접근 가능한 이름이 있다', async ({ page }) => {
    const buttons = page.getByRole('button')
    const count = await buttons.count()

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      const name = await button.getAttribute('aria-label') || await button.textContent()
      expect(name).toBeTruthy()
    }
  })

  test('모든 링크에 접근 가능한 이름이 있다', async ({ page }) => {
    const links = page.getByRole('link')
    const count = await links.count()

    for (let i = 0; i < count; i++) {
      const link = links.nth(i)
      const name = await link.getAttribute('aria-label') || await link.textContent()
      expect(name).toBeTruthy()
    }
  })

  test('페이지에 메인 heading이 있다', async ({ page }) => {
    // h1 또는 h2 레벨의 주요 heading
    const mainHeading = page.getByRole('heading', { level: 1 })
    const count = await mainHeading.count()

    // h1이 없으면 h2 확인
    if (count === 0) {
      const h2Headings = page.getByRole('heading', { level: 2 })
      expect(await h2Headings.count()).toBeGreaterThan(0)
    } else {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('외부 링크에 target="_blank"와 rel 속성이 있다', async ({ page }) => {
    const externalLinks = page.locator('a[target="_blank"]')
    const count = await externalLinks.count()

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i)
      const rel = await link.getAttribute('rel')
      expect(rel).toContain('noopener')
    }
  })

  test('이미지 대체 텍스트 또는 aria-hidden이 있다', async ({ page }) => {
    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaHidden = await img.getAttribute('aria-hidden')

      // alt 텍스트가 있거나 aria-hidden="true"이어야 함
      expect(alt !== null || ariaHidden === 'true').toBeTruthy()
    }
  })
})

// ============================================================================
// Animation & Visual Effects Tests
// ============================================================================

test.describe('Animation & Visual Effects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
  })

  test('AI 배지에 fade-in 애니메이션 클래스가 있다', async ({ page }) => {
    const aiBadge = page.locator('.animate-fade-in')
    await expect(aiBadge).toBeVisible()
  })

  test('앱 미리보기 배경에 pulse 애니메이션이 있다', async ({ page }) => {
    const pulseBg = page.locator('.animate-pulse')
    await expect(pulseBg).toBeVisible()
  })

  test('기능 카드에 hover transition 클래스가 있다', async ({ page }) => {
    const featureCard = page.locator('.group.bg-white\\/80').first()
    await expect(featureCard).toHaveClass(/transition-all/)
    await expect(featureCard).toHaveClass(/duration-300/)
  })

  test('그라데이션 텍스트가 올바르게 적용되어 있다', async ({ page }) => {
    // 헤더 타이틀의 그라데이션 텍스트
    const gradientText = page.locator('.bg-gradient-to-r.from-blue-600.to-indigo-600.bg-clip-text')
    await expect(gradientText.first()).toBeVisible()
  })

  test('backdrop-blur 효과가 적용되어 있다', async ({ page }) => {
    const blurredElements = page.locator('.backdrop-blur-sm')
    expect(await blurredElements.count()).toBeGreaterThan(0)
  })
})

// ============================================================================
// Navigation & Scroll Tests
// ============================================================================

test.describe('Navigation & Scroll', () => {
  test('헤더가 항상 상단에 표시된다', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const header = page.locator('header')
    await expect(header).toBeVisible()

    // 페이지 스크롤 후에도 헤더가 보이는지 확인
    await page.evaluate(() => window.scrollTo(0, 1000))
    await expect(header).toBeVisible()
  })

  test('How It Works 섹션으로 스크롤 시 해당 섹션이 뷰포트에 표시된다', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const howItWorksSection = page.locator('#how-it-works')
    await howItWorksSection.scrollIntoViewIfNeeded()

    await expect(howItWorksSection).toBeInViewport()
  })

  test('Footer까지 스크롤 가능하다', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()

    await expect(footer).toBeInViewport()
  })
})

// ============================================================================
// Performance Hints Tests (Non-blocking)
// ============================================================================

test.describe('Performance Hints', () => {
  test('페이지가 3초 이내에 로드된다', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000)
  })

  test('LCP 후보 요소(Hero 이미지/텍스트)가 빠르게 로드된다', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Hero 섹션의 주요 텍스트가 빠르게 보여야 함
    const heroTitle = page.getByRole('heading', { name: /SNS 스크린샷으로/ })
    await expect(heroTitle).toBeVisible({ timeout: 2000 })
  })
})
