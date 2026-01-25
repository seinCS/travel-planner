# 지도 중심점/배율 통일 - 구현 워크플로우

> **작성일**: 2026-01-25
> **기반 문서**: `docs/MAP_CENTER_UNIFICATION_DESIGN.md`
> **상태**: 워크플로우 확정
> **예상 작업량**: 4개 파일, 5개 Phase

---

## Phase 개요

```
Phase 1: GoogleMap 핵심 로직 (Major)
    ↓
Phase 2: PlacesLayout 연결 (Minor)
    ↓
Phase 3: ItineraryLayout 연결 (Minor)
    ↓
Phase 4: page.tsx 통합 (Minor)
    ↓
Phase 5: 검증 및 테스트
```

---

## Phase 1: GoogleMap 핵심 로직 구현

### 파일
`components/map/GoogleMap.tsx`

### 작업 내용

#### 1.1 상수 정의 추가
```typescript
const MAP_CONFIG = {
  DEFAULT_ZOOM_NO_PLACES: 11,
  MIN_ZOOM: 10,
  MAX_ZOOM: 16,
  DEFAULT_CENTER: { lat: 37.5665, lng: 126.9780 },
} as const
```

#### 1.2 Props 인터페이스 확장
```typescript
interface GoogleMapProps {
  // 기존 props 유지
  places: MapPlace[]
  selectedPlaceId: string | null
  onPlaceSelect: (placeId: string | null) => void
  onOpenDetails?: (placeId: string) => void
  center?: { lat: number; lng: number }

  // 신규 props 추가
  destinationCenter?: { lat: number; lng: number }
  fitBoundsKey?: string | number
  enablePanToOnSelect?: boolean
}
```

#### 1.3 유틸리티 함수 추가

**calculateBoundsWithHiddenPin**
- 히든 핀(destination) 포함 bounds 계산
- places 배열 순회하여 bounds.extend()

**fitBoundsWithLimits**
- fitBounds 후 zoom 제한 적용
- idle 이벤트 리스너로 zoom 보정

#### 1.4 useEffect 추가

**fitBoundsKey 변경 감지**
- 의존성: `[map, fitBoundsKey, places, destinationCenter]`
- places.length === 0 && destinationCenter: setCenter + setZoom(11)
- places.length > 0: calculateBoundsWithHiddenPin + fitBoundsWithLimits

**selectedPlaceId 변경 감지 (panTo)**
- 의존성: `[map, selectedPlaceId, places, enablePanToOnSelect]`
- enablePanToOnSelect && selectedPlaceId: map.panTo()

#### 1.5 기존 onLoad 수정
- 기존 fitBounds 로직 제거 (useEffect로 이전)
- map 인스턴스 설정만 유지

### 체크포인트
- [ ] MAP_CONFIG 상수 정의
- [ ] Props 인터페이스 확장
- [ ] calculateBoundsWithHiddenPin 함수 구현
- [ ] fitBoundsWithLimits 함수 구현
- [ ] fitBoundsKey useEffect 구현
- [ ] panTo useEffect 구현
- [ ] 기존 onLoad에서 fitBounds 제거

---

## Phase 2: PlacesLayout 연결

### 파일
`components/layout/PlacesLayout.tsx`

### 작업 내용

#### 2.1 Props 인터페이스 확장
```typescript
interface PlacesLayoutProps {
  // 기존 props 유지...

  // 신규 추가
  destinationCenter?: { lat: number; lng: number }
  fitBoundsKey?: string | number
}
```

#### 2.2 GoogleMap 호출 수정 (2곳)

**데스크탑 영역 (line ~97-103)**
```tsx
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

**태블릿 영역 (line ~189-196)**
- 동일하게 수정

### 체크포인트
- [ ] Props 인터페이스에 destinationCenter, fitBoundsKey 추가
- [ ] 데스크탑 GoogleMap에 새 props 전달
- [ ] 태블릿 GoogleMap에 새 props 전달

---

## Phase 3: ItineraryLayout 연결

### 파일
`components/layout/ItineraryLayout.tsx`

### 작업 내용

#### 3.1 Props 인터페이스 확장
```typescript
interface ItineraryLayoutProps {
  // 기존 props 유지...

  // 신규 추가
  destinationCenter?: { lat: number; lng: number }
  fitBoundsKey?: string | number
}
```

#### 3.2 mapPlaces 로직 수정
```typescript
// 변경 전
const mapPlaces = selectedDayPlaceIds === null
  ? []  // Day 선택 전: 빈 지도
  : places.filter((p) => selectedDayPlaceIds.includes(p.id))

// 변경 후
const mapPlaces = selectedDayPlaceIds === null
  ? places  // Day 미선택 시 모든 장소 표시
  : places.filter((p) => selectedDayPlaceIds.includes(p.id))
```

#### 3.3 GoogleMap 호출 수정 (2곳)

**데스크탑 영역 (line ~54-62)**
```tsx
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

**태블릿 영역 (line ~79-86)**
- 동일하게 수정

### 체크포인트
- [ ] Props 인터페이스에 destinationCenter, fitBoundsKey 추가
- [ ] mapPlaces 로직 수정 (Day 미선택 시 전체 장소)
- [ ] 데스크탑 GoogleMap에 새 props 전달
- [ ] 태블릿 GoogleMap에 새 props 전달

---

## Phase 4: page.tsx 통합

### 파일
`app/(dashboard)/projects/[id]/page.tsx`

### 작업 내용

#### 4.1 fitBoundsKey 상태 추가
```typescript
const [fitBoundsKey, setFitBoundsKey] = useState(0)
```

#### 4.2 handleMainTabChange 수정
```typescript
const handleMainTabChange = (tab: MainTab) => {
  setMainTab(tab)

  // 탭 전환 시 fitBounds 재실행 트리거
  setFitBoundsKey(prev => prev + 1)

  if (tab === 'places') {
    setSelectedDayPlaceIds(null)
  }
}
```

#### 4.3 handleDaySelect 수정
```typescript
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

#### 4.4 PlacesLayout 호출 수정
```tsx
<PlacesLayout
  // 기존 props...
  destinationCenter={mapCenter || undefined}
  fitBoundsKey={`places-${fitBoundsKey}`}
/>
```

#### 4.5 ItineraryLayout 호출 수정
```tsx
<ItineraryLayout
  // 기존 props...
  destinationCenter={mapCenter || undefined}
  fitBoundsKey={`itinerary-${fitBoundsKey}-${selectedDayPlaceIds?.join(',') || 'all'}`}
/>
```

#### 4.6 모바일 GoogleMap 수정 (mobileTab === 'map')
```tsx
<GoogleMap
  places={places}
  selectedPlaceId={selectedPlaceId}
  onPlaceSelect={setSelectedPlaceId}
  onOpenDetails={setDetailPlaceId}
  center={mapCenter || undefined}
  destinationCenter={mapCenter || undefined}
  fitBoundsKey={`mobile-${fitBoundsKey}`}
  enablePanToOnSelect={true}
/>
```

### 체크포인트
- [ ] fitBoundsKey 상태 추가
- [ ] handleMainTabChange에 setFitBoundsKey 추가
- [ ] handleDaySelect에 setFitBoundsKey 추가
- [ ] PlacesLayout에 새 props 전달
- [ ] ItineraryLayout에 새 props 전달
- [ ] 모바일 GoogleMap에 새 props 전달

---

## Phase 5: 검증 및 테스트

### 수동 테스트 시나리오

#### TC-01: 핀 없이 프로젝트 진입
1. 장소 0개인 프로젝트 생성/진입
2. 지도가 destination 중심으로 표시되는지 확인
3. zoom이 11 정도인지 확인

#### TC-02: 핀 1개로 프로젝트 진입
1. 장소 1개인 프로젝트 진입
2. 핀 + destination 모두 보이는 뷰인지 확인
3. zoom이 10-16 범위인지 확인

#### TC-03: 장소 클릭 시 panTo
1. 장소 목록에서 장소 클릭
2. 지도가 해당 장소로 부드럽게 이동하는지 확인
3. zoom이 유지되는지 확인
4. InfoWindow가 표시되는지 확인

#### TC-04: 탭 전환 시 초기화
1. Places 탭에서 지도 드래그/줌 조작
2. Itinerary 탭 클릭
3. 지도가 fitBounds로 초기화되는지 확인
4. 다시 Places 탭 클릭
5. 지도가 fitBounds로 초기화되는지 확인

#### TC-05: Day 선택 시 fitBounds
1. Itinerary 탭 진입
2. Day 선택 전: 모든 장소 표시 확인
3. Day 1 클릭: Day 1 장소만 표시 + fitBounds 확인
4. Day 2 클릭: Day 2 장소만 표시 + fitBounds 확인

#### TC-06: 모바일 뷰 테스트
1. 모바일 뷰에서 지도 탭 확인
2. 장소 목록에서 장소 클릭 → 지도 탭 이동 + panTo 확인

### 체크포인트
- [ ] TC-01 통과
- [ ] TC-02 통과
- [ ] TC-03 통과
- [ ] TC-04 통과
- [ ] TC-05 통과
- [ ] TC-06 통과

---

## 파일 변경 요약

| Phase | 파일 | 변경 수준 |
|-------|------|----------|
| 1 | `components/map/GoogleMap.tsx` | Major |
| 2 | `components/layout/PlacesLayout.tsx` | Minor |
| 3 | `components/layout/ItineraryLayout.tsx` | Minor |
| 4 | `app/(dashboard)/projects/[id]/page.tsx` | Minor |

---

## 의존성 관계

```
Phase 1 (GoogleMap)
    ↓ (필수)
Phase 2 (PlacesLayout) ──┬──→ Phase 4 (page.tsx)
Phase 3 (ItineraryLayout)┘         ↓
                              Phase 5 (테스트)
```

- Phase 2, 3은 Phase 1 완료 후 병렬 진행 가능
- Phase 4는 Phase 2, 3 완료 후 진행
- Phase 5는 Phase 4 완료 후 진행

---

## 롤백 계획

모든 새 props는 optional이므로:
1. 문제 발생 시 page.tsx에서 새 props 전달 제거
2. GoogleMap의 새 useEffect는 fitBoundsKey가 없으면 실행 안 됨
3. 기존 동작으로 자동 폴백

---

*이 워크플로우 문서는 `/sc:workflow` 세션을 통해 생성되었습니다.*
