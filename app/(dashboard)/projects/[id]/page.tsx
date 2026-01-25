'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useRealtimeSync } from '@/hooks/realtime'
import { PresenceIndicator } from '@/components/realtime'

// Dynamic imports for heavy components
const GoogleMap = dynamic(() => import('@/components/map/GoogleMap').then(mod => mod.GoogleMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center"><span className="text-muted-foreground">지도 로딩 중...</span></div>
})

const ItineraryView = dynamic(() => import('@/components/itinerary/ItineraryView').then(mod => mod.ItineraryView), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center"><span className="text-muted-foreground">일정 로딩 중...</span></div>
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

const PlaceSearchModal = dynamic(() => import('@/components/place/PlaceSearchModal').then(mod => mod.PlaceSearchModal), {
  ssr: false,
})

import { PlaceList } from '@/components/place/PlaceList'
import { InputTabs } from '@/components/input/InputTabs'
import { TextInputList } from '@/components/input/TextInputList'
import { ImageList } from '@/components/upload/ImageList'
import { ImageDetailModal } from '@/components/upload/ImageDetailModal'
import { FailedImages } from '@/components/place/FailedImages'
import { MobileNavigation, MobileTab } from '@/components/mobile/MobileNavigation'
import { MainTabNavigation, MainTab } from '@/components/layout/MainTabNavigation'
import { PlacesLayout } from '@/components/layout/PlacesLayout'
import { ItineraryLayout } from '@/components/layout/ItineraryLayout'
import { MembersPanel } from '@/components/members/MembersPanel'
import { useIsMobile } from '@/hooks/use-mobile'
import { useProjectDetail } from './_hooks/useProjectDetail'
import { useSession } from 'next-auth/react'
import type { Place, Image } from '@/types'

interface PlaceWithPlaceImages extends Place {
  placeImages?: { imageId: string }[]
}

interface ProjectDetailProps {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { id } = use(params)
  const router = useRouter()
  const isMobile = useIsMobile()
  const { data: session } = useSession()

  // Realtime collaboration sync (SWR cache invalidation)
  const { isConnected } = useRealtimeSync(id)

  // Consolidated data and actions from hook
  const {
    project,
    places,
    images,
    textInputs,
    mapCenter,
    mapCenterFailed,
    isLoading,
    pendingImageCount,
    failedImageCount,
    failedImages,
    pendingTextCount,
    failedTextCount,
    getPlacesForImage,
    processing,
    processingText,
    deletingImages,
    processImages,
    processText,
    handleUploadComplete,
    handleTextInputComplete,
    deleteTextInput,
    deletePlace,
    updatePlace,
    addPlace,
    deleteImages,
  } = useProjectDetail(id)

  // UI state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)
  const [editingPlace, setEditingPlace] = useState<PlaceWithPlaceImages | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')
  const [sidebarTab, setSidebarTab] = useState<'list' | 'input'>('list')

  // Main tab state (places/itinerary) - 독립적인 상태 관리
  const [mainTab, setMainTab] = useState<MainTab>('places')

  // Itinerary day filter state - itinerary 탭 전용 상태
  const [selectedDayPlaceIds, setSelectedDayPlaceIds] = useState<string[] | null>(null)

  // fitBounds 트리거 키 - 탭 전환, Day 선택 시 증가
  const [fitBoundsKey, setFitBoundsKey] = useState(0)

  // Handle day selection from itinerary
  const handleDaySelect = (dayNumber: number | null, placeIds: string[]) => {
    if (dayNumber === null) {
      setSelectedDayPlaceIds(null)
    } else {
      setSelectedDayPlaceIds(placeIds)
    }
    // Day 선택 시 fitBounds 재실행 트리거
    setFitBoundsKey(prev => prev + 1)
  }

  // Handle main tab change - 탭 전환 시 지도 필터 상태 초기화
  const handleMainTabChange = (tab: MainTab) => {
    setMainTab(tab)
    // 탭 전환 시 fitBounds 재실행 트리거
    setFitBoundsKey(prev => prev + 1)
    // 장소 탭으로 전환 시 Day 필터 해제
    if (tab === 'places') {
      setSelectedDayPlaceIds(null)
    }
  }

  // Handlers
  const handlePlaceDelete = async (placeId: string) => {
    const deleted = await deletePlace(placeId)
    if (deleted && selectedPlaceId === placeId) {
      setSelectedPlaceId(null)
    }
  }

  const handleEditPlace = (place: PlaceWithPlaceImages) => {
    setEditingPlace(place)
    setIsEditModalOpen(true)
  }

  const handleImageClick = (image: Image) => {
    setSelectedImage(image)
    setIsImageModalOpen(true)
  }

  const handleMobileTabChange = (tab: MobileTab) => {
    setMobileTab(tab)
  }

  // Redirect if project not found
  if (!isLoading && !project) {
    router.push('/projects')
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  const totalPendingCount = pendingImageCount + failedImageCount + pendingTextCount + failedTextCount

  return (
    <div className="h-[calc(100vh-8rem)] pb-16 sm:pb-0 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">{project?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {project?.destination}{project?.country && `, ${project.country}`}
            </p>
          </div>
          {/* Connection status indicator */}
          {isConnected && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="hidden lg:inline">실시간 동기화</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Presence indicator - show online collaborators */}
          <div className="hidden sm:block">
            <PresenceIndicator projectId={id} />
          </div>
          {/* Desktop buttons - only show in places tab */}
          {mainTab === 'places' && (
            <div className="hidden lg:flex gap-2">
              {(pendingImageCount > 0 || failedImageCount > 0) && (
                <Button onClick={() => processImages()} disabled={processing || processingText}>
                  {processing ? '처리 중...' : `📸 이미지 분석 (${pendingImageCount + failedImageCount})`}
                </Button>
              )}
              {(pendingTextCount > 0 || failedTextCount > 0) && (
                <Button onClick={() => processText()} disabled={processing || processingText}>
                  {processingText ? '처리 중...' : `📝 텍스트 분석 (${pendingTextCount + failedTextCount})`}
                </Button>
              )}
            </div>
          )}
          {/* Mobile compact button - only show in places tab */}
          {mainTab === 'places' && (
            <div className="flex lg:hidden gap-2">
              {totalPendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (pendingImageCount > 0 || failedImageCount > 0) processImages()
                    if (pendingTextCount > 0 || failedTextCount > 0) processText()
                  }}
                  disabled={processing || processingText}
                >
                  {processing || processingText ? '처리 중...' : `분석 (${totalPendingCount})`}
                </Button>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" className="lg:size-auto" onClick={() => setIsShareModalOpen(true)}>
            공유
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation - Desktop & Tablet */}
      <div className="hidden sm:block flex-shrink-0">
        <MainTabNavigation activeTab={mainTab} onTabChange={handleMainTabChange} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {/* Mobile (<640px): Tab-based single view with MobileNavigation */}
        <div className="sm:hidden h-full flex flex-col">
          {mobileTab === 'map' && (
            <div className="flex-1 bg-white rounded-lg border overflow-hidden min-h-[300px]">
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
            </div>
          )}

          {mobileTab === 'itinerary' && (
            <div className="flex-1 bg-white rounded-lg border overflow-hidden">
              <ItineraryView
                projectId={id}
                places={places}
                onDaySelect={handleDaySelect}
                onPlaceClick={(placeId) => {
                  setSelectedPlaceId(placeId)
                  setDetailPlaceId(placeId)
                }}
              />
            </div>
          )}

          {mobileTab === 'list' && (
            <div className="flex-1 glass-card p-4 overflow-hidden flex flex-col">
              {/* Header with search button */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="font-semibold text-gray-800">📍 장소 목록 ({places.length}개)</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="gap-1.5"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  장소 검색
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PlaceList
                  places={places}
                  selectedPlaceId={selectedPlaceId}
                  onPlaceSelect={(placeId) => {
                    setSelectedPlaceId(placeId)
                    setMobileTab('map')
                  }}
                  onPlaceDelete={handlePlaceDelete}
                  onOpenDetails={setDetailPlaceId}
                  onEditPlace={handleEditPlace}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                />
              </div>
              {failedImages.length > 0 && (
                <div className="flex-shrink-0 mt-4 pt-4 border-t">
                  <FailedImages images={failedImages} onAddPlace={addPlace} />
                </div>
              )}
            </div>
          )}

          {mobileTab === 'input' && (
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
              <div className="bg-white rounded-lg border p-3">
                <InputTabs
                  projectId={id}
                  onImageUploadComplete={handleUploadComplete}
                  onTextInputComplete={handleTextInputComplete}
                  disabled={processing || processingText}
                />
              </div>
              {textInputs.length > 0 && (
                <div className="bg-white rounded-lg border p-3">
                  <TextInputList
                    textInputs={textInputs}
                    onDelete={deleteTextInput}
                    onRetry={(ids) => processText(ids)}
                    disabled={processing || processingText}
                  />
                </div>
              )}
              {images.length > 0 && (
                <div className="bg-white rounded-lg border p-3 flex-1 overflow-hidden">
                  <ImageList
                    images={images}
                    onRetry={(ids) => processImages(ids)}
                    onImageClick={handleImageClick}
                    onDeleteImages={deleteImages}
                    isDeleting={deletingImages}
                    vertical
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop & Tablet (≥640px): Main tab-based layout */}
        <div className="hidden sm:block h-full">
          {mainTab === 'places' && (
            <PlacesLayout
              projectId={id}
              places={places}
              images={images}
              textInputs={textInputs}
              failedImages={failedImages}
              selectedPlaceId={selectedPlaceId}
              categoryFilter={categoryFilter}
              mapCenter={mapCenter || undefined}
              destinationCenter={mapCenter || undefined}
              fitBoundsKey={`places-${fitBoundsKey}`}
              sidebarTab={sidebarTab}
              processing={processing}
              processingText={processingText}
              pendingImageCount={pendingImageCount}
              pendingTextCount={pendingTextCount}
              onPlaceSelect={setSelectedPlaceId}
              onPlaceDelete={handlePlaceDelete}
              onOpenDetails={setDetailPlaceId}
              onEditPlace={handleEditPlace}
              onCategoryFilterChange={setCategoryFilter}
              onSidebarTabChange={setSidebarTab}
              onImageUploadComplete={handleUploadComplete}
              onTextInputComplete={handleTextInputComplete}
              onDeleteTextInput={deleteTextInput}
              onProcessImages={processImages}
              onProcessText={processText}
              onImageClick={handleImageClick}
              onAddPlace={addPlace}
              onSearchClick={() => setIsSearchModalOpen(true)}
              onDeleteImages={deleteImages}
              isDeletingImages={deletingImages}
            />
          )}
          {mainTab === 'itinerary' && (
            <ItineraryLayout
              projectId={id}
              places={places}
              selectedPlaceId={selectedPlaceId}
              mapCenter={mapCenter || undefined}
              destinationCenter={mapCenter || undefined}
              fitBoundsKey={`itinerary-${fitBoundsKey}-${selectedDayPlaceIds?.join(',') || 'all'}`}
              selectedDayPlaceIds={selectedDayPlaceIds}
              onPlaceSelect={setSelectedPlaceId}
              onOpenDetails={setDetailPlaceId}
              onDaySelect={handleDaySelect}
            />
          )}
          {mainTab === 'members' && project && session?.user?.id && (
            <div className="h-full p-4 overflow-auto">
              <MembersPanel
                projectId={id}
                projectOwnerId={project.userId}
                currentUserId={session.user.id}
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

      {/* Image Detail Modal */}
      <ImageDetailModal
        image={selectedImage}
        places={selectedImage ? getPlacesForImage(selectedImage.id) : []}
        open={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        onPlaceSelect={setSelectedPlaceId}
      />

      {/* Place Details Panel */}
      {detailPlaceId && isMobile && (
        <Sheet open={!!detailPlaceId} onOpenChange={(open) => !open && setDetailPlaceId(null)}>
          <SheetContent side="bottom" className="max-h-[90vh] h-auto min-h-[50vh] rounded-t-xl flex flex-col">
            <SheetHeader className="flex-shrink-0 pb-2 border-b">
              <SheetTitle>장소 상세</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto pb-safe">
              <PlaceDetailsPanel
                key={detailPlaceId}
                placeId={detailPlaceId}
                onClose={() => setDetailPlaceId(null)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {detailPlaceId && isMobile === false && (
        <div className="fixed right-0 top-16 bottom-0 w-96 bg-white shadow-lg border-l z-50 overflow-y-auto">
          <PlaceDetailsPanel
            key={detailPlaceId}
            placeId={detailPlaceId}
            onClose={() => setDetailPlaceId(null)}
          />
        </div>
      )}

      {/* Place Edit Modal */}
      <PlaceEditModal
        place={editingPlace}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={updatePlace}
      />

      {/* Share Modal */}
      {project && (
        <ShareModal
          projectId={id}
          projectName={project.name}
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
        />
      )}

      {/* Place Search Modal */}
      {project && (
        <PlaceSearchModal
          open={isSearchModalOpen}
          onOpenChange={setIsSearchModalOpen}
          locationBias={mapCenter || undefined}
          destinationName={project.destination}
          onAddPlace={addPlace}
        />
      )}
    </div>
  )
}
