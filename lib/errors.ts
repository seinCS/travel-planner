/**
 * Custom Error Classes
 *
 * Type-safe error classes for better error handling throughout the application.
 */

/**
 * HTTP Error with status code
 *
 * Used for API errors that include HTTP status codes.
 * Provides type-safe access to status code without type assertions.
 */
export class HttpError extends Error {
  public readonly statusCode: number
  public readonly isRetryable: boolean

  constructor(message: string, statusCode: number, isRetryable = false) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.isRetryable = isRetryable

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError)
    }
  }

  /**
   * Check if an error is an HttpError
   */
  static isHttpError(error: unknown): error is HttpError {
    return error instanceof HttpError
  }
}

/**
 * API Error for client-side API calls
 *
 * Extends HttpError with additional API-specific context.
 */
export class ApiError extends HttpError {
  public readonly code?: string
  public readonly endpoint?: string

  constructor(
    message: string,
    statusCode: number,
    options?: { code?: string; endpoint?: string; isRetryable?: boolean }
  ) {
    super(message, statusCode, options?.isRetryable)
    this.name = 'ApiError'
    this.code = options?.code
    this.endpoint = options?.endpoint
  }

  /**
   * Check if an error is an ApiError
   */
  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
  }
}

/**
 * Validation Error for input validation failures
 */
export class ValidationError extends Error {
  public readonly field?: string
  public readonly value?: unknown

  constructor(message: string, field?: string, value?: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }
}
