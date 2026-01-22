'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_STYLES, PlaceCategory } from '@/lib/constants'
import type { Image, CreatePlaceInput } from '@/types'

interface FailedImagesProps {
  images: Image[]
  onAddPlace: (data: CreatePlaceInput) => Promise<boolean>
}

export function FailedImages({ images, onAddPlace }: FailedImagesProps) {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PlaceCategory>('other')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  if (images.length === 0) return null

  const handleSubmit = async () => {
    if (!selectedImage || !name.trim()) return

    setLoading(true)
    try {
      await onAddPlace({
        name: name.trim(),
        category,
        comment: comment.trim() || undefined,
        imageIds: [selectedImage.id],
      })
      setSelectedImage(null)
      setName('')
      setCategory('other')
      setComment('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      {/* 접이식 헤더 - 클릭하여 펼치기/접기 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
      >
        <span className="font-semibold text-sm flex items-center gap-2 text-red-700">
          <span>⚠️</span>
          인식 실패 이미지 ({images.length}개)
        </span>
        <span className="text-red-600 text-sm">
          {isExpanded ? '▲ 접기' : '▼ 펼치기'}
        </span>
      </button>

      {/* 펼쳐진 상태에서만 이미지 그리드 표시 */}
      {isExpanded && (
        <div className="grid grid-cols-4 gap-2 mt-3 max-h-[200px] overflow-y-auto">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square cursor-pointer group"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.url}
                alt="Failed image"
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">수동 입력</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>장소 수동 입력</DialogTitle>
          </DialogHeader>

          {selectedImage && (
            <div className="space-y-4">
              <div className="aspect-video w-full">
                <img
                  src={selectedImage.url}
                  alt="Selected"
                  className="w-full h-full object-contain rounded-lg bg-gray-100"
                />
              </div>

              {selectedImage.rawText && (
                <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                  <strong>추출된 텍스트:</strong> {selectedImage.rawText}
                </div>
              )}

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="place-name">장소 이름</Label>
                  <Input
                    id="place-name"
                    placeholder="예: 이치란 라멘 시부야점"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="place-category">카테고리</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as PlaceCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
                        <SelectItem key={key} value={key}>
                          {style.icon} {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="place-comment">메모 (선택)</Label>
                  <Input
                    id="place-comment"
                    placeholder="예: 24시간 운영"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedImage(null)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
              {loading ? '추가 중...' : '장소 추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
