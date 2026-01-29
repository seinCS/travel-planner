'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from '@/components/icons'
import { ExportModal } from './ExportModal'
import type { ItineraryDay } from '@/infrastructure/api-client/itinerary.api'

interface ExportButtonProps {
  projectId: string
  projectName: string
  days?: ItineraryDay[]
  variant?: 'default' | 'outline' | 'ghost' | 'glass'
  size?: 'default' | 'sm' | 'icon' | 'icon-sm'
  className?: string
}

export function ExportButton({
  projectId,
  projectName,
  days,
  variant = 'outline',
  size = 'sm',
  className,
}: ExportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
        title="KML 내보내기"
      >
        <Download className="w-4 h-4" />
        {size !== 'icon' && size !== 'icon-sm' && (
          <span className="hidden sm:inline">내보내기</span>
        )}
      </Button>

      <ExportModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        projectId={projectId}
        projectName={projectName}
        days={days}
      />
    </>
  )
}
