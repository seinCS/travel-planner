/**
 * ProcessingStatus Value Object
 *
 * Represents the processing state of an image or text input.
 */

export type ProcessingStatusValue = 'pending' | 'processed' | 'failed'

export interface ProcessingStatus {
  readonly value: ProcessingStatusValue
  readonly errorMessage?: string
}

/**
 * Create a pending status
 */
export function createPendingStatus(): ProcessingStatus {
  return Object.freeze({ value: 'pending' })
}

/**
 * Create a processed status
 */
export function createProcessedStatus(): ProcessingStatus {
  return Object.freeze({ value: 'processed' })
}

/**
 * Create a failed status with error message
 */
export function createFailedStatus(errorMessage: string): ProcessingStatus {
  return Object.freeze({ value: 'failed', errorMessage })
}

/**
 * Check if status indicates completion (processed or failed)
 */
export function isCompleted(status: ProcessingStatus): boolean {
  return status.value !== 'pending'
}

/**
 * Check if status indicates success
 */
export function isSuccess(status: ProcessingStatus): boolean {
  return status.value === 'processed'
}
