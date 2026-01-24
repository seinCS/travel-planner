/**
 * Prisma Flight Repository
 *
 * Implements IFlightRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type {
  IFlightRepository,
  Flight,
  CreateFlightData,
  UpdateFlightData,
} from '@/domain/interfaces/IFlightRepository'

export class PrismaFlightRepository implements IFlightRepository {
  async findByItineraryId(itineraryId: string): Promise<Flight[]> {
    const results = await prisma.flight.findMany({
      where: { itineraryId },
      orderBy: { departureDate: 'asc' },
    })
    return results as Flight[]
  }

  async findById(id: string): Promise<Flight | null> {
    const result = await prisma.flight.findUnique({
      where: { id },
    })
    return result as Flight | null
  }

  async create(data: CreateFlightData): Promise<Flight> {
    const result = await prisma.flight.create({
      data: {
        itineraryId: data.itineraryId,
        departureCity: data.departureCity,
        arrivalCity: data.arrivalCity,
        airline: data.airline,
        flightNumber: data.flightNumber,
        departureDate: data.departureDate,
        arrivalDate: data.arrivalDate,
        note: data.note,
      },
    })
    return result as Flight
  }

  async update(id: string, data: UpdateFlightData): Promise<Flight> {
    const result = await prisma.flight.update({
      where: { id },
      data: {
        departureCity: data.departureCity,
        arrivalCity: data.arrivalCity,
        airline: data.airline,
        flightNumber: data.flightNumber,
        departureDate: data.departureDate,
        arrivalDate: data.arrivalDate,
        note: data.note,
      },
    })
    return result as Flight
  }

  async delete(id: string): Promise<void> {
    await prisma.flight.delete({
      where: { id },
    })
  }

  async deleteByItineraryId(itineraryId: string): Promise<void> {
    await prisma.flight.deleteMany({
      where: { itineraryId },
    })
  }

  async countByItineraryId(itineraryId: string): Promise<number> {
    return await prisma.flight.count({
      where: { itineraryId },
    })
  }
}

/**
 * Default instance for convenience
 */
export const flightRepository = new PrismaFlightRepository()
