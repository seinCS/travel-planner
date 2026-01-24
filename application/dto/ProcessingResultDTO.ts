/**
 * Processing Result DTO
 *
 * Data transfer object for processing operation results.
 */

export interface ProcessingResultDTO {
  message: string
  total: number
  processed: number
  failed: number
}

/**
 * Create a processing result
 */
export function createProcessingResult(
  total: number,
  processed: number,
  failed: number
): ProcessingResultDTO {
  return {
    message: 'Processing complete',
    total,
    processed,
    failed,
  }
}

/**
 * Create an empty result (no items to process)
 */
export function createEmptyResult(itemType: 'images' | 'text inputs'): ProcessingResultDTO {
  return {
    message: `No pending ${itemType}`,
    total: 0,
    processed: 0,
    failed: 0,
  }
}
