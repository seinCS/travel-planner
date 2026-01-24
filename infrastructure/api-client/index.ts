/**
 * API Client - 공통 fetch wrapper
 *
 * 모든 API 호출을 중앙화하여 일관된 에러 처리와 타입 안정성 제공
 */

const BASE_URL = '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(
      error.error || `HTTP ${response.status}`,
      response.status,
      error.code
    )
  }

  // 204 No Content 처리
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const apiClient = {
  get: <T>(url: string): Promise<T> =>
    fetch(`${BASE_URL}${url}`).then(handleResponse<T>),

  post: <T>(url: string, data?: unknown): Promise<T> =>
    fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }).then(handleResponse<T>),

  put: <T>(url: string, data: unknown): Promise<T> =>
    fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  patch: <T>(url: string, data: unknown): Promise<T> =>
    fetch(`${BASE_URL}${url}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  delete: <T>(url: string): Promise<T> =>
    fetch(`${BASE_URL}${url}`, { method: 'DELETE' }).then(handleResponse<T>),

  /**
   * FormData 업로드용 (이미지 등)
   */
  upload: <T>(url: string, formData: FormData): Promise<T> =>
    fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      body: formData,
    }).then(handleResponse<T>),
}

export default apiClient
