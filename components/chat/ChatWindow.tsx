'use client'

import { useCallback, useEffect, useRef } from 'react'
import { X, RotateCcw, RefreshCw } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useChatHistory } from '@/hooks/queries/useChatHistory'
import { useChatStream } from '@/hooks/mutations/useChatStream'
import { useChatUsage } from '@/hooks/queries/useChatUsage'
import { useApplyItinerary } from '@/hooks/mutations/useApplyItinerary'
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
    streamingItineraryPreview,
    error,
    lastFailedMessage,
  } = useChatStream(projectId)
  const { usage } = useChatUsage()
  const { applyItinerary, isApplying } = useApplyItinerary(projectId)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile('md')

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Escape key handling for closing chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleSend = async (message: string) => {
    await sendMessage(message)
  }

  const handleClear = async () => {
    if (confirm('대화 내용을 모두 삭제하시겠습니까?')) {
      await clearHistory()
    }
  }

  const handleApplyItinerary = useCallback(async () => {
    if (!streamingItineraryPreview) return

    const result = await applyItinerary(streamingItineraryPreview)

    if (result.success) {
      // Success feedback via next message context
      if (result.skippedPlaces && result.skippedPlaces.length > 0) {
        alert(`일정이 적용되었습니다.\n미등록 장소 ${result.skippedPlaces.length}개는 건너뛰었습니다.`)
      } else {
        alert('일정이 적용되었습니다.')
      }
    } else if (result.error === 'ITINERARY_EXISTS') {
      const overwrite = confirm('이미 일정이 존재합니다. 덮어쓰시겠습니까?')
      if (overwrite) {
        const retryResult = await applyItinerary(streamingItineraryPreview, true)
        if (retryResult.success) {
          alert('일정이 적용되었습니다.')
        } else {
          alert(retryResult.error || '일정 적용에 실패했습니다.')
        }
      }
    } else {
      alert(result.error || '일정 적용에 실패했습니다.')
    }
  }, [streamingItineraryPreview, applyItinerary])

  const handleRegenerateItinerary = useCallback(() => {
    sendMessage('일정을 다시 만들어줘')
  }, [sendMessage])

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
            streamingItineraryPreview={streamingItineraryPreview}
            isStreaming={isStreaming}
            projectId={projectId}
            onSendMessage={handleSend}
            onApplyItinerary={handleApplyItinerary}
            onRegenerateItinerary={handleRegenerateItinerary}
            isApplyingItinerary={isApplying}
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
