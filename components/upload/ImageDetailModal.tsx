'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CATEGORY_STYLES } from '@/lib/constants'
import { Image, Place } from '@/types'

interface ImageDetailModalProps {
  image: Image | null
  places: Place[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlaceSelect?: (placeId: string) => void
}

export function ImageDetailModal({
  image,
  places,
  open,
  onOpenChange,
  onPlaceSelect,
}: ImageDetailModalProps) {
  if (!image) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>이미지 상세</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 overflow-hidden flex-1">
          {/* 이미지 */}
          <div className="md:w-1/2 flex-shrink-0">
            <img
              src={image.url}
              alt="Uploaded"
              className="w-full h-auto max-h-[50vh] object-contain rounded-lg bg-gray-100"
            />
          </div>

          {/* 장소 목록 */}
          <div className="md:w-1/2 flex flex-col overflow-hidden">
            <h3 className="font-medium text-sm mb-2">
              추출된 장소 ({places.length}개)
            </h3>

            {places.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                이 이미지에서 추출된 장소가 없습니다.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {places.map((place) => {
                  const style = CATEGORY_STYLES[place.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other

                  return (
                    <div
                      key={place.id}
                      className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-all"
                      onClick={() => {
                        onPlaceSelect?.(place.id)
                        onOpenChange(false)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                          style={{ backgroundColor: style.color + '20', color: style.color }}
                        >
                          {style.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{place.name}</h4>
                          <span className="text-xs text-muted-foreground">{style.label}</span>
                        </div>
                      </div>
                      {place.comment && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 ml-8">
                          {place.comment}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
