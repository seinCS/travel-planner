'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatWindow } from './ChatWindow'
import { useChatUsage } from '@/hooks/queries/useChatUsage'
import { cn } from '@/lib/utils'

interface FloatingButtonProps {
  projectId: string
}

export function FloatingButton({ projectId }: FloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { enabled, isLoading } = useChatUsage()

  // Don't render if chatbot is not enabled
  if (isLoading || !enabled) {
    return null
  }

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'h-14 w-14 rounded-full shadow-lg',
          'bg-primary hover:bg-primary/90',
          'transition-all duration-200',
          isOpen && 'rotate-90'
        )}
        aria-label={isOpen ? '챗봇 닫기' : '여행 어시스턴트'}
        data-testid="chat-floating-button"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <ChatWindow
          projectId={projectId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
