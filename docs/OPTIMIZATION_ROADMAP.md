# Travel Planner 최적화 로드맵

## 개요

Vercel React Best Practices를 기준으로 분석한 결과, 4개 영역에서 최적화 기회가 식별되었습니다.

| 카테고리 | 현재 상태 | 예상 개선 |
|----------|-----------|-----------|
| React 리렌더링 | 부분 최적화 | 30-40% |
| 번들 크기 | 우수 (dynamic 적용) | 36% 추가 |
| 정적 자산 | 미최적화 | 40-55% |
| 서버 성능 | 워터폴 존재 | 50-70% |

---

## Phase 1: 즉시 적용 (HIGH PRIORITY)

### 1.1 API 워터폴 제거 (예상 효과: 50-70% 응답시간 단축)

#### A. GET /api/projects/[id]/members - 3단계 워터폴
**파일**: `app/api/projects/[id]/members/route.ts`

```typescript
// Before (3단계 순차 쿼리)
const project = await prisma.project.findUnique({...})  // 1
const isMember = await prisma.projectMember.findUnique({...})  // 2
const members = await prisma.projectMember.findMany({...})  // 3

// After (단일 쿼리)
const projectWithMembers = await prisma.project.findUnique({
  where: { id: projectId },
  select: {
    userId: true,
    members: {
      include: { user: { select: { id: true, name: true, email: true, image: true } } }
    }
  }
})
// 메모리 내에서 권한 확인
const isOwner = projectWithMembers.userId === session.user.id
const isMember = projectWithMembers.members.some(m => m.userId === session.user.id)
```

#### B. GET /api/projects/[id]/places - 2단계 워터폴
**파일**: `app/api/projects/[id]/places/route.ts:47-70`

```typescript
// Before
const places = await prisma.place.findMany({...})
const failedImages = await prisma.image.findMany({...})

// After
const [places, failedImages] = await Promise.all([
  prisma.place.findMany({...}),
  prisma.image.findMany({ where: { projectId: id, status: 'failed' } })
])
```

#### C. POST /api/projects/[id]/places 이미지 연결
**파일**: `app/api/projects/[id]/places/route.ts:139-147`

```typescript
// Before
await prisma.placeImage.createMany({...})
await prisma.image.updateMany({...})

// After
await Promise.all([
  prisma.placeImage.createMany({...}),
  prisma.image.updateMany({...})
])
```

---

### 1.2 미사용 라이브러리 제거 (예상 효과: 12KB+ 번들 감소)

```bash
# lucide-react 제거 (미사용 확인됨)
npm uninstall lucide-react
```

---

### 1.3 date-fns 최적화 (예상 효과: 15-20KB 번들 감소)

**파일 생성**: `lib/date-utils.ts`

```typescript
import { format, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'

export const formatDate = (date: Date | string, pattern: string = 'yyyy-MM-dd') => {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, pattern, { locale: ko })
}

export const formatDateTime = (date: Date | string) =>
  formatDate(date, 'M월 d일 HH:mm')

export const formatDateShort = (date: Date | string) =>
  formatDate(date, 'M월 d일')

export const addDaysToDate = (date: Date, days: number) =>
  addDays(date, days)
```

**수정 대상 파일 (9개)**:
- `components/share/SharedItineraryView.tsx`
- `components/itinerary/ResourceSection.tsx`
- `components/itinerary/ItineraryCreateForm.tsx`
- `components/itinerary/FlightSection.tsx`
- `components/itinerary/ItineraryTimeline.tsx`
- `components/itinerary/TravelSummaryBar.tsx`
- `components/itinerary/ItineraryDayTabs.tsx`
- `components/itinerary/ItineraryView.tsx`
- `components/itinerary/AccommodationSection.tsx`

---

## Phase 2: 번들 최적화 (MEDIUM PRIORITY)

### 2.1 next.config.ts 이미지 설정

**파일**: `next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1년
  },
}

export default nextConfig
```

---

### 2.2 next/Image 컴포넌트 적용 (4개 파일)

**A. ProjectCard.tsx (라인 68-72)**
```typescript
// Before
<img src={ownerImage} alt={ownerName} className="w-4 h-4 rounded-full" />

// After
import Image from 'next/image'
<Image src={ownerImage} alt={ownerName} width={16} height={16} className="rounded-full" />
```

**B. ImageList.tsx (라인 283)**
**C. ImageDetailModal.tsx (라인 34)**
**D. FailedImages.tsx (라인 84, 106)**

동일 패턴으로 수정

---

### 2.3 추가 동적 임포트 (대형 컴포넌트)

**파일**: `app/(dashboard)/projects/[id]/page.tsx`

```typescript
// 추가 동적 로딩 대상
const ImageList = dynamic(
  () => import('@/components/upload/ImageList').then(mod => mod.ImageList),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
)

const InputTabs = dynamic(
  () => import('@/components/input/InputTabs').then(mod => mod.InputTabs),
  { ssr: false, loading: () => <div className="animate-pulse h-32 bg-gray-100 rounded" /> }
)
```

---

### 2.4 Barrel Exports 생성

**A. components/place/index.ts**
```typescript
export { PlaceList } from './PlaceList'
export { PlaceDetailsPanel } from './PlaceDetailsPanel'
export { PlaceEditModal } from './PlaceEditModal'
export { PlaceSearchModal } from './PlaceSearchModal'
export { PlaceSearchInput } from './PlaceSearchInput'
export { FailedImages } from './FailedImages'
```

**B. components/input/index.ts**
```typescript
export { InputTabs } from './InputTabs'
export { TextInputForm } from './TextInputForm'
export { UrlInputForm } from './UrlInputForm'
export { GoogleMapsPreview } from './GoogleMapsPreview'
export { TextInputList } from './TextInputList'
```

**C. components/upload/index.ts**
```typescript
export { ImageUploader } from './ImageUploader'
export { ImageList } from './ImageList'
export { ImageDetailModal } from './ImageDetailModal'
```

---

## Phase 3: React 리렌더링 최적화 (MEDIUM PRIORITY)

### 3.1 memo() 적용 (4개 컴포넌트)

**A. PlaceList.tsx**
```typescript
import { memo } from 'react'

export const PlaceList = memo(function PlaceList({ places, onSelect, ... }) {
  // 기존 코드
})
```

**B. ItineraryDayTabs.tsx**
**C. ProjectCard.tsx**
**D. SortableTimelineItem.tsx**

동일 패턴 적용

---

### 3.2 콜백 최적화 (GoogleMap onPlaceSelect)

**파일**: `app/(dashboard)/projects/[id]/page.tsx`

```typescript
// Before (매 렌더링마다 새 함수)
<GoogleMap onPlaceSelect={setSelectedPlaceId} ... />

// After
const handlePlaceSelect = useCallback((placeId: string) => {
  setSelectedPlaceId(placeId)
}, [])

<GoogleMap onPlaceSelect={handlePlaceSelect} ... />
```

---

### 3.3 상태 분리 (ProjectDetailPage)

이미지 모달 상태를 자식 컴포넌트로 이동:

```typescript
// Before: 페이지에서 관리
const [selectedImage, setSelectedImage] = useState(null)
const [isImageModalOpen, setIsImageModalOpen] = useState(false)

// After: ImageList 내부에서 관리
// ImageList.tsx
const [selectedImage, setSelectedImage] = useState(null)
const [isModalOpen, setIsModalOpen] = useState(false)
```

---

## Phase 4: 서버 성능 고도화 (LOW-MEDIUM PRIORITY)

### 4.1 API 통합 엔드포인트

**새 파일**: `app/api/projects/[id]/dashboard/route.ts`

```typescript
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const include = searchParams.get('include')?.split(',') || ['places', 'textInputs']

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      ...(include.includes('places') && {
        places: {
          select: { id: true, name: true, category: true, latitude: true, longitude: true },
          orderBy: { createdAt: 'desc' }
        }
      }),
      ...(include.includes('textInputs') && {
        textInputs: { orderBy: { createdAt: 'desc' } }
      }),
      ...(include.includes('itinerary') && {
        itinerary: { include: { days: { include: { items: true } } } }
      }),
    }
  })

  return NextResponse.json(project)
}
```

**클라이언트 수정**: `_hooks/useProjectDetail.ts`
```typescript
// Before (3개 호출)
const { data: projectData } = useSWR(`/api/projects/${projectId}`, fetcher)
const { data: placesData } = useSWR(`/api/projects/${projectId}/places`, fetcher)
const { data: textInputsData } = useSWR(`/api/projects/${projectId}/text-inputs`, fetcher)

// After (단일 호출)
const { data } = useSWR(
  projectId ? `/api/projects/${projectId}/dashboard?include=places,textInputs` : null,
  fetcher
)
```

---

### 4.2 lib/queries.ts 활용

**API 라우트에서 캐시 함수 사용**:

```typescript
// app/api/projects/[id]/route.ts
import { getProject } from '@/lib/queries'

export async function GET(request, { params }) {
  const { id } = await params
  const project = await getProject(id, session.user.id) // React.cache() 활용
  return NextResponse.json(project)
}
```

---

### 4.3 Suspense 경계 도입

**파일**: `app/(dashboard)/projects/[id]/page.tsx` 구조 변경

```typescript
import { Suspense } from 'react'

// 서버 컴포넌트 분리
async function ProjectHeader({ projectId }) {
  const project = await getProject(projectId)
  return <h1>{project.name}</h1>
}

// 메인 페이지
export default function ProjectPage({ params }) {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <ProjectHeader projectId={params.id} />
      </Suspense>

      <Suspense fallback={<MapSkeleton />}>
        <GoogleMapWrapper projectId={params.id} />
      </Suspense>

      <Suspense fallback={<PlaceListSkeleton />}>
        <PlaceListWrapper projectId={params.id} />
      </Suspense>
    </>
  )
}
```

---

## 체크리스트

### Phase 1 (즉시)
- [ ] GET /api/projects/[id]/members 쿼리 최적화
- [ ] GET /api/projects/[id]/places Promise.all 적용
- [ ] POST /api/projects/[id]/places 이미지 연결 병렬화
- [ ] lucide-react 제거
- [ ] lib/date-utils.ts 생성 및 import 수정

### Phase 2 (번들)
- [ ] next.config.ts images 설정
- [ ] next/Image 4개 파일 적용
- [ ] ImageList, InputTabs 동적 임포트
- [ ] Barrel exports 3개 폴더 생성

### Phase 3 (리렌더링)
- [ ] memo() 4개 컴포넌트 적용
- [ ] onPlaceSelect useCallback 적용
- [ ] 이미지 모달 상태 분리

### Phase 4 (서버)
- [ ] /dashboard 통합 엔드포인트 생성
- [ ] lib/queries 함수 API 라우트 적용
- [ ] Suspense 경계 추가

---

## 예상 성과

| 지표 | 현재 | 개선 후 | 개선율 |
|------|------|---------|--------|
| 초기 번들 크기 | 100% | 64% | -36% |
| LCP | ~2.5s | ~1.5s | -40% |
| API 응답시간 | 100% | 30-50% | -50-70% |
| CLS | ~0.15 | ~0.05 | -67% |
| 리렌더링 횟수 | 100% | 60-70% | -30-40% |

---

## 참조 문서

- [Vercel React Best Practices](https://github.com/vercel/react-best-practices)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [React.cache() Documentation](https://react.dev/reference/react/cache)
- [SWR Documentation](https://swr.vercel.app/)
