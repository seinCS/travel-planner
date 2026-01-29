'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PlaceCard } from './PlaceCard'
import type { ChatMessage as ChatMessageType } from '@/hooks/queries/useChatHistory'
import { cn, cleanChatResponse } from '@/lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
  projectId: string
}

export function ChatMessage({ message, projectId }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // Clean content for assistant messages (remove :place blocks, etc.)
  const cleanedContent = useMemo(() => {
    return isUser ? message.content : cleanChatResponse(message.content)
  }, [message.content, isUser])

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2',
          isUser ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
        )}
      >
        {/* Message Content with Markdown rendering */}
        <div className={cn(
          'prose prose-sm max-w-none',
          isUser && 'prose-invert'
        )}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for markdown elements
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'underline hover:no-underline',
                    isUser ? 'text-white/90' : 'text-primary'
                  )}
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className={cn(
                  'px-1 py-0.5 rounded text-xs font-mono',
                  isUser ? 'bg-white/20' : 'bg-gray-200'
                )}>
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <blockquote className={cn(
                  'border-l-2 pl-3 italic my-2',
                  isUser ? 'border-white/50' : 'border-gray-300'
                )}>
                  {children}
                </blockquote>
              ),
            }}
          >
            {cleanedContent}
          </ReactMarkdown>
        </div>

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
