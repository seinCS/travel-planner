# 미해결 피드백 구현 계획서

> 생성일: 2026-01-27
> 상태: Phase 1 준비

## 실행 전략

### Phase 1: 기반 인프라 (Sequential)
아이콘 시스템 통일 - 다른 작업의 기반이 되는 변경

### Phase 2: 기능 개선 (Parallel)
- Task A: 항공권 자동입력
- Task B: 랜딩 페이지 리디자인
- Task C: 일정 빠른 추가 UX

---

## Phase 1: 아이콘 시스템 통일

### 목표
모든 이모지/유니코드 심볼을 Lucide-react 아이콘으로 교체

### 작업 범위

#### 1.1 아이콘 매핑 파일 생성
```typescript
// lib/icons.ts
import {
  UtensilsCrossed, Coffee, Camera, ShoppingBag, Building2, MapPin,
  Image, FileText, Link, Map, Calendar, Plus, Plane, Hotel,
  X, ChevronDown, ChevronRight, Star, Trash2, Check
} from 'lucide-react'

export const CATEGORY_ICONS = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  attraction: Camera,
  shopping: ShoppingBag,
  accommodation: Building2,
  other: MapPin,
} as const

export const TAB_ICONS = {
  image: Image,
  text: FileText,
  url: Link,
  map: Map,
  list: MapPin,
  itinerary: Calendar,
  add: Plus,
} as const

export const ACTION_ICONS = {
  close: X,
  expand: ChevronDown,
  next: ChevronRight,
  star: Star,
  starFilled: Star, // with fill prop
  delete: Trash2,
  check: Check,
  plane: Plane,
  hotel: Hotel,
} as const
```

#### 1.2 수정 대상 파일 (12개)
| 파일 | 현재 | 변경 |
|------|------|------|
| lib/constants.ts | `icon: '🍽️'` | `iconName: 'restaurant'` |
| InputTabs.tsx | `'📸', '📝', '🔗'` | `<ImageIcon />` 등 |
| MobileNavigation.tsx | `'🗺️', '📍', '📅', '➕'` | Lucide 아이콘 |
| ResponsiveSidebar.tsx | `'📍 목록', '➕ 입력'` | Lucide 아이콘 |
| FlightSection.tsx | `'✈️'` | `<PlaneIcon />` |
| AccommodationSection.tsx | `'🏨', '📍'` | Lucide 아이콘 |
| SortableTimelineItem.tsx | `'🏨', '🧳', '🛏️'` | Lucide 아이콘 |
| TravelSummaryBar.tsx | `'✈️', '🏨', '📍'` | Lucide 아이콘 |
| ProjectCard.tsx | `'📍', '🖼️'` | Lucide 아이콘 |
| app/page.tsx | `'📸', '🤖', '🗺️'` | Lucide 아이콘 |
| GoogleMap.tsx | `★ ☆` | `<StarIcon />` |
| PlaceDetailsPanel.tsx | `×` | `<XIcon />` |

---

## Phase 2A: 항공권 자동입력 API

### 목표
편명 입력 시 항공편 정보 자동완성

### 작업 범위

#### 2A.1 API 연동
```typescript
// lib/flight-api.ts
interface FlightInfo {
  flightNumber: string
  airline: string
  airlineCode: string
  departure: { airport: string; code: string; time: string }
  arrival: { airport: string; code: string; time: string }
}

export async function searchFlight(flightNumber: string): Promise<FlightInfo | null>
```

#### 2A.2 API Route
```
app/api/flights/search/route.ts
- GET /api/flights/search?q=KE123
- AviationStack API 프록시
- 캐싱 (1시간)
```

#### 2A.3 UI 개선
```
components/itinerary/FlightSection.tsx
- 편명 입력 필드에 debounced 검색
- 자동완성 드롭다운
- 선택 시 폼 자동 채우기
```

---

## Phase 2B: 랜딩 페이지 리디자인

### 목표
2026 트렌드에 맞는 현대적인 랜딩 페이지

### 작업 범위

#### 2B.1 의존성
```bash
npm install framer-motion
```

#### 2B.2 컴포넌트 구조
```
components/landing/
├── HeroSection.tsx      # 글래스모피즘 + 타이핑 애니메이션
├── BentoFeatures.tsx    # 불규칙 그리드 특징 카드
├── InteractiveDemo.tsx  # 스크린샷→지도 변환 데모
└── FooterCTA.tsx        # 최종 액션 유도
```

#### 2B.3 app/page.tsx 재구성
```tsx
<main>
  <HeroSection />
  <BentoFeatures />
  <InteractiveDemo />
  <FooterCTA />
</main>
```

---

## Phase 2C: 일정 빠른 추가 UX

### 목표
트리플 수준의 빠른 장소 추가 경험

### 작업 범위

#### 2C.1 지도에서 바로 추가
```
components/map/GoogleMap.tsx
- InfoWindow에 "Day X에 추가" 드롭다운 버튼
- 클릭 → Day 선택 → 즉시 추가
```

#### 2C.2 장소 목록 일괄 추가
```
components/place/PlaceList.tsx
- 다중 선택 모드 토글
- 체크박스 선택
- "선택한 N개 Day X에 추가" 버튼
```

#### 2C.3 드래그 개선
```
components/itinerary/ItineraryView.tsx
- Day 탭 간 드래그 지원
- 드롭 영역 하이라이트
```

---

## 일정

| Phase | 작업 | 병렬 | 예상 기간 |
|-------|------|:----:|----------|
| 1 | 아이콘 통일 | - | 2일 |
| 2A | 항공권 API | ✓ | 3일 |
| 2B | 랜딩 리디자인 | ✓ | 4일 |
| 2C | 일정 UX | ✓ | 3일 |

**총 예상**: 6일 (Phase 1: 2일 + Phase 2 병렬: 4일)
