/**
 * Prisma Accommodation Repository
 *
 * Implements IAccommodationRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type {
  IAccommodationRepository,
  Accommodation,
  CreateAccommodationData,
  UpdateAccommodationData,
} from '@/domain/interfaces/IAccommodationRepository'

export class PrismaAccommodationRepository implements IAccommodationRepository {
  async findByItineraryId(itineraryId: string): Promise<Accommodation[]> {
    const results = await prisma.accommodation.findMany({
      where: { itineraryId },
      orderBy: { checkIn: 'asc' },
    })
    return results as Accommodation[]
  }

  async findById(id: string): Promise<Accommodation | null> {
    const result = await prisma.accommodation.findUnique({
      where: { id },
    })
    return result as Accommodation | null
  }

  async create(data: CreateAccommodationData): Promise<Accommodation> {
    const result = await prisma.accommodation.create({
      data: {
        itineraryId: data.itineraryId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        note: data.note,
      },
    })
    return result as Accommodation
  }

  async update(id: string, data: UpdateAccommodationData): Promise<Accommodation> {
    const result = await prisma.accommodation.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        note: data.note,
      },
    })
    return result as Accommodation
  }

  async delete(id: string): Promise<void> {
    await prisma.accommodation.delete({
      where: { id },
    })
  }

  async deleteByItineraryId(itineraryId: string): Promise<void> {
    await prisma.accommodation.deleteMany({
      where: { itineraryId },
    })
  }

  async findByDateRange(itineraryId: string, startDate: Date, endDate: Date): Promise<Accommodation[]> {
    const results = await prisma.accommodation.findMany({
      where: {
        itineraryId,
        OR: [
          // Check-in is within range
          {
            checkIn: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Check-out is within range
          {
            checkOut: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Accommodation spans the entire range
          {
            AND: [
              { checkIn: { lte: startDate } },
              { checkOut: { gte: endDate } },
            ],
          },
        ],
      },
      orderBy: { checkIn: 'asc' },
    })
    return results as Accommodation[]
  }

  async countByItineraryId(itineraryId: string): Promise<number> {
    return await prisma.accommodation.count({
      where: { itineraryId },
    })
  }
}

/**
 * Default instance for convenience
 */
export const accommodationRepository = new PrismaAccommodationRepository()
