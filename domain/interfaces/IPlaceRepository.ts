/**
 * Place Repository Interface
 *
 * Abstract interface for Place persistence operations.
 */

import type { Place } from '@/types'
import type { Coordinates } from '@/domain/value-objects/Coordinates'
import type { GeocodingResult } from '@/lib/google-maps'

export interface CreatePlaceData {
  projectId: string
  name: string
  category: string
  comment: string | null
  coordinates: Coordinates
  googleData: GeocodingResult
}

export interface IPlaceRepository {
  findByProjectId(projectId: string): Promise<Place[]>
  findById(id: string): Promise<Place | null>
  create(data: CreatePlaceData): Promise<Place>
  update(id: string, data: Partial<Place>): Promise<Place>
  delete(id: string): Promise<void>
}
