'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ProjectCardProps {
  id: string
  name: string
  destination: string
  country?: string | null
  placesCount: number
  imagesCount: number
  updatedAt: string
  onDelete: (id: string) => void
}

export function ProjectCard({
  id,
  name,
  destination,
  country,
  placesCount,
  imagesCount,
  updatedAt,
  onDelete,
}: ProjectCardProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Link href={`/projects/${id}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {destination}{country && `, ${country}`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground mb-2">
            <span>📍 {placesCount}개 장소</span>
            <span>🖼️ {imagesCount}개 이미지</span>
          </div>
          <p className="text-xs text-muted-foreground">
            마지막 수정: {formattedDate}
          </p>
        </CardContent>
      </Link>
      <div className="px-6 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
      </div>
    </Card>
  )
}
