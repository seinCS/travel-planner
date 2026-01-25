'use client'

import { useState, useCallback, useMemo } from 'react'
import { Image } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, CheckSquare, Square, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'

type StatusFilter = 'all' | 'processed' | 'failed' | 'pending'

interface ImageListProps {
  images: Image[]
  onRetry?: (imageIds: string[]) => void
  onImageClick?: (image: Image) => void
  onDeleteImages?: (imageIds: string[]) => Promise<void>
  isDeleting?: boolean
  vertical?: boolean
}

const STATUS_STYLES = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  processed: { label: '완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: '실패', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'processed', label: '완료' },
  { key: 'failed', label: '실패' },
  { key: 'pending', label: '대기' },
]

export function ImageList({
  images,
  onRetry,
  onImageClick,
  onDeleteImages,
  isDeleting = false,
  vertical = false,
}: ImageListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'selected' | 'allFailed'>('selected')

  // Filter images by status
  const filteredImages = useMemo(() => {
    if (statusFilter === 'all') return images
    return images.filter((img) => img.status === statusFilter)
  }, [images, statusFilter])

  // Count by status
  const statusCounts = useMemo(() => {
    const counts = { all: images.length, pending: 0, processed: 0, failed: 0 }
    images.forEach((img) => {
      if (img.status === 'pending') counts.pending++
      else if (img.status === 'processed') counts.processed++
      else if (img.status === 'failed') counts.failed++
    })
    return counts
  }, [images])

  const failedImages = useMemo(() => images.filter((i) => i.status === 'failed'), [images])

  // Selection handlers
  const toggleSelection = useCallback((imageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(imageId)) {
        next.delete(imageId)
      } else {
        next.add(imageId)
      }
      return next
    })
  }, [])

  const selectAllFailed = useCallback(() => {
    setSelectedIds(new Set(failedImages.map((i) => i.id)))
  }, [failedImages])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Delete handlers
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    setDeleteMode('selected')
    setShowDeleteDialog(true)
  }, [selectedIds])

  const handleDeleteAllFailed = useCallback(() => {
    if (failedImages.length === 0) return
    setDeleteMode('allFailed')
    setShowDeleteDialog(true)
  }, [failedImages])

  const confirmDelete = useCallback(async () => {
    if (!onDeleteImages) return

    const idsToDelete =
      deleteMode === 'allFailed'
        ? failedImages.map((i) => i.id)
        : Array.from(selectedIds)

    try {
      await onDeleteImages(idsToDelete)
      setSelectedIds(new Set())
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }, [deleteMode, failedImages, selectedIds, onDeleteImages])

  const cancelDelete = useCallback(() => {
    setShowDeleteDialog(false)
  }, [])

  if (images.length === 0) return null

  const selectedFailedCount = Array.from(selectedIds).filter(
    (id) => images.find((img) => img.id === id)?.status === 'failed'
  ).length

  return (
    <div className="space-y-3 h-full flex flex-col" data-testid="image-list">
      {/* Header with title */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-medium">업로드된 이미지 ({images.length}장)</h3>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg flex-shrink-0">
        {FILTER_TABS.map((tab) => {
          const count = statusCounts[tab.key]
          const isActive = statusFilter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`
                flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                    isActive ? 'bg-gray-100' : 'bg-gray-200/70'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selection & Action Bar */}
      {onDeleteImages && failedImages.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <span className="text-xs text-gray-600">
                  {selectedIds.size}개 선택됨
                  {selectedFailedCount > 0 && ` (실패 ${selectedFailedCount}개)`}
                </span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  선택 해제
                </button>
              </>
            ) : (
              <button
                onClick={selectAllFailed}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                실패한 이미지 모두 선택 ({failedImages.length}개)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300
                  shadow-sm hover:shadow transition-all duration-200"
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3 mr-1" />
                )}
                선택 삭제
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllFailed}
              disabled={isDeleting || failedImages.length === 0}
              className="text-xs h-7 px-2 shadow-sm hover:shadow transition-all duration-200"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              실패 전체 삭제
            </Button>
          </div>
        </div>
      )}

      {/* Image Grid - 반응형 그리드 (모바일 2열 → 태블릿 3열 → 데스크톱 5열) */}
      <div
        className={`flex-1 overflow-y-auto ${vertical ? 'space-y-2' : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2'}`}
      >
        {filteredImages.map((image) => {
          const statusStyle = STATUS_STYLES[image.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending
          const StatusIcon = statusStyle.icon
          const isSelected = selectedIds.has(image.id)
          const isFailed = image.status === 'failed'
          const canSelect = isFailed && onDeleteImages

          return (
            <div
              key={image.id}
              className={`
                relative group cursor-pointer
                ${vertical ? 'flex gap-3 items-center' : 'aspect-square'}
                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 rounded-lg' : ''}
                transition-all duration-200
              `}
              onClick={() => onImageClick?.(image)}
            >
              {/* Selection Checkbox for failed images */}
              {canSelect && (
                <button
                  onClick={(e) => toggleSelection(image.id, e)}
                  className={`
                    absolute top-1 left-1 z-10 p-0.5 rounded
                    transition-all duration-200
                    ${
                      isSelected
                        ? 'opacity-100 bg-blue-500 text-white'
                        : 'opacity-0 group-hover:opacity-100 bg-white/80 text-gray-700 hover:bg-white'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-400
                  `}
                  aria-label={isSelected ? '선택 해제' : '선택'}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              )}

              <img
                src={image.url}
                alt="Uploaded"
                className={`
                  object-cover rounded-lg
                  ${vertical ? 'w-16 h-16 flex-shrink-0' : 'w-full h-full'}
                  ${isFailed ? 'opacity-70' : ''}
                  transition-opacity duration-200
                `}
              />

              {vertical ? (
                <div className="flex-1 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${statusStyle.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusStyle.label}
                  </span>
                  {image.status === 'failed' && image.errorMessage && (
                    <p className="text-xs text-red-500 mt-1 truncate">{image.errorMessage}</p>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={`
                      absolute bottom-0 left-0 right-0 text-center text-[10px] py-0.5 rounded-b-lg
                      flex items-center justify-center gap-1 ${statusStyle.color}
                    `}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusStyle.label}
                  </div>
                  {image.status === 'failed' && image.errorMessage && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center p-1">
                      <span className="text-white text-[10px] text-center">
                        {image.errorMessage}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state for filtered view */}
      {filteredImages.length === 0 && statusFilter !== 'all' && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          {statusFilter === 'failed' && '실패한 이미지가 없습니다'}
          {statusFilter === 'processed' && '완료된 이미지가 없습니다'}
          {statusFilter === 'pending' && '대기 중인 이미지가 없습니다'}
        </div>
      )}

      {/* Retry button */}
      {failedImages.length > 0 && onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRetry(failedImages.map((i) => i.id))
          }}
          className="text-xs text-blue-600 hover:underline flex-shrink-0"
        >
          실패한 이미지 재분석 시도
        </button>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              이미지 삭제 확인
            </DialogTitle>
            <DialogDescription>
              {deleteMode === 'allFailed' ? (
                <>
                  실패한 이미지 <strong>{failedImages.length}개</strong>를 모두 삭제하시겠습니까?
                </>
              ) : (
                <>
                  선택한 이미지 <strong>{selectedIds.size}개</strong>를 삭제하시겠습니까?
                </>
              )}
              <br />
              <span className="text-red-500">이 작업은 되돌릴 수 없습니다.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete} disabled={isDeleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
