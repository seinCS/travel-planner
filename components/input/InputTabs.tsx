'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { TextInputForm } from './TextInputForm'
import { UrlInputForm } from './UrlInputForm'

type TabType = 'image' | 'text' | 'url'

interface InputTabsProps {
  projectId: string
  onImageUploadComplete: (uploadedCount: number, failedCount: number) => void
  onTextInputComplete: () => void
  disabled?: boolean
}

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'image', label: '이미지', icon: '📸' },
  { id: 'text', label: '텍스트', icon: '📝' },
  { id: 'url', label: 'URL', icon: '🔗' },
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
    <div className="space-y-3">
      {/* 탭 헤더 */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={`
              rounded-none border-b-2 px-3 py-2
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </Button>
        ))}
      </div>

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
