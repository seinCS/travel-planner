'use client'

import { ChatMessage } from './ChatMessage'
import { StreamingMessage } from './StreamingMessage'
import { SuggestedQuestions } from './SuggestedQuestions'
import type { ChatMessage as ChatMessageType } from '@/hooks/queries/useChatHistory'
import type { RecommendedPlace } from '@/domain/interfaces/ILLMService'

interface MessageListProps {
  messages: ChatMessageType[]
  streamingContent: string
  streamingPlaces: RecommendedPlace[]
  isStreaming: boolean
  projectId: string
  onSendMessage?: (message: string) => void
}

export function MessageList({
  messages,
  streamingContent,
  streamingPlaces,
  isStreaming,
  projectId,
  onSendMessage,
}: MessageListProps) {
  // Show suggested questions if no messages yet
  if (messages.length === 0 && !isStreaming) {
    return <SuggestedQuestions onSelect={onSendMessage} />
  }

  return (
    <div className="space-y-4">
      {/* Existing Messages */}
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          projectId={projectId}
        />
      ))}

      {/* Streaming Message */}
      {isStreaming && (
        <StreamingMessage
          content={streamingContent}
          places={streamingPlaces}
          projectId={projectId}
        />
      )}
    </div>
  )
}
