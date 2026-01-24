/**
 * useProjectDetail Hook
 *
 * Consolidated hook for project detail page state and data fetching.
 * Combines multiple query and mutation hooks into a single interface.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import type { Place, Image, TextInput, Project, CreatePlaceInput } from '@/types'
import { geocodeDestination } from '@/lib/google-maps'

interface PlaceWithPlaceImages extends Place {
  placeImages?: { imageId: string }[]
}

interface ProjectData extends Project {
  images?: Image[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useProjectDetail(projectId: string) {
  // SWR queries
  const {
    data: projectData,
    mutate: mutateProject,
    isLoading: projectLoading,
  } = useSWR<ProjectData>(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const {
    data: placesData,
    mutate: mutatePlaces,
  } = useSWR<{ places: PlaceWithPlaceImages[] }>(
    projectId ? `/api/projects/${projectId}/places` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const {
    data: textInputsData,
    mutate: mutateTextInputs,
  } = useSWR<{ textInputs: TextInput[] }>(
    projectId ? `/api/projects/${projectId}/text-inputs` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Processing state
  const [processing, setProcessing] = useState(false)
  const [processingText, setProcessingText] = useState(false)

  // Map center state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)

  // Set map center based on destination
  useEffect(() => {
    if (projectData?.destination && !mapCenter) {
      geocodeDestination(projectData.destination, projectData.country || undefined)
        .then((center) => {
          if (center) setMapCenter(center)
        })
    }
  }, [projectData?.destination, projectData?.country, mapCenter])

  // Derived data
  const project = projectData ?? null
  const images = projectData?.images ?? []
  const places = placesData?.places ?? []
  const textInputs = textInputsData?.textInputs ?? []

  const isLoading = projectLoading

  // Computed values
  const pendingImageCount = useMemo(
    () => images.filter((i) => i.status === 'pending').length,
    [images]
  )
  const failedImageCount = useMemo(
    () => images.filter((i) => i.status === 'failed').length,
    [images]
  )
  const failedImages = useMemo(
    () => images.filter((i) => i.status === 'failed'),
    [images]
  )
  const pendingTextCount = useMemo(
    () => textInputs.filter((t) => t.status === 'pending').length,
    [textInputs]
  )
  const failedTextCount = useMemo(
    () => textInputs.filter((t) => t.status === 'failed').length,
    [textInputs]
  )

  // Get places for a specific image
  const getPlacesForImage = useCallback(
    (imageId: string): Place[] => {
      return places.filter((place) =>
        place.placeImages?.some((pi) => pi.imageId === imageId)
      )
    },
    [places]
  )

  // Mutations
  const handleUploadComplete = useCallback(
    (uploadedCount: number, failedCount: number) => {
      mutateProject()
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount}개 이미지 업로드 완료${failedCount > 0 ? ` (${failedCount}개 실패)` : ''}`)
      } else if (failedCount > 0) {
        toast.error(`업로드 실패: ${failedCount}개 이미지`)
      }
    },
    [mutateProject]
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
          await Promise.all([mutatePlaces(), mutateProject()])
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
    [projectId, mutatePlaces, mutateProject]
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
          await Promise.all([mutatePlaces(), mutateTextInputs()])
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
    [projectId, mutatePlaces, mutateTextInputs]
  )

  const handleTextInputComplete = useCallback(() => {
    mutateTextInputs()
    toast.success('저장되었습니다.')
  }, [mutateTextInputs])

  const deleteTextInput = useCallback(
    async (textInputId: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/text-inputs/${textInputId}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          mutateTextInputs()
          toast.success('삭제되었습니다.')
        } else {
          throw new Error('Delete failed')
        }
      } catch (error) {
        console.error('Failed to delete text input:', error)
        toast.error('삭제에 실패했습니다.')
      }
    },
    [projectId, mutateTextInputs]
  )

  const deletePlace = useCallback(
    async (placeId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/places/${placeId}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          mutatePlaces()
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
    [mutatePlaces]
  )

  const updatePlace = useCallback(
    async (_updatedPlace: Place) => {
      mutatePlaces()
      toast.success('장소가 수정되었습니다.')
    },
    [mutatePlaces]
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
          await Promise.all([mutatePlaces(), mutateProject()])
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
    [projectId, mutatePlaces, mutateProject]
  )

  return {
    // Data
    project,
    places,
    images,
    textInputs,
    mapCenter,
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

    // Actions
    processImages,
    processText,
    handleUploadComplete,
    handleTextInputComplete,
    deleteTextInput,
    deletePlace,
    updatePlace,
    addPlace,

    // Revalidation
    mutateProject,
    mutatePlaces,
    mutateTextInputs,
  }
}
