/**
 * useMembers Hook
 *
 * SWR-based hook for fetching project members.
 */

import useSWR from 'swr'
import { membersApi, type MembersListResponse } from '@/infrastructure/api-client/members.api'

export interface UseMembersOptions {
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

export function useMembers(projectId: string | undefined, options: UseMembersOptions = {}) {
  const { revalidateOnFocus = false, dedupingInterval = 30000 } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<MembersListResponse>(
    projectId ? `/projects/${projectId}/members` : null,
    () => (projectId ? membersApi.list(projectId) : Promise.reject('No project ID')),
    {
      revalidateOnFocus,
      dedupingInterval,
    }
  )

  return {
    members: data?.members ?? [],
    currentUserRole: data?.currentUserRole ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
