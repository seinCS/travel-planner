/**
 * Share API Client (공유 페이지용)
 */
import { apiClient } from './index'
import type { Project, Place } from '@/types'

export interface SharedProjectData {
  project: Project
  places: Place[]
}

export interface CloneResult {
  success: boolean
  projectId: string
}

export const shareApi = {
  getSharedProject: (token: string) =>
    apiClient.get<SharedProjectData>(`/share/${token}`),

  cloneProject: (token: string) =>
    apiClient.post<CloneResult>(`/share/${token}/clone`),
}

export default shareApi
