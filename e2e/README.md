# E2E Tests

Playwright를 사용한 End-to-End 테스트입니다.

## 설치

```bash
# 의존성 설치
npm install

# Playwright 브라우저 설치
npx playwright install
```

## 환경 설정

테스트 환경 변수를 설정하려면 `.env.test` 파일을 생성하세요:

```bash
cp .env.local .env.test
```

`.env.test` 파일이 없으면 `.env.local`을 사용합니다.

## 테스트 실행

```bash
# 모든 테스트 실행
npm run test:e2e

# UI 모드로 실행 (디버깅용)
npm run test:e2e:ui

# 브라우저 창과 함께 실행
npm run test:e2e:headed

# 특정 파일만 실행
npx playwright test landing.spec.ts

# 특정 테스트만 실행
npx playwright test -g "페이지 타이틀"
```

## 테스트 리포트

```bash
# HTML 리포트 생성 및 열기
npx playwright show-report
```

## 테스트 구조

```
e2e/
├── fixtures/
│   └── auth.ts           # 인증 fixture 및 API 모킹
├── landing.spec.ts       # 랜딩 페이지 테스트 (/)
├── login.spec.ts         # 로그인 페이지 테스트 (/login)
├── projects.spec.ts      # 프로젝트 페이지 미인증 테스트
├── projects-auth.spec.ts # 프로젝트 페이지 인증 테스트
├── project-detail.spec.ts # 프로젝트 상세 페이지 테스트
├── share.spec.ts         # 공유 페이지 에러/로딩 테스트
└── share-auth.spec.ts    # 공유 페이지 인증 테스트
```

## 테스트 카테고리

### 공개 페이지 테스트 (인증 불필요)
- `landing.spec.ts` - 랜딩 페이지 UI 테스트
- `login.spec.ts` - 로그인 페이지 UI 테스트
- `projects.spec.ts` - 미인증 접근 시 리다이렉트 테스트
- `share.spec.ts` - 공유 페이지 에러/로딩 상태 테스트

### 인증 페이지 테스트 (API 모킹)
- `projects-auth.spec.ts` - 프로젝트 목록 페이지 테스트
- `project-detail.spec.ts` - 프로젝트 상세 페이지 테스트
- `share-auth.spec.ts` - 공유 페이지 복제 기능 테스트

## Fixtures

### `projectsPage`
프로젝트 목록 페이지 테스트용 fixture. 세션 및 프로젝트 API가 모킹됩니다.

### `projectDetailPage`
프로젝트 상세 페이지 테스트용 fixture. 세션, 프로젝트, 장소 API가 모킹됩니다.

### `sharePageWithAuth`
공유 페이지 테스트용 fixture. 세션 및 공유 API가 모킹됩니다.

## 테스트 데이터

`fixtures/auth.ts`에서 테스트 데이터를 export합니다:

- `TEST_USER` - 테스트 사용자
- `TEST_PROJECT` - 테스트 프로젝트
- `TEST_PLACES` - 테스트 장소 목록
- `TEST_IMAGES` - 테스트 이미지 목록
- `TEST_SHARE_TOKEN` - 테스트 공유 토큰

## CI/CD

GitHub Actions에서 실행 시:
- 병렬 실행 비활성화 (`workers: 1`)
- 실패 시 2회 재시도
- 스크린샷 자동 저장

## 문제 해결

### 브라우저 설치 오류
```bash
npx playwright install --with-deps
```

### 포트 충돌
개발 서버가 이미 실행 중이면 `reuseExistingServer: true` 설정으로 재사용합니다.

### 타임아웃 오류
`playwright.config.ts`에서 타임아웃 값을 조정하세요:
```typescript
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```
