/**
 * useTextInputs Hook
 *
 * SWR-based hook for fetching text inputs by project.
 */

import useSWR from 'swr'
import { textInputsApi, type TextInputsResponse } from '@/infrastructure/api-client/textInputs.api'

export interface UseTextInputsOptions {
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

export function useTextInputs(projectId: string | undefined, options: UseTextInputsOptions = {}) {
  const { revalidateOnFocus = false, dedupingInterval = 30000 } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<TextInputsResponse>(
    projectId ? `/projects/${projectId}/text-inputs` : null,
    () => (projectId ? textInputsApi.getByProject(projectId) : Promise.reject('No project ID')),
    {
      revalidateOnFocus,
      dedupingInterval,
    }
  )

  return {
    textInputs: data?.textInputs ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
