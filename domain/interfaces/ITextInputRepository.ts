/**
 * TextInput Repository Interface
 *
 * Abstract interface for TextInput persistence operations.
 */

import type { TextInput } from '@/types'

export type ProcessingStatus = 'pending' | 'processed' | 'failed'

export interface UpdateTextInputData {
  status: ProcessingStatus
  errorMessage?: string | null
}

export interface ITextInputRepository {
  findPendingByProjectId(projectId: string): Promise<TextInput[]>
  findById(id: string): Promise<TextInput | null>
  update(id: string, data: UpdateTextInputData): Promise<TextInput>
  resetToPending(ids: string[]): Promise<void>
  linkToPlace(textInputId: string, placeId: string): Promise<void>
}
