/**
 * Geocoding Service Interface
 *
 * Abstract interface for geocoding operations.
 */

import type { GeocodingResult } from '@/lib/google-maps'

export interface IGeocodingService {
  geocode(
    placeName: string,
    placeNameEn: string | null,
    destination: string,
    country?: string
  ): Promise<GeocodingResult | null>

  isDuplicate(lat1: number, lng1: number, lat2: number, lng2: number): boolean
}
