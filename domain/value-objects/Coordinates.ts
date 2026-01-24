/**
 * Coordinates Value Object
 *
 * Immutable representation of geographic coordinates.
 */

export interface Coordinates {
  readonly latitude: number
  readonly longitude: number
}

/**
 * Create a Coordinates value object
 */
export function createCoordinates(latitude: number, longitude: number): Coordinates {
  return Object.freeze({ latitude, longitude })
}

/**
 * Calculate distance between two coordinates in meters
 * Uses Haversine formula
 */
export function calculateDistance(c1: Coordinates, c2: Coordinates): number {
  const R = 6371000 // Earth's radius in meters
  const lat1 = (c1.latitude * Math.PI) / 180
  const lat2 = (c2.latitude * Math.PI) / 180
  const deltaLat = ((c2.latitude - c1.latitude) * Math.PI) / 180
  const deltaLng = ((c2.longitude - c1.longitude) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Check if two coordinates are within a threshold distance
 */
export function areCoordinatesNear(
  c1: Coordinates,
  c2: Coordinates,
  thresholdMeters: number = 100
): boolean {
  return calculateDistance(c1, c2) <= thresholdMeters
}
