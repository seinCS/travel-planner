# Travel Planner

SNS 스크린샷에서 AI로 장소를 자동 추출하고, 드래그앤드롭으로 일정을 계획하며, 그룹과 실시간 협업할 수 있는 여행 플래너 웹 애플리케이션입니다.

**배포 URL**: https://travel-planner-ten-ebon.vercel.app

## 주요 기능

### 1. AI 장소 추출
- **이미지**: SNS 스크린샷(Instagram, YouTube, X) 업로드 → Claude Vision 분석
- **텍스트**: 자유 텍스트 입력 → Claude 텍스트 분석
- **URL**: 블로그 URL 입력 → 크롤링 → Claude 텍스트 분석

### 2. 지도 시각화
- Google Maps에 추출된 장소 마커 표시
- 카테고리별 필터링 (음식점, 카페, 관광지 등)
- 장소 상세 정보 (영업시간, 평점, 주소)

### 3. 일정 관리
- 날짜 범위 선택으로 Day별 일정 자동 생성
- 드래그앤드롭으로 장소 순서 변경 및 Day간 이동
- 항공편/숙소 정보 관리
- Day별 지도 필터링

### 4. 그룹 협업
- 초대 링크로 멤버 추가
- 소유자/멤버 역할 관리
- 멤버 목록 조회 및 관리

### 5. 공유
- 읽기 전용 공유 링크 생성
- 공유 페이지에서 프로젝트 복제

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Backend** | Next.js API Routes, NextAuth.js (Google OAuth), Zod |
| **Database** | PostgreSQL (Supabase), Prisma ORM |
| **Storage** | Supabase Storage |
| **AI** | Claude API (Vision + Text) |
| **Maps** | Google Maps JavaScript API, Geocoding API, Places API |
| **State** | SWR |
| **Deploy** | Vercel |

## 시작하기

### 환경 설정

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일에 필요한 값 입력

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run dev
```

### 환경 변수

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
```

## 개발 명령어

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 실행

# 데이터베이스
npx prisma migrate dev --name <name>
npx prisma generate
npx prisma studio

# E2E 테스트
npx playwright test
npx playwright test --ui
```

## 프로젝트 구조

```
travel-planner/
├── app/                    # Next.js App Router
├── domain/                 # Domain Layer (인터페이스)
├── application/            # Application Layer (Use Cases)
├── infrastructure/         # Infrastructure Layer (API Client, Repository)
├── hooks/                  # Custom Hooks (SWR)
├── components/             # UI Components
├── lib/                    # Utilities
└── docs/                   # Documentation
```

자세한 아키텍처는 `CLAUDE.md`와 `docs/` 폴더를 참조하세요.

## 문서

| 문서 | 설명 |
|------|------|
| `CLAUDE.md` | Claude Code 작업 가이드 |
| `docs/ARCHITECTURE_ANALYSIS.md` | 아키텍처 분석 |
| `docs/ITINERARY_REQUIREMENTS.md` | 일정 기능 요구사항 |
| `docs/ITINERARY_PROGRESS_REPORT.md` | 일정 기능 진행 현황 |
| `docs/e2e-test-spec.md` | E2E 테스트 명세 |

## 라이선스

Private
