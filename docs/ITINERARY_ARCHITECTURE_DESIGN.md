# 여행 일정(Itinerary) 기능 아키텍처 설계서

> **작성일**: 2026-01-23
> **기반 문서**: `docs/ITINERARY_REQUIREMENTS.md`
> **기존 아키텍처**: `docs/CLEAN_ARCHITECTURE_DESIGN.md`
> **다음 단계**: 구현 (`/sc:implement`)

---

## 1. 설계 개요

### 1.1 목표
기존 Clean Architecture 패턴을 따르면서 일정(Itinerary), 협업(Collaboration), 실시간 동기화(Realtime) 기능을 추가합니다.

### 1.2 핵심 설계 원칙
- **기존 패턴 준수**: `domain/`, `application/`, `infrastructure/`, `hooks/` 계층 구조 유지
- **점진적 확장**: 기존 코드 수정 최소화, 새 모듈 추가 방식
- **실시간 우선**: Supabase Realtime을 핵심 인프라로 활용

---

## 2. 시스템 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Client (Browser)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                    React Components (app/)                        │  │
│   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐  │  │
│   │  │ItineraryTab │ │ Timeline    │ │ DayMap      │ │ Members    │  │  │
│   │  │             │ │             │ │             │ │ Presence   │  │  │
│   │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘  │  │
│   └──────────────────────────┬───────────────────────────────────────┘  │
│                              │                                          │
│   ┌──────────────────────────┴───────────────────────────────────────┐  │
│   │                    Custom Hooks (hooks/)                          │  │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │  │
│   │  │useItinerary  │ │useMembers    │ │useRealtimeSync           │  │  │
│   │  │useDayPlaces  │ │useInvite     │ │usePresence               │  │  │
│   │  └──────────────┘ └──────────────┘ └──────────────────────────┘  │  │
│   └──────────────────────────┬───────────────────────────────────────┘  │
│                              │                                          │
│   ┌──────────────────────────┴───────────────────────────────────────┐  │
│   │                 API Client (infrastructure/api-client/)           │  │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │  │
│   │  │itinerary.api │ │members.api   │ │SupabaseRealtimeClient    │  │  │
│   │  └──────────────┘ └──────────────┘ └──────────────────────────┘  │  │
│   └──────────────────────────┬───────────────────────────────────────┘  │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Network Layer     │
                    │  HTTP / WebSocket   │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                            Server                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │                    API Routes (app/api/)                           │  │
│   │  ┌──────────────────────┐ ┌──────────────────────┐                 │  │
│   │  │projects/[id]/        │ │invite/[token]/       │                 │  │
│   │  │  itinerary/          │ │  route.ts            │                 │  │
│   │  │  members/            │ │  accept/route.ts     │                 │  │
│   │  └──────────────────────┘ └──────────────────────┘                 │  │
│   └───────────────────────────┬───────────────────────────────────────┘  │
│                               │                                          │
│   ┌───────────────────────────┴───────────────────────────────────────┐  │
│   │               Application Layer (application/)                     │  │
│   │  ┌────────────────────────┐ ┌────────────────────────────────────┐ │  │
│   │  │ItineraryUseCases      │ │MembershipUseCases                  │ │  │
│   │  │- CreateItinerary      │ │- InviteMember                      │ │  │
│   │  │- AddItemToDay         │ │- AcceptInvite                      │ │  │
│   │  │- ReorderItems         │ │- RemoveMember                      │ │  │
│   │  │- ManageFlights        │ │- TransferOwnership                 │ │  │
│   │  │- ManageAccommodations │ └────────────────────────────────────┘ │  │
│   │  └────────────────────────┘                                        │  │
│   └───────────────────────────┬───────────────────────────────────────┘  │
│                               │                                          │
│   ┌───────────────────────────┴───────────────────────────────────────┐  │
│   │               Domain Layer (domain/)                               │  │
│   │  ┌────────────────────────┐ ┌────────────────────────────────────┐ │  │
│   │  │interfaces/             │ │value-objects/                      │ │  │
│   │  │- IItineraryRepository  │ │- MemberRole                        │ │  │
│   │  │- IMemberRepository     │ │- InviteStatus                      │ │  │
│   │  │- IFlightRepository     │ │- DayNumber                         │ │  │
│   │  │- IAccommodationRepo    │ └────────────────────────────────────┘ │  │
│   │  └────────────────────────┘                                        │  │
│   └───────────────────────────┬───────────────────────────────────────┘  │
│                               │                                          │
│   ┌───────────────────────────┴───────────────────────────────────────┐  │
│   │           Infrastructure Layer (infrastructure/)                   │  │
│   │  ┌────────────────────────┐ ┌────────────────────────────────────┐ │  │
│   │  │repositories/           │ │services/                           │ │  │
│   │  │- PrismaItineraryRepo   │ │- RealtimeBroadcastService          │ │  │
│   │  │- PrismaMemberRepo      │ │- PresenceService                   │ │  │
│   │  │- PrismaFlightRepo      │ └────────────────────────────────────┘ │  │
│   │  │- PrismaAccommodationRepo│                                       │  │
│   │  └────────────────────────┘                                        │  │
│   └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │                External Services                                   │  │
│   │  ┌────────────────┐ ┌────────────────┐                             │  │
│   │  │ PostgreSQL     │ │ Supabase       │                             │  │
│   │  │ (via Prisma)   │ │ Realtime       │                             │  │
│   │  └────────────────┘ └────────────────┘                             │  │
│   └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 스키마 설계

### 3.1 ER 다이어그램

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Project     │       │  ProjectMember  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id         PK   │◄──────│ userId     FK   │       │ id         PK   │
│ email           │       │ id         PK   │◄──────│ projectId  FK   │
│ name            │       │ name            │       │ userId     FK   │──►
│ image           │       │ destination     │       │ role            │
│ ...             │       │ country         │       │ joinedAt        │
└─────────────────┘       │ shareToken      │       └─────────────────┘
        │                 │ shareEnabled    │               │
        │                 │ inviteToken     │◄──────────────┘
        │                 │ inviteEnabled   │
        │                 └────────┬────────┘
        │                          │
        │                          │ 1:1
        │                          ▼
        │                 ┌─────────────────┐
        │                 │   Itinerary     │
        │                 ├─────────────────┤
        │                 │ id         PK   │
        │                 │ projectId  FK   │ UNIQUE
        │                 │ title           │
        │                 │ startDate       │
        │                 │ endDate         │
        │                 └────────┬────────┘
        │                          │
        │          ┌───────────────┼───────────────┐
        │          │               │               │
        │          ▼               ▼               ▼
        │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  │ItineraryDay  │ │   Flight     │ │Accommodation │
        │  ├──────────────┤ ├──────────────┤ ├──────────────┤
        │  │ id       PK  │ │ id       PK  │ │ id       PK  │
        │  │ itineraryId  │ │ itineraryId  │ │ itineraryId  │
        │  │ dayNumber    │ │ departureCity│ │ name         │
        │  │ date         │ │ arrivalCity  │ │ address      │
        │  └──────┬───────┘ │ airline      │ │ latitude     │
        │         │         │ flightNumber │ │ longitude    │
        │         │         │ departureDate│ │ checkIn      │
        │         ▼         │ arrivalDate  │ │ checkOut     │
        │  ┌──────────────┐ │ note         │ │ note         │
        │  │ItineraryItem │ └──────────────┘ └──────────────┘
        │  ├──────────────┤
        │  │ id       PK  │
        │  │ dayId    FK  │
        │  │ placeId  FK  │──────────────────────►┌─────────────────┐
        │  │ order        │                       │     Place       │
        │  │ startTime    │                       ├─────────────────┤
        │  │ note         │                       │ id         PK   │
        │  └──────────────┘                       │ projectId  FK   │
        │                                         │ name            │
        │                                         │ category        │
        │                                         │ latitude        │
        │                                         │ longitude       │
        │                                         │ ...             │
        └────────────────────────────────────────►└─────────────────┘
```

### 3.2 Prisma 스키마 변경사항

```prisma
// prisma/schema.prisma 에 추가

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

  project        Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  days           ItineraryDay[]
  flights        Flight[]
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
  startTime  String?       // "HH:mm" format
  note       String?

  day        ItineraryDay  @relation(fields: [dayId], references: [id], onDelete: Cascade)
  place      Place         @relation(fields: [placeId], references: [id], onDelete: Cascade)

  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

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

// ========== 기존 모델 수정 ==========

model Project {
  // ... 기존 필드 유지 ...

  // 초대 링크 추가 (기존 shareToken과 분리)
  inviteToken   String?   @unique
  inviteEnabled Boolean   @default(false)

  // 관계 추가
  members       ProjectMember[]
  itinerary     Itinerary?

  // 기존 관계 유지
  // user, images, places, textInputs
}

model User {
  // ... 기존 필드 유지 ...

  // 관계 추가
  memberOf      ProjectMember[]

  // 기존 관계 유지
  // accounts, sessions, projects
}

model Place {
  // ... 기존 필드 유지 ...

  // 관계 추가
  itineraryItems  ItineraryItem[]

  // 기존 관계 유지
  // project, placeImages, placeTextInputs
}
```

---

## 4. API 설계

### 4.1 일정 API

#### 4.1.1 일정 CRUD

```typescript
// GET /api/projects/[id]/itinerary
// 일정 조회 (days, items, flights, accommodations 포함)
interface GetItineraryResponse {
  itinerary: {
    id: string
    title: string | null
    startDate: string // ISO
    endDate: string
    days: {
      id: string
      dayNumber: number
      date: string
      items: {
        id: string
        order: number
        startTime: string | null
        note: string | null
        place: {
          id: string
          name: string
          category: string
          latitude: number
          longitude: number
          formattedAddress: string | null
        }
      }[]
    }[]
    flights: Flight[]
    accommodations: Accommodation[]
  } | null
}

// POST /api/projects/[id]/itinerary
// 일정 생성
interface CreateItineraryRequest {
  title?: string
  startDate: string // ISO
  endDate: string
}

// PUT /api/projects/[id]/itinerary
// 일정 수정 (날짜 변경)
interface UpdateItineraryRequest {
  title?: string
  startDate?: string
  endDate?: string
}

// DELETE /api/projects/[id]/itinerary
// 일정 삭제
```

#### 4.1.2 일정 항목 API

```typescript
// POST /api/itinerary/[id]/items
// 일정 항목 추가
interface AddItemRequest {
  dayId: string
  placeId: string
  order: number
  startTime?: string
  note?: string
}

// PUT /api/itinerary/items/[id]
// 항목 수정
interface UpdateItemRequest {
  startTime?: string
  note?: string
}

// DELETE /api/itinerary/items/[id]
// 항목 삭제

// PUT /api/itinerary/[id]/reorder
// 항목 순서 일괄 변경 (드래그앤드롭)
interface ReorderItemsRequest {
  items: {
    id: string
    dayId: string
    order: number
  }[]
}
```

#### 4.1.3 항공/숙소 API

```typescript
// POST /api/itinerary/[id]/flights
// PUT /api/itinerary/flights/[id]
// DELETE /api/itinerary/flights/[id]

interface FlightData {
  departureCity: string
  arrivalCity: string
  airline?: string
  flightNumber?: string
  departureDate: string
  arrivalDate?: string
  note?: string
}

// POST /api/itinerary/[id]/accommodations
// PUT /api/itinerary/accommodations/[id]
// DELETE /api/itinerary/accommodations/[id]

interface AccommodationData {
  name: string
  address?: string
  latitude?: number
  longitude?: number
  checkIn: string
  checkOut: string
  note?: string
}
```

### 4.2 멤버십 API

```typescript
// GET /api/projects/[id]/members
// 멤버 목록 조회
interface GetMembersResponse {
  members: {
    id: string
    userId: string
    role: 'owner' | 'member'
    joinedAt: string
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    }
  }[]
}

// POST /api/projects/[id]/invite
// 초대 링크 생성/갱신
interface CreateInviteResponse {
  inviteToken: string
  inviteUrl: string
}

// DELETE /api/projects/[id]/invite
// 초대 링크 비활성화

// DELETE /api/projects/[id]/members/[userId]
// 멤버 내보내기 (소유자만)

// POST /api/projects/[id]/leave
// 나가기 (멤버만)

// POST /api/projects/[id]/transfer
// 소유권 이전 (소유자만)
interface TransferOwnershipRequest {
  newOwnerId: string
}

// GET /api/invite/[token]
// 초대 정보 조회 (로그인 불필요)
interface GetInviteInfoResponse {
  project: {
    id: string
    name: string
    destination: string
  }
  inviter: {
    name: string
    image: string | null
  }
  memberCount: number
}

// POST /api/invite/[token]/accept
// 초대 수락 (로그인 필요)
interface AcceptInviteResponse {
  projectId: string
  role: 'member'
}
```

### 4.3 공유 API 확장

```typescript
// GET /api/share/[token]
// 기존 응답에 itinerary 추가
interface GetSharedProjectResponse {
  project: {
    // ... 기존 필드 ...
  }
  places: Place[]
  itinerary: {
    // ... 일정 데이터 (읽기 전용) ...
  } | null
}
```

---

## 5. 실시간 협업 설계

### 5.1 Supabase Realtime 채널 구조

```typescript
// 프로젝트별 채널
const channel = supabase.channel(`project:${projectId}`)

// 이벤트 타입
type RealtimeEvent =
  // 일정 관련
  | { type: 'itinerary:created'; payload: Itinerary }
  | { type: 'itinerary:updated'; payload: Partial<Itinerary> }
  | { type: 'itinerary:deleted' }

  // 일정 항목
  | { type: 'item:created'; payload: ItineraryItem }
  | { type: 'item:updated'; payload: { id: string; changes: Partial<ItineraryItem> } }
  | { type: 'item:deleted'; payload: { id: string } }
  | { type: 'items:reordered'; payload: { items: { id: string; dayId: string; order: number }[] } }

  // 항공/숙소
  | { type: 'flight:created'; payload: Flight }
  | { type: 'flight:updated'; payload: { id: string; changes: Partial<Flight> } }
  | { type: 'flight:deleted'; payload: { id: string } }
  | { type: 'accommodation:created'; payload: Accommodation }
  | { type: 'accommodation:updated'; payload: { id: string; changes: Partial<Accommodation> } }
  | { type: 'accommodation:deleted'; payload: { id: string } }

  // 멤버십
  | { type: 'member:joined'; payload: ProjectMember }
  | { type: 'member:left'; payload: { userId: string } }
```

### 5.2 Presence (접속자 표시)

```typescript
// Presence 상태
interface PresenceState {
  odid: string // Online Device ID
  userId: string
  userName: string
  userImage: string | null
  currentView: 'itinerary' | 'places' | 'input'
  lastSeen: number
}

// 사용 예시
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState<PresenceState>()
    // state: { odid1: [PresenceState], odid2: [PresenceState], ... }
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        odid: generateOdid(),
        userId: session.user.id,
        userName: session.user.name,
        userImage: session.user.image,
        currentView: 'itinerary',
        lastSeen: Date.now(),
      })
    }
  })
```

### 5.3 충돌 처리 전략

```typescript
/**
 * Last-Write-Wins (LWW) 전략
 *
 * 1. 각 변경에 타임스탬프 포함
 * 2. 서버에서 최신 타임스탬프 우선 적용
 * 3. 클라이언트는 서버 응답으로 상태 동기화
 */

// API 요청 시 타임스탬프 포함
interface UpdateItemWithTimestamp {
  id: string
  startTime?: string
  note?: string
  clientTimestamp: number // Date.now()
}

// 서버 처리
async function updateItem(data: UpdateItemWithTimestamp) {
  const existing = await prisma.itineraryItem.findUnique({ where: { id: data.id } })

  // LWW: 더 최신 변경만 적용
  if (existing && existing.updatedAt.getTime() > data.clientTimestamp) {
    return existing // 이미 더 최신 데이터가 있음
  }

  return prisma.itineraryItem.update({
    where: { id: data.id },
    data: { startTime: data.startTime, note: data.note },
  })
}
```

---

## 6. 파일 구조 설계

### 6.1 새로 추가할 파일들

```
travel-planner/
├── app/
│   ├── api/
│   │   ├── projects/[id]/
│   │   │   ├── itinerary/
│   │   │   │   ├── route.ts              # GET, POST, PUT, DELETE
│   │   │   │   ├── items/route.ts        # POST (add item)
│   │   │   │   ├── reorder/route.ts      # PUT (reorder items)
│   │   │   │   ├── flights/route.ts      # POST (add flight)
│   │   │   │   └── accommodations/route.ts # POST (add accommodation)
│   │   │   ├── members/
│   │   │   │   ├── route.ts              # GET
│   │   │   │   └── [userId]/route.ts     # DELETE (remove member)
│   │   │   ├── invite/route.ts           # POST, DELETE
│   │   │   ├── leave/route.ts            # POST
│   │   │   └── transfer/route.ts         # POST
│   │   ├── itinerary/
│   │   │   ├── items/[id]/route.ts       # PUT, DELETE
│   │   │   ├── flights/[id]/route.ts     # PUT, DELETE
│   │   │   └── accommodations/[id]/route.ts # PUT, DELETE
│   │   └── invite/[token]/
│   │       ├── route.ts                  # GET (invite info)
│   │       └── accept/route.ts           # POST
│   │
│   ├── (dashboard)/
│   │   └── projects/[id]/
│   │       └── _components/
│   │           ├── ItineraryTab/
│   │           │   ├── index.tsx
│   │           │   ├── CreateItineraryModal.tsx
│   │           │   ├── ItineraryHeader.tsx
│   │           │   ├── FlightSection.tsx
│   │           │   ├── AccommodationSection.tsx
│   │           │   ├── DayTabs.tsx
│   │           │   ├── Timeline.tsx
│   │           │   ├── TimelineItem.tsx
│   │           │   ├── DayMap.tsx
│   │           │   └── AddItemDropzone.tsx
│   │           ├── MembersPanel/
│   │           │   ├── index.tsx
│   │           │   ├── MemberList.tsx
│   │           │   ├── InviteModal.tsx
│   │           │   └── PresenceIndicator.tsx
│   │           └── PlaceListDraggable.tsx  # 드래그 소스로 확장
│   │
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx                  # 초대 수락 페이지
│   │
│   └── s/[token]/
│       └── _components/
│           └── SharedItinerary.tsx       # 공유 페이지 일정 뷰
│
├── domain/
│   ├── interfaces/
│   │   ├── IItineraryRepository.ts
│   │   ├── IMemberRepository.ts
│   │   ├── IFlightRepository.ts
│   │   └── IAccommodationRepository.ts
│   └── value-objects/
│       ├── MemberRole.ts
│       └── DayNumber.ts
│
├── application/
│   ├── use-cases/
│   │   ├── itinerary/
│   │   │   ├── CreateItineraryUseCase.ts
│   │   │   ├── UpdateItineraryUseCase.ts
│   │   │   ├── DeleteItineraryUseCase.ts
│   │   │   ├── AddItemUseCase.ts
│   │   │   ├── ReorderItemsUseCase.ts
│   │   │   ├── ManageFlightUseCase.ts
│   │   │   └── ManageAccommodationUseCase.ts
│   │   └── membership/
│   │       ├── InviteMemberUseCase.ts
│   │       ├── AcceptInviteUseCase.ts
│   │       ├── RemoveMemberUseCase.ts
│   │       ├── LeaveProjectUseCase.ts
│   │       └── TransferOwnershipUseCase.ts
│   └── dto/
│       ├── ItineraryDTO.ts
│       └── MemberDTO.ts
│
├── infrastructure/
│   ├── api-client/
│   │   ├── itinerary.api.ts
│   │   └── members.api.ts
│   ├── repositories/
│   │   ├── PrismaItineraryRepository.ts
│   │   ├── PrismaMemberRepository.ts
│   │   ├── PrismaFlightRepository.ts
│   │   └── PrismaAccommodationRepository.ts
│   └── services/
│       └── realtime/
│           ├── RealtimeClient.ts
│           ├── RealtimeBroadcastService.ts
│           └── PresenceService.ts
│
├── hooks/
│   ├── queries/
│   │   ├── useItinerary.ts
│   │   ├── useDayPlaces.ts
│   │   └── useMembers.ts
│   └── mutations/
│       ├── useItineraryMutations.ts
│       ├── useItemMutations.ts
│       ├── useFlightMutations.ts
│       ├── useAccommodationMutations.ts
│       └── useMemberMutations.ts
│   └── realtime/
│       ├── useRealtimeSync.ts
│       └── usePresence.ts
│
└── components/
    ├── itinerary/
    │   ├── DraggableTimeline.tsx
    │   ├── DroppableDay.tsx
    │   ├── FlightCard.tsx
    │   ├── AccommodationCard.tsx
    │   └── DateRangePicker.tsx
    └── members/
        ├── MemberAvatar.tsx
        └── OnlineIndicator.tsx
```

---

## 7. 컴포넌트 설계

### 7.1 프로젝트 상세 페이지 구조

```tsx
// app/(dashboard)/projects/[id]/page.tsx
// 기존 탭에 일정 탭 추가

<Tabs>
  <TabsList>
    <TabsTrigger value="input">입력</TabsTrigger>
    <TabsTrigger value="places">장소</TabsTrigger>
    <TabsTrigger value="itinerary">일정</TabsTrigger>  {/* 새로 추가 */}
  </TabsList>

  <TabsContent value="input">
    <InputSection />
  </TabsContent>

  <TabsContent value="places">
    <PlaceSection />
  </TabsContent>

  <TabsContent value="itinerary">
    <ItinerarySection />  {/* 새로 추가 */}
  </TabsContent>
</Tabs>

{/* 멤버 패널 (항상 표시) */}
<MembersPanel />
```

### 7.2 일정 탭 컴포넌트 구조

```tsx
// ItinerarySection 컴포넌트 트리

<ItinerarySection>
  {/* 일정이 없는 경우 */}
  <EmptyItinerary>
    <CreateItineraryButton />
  </EmptyItinerary>

  {/* 일정이 있는 경우 */}
  <ItineraryContent>
    {/* 헤더: 제목, 날짜, 공유/편집 버튼 */}
    <ItineraryHeader />

    {/* 항공/숙소 섹션 */}
    <FlightSection />
    <AccommodationSection />

    {/* Day 탭 + 타임라인 + 지도 */}
    <div className="flex">
      {/* 왼쪽: 장소 목록 (드래그 소스) */}
      <PlaceListDraggable />

      {/* 중앙: 타임라인 */}
      <div>
        <DayTabs />
        <Timeline>
          <DndContext>
            <SortableContext>
              {items.map(item => (
                <TimelineItem key={item.id} />
              ))}
            </SortableContext>
            <AddItemDropzone />
          </DndContext>
        </Timeline>
      </div>

      {/* 오른쪽: 지도 */}
      <DayMap />
    </div>
  </ItineraryContent>
</ItinerarySection>
```

### 7.3 드래그앤드롭 구현 전략

```typescript
// @dnd-kit/core 사용

// 드래그 가능한 아이템 타입
type DraggableType =
  | { type: 'place'; data: Place }           // 장소 목록에서 드래그
  | { type: 'timeline-item'; data: ItineraryItem }  // 타임라인 내 재정렬

// 드롭 영역 타입
type DroppableType =
  | { type: 'day'; dayId: string }           // 특정 Day에 드롭
  | { type: 'timeline'; dayId: string }      // 타임라인 내 위치

// DndContext 설정
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  {/* 드래그 소스: 장소 목록 */}
  <PlaceListDraggable places={places} />

  {/* 드롭 타겟: 타임라인 */}
  <SortableContext items={currentDayItems}>
    {currentDayItems.map(item => (
      <SortableTimelineItem key={item.id} item={item} />
    ))}
  </SortableContext>

  {/* 드래그 오버레이 */}
  <DragOverlay>
    {activeItem && <DragPreview item={activeItem} />}
  </DragOverlay>
</DndContext>
```

---

## 8. 훅 설계

### 8.1 useItinerary

```typescript
// hooks/queries/useItinerary.ts

import useSWR from 'swr'
import { itineraryApi } from '@/infrastructure/api-client/itinerary.api'

export function useItinerary(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `/projects/${projectId}/itinerary` : null,
    () => itineraryApi.get(projectId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    itinerary: data?.itinerary ?? null,
    days: data?.itinerary?.days ?? [],
    flights: data?.itinerary?.flights ?? [],
    accommodations: data?.itinerary?.accommodations ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
```

### 8.2 useRealtimeSync

```typescript
// hooks/realtime/useRealtimeSync.ts

import { useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useSWRConfig } from 'swr'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useRealtimeSync(projectId: string) {
  const { mutate } = useSWRConfig()

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case 'item:created':
      case 'item:updated':
      case 'item:deleted':
      case 'items:reordered':
        // SWR 캐시 무효화 → 자동 재요청
        mutate(`/projects/${projectId}/itinerary`)
        break

      case 'flight:created':
      case 'flight:updated':
      case 'flight:deleted':
      case 'accommodation:created':
      case 'accommodation:updated':
      case 'accommodation:deleted':
        mutate(`/projects/${projectId}/itinerary`)
        break

      case 'member:joined':
      case 'member:left':
        mutate(`/projects/${projectId}/members`)
        break
    }
  }, [projectId, mutate])

  useEffect(() => {
    const channel = supabase
      .channel(`project:${projectId}`)
      .on('broadcast', { event: 'sync' }, ({ payload }) => {
        handleRealtimeEvent(payload as RealtimeEvent)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [projectId, handleRealtimeEvent])
}
```

### 8.3 usePresence

```typescript
// hooks/realtime/usePresence.ts

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createClient } from '@supabase/supabase-js'

interface OnlineMember {
  odid: string
  userId: string
  userName: string
  userImage: string | null
}

export function usePresence(projectId: string) {
  const { data: session } = useSession()
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([])

  useEffect(() => {
    if (!session?.user) return

    const channel = supabase.channel(`project:${projectId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlineMember>()
        const members = Object.values(state).flat()
        setOnlineMembers(members)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            odid: generateOdid(),
            userId: session.user.id,
            userName: session.user.name,
            userImage: session.user.image,
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [projectId, session])

  return {
    onlineMembers,
    isOnline: (userId: string) =>
      onlineMembers.some(m => m.userId === userId),
  }
}

function generateOdid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
```

---

## 9. API 클라이언트 설계

### 9.1 itinerary.api.ts

```typescript
// infrastructure/api-client/itinerary.api.ts

import { apiClient } from './index'
import type {
  Itinerary,
  ItineraryItem,
  Flight,
  Accommodation,
} from '@/types/itinerary'

export const itineraryApi = {
  // 일정 CRUD
  get: (projectId: string) =>
    apiClient.get<{ itinerary: Itinerary | null }>(
      `/projects/${projectId}/itinerary`
    ),

  create: (projectId: string, data: { title?: string; startDate: string; endDate: string }) =>
    apiClient.post<{ itinerary: Itinerary }>(
      `/projects/${projectId}/itinerary`,
      data
    ),

  update: (projectId: string, data: Partial<{ title: string; startDate: string; endDate: string }>) =>
    apiClient.put<{ itinerary: Itinerary }>(
      `/projects/${projectId}/itinerary`,
      data
    ),

  delete: (projectId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/itinerary`),

  // 일정 항목
  addItem: (itineraryId: string, data: { dayId: string; placeId: string; order: number; startTime?: string }) =>
    apiClient.post<{ item: ItineraryItem }>(
      `/itinerary/${itineraryId}/items`,
      data
    ),

  updateItem: (itemId: string, data: { startTime?: string; note?: string }) =>
    apiClient.put<{ item: ItineraryItem }>(
      `/itinerary/items/${itemId}`,
      data
    ),

  deleteItem: (itemId: string) =>
    apiClient.delete<void>(`/itinerary/items/${itemId}`),

  reorderItems: (itineraryId: string, items: { id: string; dayId: string; order: number }[]) =>
    apiClient.put<void>(
      `/itinerary/${itineraryId}/reorder`,
      { items }
    ),

  // 항공편
  addFlight: (itineraryId: string, data: Omit<Flight, 'id' | 'itineraryId' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<{ flight: Flight }>(
      `/itinerary/${itineraryId}/flights`,
      data
    ),

  updateFlight: (flightId: string, data: Partial<Flight>) =>
    apiClient.put<{ flight: Flight }>(
      `/itinerary/flights/${flightId}`,
      data
    ),

  deleteFlight: (flightId: string) =>
    apiClient.delete<void>(`/itinerary/flights/${flightId}`),

  // 숙소
  addAccommodation: (itineraryId: string, data: Omit<Accommodation, 'id' | 'itineraryId' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<{ accommodation: Accommodation }>(
      `/itinerary/${itineraryId}/accommodations`,
      data
    ),

  updateAccommodation: (accommodationId: string, data: Partial<Accommodation>) =>
    apiClient.put<{ accommodation: Accommodation }>(
      `/itinerary/accommodations/${accommodationId}`,
      data
    ),

  deleteAccommodation: (accommodationId: string) =>
    apiClient.delete<void>(`/itinerary/accommodations/${accommodationId}`),
}
```

### 9.2 members.api.ts

```typescript
// infrastructure/api-client/members.api.ts

import { apiClient } from './index'
import type { ProjectMember } from '@/types/member'

export const membersApi = {
  // 멤버 목록
  list: (projectId: string) =>
    apiClient.get<{ members: ProjectMember[] }>(
      `/projects/${projectId}/members`
    ),

  // 초대
  createInvite: (projectId: string) =>
    apiClient.post<{ inviteToken: string; inviteUrl: string }>(
      `/projects/${projectId}/invite`
    ),

  disableInvite: (projectId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/invite`),

  getInviteInfo: (token: string) =>
    apiClient.get<{
      project: { id: string; name: string; destination: string }
      inviter: { name: string; image: string | null }
      memberCount: number
    }>(`/invite/${token}`),

  acceptInvite: (token: string) =>
    apiClient.post<{ projectId: string; role: 'member' }>(
      `/invite/${token}/accept`
    ),

  // 멤버 관리
  removeMember: (projectId: string, userId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/members/${userId}`),

  leave: (projectId: string) =>
    apiClient.post<void>(`/projects/${projectId}/leave`),

  transferOwnership: (projectId: string, newOwnerId: string) =>
    apiClient.post<void>(
      `/projects/${projectId}/transfer`,
      { newOwnerId }
    ),
}
```

---

## 10. 반응형 레이아웃 설계

### 10.1 화면 크기별 레이아웃

```
Desktop (≥1024px)
┌────────────────────────────────────────────────────────────┐
│  Header                                      [Members 👥]  │
├────────────┬─────────────────────────┬─────────────────────┤
│            │                         │                     │
│  장소 목록  │      타임라인           │       지도          │
│  (드래그   │  ┌─────────────────┐   │   ┌─────────────┐   │
│   소스)    │  │ Day1 Day2 Day3  │   │   │             │   │
│            │  ├─────────────────┤   │   │    Map      │   │
│  ☐ 센소지  │  │ 📍 센소지       │   │   │             │   │
│  ☐ 스카이  │  │ 📍 스카이트리    │   │   │   📍 1      │   │
│  ☐ ...    │  │ + 장소 추가     │   │   │   📍 2      │   │
│            │  └─────────────────┘   │   └─────────────┘   │
│            │                         │                     │
└────────────┴─────────────────────────┴─────────────────────┘

Tablet (768px ~ 1023px)
┌──────────────────────────────────────────────┐
│  Header                         [≡] [👥]     │
├─────────────────────────┬────────────────────┤
│                         │                    │
│      타임라인           │       지도          │
│  ┌─────────────────┐   │   ┌──────────────┐ │
│  │ Day1 Day2 Day3  │   │   │              │ │
│  ├─────────────────┤   │   │     Map      │ │
│  │ 📍 센소지       │   │   │              │ │
│  │ 📍 스카이트리    │   │   │              │ │
│  │ + 장소 추가     │   │   │              │ │
│  └─────────────────┘   │   └──────────────┘ │
│                         │                    │
└─────────────────────────┴────────────────────┘
* 장소 목록은 햄버거 메뉴로 토글

Mobile (< 768px)
┌──────────────────────────────┐
│  Header              [≡] [👥]│
├──────────────────────────────┤
│  [타임라인] [지도]           │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │ Day1 Day2 Day3 Day4    │  │
│  ├────────────────────────┤  │
│  │                        │  │
│  │  📍 센소지 (10:00)     │  │
│  │     도쿄 아사쿠사       │  │
│  │                        │  │
│  │  📍 스카이트리         │  │
│  │     도쿄 스미다구       │  │
│  │                        │  │
│  │  🏨 시부야 호텔        │  │
│  │                        │  │
│  │  + 장소 추가           │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  [+ 장소 선택] (하단 버튼)   │
└──────────────────────────────┘
* 지도 탭 선택 시 전체 화면 지도
* 장소 추가는 모달 또는 하단 시트
```

### 10.2 반응형 구현 전략

```tsx
// hooks/use-mobile.ts 활용
const isMobile = useIsMobile()

// 레이아웃 분기
return isMobile ? (
  <MobileItineraryLayout />
) : (
  <DesktopItineraryLayout />
)

// 모바일에서 드래그앤드롭
// - 터치 드래그 지원 (@dnd-kit/core의 TouchSensor)
// - 장거리 드래그 대신 "장소 선택" 버튼 → 모달에서 선택
```

---

## 11. 권한 및 인증 설계

### 11.1 프로젝트 접근 권한 체크

```typescript
// lib/auth/projectAccess.ts

import { prisma } from '@/lib/db'

export type ProjectRole = 'owner' | 'member' | 'none'

/**
 * 사용자의 프로젝트 접근 권한 확인
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole> {
  // 1. 소유자인지 확인
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })

  if (project?.userId === userId) {
    return 'owner'
  }

  // 2. 멤버인지 확인
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  })

  if (membership) {
    return membership.role as ProjectRole
  }

  return 'none'
}

/**
 * API 라우트용 권한 체크 미들웨어
 */
export async function requireProjectAccess(
  userId: string,
  projectId: string,
  minRole: 'member' | 'owner' = 'member'
): Promise<{ authorized: boolean; role: ProjectRole }> {
  const role = await getProjectRole(userId, projectId)

  if (role === 'none') {
    return { authorized: false, role }
  }

  if (minRole === 'owner' && role !== 'owner') {
    return { authorized: false, role }
  }

  return { authorized: true, role }
}
```

### 11.2 API 라우트에서 사용

```typescript
// app/api/projects/[id]/itinerary/route.ts

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireProjectAccess } from '@/lib/auth/projectAccess'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  // 소유자 또는 멤버만 접근 가능
  const { authorized } = await requireProjectAccess(session.user.id, projectId)
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 일정 조회 로직...
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  // 소유자만 삭제 가능
  const { authorized } = await requireProjectAccess(session.user.id, projectId, 'owner')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 삭제 로직...
}
```

---

## 12. 마이그레이션 계획

### 12.1 단계별 구현 순서

```
Phase 1: 기반 구조 (1주)
├── Prisma 스키마 마이그레이션
├── Domain interfaces 정의
├── API 클라이언트 추가
└── 기본 훅 추가

Phase 2: 일정 기본 기능 (1주)
├── 일정 CRUD API
├── 일정 탭 UI (기본)
├── 타임라인 컴포넌트
└── Day별 지도 연동

Phase 3: 드래그앤드롭 (1주)
├── @dnd-kit 설정
├── 장소 목록 드래그 소스
├── 타임라인 드롭 타겟
├── 순서 변경 & Day 간 이동
└── 모바일 터치 지원

Phase 4: 항공/숙소 (0.5주)
├── Flight CRUD
├── Accommodation CRUD
├── Day 끝 숙소 자동 표시
└── UI 컴포넌트

Phase 5: 멤버십 (1주)
├── ProjectMember 모델
├── 초대 링크 생성/수락
├── 멤버 관리 UI
├── 권한 체크 미들웨어
└── 초대 수락 페이지

Phase 6: 실시간 협업 (1주)
├── Supabase Realtime 설정
├── 브로드캐스트 이벤트
├── SWR 캐시 무효화 연동
├── Presence (접속자 표시)
└── 충돌 처리 (LWW)

Phase 7: 공유 확장 (0.5주)
├── /s/[token] 일정 뷰 추가
├── 공유 페이지 일정 표시
└── 일정 복제 기능
```

### 12.2 마이그레이션 SQL

```sql
-- Migration: add_itinerary_feature

-- 1. ProjectMember 테이블
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- 2. Project 테이블 수정
ALTER TABLE "Project" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "Project" ADD COLUMN "inviteEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Project_inviteToken_key" ON "Project"("inviteToken");

-- 3. Itinerary 테이블
CREATE TABLE "Itinerary" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Itinerary_projectId_key" ON "Itinerary"("projectId");
CREATE INDEX "Itinerary_projectId_idx" ON "Itinerary"("projectId");

-- 4. ItineraryDay 테이블
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItineraryDay_itineraryId_dayNumber_key" ON "ItineraryDay"("itineraryId", "dayNumber");
CREATE INDEX "ItineraryDay_itineraryId_idx" ON "ItineraryDay"("itineraryId");

-- 5. ItineraryItem 테이블
CREATE TABLE "ItineraryItem" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startTime" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ItineraryItem_dayId_idx" ON "ItineraryItem"("dayId");
CREATE INDEX "ItineraryItem_placeId_idx" ON "ItineraryItem"("placeId");

-- 6. Flight 테이블
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "departureCity" TEXT NOT NULL,
    "arrivalCity" TEXT NOT NULL,
    "airline" TEXT,
    "flightNumber" TEXT,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Flight_itineraryId_idx" ON "Flight"("itineraryId");

-- 7. Accommodation 테이블
CREATE TABLE "Accommodation" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Accommodation_itineraryId_idx" ON "Accommodation"("itineraryId");

-- 8. Foreign Keys
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 13. 테스트 전략

### 13.1 단위 테스트

```typescript
// __tests__/use-cases/CreateItineraryUseCase.test.ts

describe('CreateItineraryUseCase', () => {
  it('should create itinerary with correct number of days', async () => {
    const startDate = new Date('2026-03-15')
    const endDate = new Date('2026-03-18')

    const result = await useCase.execute({
      projectId: 'project-1',
      startDate,
      endDate,
    })

    expect(result.days).toHaveLength(4) // 3박 4일
    expect(result.days[0].dayNumber).toBe(1)
    expect(result.days[3].dayNumber).toBe(4)
  })

  it('should throw error if itinerary already exists', async () => {
    // ...
  })
})
```

### 13.2 E2E 테스트

```typescript
// e2e/itinerary.spec.ts

test.describe('Itinerary Feature', () => {
  test('should create itinerary and add place', async ({ page }) => {
    // 1. 프로젝트 페이지 이동
    await page.goto('/projects/test-project')

    // 2. 일정 탭 클릭
    await page.click('[data-testid="itinerary-tab"]')

    // 3. 일정 만들기
    await page.click('[data-testid="create-itinerary-btn"]')
    await page.fill('[data-testid="start-date"]', '2026-03-15')
    await page.fill('[data-testid="end-date"]', '2026-03-18')
    await page.click('[data-testid="create-btn"]')

    // 4. Day 생성 확인
    await expect(page.locator('[data-testid="day-tab-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="day-tab-4"]')).toBeVisible()

    // 5. 장소 드래그앤드롭
    const place = page.locator('[data-testid="place-item-센소지"]')
    const timeline = page.locator('[data-testid="timeline-dropzone"]')
    await place.dragTo(timeline)

    // 6. 타임라인에 추가 확인
    await expect(page.locator('[data-testid="timeline-item-센소지"]')).toBeVisible()
  })
})
```

---

## 14. 성능 최적화

### 14.1 데이터 페칭 최적화

```typescript
// 일정 데이터 한 번에 조회 (N+1 방지)
const itinerary = await prisma.itinerary.findUnique({
  where: { projectId },
  include: {
    days: {
      orderBy: { dayNumber: 'asc' },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            place: {
              select: {
                id: true,
                name: true,
                category: true,
                latitude: true,
                longitude: true,
                formattedAddress: true,
              },
            },
          },
        },
      },
    },
    flights: { orderBy: { departureDate: 'asc' } },
    accommodations: { orderBy: { checkIn: 'asc' } },
  },
})
```

### 14.2 실시간 동기화 최적화

```typescript
// 변경 사항만 브로드캐스트
// (전체 데이터가 아닌 델타만 전송)

// Bad: 전체 일정 데이터 전송
broadcast('sync', { type: 'itinerary:updated', payload: fullItinerary })

// Good: 변경된 부분만 전송
broadcast('sync', {
  type: 'item:updated',
  payload: { id: itemId, changes: { startTime: '10:00' } },
})
```

### 14.3 드래그앤드롭 성능

```typescript
// 드래그 중 리렌더링 최소화
// - useMemo로 아이템 목록 메모이제이션
// - 드래그 오버레이는 포탈로 렌더링

const sortedItems = useMemo(
  () => items.sort((a, b) => a.order - b.order),
  [items]
)
```

---

## 15. 결론

이 설계서는 다음을 달성합니다:

1. **기존 아키텍처 호환**: Clean Architecture 패턴 유지
2. **실시간 협업**: Supabase Realtime 기반 동기화
3. **확장성**: 모듈화된 구조로 기능 추가 용이
4. **성능**: 최적화된 데이터 페칭 및 실시간 전송
5. **사용자 경험**: 직관적인 드래그앤드롭, 반응형 UI

다음 단계: `/sc:implement`로 구현을 시작합니다.
