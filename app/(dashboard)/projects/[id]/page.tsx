'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// Dynamic imports for heavy components
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
import { ResponsiveSidebar } from '@/components/layout/ResponsiveSidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { useProjectDetail } from './_hooks/useProjectDetail'
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

  // Consolidated data and actions from hook
  const {
    project,
    places,
    images,
    textInputs,
    mapCenter,
    isLoading,
    pendingImageCount,
    failedImageCount,
    failedImages,
    pendingTextCount,
    failedTextCount,
    getPlacesForImage,
    processing,
    processingText,
    processImages,
    processText,
    handleUploadComplete,
    handleTextInputComplete,
    deleteTextInput,
    deletePlace,
    updatePlace,
    addPlace,
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
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')
  const [sidebarTab, setSidebarTab] = useState<'list' | 'input'>('list')

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
    <div className="h-[calc(100vh-8rem)] pb-16 sm:pb-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">{project?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project?.destination}{project?.country && `, ${project.country}`}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Desktop buttons */}
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
          {/* Mobile compact button */}
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
          <Button variant="outline" size="sm" className="lg:size-auto" onClick={() => setIsShareModalOpen(true)}>
            공유
          </Button>
        </div>
      </div>

      {/* Main Content - 3-tier responsive layout */}
      <div className="h-[calc(100%-4rem)]">
        {/* Mobile (<640px): Tab-based single view */}
        <div className="sm:hidden h-full flex flex-col">
          {mobileTab === 'map' && (
            <div className="flex-1 bg-white rounded-lg border overflow-hidden min-h-[300px]">
              <GoogleMap
                places={places}
                selectedPlaceId={selectedPlaceId}
                onPlaceSelect={setSelectedPlaceId}
                onOpenDetails={setDetailPlaceId}
                center={mapCenter || undefined}
              />
            </div>
          )}

          {mobileTab === 'list' && (
            <div className="flex-1 bg-white rounded-lg border p-4 overflow-hidden flex flex-col">
              <h2 className="font-semibold mb-3 flex-shrink-0">📍 장소 목록 ({places.length}개)</h2>
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
                    vertical
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tablet (640-1023px): 2-column with sidebar tabs */}
        <div className="hidden sm:grid lg:hidden grid-cols-[1fr_320px] gap-4 h-full">
          <div className="bg-white rounded-lg border overflow-hidden min-h-[400px]">
            <GoogleMap
              places={places}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={setSelectedPlaceId}
              onOpenDetails={setDetailPlaceId}
              center={mapCenter || undefined}
            />
          </div>

          <ResponsiveSidebar
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            placeCount={places.length}
            pendingCount={pendingImageCount + pendingTextCount}
          >
            {sidebarTab === 'list' ? (
              <div className="p-4 h-full flex flex-col">
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
                {failedImages.length > 0 && (
                  <div className="flex-shrink-0 mt-4 pt-4 border-t">
                    <FailedImages images={failedImages} onAddPlace={addPlace} />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
                <InputTabs
                  projectId={id}
                  onImageUploadComplete={handleUploadComplete}
                  onTextInputComplete={handleTextInputComplete}
                  disabled={processing || processingText}
                />
                {textInputs.length > 0 && (
                  <TextInputList
                    textInputs={textInputs}
                    onDelete={deleteTextInput}
                    onRetry={(ids) => processText(ids)}
                    disabled={processing || processingText}
                  />
                )}
                {images.length > 0 && (
                  <div className="flex-1 min-h-0">
                    <ImageList
                      images={images}
                      onRetry={(ids) => processImages(ids)}
                      onImageClick={handleImageClick}
                      vertical
                    />
                  </div>
                )}
              </div>
            )}
          </ResponsiveSidebar>
        </div>

        {/* Desktop (≥1024px): 3-column layout */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_280px] gap-4 h-full">
          <div className="bg-white rounded-lg border overflow-hidden min-h-[400px]">
            <GoogleMap
              places={places}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={setSelectedPlaceId}
              onOpenDetails={setDetailPlaceId}
              center={mapCenter || undefined}
            />
          </div>

          <div className="bg-white rounded-lg border p-4 overflow-hidden h-full flex flex-col">
            <h2 className="font-semibold mb-3 flex-shrink-0">📍 장소 목록 ({places.length}개)</h2>
            <div className="flex-1 min-h-0 overflow-hidden">
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
            {failedImages.length > 0 && (
              <div className="flex-shrink-0 mt-4">
                <FailedImages images={failedImages} onAddPlace={addPlace} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 overflow-hidden h-full">
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
                  vertical
                />
              </div>
            )}
          </div>
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
    </div>
  )
}
