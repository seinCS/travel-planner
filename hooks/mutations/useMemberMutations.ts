/**
 * useMemberMutations Hook
 *
 * Provides mutation functions for project member operations.
 */

import { useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'
import {
  membersApi,
  type MemberRole,
  type CreateInviteInput,
} from '@/infrastructure/api-client/members.api'

export function useMemberMutations(projectId: string) {
  const { mutate } = useSWRConfig()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const revalidateMembers = useCallback(() => {
    return mutate(`/projects/${projectId}/members`)
  }, [projectId, mutate])

  /**
   * Remove a member from the project
   */
  const removeMember = useCallback(
    async (memberId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await membersApi.removeMember(projectId, memberId)
        await revalidateMembers()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to remove member')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, revalidateMembers]
  )

  /**
   * Leave the project (current user)
   */
  const leaveProject = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await membersApi.leave(projectId)
      await revalidateMembers()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to leave project')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [projectId, revalidateMembers])

  /**
   * Transfer ownership to another member
   */
  const transferOwnership = useCallback(
    async (newOwnerId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await membersApi.transferOwnership(projectId, { newOwnerId })
        await revalidateMembers()
        return result.member
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to transfer ownership')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, revalidateMembers]
  )

  /**
   * Create an invite link
   */
  const createInvite = useCallback(
    async (data: CreateInviteInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await membersApi.createInvite(projectId, data)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create invite')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId]
  )

  /**
   * Disable an invite link
   */
  const disableInvite = useCallback(
    async (inviteId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await membersApi.disableInvite(projectId, inviteId)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to disable invite')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [projectId]
  )

  /**
   * Accept an invite (join via invite token)
   */
  const acceptInvite = useCallback(
    async (token: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await membersApi.acceptInvite(token)
        await revalidateMembers()
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to accept invite')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [revalidateMembers]
  )

  return {
    isLoading,
    error,
    removeMember,
    leaveProject,
    transferOwnership,
    createInvite,
    disableInvite,
    acceptInvite,
  }
}
