/**
 * Geocoding Cache Service
 *
 * Caches geocoding results to avoid duplicate API calls for the same place.
 */

import type { GeocodingResult } from '@/lib/google-maps'

export type GeocodingFetcher = (
  placeName: string,
  placeNameEn: string | null,
  destination: string,
  country?: string
) => Promise<GeocodingResult | null>

export class GeocodingCacheService {
  private cache: Map<string, GeocodingResult | null>

  constructor() {
    this.cache = new Map()
  }

  /**
   * Generate cache key from place name and English name
   */
  private getCacheKey(placeName: string, placeNameEn: string | null): string {
    return `${placeName}|${placeNameEn || ''}`
  }

  /**
   * Get cached result or fetch and cache new result
   */
  async getOrFetch(
    placeName: string,
    placeNameEn: string | null,
    destination: string,
    country: string | undefined,
    fetcher: GeocodingFetcher
  ): Promise<GeocodingResult | null> {
    const cacheKey = this.getCacheKey(placeName, placeNameEn)

    if (this.cache.has(cacheKey)) {
      console.log(`[GeocodingCache] Cache hit for: ${placeName}`)
      return this.cache.get(cacheKey) || null
    }

    console.log(`[GeocodingCache] Cache miss, fetching: ${placeName} (EN: ${placeNameEn || 'N/A'})`)
    const result = await fetcher(placeName, placeNameEn, destination, country)
    this.cache.set(cacheKey, result)

    return result
  }

  /**
   * Check if a place is cached
   */
  has(placeName: string, placeNameEn: string | null): boolean {
    return this.cache.has(this.getCacheKey(placeName, placeNameEn))
  }

  /**
   * Get cached result without fetching
   */
  get(placeName: string, placeNameEn: string | null): GeocodingResult | null | undefined {
    return this.cache.get(this.getCacheKey(placeName, placeNameEn))
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }
}
