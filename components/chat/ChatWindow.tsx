'use client'

import { useEffect, useRef } from 'react'
import { X, RotateCcw, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatHistory } from '@/hooks/queries/useChatHistory'
import { useChatStream } from '@/hooks/mutations/useChatStream'
import { useChatUsage } from '@/hooks/queries/useChatUsage'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface ChatWindowProps {
  projectId: string
  onClose: () => void
}

export function ChatWindow({ projectId, onClose }: ChatWindowProps) {
  const { messages, isLoading, clearHistory } = useChatHistory(projectId)
  const {
    sendMessage,
    retry,
    isStreaming,
    streamingContent,
    streamingPlaces,
    error,
    lastFailedMessage,
  } = useChatStream(projectId)
  const { usage } = useChatUsage()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile('md')

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Mobile back button handling using Escape key instead of history manipulation
  // This avoids conflicts with app navigation and provides consistent behavior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // For mobile, handle Android back button via beforeunload as fallback
    // Note: Modern approach is to use popstate carefully or avoid it
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent if chat is open and there's unsaved content
      // For now, we just close the chat
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Mobile-specific: Close on outside tap (touch devices)
  useEffect(() => {
    if (!isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      const chatWindow = document.querySelector('[data-testid="chat-window"]')
      if (chatWindow && !chatWindow.contains(e.target as Node)) {
        // Don't close on touch outside for mobile - they might be scrolling
        // Only the X button and Escape key should close
      }
    }

    return () => {
      // Cleanup if needed
    }
  }, [isMobile, onClose])

  const handleSend = async (message: string) => {
    await sendMessage(message)
  }

  const handleClear = async () => {
    if (confirm('대화 내용을 모두 삭제하시겠습니까?')) {
      await clearHistory()
    }
  }

  return (
    <div
      className={cn(
        'fixed bg-white flex flex-col z-50 border',
        isMobile
          ? 'inset-0 rounded-none pb-[env(safe-area-inset-bottom)]'
          : 'bottom-24 right-6 w-[400px] h-[600px] rounded-lg shadow-2xl'
      )}
      data-testid="chat-window"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="font-semibold">여행 어시스턴트</h2>
        <div className="flex items-center gap-2">
          {usage && (
            <span className="text-xs text-gray-500">
              {usage.remaining}/{usage.limit}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            aria-label="새 대화 시작"
            disabled={isStreaming}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">대화 불러오는 중...</span>
          </div>
        ) : (
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            streamingPlaces={streamingPlaces}
            isStreaming={isStreaming}
            projectId={projectId}
            onSendMessage={handleSend}
          />
        )}

        {/* Error and Retry */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            {lastFailedMessage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={retry}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                재시도
              </Button>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
        />
      </div>
    </div>
  )
}
