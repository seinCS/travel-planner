/**
 * Prisma Place Repository
 *
 * Implements IPlaceRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type { Place } from '@/types'
import type { IPlaceRepository, CreatePlaceData } from '@/domain/interfaces/IPlaceRepository'

export class PrismaPlaceRepository implements IPlaceRepository {
  async findByProjectId(projectId: string): Promise<Place[]> {
    const results = await prisma.place.findMany({
      where: { projectId },
    })
    return results as Place[]
  }

  async findById(id: string): Promise<Place | null> {
    const result = await prisma.place.findUnique({
      where: { id },
    })
    return result as Place | null
  }

  async create(data: CreatePlaceData): Promise<Place> {
    const result = await prisma.place.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        category: data.category,
        comment: data.comment,
        latitude: data.coordinates.latitude,
        longitude: data.coordinates.longitude,
        status: 'auto',
        googlePlaceId: data.googleData.googlePlaceId,
        formattedAddress: data.googleData.formattedAddress,
        googleMapsUrl: data.googleData.googleMapsUrl,
        rating: data.googleData.rating,
        userRatingsTotal: data.googleData.userRatingsTotal,
        priceLevel: data.googleData.priceLevel,
      },
    })
    return result as Place
  }

  async update(id: string, data: Partial<Place>): Promise<Place> {
    const result = await prisma.place.update({
      where: { id },
      data,
    })
    return result as Place
  }

  async delete(id: string): Promise<void> {
    await prisma.place.delete({
      where: { id },
    })
  }
}

/**
 * Default instance for convenience
 */
export const placeRepository = new PrismaPlaceRepository()
