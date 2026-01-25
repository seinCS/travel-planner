'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface TextInputFormProps {
  projectId: string
  onSubmitComplete: (success: boolean, error?: string) => void
  disabled?: boolean
}

const MIN_TEXT_LENGTH = 10
const MAX_TEXT_LENGTH = 5000

export function TextInputForm({ projectId, onSubmitComplete, disabled }: TextInputFormProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const charCount = text.length
  const isValid = charCount >= MIN_TEXT_LENGTH && charCount <= MAX_TEXT_LENGTH

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/text-inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content: text,
        }),
      })

      if (res.ok) {
        setText('')
        onSubmitComplete(true)
      } else {
        const data = await res.json()
        onSubmitComplete(false, data.error || '텍스트 입력에 실패했습니다.')
      }
    } catch (error) {
      console.error('Text input failed:', error)
      onSubmitComplete(false, '텍스트 입력에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [projectId, text, isValid, submitting, onSubmitComplete])

  return (
    <div className="space-y-3" data-testid="text-input-form">
      <div className="space-y-2">
        <Label htmlFor="text-input">텍스트 입력</Label>
        <textarea
          id="text-input"
          className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="여행 장소가 포함된 텍스트를 붙여넣으세요. (블로그 글, SNS 포스트 등)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || submitting}
          maxLength={MAX_TEXT_LENGTH}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs ${charCount < MIN_TEXT_LENGTH ? 'text-muted-foreground' : charCount > MAX_TEXT_LENGTH ? 'text-red-500' : 'text-green-600'}`}>
          {charCount} / {MAX_TEXT_LENGTH}자 (최소 {MIN_TEXT_LENGTH}자)
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting || disabled}
          size="sm"
        >
          {submitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  )
}
