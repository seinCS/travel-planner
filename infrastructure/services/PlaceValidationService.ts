/**
 * Place Validation Service
 *
 * Validates AI-recommended places against Google Places API
 * and enriches them with real-time data (rating, hours, coordinates).
 *
 * Uses an in-memory LRU cache to reduce API calls for repeated validations.
 */

import 'server-only'
import type { IPlaceValidationService, ValidatedPlace } from '@/domain/interfaces/IPlaceValidationService'
import { getServerApiKey } from '@/lib/google-maps'
import { logger } from '@/lib/logger'

// ============================================================
// LRU Cache
// ============================================================

interface CacheEntry {
  data: ValidatedPlace
  timestamp: number
}

class LRUCache {
  private cache = new Map<string, CacheEntry>()
  private readonly maxSize: number
  private readonly ttlMs: number

  constructor(maxSize = 500, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  get(key: string): ValidatedPlace | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.data
  }

  set(key: string, data: ValidatedPlace): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, { data, timestamp: Date.now() })
  }
}

// ============================================================
// Google Places API response types
// ============================================================

interface PlacesTextSearchResult {
  place_id?: string
  name?: string
  formatted_address?: string
  geometry?: {
    location: { lat: number; lng: number }
  }
  rating?: number
  user_ratings_total?: number
  opening_hours?: { open_now?: boolean }
  price_level?: number
}

interface PlacesNearbyResult extends PlacesTextSearchResult {
  types?: string[]
}

// ============================================================
// Service Implementation
// ============================================================

class PlaceValidationServiceImpl implements IPlaceValidationService {
  private readonly cache = new LRUCache()

  async validateAndEnrich(
    places: Array<{
      name: string
      name_en?: string
      address?: string
      category: string
      description?: string
    }>,
    destination: string,
    country?: string,
  ): Promise<ValidatedPlace[]> {
    const results = await Promise.allSettled(
      places.map(place => this.validateSinglePlace(place, destination, country))
    )

    return results.map((result, i) => {
      if (result.status === 'fulfilled') return result.value
      logger.warn('Place validation rejected', {
        place: places[i].name,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
      return {
        ...places[i],
        isVerified: false,
      }
    })
  }

  async searchNearby(
    latitude: number,
    longitude: number,
    category?: string,
    keyword?: string,
    maxResults = 3,
  ): Promise<ValidatedPlace[]> {
    const apiKey = getServerApiKey()
    if (!apiKey) {
      logger.warn('Google Maps API key not configured for nearby search')
      return []
    }

    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: '1500',
      key: apiKey,
      language: 'ko',
    })

    if (category) {
      const typeMap: Record<string, string> = {
        restaurant: 'restaurant',
        cafe: 'cafe',
        attraction: 'tourist_attraction',
        shopping: 'shopping_mall',
      }
      const googleType = typeMap[category]
      if (googleType) params.set('type', googleType)
    }

    if (keyword) {
      params.set('keyword', keyword)
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.status !== 'OK' || !data.results) {
        logger.warn('Nearby search returned no results', { status: data.status })
        return []
      }

      const results: PlacesNearbyResult[] = data.results.slice(0, maxResults)
      return results
        .filter(r => r.geometry?.location)
        .map(r => this.googleResultToValidatedPlace(r, category || 'etc'))
    } catch (error) {
      logger.error('Nearby search failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private async validateSinglePlace(
    place: {
      name: string
      name_en?: string
      address?: string
      category: string
      description?: string
    },
    destination: string,
    country?: string,
  ): Promise<ValidatedPlace> {
    // Check cache
    const cacheKey = `${place.name}:${destination}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const apiKey = getServerApiKey()
    if (!apiKey) {
      return { ...place, isVerified: false }
    }

    // Strategy 1: Search with local name + destination + country
    const query1 = country
      ? `${place.name} ${destination} ${country}`
      : `${place.name} ${destination}`
    const result1 = await this.textSearch(query1, apiKey)
    if (result1) {
      const validated = this.mergeWithGoogleData(place, result1)
      this.cache.set(cacheKey, validated)
      return validated
    }

    // Strategy 2: Search with English name + destination
    if (place.name_en && place.name_en !== place.name) {
      const query2 = `${place.name_en} ${destination}`
      const result2 = await this.textSearch(query2, apiKey)
      if (result2) {
        const validated = this.mergeWithGoogleData(place, result2)
        this.cache.set(cacheKey, validated)
        return validated
      }
    }

    // All strategies failed
    const unverified: ValidatedPlace = { ...place, isVerified: false }
    return unverified
  }

  private async textSearch(
    query: string,
    apiKey: string,
  ): Promise<PlacesTextSearchResult | null> {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=ko`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
        return data.results[0]
      }
      return null
    } catch (error) {
      logger.warn('Text search failed', {
        query,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  private mergeWithGoogleData(
    place: {
      name: string
      name_en?: string
      address?: string
      category: string
      description?: string
    },
    googleResult: PlacesTextSearchResult,
  ): ValidatedPlace {
    const placeId = googleResult.place_id || undefined
    return {
      name: place.name,
      name_en: place.name_en,
      address: googleResult.formatted_address || place.address,
      category: place.category,
      description: place.description,
      latitude: googleResult.geometry?.location.lat,
      longitude: googleResult.geometry?.location.lng,
      isVerified: true,
      googlePlaceId: placeId,
      rating: googleResult.rating,
      userRatingsTotal: googleResult.user_ratings_total,
      openNow: googleResult.opening_hours?.open_now,
      priceLevel: googleResult.price_level,
      googleMapsUrl: placeId
        ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
        : undefined,
    }
  }

  private googleResultToValidatedPlace(
    result: PlacesNearbyResult,
    defaultCategory: string,
  ): ValidatedPlace {
    const placeId = result.place_id || undefined
    return {
      name: result.name || '',
      address: result.formatted_address,
      category: defaultCategory,
      latitude: result.geometry?.location.lat,
      longitude: result.geometry?.location.lng,
      isVerified: true,
      googlePlaceId: placeId,
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
      openNow: result.opening_hours?.open_now,
      priceLevel: result.price_level,
      googleMapsUrl: placeId
        ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
        : undefined,
    }
  }
}

export const placeValidationService = new PlaceValidationServiceImpl()
