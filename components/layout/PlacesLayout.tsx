'use client'

import dynamic from 'next/dynamic'
import { PlaceList } from '@/components/place/PlaceList'
import { InputTabs } from '@/components/input/InputTabs'
import { TextInputList } from '@/components/input/TextInputList'
import { ImageList } from '@/components/upload/ImageList'
import { FailedImages } from '@/components/place/FailedImages'
import { ResponsiveSidebar } from '@/components/layout/ResponsiveSidebar'
import type { Place, Image, TextInput, CreatePlaceInput } from '@/types'

const GoogleMap = dynamic(() => import('@/components/map/GoogleMap').then(mod => mod.GoogleMap), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-muted-foreground">지도 로딩 중...</span>
    </div>
  ),
})

interface PlaceWithPlaceImages extends Place {
  placeImages?: { imageId: string }[]
}

interface PlacesLayoutProps {
  projectId: string
  places: PlaceWithPlaceImages[]
  images: Image[]
  textInputs: TextInput[]
  failedImages: Image[]
  selectedPlaceId: string | null
  categoryFilter: string | null
  mapCenter?: { lat: number; lng: number }
  sidebarTab: 'list' | 'input'
  processing: boolean
  processingText: boolean
  pendingImageCount: number
  pendingTextCount: number
  onPlaceSelect: (placeId: string | null) => void
  onPlaceDelete: (placeId: string) => void
  onOpenDetails: (placeId: string) => void
  onEditPlace: (place: PlaceWithPlaceImages) => void
  onCategoryFilterChange: (category: string | null) => void
  onSidebarTabChange: (tab: 'list' | 'input') => void
  onImageUploadComplete: (uploaded: number, failed: number) => void
  onTextInputComplete: () => void
  onDeleteTextInput: (id: string) => void
  onProcessImages: (ids?: string[]) => void
  onProcessText: (ids?: string[]) => void
  onImageClick: (image: Image) => void
  onAddPlace: (data: CreatePlaceInput) => Promise<boolean>
}

export function PlacesLayout({
  projectId,
  places,
  images,
  textInputs,
  failedImages,
  selectedPlaceId,
  categoryFilter,
  mapCenter,
  sidebarTab,
  processing,
  processingText,
  pendingImageCount,
  pendingTextCount,
  onPlaceSelect,
  onPlaceDelete,
  onOpenDetails,
  onEditPlace,
  onCategoryFilterChange,
  onSidebarTabChange,
  onImageUploadComplete,
  onTextInputComplete,
  onDeleteTextInput,
  onProcessImages,
  onProcessText,
  onImageClick,
  onAddPlace,
}: PlacesLayoutProps) {
  return (
    <>
      {/* 데스크탑 (≥1024px): 3컬럼 */}
      <div className="hidden lg:grid grid-cols-[2fr_1fr_280px] gap-4 h-full">
        <div className="bg-white rounded-lg border overflow-hidden min-h-[400px]">
          <GoogleMap
            places={places}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={onPlaceSelect}
            onOpenDetails={onOpenDetails}
            center={mapCenter}
          />
        </div>

        <div className="bg-white rounded-lg border p-4 overflow-hidden h-full flex flex-col">
          <h2 className="font-semibold mb-3 flex-shrink-0">📍 장소 목록 ({places.length}개)</h2>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PlaceList
              places={places}
              selectedPlaceId={selectedPlaceId}
              onPlaceSelect={onPlaceSelect}
              onPlaceDelete={onPlaceDelete}
              onOpenDetails={onOpenDetails}
              onEditPlace={onEditPlace}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={onCategoryFilterChange}
            />
          </div>
          {failedImages.length > 0 && (
            <div className="flex-shrink-0 mt-4">
              <FailedImages images={failedImages} onAddPlace={onAddPlace} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 overflow-hidden h-full">
          <div className="bg-white rounded-lg border p-3">
            <InputTabs
              projectId={projectId}
              onImageUploadComplete={onImageUploadComplete}
              onTextInputComplete={onTextInputComplete}
              disabled={processing || processingText}
            />
          </div>
          {textInputs.length > 0 && (
            <div className="bg-white rounded-lg border p-3">
              <TextInputList
                textInputs={textInputs}
                onDelete={onDeleteTextInput}
                onRetry={(ids) => onProcessText(ids)}
                disabled={processing || processingText}
              />
            </div>
          )}
          {images.length > 0 && (
            <div className="bg-white rounded-lg border p-3 flex-1 overflow-hidden">
              <ImageList
                images={images}
                onRetry={(ids) => onProcessImages(ids)}
                onImageClick={onImageClick}
                vertical
              />
            </div>
          )}
        </div>
      </div>

      {/* 태블릿 (640-1023px): 2컬럼 */}
      <div className="hidden sm:grid lg:hidden grid-cols-[1fr_320px] gap-4 h-full">
        <div className="bg-white rounded-lg border overflow-hidden min-h-[400px]">
          <GoogleMap
            places={places}
            selectedPlaceId={selectedPlaceId}
            onPlaceSelect={onPlaceSelect}
            onOpenDetails={onOpenDetails}
            center={mapCenter}
          />
        </div>

        <ResponsiveSidebar
          activeTab={sidebarTab}
          onTabChange={onSidebarTabChange}
          placeCount={places.length}
          pendingCount={pendingImageCount + pendingTextCount}
        >
          {sidebarTab === 'list' ? (
            <div className="p-4 h-full flex flex-col">
              <PlaceList
                places={places}
                selectedPlaceId={selectedPlaceId}
                onPlaceSelect={onPlaceSelect}
                onPlaceDelete={onPlaceDelete}
                onOpenDetails={onOpenDetails}
                onEditPlace={onEditPlace}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={onCategoryFilterChange}
              />
              {failedImages.length > 0 && (
                <div className="flex-shrink-0 mt-4 pt-4 border-t">
                  <FailedImages images={failedImages} onAddPlace={onAddPlace} />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
              <InputTabs
                projectId={projectId}
                onImageUploadComplete={onImageUploadComplete}
                onTextInputComplete={onTextInputComplete}
                disabled={processing || processingText}
              />
              {textInputs.length > 0 && (
                <TextInputList
                  textInputs={textInputs}
                  onDelete={onDeleteTextInput}
                  onRetry={(ids) => onProcessText(ids)}
                  disabled={processing || processingText}
                />
              )}
              {images.length > 0 && (
                <div className="flex-1 min-h-0">
                  <ImageList
                    images={images}
                    onRetry={(ids) => onProcessImages(ids)}
                    onImageClick={onImageClick}
                    vertical
                  />
                </div>
              )}
            </div>
          )}
        </ResponsiveSidebar>
      </div>
    </>
  )
}
