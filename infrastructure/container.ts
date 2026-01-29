/**
 * Dependency Injection Container
 *
 * Factory functions for creating use case instances with dependencies.
 */

import { geocodePlaceWithFallback } from '@/lib/google-maps'
import type { Project } from '@/types'
import type { ProcessingContext, PlaceCreator, ExistingPlace } from '@/application/use-cases/processing/ProcessItemsBaseUseCase'
import { ProcessImagesUseCase, toProcessableImages } from '@/application/use-cases/processing/ProcessImagesUseCase'
import { ProcessTextInputsUseCase, toProcessableTextInputs } from '@/application/use-cases/processing/ProcessTextInputsUseCase'
import { imageRepository } from '@/infrastructure/repositories/PrismaImageRepository'
import { textInputRepository } from '@/infrastructure/repositories/PrismaTextInputRepository'
import { placeRepository } from '@/infrastructure/repositories/PrismaPlaceRepository'
import type { IPlaceRepository } from '@/domain/interfaces/IPlaceRepository'
import { createCoordinates } from '@/domain/value-objects/Coordinates'

/**
 * Create ProcessImagesUseCase instance
 */
export function createProcessImagesUseCase(): ProcessImagesUseCase {
  return new ProcessImagesUseCase(imageRepository)
}

/**
 * Create ProcessTextInputsUseCase instance
 */
export function createProcessTextInputsUseCase(): ProcessTextInputsUseCase {
  return new ProcessTextInputsUseCase(textInputRepository)
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
 * Adapter: Converts PlaceCreator interface to use IPlaceRepository
 *
 * PlaceCreator.create uses flat fields (latitude, longitude, googlePlaceId, etc.)
 * IPlaceRepository.create uses structured data (coordinates: Coordinates, googleData: GeocodingResult)
 */
function createPlaceCreatorAdapter(repository: IPlaceRepository): PlaceCreator {
  return {
    async create(data) {
      const place = await repository.create({
        projectId: data.projectId,
        name: data.name,
        category: data.category,
        comment: data.comment,
        coordinates: createCoordinates(data.latitude, data.longitude),
        googleData: {
          latitude: data.latitude,
          longitude: data.longitude,
          googlePlaceId: data.googlePlaceId ?? null,
          formattedAddress: data.formattedAddress ?? '',
          googleMapsUrl: data.googleMapsUrl ?? null,
          rating: data.rating ?? null,
          userRatingsTotal: data.userRatingsTotal ?? null,
          priceLevel: data.priceLevel ?? null,
        },
      })
      // Return ExistingPlace interface (subset of Place)
      return {
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        googlePlaceId: place.googlePlaceId,
      }
    },
  }
}

/**
 * Create place creator using Repository pattern
 */
export function createPlaceCreator(): PlaceCreator {
  return createPlaceCreatorAdapter(placeRepository)
}

/**
 * Reset images to pending status for retry
 */
export async function resetImagesToPending(projectId: string, imageIds: string[]): Promise<void> {
  if (imageIds.length > 0) {
    await imageRepository.resetToPending(imageIds)
    console.log(`[Container] Reset ${imageIds.length} images to pending for retry (projectId: ${projectId})`)
  }
}

/**
 * Reset text inputs to pending status for retry
 */
export async function resetTextInputsToPending(projectId: string, textInputIds: string[]): Promise<void> {
  if (textInputIds.length > 0) {
    await textInputRepository.resetToPending(textInputIds)
    console.log(`[Container] Reset ${textInputIds.length} text inputs to pending for retry (projectId: ${projectId})`)
  }
}

// ============================================================
// Chat / Function Calling factories
// ============================================================

import { ChatContextBuilder } from '@/application/services/chat/ContextBuilder'
import { ToolExecutor } from '@/application/services/chat/ToolExecutor'
import { SendMessageUseCase } from '@/application/use-cases/chat/SendMessageUseCase'
import { chatRepository } from '@/infrastructure/repositories/PrismaChatRepository'
import { itineraryRepository } from '@/infrastructure/repositories/PrismaItineraryRepository'
import { usageRepository } from '@/infrastructure/repositories/PrismaUsageRepository'
import { geminiService } from '@/infrastructure/services/gemini/GeminiService'
import { placeValidationService } from '@/infrastructure/services/PlaceValidationService'

/**
 * Create ChatContextBuilder with all dependencies
 */
export function createChatContextBuilder(): ChatContextBuilder {
  return new ChatContextBuilder(chatRepository, itineraryRepository)
}

/**
 * Create ToolExecutor with PlaceValidationService
 */
export function createToolExecutor(): ToolExecutor {
  return new ToolExecutor(placeValidationService)
}

/**
 * Create GeminiService with Function Calling support (ToolExecutor attached)
 */
export function createEnhancedGeminiService() {
  const toolExecutor = createToolExecutor()
  geminiService.setToolExecutor(toolExecutor)
  return geminiService
}

/**
 * Create SendMessageUseCase with enhanced context support
 */
export function createEnhancedSendMessageUseCase(): SendMessageUseCase {
  const contextBuilder = createChatContextBuilder()
  createEnhancedGeminiService() // Attaches ToolExecutor to singleton
  return new SendMessageUseCase(chatRepository, geminiService, usageRepository, contextBuilder)
}

// Re-export helper functions for convenience
export { toProcessableImages, toProcessableTextInputs }
export { imageRepository, textInputRepository }
