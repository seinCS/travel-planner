# 지도 중심점/배율 통일 요구사항 명세

> **작성일**: 2026-01-25
> **상태**: 요구사항 확정
> **다음 단계**: `/sc:design` 또는 `/sc:workflow`로 설계/구현 진행

---

## 1. 배경 및 문제 정의

### 현재 상황
- **Places 탭**: 프로젝트 진입 시 destination 기반 mapCenter 고정 + 모든 장소 fitBounds
- **Itinerary 탭**: Day 선택 시 해당 Day 장소만 필터링 + fitBounds
- **장소 클릭**: InfoWindow만 표시, 지도 이동 없음

### 문제점
1. 두 탭 간 지도 참조 방식의 일관성 부족
2. 핀이 1개일 때 중심에서 벗어난 위치에 고립되어 보임
3. 장소 클릭 시 지도 이동이 없어 사용자가 수동으로 찾아야 함

---

## 2. 요구사항

### 2.1 핀이 없을 때 (장소 0개)

| 항목 | 요구사항 |
|------|----------|
| 중심점 | 프로젝트 destination (여행지) 좌표 |
| 배율 | **zoom 11-12** (도시 전체가 한눈에 보이는 수준) |
| 근거 | 랜드마크 위치 파악 용이, 여행지 전체 조망 가능 |

### 2.2 핀이 있을 때 (장소 1개 이상)

| 항목 | 요구사항 |
|------|----------|
| 중심점 계산 | **히든 핀 + 실제 핀 기반 fitBounds** |
| 히든 핀 | 프로젝트 destination 좌표를 bounds 계산에 포함 (렌더링 안 함) |
| 효과 | 핀이 1개이고 중심에서 벗어나 있어도 pooling effect로 적절한 뷰 제공 |
| 배율 제한 | **min: 10, max: 16** (핀 1-2개일 때 과도한 확대 방지) |

**예시 동작**:
```
핀 1개 (도쿄 스카이트리) + 히든 핀 (도쿄 중심)
→ bounds가 두 점을 포함하도록 계산
→ 스카이트리만 있어도 도쿄 도심까지 함께 보임
```

### 2.3 장소 클릭 동작

| 항목 | 요구사항 |
|------|----------|
| 지도 이동 | **panTo()로 클릭한 장소 좌표로 부드럽게 이동** |
| 배율 | **현재 배율 유지** (사용자가 설정한 줌 레벨 존중) |
| InfoWindow | 기존처럼 표시 |
| 적용 범위 | PlaceList, ItineraryTimeline 모든 장소 클릭에 적용 |

### 2.4 탭별 동작 차별화

#### Places 탭
| 항목 | 동작 |
|------|------|
| 기본 뷰 | 모든 장소 + 히든 핀 fitBounds |
| 장소 클릭 | panTo + InfoWindow |
| Day 개념 | 없음 |

#### Itinerary 탭
| 항목 | 동작 |
|------|------|
| Day 미선택 | 모든 장소 + 히든 핀 fitBounds |
| Day 선택 | **해당 Day 장소만 + 히든 핀 fitBounds** |
| 장소 클릭 | panTo + InfoWindow |

### 2.5 탭 전환 동작

| 전환 방향 | 동작 |
|----------|------|
| Places → Itinerary | **fitBounds 재실행** (Itinerary 기본 뷰로 초기화) |
| Itinerary → Places | **fitBounds 재실행** (Places 기본 뷰로 초기화) |

---

## 3. 기능 요구사항 정리

### FR-01: 히든 핀 기반 bounds 계산
- 프로젝트 destination 좌표를 가상 기준점으로 bounds에 포함
- 실제 마커로 렌더링하지 않음
- 모든 fitBounds 호출 시 적용

### FR-02: fitBounds zoom 제한
- 최소 zoom: 10 (너무 축소 방지)
- 최대 zoom: 16 (핀 1-2개일 때 과도한 확대 방지)
- Google Maps `fitBounds()` 후 zoom 보정 로직 추가

### FR-03: 장소 클릭 시 지도 이동
- `map.panTo({ lat, lng })` 호출
- 현재 zoom level 유지
- PlaceList, ItineraryTimeline 클릭 이벤트에 적용

### FR-04: 탭 전환 시 초기화
- activeTab 변경 감지
- 해당 탭의 기본 뷰로 fitBounds 재실행

### FR-05: 핀 없을 때 기본 배율
- zoom 11 또는 12로 고정
- destination 중심 표시

---

## 4. 비기능 요구사항

### NFR-01: 부드러운 애니메이션
- panTo, fitBounds 시 부드러운 전환 효과
- 갑작스러운 지도 점프 방지

### NFR-02: 성능
- bounds 계산 로직이 렌더링 성능에 영향 최소화
- 불필요한 fitBounds 재호출 방지 (의존성 배열 최적화)

### NFR-03: 반응형 일관성
- 데스크탑/태블릿/모바일 모든 뷰에서 동일한 로직 적용

---

## 5. 사용자 스토리

### US-01: 프로젝트 첫 진입
> 사용자가 프로젝트에 처음 진입하면, 장소 유무와 관계없이 여행지 전체가 보이는 적절한 뷰를 제공받는다.

**인수 조건**:
- [ ] 장소 0개: destination 중심, zoom 11-12
- [ ] 장소 1개: 히든 핀 포함 fitBounds, zoom 10-16 범위 내
- [ ] 장소 다수: 모든 핀 + 히든 핀 fitBounds

### US-02: 장소 클릭
> 사용자가 장소 목록에서 장소를 클릭하면, 지도가 해당 장소로 부드럽게 이동하고 InfoWindow가 표시된다.

**인수 조건**:
- [ ] 지도 중심이 클릭한 장소로 이동
- [ ] 현재 zoom level 유지
- [ ] InfoWindow 표시

### US-03: Day 선택 (Itinerary)
> 사용자가 일정 탭에서 특정 Day를 선택하면, 해당 Day의 장소들만 지도에 표시되고 적절한 뷰로 조정된다.

**인수 조건**:
- [ ] 해당 Day 장소만 마커 표시
- [ ] 히든 핀 포함 fitBounds
- [ ] zoom 10-16 범위 내

### US-04: 탭 전환
> 사용자가 Places ↔ Itinerary 탭을 전환하면, 각 탭의 기본 뷰로 지도가 초기화된다.

**인수 조건**:
- [ ] Places 탭: 모든 장소 fitBounds
- [ ] Itinerary 탭: 기본 뷰 또는 이전 선택 Day 유지

---

## 6. 열린 질문 (Open Questions)

| 번호 | 질문 | 상태 |
|------|------|------|
| OQ-01 | 히든 핀의 가중치를 조절할 필요가 있는가? (예: 핀이 많을수록 히든 핀 영향력 감소) | 미결정 |
| OQ-02 | 모바일에서 지도 영역이 작을 때 다른 zoom 기본값 필요한가? | 미결정 |
| OQ-03 | 탭 전환 시 이전 Day 선택 상태를 유지할 것인가? | 미결정 |

---

## 7. 관련 파일

| 파일 | 역할 |
|------|------|
| `components/map/GoogleMap.tsx` | 지도 컴포넌트 - bounds/center/zoom 로직 |
| `components/layout/PlacesLayout.tsx` | Places 탭 레이아웃 |
| `components/layout/ItineraryLayout.tsx` | Itinerary 탭 레이아웃 |
| `app/(dashboard)/projects/[id]/page.tsx` | 프로젝트 상세 페이지 - 상태 관리 |
| `app/(dashboard)/projects/[id]/_hooks/useProjectDetail.ts` | mapCenter 계산 훅 |

---

## 8. 구현 가이드 (참고용)

### fitBounds with zoom 제한 예시
```typescript
const fitBoundsWithLimits = (map: google.maps.Map, bounds: google.maps.LatLngBounds) => {
  map.fitBounds(bounds)

  // fitBounds 후 zoom 보정
  const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
    const zoom = map.getZoom()
    if (zoom && zoom > 16) map.setZoom(16)
    if (zoom && zoom < 10) map.setZoom(10)
  })
}
```

### 히든 핀 bounds 계산 예시
```typescript
const calculateBoundsWithHiddenPin = (
  places: MapPlace[],
  destinationCoord: { lat: number; lng: number }
) => {
  const bounds = new google.maps.LatLngBounds()

  // 히든 핀 (destination) 추가
  bounds.extend(destinationCoord)

  // 실제 장소들 추가
  places.forEach((place) => {
    bounds.extend({ lat: place.latitude, lng: place.longitude })
  })

  return bounds
}
```

---

## 9. 다음 단계

1. **설계**: `/sc:design` - GoogleMap 컴포넌트 리팩토링 설계
2. **워크플로우**: `/sc:workflow` - 구현 순서 및 작업 분할
3. **구현**: `/sc:implement` - 코드 작성

---

*이 문서는 `/sc:brainstorm` 세션을 통해 생성되었습니다.*
