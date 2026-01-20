'use client'

import { Image } from '@/types'

interface ImageListProps {
  images: Image[]
  onRetry?: (imageIds: string[]) => void
  onImageClick?: (image: Image) => void
  vertical?: boolean
}

const STATUS_STYLES = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  processed: { label: '완료', color: 'bg-green-100 text-green-800' },
  failed: { label: '실패', color: 'bg-red-100 text-red-800' },
}

export function ImageList({ images, onRetry, onImageClick, vertical = false }: ImageListProps) {
  if (images.length === 0) return null

  const pendingImages = images.filter((i) => i.status === 'pending')
  const processedImages = images.filter((i) => i.status === 'processed')
  const failedImages = images.filter((i) => i.status === 'failed')

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-medium">
          업로드된 이미지 ({images.length}장)
        </h3>
        <div className="flex gap-2 text-xs">
          {pendingImages.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
              대기 {pendingImages.length}
            </span>
          )}
          {processedImages.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
              완료 {processedImages.length}
            </span>
          )}
          {failedImages.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">
              실패 {failedImages.length}
            </span>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${vertical ? 'space-y-2' : 'grid grid-cols-5 gap-2'}`}>
        {images.map((image) => {
          const statusStyle = STATUS_STYLES[image.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending

          return (
            <div
              key={image.id}
              className={`relative group cursor-pointer ${vertical ? 'flex gap-3 items-center' : 'aspect-square'}`}
              onClick={() => onImageClick?.(image)}
            >
              <img
                src={image.url}
                alt="Uploaded"
                className={`object-cover rounded-lg ${vertical ? 'w-16 h-16 flex-shrink-0' : 'w-full h-full'}`}
              />
              {vertical ? (
                <div className="flex-1 min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${statusStyle.color}`}>
                    {statusStyle.label}
                  </span>
                  {image.status === 'failed' && image.errorMessage && (
                    <p className="text-xs text-red-500 mt-1 truncate">{image.errorMessage}</p>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={`absolute bottom-0 left-0 right-0 text-center text-[10px] py-0.5 rounded-b-lg ${statusStyle.color}`}
                  >
                    {statusStyle.label}
                  </div>
                  {image.status === 'failed' && image.errorMessage && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-1">
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
    </div>
  )
}
