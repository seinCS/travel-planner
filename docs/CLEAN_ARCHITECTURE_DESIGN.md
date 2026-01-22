# Travel Planner Clean Architecture 설계안

**작성일**: 2026-01-22
**목적**: 분석된 문제점 해결을 위한 Clean Architecture 기반 리팩토링 설계

---

## 1. 설계 목표

### 1.1 해결할 문제점

| # | 문제점 | 해결 방향 |
|---|--------|-----------|
| 1 | process/route.ts와 process-text/route.ts 간 ~150줄 코드 중복 | Use Case Layer로 비즈니스 로직 추출 |
| 2 | ProjectDetailPage 657줄 God Component (22개 상태) | Custom Hooks + Container/Presenter 패턴 |
| 3 | 미사용 Zustand Store | 활용하거나 제거 (설계에서는 제거 후 커스텀 훅 사용) |
| 4 | Claude 프롬프트 80% 중복 | Infrastructure Layer에서 템플릿화 |
| 5 | 데이터 페칭 패턴 불일치 (SWR vs fetch) | Repository Pattern + 통합된 Data Fetching Layer |
| 6 | 컴포넌트-API 강한 결합 | API Client Layer 도입 |

### 1.2 설계 원칙

```
┌─────────────────────────────────────────────────────────────┐
│                    Clean Architecture                        │
├─────────────────────────────────────────────────────────────┤
│  Entities (Domain)     : 비즈니스 규칙, 타입 정의            │
│  Use Cases             : 애플리케이션 비즈니스 로직           │
│  Interface Adapters    : API Routes, Hooks, Presenters      │
│  Frameworks & Drivers  : Next.js, Prisma, Claude, Google    │
└─────────────────────────────────────────────────────────────┘

의존성 방향: Frameworks → Adapters → Use Cases → Entities
```

---

## 2. 새로운 폴더 구조

```
travel-planner/
├── app/                          # Next.js App Router (UI Layer)
│   ├── (auth)/
│   ├── (dashboard)/
│   │   └── projects/
│   │       └── [id]/
│   │           ├── page.tsx                    # 얇은 페이지 컴포넌트
│   │           ├── _components/                # 페이지 전용 컴포넌트
│   │           │   ├── MapSection.tsx
│   │           │   ├── PlaceSection.tsx
│   │           │   └── InputSection.tsx
│   │           └── _hooks/                     # 페이지 전용 훅
│   │               └── useProjectDetail.ts
│   ├── api/                                    # API Routes (Adapter)
│   │   └── projects/[id]/
│   │       ├── process/route.ts               # 얇은 라우트 핸들러
│   │       └── process-text/route.ts
│   └── s/[token]/
│
├── src/                          # 핵심 비즈니스 로직 (NEW)
│   ├── domain/                   # Entities Layer
│   │   ├── entities/
│   │   │   ├── Place.ts
│   │   │   ├── Project.ts
│   │   │   ├── Image.ts
│   │   │   └── TextInput.ts
│   │   ├── value-objects/
│   │   │   ├── Coordinates.ts
│   │   │   ├── PlaceCategory.ts
│   │   │   └── ProcessingStatus.ts
│   │   └── interfaces/           # Repository Interfaces (Ports)
│   │       ├── IPlaceRepository.ts
│   │       ├── IProjectRepository.ts
│   │       ├── IImageRepository.ts
│   │       ├── ITextInputRepository.ts
│   │       ├── IAnalysisService.ts
│   │       └── IGeocodingService.ts
│   │
│   ├── application/              # Use Cases Layer
│   │   ├── use-cases/
│   │   │   ├── processing/
│   │   │   │   ├── ProcessImagesUseCase.ts
│   │   │   │   ├── ProcessTextInputsUseCase.ts
│   │   │   │   └── ProcessItemsBaseUseCase.ts   # 공통 로직 (Template Method)
│   │   │   ├── places/
│   │   │   │   ├── CreatePlaceUseCase.ts
│   │   │   │   ├── UpdatePlaceUseCase.ts
│   │   │   │   ├── DeletePlaceUseCase.ts
│   │   │   │   └── GetPlaceDetailsUseCase.ts
│   │   │   └── projects/
│   │   │       ├── CreateProjectUseCase.ts
│   │   │       └── ShareProjectUseCase.ts
│   │   ├── services/
│   │   │   ├── DuplicateDetectionService.ts
│   │   │   └── GeocodingCacheService.ts
│   │   └── dto/
│   │       ├── ProcessingResultDTO.ts
│   │       └── PlaceExtractionDTO.ts
│   │
│   └── infrastructure/           # Frameworks & Drivers
│       ├── repositories/         # Repository Implementations
│       │   ├── PrismaPlaceRepository.ts
│       │   ├── PrismaProjectRepository.ts
│       │   ├── PrismaImageRepository.ts
│       │   └── PrismaTextInputRepository.ts
│       ├── services/
│       │   ├── claude/
│       │   │   ├── ClaudeAnalysisService.ts
│       │   │   ├── prompts/
│       │   │   │   ├── basePrompt.ts          # 공통 프롬프트 템플릿
│       │   │   │   ├── imagePrompt.ts
│       │   │   │   └── textPrompt.ts
│       │   │   └── ClaudeClient.ts
│       │   ├── google/
│       │   │   ├── GoogleGeocodingService.ts
│       │   │   └── GooglePlacesService.ts
│       │   └── supabase/
│       │       └── SupabaseStorageService.ts
│       └── api-client/            # Client-side API 호출
│           ├── index.ts
│           ├── projects.api.ts
│           ├── places.api.ts
│           ├── images.api.ts
│           └── textInputs.api.ts
│
├── components/                   # Shared UI Components
│   ├── ui/                       # shadcn/ui (그대로 유지)
│   ├── common/                   # 공통 컴포넌트
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── map/
│   │   └── GoogleMap.tsx
│   ├── place/
│   │   ├── PlaceList.tsx
│   │   ├── PlaceDetailsPanel.tsx
│   │   ├── PlaceEditModal.tsx
│   │   └── FailedImages.tsx
│   ├── input/
│   │   ├── InputTabs.tsx
│   │   ├── TextInputForm.tsx
│   │   ├── UrlInputForm.tsx
│   │   └── TextInputList.tsx
│   ├── upload/
│   │   ├── ImageUploader.tsx
│   │   ├── ImageList.tsx
│   │   └── ImageDetailModal.tsx
│   └── project/
│       ├── ProjectCard.tsx
│       ├── ProjectForm.tsx
│       └── ShareModal.tsx
│
├── hooks/                        # Shared Custom Hooks
│   ├── use-mobile.ts
│   ├── queries/                  # React Query/SWR 기반 데이터 훅
│   │   ├── useProject.ts
│   │   ├── usePlaces.ts
│   │   ├── useImages.ts
│   │   └── useTextInputs.ts
│   └── mutations/                # 데이터 변경 훅
│       ├── useProcessImages.ts
│       ├── useProcessText.ts
│       └── usePlaceMutations.ts
│
├── lib/                          # Utilities (기존 유지)
│   ├── auth.ts
│   ├── db.ts
│   ├── utils.ts
│   └── constants.ts
│
├── types/                        # 기존 타입 (domain으로 점진적 이전)
│   └── index.ts
│
└── prisma/
    └── schema.prisma
```

---

## 3. 핵심 인터페이스 설계

### 3.1 Domain Layer - Repository Interfaces

```typescript
// src/domain/interfaces/IPlaceRepository.ts
import { Place } from '../entities/Place'
import { Coordinates } from '../value-objects/Coordinates'

export interface IPlaceRepository {
  findById(id: string): Promise<Place | null>
  findByProjectId(projectId: string): Promise<Place[]>
  findByGooglePlaceId(projectId: string, googlePlaceId: string): Promise<Place | null>
  findByName(projectId: string, name: string): Promise<Place | null>
  findByCoordinates(projectId: string, coords: Coordinates, radiusMeters: number): Promise<Place | null>
  create(place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>): Promise<Place>
  update(id: string, data: Partial<Place>): Promise<Place>
  delete(id: string): Promise<void>
  linkToImage(placeId: string, imageId: string): Promise<void>
  linkToTextInput(placeId: string, textInputId: string): Promise<void>
}
```

```typescript
// src/domain/interfaces/IAnalysisService.ts
import { PlaceExtractionDTO } from '../../application/dto/PlaceExtractionDTO'

export interface AnalysisInput {
  type: 'image' | 'text'
  content: string  // URL for image, text content for text
  destination: string
  country?: string
}

export interface IAnalysisService {
  analyze(input: AnalysisInput): Promise<PlaceExtractionDTO>
}
```

```typescript
// src/domain/interfaces/IGeocodingService.ts
import { Coordinates } from '../value-objects/Coordinates'

export interface GeocodingResult {
  coordinates: Coordinates
  googlePlaceId: string | null
  formattedAddress: string | null
  googleMapsUrl: string | null
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
}

export interface IGeocodingService {
  geocode(
    placeName: string,
    placeNameEn: string | null,
    destination: string,
    country?: string
  ): Promise<GeocodingResult | null>
}
```

### 3.2 Application Layer - Use Cases

```typescript
// src/application/use-cases/processing/ProcessItemsBaseUseCase.ts
import { IPlaceRepository } from '../../../domain/interfaces/IPlaceRepository'
import { IAnalysisService, AnalysisInput } from '../../../domain/interfaces/IAnalysisService'
import { IGeocodingService } from '../../../domain/interfaces/IGeocodingService'
import { DuplicateDetectionService } from '../../services/DuplicateDetectionService'
import { GeocodingCacheService } from '../../services/GeocodingCacheService'
import { ProcessingResultDTO } from '../../dto/ProcessingResultDTO'

export interface ProcessableItem {
  id: string
  getContent(): string
  getType(): 'image' | 'text'
}

export interface ItemStatusUpdater<T> {
  markProcessed(item: T): Promise<void>
  markFailed(item: T, errorMessage: string): Promise<void>
}

/**
 * Template Method Pattern: 공통 처리 로직을 추상화
 * 이미지/텍스트 처리의 ~150줄 중복 코드를 제거
 */
export abstract class ProcessItemsBaseUseCase<T extends ProcessableItem> {
  constructor(
    protected readonly placeRepository: IPlaceRepository,
    protected readonly analysisService: IAnalysisService,
    protected readonly geocodingService: IGeocodingService,
    protected readonly duplicateDetection: DuplicateDetectionService,
    protected readonly statusUpdater: ItemStatusUpdater<T>
  ) {}

  async execute(
    items: T[],
    projectId: string,
    destination: string,
    country?: string
  ): Promise<ProcessingResultDTO> {
    const existingPlaces = await this.placeRepository.findByProjectId(projectId)
    const geocodingCache = new GeocodingCacheService()

    let processed = 0
    let failed = 0

    // Step 1: Parallel analysis with Claude API
    const analysisResults = await Promise.all(
      items.map(async (item) => {
        try {
          const result = await this.analysisService.analyze({
            type: item.getType(),
            content: item.getContent(),
            destination,
            country,
          })
          return { item, result, error: null }
        } catch (error) {
          return { item, result: null, error }
        }
      })
    )

    // Step 2: Sequential processing for duplicate handling
    for (const { item, result, error } of analysisResults) {
      if (error || !result || result.places.length === 0) {
        await this.statusUpdater.markFailed(item, this.getErrorMessage(error, result))
        failed++
        continue
      }

      const placesInThisItem = new Set<string>()
      let successCount = 0

      for (const extractedPlace of result.places) {
        // Skip low confidence
        if (extractedPlace.confidence < 0.5) continue

        // Skip within-item duplicates
        const nameLower = extractedPlace.placeName.toLowerCase()
        if (placesInThisItem.has(nameLower)) continue

        // Geocoding with cache
        const geoResult = await geocodingCache.getOrFetch(
          extractedPlace.placeName,
          extractedPlace.placeNameEn,
          () => this.geocodingService.geocode(
            extractedPlace.placeName,
            extractedPlace.placeNameEn,
            destination,
            country
          )
        )

        if (!geoResult) continue

        // Duplicate detection across project
        const duplicate = await this.duplicateDetection.findDuplicate(
          existingPlaces,
          nameLower,
          geoResult.googlePlaceId,
          geoResult.coordinates
        )

        if (duplicate) {
          await this.linkItemToPlace(duplicate.id, item.id)
        } else {
          const newPlace = await this.placeRepository.create({
            projectId,
            name: extractedPlace.placeName,
            category: extractedPlace.category,
            comment: extractedPlace.comment,
            latitude: geoResult.coordinates.latitude,
            longitude: geoResult.coordinates.longitude,
            status: 'auto',
            googlePlaceId: geoResult.googlePlaceId,
            formattedAddress: geoResult.formattedAddress,
            googleMapsUrl: geoResult.googleMapsUrl,
            rating: geoResult.rating,
            userRatingsTotal: geoResult.userRatingsTotal,
            priceLevel: geoResult.priceLevel,
          })
          await this.linkItemToPlace(newPlace.id, item.id)
          existingPlaces.push(newPlace)
        }

        placesInThisItem.add(nameLower)
        successCount++
      }

      if (successCount > 0) {
        await this.statusUpdater.markProcessed(item)
        processed++
      } else {
        await this.statusUpdater.markFailed(item, '유효한 장소를 찾을 수 없습니다.')
        failed++
      }
    }

    return { processed, failed, total: items.length }
  }

  protected abstract linkItemToPlace(placeId: string, itemId: string): Promise<void>

  private getErrorMessage(error: unknown, result: unknown): string {
    if (error) return '분석 중 오류가 발생했습니다.'
    if (!result) return '분석 결과가 없습니다.'
    return '장소를 인식할 수 없습니다.'
  }
}
```

```typescript
// src/application/use-cases/processing/ProcessImagesUseCase.ts
import { ProcessItemsBaseUseCase, ProcessableItem, ItemStatusUpdater } from './ProcessItemsBaseUseCase'
import { IImageRepository } from '../../../domain/interfaces/IImageRepository'
import { Image } from '../../../domain/entities/Image'

class ImageItem implements ProcessableItem {
  constructor(private readonly image: Image) {}

  get id(): string { return this.image.id }
  getContent(): string { return this.image.url }
  getType(): 'image' | 'text' { return 'image' }
}

export class ProcessImagesUseCase extends ProcessItemsBaseUseCase<ImageItem> {
  constructor(
    placeRepository: IPlaceRepository,
    analysisService: IAnalysisService,
    geocodingService: IGeocodingService,
    duplicateDetection: DuplicateDetectionService,
    private readonly imageRepository: IImageRepository
  ) {
    super(
      placeRepository,
      analysisService,
      geocodingService,
      duplicateDetection,
      {
        markProcessed: async (item) => {
          await this.imageRepository.updateStatus(item.id, 'processed')
        },
        markFailed: async (item, errorMessage) => {
          await this.imageRepository.updateStatus(item.id, 'failed', errorMessage)
        },
      }
    )
  }

  protected async linkItemToPlace(placeId: string, itemId: string): Promise<void> {
    await this.placeRepository.linkToImage(placeId, itemId)
  }

  async executeForProject(projectId: string, destination: string, country?: string, retryIds?: string[]) {
    // Reset retry items to pending
    if (retryIds?.length) {
      await this.imageRepository.resetToPending(retryIds)
    }

    const pendingImages = await this.imageRepository.findPendingByProjectId(projectId)
    const items = pendingImages.map(img => new ImageItem(img))

    return this.execute(items, projectId, destination, country)
  }
}
```

### 3.3 Infrastructure Layer - Claude Prompts

```typescript
// src/infrastructure/services/claude/prompts/basePrompt.ts
export interface PromptConfig {
  destination: string
  country?: string
  maxPlaces: number
  contentType: 'image' | 'text'
}

export function buildBasePrompt(config: PromptConfig): string {
  const locationContext = `${config.destination}${config.country ? `, ${config.country}` : ''}`

  return `You are analyzing ${config.contentType === 'image' ? 'a screenshot from Korean social media (Instagram, YouTube, X/Twitter)' : 'text content'} about travel destinations.
The user is collecting places to visit in ${locationContext}.

Your task: Extract ALL place/venue names that can be searched on Google Maps (maximum ${config.maxPlaces} places).

IMPORTANT GUIDELINES:
1. Look for place names in ANY language (Korean 한국어, Chinese 中文, Japanese 日本語, English, etc.)
2. Place names often appear as:
   - Store/restaurant names (e.g., "이치란 라멘", "스타벅스 리저브")
   - Landmark names (e.g., "에펠탑", "센소지", "와이탄")
   - Area/district names (e.g., "시부야", "난징동루", "홍대")
3. For better geocoding accuracy, extract the FULL place name including:
   - Branch/location suffix if visible (e.g., "신주쿠점", "센트럴점", "본점")
   - District/area name (e.g., "란콰이펑", "센트럴")
4. Extract ALL distinct places mentioned, not just the main one
5. For each place, extract useful tips/comments specific to that place

GEOCODING OPTIMIZATION:
- For restaurants/cafes, include district or area name for better search accuracy
- ALWAYS provide place_name_en with English name or romanized version for fallback search
- Include nearby subway/MTR station if visible

CONFIDENCE SCORING (per place):
- 0.9-1.0: Clear, specific place name visible
- 0.7-0.8: Place name mentioned but not prominently displayed
- 0.5-0.6: Location identifiable from context/landmarks
- 0.3-0.4: Only general area/type identifiable
- 0.0: Cannot identify any specific place

Respond ONLY in JSON format (no markdown, no code blocks):
{
  "places": [
    {
      "place_name": "full searchable place name",
      "place_name_en": "English name OR romanized version (REQUIRED)",
      "category": "restaurant|cafe|attraction|shopping|accommodation|other",
      "comment": "useful tips in Korean",
      "confidence": number
    }
  ],
  "raw_text": "${config.contentType === 'image' ? 'all text extracted from image' : 'summary of analyzed text'}"
}

If no places can be identified, return: { "places": [], "raw_text": "..." }`
}
```

```typescript
// src/infrastructure/services/claude/prompts/imagePrompt.ts
import { buildBasePrompt, PromptConfig } from './basePrompt'

export function buildImageAnalysisPrompt(destination: string, country?: string): string {
  const config: PromptConfig = {
    destination,
    country,
    maxPlaces: 5,
    contentType: 'image',
  }
  return buildBasePrompt(config)
}
```

```typescript
// src/infrastructure/services/claude/prompts/textPrompt.ts
import { buildBasePrompt, PromptConfig } from './basePrompt'

export function buildTextAnalysisPrompt(destination: string, country?: string): string {
  const config: PromptConfig = {
    destination,
    country,
    maxPlaces: 10,
    contentType: 'text',
  }

  // Text-specific additions
  const basePrompt = buildBasePrompt(config)
  const textAdditions = `
Additional for text analysis:
- If the text mentions "near X" or "in front of Y", include that context
- If an address is mentioned, include it in place_name`

  return basePrompt + textAdditions
}
```

### 3.4 Infrastructure Layer - API Client

```typescript
// src/infrastructure/api-client/index.ts
const BASE_URL = '/api'

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}

export const apiClient = {
  get: <T>(url: string) =>
    fetch(`${BASE_URL}${url}`).then(handleResponse<T>),

  post: <T>(url: string, data?: unknown) =>
    fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }).then(handleResponse<T>),

  put: <T>(url: string, data: unknown) =>
    fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  patch: <T>(url: string, data: unknown) =>
    fetch(`${BASE_URL}${url}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  delete: <T>(url: string) =>
    fetch(`${BASE_URL}${url}`, { method: 'DELETE' }).then(handleResponse<T>),
}
```

```typescript
// src/infrastructure/api-client/places.api.ts
import { apiClient } from './index'
import { Place, CreatePlaceInput, UpdatePlaceInput } from '@/types'

export interface PlacesResponse {
  places: Place[]
}

export interface PlaceDetailsResponse {
  photos: string[]
  openingHours: string[] | null
  website: string | null
  phoneNumber: string | null
  reviews: Array<{
    authorName: string
    rating: number
    text: string
    time: string
  }>
}

export const placesApi = {
  // Project-scoped
  getByProject: (projectId: string) =>
    apiClient.get<PlacesResponse>(`/projects/${projectId}/places`),

  create: (projectId: string, data: CreatePlaceInput) =>
    apiClient.post<Place>(`/projects/${projectId}/places`, data),

  // Place-scoped
  getById: (placeId: string) =>
    apiClient.get<Place>(`/places/${placeId}`),

  update: (placeId: string, data: UpdatePlaceInput) =>
    apiClient.put<Place>(`/places/${placeId}`, data),

  relocate: (placeId: string, data: { latitude: number; longitude: number; googlePlaceId?: string }) =>
    apiClient.patch<Place>(`/places/${placeId}`, data),

  delete: (placeId: string) =>
    apiClient.delete<void>(`/places/${placeId}`),

  getDetails: (placeId: string) =>
    apiClient.get<PlaceDetailsResponse>(`/places/${placeId}/details`),

  // Share context
  getDetailsWithToken: (token: string, placeId: string) =>
    apiClient.get<PlaceDetailsResponse>(`/share/${token}/places/${placeId}/details`),
}
```

### 3.5 Custom Hooks Layer

```typescript
// hooks/queries/usePlaces.ts
import useSWR from 'swr'
import { placesApi, PlacesResponse } from '@/src/infrastructure/api-client/places.api'

export function usePlaces(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PlacesResponse>(
    projectId ? `/projects/${projectId}/places` : null,
    () => placesApi.getByProject(projectId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30초 캐시
    }
  )

  return {
    places: data?.places ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
```

```typescript
// hooks/queries/usePlaceDetails.ts
import useSWR from 'swr'
import { placesApi, PlaceDetailsResponse } from '@/src/infrastructure/api-client/places.api'

interface UsePlaceDetailsOptions {
  shareToken?: string
}

export function usePlaceDetails(placeId: string | null, options?: UsePlaceDetailsOptions) {
  const { shareToken } = options ?? {}

  const { data, error, isLoading } = useSWR<PlaceDetailsResponse>(
    placeId ? `place-details-${placeId}-${shareToken ?? 'direct'}` : null,
    () => shareToken
      ? placesApi.getDetailsWithToken(shareToken, placeId!)
      : placesApi.getDetails(placeId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1분 캐시
    }
  )

  return {
    details: data,
    isLoading,
    error,
  }
}
```

```typescript
// hooks/mutations/useProcessImages.ts
import { useState, useCallback } from 'react'
import { projectsApi } from '@/src/infrastructure/api-client/projects.api'

interface ProcessingResult {
  processed: number
  failed: number
  total: number
}

export function useProcessImages(projectId: string) {
  const [isProcessing, setIsProcessing] = useState(false)

  const process = useCallback(async (retryImageIds?: string[]): Promise<ProcessingResult> => {
    setIsProcessing(true)
    try {
      const result = await projectsApi.processImages(projectId, retryImageIds)
      return result
    } finally {
      setIsProcessing(false)
    }
  }, [projectId])

  return {
    process,
    isProcessing,
  }
}
```

### 3.6 Page Component 분리

```typescript
// app/(dashboard)/projects/[id]/_hooks/useProjectDetail.ts
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useImages } from '@/hooks/queries/useImages'
import { useTextInputs } from '@/hooks/queries/useTextInputs'
import { useProject } from '@/hooks/queries/useProject'
import { useProcessImages } from '@/hooks/mutations/useProcessImages'
import { useProcessText } from '@/hooks/mutations/useProcessText'

export function useProjectDetail(projectId: string) {
  // Data queries
  const { project, isLoading: projectLoading } = useProject(projectId)
  const { places, refresh: refreshPlaces } = usePlaces(projectId)
  const { images, refresh: refreshImages } = useImages(projectId)
  const { textInputs, refresh: refreshTextInputs } = useTextInputs(projectId)

  // Mutations
  const { process: processImages, isProcessing: processingImages } = useProcessImages(projectId)
  const { process: processText, isProcessing: processingText } = useProcessText(projectId)

  // Derived state
  const pendingImageCount = images.filter(i => i.status === 'pending').length
  const failedImageCount = images.filter(i => i.status === 'failed').length
  const pendingTextCount = textInputs.filter(t => t.status === 'pending').length
  const failedTextCount = textInputs.filter(t => t.status === 'failed').length

  return {
    // Data
    project,
    places,
    images,
    textInputs,

    // Loading states
    isLoading: projectLoading,
    isProcessing: processingImages || processingText,

    // Derived
    pendingImageCount,
    failedImageCount,
    pendingTextCount,
    failedTextCount,
    failedImages: images.filter(i => i.status === 'failed'),

    // Actions
    processImages: async (retryIds?: string[]) => {
      await processImages(retryIds)
      await Promise.all([refreshPlaces(), refreshImages()])
    },
    processText: async (retryIds?: string[]) => {
      await processText(retryIds)
      await Promise.all([refreshPlaces(), refreshTextInputs()])
    },
    refreshPlaces,
    refreshImages,
    refreshTextInputs,
  }
}
```

```typescript
// app/(dashboard)/projects/[id]/page.tsx (리팩토링 후 ~100줄)
'use client'

import { use, useState } from 'react'
import { useProjectDetail } from './_hooks/useProjectDetail'
import { MapSection } from './_components/MapSection'
import { PlaceSection } from './_components/PlaceSection'
import { InputSection } from './_components/InputSection'
import { MobileLayout } from './_components/MobileLayout'
import { DesktopLayout } from './_components/DesktopLayout'
import { useIsMobile } from '@/hooks/use-mobile'

interface ProjectDetailProps {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { id } = use(params)
  const isMobile = useIsMobile()

  // All data and actions from single hook
  const projectData = useProjectDetail(id)

  // UI-only state (kept in page)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)

  if (projectData.isLoading) {
    return <LoadingState />
  }

  const sharedProps = {
    ...projectData,
    selectedPlaceId,
    setSelectedPlaceId,
    categoryFilter,
    setCategoryFilter,
    detailPlaceId,
    setDetailPlaceId,
  }

  return isMobile
    ? <MobileLayout {...sharedProps} />
    : <DesktopLayout {...sharedProps} />
}
```

---

## 4. 의존성 주입 (DI) 설정

```typescript
// src/infrastructure/container.ts
import { PrismaPlaceRepository } from './repositories/PrismaPlaceRepository'
import { PrismaImageRepository } from './repositories/PrismaImageRepository'
import { ClaudeAnalysisService } from './services/claude/ClaudeAnalysisService'
import { GoogleGeocodingService } from './services/google/GoogleGeocodingService'
import { ProcessImagesUseCase } from '../application/use-cases/processing/ProcessImagesUseCase'
import { ProcessTextInputsUseCase } from '../application/use-cases/processing/ProcessTextInputsUseCase'
import { DuplicateDetectionService } from '../application/services/DuplicateDetectionService'

// Simple factory pattern (프레임워크 없이)
export function createProcessImagesUseCase(): ProcessImagesUseCase {
  return new ProcessImagesUseCase(
    new PrismaPlaceRepository(),
    new ClaudeAnalysisService(),
    new GoogleGeocodingService(),
    new DuplicateDetectionService(),
    new PrismaImageRepository()
  )
}

export function createProcessTextInputsUseCase(): ProcessTextInputsUseCase {
  return new ProcessTextInputsUseCase(
    new PrismaPlaceRepository(),
    new ClaudeAnalysisService(),
    new GoogleGeocodingService(),
    new DuplicateDetectionService(),
    new PrismaTextInputRepository()
  )
}
```

```typescript
// app/api/projects/[id]/process/route.ts (리팩토링 후 ~30줄)
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createProcessImagesUseCase } from '@/src/infrastructure/container'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const retryImageIds = body.retryImageIds || []

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const useCase = createProcessImagesUseCase()
  const result = await useCase.executeForProject(
    id,
    project.destination,
    project.country || undefined,
    retryImageIds
  )

  return NextResponse.json({
    message: 'Processing complete',
    ...result,
  })
}
```

---

## 5. 마이그레이션 전략

### Phase 1: Infrastructure Layer (1주)
1. `src/infrastructure/api-client/` 생성 및 API 호출 이전
2. 기존 컴포넌트에서 점진적으로 교체

### Phase 2: Domain & Application Layer (2주)
1. `src/domain/interfaces/` 인터페이스 정의
2. `src/application/use-cases/processing/` 공통 로직 추출
3. API 라우트 리팩토링

### Phase 3: Hooks Layer (1주)
1. `hooks/queries/` SWR 기반 훅 생성
2. `hooks/mutations/` 변경 훅 생성
3. 컴포넌트에서 점진적 교체

### Phase 4: Component Layer (1주)
1. `ProjectDetailPage` 분리
2. Custom hook (`useProjectDetail`) 적용
3. 데드 코드 제거

---

## 6. 예상 효과

| 지표 | 현재 | 리팩토링 후 |
|------|------|-------------|
| process/*.ts 코드 라인 | ~600줄 (중복) | ~150줄 (공유) |
| ProjectDetailPage 라인 | 657줄 | ~100줄 |
| 상태 관리 복잡도 | 22개 useState | 커스텀 훅 1개 |
| API 호출 패턴 | 불일치 (SWR/fetch) | 통일 (SWR) |
| 테스트 용이성 | 낮음 | 높음 (DI) |
| 코드 재사용성 | 낮음 | 높음 |

---

## 7. 파일 의존성 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                           app/                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ API Routes   │  │ Page.tsx     │  │ _components/             │  │
│  │ (얇은 핸들러) │  │ (오케스트레이터)│  │ (프레젠테이션)           │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
└─────────┼─────────────────┼────────────────────────┼────────────────┘
          │                 │                        │
          │                 │                        │
┌─────────┼─────────────────┼────────────────────────┼────────────────┐
│         │                 │                        │                │
│         ▼                 ▼                        ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Use Cases    │  │ hooks/       │  │ components/              │  │
│  │              │  │ queries/     │  │ (공유 컴포넌트)            │  │
│  │              │  │ mutations/   │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘  │
│         │                 │                                         │
│         │                 │                                         │
│         ▼                 ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 src/infrastructure/                          │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌────────────────────┐    │   │
│  │  │ api-client │  │ repositories│  │ services/          │    │   │
│  │  │            │  │             │  │ claude/ google/    │    │   │
│  │  └────────────┘  └─────────────┘  └────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                         src/domain/                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  entities/  │  value-objects/  │  interfaces/ (Ports)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           hooks/                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. 결론

이 설계안은 다음을 달성합니다:

1. **코드 중복 제거**: Template Method Pattern으로 처리 로직 통합
2. **관심사 분리**: Domain/Application/Infrastructure 계층 분리
3. **테스트 용이성**: 인터페이스 기반 DI로 모킹 가능
4. **일관된 데이터 페칭**: SWR 기반 커스텀 훅 통일
5. **컴포넌트 간소화**: God Component를 작은 단위로 분해
6. **점진적 마이그레이션**: 기존 코드와 병행 가능한 구조

다음 단계로 `/sc:implement`를 사용하여 구현을 시작할 수 있습니다.
