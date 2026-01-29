/**
 * useProjectDetail Hook
 *
 * BFF 패턴: 단일 API 호출로 프로젝트 페이지 전체 데이터를 조회합니다.
 * /api/projects/[id]/page-data 엔드포인트를 사용하여
 * 프로젝트, 이미지, 장소, 텍스트 입력을 한 번에 가져옵니다.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import type { Place, CreatePlaceInput } from '@/types'
import type { ProjectPageData } from '@/types/page-data'
import { geocodeDestination } from '@/lib/google-maps'
import { imagesApi } from '@/infrastructure/api-client/images.api'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useProjectDetail(projectId: string) {
  // BFF: 단일 SWR 호출로 모든 데이터 조회
  const {
    data: pageData,
    mutate,
    isLoading,
  } = useSWR<ProjectPageData>(
    projectId ? `/api/projects/${projectId}/page-data` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true,
    }
  )

  // Processing state
  const [processing, setProcessing] = useState(false)
  const [processingText, setProcessingText] = useState(false)
  const [deletingImages, setDeletingImages] = useState(false)

  // Map center state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenterLoading, setMapCenterLoading] = useState(false)
  const [mapCenterFailed, setMapCenterFailed] = useState(false)

  // Derived data from BFF response
  const project = pageData?.project ?? null
  const images = useMemo(() => pageData?.images ?? [], [pageData?.images])
  const places = useMemo(() => pageData?.places ?? [], [pageData?.places])
  const textInputs = useMemo(() => pageData?.textInputs ?? [], [pageData?.textInputs])

  // Set map center based on destination
  useEffect(() => {
    if (project?.destination && !mapCenter && !mapCenterLoading && !mapCenterFailed) {
      setMapCenterLoading(true)
      geocodeDestination(project.destination, project.country || undefined)
        .then((center) => {
          if (center) {
            setMapCenter(center)
          } else {
            console.warn('[useProjectDetail] Geocoding returned null for:', project.destination)
            setMapCenterFailed(true)
          }
        })
        .catch((error) => {
          console.error('[useProjectDetail] Geocoding failed:', error)
          setMapCenterFailed(true)
        })
        .finally(() => {
          setMapCenterLoading(false)
        })
    }
  }, [project?.destination, project?.country, mapCenter, mapCenterLoading, mapCenterFailed])

  // Computed values from meta (pre-computed on server) with client fallback
  const pendingImageCount = pageData?.meta?.pendingImageCount
    ?? images.filter((i) => i.status === 'pending').length
  const failedImageCount = pageData?.meta?.failedImageCount
    ?? images.filter((i) => i.status === 'failed').length
  const failedImages = useMemo(
    () => images.filter((i) => i.status === 'failed'),
    [images]
  )
  const pendingTextCount = pageData?.meta?.pendingTextCount
    ?? textInputs.filter((t) => t.status === 'pending').length
  const failedTextCount = pageData?.meta?.failedTextCount
    ?? textInputs.filter((t) => t.status === 'failed').length

  // Get places for a specific image
  const getPlacesForImage = useCallback(
    (imageId: string): Place[] => {
      return places.filter((place) =>
        place.placeImages?.some((pi) => pi.imageId === imageId)
      )
    },
    [places]
  )

  // Mutations - all use single mutate() to revalidate BFF data
  const handleUploadComplete = useCallback(
    (uploadedCount: number, failedCount: number) => {
      mutate()
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount}개 이미지 업로드 완료${failedCount > 0 ? ` (${failedCount}개 실패)` : ''}`)
      } else if (failedCount > 0) {
        toast.error(`업로드 실패: ${failedCount}개 이미지`)
      }
    },
    [mutate]
  )

  const processImages = useCallback(
    async (retryImageIds?: string[]) => {
      setProcessing(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retryImageIds }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.processed > 0 || data.failed > 0) {
            toast.success(`처리 완료: ${data.processed}개 성공, ${data.failed}개 실패`)
          } else {
            toast.info('처리할 이미지가 없습니다.')
          }
          await mutate()
        } else {
          throw new Error('Processing failed')
        }
      } catch (error) {
        console.error('Processing failed:', error)
        toast.error('이미지 처리에 실패했습니다.')
      } finally {
        setProcessing(false)
      }
    },
    [projectId, mutate]
  )

  const processText = useCallback(
    async (retryTextInputIds?: string[]) => {
      setProcessingText(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/process-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retryTextInputIds }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.processed > 0 || data.failed > 0) {
            toast.success(`텍스트 처리 완료: ${data.processed}개 성공, ${data.failed}개 실패`)
          } else {
            toast.info('처리할 텍스트가 없습니다.')
          }
          await mutate()
        } else {
          throw new Error('Text processing failed')
        }
      } catch (error) {
        console.error('Text processing failed:', error)
        toast.error('텍스트 처리에 실패했습니다.')
      } finally {
        setProcessingText(false)
      }
    },
    [projectId, mutate]
  )

  const handleTextInputComplete = useCallback(() => {
    mutate()
    toast.success('저장되었습니다.')
  }, [mutate])

  const deleteTextInput = useCallback(
    async (textInputId: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/text-inputs/${textInputId}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          mutate()
          toast.success('삭제되었습니다.')
        } else {
          throw new Error('Delete failed')
        }
      } catch (error) {
        console.error('Failed to delete text input:', error)
        toast.error('삭제에 실패했습니다.')
      }
    },
    [projectId, mutate]
  )

  const deletePlace = useCallback(
    async (placeId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/places/${placeId}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          mutate()
          toast.success('장소가 삭제되었습니다.')
          return true
        }
        return false
      } catch (error) {
        console.error('Failed to delete place:', error)
        toast.error('장소 삭제에 실패했습니다.')
        return false
      }
    },
    [mutate]
  )

  const updatePlace = useCallback(
    async (_updatedPlace: Place) => {
      mutate()
      toast.success('장소가 수정되었습니다.')
    },
    [mutate]
  )

  const addPlace = useCallback(
    async (data: CreatePlaceInput) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/places`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (res.ok) {
          toast.success('장소가 추가되었습니다.')
          await mutate()
          return true
        } else {
          const error = await res.json()
          throw new Error(error.error || 'Failed to add place')
        }
      } catch (error) {
        console.error('Failed to add place:', error)
        toast.error('장소 추가에 실패했습니다.')
        return false
      }
    },
    [projectId, mutate]
  )

  const deleteImages = useCallback(
    async (imageIds: string[]): Promise<void> => {
      if (imageIds.length === 0) return

      setDeletingImages(true)
      try {
        const result = await imagesApi.bulkDelete(projectId, imageIds)

        if (result.totalDeleted > 0) {
          toast.success(`${result.totalDeleted}개 이미지가 삭제되었습니다.`)
        }
        if (result.failed.length > 0) {
          toast.error(`${result.failed.length}개 이미지 삭제 실패`)
        }

        await mutate()
      } catch (error) {
        console.error('Failed to delete images:', error)
        toast.error('이미지 삭제에 실패했습니다.')
        throw error
      } finally {
        setDeletingImages(false)
      }
    },
    [projectId, mutate]
  )

  return {
    // Data
    project,
    places,
    images,
    textInputs,
    mapCenter,
    mapCenterFailed,
    isLoading,

    // Computed
    pendingImageCount,
    failedImageCount,
    failedImages,
    pendingTextCount,
    failedTextCount,
    getPlacesForImage,

    // Processing state
    processing,
    processingText,
    deletingImages,

    // Actions
    processImages,
    processText,
    handleUploadComplete,
    handleTextInputComplete,
    deleteTextInput,
    deletePlace,
    updatePlace,
    addPlace,
    deleteImages,

    // Revalidation - single mutate replaces all three
    mutateProject: mutate,
    mutatePlaces: mutate,
    mutateTextInputs: mutate,
  }
}
