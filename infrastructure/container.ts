/**
 * Dependency Injection Container
 *
 * Factory functions for creating use case instances with dependencies.
 */

import { prisma } from '@/lib/db'
import { geocodePlaceWithFallback } from '@/lib/google-maps'
import type { Project } from '@/types'
import type { ProcessingContext, PlaceCreator, ExistingPlace } from '@/application/use-cases/processing/ProcessItemsBaseUseCase'
import { ProcessImagesUseCase, toProcessableImages } from '@/application/use-cases/processing/ProcessImagesUseCase'
import { ProcessTextInputsUseCase, toProcessableTextInputs } from '@/application/use-cases/processing/ProcessTextInputsUseCase'
import { imageRepository } from '@/infrastructure/repositories/PrismaImageRepository'
import { textInputRepository } from '@/infrastructure/repositories/PrismaTextInputRepository'

/**
 * Create ProcessImagesUseCase instance
 */
export function createProcessImagesUseCase(): ProcessImagesUseCase {
  return new ProcessImagesUseCase()
}

/**
 * Create ProcessTextInputsUseCase instance
 */
export function createProcessTextInputsUseCase(): ProcessTextInputsUseCase {
  return new ProcessTextInputsUseCase()
}

/**
 * Create processing context from project and existing places
 */
export function createProcessingContext(
  project: Project,
  existingPlaces: ExistingPlace[]
): ProcessingContext {
  return {
    project,
    existingPlaces,
    geocodingFetcher: geocodePlaceWithFallback,
  }
}

/**
 * Create place creator using Prisma
 */
export function createPlaceCreator(): PlaceCreator {
  return {
    async create(data) {
      return prisma.place.create({
        data: {
          projectId: data.projectId,
          name: data.name,
          category: data.category,
          comment: data.comment,
          latitude: data.latitude,
          longitude: data.longitude,
          status: data.status,
          googlePlaceId: data.googlePlaceId,
          formattedAddress: data.formattedAddress,
          googleMapsUrl: data.googleMapsUrl,
          rating: data.rating,
          userRatingsTotal: data.userRatingsTotal,
          priceLevel: data.priceLevel,
        },
      })
    },
  }
}

/**
 * Reset images to pending status for retry
 */
export async function resetImagesToPending(projectId: string, imageIds: string[]): Promise<void> {
  if (imageIds.length > 0) {
    await prisma.image.updateMany({
      where: { id: { in: imageIds }, projectId },
      data: { status: 'pending', errorMessage: null },
    })
    console.log(`[Container] Reset ${imageIds.length} images to pending for retry`)
  }
}

/**
 * Reset text inputs to pending status for retry
 */
export async function resetTextInputsToPending(projectId: string, textInputIds: string[]): Promise<void> {
  if (textInputIds.length > 0) {
    await prisma.textInput.updateMany({
      where: { id: { in: textInputIds }, projectId },
      data: { status: 'pending', errorMessage: null },
    })
    console.log(`[Container] Reset ${textInputIds.length} text inputs to pending for retry`)
  }
}

// Re-export helper functions for convenience
export { toProcessableImages, toProcessableTextInputs }
export { imageRepository, textInputRepository }
