/**
 * Image Repository Interface
 *
 * Abstract interface for Image persistence operations.
 */

import type { Image } from '@/types'

export type ProcessingStatus = 'pending' | 'processed' | 'failed'

export interface UpdateImageData {
  status: ProcessingStatus
  rawText?: string
  errorMessage?: string | null
}

export interface IImageRepository {
  findPendingByProjectId(projectId: string): Promise<Image[]>
  findById(id: string): Promise<Image | null>
  update(id: string, data: UpdateImageData): Promise<Image>
  resetToPending(ids: string[]): Promise<void>
  linkToPlace(imageId: string, placeId: string): Promise<void>
}
