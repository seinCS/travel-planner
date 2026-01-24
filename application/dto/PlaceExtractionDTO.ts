/**
 * Place Extraction DTO
 *
 * Data transfer object for extracted place information.
 */

import type { PlaceCategory } from '@/infrastructure/services/claude/prompts'
import type { Coordinates } from '@/domain/value-objects/Coordinates'
import type { GeocodingResult } from '@/lib/google-maps'

export interface PlaceExtractionDTO {
  name: string
  nameEn: string | null
  category: PlaceCategory
  comment: string | null
  confidence: number
  coordinates?: Coordinates
  googleData?: GeocodingResult
}

/**
 * Convert raw extraction to DTO
 */
export function createPlaceExtractionDTO(
  extracted: {
    place_name: string
    place_name_en: string | null
    category: PlaceCategory
    comment: string | null
    confidence: number
  },
  geoResult?: GeocodingResult | null
): PlaceExtractionDTO {
  return {
    name: extracted.place_name,
    nameEn: extracted.place_name_en,
    category: extracted.category,
    comment: extracted.comment,
    confidence: extracted.confidence,
    coordinates: geoResult
      ? { latitude: geoResult.latitude, longitude: geoResult.longitude }
      : undefined,
    googleData: geoResult ?? undefined,
  }
}

/**
 * Check if extraction meets minimum confidence threshold
 */
export function meetsConfidenceThreshold(
  extraction: PlaceExtractionDTO,
  threshold: number = 0.5
): boolean {
  return extraction.confidence >= threshold
}
