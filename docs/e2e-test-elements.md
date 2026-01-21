# E2E Test Elements - Playwright 테스트 요소 명세

> 소스 코드 분석을 기반으로 작성된 Playwright E2E 테스트 대상 요소 명세서

---

## 1. 랜딩 페이지 (`/`)

### 페이지 URL
```
http://localhost:3000/
```

### 테스트 가능한 요소들

#### 헤더 영역
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 로고/제목 | `h1:has-text("여행 플래너")` | 앱 타이틀 |
| 로그인 버튼 | `header >> a[href="/login"] >> button:has-text("로그인")` | 헤더 우측 로그인 버튼 |

#### 메인 영역
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 헤드라인 | `h2:has-text("SNS 스크린샷으로")` | 메인 타이틀 |
| 서브 헤드라인 | `text="여행 계획"` | 강조 텍스트 (파란색) |
| 설명 텍스트 | `text="인스타그램, 유튜브, X에서 캡처한"` | 서비스 설명 |
| CTA 버튼 | `a[href="/login"] >> button:has-text("무료로 시작하기")` | 메인 CTA |

#### 기능 소개 카드
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 카드 컨테이너 | `.grid.md\\:grid-cols-3` | 3열 그리드 컨테이너 |
| 스크린샷 업로드 카드 | `div:has-text("스크린샷 업로드")` | 첫 번째 기능 카드 |
| AI 자동 추출 카드 | `div:has-text("AI 자동 추출")` | 두 번째 기능 카드 |
| 지도 시각화 카드 | `div:has-text("지도 시각화")` | 세 번째 기능 카드 |

### 테스트 시나리오

```typescript
// 1. 페이지 로드 확인
test('랜딩 페이지 로드', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('여행 플래너');
  await expect(page.locator('h2')).toContainText('SNS 스크린샷으로');
  await expect(page.getByRole('button', { name: '무료로 시작하기' })).toBeVisible();
});

// 2. 로그인 버튼 네비게이션
test('헤더 로그인 버튼 클릭', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL('/login');
});

// 3. CTA 버튼 네비게이션
test('CTA 버튼 클릭', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '무료로 시작하기' }).click();
  await expect(page).toHaveURL('/login');
});

// 4. 기능 카드 표시 확인
test('기능 소개 카드 3개 표시', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('스크린샷 업로드')).toBeVisible();
  await expect(page.getByText('AI 자동 추출')).toBeVisible();
  await expect(page.getByText('지도 시각화')).toBeVisible();
});
```

---

## 2. 로그인 페이지 (`/login`)

### 페이지 URL
```
http://localhost:3000/login
```

### 테스트 가능한 요소들

#### 로그인 카드
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 카드 컨테이너 | `[data-testid="login-card"]` 또는 `.max-w-md` | 로그인 카드 |
| 카드 제목 | `text="여행 플래너"` (CardTitle 내) | 카드 타이틀 |
| 카드 설명 | `text="SNS 스크린샷을 업로드하면"` | 카드 설명 |
| Google 로그인 버튼 | `button:has-text("Google로 계속하기")` | OAuth 로그인 버튼 |
| 약관 안내 텍스트 | `text="서비스 이용약관"` | 하단 약관 안내 |

### 테스트 시나리오

```typescript
// 1. 페이지 로드 확인
test('로그인 페이지 로드', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('text="여행 플래너"').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
});

// 2. Google 버튼에 Google 아이콘 존재
test('Google 로그인 버튼 아이콘 확인', async ({ page }) => {
  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Google로 계속하기' });
  await expect(button.locator('svg')).toBeVisible();
});

// 3. 약관 텍스트 표시
test('약관 안내 텍스트 표시', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('서비스 이용약관')).toBeVisible();
  await expect(page.getByText('개인정보 처리방침')).toBeVisible();
});

// 4. Google OAuth 리다이렉트 (실제 OAuth는 mock 필요)
test('Google 버튼 클릭 시 OAuth 시작', async ({ page }) => {
  await page.goto('/login');
  // 클릭 후 OAuth URL로 리다이렉트 확인
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Google로 계속하기' }).click()
  ]);
  // Google OAuth URL 확인
  expect(popup.url()).toContain('accounts.google.com');
});
```

---

## 3. 프로젝트 목록 페이지 (`/projects`)

### 페이지 URL
```
http://localhost:3000/projects
```

### 테스트 가능한 요소들

#### 헤더 영역
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 페이지 제목 | `h1:has-text("내 여행 프로젝트")` | 페이지 타이틀 |
| 페이지 설명 | `text="SNS 스크린샷을 업로드하여"` | 서브 타이틀 |
| 새 프로젝트 버튼 | `button:has-text("+ 새 프로젝트")` | 프로젝트 생성 버튼 |

#### 빈 상태
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 빈 상태 컨테이너 | `text="아직 프로젝트가 없습니다"` | 빈 목록 메시지 |
| 안내 텍스트 | `text="첫 번째 여행 프로젝트를 만들어보세요!"` | 안내 메시지 |

#### 프로젝트 카드
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 카드 그리드 | `.grid.md\\:grid-cols-2.lg\\:grid-cols-3` | 카드 컨테이너 |
| 프로젝트 카드 | `[data-testid="project-card"]` 또는 카드 컴포넌트 | 개별 카드 |
| 카드 제목 | `CardTitle` 내 텍스트 | 프로젝트 이름 |
| 여행지 정보 | 카드 내 여행지 텍스트 | 목적지 표시 |
| 장소 수 | `text=/📍.*개 장소/` | 장소 카운트 |
| 이미지 수 | `text=/🖼️.*개 이미지/` | 이미지 카운트 |
| 수정일 | `text=/마지막 수정:/` | 마지막 수정 날짜 |
| 삭제 버튼 | `button:has-text("삭제")` | 프로젝트 삭제 버튼 |

#### 프로젝트 생성 다이얼로그
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 다이얼로그 | `[role="dialog"]` | 모달 컨테이너 |
| 다이얼로그 제목 | `text="새 여행 프로젝트"` | 모달 타이틀 |
| 프로젝트 이름 입력 | `input#name` 또는 `[placeholder*="도쿄 여행"]` | 이름 입력 필드 |
| 여행지 입력 | `input#destination` 또는 `[placeholder*="도쿄"]` | 여행지 입력 필드 |
| 국가 입력 | `input#country` 또는 `[placeholder*="일본"]` | 국가 입력 필드 (선택) |
| 취소 버튼 | `button:has-text("취소")` | 취소 버튼 |
| 생성 버튼 | `button:has-text("생성")` | 생성/제출 버튼 |

### 테스트 시나리오

```typescript
// 1. 인증 체크 (미인증 시 리다이렉트)
test('미인증 사용자 리다이렉트', async ({ page }) => {
  await page.goto('/projects');
  await expect(page).toHaveURL('/login');
});

// 2. 빈 프로젝트 목록 표시
test('빈 프로젝트 목록', async ({ page }) => {
  // 인증된 상태로 설정 필요
  await page.goto('/projects');
  await expect(page.getByText('아직 프로젝트가 없습니다')).toBeVisible();
});

// 3. 새 프로젝트 다이얼로그 열기
test('새 프로젝트 다이얼로그 열기', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: '+ 새 프로젝트' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('새 여행 프로젝트')).toBeVisible();
});

// 4. 필수 필드 검증
test('프로젝트 생성 필수 필드 검증', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: '+ 새 프로젝트' }).click();

  const submitButton = page.getByRole('button', { name: '생성' });
  await expect(submitButton).toBeDisabled();

  await page.fill('input#name', '테스트 프로젝트');
  await expect(submitButton).toBeDisabled();

  await page.fill('input#destination', '도쿄');
  await expect(submitButton).toBeEnabled();
});

// 5. 프로젝트 생성 성공
test('프로젝트 생성', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: '+ 새 프로젝트' }).click();

  await page.fill('input#name', '도쿄 여행 2026');
  await page.fill('input#destination', '도쿄');
  await page.fill('input#country', '일본');
  await page.getByRole('button', { name: '생성' }).click();

  // 토스트 확인
  await expect(page.getByText('프로젝트가 생성되었습니다')).toBeVisible();
  // 다이얼로그 닫힘 확인
  await expect(page.getByRole('dialog')).toBeHidden();
});

// 6. 프로젝트 카드 클릭
test('프로젝트 상세 페이지로 이동', async ({ page }) => {
  await page.goto('/projects');
  // 첫 번째 프로젝트 카드 클릭
  await page.locator('a[href^="/projects/"]').first().click();
  await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+/);
});

// 7. 프로젝트 삭제
test('프로젝트 삭제', async ({ page }) => {
  await page.goto('/projects');

  // confirm 다이얼로그 자동 승인
  page.on('dialog', dialog => dialog.accept());

  await page.getByRole('button', { name: '삭제' }).first().click();
  await expect(page.getByText('프로젝트가 삭제되었습니다')).toBeVisible();
});
```

---

## 4. 프로젝트 상세 페이지 (`/projects/[id]`)

### 페이지 URL
```
http://localhost:3000/projects/{project-id}
```

### 테스트 가능한 요소들

#### 헤더 영역
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 프로젝트 이름 | `h1` (프로젝트 이름) | 프로젝트 타이틀 |
| 여행지 정보 | `h1 + p` | 여행지, 국가 표시 |
| 이미지 분석 버튼 | `button:has-text("이미지 분석")` | 이미지 AI 분석 버튼 |
| 텍스트 분석 버튼 | `button:has-text("텍스트 분석")` | 텍스트 AI 분석 버튼 |
| 공유 버튼 | `button:has-text("공유")` | 공유 모달 열기 버튼 |

#### 지도 영역 (왼쪽)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 지도 컨테이너 | `[data-testid="google-map"]` 또는 Google Maps DOM | 지도 영역 |
| 마커 | Google Maps Marker | 장소 마커들 |
| InfoWindow | Google Maps InfoWindow | 마커 클릭 시 정보창 |
| 상세 정보 보기 링크 | `text="상세 정보 보기 →"` | InfoWindow 내 링크 |

#### 장소 목록 영역 (가운데)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 섹션 제목 | `h2:has-text("장소 목록")` | 장소 목록 타이틀 |
| 카테고리 필터 - 전체 | `button:has-text("전체")` | 전체 필터 버튼 |
| 카테고리 필터 - 맛집 | `button:has-text("맛집")` | 맛집 필터 버튼 |
| 카테고리 필터 - 카페 | `button:has-text("카페")` | 카페 필터 버튼 |
| 카테고리 필터 - 관광지 | `button:has-text("관광지")` | 관광지 필터 버튼 |
| 카테고리 필터 - 쇼핑 | `button:has-text("쇼핑")` | 쇼핑 필터 버튼 |
| 카테고리 필터 - 숙소 | `button:has-text("숙소")` | 숙소 필터 버튼 |
| 빈 목록 메시지 | `text="아직 장소가 없습니다"` | 장소 없을 때 |
| 장소 카드 | 장소 목록 내 카드 요소들 | 개별 장소 카드 |
| 장소 이름 | 카드 내 `h3` | 장소명 |
| 평점 표시 | `text=/★.*\d\.\d/` | 평점 (예: ★ 4.5) |
| 리뷰 수 | `text=/\(\d+\)/` | 리뷰 개수 |
| 코멘트 | 카드 내 코멘트 텍스트 | AI 추출 코멘트 |
| 수정 버튼 | `button:has-text("수정")` | 장소 수정 버튼 |
| 상세 버튼 | `button:has-text("상세")` | 장소 상세 버튼 |
| 삭제 버튼 | `button:has-text("삭제")` | 장소 삭제 버튼 |

#### 입력 탭 영역 (오른쪽)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 이미지 탭 | `button:has-text("이미지")` | 이미지 탭 버튼 |
| 텍스트 탭 | `button:has-text("텍스트")` | 텍스트 탭 버튼 |
| URL 탭 | `button:has-text("URL")` | URL 탭 버튼 |

##### 이미지 업로드 (이미지 탭)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 드래그앤드롭 영역 | `[data-testid="drop-zone"]` 또는 드롭존 컨테이너 | 드롭존 |
| 파일 선택 버튼 | `button:has-text("파일 선택")` | 파일 선택 |
| 파일 입력 | `input#image-upload[type="file"]` | 숨겨진 파일 입력 |
| 업로드 진행률 | 진행 바 요소 | 업로드 프로그레스 |
| 업로드 상태 텍스트 | 상태 메시지 | "이미지 압축 중...", "서버에 업로드 중..." |

##### 텍스트 입력 (텍스트 탭)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 텍스트 영역 | `textarea#text-input` | 텍스트 입력 영역 |
| 글자 수 카운터 | `text=/\d+ \/ 5000자/` | 글자 수 표시 |
| 저장 버튼 | `button:has-text("저장")` | 텍스트 저장 버튼 |

##### URL 입력 (URL 탭)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| URL 입력 필드 | `input#url-input[type="url"]` | URL 입력 필드 |
| 저장 버튼 | `button:has-text("저장")` | URL 저장 버튼 |

#### 텍스트/URL 입력 목록
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 목록 제목 | `h3:has-text("텍스트/URL 입력")` | 섹션 제목 |
| 실패 재시도 버튼 | `button:has-text("실패 재시도")` | 재시도 버튼 |
| 입력 항목 | 목록 내 개별 항목 | 텍스트/URL 항목 |
| 상태 배지 - 대기 | `text="⏳ 대기"` | pending 상태 |
| 상태 배지 - 완료 | `text="✅ 완료"` | processed 상태 |
| 상태 배지 - 실패 | `text="❌ 실패"` | failed 상태 |
| 삭제 버튼 | 항목 내 `button:has-text("삭제")` | 항목 삭제 |

#### 이미지 목록
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 목록 제목 | `h3:has-text("업로드된 이미지")` | 섹션 제목 |
| 상태 배지 - 대기 | `text=/대기 \d+/` | pending 카운트 |
| 상태 배지 - 완료 | `text=/완료 \d+/` | processed 카운트 |
| 상태 배지 - 실패 | `text=/실패 \d+/` | failed 카운트 |
| 이미지 썸네일 | 이미지 요소들 | 업로드된 이미지 |
| 재분석 링크 | `text="실패한 이미지 재분석 시도"` | 재분석 버튼 |

#### 공유 모달
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 모달 | `[role="dialog"]` | 공유 모달 |
| 모달 제목 | `text="프로젝트 공유"` | 모달 타이틀 |
| 공유 토글 | `[role="switch"]` 또는 `#share-toggle` | 공유 ON/OFF 스위치 |
| 공유 URL 입력 | 공유 URL이 표시되는 입력 필드 | 읽기 전용 URL |
| 복사 버튼 | 복사 아이콘 버튼 | 클립보드 복사 |
| 경고 메시지 | 경고 박스 | 공유 경고 안내 |

#### 장소 수정 모달
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 모달 | `[role="dialog"]` | 수정 모달 |
| 모달 제목 | `text="장소 수정"` | 모달 타이틀 |
| 장소명 입력 | `input#name` | 장소 이름 입력 |
| 카테고리 선택 | `[role="combobox"]` 또는 Select | 카테고리 드롭다운 |
| 코멘트 입력 | `input#comment` | 코멘트 입력 |
| 현재 위치 표시 | `text="현재 위치:"` 뒤 텍스트 | 현재 주소 |
| 위치 재검색 버튼 | `button:has-text("위치가 잘못되었나요?")` | 재검색 펼치기 |
| 새 위치 검색 입력 | `input#searchQuery` | 위치 검색 입력 |
| 검색 버튼 | `button:has-text("검색")` | 위치 검색 실행 |
| 취소 버튼 | `button:has-text("취소")` | 취소 |
| 저장 버튼 | `button:has-text("저장")` | 저장 |

#### 장소 상세 패널 (오른쪽 슬라이드)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 패널 컨테이너 | 고정 위치 패널 | 상세 패널 |
| 닫기 버튼 | `button:has-text("×")` | 패널 닫기 |
| 장소명 | 패널 내 `h2` | 장소 이름 |
| 평점 | `text=/★ \d\.\d/` | 평점 표시 |
| 리뷰 수 | `text=/\(\d+\)/` | 리뷰 카운트 |
| 가격대 | `text=/₩+/` | 가격 레벨 |
| 카테고리 배지 | 카테고리 표시 요소 | 카테고리 |
| 사진 슬라이더 | 사진 영역 | 장소 사진들 |
| 영업 상태 | `text="영업 중"` 또는 `text="영업 종료"` | 현재 영업 상태 |
| 영업시간 토글 | `button:has-text("영업시간")` | 영업시간 펼치기/접기 |
| 주소 | `text=/📍/` 뒤 주소 텍스트 | 주소 정보 |
| 전화번호 | `text=/📞/` 뒤 전화번호 링크 | 전화번호 |
| 웹사이트 | `text="웹사이트"` 링크 | 웹사이트 링크 |
| AI 팁 | 팁 박스 | AI 추출 코멘트 |
| 리뷰 섹션 | `h3:has-text("리뷰")` | 리뷰 영역 |
| Google Maps 버튼 | `button:has-text("구글 지도에서 보기")` 또는 링크 | 외부 링크 |

### 테스트 시나리오

```typescript
// 1. 페이지 로드
test('프로젝트 상세 페이지 로드', async ({ page }) => {
  await page.goto('/projects/test-project-id');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByText('지도 로딩 중...')).not.toBeVisible({ timeout: 10000 });
});

// 2. 입력 탭 전환
test('입력 탭 전환', async ({ page }) => {
  await page.goto('/projects/test-project-id');

  // 텍스트 탭 클릭
  await page.getByRole('button', { name: '📝 텍스트' }).click();
  await expect(page.locator('textarea#text-input')).toBeVisible();

  // URL 탭 클릭
  await page.getByRole('button', { name: '🔗 URL' }).click();
  await expect(page.locator('input#url-input')).toBeVisible();

  // 이미지 탭 클릭
  await page.getByRole('button', { name: '📸 이미지' }).click();
  await expect(page.getByText('파일 선택')).toBeVisible();
});

// 3. 이미지 업로드
test('이미지 드래그앤드롭 업로드', async ({ page }) => {
  await page.goto('/projects/test-project-id');

  // 파일 업로드 시뮬레이션
  const fileInput = page.locator('input#image-upload');
  await fileInput.setInputFiles('test-image.jpg');

  // 업로드 진행 확인
  await expect(page.getByText('이미지 압축 중...')).toBeVisible();
  await expect(page.getByText('업로드 완료')).toBeVisible({ timeout: 30000 });
});

// 4. 텍스트 입력
test('텍스트 입력 저장', async ({ page }) => {
  await page.goto('/projects/test-project-id');
  await page.getByRole('button', { name: '📝 텍스트' }).click();

  await page.fill('textarea#text-input', '도쿄 시부야에 있는 하치공 동상 근처 맛집 추천');
  await page.getByRole('button', { name: '저장' }).click();

  await expect(page.getByText('저장되었습니다')).toBeVisible();
});

// 5. 카테고리 필터링
test('카테고리 필터링', async ({ page }) => {
  await page.goto('/projects/test-project-id');

  await page.getByRole('button', { name: /맛집/ }).click();
  // 맛집 카테고리 장소만 표시되는지 확인
});

// 6. 장소 선택
test('장소 선택 시 지도 연동', async ({ page }) => {
  await page.goto('/projects/test-project-id');

  // 첫 번째 장소 카드 클릭
  await page.locator('.rounded-lg.border.cursor-pointer').first().click();

  // 선택 상태 확인 (파란색 테두리)
  await expect(page.locator('.border-blue-500')).toBeVisible();
});

// 7. 장소 상세 패널 열기
test('장소 상세 패널', async ({ page }) => {
  await page.goto('/projects/test-project-id');

  await page.getByRole('button', { name: '상세' }).first().click();

  // 패널 열림 확인
  await expect(page.getByText('구글 지도에서 보기')).toBeVisible();
});

// 8. 공유 모달
test('공유 모달 열기 및 토글', async ({ page }) => {
  await page.goto('/projects/test-project-id');

  await page.getByRole('button', { name: '공유' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('프로젝트 공유')).toBeVisible();

  // 공유 토글 켜기
  await page.locator('[role="switch"]').click();
  await expect(page.getByText('공유가 활성화되었습니다')).toBeVisible();
});

// 9. AI 분석 버튼
test('이미지 분석 실행', async ({ page }) => {
  await page.goto('/projects/test-project-id');

  // pending 이미지가 있을 때만 버튼 표시
  const analyzeButton = page.getByRole('button', { name: /이미지 분석/ });
  if (await analyzeButton.isVisible()) {
    await analyzeButton.click();
    await expect(page.getByText('처리 중...')).toBeVisible();
    await expect(page.getByText(/처리 완료/)).toBeVisible({ timeout: 60000 });
  }
});
```

---

## 5. 공유 페이지 (`/s/[token]`)

### 페이지 URL
```
http://localhost:3000/s/{share-token}
```

### 테스트 가능한 요소들

#### 로딩 상태
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 로딩 스피너 | `animate-spin` 클래스 요소 | 로딩 인디케이터 |
| 로딩 텍스트 | `text="로딩 중..."` | 로딩 메시지 |

#### 에러 상태
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 에러 아이콘 | 에러 아이콘 컨테이너 | 빨간색 에러 아이콘 |
| 에러 제목 | `h1:has-text("페이지를 찾을 수 없습니다")` | 에러 타이틀 |
| 에러 메시지 | 에러 설명 텍스트 | 상세 에러 메시지 |

#### 헤더 영역
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 프로젝트 이름 | `header h1` | 프로젝트 타이틀 |
| 여행지 정보 | `header h1 + p` | 여행지, 국가 |
| 공유 배지 | `text="공유된 여행 계획"` | 공유 페이지 표시 배지 |
| 복사 버튼 | `button:has-text("내 프로젝트로 복사")` | 프로젝트 복사 버튼 |

#### 지도 영역
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 지도 컨테이너 | Google Maps 컨테이너 | 지도 영역 |
| 마커 | Google Maps 마커 | 장소 마커들 |

#### 장소 목록 영역
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 섹션 제목 | `h2:has-text("장소 목록")` | 목록 타이틀 |
| 카테고리 필터 버튼들 | 카테고리 버튼 그룹 | 필터 버튼들 |
| 장소 카드 | 장소 목록 내 카드들 | 장소 정보 카드 |
| 장소명 | 카드 내 `h3` | 장소 이름 |
| 평점 | `text=/★ \d\.\d/` | 평점 |
| 코멘트 | 카드 내 코멘트 | AI 코멘트 |
| 주소 | 카드 내 주소 텍스트 | 주소 정보 |
| 상세 버튼 | `button:has-text("상세")` | 상세 패널 열기 |
| Google Maps 링크 | `text="Google Maps에서 보기 →"` | 외부 링크 |

#### 장소 상세 패널 (읽기 전용)
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 패널 컨테이너 | 고정 위치 패널 | 상세 패널 |
| 닫기 버튼 | 닫기 버튼 | 패널 닫기 |
| 장소 정보 | 상세 정보 요소들 | 장소 상세 (수정/삭제 없음) |

#### 푸터
| 요소 | Selector 제안 | 설명 |
|------|--------------|------|
| 푸터 텍스트 | `footer` 내 텍스트 | "Travel Planner로 만든 여행 계획입니다." |

### 테스트 시나리오

```typescript
// 1. 유효한 공유 링크 접속
test('공유 페이지 로드', async ({ page }) => {
  await page.goto('/s/valid-share-token');

  // 로딩 완료 후 콘텐츠 표시
  await expect(page.getByText('로딩 중...')).not.toBeVisible({ timeout: 10000 });
  await expect(page.locator('header h1')).toBeVisible();
  await expect(page.getByText('공유된 여행 계획')).toBeVisible();
});

// 2. 유효하지 않은 토큰
test('유효하지 않은 공유 토큰', async ({ page }) => {
  await page.goto('/s/invalid-token-12345');

  await expect(page.getByText('페이지를 찾을 수 없습니다')).toBeVisible();
});

// 3. 카테고리 필터링
test('공유 페이지 카테고리 필터', async ({ page }) => {
  await page.goto('/s/valid-share-token');

  await page.getByRole('button', { name: /맛집/ }).click();
  // 필터링 확인
});

// 4. 장소 카드 클릭
test('장소 선택', async ({ page }) => {
  await page.goto('/s/valid-share-token');

  await page.locator('.rounded-lg.border.cursor-pointer').first().click();
  await expect(page.locator('.border-blue-500')).toBeVisible();
});

// 5. 장소 상세 패널 (읽기 전용)
test('장소 상세 패널 - 읽기 전용', async ({ page }) => {
  await page.goto('/s/valid-share-token');

  await page.getByRole('button', { name: '상세' }).first().click();

  // 패널 열림 확인
  await expect(page.getByText('구글 지도에서 보기')).toBeVisible();

  // 수정/삭제 버튼 없음 확인
  await expect(page.getByRole('button', { name: '수정' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: '삭제' })).not.toBeVisible();
});

// 6. 비로그인 사용자 복사 시도
test('비로그인 사용자 복사 시도', async ({ page }) => {
  await page.goto('/s/valid-share-token');

  await page.getByRole('button', { name: '내 프로젝트로 복사' }).click();

  await expect(page.getByText('로그인이 필요합니다')).toBeVisible();
  await expect(page).toHaveURL('/login');
});

// 7. 로그인 사용자 복사
test('프로젝트 복사 성공', async ({ page }) => {
  // 인증된 상태로 설정 필요
  await page.goto('/s/valid-share-token');

  await page.getByRole('button', { name: '내 프로젝트로 복사' }).click();

  await expect(page.getByText('복사 중...')).toBeVisible();
  await expect(page.getByText(/프로젝트가 복사되었습니다/)).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+/);
});

// 8. Google Maps 외부 링크
test('Google Maps 링크 열기', async ({ page, context }) => {
  await page.goto('/s/valid-share-token');

  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByText('Google Maps에서 보기 →').first().click()
  ]);

  expect(newPage.url()).toContain('google.com/maps');
});
```

---

## 테스트 유틸리티 및 설정

### Playwright 설정 파일 (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 인증 헬퍼 (`e2e/helpers/auth.ts`)

```typescript
import { Page } from '@playwright/test';

export async function loginAsTestUser(page: Page) {
  // NextAuth 세션 쿠키 설정 또는 mock 사용
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/',
    }
  ]);
}

export async function setupAuthenticatedPage(page: Page) {
  await loginAsTestUser(page);
}
```

### 테스트 데이터 fixture (`e2e/fixtures/test-data.ts`)

```typescript
export const testProject = {
  id: 'test-project-id',
  name: '도쿄 여행 2026',
  destination: '도쿄',
  country: '일본',
};

export const testPlace = {
  id: 'test-place-id',
  name: '하치공 동상',
  category: 'attraction',
  latitude: 35.6590,
  longitude: 139.7006,
};

export const validShareToken = 'valid-share-token-uuid';
```

---

## 요약

| 페이지 | 주요 테스트 요소 수 | 우선순위 |
|--------|-------------------|---------|
| 랜딩 페이지 (`/`) | 8개 | P2 |
| 로그인 페이지 (`/login`) | 5개 | P1 |
| 프로젝트 목록 (`/projects`) | 15개 | P0 |
| 프로젝트 상세 (`/projects/[id]`) | 50+개 | P0 |
| 공유 페이지 (`/s/[token]`) | 20개 | P1 |

**총 테스트 요소: 약 100개**
