# 신규 기능 청사진 (New Features Blueprint)

> **작성일**: 2026-01-24
> **상태**: 요구사항 발견 및 분석
> **기준 문서**: `ITINERARY_REQUIREMENTS.md`, `ITINERARY_ARCHITECTURE_DESIGN.md`

---

## 개요

이 문서는 Travel Planner 프로젝트의 6가지 신규 기능에 대한 종합적인 청사진을 제공합니다.

### 기능 목록

| # | 기능명 | 우선순위 | 의존성 |
|---|--------|----------|--------|
| 1 | 챗봇 기반 여행 핀/플랜 생성 | 중간 | Phase 1-5 완료 |
| 2 | 경로 최적화 | 낮음 | 일정 기능 완료 |
| 3 | Google Maps 링크 자동 처리 | 높음 | 없음 |
| 4 | 장소 검색 (핀 추가) | 높음 | 없음 |
| 5 | 실패한 이미지 인식 삭제 | 높음 | 없음 |
| 6 | Phase 6 & 7 구현 | 중간 | Phase 5 완료 |

---

## 권장 구현 순서

```
우선순위 1 (Quick Wins - 독립적, 즉시 가치 제공)
├── 5. 실패한 이미지 인식 삭제 (UX 개선, 간단)
├── 3. Google Maps 링크 자동 처리 (입력 확장)
└── 4. 장소 검색 기능 (핀 추가 편의성)

우선순위 2 (핵심 협업 기능)
└── 6. Phase 6 & 7 (실시간 협업 + 공유 확장)

우선순위 3 (고급 기능)
├── 1. 챗봇 기반 여행 플랜 생성 (AI 통합)
└── 2. 경로 최적화 (알고리즘/API 필요)
```

---

## 1. 챗봇 기반 여행 핀/플랜 생성

### 1.1 개요

**사용자 스토리:**
> "여행자로서, 자연어로 '도쿄 3박 4일 여행 추천해줘'라고 입력하면 AI가 장소를 추천하고 일정을 자동 생성해준다"

### 1.2 기능 범위

| 기능 | 설명 | MVP |
|------|------|-----|
| 자연어 장소 요청 | "신주쿠 근처 라멘집 추천" → 장소 추출 | ✅ |
| 일정 자동 생성 | "3박 4일 도쿄 여행" → Day별 일정 생성 | ✅ |
| 대화 컨텍스트 유지 | 이전 대화 기반 후속 질문 처리 | ✅ |
| 장소 상세 설명 | 추천 장소에 대한 설명/이유 제공 | ✅ |
| 일정 수정 요청 | "2일차에 카페 추가해줘" | 🔄 Phase 2 |

### 1.3 기술 요구사항

**LLM 통합:**
```typescript
// 사용할 모델: Claude API (기존 인프라 활용)
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatSession {
  id: string
  projectId: string
  messages: ChatMessage[]
  context: {
    destination: string
    country: string
    travelDates?: { start: Date; end: Date }
  }
}
```

**프롬프트 전략:**
```
System: 당신은 여행 플래너 어시스턴트입니다. 사용자의 여행 목적지 "{destination}"에 대해 장소를 추천하고 일정을 계획합니다.

규칙:
1. 장소 추천 시 JSON 형식으로 반환: { places: [...], reasoning: "..." }
2. 일정 생성 시 Day별 구조로 반환
3. 한국어로 친절하게 응답
4. 현지 팁과 주의사항 포함

User: {user_message}
```

### 1.4 데이터 모델

```prisma
model ChatSession {
  id        String   @id @default(cuid())
  projectId String

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
}

model ChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String   // "user" | "assistant"
  content   String   @db.Text

  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // 메시지로 생성된 장소/일정 참조
  createdPlaces Place[]

  createdAt DateTime @default(now())

  @@index([sessionId])
}
```

### 1.5 API 설계

```
POST /api/projects/[id]/chat
→ 메시지 전송, AI 응답 수신

GET /api/projects/[id]/chat/history
→ 대화 이력 조회

POST /api/projects/[id]/chat/apply
→ AI 추천 장소/일정을 프로젝트에 적용
```

### 1.6 UI 설계

```
┌─────────────────────────────────────────────────────┐
│  [입력] [장소] [일정] [💬 AI 어시스턴트]             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🤖 도쿄 여행을 도와드릴게요!                   │  │
│  │    무엇이 궁금하신가요?                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 👤 신주쿠에서 점심 먹을 라멘집 추천해줘        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🤖 신주쿠 라멘 맛집 3곳을 추천드려요:          │  │
│  │                                                │  │
│  │ 1. **후우운지** ⭐ 4.5                         │  │
│  │    📍 신주쿠 3초메                             │  │
│  │    농후한 돈코츠 라멘                          │  │
│  │    [+ 장소 추가]                               │  │
│  │                                                │  │
│  │ 2. **이치란 신주쿠점** ⭐ 4.3                  │  │
│  │    📍 가부키초                                 │  │
│  │    1인 부스 스타일                             │  │
│  │    [+ 장소 추가]                               │  │
│  │                                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  메시지를 입력하세요...              [전송]   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.7 구현 복잡도

| 항목 | 복잡도 | 비고 |
|------|--------|------|
| Claude API 통합 | 낮음 | 기존 인프라 활용 |
| 대화 세션 관리 | 중간 | 컨텍스트 유지 필요 |
| 장소 자동 생성 | 중간 | Geocoding 연동 |
| 일정 자동 생성 | 높음 | 복잡한 프롬프트 필요 |
| UI 구현 | 중간 | 채팅 인터페이스 |

**예상 작업량**: 1.5~2주

---

## 2. 경로 최적화

### 2.1 개요

**사용자 스토리:**
> "여행자로서, Day별 장소들의 방문 순서를 최적화하여 이동 시간을 줄일 수 있다"

### 2.2 기술적 접근 방식

**Option A: 자체 TSP 알고리즘**
```typescript
// Nearest Neighbor 휴리스틱 (간단, 빠름)
function optimizeRoute(places: Place[]): Place[] {
  const visited = new Set<string>()
  const result: Place[] = []
  let current = places[0]

  while (result.length < places.length) {
    result.push(current)
    visited.add(current.id)

    // 가장 가까운 미방문 장소 선택
    current = places
      .filter(p => !visited.has(p.id))
      .sort((a, b) =>
        distance(current, a) - distance(current, b)
      )[0]
  }

  return result
}

// Haversine 거리 계산
function distance(a: Place, b: Place): number {
  const R = 6371 // km
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  // ... Haversine formula
}
```

**Option B: Google Directions API**
```typescript
// Google Routes API 활용 (더 정확, 실제 이동 시간 고려)
async function optimizeWithGoogle(places: Place[]): Promise<{
  optimizedOrder: Place[]
  totalDuration: number
  totalDistance: number
  legs: RouteLeg[]
}> {
  const response = await fetch(
    `https://routes.googleapis.com/directions/v2:computeRoutes`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.legs,routes.optimizedIntermediateWaypointIndex'
      },
      body: JSON.stringify({
        origin: { location: { latLng: places[0] } },
        destination: { location: { latLng: places[places.length - 1] } },
        intermediates: places.slice(1, -1).map(p => ({
          location: { latLng: { latitude: p.latitude, longitude: p.longitude } }
        })),
        optimizeWaypointOrder: true,
        travelMode: 'WALK' // or 'DRIVE', 'TRANSIT'
      })
    }
  )
  // ...
}
```

### 2.3 기능 설계

| 기능 | 설명 |
|------|------|
| Day별 최적화 | 각 Day의 장소 순서 최적화 |
| 이동 수단 선택 | 도보/대중교통/자동차 |
| 이동 시간 표시 | 장소 간 예상 이동 시간 |
| 총 이동 거리 표시 | Day별/전체 이동 거리 |
| 시작점/종료점 고정 | 호텔 출발/귀환 고려 |

### 2.4 UI 설계

```
┌─────────────────────────────────────────────────────┐
│  Day 1 - 3월 15일                                   │
│                                                     │
│  ┌─ 경로 최적화 ────────────────────────────────┐  │
│  │ 이동 수단: [🚶 도보] [🚇 대중교통] [🚗 자동차]│  │
│  │                                               │  │
│  │ 현재 순서 총 이동: 12.3km, 약 2시간 15분      │  │
│  │ 최적화 후 예상:   8.7km, 약 1시간 30분        │  │
│  │                                               │  │
│  │ [🔄 순서 최적화 적용]                         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  📍 1. 센소지                                       │
│     ↓ 도보 15분 (1.2km)                            │
│  📍 2. 스카이트리                                   │
│     ↓ 전철 25분 (5.1km)                            │
│  📍 3. 시부야                                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.5 API 설계

```
POST /api/itinerary/[id]/days/[dayId]/optimize
Request:
{
  "travelMode": "WALK" | "TRANSIT" | "DRIVE",
  "fixStart": boolean,  // 첫 장소 고정
  "fixEnd": boolean     // 마지막 장소 고정
}

Response:
{
  "optimizedItems": ItineraryItem[],
  "totalDistance": number,
  "totalDuration": number,
  "legs": {
    "from": string,
    "to": string,
    "distance": number,
    "duration": number
  }[]
}
```

### 2.6 비용 고려

| 방식 | 비용 | 정확도 | 제한 |
|------|------|--------|------|
| 자체 TSP | 무료 | 중간 | 직선 거리만 |
| Google Routes API | $5/1000 요청 | 높음 | 일일 한도 |

**권장**: 하이브리드 접근
- 기본: 자체 TSP (무료)
- 프리미엄: Google Routes (유료 옵션)

### 2.7 구현 복잡도

| 항목 | 복잡도 |
|------|--------|
| TSP 알고리즘 | 중간 |
| Google API 통합 | 낮음 |
| 이동 시간 표시 UI | 중간 |
| 실시간 최적화 | 높음 |

**예상 작업량**: 1~1.5주

---

## 3. Google Maps 링크 자동 처리

### 3.1 개요

**사용자 스토리:**
> "여행자로서, Google Maps 링크를 붙여넣으면 자동으로 장소 정보가 추출되어 프로젝트에 추가된다"

### 3.2 지원 URL 형식

```
1. 공유 링크 (짧은 URL)
https://maps.app.goo.gl/ABC123

2. 장소 검색 결과
https://www.google.com/maps/place/센소지/@35.7147651,139.7966553,17z

3. 좌표 URL
https://www.google.com/maps?q=35.7147651,139.7966553

4. Place ID URL
https://www.google.com/maps/place/?q=place_id:ChIJ8T1GpMGOGGARDYGSgpooDWw
```

### 3.3 구현 로직

```typescript
// lib/google-maps-parser.ts

interface ParsedMapLink {
  type: 'place' | 'coordinates' | 'short'
  placeId?: string
  placeName?: string
  coordinates?: { lat: number; lng: number }
  originalUrl: string
}

export async function parseGoogleMapsUrl(url: string): Promise<ParsedMapLink> {
  // 1. 짧은 URL 리다이렉트 해결
  if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
    const resolvedUrl = await resolveShortUrl(url)
    return parseGoogleMapsUrl(resolvedUrl)
  }

  // 2. Place ID 추출
  const placeIdMatch = url.match(/place_id[=:]([^&/]+)/)
  if (placeIdMatch) {
    return {
      type: 'place',
      placeId: placeIdMatch[1],
      originalUrl: url
    }
  }

  // 3. 장소명 + 좌표 추출
  const placeMatch = url.match(/place\/([^/@]+)\/@([-\d.]+),([-\d.]+)/)
  if (placeMatch) {
    return {
      type: 'place',
      placeName: decodeURIComponent(placeMatch[1]),
      coordinates: {
        lat: parseFloat(placeMatch[2]),
        lng: parseFloat(placeMatch[3])
      },
      originalUrl: url
    }
  }

  // 4. 좌표만 있는 경우
  const coordMatch = url.match(/[?&@]q?=?([-\d.]+),([-\d.]+)/)
  if (coordMatch) {
    return {
      type: 'coordinates',
      coordinates: {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      },
      originalUrl: url
    }
  }

  throw new Error('Unsupported Google Maps URL format')
}

// Place Details 조회
export async function getPlaceFromParsedLink(
  parsed: ParsedMapLink
): Promise<PlaceData> {
  if (parsed.placeId) {
    return fetchPlaceDetails(parsed.placeId)
  }

  if (parsed.coordinates) {
    // Reverse geocoding
    return reverseGeocode(parsed.coordinates)
  }

  if (parsed.placeName) {
    // 장소명으로 검색
    return searchPlace(parsed.placeName)
  }

  throw new Error('Cannot resolve place from URL')
}
```

### 3.4 UI 통합

**기존 URL 입력 탭 확장:**
```
┌─────────────────────────────────────────────────────┐
│  URL 입력                                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ https://maps.app.goo.gl/ABC123               │  │
│  │                                               │  │
│  │ ✅ Google Maps 링크 감지됨                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [블로그 URL 분석] [Google Maps 링크 추가]          │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  📍 감지된 장소:                                    │
│  ┌───────────────────────────────────────────────┐  │
│  │ 센소지 (Senso-ji Temple)                      │  │
│  │ 📍 도쿄 다이토구 아사쿠사 2-3-1               │  │
│  │ ⭐ 4.5 (12,345 리뷰)                          │  │
│  │                                               │  │
│  │ [+ 장소 추가]                                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.5 API 설계

```
POST /api/projects/[id]/places/from-url
Request:
{
  "url": "https://maps.app.goo.gl/ABC123"
}

Response:
{
  "parsed": {
    "type": "place",
    "placeName": "센소지",
    "coordinates": { "lat": 35.7147651, "lng": 139.7966553 }
  },
  "place": {
    "name": "센소지",
    "name_en": "Senso-ji Temple",
    "category": "tourist_attraction",
    "latitude": 35.7147651,
    "longitude": 139.7966553,
    "formattedAddress": "...",
    "rating": 4.5,
    "googlePlaceId": "ChIJ8T1GpMGOGGARDYGSgpooDWw"
  }
}
```

### 3.6 구현 복잡도

| 항목 | 복잡도 |
|------|--------|
| URL 파싱 | 중간 (다양한 형식) |
| Short URL 해결 | 낮음 |
| Place Details 조회 | 낮음 (기존 API 활용) |
| UI 통합 | 낮음 |

**예상 작업량**: 0.5~1주

---

## 4. 장소 검색 (핀 추가)

### 4.1 개요

**사용자 스토리:**
> "여행자로서, 장소명이나 주소로 검색하여 원하는 장소를 프로젝트에 직접 추가할 수 있다"

### 4.2 기능 범위

| 기능 | 설명 | MVP |
|------|------|-----|
| 텍스트 검색 | 장소명/주소로 검색 | ✅ |
| 자동완성 | 타이핑 중 추천 | ✅ |
| 지도 클릭 추가 | 지도에서 직접 위치 선택 | 🔄 Phase 2 |
| 카테고리 필터 | 음식점/카페/관광지 등 | 🔄 Phase 2 |
| 최근 검색 | 최근 검색어 표시 | 🔄 Phase 2 |

### 4.3 기술 구현

```typescript
// Google Places Autocomplete 활용
import { useMapsLibrary } from '@vis.gl/react-google-maps'

function PlaceSearchInput({
  destination,
  onPlaceSelect
}: {
  destination: string
  onPlaceSelect: (place: PlaceData) => void
}) {
  const places = useMapsLibrary('places')
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([])

  const autocomplete = useMemo(() => {
    if (!places) return null
    return new places.AutocompleteService()
  }, [places])

  useEffect(() => {
    if (!autocomplete || !query) {
      setPredictions([])
      return
    }

    autocomplete.getPlacePredictions({
      input: query,
      // 목적지 근처로 검색 범위 제한
      locationBias: {
        center: destinationCoords,
        radius: 50000 // 50km
      },
      language: 'ko'
    }, (results) => {
      setPredictions(results || [])
    })
  }, [query, autocomplete])

  return (
    <div>
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="장소명 또는 주소 검색..."
      />
      <ul>
        {predictions.map(p => (
          <li key={p.place_id} onClick={() => handleSelect(p)}>
            {p.structured_formatting.main_text}
            <span>{p.structured_formatting.secondary_text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### 4.4 UI 설계

```
┌─────────────────────────────────────────────────────┐
│  장소 추가                                    [✕]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🔍 라멘                                       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  검색 결과:                                         │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🍜 이치란 신주쿠점                            │  │
│  │    신주쿠구 가부키초 1-22-7                   │  │
│  │    ⭐ 4.3 · 라멘                              │  │
│  │                                    [+ 추가]  │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 🍜 후우운지 (Fuunji)                          │  │
│  │    신주쿠구 요요기 2-14-3                     │  │
│  │    ⭐ 4.5 · 라멘                              │  │
│  │                                    [+ 추가]  │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 🍜 멘야 하나다                                │  │
│  │    신주쿠구 니시신주쿠 7-10-18               │  │
│  │    ⭐ 4.2 · 라멘                              │  │
│  │                                    [+ 추가]  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.5 API 설계

```
GET /api/places/search
Query:
- q: 검색어
- lat, lng: 중심 좌표
- radius: 검색 반경 (m)

Response:
{
  "predictions": [
    {
      "placeId": "ChIJ...",
      "mainText": "이치란 신주쿠점",
      "secondaryText": "신주쿠구 가부키초 1-22-7",
      "types": ["restaurant", "food"]
    }
  ]
}

POST /api/projects/[id]/places/from-search
Request:
{
  "googlePlaceId": "ChIJ..."
}

Response:
{
  "place": { ... }
}
```

### 4.6 구현 복잡도

| 항목 | 복잡도 |
|------|--------|
| Google Places API 통합 | 낮음 |
| Autocomplete UI | 중간 |
| Place Details 연동 | 낮음 (기존 활용) |
| 디바운싱/캐싱 | 낮음 |

**예상 작업량**: 0.5~1주

---

## 5. 실패한 이미지 인식 삭제

### 5.1 개요

**사용자 스토리:**
> "여행자로서, 장소를 인식하지 못한 이미지를 쉽게 삭제하여 목록을 정리할 수 있다"

### 5.2 현재 상태 분석

**현재 동작:**
- 이미지 업로드 → Claude Vision 분석 → 장소 추출
- 장소 추출 실패 시: 이미지는 저장되나 장소 없음
- 사용자가 실패한 이미지를 개별 삭제해야 함

**문제점:**
- 실패한 이미지 식별 어려움
- 일괄 삭제 기능 없음

### 5.3 개선 방안

**이미지 상태 표시:**
```typescript
type ImageStatus =
  | 'pending'      // 업로드 완료, 분석 대기
  | 'processing'   // 분석 중
  | 'success'      // 장소 추출 성공
  | 'partial'      // 일부 장소만 추출
  | 'failed'       // 장소 추출 실패
  | 'error'        // 분석 오류
```

**UI 개선:**
```
┌─────────────────────────────────────────────────────┐
│  업로드된 이미지 (8)                                │
│                                                     │
│  [전체] [성공 (5)] [실패 (3)]   [실패 항목 삭제 🗑️] │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ 📷      │ │ 📷      │ │ 📷  ⚠️  │ │ 📷  ⚠️  │  │
│  │         │ │         │ │         │ │         │  │
│  │ ✅ 3장소│ │ ✅ 2장소│ │ ❌ 실패 │ │ ❌ 실패 │  │
│  │ [삭제]  │ │ [삭제]  │ │ [☑][삭제]│ │ [☑][삭제]│  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                     │
│  선택: 2개                     [선택 항목 삭제]    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.4 기능 구현

```typescript
// 이미지 상태 조회 API 확장
interface ImageWithStatus {
  id: string
  url: string
  status: ImageStatus
  placesCount: number
  errorMessage?: string
  analyzedAt?: Date
}

// 컴포넌트
function ImageList({ projectId }: { projectId: string }) {
  const { images, isLoading } = useImages(projectId)
  const { deleteImages } = useImageMutations(projectId)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')

  const filteredImages = useMemo(() => {
    if (filter === 'all') return images
    if (filter === 'success') return images.filter(i => i.status === 'success')
    if (filter === 'failed') return images.filter(i =>
      i.status === 'failed' || i.status === 'error'
    )
  }, [images, filter])

  const failedImages = images.filter(i =>
    i.status === 'failed' || i.status === 'error'
  )

  const handleDeleteFailed = async () => {
    if (confirm(`실패한 이미지 ${failedImages.length}개를 삭제하시겠습니까?`)) {
      await deleteImages(failedImages.map(i => i.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    await deleteImages(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  // ...
}
```

### 5.5 API 확장

```
// 기존 API 확장
GET /api/projects/[id]/images
Response:
{
  "images": [
    {
      "id": "...",
      "url": "...",
      "status": "success",
      "placesCount": 3,
      "analyzedAt": "2026-01-24T..."
    },
    {
      "id": "...",
      "url": "...",
      "status": "failed",
      "errorMessage": "장소를 인식할 수 없습니다",
      "analyzedAt": "2026-01-24T..."
    }
  ]
}

// 일괄 삭제 API
DELETE /api/projects/[id]/images/bulk
Request:
{
  "imageIds": ["id1", "id2", "id3"]
}
```

### 5.6 구현 복잡도

| 항목 | 복잡도 |
|------|--------|
| 상태 표시 UI | 낮음 |
| 필터링 기능 | 낮음 |
| 일괄 삭제 API | 낮음 |
| 선택 UI | 낮음 |

**예상 작업량**: 0.5주

---

## 6. Phase 6 & 7 구현

### 6.1 Phase 6: 실시간 협업

#### 6.1.1 개요

**사용자 스토리:**
> "여행자로서, 다른 멤버의 변경 사항이 실시간으로 반영되어 동시에 일정을 편집할 수 있다"

#### 6.1.2 기술 스택

- **Supabase Realtime**: WebSocket 기반 실시간 통신
- **Broadcast**: 이벤트 브로드캐스트
- **Presence**: 접속자 상태 관리

#### 6.1.3 핵심 구현

```typescript
// infrastructure/services/realtime/RealtimeClient.ts

import { createClient, RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export class ProjectRealtimeClient {
  private channel: RealtimeChannel

  constructor(projectId: string) {
    this.channel = supabase.channel(`project:${projectId}`)
  }

  // 브로드캐스트 이벤트 전송
  broadcast(event: RealtimeEvent) {
    this.channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event
    })
  }

  // 이벤트 구독
  onSync(callback: (event: RealtimeEvent) => void) {
    this.channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      callback(payload)
    })
    return this
  }

  // Presence 추적
  trackPresence(userInfo: PresenceState) {
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track(userInfo)
      }
    })
  }

  // 접속자 목록 구독
  onPresence(callback: (members: PresenceState[]) => void) {
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState<PresenceState>()
      const members = Object.values(state).flat()
      callback(members)
    })
    return this
  }

  disconnect() {
    this.channel.unsubscribe()
  }
}
```

#### 6.1.4 SWR 캐시 무효화 연동

```typescript
// hooks/realtime/useRealtimeSync.ts

export function useRealtimeSync(projectId: string) {
  const { mutate } = useSWRConfig()
  const [client, setClient] = useState<ProjectRealtimeClient | null>(null)

  useEffect(() => {
    const realtimeClient = new ProjectRealtimeClient(projectId)

    realtimeClient.onSync((event) => {
      switch (event.type) {
        case 'itinerary:updated':
        case 'item:created':
        case 'item:updated':
        case 'item:deleted':
        case 'items:reordered':
          mutate(`/projects/${projectId}/itinerary`)
          break

        case 'member:joined':
        case 'member:left':
          mutate(`/projects/${projectId}/members`)
          break
      }
    })

    setClient(realtimeClient)

    return () => realtimeClient.disconnect()
  }, [projectId, mutate])

  return { broadcast: client?.broadcast.bind(client) }
}
```

#### 6.1.5 접속자 표시 UI

```
┌─────────────────────────────────────────────────────┐
│  도쿄 여행 프로젝트                                 │
│                                                     │
│  현재 접속 중:                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🟢 김철수 (나)   🟢 이영희   🟢 박지민       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 6.1.6 충돌 처리 (LWW)

```typescript
// API 라우트에서 LWW 적용
async function updateItineraryItem(
  itemId: string,
  data: UpdateItemRequest,
  clientTimestamp: number
) {
  const existing = await prisma.itineraryItem.findUnique({
    where: { id: itemId }
  })

  // 서버의 데이터가 더 최신이면 무시
  if (existing && existing.updatedAt.getTime() > clientTimestamp) {
    return {
      success: false,
      reason: 'conflict',
      serverData: existing
    }
  }

  const updated = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: { ...data, updatedAt: new Date() }
  })

  // 다른 클라이언트에 브로드캐스트
  broadcastToProject(projectId, {
    type: 'item:updated',
    payload: { id: itemId, changes: data }
  })

  return { success: true, data: updated }
}
```

### 6.2 Phase 7: 공유 확장

#### 6.2.1 개요

**사용자 스토리:**
> "여행자로서, 완성된 일정을 공유 링크로 보여주고, 다른 사람이 내 일정을 복제할 수 있다"

#### 6.2.2 공유 페이지 일정 뷰

**기존 공유 페이지 확장:**
```
┌─────────────────────────────────────────────────────┐
│  🌸 도쿄 3박 4일 여행                               │
│  by 김철수 · 2026.03.15 - 03.18                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [장소] [일정]                    [이 여행 복제하기]│
│                                                     │
│  ✈️ 항공편                                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🛫 인천 → 나리타  |  3/15 09:00               │  │
│  │ 🛬 나리타 → 인천  |  3/18 18:00               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  🏨 숙소                                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ 시부야 엑셀 호텔 (3/15~18, 3박)               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Day1] [Day2] [Day3] [Day4]                        │
│                                                     │
│  Day 1 - 3월 15일 (토)                              │
│  ┌───────────────────────────────────────────────┐  │
│  │ 1. 센소지                                     │  │
│  │    📍 아사쿠사 | ⏰ 10:00                      │  │
│  ├───────────────────────────────────────────────┤  │
│  │ 2. 스카이트리                                 │  │
│  │    📍 스미다구 | ⏰ 14:00                      │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 6.2.3 일정 복제 API

```typescript
// POST /api/share/[token]/clone-itinerary

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Login required to clone itinerary' },
      { status: 401 }
    )
  }

  const { token } = await params

  // 1. 원본 프로젝트 조회
  const sourceProject = await prisma.project.findUnique({
    where: { shareToken: token, shareEnabled: true },
    include: {
      places: true,
      itinerary: {
        include: {
          days: { include: { items: true } },
          flights: true,
          accommodations: true
        }
      }
    }
  })

  if (!sourceProject) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 2. 새 프로젝트 생성
  const newProject = await prisma.project.create({
    data: {
      userId: session.user.id,
      name: `${sourceProject.name} (복제)`,
      destination: sourceProject.destination,
      country: sourceProject.country
    }
  })

  // 3. 장소 복제 (ID 매핑 유지)
  const placeIdMap = new Map<string, string>()

  for (const place of sourceProject.places) {
    const newPlace = await prisma.place.create({
      data: {
        projectId: newProject.id,
        name: place.name,
        name_en: place.name_en,
        category: place.category,
        latitude: place.latitude,
        longitude: place.longitude,
        formattedAddress: place.formattedAddress,
        googlePlaceId: place.googlePlaceId
      }
    })
    placeIdMap.set(place.id, newPlace.id)
  }

  // 4. 일정 복제
  if (sourceProject.itinerary) {
    const sourceItinerary = sourceProject.itinerary

    const newItinerary = await prisma.itinerary.create({
      data: {
        projectId: newProject.id,
        title: sourceItinerary.title,
        startDate: sourceItinerary.startDate,
        endDate: sourceItinerary.endDate
      }
    })

    // Days 복제
    for (const day of sourceItinerary.days) {
      const newDay = await prisma.itineraryDay.create({
        data: {
          itineraryId: newItinerary.id,
          dayNumber: day.dayNumber,
          date: day.date
        }
      })

      // Items 복제 (새 placeId 사용)
      for (const item of day.items) {
        await prisma.itineraryItem.create({
          data: {
            dayId: newDay.id,
            placeId: placeIdMap.get(item.placeId)!,
            order: item.order,
            startTime: item.startTime,
            note: item.note
          }
        })
      }
    }

    // Flights 복제
    for (const flight of sourceItinerary.flights) {
      await prisma.flight.create({
        data: {
          itineraryId: newItinerary.id,
          departureCity: flight.departureCity,
          arrivalCity: flight.arrivalCity,
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          departureDate: flight.departureDate,
          arrivalDate: flight.arrivalDate,
          note: flight.note
        }
      })
    }

    // Accommodations 복제
    for (const accom of sourceItinerary.accommodations) {
      await prisma.accommodation.create({
        data: {
          itineraryId: newItinerary.id,
          name: accom.name,
          address: accom.address,
          latitude: accom.latitude,
          longitude: accom.longitude,
          checkIn: accom.checkIn,
          checkOut: accom.checkOut,
          note: accom.note
        }
      })
    }
  }

  return NextResponse.json({
    projectId: newProject.id,
    message: 'Itinerary cloned successfully'
  })
}
```

### 6.3 구현 복잡도

| Phase | 항목 | 복잡도 |
|-------|------|--------|
| 6 | Supabase Realtime 설정 | 중간 |
| 6 | 브로드캐스트 이벤트 | 중간 |
| 6 | SWR 캐시 연동 | 낮음 |
| 6 | Presence UI | 낮음 |
| 6 | LWW 충돌 처리 | 중간 |
| 7 | 공유 페이지 일정 뷰 | 낮음 |
| 7 | 일정 복제 API | 중간 |
| 7 | 복제 UI | 낮음 |

**예상 작업량**:
- Phase 6: 1주
- Phase 7: 0.5주

---

## 전체 구현 타임라인

```
Week 1: Quick Wins
├── Day 1-2: 실패한 이미지 삭제 (#5)
├── Day 3-4: Google Maps 링크 처리 (#3)
└── Day 5: 장소 검색 기능 (#4)

Week 2: Phase 6 & 7
├── Day 1-3: 실시간 협업 (Phase 6)
├── Day 4: 공유 확장 (Phase 7)
└── Day 5: 테스트 및 버그 수정

Week 3-4: 고급 기능
├── Day 1-5: 챗봇 기반 플랜 생성 (#1)
└── Day 6-10: 경로 최적화 (#2)

총 예상 기간: 3-4주
```

---

## 성공 기준

### 기능별 KPI

| 기능 | 성공 기준 |
|------|-----------|
| 챗봇 | 응답 시간 < 5초, 장소 추출 정확도 > 80% |
| 경로 최적화 | 이동 거리 20% 이상 단축 |
| Maps 링크 | 95% 이상 URL 파싱 성공 |
| 장소 검색 | 자동완성 응답 < 300ms |
| 이미지 삭제 | 일괄 삭제 성공률 100% |
| 실시간 협업 | 동기화 지연 < 500ms |

### E2E 테스트 커버리지

```
tests/
├── e2e/
│   ├── chatbot.spec.ts
│   ├── route-optimization.spec.ts
│   ├── google-maps-link.spec.ts
│   ├── place-search.spec.ts
│   ├── failed-image-delete.spec.ts
│   ├── realtime-sync.spec.ts
│   └── itinerary-clone.spec.ts
```

---

*최종 업데이트: 2026-01-24*
