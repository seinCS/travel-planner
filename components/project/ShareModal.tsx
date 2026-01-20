'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ShareModalProps {
  projectId: string
  projectName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShareStatus {
  shareEnabled: boolean
  shareToken: string | null
  shareUrl: string | null
}

export function ShareModal({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ShareModalProps) {
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [shareStatus, setShareStatus] = useState<ShareStatus | null>(null)
  const [copied, setCopied] = useState(false)

  // 모달 열릴 때 공유 상태 조회
  useEffect(() => {
    if (open) {
      fetchShareStatus()
    }
  }, [open, projectId])

  const fetchShareStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/share`)
      if (res.ok) {
        const data = await res.json()
        setShareStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch share status:', error)
      toast.error('공유 상태를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    setToggling(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      const data = await res.json()

      if (res.ok) {
        setShareStatus(data)
        toast.success(enabled ? '공유가 활성화되었습니다.' : '공유가 비활성화되었습니다.')
      } else {
        console.error('Toggle failed:', res.status, data)
        toast.error(data.error || '공유 상태 변경에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to toggle share:', error)
      toast.error('공유 상태 변경에 실패했습니다.')
    } finally {
      setToggling(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareStatus?.shareUrl) return

    try {
      await navigator.clipboard.writeText(shareStatus.shareUrl)
      setCopied(true)
      toast.success('링크가 복사되었습니다.')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('링크 복사에 실패했습니다.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>프로젝트 공유</DialogTitle>
          <DialogDescription>
            &quot;{projectName}&quot; 프로젝트를 다른 사람과 공유하세요.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            로딩 중...
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 공유 토글 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-toggle" className="text-base">
                  공유 링크 활성화
                </Label>
                <p className="text-sm text-muted-foreground">
                  {shareStatus?.shareEnabled
                    ? '링크를 아는 누구나 볼 수 있습니다.'
                    : '공유가 비활성화되어 있습니다.'}
                </p>
              </div>
              <Switch
                id="share-toggle"
                checked={shareStatus?.shareEnabled || false}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
            </div>

            {/* 공유 URL */}
            {shareStatus?.shareEnabled && shareStatus?.shareUrl && (
              <div className="space-y-2">
                <Label>공유 링크</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareStatus.shareUrl}
                    readOnly
                    className="flex-1 text-sm bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-green-600"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* 경고 메시지 */}
            {shareStatus?.shareEnabled && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-600 shrink-0 mt-0.5"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
                <p className="text-sm text-amber-800">
                  이 링크를 아는 사람은 누구나 프로젝트의 장소 목록과 지도를 볼 수 있습니다.
                  공유를 중단하려면 토글을 끄세요.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
