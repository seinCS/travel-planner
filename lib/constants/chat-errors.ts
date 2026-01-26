/**
 * Chat Error Constants
 *
 * Standardized error messages for chatbot functionality.
 */

export const CHAT_ERRORS = {
  // Rate limiting
  DAILY_LIMIT_EXCEEDED: '오늘 사용량을 초과했습니다. 내일 다시 이용해 주세요.',
  MINUTE_LIMIT_EXCEEDED: '잠시 후 다시 시도해 주세요. (분당 요청 제한)',
  GLOBAL_LIMIT_EXCEEDED: '서비스 일일 한도를 초과했습니다. 내일 다시 이용해 주세요.',

  // Authentication & Authorization
  UNAUTHORIZED: '로그인이 필요합니다.',
  PROJECT_NOT_FOUND: '프로젝트를 찾을 수 없습니다.',
  NO_ACCESS: '이 프로젝트에 접근 권한이 없습니다.',

  // Service errors
  SERVICE_UNAVAILABLE: 'AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해 주세요.',
  STREAM_ERROR: '응답을 받는 중 오류가 발생했습니다.',
  INVALID_REQUEST: '잘못된 요청입니다.',

  // Content filtering
  PROMPT_INJECTION_DETECTED: '허용되지 않는 요청입니다.',
  CONTENT_FILTERED: '응답이 필터링되었습니다.',

  // General
  UNKNOWN_ERROR: '오류가 발생했습니다. 다시 시도해 주세요.',
} as const

export type ChatErrorKey = keyof typeof CHAT_ERRORS

/**
 * Create error response object
 */
export function createChatError(key: ChatErrorKey, details?: string) {
  return {
    error: {
      code: key,
      message: CHAT_ERRORS[key],
      details,
    },
  }
}
