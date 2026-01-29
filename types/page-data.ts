import type { Project, Image, TextInput, Place } from '@/types'

export interface PlaceWithPlaceImages extends Place {
  placeImages?: { imageId: string }[]
}

export interface ProjectPageData {
  project: Project & { userRole: 'owner' | 'member' }
  images: Image[]
  places: PlaceWithPlaceImages[]
  textInputs: TextInput[]
  meta: {
    pendingImageCount: number
    failedImageCount: number
    pendingTextCount: number
    failedTextCount: number
  }
  cachedAt: string
}
