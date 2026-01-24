/**
 * TextInputs API Client
 */
import { apiClient } from './index'
import type { TextInput, CreateTextInputRequest } from '@/types'

export interface TextInputsResponse {
  textInputs: TextInput[]
}

export const textInputsApi = {
  getByProject: (projectId: string) =>
    apiClient.get<TextInputsResponse>(`/projects/${projectId}/text-inputs`),

  create: (projectId: string, data: CreateTextInputRequest) =>
    apiClient.post<TextInput>(`/projects/${projectId}/text-inputs`, data),

  delete: (projectId: string, textInputId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/text-inputs/${textInputId}`),
}

export default textInputsApi
