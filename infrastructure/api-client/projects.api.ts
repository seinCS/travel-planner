/**
 * Projects API Client
 */
import { apiClient } from './index'
import type { Project, Image, CreateProjectInput } from '@/types'

export interface ProjectWithImages extends Project {
  images: Image[]
}

export interface ProcessingResult {
  message: string
  total: number
  processed: number
  failed: number
}

export interface ShareStatus {
  shareEnabled: boolean
  shareToken: string | null
  shareUrl: string | null
}

export const projectsApi = {
  // CRUD
  getAll: () =>
    apiClient.get<Project[]>('/projects'),

  getById: (projectId: string) =>
    apiClient.get<ProjectWithImages>(`/projects/${projectId}`),

  create: (data: CreateProjectInput) =>
    apiClient.post<Project>('/projects', data),

  delete: (projectId: string) =>
    apiClient.delete<void>(`/projects/${projectId}`),

  // Processing
  processImages: (projectId: string, retryImageIds?: string[]) =>
    apiClient.post<ProcessingResult>(`/projects/${projectId}/process`, { retryImageIds }),

  processText: (projectId: string, retryTextInputIds?: string[]) =>
    apiClient.post<ProcessingResult>(`/projects/${projectId}/process-text`, { retryTextInputIds }),

  // Sharing
  getShareStatus: (projectId: string) =>
    apiClient.get<ShareStatus>(`/projects/${projectId}/share`),

  toggleShare: (projectId: string, enabled: boolean) =>
    apiClient.post<ShareStatus>(`/projects/${projectId}/share`, { enabled }),
}

export default projectsApi
