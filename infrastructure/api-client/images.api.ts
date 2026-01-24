/**
 * Images API Client
 */
import { apiClient } from './index'
import type { Image } from '@/types'

export interface ImagesResponse {
  images: Image[]
}

export interface UploadResponse {
  uploaded: Image[]
  failed: { name: string; error: string }[]
}

export interface BulkDeleteResponse {
  deleted: string[]
  failed: { id: string; error: string }[]
  totalRequested: number
  totalDeleted: number
}

export const imagesApi = {
  getByProject: (projectId: string) =>
    apiClient.get<ImagesResponse>(`/projects/${projectId}/images`),

  /**
   * 이미지 업로드
   * FormData로 전송 (Content-Type은 브라우저가 자동 설정)
   */
  upload: (projectId: string, formData: FormData) =>
    apiClient.upload<UploadResponse>(`/projects/${projectId}/images`, formData),

  delete: (imageId: string) =>
    apiClient.delete<void>(`/images/${imageId}`),

  /**
   * 이미지 일괄 삭제
   * @param projectId - 프로젝트 ID
   * @param imageIds - 삭제할 이미지 ID 배열
   */
  bulkDelete: (projectId: string, imageIds: string[]) =>
    apiClient.post<BulkDeleteResponse>(`/projects/${projectId}/images/bulk-delete`, { imageIds }),
}

export default imagesApi
