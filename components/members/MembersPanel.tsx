'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useMembers } from '@/hooks/queries/useMembers'
import { useMemberMutations } from '@/hooks/mutations/useMemberMutations'
import type { ProjectMember } from '@/infrastructure/api-client/members.api'

interface MembersPanelProps {
  projectId: string
  projectOwnerId: string
  currentUserId: string
}

export function MembersPanel({
  projectId,
  projectOwnerId,
  currentUserId,
}: MembersPanelProps) {
  const { members, currentUserRole, isLoading, mutate } = useMembers(projectId)
  const { removeMember, createInvite, leaveProject, isLoading: mutationLoading } = useMemberMutations(projectId)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const isOwner = currentUserId === projectOwnerId

  // Handle creating invite link
  const handleCreateInvite = useCallback(async () => {
    try {
      const result = await createInvite({ role: 'editor' })
      setInviteUrl(result.inviteUrl)
      setShowInviteModal(true)
    } catch (err) {
      console.error('Failed to create invite:', err)
      toast.error('초대 링크 생성에 실패했습니다.')
    }
  }, [createInvite])

  // Handle copying invite URL
  const handleCopyInvite = useCallback(async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setIsCopied(true)
      toast.success('초대 링크가 복사되었습니다.')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('복사에 실패했습니다.')
    }
  }, [inviteUrl])

  // Handle removing a member
  const handleRemoveMember = useCallback(
    async (member: ProjectMember) => {
      if (!confirm(`${member.user.name || member.user.email}님을 프로젝트에서 제거하시겠습니까?`)) {
        return
      }

      try {
        await removeMember(member.userId)
        await mutate()
        toast.success('멤버가 제거되었습니다.')
      } catch (err) {
        console.error('Failed to remove member:', err)
        toast.error('멤버 제거에 실패했습니다.')
      }
    },
    [removeMember, mutate]
  )

  // Handle leaving project
  const handleLeaveProject = useCallback(async () => {
    if (!confirm('이 프로젝트에서 나가시겠습니까?')) {
      return
    }

    try {
      await leaveProject()
      toast.success('프로젝트에서 나갔습니다.')
      // Redirect to projects list
      window.location.href = '/projects'
    } catch (err) {
      console.error('Failed to leave project:', err)
      toast.error('프로젝트 나가기에 실패했습니다.')
    }
  }, [leaveProject])

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">멤버 ({members.length + 1})</h3>
        {isOwner && (
          <Button
            size="sm"
            onClick={handleCreateInvite}
            disabled={mutationLoading}
          >
            + 초대
          </Button>
        )}
      </div>

      {/* Owner */}
      <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
              {currentUserId === projectOwnerId ? 'Me' : 'O'}
            </div>
            <div>
              <div className="font-medium text-sm">소유자</div>
              <div className="text-xs text-muted-foreground">
                {currentUserId === projectOwnerId ? '나 (소유자)' : '프로젝트 소유자'}
              </div>
            </div>
          </div>
          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
            Owner
          </span>
        </div>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">아직 멤버가 없습니다.</p>
          {isOwner && (
            <p className="text-xs mt-1">초대 버튼을 눌러 멤버를 추가하세요.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="border rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {member.user.image ? (
                  <img
                    src={member.user.image}
                    alt={member.user.name || ''}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm">
                    {member.user.name || member.user.email}
                    {member.userId === currentUserId && (
                      <span className="text-xs text-muted-foreground ml-2">(나)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.user.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                </span>
                {isOwner && member.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveMember(member)}
                    disabled={mutationLoading}
                  >
                    제거
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leave button for non-owners */}
      {!isOwner && (
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-red-500 border-red-200 hover:bg-red-50"
            onClick={handleLeaveProject}
            disabled={mutationLoading}
          >
            프로젝트 나가기
          </Button>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>멤버 초대</DialogTitle>
            <DialogDescription>
              아래 링크를 공유하여 멤버를 초대하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteUrl || ''}
                className="text-sm"
              />
              <Button
                onClick={handleCopyInvite}
                disabled={!inviteUrl}
              >
                {isCopied ? '복사됨!' : '복사'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              이 링크를 가진 사람은 누구나 프로젝트에 참여할 수 있습니다.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
