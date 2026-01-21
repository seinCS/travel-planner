'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { CATEGORY_STYLES } from '@/lib/constants'
import { getPhotoUrl } from '@/lib/google-maps'

interface PlaceDetailsPanelProps {
  placeId: string
  onClose: () => void
  shareToken?: string // 공유 페이지에서 사용 시 토큰 전달
}

interface PlaceDetailsResponse {
  hasGoogleData: boolean
  place: {
    id: string
    name: string
    category: string
    comment: string | null
    latitude: number
    longitude: number
    formattedAddress?: string | null
    formattedPhoneNumber?: string | null
    website?: string | null
    openingHours?: {
      openNow: boolean
      weekdayText: string[]
    } | null
    rating?: number | null
    userRatingsTotal?: number | null
    priceLevel?: number | null
    reviews?: Array<{
      authorName: string
      rating: number
      text: string
      relativeTimeDescription: string
    }>
    photos?: Array<{
      photoReference: string
      width: number
      height: number
    }>
    googleMapsUrl?: string | null
  }
}

// SWR fetcher 함수
const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : null)

export function PlaceDetailsPanel({ placeId, onClose, shareToken }: PlaceDetailsPanelProps) {
  const [showAllHours, setShowAllHours] = useState(false)

  // API URL: 공유 모드면 공유 API, 아니면 일반 API 사용
  const apiUrl = placeId
    ? shareToken
      ? `/api/share/${shareToken}/places/${placeId}/details`
      : `/api/places/${placeId}/details`
    : null

  // SWR로 데이터 페칭 - 자동 캐싱 및 중복 요청 제거 (client-swr-dedup 패턴)
  const { data: details, isLoading: loading } = useSWR<PlaceDetailsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false, // 포커스 시 재검증 비활성화
      dedupingInterval: 60000, // 1분 동안 중복 요청 방지
    }
  )

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">
            ×
          </button>
        </div>
        <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">정보를 불러올 수 없습니다</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">
            ×
          </button>
        </div>
      </div>
    )
  }

  const p = details.place
  const categoryStyle = CATEGORY_STYLES[p.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{p.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {p.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium">{p.rating.toFixed(1)}</span>
                  {p.userRatingsTotal && (
                    <span className="text-sm text-muted-foreground">
                      ({p.userRatingsTotal.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
              {p.priceLevel !== null && p.priceLevel !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {'₩'.repeat(p.priceLevel + 1)}
                </span>
              )}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: categoryStyle.color + '20', color: categoryStyle.color }}
              >
                {categoryStyle.icon} {categoryStyle.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl ml-2 flex-shrink-0"
          >
            ×
          </button>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* 사진 */}
        {p.photos && p.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {p.photos.map((photo, idx) => (
              <img
                key={idx}
                src={getPhotoUrl(photo.photoReference, 200)}
                alt={`${p.name} 사진 ${idx + 1}`}
                className="h-28 w-36 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        )}

        {/* 영업 상태 */}
        {p.openingHours && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={p.openingHours.openNow ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {p.openingHours.openNow ? '● 영업 중' : '● 영업 종료'}
              </span>
            </div>
            {p.openingHours.weekdayText.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAllHours(!showAllHours)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <span>{showAllHours ? '▼' : '▶'}</span>
                  <span>영업시간 {showAllHours ? '접기' : '보기'}</span>
                </button>
                {showAllHours && (
                  <ul className="mt-2 space-y-1 pl-4 text-sm">
                    {p.openingHours.weekdayText.map((text, idx) => (
                      <li key={idx} className="text-muted-foreground">{text}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* 주소 */}
        {p.formattedAddress && (
          <div className="text-sm flex items-start gap-2">
            <span className="text-muted-foreground flex-shrink-0">📍</span>
            <span>{p.formattedAddress}</span>
          </div>
        )}

        {/* 전화번호 */}
        {p.formattedPhoneNumber && (
          <div className="text-sm flex items-center gap-2">
            <span className="text-muted-foreground">📞</span>
            <a href={`tel:${p.formattedPhoneNumber}`} className="text-blue-600 hover:underline">
              {p.formattedPhoneNumber}
            </a>
          </div>
        )}

        {/* 웹사이트 */}
        {p.website && (
          <div className="text-sm flex items-center gap-2">
            <span className="text-muted-foreground">🌐</span>
            <a
              href={p.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              웹사이트
            </a>
          </div>
        )}

        {/* AI 추출 코멘트 */}
        {p.comment && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-1">💡 팁</p>
            <p className="text-sm text-blue-700">{p.comment}</p>
          </div>
        )}

        {/* 리뷰 */}
        {p.reviews && p.reviews.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">리뷰</h3>
            {p.reviews.map((review, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{review.authorName}</span>
                  <span className="text-yellow-500 text-sm">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {review.relativeTimeDescription}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{review.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Google 데이터 없는 경우 */}
        {!details.hasGoogleData && (
          <div className="text-sm text-muted-foreground text-center py-4 bg-gray-50 rounded-lg">
            구글 장소 상세 정보를 사용할 수 없습니다.
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      {p.googleMapsUrl && (
        <div className="p-4 border-t flex-shrink-0">
          <Button asChild className="w-full">
            <a href={p.googleMapsUrl} target="_blank" rel="noopener noreferrer">
              구글 지도에서 보기 ↗
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
