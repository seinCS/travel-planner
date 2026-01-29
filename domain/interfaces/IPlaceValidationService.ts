/**
 * Place Validation Service Interface
 *
 * Defines the contract for validating and enriching AI-recommended places
 * using external APIs (e.g., Google Places API).
 */

import type { RecommendedPlace } from './ILLMService'

/**
 * A place that has been validated against Google Places API
 */
export interface ValidatedPlace extends RecommendedPlace {
  isVerified: boolean
  googlePlaceId?: string
  rating?: number
  userRatingsTotal?: number
  openNow?: boolean
  priceLevel?: number
  googleMapsUrl?: string
  distanceFromReference?: number
}

export interface IPlaceValidationService {
  /**
   * Validate recommended places against Google Places API
   * and enrich with real-time data (rating, hours, etc.)
   *
   * Places that fail validation are returned with isVerified=false
   * rather than being filtered out.
   */
  validateAndEnrich(
    places: Array<{
      name: string
      name_en?: string
      address?: string
      category: string
      description?: string
    }>,
    destination: string,
    country?: string,
  ): Promise<ValidatedPlace[]>

  /**
   * Search for nearby places using coordinates
   */
  searchNearby(
    latitude: number,
    longitude: number,
    category?: string,
    keyword?: string,
    maxResults?: number,
  ): Promise<ValidatedPlace[]>
}
