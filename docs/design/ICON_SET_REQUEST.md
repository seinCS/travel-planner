# 아이콘 셋 제작 요청서

**프로젝트**: Travel Planner (여행 플래너 웹 애플리케이션)
**작성일**: 2026-01-27
**요청자**: Travel Planner 개발팀
**제작 방식**: AI 생성 (Midjourney, DALL-E 등) → SVG 변환

---

## 1. 프로젝트 개요

SNS 스크린샷에서 AI로 장소를 추출하고, 지도에 시각화하며, 일정을 계획하는 여행 플래너 웹앱입니다. 현재 lucide-react 범용 아이콘 라이브러리를 사용 중이며, **프로젝트 고유의 커스텀 아이콘 셋으로 전체 교체**합니다.

**배포 URL**: https://travel-planner-ten-ebon.vercel.app

---

## 2. 아이콘 셋 기본 사양

| 항목 | 사양 |
|------|------|
| **이름** | (추후 결정 — 예: TravelKit Icons, Voyager Icons 등) |
| **기본 사이즈** | 24x24px (viewBox: 0 0 24 24) |
| **납품 포맷** | SVG |
| **총 아이콘 수** | 약 55~60개 |
| **스트로크 두께** | 1.5px~2px (24px 기준) |
| **코너 라운딩** | 2px (부드러운 인상) |
| **색상** | 단색 (currentColor 사용, CSS로 색상 제어) |

---

## 3. 스타일 가이드

### 3.1 추천 스타일: **듀오톤 (Duotone)**

**선정 이유 (UX 관점)**:

1. **시각적 위계 구분이 명확함**: 라인 아이콘은 정보 밀도가 높은 UI에서 배경에 묻히기 쉽고, 솔리드 아이콘은 너무 무거워 glassmorphism 배경과 충돌합니다. 듀오톤은 주요 형태(100% opacity)와 보조 디테일(40% opacity)을 분리하여 **아이콘의 핵심 의미를 즉시 인지**할 수 있습니다.

2. **glassmorphism 디자인과 자연스러운 조화**: 프로젝트의 반투명 glass-card UI에서 듀오톤의 투명도 레이어가 자연스럽게 어우러집니다.

3. **카테고리 색상 시스템과 호환**: 식당(빨강), 카페(갈색), 관광(파랑) 등 이미 정의된 카테고리별 색상을 듀오톤 구조에 적용하면 **색상만으로 카테고리를 직관적으로 구분**할 수 있습니다.

4. **상태 전환이 풍부함**: 비활성(보조 레이어만) → 호버(주요 레이어 등장) → 활성(두 레이어 모두 진하게) 등 인터랙션 피드백을 자연스럽게 표현할 수 있습니다.

### 3.2 듀오톤 구현 규칙

```
- 주요 레이어 (Primary): 아이콘의 핵심 형태, opacity 100%
- 보조 레이어 (Secondary): 디테일/배경, opacity 40%
- SVG 내부에서 두 레이어를 별도 그룹으로 분리
  - <g class="duotone-primary">...</g>
  - <g class="duotone-secondary" opacity="0.4">...</g>
```

### 3.3 디자인 원칙

| 원칙 | 설명 |
|------|------|
| **명료성** | 16px로 축소해도 형태가 식별 가능해야 함 |
| **일관성** | 모든 아이콘의 시각적 무게(optical weight)가 균일 |
| **의미 직관성** | 아이콘만으로 기능/카테고리를 추론 가능 |
| **여행 테마** | 범용적이되 여행 맥락이 느껴지는 디자인 |

---

## 4. 아이콘 목록

### 4.1 카테고리 아이콘 (Place Categories) — 7개

| # | 아이콘 이름 | 용도 | 현재 사용 | 디자인 설명 |
|---|-----------|------|----------|------------|
| 1 | `restaurant` | 식당/음식점 | UtensilsCrossed | 나이프와 포크가 교차, 접시 형태의 보조 레이어 |
| 2 | `cafe` | 카페/커피숍 | Coffee | 커피잔에서 김 올라오는 형태, 잔받침 보조 레이어 |
| 3 | `attraction` | 관광명소 | Camera | 카메라/랜드마크 형태, 프레임 보조 레이어 |
| 4 | `shopping` | 쇼핑 | ShoppingBag | 쇼핑백, 손잡이가 주요 레이어 |
| 5 | `accommodation` | 숙소 | Building2 | 건물/호텔 형태, 창문 디테일 보조 레이어 |
| 6 | `transport` | 교통 | Plane | 이동수단(비행기/기차), 경로선 보조 레이어 |
| 7 | `other` | 기타 | MapPin | 범용 핀 마커, 원형 포인트가 주요 레이어 |

**적용 위치**: `PlaceDetailsPanel`, `SortableTimelineItem`, `SharedItineraryView`, 카테고리 배지 전역

### 4.2 네비게이션/탭 아이콘 — 7개

| # | 아이콘 이름 | 용도 | 현재 사용 | 디자인 설명 |
|---|-----------|------|----------|------------|
| 8 | `tab-image` | 이미지 입력 탭 | Image | 사진/이미지 프레임, 산 풍경 보조 레이어 |
| 9 | `tab-text` | 텍스트 입력 탭 | FileText | 텍스트 문서, 줄 패턴 보조 레이어 |
| 10 | `tab-url` | URL 입력 탭 | Link | 링크 체인, 연결선 보조 레이어 |
| 11 | `tab-map` | 지도 보기 탭 | Map | 접힌 지도, 핀 마커 보조 레이어 |
| 12 | `tab-places` | 장소 목록 탭 | MapPin | 복수 핀 마커가 나열, 리스트 보조 레이어 |
| 13 | `tab-itinerary` | 일정 탭 | Calendar | 캘린더에 여행 루트 표시, 날짜 보조 레이어 |
| 14 | `tab-members` | 멤버 탭 | Users (이모지 👥) | 여행 동행자 2~3명, 여행가방 보조 레이어 |

**적용 위치**: `InputTabs`, `MainTabNavigation`, `MobileNavigation`

### 4.3 액션/컨트롤 아이콘 — 12개

| # | 아이콘 이름 | 용도 | 현재 사용 | 디자인 설명 |
|---|-----------|------|----------|------------|
| 15 | `close` | 닫기 | X | X 마크 |
| 16 | `expand` | 펼치기 | ChevronDown | 아래 방향 화살표 |
| 17 | `collapse` | 접기 | ChevronUp | 위 방향 화살표 |
| 18 | `navigate-next` | 다음/진입 | ChevronRight | 오른쪽 방향 화살표 |
| 19 | `star` | 즐겨찾기/평점 | Star | 별 형태, 빈 별과 채워진 별 2가지 상태 |
| 20 | `delete` | 삭제 | Trash2 | 휴지통, 뚜껑 보조 레이어 |
| 21 | `confirm` | 확인/완료 | Check | 체크 마크, 원형 배경 보조 레이어 |
| 22 | `add` | 추가 | Plus | 플러스 기호 |
| 23 | `search` | 검색 | Search | 돋보기 |
| 24 | `send` | 메시지 전송 | Send | 종이비행기 형태 (여행 테마 강조) |
| 25 | `upload` | 파일 업로드 | Upload | 위 화살표 + 트레이 |
| 26 | `external-link` | 외부 링크 | ExternalLink | 화살표가 박스 밖으로 나가는 형태 |

**적용 위치**: 모든 컴포넌트의 버튼, 컨트롤 요소 전역

### 4.4 여행 특화 아이콘 — 10개

| # | 아이콘 이름 | 용도 | 현재 사용 | 디자인 설명 |
|---|-----------|------|----------|------------|
| 27 | `flight` | 항공편 | Plane | 비행기 측면 형태, 구름 보조 레이어 |
| 28 | `hotel` | 호텔/숙소 | Hotel | 호텔 건물, 별 표시 보조 레이어 |
| 29 | `check-in` | 체크인 | Hotel | 호텔 + 입장 화살표, 열쇠 보조 레이어 |
| 30 | `check-out` | 체크아웃 | Luggage | 캐리어 + 퇴장 화살표 |
| 31 | `stay` | 숙박 | BedDouble | 침대 형태, 베개 보조 레이어 |
| 32 | `location-pin` | 위치 마커 | MapPin | 여행 테마 핀 (깃발/compass 느낌) |
| 33 | `luggage` | 짐/캐리어 | Luggage | 캐리어 가방, 바퀴 보조 레이어 |
| 34 | `passport` | 여권/신분증 | (없음, 신규) | 여권 책자, 스탬프 보조 레이어 |
| 35 | `route` | 이동경로 | (없음, 신규) | 점선 경로와 핀 마커 |
| 36 | `globe` | 세계/국가 | Globe | 지구본, 대륙 보조 레이어 |

**적용 위치**: `FlightSection`, `AccommodationSection`, `SortableTimelineItem`, `TravelSummaryBar`

### 4.5 기능/상태 아이콘 — 11개

| # | 아이콘 이름 | 용도 | 현재 사용 | 디자인 설명 |
|---|-----------|------|----------|------------|
| 37 | `ai-sparkle` | AI 기능 | Sparkles | 마법 반짝임, 뉴럴 패턴 보조 레이어 |
| 38 | `screenshot` | 스크린샷 분석 | Camera | 스크린 프레임 안의 카메라 |
| 39 | `gallery` | 이미지 갤러리 | ImageIcon | 복수 이미지 겹침, 사진 프레임 보조 레이어 |
| 40 | `loading` | 로딩 중 | Loader2 | 회전 원형, animate-spin과 호환 |
| 41 | `success` | 성공 | CheckCircle | 원 안의 체크마크, 원형 보조 레이어 |
| 42 | `error` | 오류 | AlertCircle | 원 안의 느낌표 |
| 43 | `warning` | 경고 | TriangleAlertIcon | 삼각형 안의 느낌표 |
| 44 | `info` | 정보 | InfoIcon | 원 안의 i |
| 45 | `share` | 공유 | Share2 | 공유 노드 연결 형태 |
| 46 | `phone` | 전화번호 | Phone | 전화기 형태 |
| 47 | `lightbulb` | 팁/추천 | Lightbulb | 전구, 빛 보조 레이어 |

**적용 위치**: `ChatWindow`, `PlaceCard`, `SuggestedQuestions`, `ImageList`, 토스트 알림

### 4.6 채팅 특화 아이콘 — 4개

| # | 아이콘 이름 | 용도 | 현재 사용 | 디자인 설명 |
|---|-----------|------|----------|------------|
| 48 | `chat-bubble` | 채팅 열기 | MessageCircle | 말풍선, 여행 모티프(비행기/핀) 보조 레이어 |
| 49 | `chat-reset` | 대화 초기화 | RotateCcw | 반시계 방향 회전 화살표 |
| 50 | `chat-refresh` | 응답 재생성 | RefreshCw | 시계 방향 회전 화살표 |
| 51 | `chat-add-place` | 장소 추가 | Plus + MapPin | 핀 마커에 플러스 기호 결합 |

**적용 위치**: `FloatingButton`, `ChatWindow`, `ChatInput`, `PlaceCard`

### 4.7 UI 보조 아이콘 — 6개

| # | 아이콘 이름 | 용도 | 현재 사용 | 디자인 설명 |
|---|-----------|------|----------|------------|
| 52 | `checkbox-checked` | 선택됨 | CheckSquare | 체크된 사각 박스 |
| 53 | `checkbox-unchecked` | 미선택 | Square | 빈 사각 박스 |
| 54 | `arrow-right` | 오른쪽 화살표 | ArrowRight | 직선 화살표 |
| 55 | `github` | GitHub 링크 | Github | GitHub 로고 (변형) |
| 56 | `chevrons-updown` | 정렬/선택 | ChevronsUpDown | 위아래 양방향 화살표 |
| 57 | `clock` | 시간/대기 | Clock | 시계 형태 |

**적용 위치**: `ImageList`, 랜딩 페이지, `airport-combobox`, 상태 표시

---

## 5. 카테고리 색상 매핑

아이콘은 단색(currentColor) SVG로 제작하되, 아래 카테고리 색상 시스템과 함께 사용됩니다.

| 카테고리 | 색상 코드 | 용도 |
|---------|----------|------|
| 식당 (restaurant) | `#EF4444` | 듀오톤 primary에 적용 |
| 카페 (cafe) | `#92400E` | 듀오톤 primary에 적용 |
| 관광 (attraction) | `#3B82F6` | 듀오톤 primary에 적용 |
| 쇼핑 (shopping) | `#8B5CF6` | 듀오톤 primary에 적용 |
| 숙소 (accommodation) | `#10B981` | 듀오톤 primary에 적용 |
| 기타 (other) | `#6B7280` | 듀오톤 primary에 적용 |

---

## 6. SVG 기술 요구사항

### 6.1 파일 구조

```xml
<!-- 예시: restaurant.svg -->
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 24 24"
     fill="none"
     width="24"
     height="24">
  <g class="duotone-secondary" opacity="0.4" fill="currentColor">
    <!-- 보조 레이어: 접시 형태 -->
    <circle cx="12" cy="14" r="8"/>
  </g>
  <g class="duotone-primary" fill="currentColor">
    <!-- 주요 레이어: 나이프 & 포크 -->
    <path d="M..."/>
  </g>
</svg>
```

### 6.2 기술 규칙

| 규칙 | 상세 |
|------|------|
| viewBox | `0 0 24 24` 고정 |
| 색상 | `currentColor` 사용 (외부에서 CSS로 제어) |
| 스트로크 | 사용하지 않음 (fill 기반 듀오톤) |
| 패스 최적화 | SVGO 최적화 적용, 불필요한 그룹/메타데이터 제거 |
| ID/Class | `duotone-primary`, `duotone-secondary` 클래스명 필수 |
| 크기 제한 | 파일당 최대 2KB |
| 호환성 | 모든 모던 브라우저 + React SVG 인라인 호환 |
| 픽셀 정렬 | 24px 그리드에 정렬, 소수점 좌표 최소화 |

### 6.3 스케일링 검증

모든 아이콘은 아래 크기에서 식별 가능해야 합니다:

| 크기 | 용도 |
|------|------|
| 12px (w-3 h-3) | 인라인 텍스트, 카테고리 배지 |
| 16px (w-4 h-4) | 일반 버튼, 리스트 아이템 |
| 20px (w-5 h-5) | 탭 네비게이션, 중간 크기 |
| 24px (w-6 h-6) | 헤더, 강조 요소 |
| 32px+ | 랜딩 페이지, 빈 상태 일러스트 |

---

## 7. 파일 네이밍 규칙

```
{category}-{name}.svg

예시:
category/restaurant.svg
category/cafe.svg
nav/tab-image.svg
nav/tab-text.svg
action/close.svg
action/delete.svg
travel/flight.svg
travel/hotel.svg
feature/ai-sparkle.svg
feature/loading.svg
chat/chat-bubble.svg
ui/checkbox-checked.svg
```

### 디렉토리 구조

```
icons/
├── category/       # 4.1 카테고리 아이콘 (7개)
├── nav/            # 4.2 네비게이션/탭 아이콘 (7개)
├── action/         # 4.3 액션/컨트롤 아이콘 (12개)
├── travel/         # 4.4 여행 특화 아이콘 (10개)
├── feature/        # 4.5 기능/상태 아이콘 (11개)
├── chat/           # 4.6 채팅 특화 아이콘 (4개)
└── ui/             # 4.7 UI 보조 아이콘 (6개)
```

---

## 8. 아이콘 인터랙션 상태 가이드

CSS 제어를 통해 아래 상태를 구현합니다 (SVG 자체는 단색 제작):

| 상태 | 구현 |
|------|------|
| **기본 (Default)** | primary: `currentColor`, secondary: `opacity 0.4` |
| **호버 (Hover)** | primary: `currentColor`, secondary: `opacity 0.6` |
| **활성 (Active)** | primary: `currentColor`, secondary: `opacity 0.8` |
| **비활성 (Disabled)** | primary + secondary 모두: `opacity 0.3` |
| **선택됨 (Selected)** | primary: 카테고리 색상, secondary: `opacity 0.5` |

---

## 9. 검수 기준 (Acceptance Criteria)

- [ ] 57개 전체 아이콘 SVG 납품
- [ ] 모든 SVG가 `viewBox="0 0 24 24"` 기준
- [ ] `duotone-primary` / `duotone-secondary` 레이어 분리
- [ ] `currentColor` 사용 (하드코딩된 색상 없음)
- [ ] SVGO 최적화 완료 (파일당 2KB 이하)
- [ ] 12px~32px 스케일링 시 식별성 유지
- [ ] 모든 아이콘의 시각적 무게(optical weight) 균일
- [ ] 카테고리 아이콘 7개는 색상 적용 시 즉시 구분 가능
- [ ] `loading` 아이콘은 CSS `animation: spin` 적용 시 자연스러운 회전
- [ ] 네이밍 규칙 준수, 디렉토리 구조대로 정리

---

## 10. 미결정 사항 (Open Questions)

| # | 항목 | 결정 필요 시점 |
|---|------|-------------|
| 1 | 아이콘 셋 브랜드 이름 확정 | 제작 착수 전 |
| 2 | AI 생성 도구 선정 (Midjourney vs DALL-E vs 기타) | 제작 착수 전 |
| 3 | 이모지 대체 여부 (🍽️ ☕ 📸 등 → 커스텀 아이콘) | 제작 착수 전 |
| 4 | 다크 모드 대응 필요 여부 | 디자인 확정 전 |
| 5 | 애니메이션 아이콘 필요 여부 (Lottie 등) | 추후 결정 |

---

## 11. 참고 자료

### 현재 프로젝트 디자인 시스템
- **색상**: OKLch 컬러 스페이스, glassmorphism 기반 반투명 UI
- **폰트**: 시스템 폰트
- **라운딩**: `border-radius: 0.625rem` (10px) 기본
- **현재 아이콘 관리 파일**: `travel-planner/lib/icons.ts`

### 참고할 듀오톤 아이콘 시스템
- Phosphor Icons (듀오톤 변형 제공)
- Heroicons v2 (솔리드/아웃라인 이중 스타일)
- Tabler Icons (스트로크 기반이지만 일관성 좋은 참고)

---

*이 요청서는 아이콘 제작의 범위와 사양을 정의합니다. 아키텍처 설계(React 컴포넌트 변환, 아이콘 시스템 코드)는 별도 `/sc:design` 단계에서 진행합니다.*
