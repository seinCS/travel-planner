# 지도 중심점/배율 통일 - 컴포넌트 설계

> **작성일**: 2026-01-25
> **기반 문서**: `docs/MAP_CENTER_UNIFICATION_REQUIREMENTS.md`
> **상태**: 설계 완료
> **다음 단계**: `/sc:workflow` → `/sc:implement`

---

## 1. 설계 개요

### 1.1 변경 범위

| 컴포넌트 | 변경 수준 | 설명 |
|----------|----------|------|
| `GoogleMap.tsx` | **Major** | 핵심 로직 추가 (fitBounds, panTo, zoom 제한) |
| `PlacesLayout.tsx` | Minor | 새 prop 전달 |
| `ItineraryLayout.tsx` | Minor | 새 prop 전달 |
| `page.tsx` | Minor | 콜백 추가, 탭 전환 시 초기화 |

### 1.2 설계 원칙

1. **GoogleMap 컴포넌트 자율성**: 지도 로직은 GoogleMap 내부에서 처리
2. **상위 컴포넌트는 데이터만 전달**: center, places, selectedPlaceId 등
3. **명시적 트리거**: fitBounds는 명시적 트리거(key 변경 또는 ref 메서드)로 제어

---

## 2. 컴포넌트 설계

### 2.1 GoogleMap 컴포넌트 (핵심 변경)

#### 새로운 Props 인터페이스

```typescript
interface GoogleMapProps {
  places: MapPlace[]
  selectedPlaceId: string | null
  onPlaceSelect: (placeId: string | null) => void
  onOpenDetails?: (placeId: string) => void

  // 기존
  center?: { lat: number; lng: number }

  // 신규 추가
  /** 히든 핀으로 사용할 destination 좌표 (bounds 계산에만 사용) */
  destinationCenter?: { lat: number; lng: number }

  /** fitBounds 트리거 - 값이 변경되면 fitBounds 재실행 */
  fitBoundsKey?: string | number

  /** 장소 클릭 시 panTo 여부 (기본값: true) */
  enablePanToOnSelect?: boolean
}
```

#### 내부 상수 정의

```typescript
// 지도 기본 설정
const MAP_CONFIG = {
  // 장소 없을 때 기본 zoom
  DEFAULT_ZOOM_NO_PLACES: 11,

  // fitBounds zoom 제한
  MIN_ZOOM: 10,
  MAX_ZOOM: 16,

  // 기본 중심점 (서울)
  DEFAULT_CENTER: { lat: 37.5665, lng: 126.9780 },
} as const
```

#### 핵심 유틸리티 함수

```typescript
/**
 * 히든 핀을 포함한 bounds 계산
 */
const calculateBoundsWithHiddenPin = (
  places: MapPlace[],
  destinationCenter?: { lat: number; lng: number }
): google.maps.LatLngBounds => {
  const bounds = new google.maps.LatLngBounds()

  // 1. 히든 핀 (destination) 추가
  if (destinationCenter) {
    bounds.extend(destinationCenter)
  }

  // 2. 실제 장소들 추가
  places.forEach((place) => {
    bounds.extend({ lat: place.latitude, lng: place.longitude })
  })

  return bounds
}

/**
 * zoom 제한이 적용된 fitBounds
 */
const fitBoundsWithLimits = (
  map: google.maps.Map,
  bounds: google.maps.LatLngBounds
): void => {
  map.fitBounds(bounds)

  // fitBounds 완료 후 zoom 보정
  google.maps.event.addListenerOnce(map, 'idle', () => {
    const zoom = map.getZoom()
    if (zoom !== undefined) {
      if (zoom > MAP_CONFIG.MAX_ZOOM) {
        map.setZoom(MAP_CONFIG.MAX_ZOOM)
      } else if (zoom < MAP_CONFIG.MIN_ZOOM) {
        map.setZoom(MAP_CONFIG.MIN_ZOOM)
      }
    }
  })
}
```

#### 주요 로직 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                    GoogleMap 컴포넌트                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Props 수신                                                 │
│    ├─ places[]                                              │
│    ├─ destinationCenter? (히든 핀)                          │
│    ├─ selectedPlaceId                                       │
│    ├─ fitBoundsKey (트리거)                                 │
│    └─ enablePanToOnSelect                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ useEffect: fitBoundsKey 변경 감지                    │   │
│  │                                                      │   │
│  │ if (map && fitBoundsKey changed) {                  │   │
│  │   if (places.length === 0 && destinationCenter) {   │   │
│  │     // 핀 없음 → destination 중심, zoom 11          │   │
│  │     map.setCenter(destinationCenter)                │   │
│  │     map.setZoom(DEFAULT_ZOOM_NO_PLACES)             │   │
│  │   } else if (places.length > 0) {                   │   │
│  │     // 핀 있음 → bounds 계산 + fitBounds            │   │
│  │     const bounds = calculateBoundsWithHiddenPin()   │   │
│  │     fitBoundsWithLimits(map, bounds)                │   │
│  │   }                                                  │   │
│  │ }                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ useEffect: selectedPlaceId 변경 감지                 │   │
│  │                                                      │   │
│  │ if (map && selectedPlaceId && enablePanToOnSelect) {│   │
│  │   const place = places.find(p => p.id === id)       │   │
│  │   if (place) {                                       │   │
│  │     map.panTo({ lat, lng })                          │   │
│  │     // zoom 유지 (변경 없음)                         │   │
│  │   }                                                  │   │
│  │ }                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 PlacesLayout 컴포넌트

#### Props 변경

```typescript
interface PlacesLayoutProps {
  // 기존 props...

  // 신규 추가
  /** destination 좌표 (히든 핀용) */
  destinationCenter?: { lat: number; lng: number }

  /** fitBounds 트리거 키 */
  fitBoundsKey?: string | number
}
```

#### 변경 사항

```tsx
// 변경 전
<GoogleMap
  places={places}
  selectedPlaceId={selectedPlaceId}
  onPlaceSelect={onPlaceSelect}
  onOpenDetails={onOpenDetails}
  center={mapCenter}
/>

// 변경 후
<GoogleMap
  places={places}
  selectedPlaceId={selectedPlaceId}
  onPlaceSelect={onPlaceSelect}
  onOpenDetails={onOpenDetails}
  center={mapCenter}
  destinationCenter={destinationCenter}
  fitBoundsKey={fitBoundsKey}
  enablePanToOnSelect={true}
/>
```

### 2.3 ItineraryLayout 컴포넌트

#### Props 변경

```typescript
interface ItineraryLayoutProps {
  // 기존 props...

  // 신규 추가
  destinationCenter?: { lat: number; lng: number }
  fitBoundsKey?: string | number
}
```

#### 변경 사항

```tsx
// 지도에 전달되는 places는 기존처럼 Day별 필터링 유지
const mapPlaces = selectedDayPlaceIds === null
  ? places  // 변경: Day 미선택 시 모든 장소 표시 (요구사항 2.4)
  : places.filter((p) => selectedDayPlaceIds.includes(p.id))

<GoogleMap
  places={mapPlaces}
  selectedPlaceId={selectedPlaceId}
  onPlaceSelect={onPlaceSelect}
  onOpenDetails={onOpenDetails}
  center={mapCenter}
  destinationCenter={destinationCenter}
  fitBoundsKey={fitBoundsKey}
  enablePanToOnSelect={true}
/>
```

### 2.4 page.tsx (프로젝트 상세 페이지)

#### 새로운 상태 및 로직

```typescript
// fitBoundsKey 생성 - 탭 전환, Day 선택 시 변경
const [fitBoundsKey, setFitBoundsKey] = useState(0)

// 탭 전환 핸들러 수정
const handleMainTabChange = (tab: MainTab) => {
  setMainTab(tab)

  // 탭 전환 시 fitBounds 재실행 트리거
  setFitBoundsKey(prev => prev + 1)

  if (tab === 'places') {
    setSelectedDayPlaceIds(null)
  }
}

// Day 선택 핸들러 수정
const handleDaySelect = (dayNumber: number | null, placeIds: string[]) => {
  if (dayNumber === null) {
    setSelectedDayPlaceIds(null)
  } else {
    setSelectedDayPlaceIds(placeIds)
  }

  // Day 선택 시 fitBounds 재실행 트리거
  setFitBoundsKey(prev => prev + 1)
}
```

#### 레이아웃 컴포넌트에 전달

```tsx
<PlacesLayout
  // 기존 props...
  destinationCenter={mapCenter}
  fitBoundsKey={`places-${fitBoundsKey}`}
/>

<ItineraryLayout
  // 기존 props...
  destinationCenter={mapCenter}
  fitBoundsKey={`itinerary-${fitBoundsKey}-${selectedDayPlaceIds?.join(',') || 'all'}`}
/>
```

---

## 3. 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           page.tsx                                       │
│  ┌───────────────┐  ┌─────────────┐  ┌──────────────────┐              │
│  │ mainTab       │  │ mapCenter   │  │ fitBoundsKey     │              │
│  │ (places/      │  │ (destination│  │ (탭/Day 변경 시  │              │
│  │  itinerary)   │  │  좌표)      │  │  증가)           │              │
│  └───────┬───────┘  └──────┬──────┘  └────────┬─────────┘              │
│          │                 │                   │                        │
│          ▼                 ▼                   ▼                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PlacesLayout / ItineraryLayout               │   │
│  │                                                                  │   │
│  │  Props: places, mapCenter, destinationCenter, fitBoundsKey      │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        GoogleMap                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ useEffect [fitBoundsKey]                                 │    │   │
│  │  │   → calculateBoundsWithHiddenPin()                       │    │   │
│  │  │   → fitBoundsWithLimits()                                │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ useEffect [selectedPlaceId]                              │    │   │
│  │  │   → map.panTo()                                          │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 시퀀스 다이어그램

### 4.1 프로젝트 진입 시

```
User          page.tsx        PlacesLayout      GoogleMap
 │               │                 │                │
 │──진입────────▶│                 │                │
 │               │                 │                │
 │               │─places, mapCenter──────────────▶│
 │               │─destinationCenter──────────────▶│
 │               │─fitBoundsKey="places-0"────────▶│
 │               │                 │                │
 │               │                 │                │──onLoad()
 │               │                 │                │  │
 │               │                 │                │  ├─if places.length > 0
 │               │                 │                │  │  calculateBoundsWithHiddenPin()
 │               │                 │                │  │  fitBoundsWithLimits()
 │               │                 │                │  │
 │               │                 │                │  └─else (no places)
 │               │                 │                │     setCenter(destinationCenter)
 │               │                 │                │     setZoom(11)
 │               │                 │                │
 │◀─────────────지도 렌더링 완료───────────────────│
```

### 4.2 장소 클릭 시

```
User          PlaceList       page.tsx        GoogleMap
 │               │                │                │
 │──장소 클릭───▶│                │                │
 │               │                │                │
 │               │─onPlaceSelect(id)──▶│          │
 │               │                │                │
 │               │                │─selectedPlaceId=id───▶│
 │               │                │                │
 │               │                │                │──useEffect [selectedPlaceId]
 │               │                │                │  │
 │               │                │                │  └─map.panTo(place.lat, place.lng)
 │               │                │                │     // zoom 유지
 │               │                │                │
 │◀─────────────InfoWindow 표시 + 지도 이동────────│
```

### 4.3 탭 전환 시 (Places → Itinerary)

```
User          page.tsx        ItineraryLayout    GoogleMap
 │               │                 │                 │
 │──탭 클릭─────▶│                 │                 │
 │               │                 │                 │
 │               │─setMainTab('itinerary')          │
 │               │─setFitBoundsKey(prev + 1)        │
 │               │                 │                 │
 │               │─fitBoundsKey="itinerary-1-all"──▶│
 │               │                 │                 │
 │               │                 │                 │──useEffect [fitBoundsKey]
 │               │                 │                 │  │
 │               │                 │                 │  └─fitBoundsWithLimits()
 │               │                 │                 │     // 전체 장소 + 히든 핀
 │               │                 │                 │
 │◀─────────────지도 뷰 초기화 완료─────────────────│
```

---

## 5. 인터페이스 정의

### 5.1 MapPlace (기존 유지)

```typescript
interface MapPlace {
  id: string
  name: string
  category: string
  comment?: string | null
  latitude: number
  longitude: number
  rating?: number | null
  userRatingsTotal?: number | null
}
```

### 5.2 Coordinate (신규 타입)

```typescript
interface Coordinate {
  lat: number
  lng: number
}
```

### 5.3 MapConfig (상수)

```typescript
const MAP_CONFIG = {
  DEFAULT_ZOOM_NO_PLACES: 11,
  MIN_ZOOM: 10,
  MAX_ZOOM: 16,
  DEFAULT_CENTER: { lat: 37.5665, lng: 126.9780 },
} as const
```

---

## 6. 테스트 시나리오

### TC-01: 핀 없이 프로젝트 진입

| 단계 | 액션 | 예상 결과 |
|------|------|----------|
| 1 | 장소 0개인 프로젝트 진입 | 지도 로드 |
| 2 | 지도 확인 | destination 좌표 중심, zoom 11 |

### TC-02: 핀 1개로 프로젝트 진입

| 단계 | 액션 | 예상 결과 |
|------|------|----------|
| 1 | 장소 1개인 프로젝트 진입 | 지도 로드 |
| 2 | 지도 확인 | 핀 + 히든 핀(destination) 모두 보이는 뷰 |
| 3 | zoom 확인 | 10 ≤ zoom ≤ 16 |

### TC-03: 장소 클릭 시 panTo

| 단계 | 액션 | 예상 결과 |
|------|------|----------|
| 1 | 장소 목록에서 장소 클릭 | 지도 중심 이동 |
| 2 | zoom 확인 | 이전 zoom 유지 |
| 3 | InfoWindow 확인 | 표시됨 |

### TC-04: 탭 전환 시 초기화

| 단계 | 액션 | 예상 결과 |
|------|------|----------|
| 1 | Places 탭에서 지도 드래그/줌 조작 | 사용자 조작 뷰 |
| 2 | Itinerary 탭 클릭 | fitBounds 재실행 |
| 3 | 지도 확인 | 전체 장소 + 히든 핀 뷰 |

### TC-05: Day 선택 시 fitBounds

| 단계 | 액션 | 예상 결과 |
|------|------|----------|
| 1 | Itinerary 탭에서 Day 1 클릭 | Day 1 장소만 표시 |
| 2 | 지도 확인 | Day 1 장소 + 히든 핀 fitBounds |

---

## 7. 에러 처리

### 7.1 destinationCenter 없는 경우

```typescript
// fitBounds 로직에서
if (!destinationCenter && places.length === 0) {
  // 기존 기본값 사용 (서울, zoom 5)
  map.setCenter(MAP_CONFIG.DEFAULT_CENTER)
  map.setZoom(5)
  return
}
```

### 7.2 map 인스턴스 없는 경우

```typescript
// useEffect 내에서 early return
if (!map) return
```

### 7.3 places 배열이 비어있지만 destinationCenter 있는 경우

```typescript
if (places.length === 0 && destinationCenter) {
  map.setCenter(destinationCenter)
  map.setZoom(MAP_CONFIG.DEFAULT_ZOOM_NO_PLACES)
  return
}
```

---

## 8. 성능 고려사항

### 8.1 불필요한 fitBounds 방지

- `fitBoundsKey`가 변경될 때만 fitBounds 실행
- places 배열 변경만으로는 fitBounds 재실행 안 함

### 8.2 panTo 최적화

- `selectedPlaceId`가 실제로 변경된 경우에만 panTo 실행
- 같은 장소 재클릭 시 panTo 스킵

### 8.3 메모이제이션

```typescript
const boundsPlaces = useMemo(() => {
  return places.map(p => ({ lat: p.latitude, lng: p.longitude }))
}, [places])
```

---

## 9. 마이그레이션 가이드

### 9.1 Breaking Changes

없음 - 모든 새 props는 optional

### 9.2 Deprecation

기존 `center` prop은 유지되지만, `destinationCenter`와 함께 사용 권장

---

## 10. 파일 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `components/map/GoogleMap.tsx` | Props 추가, fitBounds/panTo 로직 추가 |
| `components/layout/PlacesLayout.tsx` | Props 추가, GoogleMap에 전달 |
| `components/layout/ItineraryLayout.tsx` | Props 추가, GoogleMap에 전달, mapPlaces 로직 수정 |
| `app/(dashboard)/projects/[id]/page.tsx` | fitBoundsKey 상태 추가, 핸들러 수정 |

---

*이 설계 문서는 `/sc:design` 세션을 통해 생성되었습니다.*
