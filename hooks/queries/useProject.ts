/**
 * useProject Hook
 *
 * SWR-based hook for fetching a single project with its images.
 */

import useSWR from 'swr'
import { projectsApi, type ProjectWithImages } from '@/infrastructure/api-client/projects.api'

export interface UseProjectOptions {
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

export function useProject(projectId: string | undefined, options: UseProjectOptions = {}) {
  const { revalidateOnFocus = false, dedupingInterval = 30000 } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectWithImages>(
    projectId ? `/projects/${projectId}` : null,
    () => (projectId ? projectsApi.getById(projectId) : Promise.reject('No project ID')),
    {
      revalidateOnFocus,
      dedupingInterval,
    }
  )

  return {
    project: data,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
