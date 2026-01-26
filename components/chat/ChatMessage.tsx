'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { PlaceCard } from './PlaceCard'
import type { ChatMessage as ChatMessageType } from '@/hooks/queries/useChatHistory'
import { cn, cleanChatResponse } from '@/lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
  projectId: string
}

export function ChatMessage({ message, projectId }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // Clean and sanitize content
  const sanitizedContent = useMemo(() => {
    // For assistant messages, clean JSON artifacts first
    const cleanedContent = isUser ? message.content : cleanChatResponse(message.content)
    // Then sanitize HTML to prevent XSS
    return DOMPurify.sanitize(cleanedContent, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    })
  }, [message.content, isUser])

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2',
          isUser ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
        )}
      >
        {/* Message Content */}
        <div
          className="prose prose-sm max-w-none whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Place Cards (only for assistant messages) */}
        {!isUser && message.places && message.places.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.places.map((place) => (
              <PlaceCard
                key={`${message.id}-${place.name}-${place.category}`}
                place={place}
                projectId={projectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
