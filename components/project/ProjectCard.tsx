'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ImageIcon } from '@/lib/icons'

interface ProjectCardProps {
  id: string
  name: string
  destination: string
  country?: string | null
  placesCount: number
  imagesCount: number
  updatedAt: string
  role?: 'owner' | 'member'
  ownerName?: string | null
  ownerImage?: string | null
  onDelete?: (id: string) => void
  onLeave?: (id: string) => void
}

// rerender-memo 패턴: 프로젝트 목록 렌더링 최적화
export const ProjectCard = memo(function ProjectCard({
  id,
  name,
  destination,
  country,
  placesCount,
  imagesCount,
  updatedAt,
  role = 'owner',
  ownerName,
  ownerImage,
  onDelete,
  onLeave,
}: ProjectCardProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const isOwner = role === 'owner'

  return (
    <Card className="hover-lift group">
      <Link href={`/projects/${id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-gray-800 group-hover:text-gray-900 transition-colors">{name}</CardTitle>
            {!isOwner && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                참여중
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {destination}{country && `, ${country}`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {placesCount}개 장소
            </span>
            <span className="flex items-center gap-1">
              <ImageIcon className="w-4 h-4" /> {imagesCount}개 이미지
            </span>
          </div>
          {!isOwner && ownerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              {ownerImage && (
                <img
                  src={ownerImage}
                  alt={ownerName}
                  className="w-4 h-4 rounded-full"
                />
              )}
              <span>주최: {ownerName}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            마지막 수정: {formattedDate}
          </p>
        </CardContent>
      </Link>
      <div className="px-6 pb-4">
        {isOwner ? (
          onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50/80 rounded-xl transition-all"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (confirm('정말 삭제하시겠습니까?')) {
                  onDelete(id)
                }
              }}
            >
              삭제
            </Button>
          )
        ) : (
          onLeave && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-50/80 rounded-xl transition-all"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (confirm('프로젝트에서 나가시겠습니까?')) {
                  onLeave(id)
                }
              }}
            >
              나가기
            </Button>
          )
        )}
      </div>
    </Card>
  )
})
