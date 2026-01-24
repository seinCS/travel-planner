/**
 * Duplicate Detection Service
 *
 * Detects duplicate places using multiple strategies:
 * 1. Google Place ID match
 * 2. Name match (case-insensitive)
 * 3. Coordinate proximity (within 100m)
 */

import { areCoordinatesNear, type Coordinates } from '@/domain/value-objects/Coordinates'

/**
 * Minimal place type for duplicate detection
 */
export interface DuplicateCandidate {
  id: string
  name: string
  latitude: number
  longitude: number
  googlePlaceId?: string | null
}

export interface DuplicateDetectionResult<T extends DuplicateCandidate> {
  isDuplicate: boolean
  existingPlace?: T
}

export class DuplicateDetectionService {
  private readonly proximityThresholdMeters: number

  constructor(proximityThresholdMeters: number = 100) {
    this.proximityThresholdMeters = proximityThresholdMeters
  }

  /**
   * Find duplicate place from existing places
   */
  findDuplicate<T extends DuplicateCandidate>(
    existingPlaces: T[],
    placeName: string,
    googlePlaceId: string | null | undefined,
    coordinates: Coordinates
  ): DuplicateDetectionResult<T> {
    const placeNameLower = placeName.toLowerCase()

    const existingPlace = existingPlaces.find((place) => {
      // 1순위: Google Place ID 일치
      if (
        place.googlePlaceId &&
        googlePlaceId &&
        place.googlePlaceId === googlePlaceId
      ) {
        return true
      }

      // 2순위: 이름 일치 (case-insensitive)
      if (place.name.toLowerCase() === placeNameLower) {
        return true
      }

      // 3순위: 좌표 근접
      const placeCoords: Coordinates = {
        latitude: place.latitude,
        longitude: place.longitude,
      }
      if (areCoordinatesNear(placeCoords, coordinates, this.proximityThresholdMeters)) {
        return true
      }

      return false
    })

    return {
      isDuplicate: !!existingPlace,
      existingPlace,
    }
  }

  /**
   * Check if a place name exists within a set (for same-item deduplication)
   */
  isInSet(nameSet: Set<string>, placeName: string): boolean {
    return nameSet.has(placeName.toLowerCase())
  }

  /**
   * Add a place name to the deduplication set
   */
  addToSet(nameSet: Set<string>, placeName: string): void {
    nameSet.add(placeName.toLowerCase())
  }
}

/**
 * Default instance for convenience
 */
export const duplicateDetectionService = new DuplicateDetectionService()
