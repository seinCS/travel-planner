# 여행 일정(Itinerary) 기능 요구사항 명세서

> **작성일**: 2026-01-23
> **상태**: 요구사항 정의 완료
> **다음 단계**: 아키텍처 설계 (`/sc:design`)

---

## 1. 개요

### 1.1 목표
프로젝트에 저장된 장소들을 날짜별로 배치하여 여행 일정을 계획하고, 그룹 멤버와 실시간으로 협업하며, 완성된 일정을 공유하는 기능

### 1.2 핵심 결정 사항

| 항목 | 결정 |
|-----|-----|
| **타겟 사용자** | 그룹 여행 (실시간 협업) |
| **AI 기능** | 미포함 (수동 편집 사용성 극대화) |
| **플랫폼** | 반응형 동등 지원 (데스크톱/모바일) |
| **프로젝트:일정** | 1:1 관계, 별도 생성 |
| **실시간 동기화** | 필수 (Supabase Realtime) |
| **멤버 역할** | 소유자/멤버 2단계 |
| **충돌 처리** | 마지막 수정 우선 (Last-Write-Wins) |

---

## 2. 기능 요구사항

### 2.1 일정 생성

**사용자 스토리:**
> "여행자로서, 여행 날짜를 선택하면 자동으로 Day가 생성되어 일정 계획을 시작할 수 있다"

**수락 기준:**
- [ ] 시작일 ~ 종료일 날짜 선택 (Date Range Picker)
- [ ] 선택된 날짜에 따라 Day1, Day2, ... DayN 자동 생성
- [ ] 각 Day에 실제 날짜 표시 (예: Day1 - 3월 15일 토)
- [ ] 일정 제목 입력 (선택)

---

### 2.2 타임라인 UI

**사용자 스토리:**
> "여행자로서, 세로 타임라인에서 장소 순서를 드래그로 직관적으로 변경할 수 있다"

**UI 구조:**
```
┌─────────────────────────────────────────────────────────┐
│  📅 도쿄 여행 일정 (3/15 - 3/18)                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✈️ 항공편                              [+ 항공 추가]    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🛫 인천 → 도쿄 나리타  |  3/15 09:00            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🏨 숙소                                [+ 숙소 추가]    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏨 시부야 엑셀 호텔 도큐 (3/15~3/18, 3박)       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Day1] [Day2] [Day3] [Day4]                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Day 1 - 3월 15일 (토)                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⋮⋮ 센소지 (10:00)                               │   │
│  │    📍 도쿄 아사쿠사                              │   │
│  └─────────────────────────────────────────────────┘   │
│           │                                             │
│           ▼                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⋮⋮ 스카이트리                                   │   │
│  └─────────────────────────────────────────────────┘   │
│           │                                             │
│           ▼                                             │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │ 🏨 시부야 엑셀 호텔 도큐 (자동 표시)            │   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                         │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │  + 장소 추가                                    │   │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**수락 기준:**
- [ ] 세로 타임라인 레이아웃
- [ ] Day 탭으로 날짜 전환
- [ ] 장소 카드 드래그앤드롭으로 순서 변경
- [ ] 같은 Day 내 순서 변경
- [ ] Day 간 장소 이동 (드래그로 다른 Day 탭에 드롭)
- [ ] 반응형: 모바일에서도 터치 드래그 지원

---

### 2.3 장소 추가

**사용자 스토리:**
> "여행자로서, 프로젝트에 저장된 장소를 타임라인으로 드래그하여 일정에 추가할 수 있다"

**수락 기준:**
- [ ] 사이드패널에 저장된 장소 목록 표시
- [ ] 장소 목록에서 타임라인으로 드래그앤드롭
- [ ] 이미 일정에 추가된 장소는 표시 구분 (체크 또는 흐리게)
- [ ] 같은 장소 여러 Day에 추가 가능 (예: 호텔)

---

### 2.4 시간 설정 (선택적)

**사용자 스토리:**
> "여행자로서, 필요한 경우 특정 장소에 방문 시간을 지정할 수 있다"

**수락 기준:**
- [ ] 기본: 순서만 관리 (시간 표시 없음)
- [ ] 장소 카드 클릭 → 시간 입력 옵션 표시
- [ ] 시간 입력 시 타임라인에 시간 표시
- [ ] 시간이 있는 장소와 없는 장소 혼용 가능

---

### 2.5 Day별 지도 연동

**사용자 스토리:**
> "여행자로서, Day 탭을 선택하면 해당 날짜의 장소만 지도에서 확인할 수 있다"

**수락 기준:**
- [ ] Day 탭 선택 시 해당 Day 장소만 지도에 마커 표시
- [ ] 마커에 방문 순서 번호 표시 (1, 2, 3...)
- [ ] 마커 클릭 시 장소 정보 표시
- [ ] 지도 자동 줌/센터 조정 (해당 Day 장소들이 보이도록)

---

### 2.6 항공편 관리

**사용자 스토리:**
> "여행자로서, 항공편 정보를 등록하여 여행 일정과 함께 관리할 수 있다"

**수락 기준:**
- [ ] 항공편 추가/수정/삭제
- [ ] 저장 필드: 출발지, 도착지, 날짜/시간, 항공사 (선택), 편명 (선택)
- [ ] 일정 상단 별도 섹션에 표시
- [ ] 메모 필드 지원

---

### 2.7 숙소 관리

**사용자 스토리:**
> "여행자로서, 숙소 정보를 등록하면 해당 날짜 일정 끝에 자동으로 표시된다"

**수락 기준:**
- [ ] 숙소 추가/수정/삭제
- [ ] 저장 필드: 숙소명, 주소, 체크인/체크아웃 날짜, 좌표 (선택)
- [ ] 일정 상단 별도 섹션에 표시
- [ ] 해당 날짜 Day 끝에 숙소 자동 표시 (점선 박스)
- [ ] 메모 필드 지원

---

### 2.8 그룹 협업

#### 멤버십 관리

**사용자 스토리:**
> "여행자로서, 초대 링크를 통해 친구를 프로젝트에 초대하고 함께 일정을 편집할 수 있다"

**수락 기준:**
- [ ] 초대 링크 생성 (모든 멤버 가능)
- [ ] 초대 링크 재사용 가능 (여러 명 초대)
- [ ] 초대 수락 시 멤버로 추가 (로그인 필수)
- [ ] 멤버 목록 조회
- [ ] 멤버 나가기 (본인)
- [ ] 멤버 내보내기 (소유자만)
- [ ] 소유권 이전 (소유자만)

#### 권한 매트릭스

| 기능 | 소유자 | 멤버 |
|-----|-------|-----|
| 일정/장소 편집 | ✅ | ✅ |
| 멤버 초대 | ✅ | ✅ |
| 멤버 내보내기 | ✅ | ❌ |
| 프로젝트 삭제 | ✅ | ❌ |
| 공유 설정 | ✅ | ✅ |
| 소유권 이전 | ✅ | ❌ |
| 나가기 | ❌ | ✅ |

#### 실시간 동기화

**사용자 스토리:**
> "여행자로서, 다른 멤버의 변경 사항이 실시간으로 반영되어 동시에 편집할 수 있다"

**수락 기준:**
- [ ] Supabase Realtime으로 실시간 동기화
- [ ] 상단에 현재 접속 중인 멤버 아바타 표시
- [ ] 마지막 수정 우선 (충돌 처리)
- [ ] 변경 즉시 UI 업데이트

---

### 2.9 일정 공유

**사용자 스토리:**
> "여행자로서, 완성된 일정을 링크로 공유하여 다른 사람에게 보여줄 수 있다"

**수락 기준:**
- [ ] 기존 `/s/[token]` 공유 페이지 확장
- [ ] 공유 페이지에서 일정 타임라인 + 지도 읽기 전용 표시
- [ ] Day 탭 전환 기능 유지
- [ ] 항공편/숙소 정보 포함
- [ ] "이 일정 복제하기" 버튼 (로그인 필요)

---

## 3. 비기능 요구사항

### 3.1 성능
- 드래그앤드롭 60fps 유지
- Day 전환 시 지도 업데이트 200ms 이내
- 실시간 동기화 지연 < 500ms

### 3.2 반응형 UI

| 화면 | 레이아웃 |
|-----|---------|
| 데스크톱 | 3단 구성: 장소목록 \| 타임라인 \| 지도 |
| 태블릿 | 2단 구성: 타임라인 \| 지도 (장소목록 토글) |
| 모바일 | 탭 전환: 타임라인 ↔ 지도 |

### 3.3 데이터 자동 저장
- 변경 시 자동 저장 (debounce 500ms)
- 저장 상태 표시 ("저장됨", "저장 중...")
- 실시간 동기화로 다른 멤버에게 전파

---

## 4. 데이터 모델

### 4.1 새로 추가할 테이블

```prisma
// ========== 프로젝트 멤버십 ==========

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      String   @default("member")  // "owner" | "member"

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  joinedAt  DateTime @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

// ========== 일정 ==========

model Itinerary {
  id          String         @id @default(cuid())
  projectId   String         @unique
  title       String?
  startDate   DateTime
  endDate     DateTime

  project     Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  days        ItineraryDay[]
  flights     Flight[]
  accommodations Accommodation[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([projectId])
}

model ItineraryDay {
  id           String          @id @default(cuid())
  itineraryId  String
  dayNumber    Int
  date         DateTime

  itinerary    Itinerary       @relation(fields: [itineraryId], references: [id], onDelete: Cascade)
  items        ItineraryItem[]

  @@unique([itineraryId, dayNumber])
  @@index([itineraryId])
}

model ItineraryItem {
  id         String        @id @default(cuid())
  dayId      String
  placeId    String
  order      Int
  startTime  String?
  note       String?

  day        ItineraryDay  @relation(fields: [dayId], references: [id], onDelete: Cascade)
  place      Place         @relation(fields: [placeId], references: [id], onDelete: Cascade)

  @@unique([dayId, order])
  @@index([dayId])
  @@index([placeId])
}

// ========== 항공편 ==========

model Flight {
  id            String    @id @default(cuid())
  itineraryId   String
  departureCity String
  arrivalCity   String
  airline       String?
  flightNumber  String?
  departureDate DateTime
  arrivalDate   DateTime?
  note          String?

  itinerary     Itinerary @relation(fields: [itineraryId], references: [id], onDelete: Cascade)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([itineraryId])
}

// ========== 숙소 ==========

model Accommodation {
  id            String    @id @default(cuid())
  itineraryId   String
  name          String
  address       String?
  latitude      Float?
  longitude     Float?
  checkIn       DateTime
  checkOut      DateTime
  note          String?

  itinerary     Itinerary @relation(fields: [itineraryId], references: [id], onDelete: Cascade)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([itineraryId])
}
```

### 4.2 기존 모델 수정

```prisma
model Project {
  // 기존 필드 유지...

  // 공유/초대 링크 분리
  shareToken    String?   @unique  // 읽기 전용 공유
  shareEnabled  Boolean   @default(false)
  inviteToken   String?   @unique  // 편집 권한 초대
  inviteEnabled Boolean   @default(false)

  // 관계 추가
  members     ProjectMember[]
  itinerary   Itinerary?
}

model User {
  // 기존 필드 유지...

  memberOf    ProjectMember[]
}

model Place {
  // 기존 필드 유지...

  itineraryItems  ItineraryItem[]
}
```

---

## 5. API 설계 (초안)

### 5.1 일정 API

```
GET    /api/projects/[id]/itinerary       → 일정 조회 (days, items, flights, accommodations 포함)
POST   /api/projects/[id]/itinerary       → 일정 생성 (startDate, endDate)
PUT    /api/projects/[id]/itinerary       → 일정 수정 (날짜 변경)
DELETE /api/projects/[id]/itinerary       → 일정 삭제

POST   /api/itinerary/[id]/items          → 일정 항목 추가 (placeId, dayId, order)
PUT    /api/itinerary/items/[id]          → 항목 수정 (order, startTime, note)
DELETE /api/itinerary/items/[id]          → 항목 삭제

PUT    /api/itinerary/[id]/reorder        → 항목 순서 일괄 변경 (드래그앤드롭)
```

### 5.2 항공/숙소 API

```
POST   /api/itinerary/[id]/flights        → 항공편 추가
PUT    /api/itinerary/flights/[id]        → 항공편 수정
DELETE /api/itinerary/flights/[id]        → 항공편 삭제

POST   /api/itinerary/[id]/accommodations → 숙소 추가
PUT    /api/itinerary/accommodations/[id] → 숙소 수정
DELETE /api/itinerary/accommodations/[id] → 숙소 삭제
```

### 5.3 멤버십 API

```
GET    /api/projects/[id]/members         → 멤버 목록
POST   /api/projects/[id]/invite          → 초대 링크 생성/갱신
DELETE /api/projects/[id]/invite          → 초대 링크 비활성화
DELETE /api/projects/[id]/members/[userId]→ 멤버 내보내기
POST   /api/projects/[id]/leave           → 나가기
POST   /api/projects/[id]/transfer        → 소유권 이전

GET    /api/invite/[token]                → 초대 정보 조회
POST   /api/invite/[token]/accept         → 초대 수락
```

### 5.4 공유 API (확장)

```
GET    /api/shared/[token]                → 기존 + itinerary 포함
```

### 5.5 실시간 채널

```
Supabase Realtime Channel: project:{projectId}

Events:
- itinerary:update
- item:create / item:update / item:delete
- flight:create / flight:update / flight:delete
- accommodation:create / accommodation:update / accommodation:delete
- presence:sync (접속자 동기화)
```

---

## 6. 링크 체계

```
공유 링크 (읽기 전용)
/s/[shareToken]
→ 비로그인 가능
→ 일정+장소+지도 읽기 전용
→ "이 일정 복제하기" 버튼

초대 링크 (편집 권한)
/invite/[inviteToken]
→ 로그인 필수
→ 수락 시 멤버로 추가
→ 프로젝트 대시보드로 이동
```

---

## 7. 화면 흐름

```
프로젝트 상세 페이지
    │
    ├── [입력 탭] (기존: 이미지/텍스트/URL)
    ├── [장소 탭] (기존)
    │
    └── [일정 탭] ← 새로 추가
            │
            ├── 일정 없음 → "일정 만들기" 버튼
            │                    │
            │                    ▼
            │              날짜 선택 모달
            │                    │
            │                    ▼
            └── 일정 있음 → 타임라인 + 지도 뷰
                                │
                                ├── 항공/숙소 섹션
                                ├── Day 탭 전환
                                ├── 장소 드래그앤드롭
                                ├── 접속자 표시
                                └── 공유/초대 버튼

초대 수락 페이지
/invite/[token]
    │
    ├── 비로그인 → 로그인 페이지 → 초대 수락 → 프로젝트 이동
    └── 로그인 상태 → 초대 수락 → 프로젝트 이동
```

---

## 8. MVP 기능 목록

| 카테고리 | 기능 | 상태 |
|---------|-----|-----|
| **일정** | 일정 CRUD (날짜 선택 → Day 생성) | ✅ MVP |
| | 세로 타임라인, Day 탭 | ✅ MVP |
| | 드래그앤드롭 (순서/Day 간 이동) | ✅ MVP |
| | 장소 추가 (기존 Place에서 드래그) | ✅ MVP |
| | 선택적 시간 입력 | ✅ MVP |
| **지도** | Day별 마커 필터링 | ✅ MVP |
| **항공/숙소** | 항공편 관리 (기본 정보) | ✅ MVP |
| | 숙소 관리 (Day 끝 자동 표시) | ✅ MVP |
| **협업** | 초대 링크 (멤버 추가) | ✅ MVP |
| | 실시간 동기화 (Supabase Realtime) | ✅ MVP |
| | 현재 접속자 표시 | ✅ MVP |
| | 멤버 나가기/내보내기 | ✅ MVP |
| **공유** | 공유 링크 (읽기 전용) | ✅ MVP |
| | 일정 복제 | ✅ MVP |

---

## 9. 미포함 사항 (Phase 2 이후)

| 기능 | 이유 |
|-----|-----|
| AI 일정 자동 생성 | 사용자 결정: 수동 편집 집중 |
| 이동 시간/경로 표시 | MVP 범위 외 |
| 예산 관리 | MVP 범위 외 |
| 날씨 연동 | MVP 범위 외 |
| 일정 카드 이미지 생성 | MVP 범위 외 |
| 댓글/투표 기능 | MVP 범위 외 |

---

## 10. 참고 사항

### 10.1 기존 시스템 통합 포인트

- **Project.shareToken**: 기존 공유 기능 유지, 일정도 함께 공유
- **Place**: 기존 장소 데이터 직접 참조 (FK)
- **Supabase Storage**: 기존 이미지 저장소 유지
- **NextAuth**: 기존 인증 시스템 유지

### 10.2 삭제 정책

- **프로젝트 삭제**: 소유자만 가능, 모든 멤버에게 삭제됨
- **Place 삭제**: Cascade → 해당 ItineraryItem도 삭제
- **멤버 나가기**: 본인만 접근 불가, 프로젝트 유지
