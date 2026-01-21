'use client'

import { useEffect, useState, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// 무거운 컴포넌트들 동적 임포트 (bundle-dynamic-imports 패턴)
const GoogleMap = dynamic(() => import('@/components/map/GoogleMap').then(mod => mod.GoogleMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center"><span className="text-muted-foreground">지도 로딩 중...</span></div>
})

const PlaceDetailsPanel = dynamic(() => import('@/components/place/PlaceDetailsPanel').then(mod => mod.PlaceDetailsPanel), {
  ssr: false,
  loading: () => <div className="p-4"><div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse mb-4"></div><div className="h-24 bg-gray-200 rounded animate-pulse"></div></div>
})

const PlaceEditModal = dynamic(() => import('@/components/place/PlaceEditModal').then(mod => mod.PlaceEditModal), {
  ssr: false,
})

const ShareModal = dynamic(() => import('@/components/project/ShareModal').then(mod => mod.ShareModal), {
  ssr: false,
})

import { PlaceList } from '@/components/place/PlaceList'
import { InputTabs } from '@/components/input/InputTabs'
import { TextInputList } from '@/components/input/TextInputList'
import { ImageList } from '@/components/upload/ImageList'
import { ImageDetailModal } from '@/components/upload/ImageDetailModal'
import { FailedImages } from '@/components/place/FailedImages'
import { MobileNavigation, MobileTab } from '@/components/mobile/MobileNavigation'
import { PlaceListDrawer } from '@/components/mobile/PlaceListDrawer'
import { toast } from 'sonner'
import { Place, Image, TextInput } from '@/types'
import { PlaceCategory } from '@/lib/constants'
import { geocodeDestination } from '@/lib/google-maps'

interface PlaceWithPlaceImages extends Place {
  placeImages?: { imageId: string }[]
}

interface ProjectDetailProps {
  params: Promise<{ id: string }>
}

interface Project {
  id: string
  name: string
  destination: string
  country: string | null
}

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { id } = use(params)
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [places, setPlaces] = useState<PlaceWithPlaceImages[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [textInputs, setTextInputs] = useState<TextInput[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processingText, setProcessingText] = useState(false)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)
  const [editingPlace, setEditingPlace] = useState<PlaceWithPlaceImages | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')
  const [isPlaceListDrawerOpen, setIsPlaceListDrawerOpen] = useState(false)

  const fetchProject = async () => {
    try {
      console.log('[Frontend] Fetching project:', id)
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        console.log('[Frontend] Project fetched, images:', data.images?.length, data.images?.map((i: Image) => i.status))
        setProject(data)
        setImages(data.images || [])

        // 프로젝트 지역으로 지도 중심 설정
        if (data.destination && !mapCenter) {
          const center = await geocodeDestination(data.destination, data.country || undefined)
          if (center) {
            setMapCenter(center)
          }
        }
      } else if (res.status === 404) {
        router.push('/projects')
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    }
  }

  const fetchPlaces = async () => {
    try {
      console.log('[Frontend] Fetching places for project:', id)
      const res = await fetch(`/api/projects/${id}/places`)
      if (res.ok) {
        const data = await res.json()
        console.log('[Frontend] Places fetched:', data.places?.length)
        setPlaces(data.places || [])
      }
    } catch (error) {
      console.error('Failed to fetch places:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTextInputs = async () => {
    try {
      console.log('[Frontend] Fetching text inputs for project:', id)
      const res = await fetch(`/api/projects/${id}/text-inputs`)
      if (res.ok) {
        const data = await res.json()
        console.log('[Frontend] Text inputs fetched:', data.textInputs?.length)
        setTextInputs(data.textInputs || [])
      }
    } catch (error) {
      console.error('Failed to fetch text inputs:', error)
    }
  }

  // 초기 데이터 병렬 로딩 (async-parallel 패턴)
  useEffect(() => {
    Promise.all([fetchProject(), fetchPlaces(), fetchTextInputs()])
  }, [id])

  const handleUploadComplete = (uploadedCount: number, failedCount: number) => {
    fetchProject()
    if (uploadedCount > 0) {
      toast.success(`${uploadedCount}개 이미지 업로드 완료${failedCount > 0 ? ` (${failedCount}개 실패)` : ''}`)
    } else if (failedCount > 0) {
      toast.error(`업로드 실패: ${failedCount}개 이미지`)
    }
  }

  const handleProcess = async (retryImageIds?: string[]) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/projects/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retryImageIds }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.processed > 0 || data.failed > 0) {
          toast.success(`처리 완료: ${data.processed}개 성공, ${data.failed}개 실패`)
        } else {
          toast.info('처리할 이미지가 없습니다.')
        }
        // 병렬로 데이터 갱신
        await Promise.all([fetchPlaces(), fetchProject()])
      } else {
        throw new Error('Processing failed')
      }
    } catch (error) {
      console.error('Processing failed:', error)
      toast.error('이미지 처리에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleRetryFailed = (imageIds: string[]) => {
    handleProcess(imageIds)
  }

  const handleProcessText = async (retryTextInputIds?: string[]) => {
    setProcessingText(true)
    try {
      const res = await fetch(`/api/projects/${id}/process-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retryTextInputIds }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.processed > 0 || data.failed > 0) {
          toast.success(`텍스트 처리 완료: ${data.processed}개 성공, ${data.failed}개 실패`)
        } else {
          toast.info('처리할 텍스트가 없습니다.')
        }
        await Promise.all([fetchPlaces(), fetchTextInputs()])
      } else {
        throw new Error('Text processing failed')
      }
    } catch (error) {
      console.error('Text processing failed:', error)
      toast.error('텍스트 처리에 실패했습니다.')
    } finally {
      setProcessingText(false)
    }
  }

  const handleTextInputComplete = () => {
    fetchTextInputs()
    toast.success('저장되었습니다.')
  }

  const handleTextInputDelete = async (textInputId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/text-inputs/${textInputId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setTextInputs(textInputs.filter((t) => t.id !== textInputId))
        toast.success('삭제되었습니다.')
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      console.error('Failed to delete text input:', error)
      toast.error('삭제에 실패했습니다.')
    }
  }

  const handleRetryTextInputs = (textInputIds: string[]) => {
    handleProcessText(textInputIds)
  }

  const handlePlaceDelete = async (placeId: string) => {
    try {
      const res = await fetch(`/api/places/${placeId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setPlaces(places.filter((p) => p.id !== placeId))
        if (selectedPlaceId === placeId) {
          setSelectedPlaceId(null)
        }
        toast.success('장소가 삭제되었습니다.')
      }
    } catch (error) {
      console.error('Failed to delete place:', error)
      toast.error('장소 삭제에 실패했습니다.')
    }
  }

  const handleEditPlace = (place: PlaceWithPlaceImages) => {
    setEditingPlace(place)
    setIsEditModalOpen(true)
  }

  const handlePlaceUpdated = (updatedPlace: Place) => {
    setPlaces(places.map((p) => (p.id === updatedPlace.id ? { ...p, ...updatedPlace } : p)))
    toast.success('장소가 수정되었습니다.')
  }

  const handleAddPlace = async (data: {
    name: string
    category: PlaceCategory
    comment?: string
    imageIds: string[]
  }) => {
    try {
      const res = await fetch(`/api/projects/${id}/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast.success('장소가 추가되었습니다.')
        fetchPlaces()
        fetchProject()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add place')
      }
    } catch (error) {
      console.error('Failed to add place:', error)
      toast.error('장소 추가에 실패했습니다.')
    }
  }

  const pendingCount = images.filter((i) => i.status === 'pending').length
  const failedCount = images.filter((i) => i.status === 'failed').length
  const failedImages = images.filter((i) => i.status === 'failed')

  const pendingTextCount = textInputs.filter((t) => t.status === 'pending').length
  const failedTextCount = textInputs.filter((t) => t.status === 'failed').length

  // 특정 이미지에서 추출된 장소 목록
  const getPlacesForImage = useMemo(() => {
    return (imageId: string): Place[] => {
      return places.filter((place) =>
        place.placeImages?.some((pi) => pi.imageId === imageId)
      )
    }
  }, [places])

  const handleImageClick = (image: Image) => {
    setSelectedImage(image)
    setIsImageModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  // Mobile tab change handler
  const handleMobileTabChange = (tab: MobileTab) => {
    setMobileTab(tab)
    if (tab === 'list') {
      setIsPlaceListDrawerOpen(true)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] pb-16 lg:pb-0">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">{project?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project?.destination}{project?.country && `, ${project.country}`}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Desktop: Show all buttons */}
          <div className="hidden lg:flex gap-2">
            {(pendingCount > 0 || failedCount > 0) && (
              <Button onClick={() => handleProcess()} disabled={processing || processingText}>
                {processing ? '처리 중...' : `📸 이미지 분석 (${pendingCount + failedCount})`}
              </Button>
            )}
            {(pendingTextCount > 0 || failedTextCount > 0) && (
              <Button onClick={() => handleProcessText()} disabled={processing || processingText}>
                {processingText ? '처리 중...' : `📝 텍스트 분석 (${pendingTextCount + failedTextCount})`}
              </Button>
            )}
          </div>
          {/* Mobile: Compact process button */}
          <div className="flex lg:hidden gap-2">
            {(pendingCount > 0 || failedCount > 0 || pendingTextCount > 0 || failedTextCount > 0) && (
              <Button
                size="sm"
                onClick={() => {
                  if (pendingCount > 0 || failedCount > 0) handleProcess()
                  if (pendingTextCount > 0 || failedTextCount > 0) handleProcessText()
                }}
                disabled={processing || processingText}
              >
                {processing || processingText ? '처리 중...' : `분석 (${pendingCount + failedCount + pendingTextCount + failedTextCount})`}
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" className="lg:size-auto" onClick={() => setIsShareModalOpen(true)}>
            공유
          </Button>
        </div>
      </div>

      {/* 메인 컨텐츠 - Mobile First */}
      <div className="flex flex-col lg:grid lg:grid-cols-[2fr_1fr_280px] gap-4 h-[calc(100%-4rem)]">
        {/* 지도 - Always visible, full height on mobile when map tab active */}
        <div
          className={`
            bg-white rounded-lg border overflow-hidden min-h-[300px]
            ${mobileTab === 'map' ? 'flex-1 h-full' : 'hidden lg:block'}
            lg:h-full lg:min-h-[400px]
          `}
        >
          <GoogleMap
            places={places}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={setSelectedPlaceId}
            onOpenDetails={setDetailPlaceId}
            center={mapCenter || undefined}
          />
        </div>

        {/* 장소 목록 - Hidden on mobile (shown via drawer), visible on desktop */}
        <div className="hidden lg:flex bg-white rounded-lg border p-4 overflow-hidden h-full flex-col">
          <h2 className="font-semibold mb-3 flex-shrink-0">📍 장소 목록 ({places.length}개)</h2>
          <div className="flex-1 overflow-hidden">
            <PlaceList
              places={places}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={setSelectedPlaceId}
              onPlaceDelete={handlePlaceDelete}
              onOpenDetails={setDetailPlaceId}
              onEditPlace={handleEditPlace}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
            />
          </div>

          {/* 실패 이미지 섹션 */}
          {failedImages.length > 0 && (
            <div className="flex-shrink-0 mt-4">
              <FailedImages images={failedImages} onAddPlace={handleAddPlace} />
            </div>
          )}
        </div>

        {/* 입력 영역 - Shown on mobile when input tab active */}
        <div
          className={`
            flex flex-col gap-4 overflow-hidden
            ${mobileTab === 'input' ? 'flex-1' : 'hidden lg:flex'}
            lg:h-full
          `}
        >
          {/* 입력 탭 (이미지/텍스트/URL) */}
          <div className="bg-white rounded-lg border p-3">
            <InputTabs
              projectId={id}
              onImageUploadComplete={handleUploadComplete}
              onTextInputComplete={handleTextInputComplete}
              disabled={processing || processingText}
            />
          </div>

          {/* 텍스트 입력 목록 */}
          {textInputs.length > 0 && (
            <div className="bg-white rounded-lg border p-3">
              <TextInputList
                textInputs={textInputs}
                onDelete={handleTextInputDelete}
                onRetry={handleRetryTextInputs}
                disabled={processing || processingText}
              />
            </div>
          )}

          {/* 업로드된 이미지 목록 (세로 배열) */}
          {images.length > 0 && (
            <div className="bg-white rounded-lg border p-3 flex-1 overflow-hidden">
              <ImageList
                images={images}
                onRetry={handleRetryFailed}
                onImageClick={handleImageClick}
                vertical
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        activeTab={mobileTab}
        onTabChange={handleMobileTabChange}
        placeCount={places.length}
      />

      {/* Mobile Place List Drawer */}
      <PlaceListDrawer
        open={isPlaceListDrawerOpen}
        onOpenChange={setIsPlaceListDrawerOpen}
        title={`📍 장소 목록 (${places.length}개)`}
      >
        <PlaceList
          places={places}
          selectedPlaceId={selectedPlaceId}
          onPlaceSelect={(placeId) => {
            setSelectedPlaceId(placeId)
            setIsPlaceListDrawerOpen(false)
            setMobileTab('map')
          }}
          onPlaceDelete={handlePlaceDelete}
          onOpenDetails={(placeId) => {
            setDetailPlaceId(placeId)
            setIsPlaceListDrawerOpen(false)
          }}
          onEditPlace={handleEditPlace}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />
        {/* 실패 이미지 섹션 */}
        {failedImages.length > 0 && (
          <div className="mt-4">
            <FailedImages images={failedImages} onAddPlace={handleAddPlace} />
          </div>
        )}
      </PlaceListDrawer>

      {/* 이미지 상세 모달 */}
      <ImageDetailModal
        image={selectedImage}
        places={selectedImage ? getPlacesForImage(selectedImage.id) : []}
        open={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        onPlaceSelect={setSelectedPlaceId}
      />

      {/* 장소 상세 패널 - Mobile: Bottom Sheet, Desktop: Side Panel */}
      {detailPlaceId && (
        <>
          {/* Mobile: Bottom Sheet */}
          <Sheet open={!!detailPlaceId} onOpenChange={(open) => !open && setDetailPlaceId(null)}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-xl lg:hidden">
              <SheetHeader className="pb-2 border-b">
                <SheetTitle>장소 상세</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto h-full pb-safe">
                <PlaceDetailsPanel
                  placeId={detailPlaceId}
                  onClose={() => setDetailPlaceId(null)}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop: Side Panel */}
          <div className="hidden lg:block fixed right-0 top-16 bottom-0 w-96 bg-white shadow-lg border-l z-50">
            <PlaceDetailsPanel
              placeId={detailPlaceId}
              onClose={() => setDetailPlaceId(null)}
            />
          </div>
        </>
      )}

      {/* 장소 편집 모달 */}
      <PlaceEditModal
        place={editingPlace}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handlePlaceUpdated}
      />

      {/* 공유 모달 */}
      {project && (
        <ShareModal
          projectId={id}
          projectName={project.name}
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
        />
      )}
    </div>
  )
}
