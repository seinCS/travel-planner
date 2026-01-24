'use client'

import { useState, useEffect } from 'react'
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
import { Place } from '@/types'
import { CATEGORY_STYLES, PlaceCategory } from '@/lib/constants'
import { placesApi } from '@/infrastructure/api-client/places.api'
import { ApiError } from '@/infrastructure/api-client'

interface PlaceEditModalProps {
  place: Place | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (place: Place) => void
}

export function PlaceEditModal({
  place,
  open,
  onOpenChange,
  onSave,
}: PlaceEditModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PlaceCategory>('other')
  const [comment, setComment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [relocating, setRelocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRelocate, setShowRelocate] = useState(false)

  // place가 변경되거나 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (open && place) {
      setName(place.name)
      setCategory(place.category)
      setComment(place.comment || '')
      setSearchQuery('')
      setError(null)
      setShowRelocate(false)
    }
  }, [open, place])

  const handleSave = async () => {
    if (!place) return

    setSaving(true)
    setError(null)

    try {
      const updated = await placesApi.update(place.id, {
        name,
        category,
        comment: comment || undefined,
      })
      onSave(updated)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '저장에 실패했습니다.')
      } else {
        setError('저장 중 오류가 발생했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRelocate = async () => {
    if (!place || !searchQuery.trim()) return

    setRelocating(true)
    setError(null)

    try {
      const updated = await placesApi.relocate(place.id, searchQuery)
      onSave(updated)
      setShowRelocate(false)
      setSearchQuery('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '위치 검색에 실패했습니다.')
      } else {
        setError('위치 검색 중 오류가 발생했습니다.')
      }
    } finally {
      setRelocating(false)
    }
  }

  if (!place) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>장소 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 장소명 */}
          <div className="space-y-2">
            <Label htmlFor="name">장소명</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="장소 이름"
            />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label htmlFor="category">카테고리</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as PlaceCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
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

          {/* 코멘트 */}
          <div className="space-y-2">
            <Label htmlFor="comment">코멘트</Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="메모 또는 추천 정보"
            />
          </div>

          {/* 현재 주소 */}
          {place.formattedAddress && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">현재 위치:</span> {place.formattedAddress}
            </div>
          )}

          {/* 위치 재검색 섹션 */}
          {!showRelocate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowRelocate(true)}
            >
              위치가 잘못되었나요? 재검색하기
            </Button>
          ) : (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <Label htmlFor="searchQuery">새 위치 검색</Label>
              <div className="flex gap-2">
                <Input
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="예: 스타벅스 센트럴점"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRelocate}
                  disabled={relocating || !searchQuery.trim()}
                >
                  {relocating ? '검색 중...' : '검색'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                장소명, 주소, 또는 가까운 랜드마크를 입력하세요
              </p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
