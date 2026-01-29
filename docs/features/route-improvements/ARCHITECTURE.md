# 경로 표시 개선 아키텍처 설계

> 작성일: 2026-01-29
> 상태: 설계 완료

## 개요

세 가지 이슈를 해결하기 위한 아키텍처 설계입니다.

---

## 현재 아키텍처 분석

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           현재 아키텍처                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ItineraryView.tsx                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ routePath = useMemo(() => {                                      │   │
│  │   sortedItems.forEach((item) => {                               │   │
│  │     if (item.placeId) { ... }  // ⚠️ 숙소 제외됨                  │   │
│  │   })                                                             │   │
│  │ })                                                               │   │
│  └───────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                      │
│                                  ▼                                      │
│  GoogleMap.tsx                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ - Marker (기본 마커)                                             │   │
│  │ - OverlayView (순서 숫자)  ⚠️ 중복 표시                          │   │
│  │ - Polyline (경로선)                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  DistanceService.ts                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ - Haversine 직선 거리                                            │   │
│  │ - 도보 4.5km/h 기준  ⚠️ 대중교통 없음                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 문제점 요약

| 이슈 | 현재 상태 | 위치 |
|------|-----------|------|
| 숙소 경로 제외 | `if (item.placeId)` 조건으로 필터링 | `ItineraryView.tsx:88` |
| 핀 숫자 중복 | Marker + OverlayView 둘 다 표시 | `GoogleMap.tsx:361, 456` |
| 도보만 지원 | `estimateWalkingTime()` 단일 함수 | `DistanceService.ts:46` |

---

## 개선 아키텍처 설계

### 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           개선 아키텍처                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [1] RoutePathPoint 타입 확장                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ interface RoutePathPoint {                                       │   │
│  │   lat: number                                                    │   │
│  │   lng: number                                                    │   │
│  │   order: number                                                  │   │
│  │   placeId?: string           // 장소 ID (장소일 때)               │   │
│  │   accommodationId?: string   // 숙소 ID (숙소일 때) ✅ NEW        │   │
│  │   itemType: 'place' | 'accommodation' ✅ NEW                     │   │
│  │ }                                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [2] routePath 계산 로직 수정 (ItineraryView.tsx)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ sortedItems.forEach((item) => {                                 │   │
│  │   if (item.placeId) {                                           │   │
│  │     // 장소 아이템 → places에서 좌표 조회                         │   │
│  │   } else if (item.accommodationId) {                            │   │
│  │     // 숙소 아이템 → accommodations에서 좌표 조회 ✅ NEW          │   │
│  │   }                                                              │   │
│  │ })                                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [3] GoogleMap 마커 수정                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ <Marker                                                          │   │
│  │   icon={icon}       // 라벨 없는 아이콘만 ✅                       │   │
│  │   // label 제거 ✅                                                │   │
│  │ />                                                               │   │
│  │                                                                  │   │
│  │ <OverlayView>       // 순서 숫자 (유일한 숫자 표시) ✅             │   │
│  │   {point.order}                                                  │   │
│  │ </OverlayView>                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [4] 대중교통 시간 계산                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  DistanceService.ts (확장)                                       │   │
│  │  ├── calculateRouteDistances()     // 기존 도보                   │   │
│  │  └── fetchTransitDurations() ✅ NEW // Google API 대중교통        │   │
│  │                                                                  │   │
│  │  useDistances.ts (확장)                                          │   │
│  │  ├── segments (도보)                                             │   │
│  │  └── transitSegments ✅ NEW (대중교통, 30분+ 구간만)              │   │
│  │                                                                  │   │
│  │  DistanceIndicator.tsx (수정)                                    │   │
│  │  ├── 도보/대중교통 토글 버튼 ✅ NEW                               │   │
│  │  └── 30분+ 자동 전환 ✅ NEW                                      │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 이슈 1: 숙소 경로 포함

### 타입 변경

```typescript
// types/route.ts - RouteItem 확장
export interface RouteItem {
  id: string
  placeId?: string          // 장소 아이템일 때
  accommodationId?: string  // 숙소 아이템일 때 (NEW)
  latitude: number
  longitude: number
  order: number
  itemType: 'place' | 'accommodation'  // NEW
}

// ItineraryView.tsx - RoutePathPoint 확장
export interface RoutePathPoint {
  lat: number
  lng: number
  order: number
  placeId?: string
  accommodationId?: string  // NEW
  itemType: 'place' | 'accommodation'  // NEW
}
```

### 컴포넌트 변경

```
ItineraryView.tsx
├── routePath useMemo 수정
│   ├── item.placeId → places에서 좌표 조회
│   └── item.accommodationId → itinerary.accommodations에서 좌표 조회 (NEW)
│
└── props로 accommodations 전달 필요

ItineraryLayout.tsx
├── itinerary.accommodations를 ItineraryView에 전달
```

### 데이터 흐름

```
ItineraryItem (DB)
├── placeId: "place-123" OR accommodationId: "acc-456"
│
▼
ItineraryView.routePath useMemo
├── placeId 있음 → places.find() → 좌표
├── accommodationId 있음 → accommodations.find() → 좌표 (NEW)
│
▼
GoogleMap.routePath
├── Polyline (경로선에 숙소 포함)
└── OverlayView (숙소에도 순서 숫자)
```

---

## 이슈 2: 핀 숫자 중복 제거

### 현재 문제

```typescript
// GoogleMap.tsx - 현재 코드
<Marker
  key={place.id}
  icon={icon}  // 마커 아이콘에 라벨이 없음 (정상)
/>

// 그러나 OverlayView도 숫자를 표시 → 중복 아님
// 실제 문제: 마커 자체에 label prop이 있을 수 있음
```

### 해결 방안

**분석 결과**: 현재 코드에서 `Marker`에 `label` prop이 없습니다.
중복 문제가 발생한다면 다른 원인일 수 있습니다.

**확인 필요**:
1. 브라우저에서 실제로 어떻게 보이는지 스크린샷 확인
2. `createMarkerIcon()` 함수에서 SVG에 숫자가 포함되어 있는지 확인

**예방적 조치**:
```typescript
// GoogleMap.tsx - Marker에 label이 없는지 명시적으로 확인
<Marker
  key={place.id}
  position={{ lat: place.latitude, lng: place.longitude }}
  onClick={() => onPlaceSelect(place.id)}
  icon={icon}
  // label={undefined}  // 명시적으로 제거 (필요시)
  zIndex={isSelected ? 1000 : 1}
/>
```

---

## 이슈 3: 대중교통 시간 표시

### 새로운 타입

```typescript
// types/route.ts - 확장

export type TravelMode = 'walking' | 'transit'

export interface RouteSegment {
  fromItemId: string
  toItemId: string
  distance: {
    value: number
    text: string
  }
  duration: {
    value: number
    text: string
  }
  // NEW: 대중교통 정보 (30분+ 구간만)
  transitDuration?: {
    value: number
    text: string
  }
}

export interface DistanceResponse {
  segments: RouteSegment[]
  totalDistance: { value: number; text: string }
  totalDuration: { value: number; text: string }
  // NEW
  totalTransitDuration?: { value: number; text: string }
}
```

### 서비스 계층 확장

```typescript
// infrastructure/services/DistanceService.ts - 새 함수 추가

const WALKING_THRESHOLD_MINUTES = 30

/**
 * 도보 30분 이상 구간 식별
 */
export function identifyLongWalkingSegments(
  segments: RouteSegment[]
): RouteSegment[] {
  return segments.filter(
    (seg) => seg.duration.value >= WALKING_THRESHOLD_MINUTES * 60
  )
}

/**
 * Google Directions API로 대중교통 시간 조회
 * @param segments 30분+ 구간들
 * @returns 대중교통 시간이 추가된 segments
 */
export async function fetchTransitDurations(
  segments: RouteSegment[],
  coordinates: Map<string, { lat: number; lng: number }>
): Promise<RouteSegment[]> {
  // Google Directions API 호출
  // ...
}
```

### API 엔드포인트 확장

```typescript
// app/api/itinerary/distances/route.ts

// 기존 POST 유지 (도보만)

// NEW: 대중교통 시간 조회 엔드포인트
// POST /api/itinerary/distances/transit
export async function POST(request: Request) {
  // 1. 요청 검증
  // 2. 30분+ 구간만 필터링
  // 3. Google Directions API 호출 (transit mode)
  // 4. 결과 반환
}
```

### 훅 확장

```typescript
// hooks/queries/useDistances.ts - 확장

export function useDistances(
  dayId: string | null,
  items: RouteItem[],
  options: UseDistancesOptions = {}
) {
  // 기존 도보 거리 조회
  const { data: walkingData, ... } = useSWR(...)

  // NEW: 30분+ 구간 대중교통 시간 조회
  const longSegments = useMemo(() =>
    identifyLongWalkingSegments(walkingData?.segments ?? []),
    [walkingData?.segments]
  )

  const { data: transitData, ... } = useSWR(
    longSegments.length > 0 ? `transit:${dayId}:${hash}` : null,
    () => fetchTransitDurations(longSegments, coordinates)
  )

  // 병합된 결과 반환
  const mergedSegments = useMemo(() => {
    // 도보 데이터에 대중교통 데이터 병합
  }, [walkingData, transitData])

  return {
    segments: mergedSegments,
    ...
  }
}
```

### UI 컴포넌트 수정

```typescript
// components/itinerary/DistanceIndicator.tsx

interface DistanceIndicatorProps {
  segment: RouteSegment
  fromPlace: { latitude: number; longitude: number }
  toPlace: { latitude: number; longitude: number }
  defaultMode?: TravelMode  // NEW: 기본 표시 모드
}

export const DistanceIndicator = memo(function DistanceIndicator({
  segment,
  fromPlace,
  toPlace,
  defaultMode = 'walking',
}: DistanceIndicatorProps) {
  // 30분 이상이면 자동으로 transit 모드
  const isLongWalk = segment.duration.value >= 30 * 60
  const [mode, setMode] = useState<TravelMode>(
    isLongWalk && segment.transitDuration ? 'transit' : 'walking'
  )

  const displayDuration = mode === 'transit' && segment.transitDuration
    ? segment.transitDuration
    : segment.duration

  return (
    <div>
      {/* 모드 토글 버튼 (transitDuration이 있을 때만) */}
      {segment.transitDuration && (
        <div className="flex gap-1">
          <Button
            variant={mode === 'walking' ? 'default' : 'ghost'}
            onClick={() => setMode('walking')}
          >
            <Footprints /> 도보
          </Button>
          <Button
            variant={mode === 'transit' ? 'default' : 'ghost'}
            onClick={() => setMode('transit')}
          >
            <Train /> 대중교통
          </Button>
        </div>
      )}

      {/* 거리/시간 표시 */}
      <span>{segment.distance.text}</span>
      <span>{displayDuration.text}</span>
    </div>
  )
})
```

---

## 컴포넌트 다이어그램

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        컴포넌트 의존성 다이어그램                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │ ItineraryLayout │                                                     │
│  └────────┬────────┘                                                     │
│           │ itinerary.accommodations                                     │
│           ▼                                                              │
│  ┌─────────────────┐      ┌──────────────┐      ┌───────────────────┐   │
│  │  ItineraryView  │─────▶│  GoogleMap   │◀─────│ useDistances (훅) │   │
│  └────────┬────────┘      └──────────────┘      └─────────┬─────────┘   │
│           │                      ▲                        │              │
│           │ routePath            │                        │              │
│           │ (숙소 포함)           │                        │              │
│           ▼                      │                        ▼              │
│  ┌─────────────────┐            │              ┌───────────────────┐    │
│  │ItineraryTimeline│            │              │  DistanceService  │    │
│  └────────┬────────┘            │              │  (확장)           │    │
│           │                     │              └─────────┬─────────┘    │
│           ▼                     │                        │              │
│  ┌─────────────────────┐       │                        ▼              │
│  │ DistanceIndicator   │───────┘              ┌───────────────────┐    │
│  │ (토글 버튼 추가)     │                       │ Google Directions │    │
│  └─────────────────────┘                       │ API (transit)     │    │
│                                                └───────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## API 설계

### 기존 API (변경 없음)

```
POST /api/itinerary/distances
Request:
{
  "dayId": "day-123",
  "items": [
    { "id": "item-1", "placeId": "place-1", "latitude": 37.5, "longitude": 127.0, "order": 0 },
    { "id": "item-2", "placeId": "place-2", "latitude": 37.6, "longitude": 127.1, "order": 1 }
  ]
}

Response:
{
  "segments": [...],
  "totalDistance": { "value": 5000, "text": "5.0km" },
  "totalDuration": { "value": 3600, "text": "1시간" }
}
```

### 새 API: 대중교통 시간 조회

```
POST /api/itinerary/distances/transit
Request:
{
  "segments": [
    {
      "fromItemId": "item-1",
      "toItemId": "item-2",
      "fromCoord": { "lat": 37.5, "lng": 127.0 },
      "toCoord": { "lat": 37.6, "lng": 127.1 }
    }
  ]
}

Response:
{
  "results": [
    {
      "fromItemId": "item-1",
      "toItemId": "item-2",
      "transitDuration": { "value": 1200, "text": "20분" }
    }
  ]
}
```

---

## 파일 변경 목록

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `types/route.ts` | `RouteItem`, `RouteSegment` 타입 확장 |
| `components/itinerary/ItineraryView.tsx` | routePath에 숙소 포함 로직 |
| `components/map/GoogleMap.tsx` | 마커 라벨 제거 확인, 숙소 순서 번호 |
| `components/itinerary/DistanceIndicator.tsx` | 도보/대중교통 토글 UI |
| `infrastructure/services/DistanceService.ts` | 대중교통 시간 계산 함수 |
| `hooks/queries/useDistances.ts` | 대중교통 데이터 페칭 추가 |

### 새 파일

| 파일 | 설명 |
|------|------|
| `app/api/itinerary/distances/transit/route.ts` | 대중교통 시간 API |

---

## 구현 우선순위

1. **이슈 1: 숙소 경로 포함** (영향도 높음)
   - 타입 확장
   - ItineraryView 수정
   - GoogleMap 수정

2. **이슈 2: 핀 숫자 중복** (단순)
   - 원인 파악 후 수정

3. **이슈 3: 대중교통** (복잡도 높음)
   - API 엔드포인트 추가
   - 서비스 확장
   - 훅 확장
   - UI 수정

---

## 다음 단계

설계 승인 후 `/sc:workflow` 또는 `/sc:implement`로 구현 진행
