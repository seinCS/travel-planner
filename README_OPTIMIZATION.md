# Travel Planner 최적화 가이드

> Vercel React Best Practices 기반 코드 최적화 결과 및 유지 가이드

## 적용된 최적화 (2026-01-25)

### 1. API 워터폴 제거 (async-parallel)

#### 변경 사항
| 파일 | 개선 내용 | 예상 효과 |
|------|----------|----------|
| `app/api/projects/[id]/members/route.ts` | 3단계 쿼리 → 단일 쿼리 | 50-70% 응답시간 단축 |
| `app/api/projects/[id]/places/route.ts` | 순차 쿼리 → Promise.all | 30-40% 응답시간 단축 |
| `app/api/projects/[id]/places/route.ts` | 이미지 연결 병렬화 | 20-30% 응답시간 단축 |

#### 패턴 예시
```typescript
// Before (워터폴)
const project = await prisma.project.findUnique({...})
const members = await prisma.projectMember.findMany({...})

// After (병렬)
const [places, failedImages] = await Promise.all([
  prisma.place.findMany({...}),
  prisma.image.findMany({...}),
])
```

---

### 2. 이미지 최적화 설정 (bundle-defer-third-party)

#### 변경 사항
`next.config.ts`에 이미지 최적화 설정 추가:

```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co' },
    { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
  ],
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 31536000, // 1년
}
```

#### 효과
- 자동 WebP/AVIF 변환
- 1년 캐싱 적용
- 외부 이미지 도메인 허용

---

### 3. React 리렌더링 최적화 (rerender-memo)

#### memo() 적용 컴포넌트
| 컴포넌트 | 파일 경로 |
|----------|----------|
| `PlaceList` | `components/place/PlaceList.tsx` |
| `ItineraryDayTabs` | `components/itinerary/ItineraryDayTabs.tsx` |
| `ProjectCard` | `components/project/ProjectCard.tsx` |
| `SortableTimelineItem` | `components/itinerary/SortableTimelineItem.tsx` |

#### 패턴 예시
```typescript
import { memo } from 'react'

export const PlaceList = memo(function PlaceList({ places, ... }) {
  // 부모 리렌더링 시 props가 변경되지 않으면 리렌더링 방지
})
```

---

### 4. 유틸리티 함수 중앙화

#### date-fns 통합
`lib/date-utils.ts` 생성으로 date-fns 사용 표준화:

```typescript
import { formatDate, formatDateTime, formatDateShort } from '@/lib/date-utils'

// 한국어 로케일 자동 적용
formatDate(new Date(), 'yyyy-MM-dd')
formatDateTime(new Date())  // M월 d일 HH:mm
```

---

### 5. Barrel Exports 생성 (bundle-barrel-imports)

#### 생성된 파일
| 폴더 | 인덱스 파일 |
|------|------------|
| `components/place/` | `index.ts` |
| `components/input/` | `index.ts` |
| `components/upload/` | `index.ts` |

#### 사용 방법
```typescript
// Before
import { PlaceList } from '@/components/place/PlaceList'
import { PlaceDetailsPanel } from '@/components/place/PlaceDetailsPanel'

// After
import { PlaceList, PlaceDetailsPanel } from '@/components/place'
```

---

## 유지해야 할 Best Practices

### API 개발 시

1. **독립적인 쿼리는 항상 Promise.all 사용**
   ```typescript
   const [a, b] = await Promise.all([queryA(), queryB()])
   ```

2. **관련 데이터는 include/select로 한 번에 조회**
   ```typescript
   const project = await prisma.project.findUnique({
     include: { places: true, members: true }
   })
   ```

3. **lib/queries.ts의 캐시 함수 활용**
   ```typescript
   import { getProject } from '@/lib/queries'
   const project = await getProject(id, userId)
   ```

---

### 컴포넌트 개발 시

1. **리스트 아이템 컴포넌트는 memo() 적용**
   ```typescript
   export const ListItem = memo(function ListItem({ item }) { ... })
   ```

2. **콜백 함수는 useCallback으로 메모이제이션**
   ```typescript
   const handleClick = useCallback((id) => { ... }, [])
   ```

3. **비용이 큰 계산은 useMemo 사용**
   ```typescript
   const filtered = useMemo(() =>
     items.filter(x => x.active),
     [items]
   )
   ```

4. **대형 컴포넌트는 dynamic import**
   ```typescript
   const HeavyComponent = dynamic(() => import('./Heavy'), {
     ssr: false,
     loading: () => <Skeleton />
   })
   ```

---

### 이미지 사용 시

1. **next/image 사용 권장**
   ```tsx
   import Image from 'next/image'
   <Image src={url} width={400} height={300} alt="..." />
   ```

2. **외부 이미지 도메인은 next.config.ts에 등록**

3. **Supabase Storage 이미지는 Transform 옵션 활용**
   ```
   {url}?width=400&quality=80
   ```

---

### 날짜 처리 시

1. **lib/date-utils.ts 함수 사용**
   ```typescript
   import { formatDate, formatDateTime } from '@/lib/date-utils'
   ```

2. **새 날짜 유틸이 필요하면 date-utils.ts에 추가**

---

## 추가 개선 기회

### Phase 2 (권장)

| 항목 | 예상 효과 | 난이도 |
|------|----------|--------|
| next/Image 4개 컴포넌트 적용 | LCP 40% 개선 | 중 |
| ImageList 동적 임포트 | 번들 3-4KB 감소 | 낮 |
| /dashboard 통합 엔드포인트 | API 호출 66% 감소 | 중 |

### Phase 3 (선택)

| 항목 | 예상 효과 | 난이도 |
|------|----------|--------|
| Suspense 경계 추가 | 체감 성능 30-50% | 높 |
| Edge Runtime 도입 | 응답시간 10-20% | 높 |

---

## 성능 측정 방법

### 번들 분석
```bash
ANALYZE=true npm run build
```

### Lighthouse 점수
- Chrome DevTools > Lighthouse 탭
- 주요 지표: LCP, FCP, CLS, TTI

### API 응답시간
- Network 탭에서 각 API 요청 시간 확인
- 목표: 200ms 이하

---

## 참조 문서

- [Vercel React Best Practices](https://github.com/vercel/react-best-practices)
- [docs/OPTIMIZATION_ROADMAP.md](./docs/OPTIMIZATION_ROADMAP.md) - 상세 로드맵
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [SWR Documentation](https://swr.vercel.app/)
