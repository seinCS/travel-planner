'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CATEGORY_STYLES, type PlaceCategory } from '@/lib/constants'
import { Star } from '@/components/icons'

interface PlacePreviewData {
  name: string
  category: PlaceCategory
  latitude: number
  longitude: number
  formattedAddress: string | null
  googlePlaceId: string | null
  googleMapsUrl: string | null
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
}

interface GoogleMapsPreviewProps {
  preview: PlacePreviewData
  isLoading?: boolean
  onConfirm: (data: { category: PlaceCategory; comment?: string }) => Promise<void>
  onCancel: () => void
}

export function GoogleMapsPreview({
  preview,
  isLoading = false,
  onConfirm,
  onCancel,
}: GoogleMapsPreviewProps) {
  const [category, setCategory] = useState<PlaceCategory>(preview.category || 'other')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onConfirm({ category, comment: comment || undefined })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    const stars = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
      )
    }
    if (hasHalf) {
      stars.push(
        <Star key="half" className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
      )
    }
    const remaining = 5 - Math.ceil(rating)
    for (let i = 0; i < remaining; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-gray-300" />
      )
    }

    return stars
  }

  const renderPriceLevel = (level: number) => {
    return '₩'.repeat(level + 1)
  }

  return (
    <Card className="animate-in fade-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-red-600"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{preview.name}</CardTitle>
            {preview.formattedAddress && (
              <CardDescription className="text-xs mt-0.5 line-clamp-1">
                {preview.formattedAddress}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rating and Price Level */}
        {(preview.rating || preview.priceLevel !== null) && (
          <div className="flex items-center gap-4 text-sm">
            {preview.rating && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{preview.rating.toFixed(1)}</span>
                <div className="flex">{renderStars(preview.rating)}</div>
                {preview.userRatingsTotal && (
                  <span className="text-muted-foreground">
                    ({preview.userRatingsTotal.toLocaleString()})
                  </span>
                )}
              </div>
            )}
            {preview.priceLevel !== null && (
              <div className="text-muted-foreground">
                {renderPriceLevel(preview.priceLevel)}
              </div>
            )}
          </div>
        )}

        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category-select">카테고리</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as PlaceCategory)}>
            <SelectTrigger id="category-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <style.Icon className="w-3.5 h-3.5" />
                    <span>{style.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment-input">메모 (선택)</Label>
          <Input
            id="comment-input"
            placeholder="이 장소에 대한 메모를 입력하세요"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting || isLoading}
          />
        </div>

        {/* Coordinates Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
          <div className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span>
              {preview.latitude.toFixed(6)}, {preview.longitude.toFixed(6)}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting || isLoading}
          className="flex-1"
        >
          취소
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={submitting || isLoading}
          className="flex-1"
        >
          {submitting ? '추가 중...' : '장소 추가'}
        </Button>
      </CardFooter>
    </Card>
  )
}
