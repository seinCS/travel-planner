'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

const MAX_LENGTH = 2000

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = '메시지를 입력하세요...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const isOverLimit = message.length > MAX_LENGTH
  const canSend = message.trim().length > 0 && !disabled && !isOverLimit

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t bg-white p-3"
    >
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border bg-gray-50',
              'px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isOverLimit && 'border-red-500 focus:ring-red-200'
            )}
            style={{ maxHeight: '120px' }}
            data-testid="chat-input"
          />
          {/* Character count */}
          {message.length > MAX_LENGTH * 0.8 && (
            <span
              className={cn(
                'absolute bottom-1 right-2 text-xs',
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {message.length}/{MAX_LENGTH}
            </span>
          )}
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          className="h-10 w-10 shrink-0"
          aria-label="전송"
          data-testid="chat-send-button"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
