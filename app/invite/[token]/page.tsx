'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface InviteInfo {
  projectName: string
  projectDestination: string
  inviterName: string | null
  isValid: boolean
}

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const token = params?.token as string

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  // Fetch invite info
  useEffect(() => {
    async function fetchInvite() {
      if (!token) return

      try {
        const res = await fetch(`/api/invites/${token}`)
        if (res.ok) {
          const data = await res.json()
          setInviteInfo(data.invite)
        } else {
          const data = await res.json()
          setError(data.error || '초대 링크를 찾을 수 없습니다.')
        }
      } catch (err) {
        console.error('Failed to fetch invite:', err)
        setError('초대 정보를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  // Handle accepting invite
  const handleAccept = useCallback(async () => {
    if (!token) return

    setAccepting(true)
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('프로젝트에 참여했습니다!')
        router.push(`/projects/${data.projectId}`)
      } else {
        const data = await res.json()
        if (res.status === 409) {
          // Already a member
          toast.info('이미 멤버입니다.')
          router.push(`/projects/${data.projectId}`)
        } else {
          toast.error(data.error || '참여에 실패했습니다.')
        }
      }
    } catch (err) {
      console.error('Failed to accept invite:', err)
      toast.error('참여에 실패했습니다.')
    } finally {
      setAccepting(false)
    }
  }, [token, router])

  // Handle login redirect
  const handleLogin = useCallback(() => {
    // Store the current URL to redirect back after login
    signIn('google', { callbackUrl: `/invite/${token}` })
  }, [token])

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            초대 링크 오류
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push('/projects')}>
            내 프로젝트로 이동
          </Button>
        </div>
      </div>
    )
  }

  // Valid invite
  if (!inviteInfo) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">프로젝트 초대</h1>
        </div>

        {/* Invite details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {inviteInfo.inviterName || '누군가'}님이 당신을 초대했습니다
            </p>
            <h2 className="text-lg font-semibold text-gray-900">
              {inviteInfo.projectName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {inviteInfo.projectDestination}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {session ? (
            <>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? '참여 중...' : '프로젝트 참여하기'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {session.user?.email}로 로그인됨
              </p>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={handleLogin}>
                Google로 로그인하고 참여하기
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                참여하려면 로그인이 필요합니다
              </p>
            </>
          )}
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <button
            className="text-sm text-muted-foreground hover:text-gray-700"
            onClick={() => router.push('/')}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
