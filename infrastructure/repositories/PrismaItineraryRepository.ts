/**
 * Prisma Itinerary Repository
 *
 * Implements IItineraryRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type {
  IItineraryRepository,
  Itinerary,
  ItineraryWithDays,
  CreateItineraryData,
  UpdateItineraryData,
  CreateItineraryItemData,
  UpdateItineraryItemData,
  ItineraryItemWithPlace,
} from '@/domain/interfaces/IItineraryRepository'

export class PrismaItineraryRepository implements IItineraryRepository {
  async findByProjectId(projectId: string): Promise<ItineraryWithDays | null> {
    const result = await prisma.itinerary.findUnique({
      where: { projectId },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: { place: true },
            },
          },
        },
      },
    })
    return result as ItineraryWithDays | null
  }

  async findById(id: string): Promise<ItineraryWithDays | null> {
    const result = await prisma.itinerary.findUnique({
      where: { id },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: { place: true },
            },
          },
        },
      },
    })
    return result as ItineraryWithDays | null
  }

  async create(data: CreateItineraryData): Promise<ItineraryWithDays> {
    // Calculate number of days
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Create itinerary with days
    const result = await prisma.itinerary.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        days: {
          create: Array.from({ length: dayCount }, (_, i) => ({
            dayNumber: i + 1,
            date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
          })),
        },
      },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: { place: true },
            },
          },
        },
      },
    })

    return result as ItineraryWithDays
  }

  async update(id: string, data: UpdateItineraryData): Promise<Itinerary> {
    const result = await prisma.itinerary.update({
      where: { id },
      data: {
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    })
    return result as Itinerary
  }

  async delete(id: string): Promise<void> {
    await prisma.itinerary.delete({
      where: { id },
    })
  }

  async addItem(data: CreateItineraryItemData): Promise<ItineraryItemWithPlace> {
    const result = await prisma.itineraryItem.create({
      data: {
        dayId: data.dayId,
        placeId: data.placeId,
        order: data.order,
        startTime: data.startTime,
        note: data.note,
      },
      include: { place: true },
    })
    return result as ItineraryItemWithPlace
  }

  async updateItem(itemId: string, data: UpdateItineraryItemData): Promise<ItineraryItemWithPlace> {
    const result = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        order: data.order,
        startTime: data.startTime,
        note: data.note,
      },
      include: { place: true },
    })
    return result as ItineraryItemWithPlace
  }

  async removeItem(itemId: string): Promise<void> {
    await prisma.itineraryItem.delete({
      where: { id: itemId },
    })
  }

  async reorderItems(dayId: string, itemIds: string[]): Promise<void> {
    // Use transaction to update all items atomically
    await prisma.$transaction(
      itemIds.map((id, index) =>
        prisma.itineraryItem.update({
          where: { id },
          data: { order: index },
        })
      )
    )
  }
}

/**
 * Default instance for convenience
 */
export const itineraryRepository = new PrismaItineraryRepository()
