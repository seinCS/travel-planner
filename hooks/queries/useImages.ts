/**
 * useImages Hook
 *
 * SWR-based hook for fetching images by project.
 */

import useSWR from 'swr'
import { imagesApi, type ImagesResponse } from '@/infrastructure/api-client/images.api'

export interface UseImagesOptions {
  revalidateOnFocus?: boolean
  dedupingInterval?: number
}

export function useImages(projectId: string | undefined, options: UseImagesOptions = {}) {
  const { revalidateOnFocus = false, dedupingInterval = 30000 } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<ImagesResponse>(
    projectId ? `/projects/${projectId}/images` : null,
    () => (projectId ? imagesApi.getByProject(projectId) : Promise.reject('No project ID')),
    {
      revalidateOnFocus,
      dedupingInterval,
    }
  )

  return {
    images: data?.images ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
