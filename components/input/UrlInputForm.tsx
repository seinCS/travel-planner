'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isGoogleMapsUrl } from '@/lib/google-maps-parser'
import { placesApi, type PlacePreviewData } from '@/infrastructure/api-client/places.api'
import { GoogleMapsPreview } from './GoogleMapsPreview'
import type { PlaceCategory } from '@/lib/constants'

interface UrlInputFormProps {
  projectId: string
  onSubmitComplete: (success: boolean, error?: string) => void
  disabled?: boolean
}

type UrlType = 'none' | 'google-maps' | 'other'

export function UrlInputForm({ projectId, onSubmitComplete, disabled }: UrlInputFormProps) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<PlacePreviewData | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

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

  // Detect URL type
  const urlType: UrlType = useMemo(() => {
    if (!isValid) return 'none'
    if (isGoogleMapsUrl(url)) return 'google-maps'
    return 'other'
  }, [url, isValid])

  // Fetch preview when Google Maps URL is detected
  useEffect(() => {
    if (urlType !== 'google-maps') {
      setPreview(null)
      setPreviewError(null)
      return
    }

    const fetchPreview = async () => {
      setLoadingPreview(true)
      setPreviewError(null)
      setPreview(null)

      try {
        const response = await placesApi.previewFromUrl(projectId, url)
        setPreview(response.preview)
      } catch (error) {
        console.error('Failed to fetch preview:', error)
        setPreviewError(
          error instanceof Error ? error.message : '장소 정보를 가져오는데 실패했습니다.'
        )
      } finally {
        setLoadingPreview(false)
      }
    }

    // Debounce the preview fetch
    const timer = setTimeout(fetchPreview, 500)
    return () => clearTimeout(timer)
  }, [url, urlType, projectId])

  // Handle Google Maps URL submission
  const handleGoogleMapsConfirm = useCallback(
    async (data: { category: PlaceCategory; comment?: string }) => {
      try {
        await placesApi.createFromUrl(projectId, {
          url,
          category: data.category,
          comment: data.comment,
        })
        setUrl('')
        setPreview(null)
        onSubmitComplete(true)
      } catch (error) {
        console.error('Failed to create place from URL:', error)
        const message =
          error instanceof Error ? error.message : '장소 추가에 실패했습니다.'
        onSubmitComplete(false, message)
      }
    },
    [projectId, url, onSubmitComplete]
  )

  const handleCancelPreview = useCallback(() => {
    setUrl('')
    setPreview(null)
    setPreviewError(null)
  }, [])

  // Handle regular URL submission (blog, etc.)
  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return

    // Don't use regular submission for Google Maps URLs
    if (urlType === 'google-maps') return

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
  }, [projectId, url, isValid, submitting, urlType, onSubmitComplete])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !submitting && !disabled && urlType !== 'google-maps') {
      handleSubmit()
    }
  }

  // Google Maps icon for visual feedback
  const GoogleMapsIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 92.3 132.3"
      className="h-4 w-4"
    >
      <path
        fill="#1a73e8"
        d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"
      />
      <path
        fill="#ea4335"
        d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"
      />
      <path
        fill="#4285f4"
        d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"
      />
      <path
        fill="#fbbc04"
        d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"
      />
      <path
        fill="#34a853"
        d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"
      />
    </svg>
  )

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="url-input">URL 입력</Label>
        <div className="relative">
          <Input
            id="url-input"
            type="url"
            placeholder="https://blog.naver.com/... 또는 Google Maps 링크"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || submitting || loadingPreview}
            className={urlType === 'google-maps' ? 'pr-10' : ''}
          />
          {urlType === 'google-maps' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <GoogleMapsIcon />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {urlType === 'google-maps' ? (
            <span className="flex items-center gap-1">
              <GoogleMapsIcon />
              <span>Google Maps 링크가 감지되었습니다. 장소가 자동으로 추출됩니다.</span>
            </span>
          ) : (
            '블로그, 인스타그램, 유튜브 또는 Google Maps URL을 입력하세요.'
          )}
        </p>
      </div>

      {/* Google Maps Preview */}
      {urlType === 'google-maps' && (
        <div className="mt-4">
          {loadingPreview && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <svg
                className="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>장소 정보를 가져오는 중...</span>
            </div>
          )}

          {previewError && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {previewError}
            </div>
          )}

          {preview && !loadingPreview && (
            <GoogleMapsPreview
              preview={preview}
              onConfirm={handleGoogleMapsConfirm}
              onCancel={handleCancelPreview}
            />
          )}
        </div>
      )}

      {/* Regular URL submit button (hidden for Google Maps) */}
      {urlType !== 'google-maps' && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting || disabled}
            size="sm"
          >
            {submitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      )}
    </div>
  )
}
