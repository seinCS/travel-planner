'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { TextInputForm } from './TextInputForm'
import { UrlInputForm } from './UrlInputForm'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Image, FileText, Link, type LucideIcon } from '@/lib/icons'

type TabType = 'image' | 'text' | 'url'

interface InputTabsProps {
  projectId: string
  onImageUploadComplete: (uploadedCount: number, failedCount: number) => void
  onTextInputComplete: () => void
  disabled?: boolean
}

const tabs: { id: TabType; label: string; Icon: LucideIcon }[] = [
  { id: 'image', label: '이미지', Icon: Image },
  { id: 'text', label: '텍스트', Icon: FileText },
  { id: 'url', label: 'URL', Icon: Link },
]

export function InputTabs({
  projectId,
  onImageUploadComplete,
  onTextInputComplete,
  disabled,
}: InputTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('image')

  const handleTextSubmitComplete = (success: boolean) => {
    if (success) {
      onTextInputComplete()
    }
  }

  const handleUrlSubmitComplete = (success: boolean) => {
    if (success) {
      onTextInputComplete()
    }
  }

  return (
    <div className="space-y-3" data-testid="input-tabs">
      {/* 탭 헤더 - Mobile: icons only with tooltips, Desktop: full labels */}
      <TooltipProvider>
        <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const IconComponent = tab.Icon
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={`input-tab-${tab.id}`}
                    className={`
                      flex-shrink-0 rounded-none border-b-2 px-3 py-2 min-h-[44px] gap-1.5
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>

      {/* 탭 컨텐츠 */}
      <div>
        {activeTab === 'image' && (
          <ImageUploader
            projectId={projectId}
            onUploadComplete={onImageUploadComplete}
            disabled={disabled}
          />
        )}
        {activeTab === 'text' && (
          <TextInputForm
            projectId={projectId}
            onSubmitComplete={handleTextSubmitComplete}
            disabled={disabled}
          />
        )}
        {activeTab === 'url' && (
          <UrlInputForm
            projectId={projectId}
            onSubmitComplete={handleUrlSubmitComplete}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}
