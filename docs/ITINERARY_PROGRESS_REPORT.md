# 일정(Itinerary) 기능 작업 현황 보고서

> **최종 업데이트**: 2026-01-23
> **기준 문서**: `docs/ITINERARY_ARCHITECTURE_DESIGN.md`

---

## 1. 전체 마이그레이션 계획 vs 현재 상태

| Phase | 범위 | 예상 기간 | 상태 | 완료율 |
|-------|------|-----------|------|--------|
| **Phase 1** | 기반 구조 | 1주 | ✅ 완료 | 100% |
| **Phase 2** | 일정 기본 기능 | 1주 | ✅ 완료 | 100% |
| **Phase 3** | 드래그앤드롭 | 1주 | ✅ 완료 | 100% |
| **Phase 4** | 항공/숙소 | 0.5주 | ✅ 완료 | 100% |
| **Phase 5** | 멤버십 | 1주 | 🔶 부분 | 30% |
| **Phase 6** | 실시간 협업 | 1주 | ❌ 미시작 | 0% |
| **Phase 7** | 공유 확장 | 0.5주 | ❌ 미시작 | 0% |

**전체 진행률**: 약 62% (Phase 1~4 완료, Phase 5 부분 완료)

---

## 2. 완료된 작업

### Phase 1: 기반 구조 ✅

| 작업 항목 | 파일/위치 | 상태 |
|-----------|-----------|------|
| Prisma 스키마 마이그레이션 | `prisma/schema.prisma` | ✅ |
| Domain interfaces 정의 | `domain/interfaces/` | ✅ |
| API 클라이언트 추가 | `infrastructure/api-client/itinerary.api.ts` | ✅ |
| 기본 훅 추가 | `hooks/queries/useItinerary.ts` | ✅ |
| Mutation 훅 | `hooks/mutations/useItineraryMutations.ts` | ✅ |

**생성된 Prisma 모델**:
- `Itinerary` - 일정 (1:1 with Project)
- `ItineraryDay` - 일별 일정
- `ItineraryItem` - 일정 항목 (장소)
- `Flight` - 항공편
- `Accommodation` - 숙소
- `ProjectMember` - 프로젝트 멤버십

---

### Phase 2: 일정 기본 기능 ✅

| 작업 항목 | 파일/위치 | 상태 |
|-----------|-----------|------|
| 일정 CRUD API | `app/api/projects/[id]/itinerary/route.ts` | ✅ |
| ItineraryView 컴포넌트 | `components/itinerary/ItineraryView.tsx` | ✅ |
| ItineraryDayTabs 컴포넌트 | `components/itinerary/ItineraryDayTabs.tsx` | ✅ |
| ItineraryTimeline 컴포넌트 | `components/itinerary/ItineraryTimeline.tsx` | ✅ |
| ItineraryCreateForm 컴포넌트 | `components/itinerary/ItineraryCreateForm.tsx` | ✅ |
| Day별 지도 연동 | `onDaySelect` callback | ✅ |

---

### Phase 3: 드래그앤드롭 ✅

| 작업 항목 | 파일/위치 | 상태 |
|-----------|-----------|------|
| @dnd-kit 패키지 설치 | `package.json` | ✅ |
| SortableTimelineItem | `components/itinerary/SortableTimelineItem.tsx` | ✅ |
| 순서 변경 API | `app/api/itinerary/[id]/reorder/route.ts` | ✅ |
| Day 간 이동 API | `app/api/itinerary/items/[itemId]/move/route.ts` | ✅ |
| 모바일 터치 지원 | TouchSensor (200ms delay) | ✅ |

**Phase 3 수정사항 (회의 피드백 반영)**:
- ✅ 카드 전체 드래그 가능 (숫자 버튼이 아닌 전체 카드)
- ✅ 8px distance constraint로 클릭/드래그 구분
- ✅ Optimistic Update 적용 (즉각적 UI 반영 + 실패 시 롤백)
- ✅ 장소 추가 중복 클릭 방지 (로딩 상태 추적)

---

### Phase 4: 항공/숙소 ✅

| 작업 항목 | 파일/위치 | 상태 |
|-----------|-----------|------|
| Flight CRUD API (목록) | `app/api/itinerary/[id]/flights/route.ts` | ✅ |
| Flight CRUD API (개별) | `app/api/itinerary/flights/[flightId]/route.ts` | ✅ |
| Accommodation CRUD API (목록) | `app/api/itinerary/[id]/accommodations/route.ts` | ✅ |
| Accommodation CRUD API (개별) | `app/api/itinerary/accommodations/[accommodationId]/route.ts` | ✅ |
| FlightSection 컴포넌트 | `components/itinerary/FlightSection.tsx` | ✅ |
| AccommodationSection 컴포넌트 | `components/itinerary/AccommodationSection.tsx` | ✅ |
| ItineraryView 통합 | Day 탭 아래, Timeline 위 배치 | ✅ |

---

## 3. 진행 중 / 부분 완료

### Phase 5: 멤버십 🔶 (30%)

**완료된 부분**:

| 작업 항목 | 파일/위치 | 상태 |
|-----------|-----------|------|
| ProjectMember Prisma 모델 | `prisma/schema.prisma` | ✅ |
| IMemberRepository 인터페이스 | `domain/interfaces/IMemberRepository.ts` | ✅ |
| PrismaMemberRepository 구현 | `infrastructure/repositories/PrismaMemberRepository.ts` | ✅ |
| members.api.ts API 클라이언트 | `infrastructure/api-client/members.api.ts` | ✅ |
| useMembers.ts 훅 | `hooks/queries/useMembers.ts` | ✅ |
| useMemberMutations.ts 훅 | `hooks/mutations/useMemberMutations.ts` | ✅ |

**미완료**:

| 작업 항목 | 예상 파일/위치 | 상태 |
|-----------|----------------|------|
| 멤버 목록 API | `app/api/projects/[id]/members/route.ts` | ❌ |
| 멤버 삭제 API | `app/api/projects/[id]/members/[userId]/route.ts` | ❌ |
| 초대 링크 생성 API | `app/api/projects/[id]/invite/route.ts` | ❌ |
| 초대 정보 조회 API | `app/api/invite/[token]/route.ts` | ❌ |
| 초대 수락 API | `app/api/invite/[token]/accept/route.ts` | ❌ |
| 프로젝트 탈퇴 API | `app/api/projects/[id]/leave/route.ts` | ❌ |
| 소유권 이전 API | `app/api/projects/[id]/transfer/route.ts` | ❌ |
| MembersPanel 컴포넌트 | `components/members/MembersPanel.tsx` | ❌ |
| 초대 수락 페이지 | `app/invite/[token]/page.tsx` | ❌ |
| 권한 체크 미들웨어 | `lib/auth-middleware.ts` | ❌ |

---

## 4. 미시작

### Phase 6: 실시간 협업 ❌

| 작업 항목 | 예상 파일/위치 | 상태 |
|-----------|----------------|------|
| Supabase Realtime 클라이언트 | `infrastructure/services/realtime/` | ❌ |
| useRealtimeSync 훅 | `hooks/realtime/useRealtimeSync.ts` | ❌ |
| usePresence 훅 | `hooks/realtime/usePresence.ts` | ❌ |
| 브로드캐스트 이벤트 타입 | `types/realtime.ts` | ❌ |
| SWR 캐시 무효화 연동 | `hooks/` 수정 | ❌ |
| 접속자 표시 UI | `components/presence/` | ❌ |
| LWW 충돌 처리 | 클라이언트/서버 로직 | ❌ |

---

### Phase 7: 공유 확장 ❌

| 작업 항목 | 예상 파일/위치 | 상태 |
|-----------|----------------|------|
| 공유 페이지 일정 뷰 | `app/s/[token]/` 수정 | ❌ |
| 읽기 전용 타임라인 | `components/itinerary/ReadOnlyTimeline.tsx` | ❌ |
| 일정 복제 API | `app/api/share/[token]/clone-itinerary/route.ts` | ❌ |
| 일정 복제 UI | 공유 페이지 버튼 | ❌ |

---

## 5. 현재 파일 구조

```
travel-planner/
├── app/api/
│   ├── projects/[id]/
│   │   └── itinerary/route.ts        ✅ Phase 2
│   └── itinerary/
│       ├── [id]/
│       │   ├── items/route.ts        ✅ Phase 2
│       │   ├── reorder/route.ts      ✅ Phase 3
│       │   ├── flights/route.ts      ✅ Phase 4
│       │   └── accommodations/route.ts ✅ Phase 4
│       ├── items/[itemId]/
│       │   ├── route.ts              ✅ Phase 2
│       │   └── move/route.ts         ✅ Phase 3
│       ├── flights/[flightId]/route.ts      ✅ Phase 4
│       └── accommodations/[accommodationId]/route.ts ✅ Phase 4
│
├── components/itinerary/
│   ├── index.ts                      ✅
│   ├── ItineraryView.tsx             ✅ Phase 2
│   ├── ItineraryDayTabs.tsx          ✅ Phase 2
│   ├── ItineraryTimeline.tsx         ✅ Phase 2, 3
│   ├── ItineraryCreateForm.tsx       ✅ Phase 2
│   ├── SortableTimelineItem.tsx      ✅ Phase 3
│   ├── FlightSection.tsx             ✅ Phase 4
│   └── AccommodationSection.tsx      ✅ Phase 4
│
├── hooks/
│   ├── queries/
│   │   ├── useItinerary.ts           ✅ Phase 1
│   │   └── useMembers.ts             ✅ Phase 5 (인프라)
│   └── mutations/
│       ├── useItineraryMutations.ts  ✅ Phase 1
│       └── useMemberMutations.ts     ✅ Phase 5 (인프라)
│
├── infrastructure/
│   ├── api-client/
│   │   ├── itinerary.api.ts          ✅ Phase 1
│   │   └── members.api.ts            ✅ Phase 5 (인프라)
│   └── repositories/
│       ├── PrismaFlightRepository.ts       ✅ Phase 1
│       ├── PrismaAccommodationRepository.ts ✅ Phase 1
│       └── PrismaMemberRepository.ts       ✅ Phase 5 (인프라)
│
└── domain/interfaces/
    ├── IFlightRepository.ts          ✅ Phase 1
    ├── IAccommodationRepository.ts   ✅ Phase 1
    └── IMemberRepository.ts          ✅ Phase 5 (인프라)
```

---

## 6. 다음 작업 우선순위

### 즉시 진행 가능

1. **Phase 5 완료** - 멤버십 기능 (예상 3-4일)
   - 멤버 관리 API Routes 생성
   - 초대 링크 생성/수락 시스템
   - MembersPanel UI 컴포넌트
   - 초대 수락 페이지

### 후속 작업

2. **Phase 6** - 실시간 협업 (예상 1주)
   - Supabase Realtime 통합
   - 실시간 동기화 훅
   - 접속자 표시

3. **Phase 7** - 공유 확장 (예상 2-3일)
   - 공유 페이지 일정 표시
   - 일정 복제 기능

---

## 7. 기술 스택 요약

| 영역 | 기술 |
|------|------|
| 드래그앤드롭 | @dnd-kit/core, @dnd-kit/sortable |
| 상태 관리 | SWR (캐싱 + 뮤테이션) |
| 실시간 (예정) | Supabase Realtime |
| 인증 | NextAuth.js |
| 데이터베이스 | PostgreSQL (Supabase) + Prisma ORM |

---

## 8. 변경 이력

| 날짜 | Phase | 작업 내용 |
|------|-------|-----------|
| 2026-01-23 | Phase 1 | 기반 구조 완료 |
| 2026-01-23 | Phase 2 | 일정 기본 기능 완료 |
| 2026-01-23 | Phase 3 | 드래그앤드롭 구현 + 수정사항 반영 |
| 2026-01-23 | Phase 4 | 항공/숙소 관리 기능 완료 |

---

*이 문서는 `/sc:pm` 명령으로 자동 생성되었습니다.*
