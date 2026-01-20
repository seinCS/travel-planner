'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UrlInputFormProps {
  projectId: string
  onSubmitComplete: (success: boolean, error?: string) => void
  disabled?: boolean
}

export function UrlInputForm({ projectId, onSubmitComplete, disabled }: UrlInputFormProps) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isValidUrl = useCallback((urlString: string): boolean => {
    if (!urlString) return false
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }, [])

  const isValid = isValidUrl(url)

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/text-inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          content: url,
        }),
      })

      if (res.ok) {
        setUrl('')
        onSubmitComplete(true)
      } else {
        const data = await res.json()
        onSubmitComplete(false, data.error || 'URL 입력에 실패했습니다.')
      }
    } catch (error) {
      console.error('URL input failed:', error)
      onSubmitComplete(false, 'URL 입력에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [projectId, url, isValid, submitting, onSubmitComplete])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !submitting && !disabled) {
      handleSubmit()
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="url-input">URL 입력</Label>
        <Input
          id="url-input"
          type="url"
          placeholder="https://blog.naver.com/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || submitting}
        />
        <p className="text-xs text-muted-foreground">
          블로그, 인스타그램, 유튜브 등의 URL을 입력하세요.
        </p>
      </div>

      <div className="flex justify-end">
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
