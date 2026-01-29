/**
 * ProcessImagesUseCase Unit Tests
 *
 * Tests for the refactored ProcessImagesUseCase that uses Repository pattern
 * instead of direct Prisma calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IImageRepository } from '@/domain/interfaces/IImageRepository'

// Mock the claude module
vi.mock('@/lib/claude', () => ({
  analyzeImage: vi.fn(),
}))

// Mock the base use case dependencies
vi.mock('@/application/services/DuplicateDetectionService', () => {
  return {
    DuplicateDetectionService: class MockDuplicateDetectionService {
      findDuplicate() {
        return { isDuplicate: false, existingPlace: null }
      }
    },
  }
})

vi.mock('@/application/services/GeocodingCacheService', () => {
  return {
    GeocodingCacheService: class MockGeocodingCacheService {
      async getOrFetch() {
        return {
          latitude: 35.6762,
          longitude: 139.6503,
          googlePlaceId: 'mock-place-id',
          formattedAddress: 'Tokyo, Japan',
          googleMapsUrl: 'https://maps.google.com/?q=Tokyo',
          rating: 4.5,
          userRatingsTotal: 1000,
          priceLevel: 2,
        }
      }
    },
  }
})

vi.mock('@/domain/value-objects/Coordinates', () => ({
  createCoordinates: vi.fn((lat, lng) => ({ latitude: lat, longitude: lng })),
}))

vi.mock('@/application/dto/ProcessingResultDTO', () => ({
  createProcessingResult: vi.fn((total, processed, failed) => ({ total, processed, failed })),
  createEmptyResult: vi.fn((type) => ({ total: 0, processed: 0, failed: 0, type })),
}))

describe('ProcessImagesUseCase', () => {
  let mockImageRepository: IImageRepository

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock repository
    mockImageRepository = {
      findPendingByProjectId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      resetToPending: vi.fn(),
      linkToPlace: vi.fn(),
    }
  })

  describe('constructor', () => {
    it('should accept IImageRepository as dependency', async () => {
      // Dynamic import to avoid hoisting issues
      const { ProcessImagesUseCase } = await import(
        '@/application/use-cases/processing/ProcessImagesUseCase'
      )

      const useCase = new ProcessImagesUseCase(mockImageRepository)
      expect(useCase).toBeDefined()
    })

    it('should accept optional confidence threshold', async () => {
      const { ProcessImagesUseCase } = await import(
        '@/application/use-cases/processing/ProcessImagesUseCase'
      )

      const useCase = new ProcessImagesUseCase(mockImageRepository, 0.7)
      expect(useCase).toBeDefined()
    })
  })

  describe('linkItemToPlace', () => {
    it('should call imageRepository.linkToPlace with correct arguments', async () => {
      const { ProcessImagesUseCase } = await import(
        '@/application/use-cases/processing/ProcessImagesUseCase'
      )

      const useCase = new ProcessImagesUseCase(mockImageRepository)

      // Access protected method via type assertion for testing
      const linkMethod = (useCase as unknown as { linkItemToPlace: (imageId: string, placeId: string) => Promise<void> }).linkItemToPlace.bind(useCase)

      await linkMethod('image-123', 'place-456')

      expect(mockImageRepository.linkToPlace).toHaveBeenCalledWith('image-123', 'place-456')
      expect(mockImageRepository.linkToPlace).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateItemStatus', () => {
    it('should call imageRepository.update for processed status', async () => {
      const { ProcessImagesUseCase } = await import(
        '@/application/use-cases/processing/ProcessImagesUseCase'
      )

      const useCase = new ProcessImagesUseCase(mockImageRepository)

      // Access protected method via type assertion for testing
      const updateMethod = (useCase as unknown as {
        updateItemStatus: (item: { id: string; projectId: string; url: string }, status: string, rawText?: string, errorMessage?: string) => Promise<void>
      }).updateItemStatus.bind(useCase)

      const mockItem = { id: 'image-123', projectId: 'project-456', url: 'https://example.com/image.jpg' }
      await updateMethod(mockItem, 'processed', 'raw text content')

      expect(mockImageRepository.update).toHaveBeenCalledWith('image-123', {
        status: 'processed',
        rawText: 'raw text content',
        errorMessage: null,
      })
    })

    it('should call imageRepository.update for failed status with error message', async () => {
      const { ProcessImagesUseCase } = await import(
        '@/application/use-cases/processing/ProcessImagesUseCase'
      )

      const useCase = new ProcessImagesUseCase(mockImageRepository)

      const updateMethod = (useCase as unknown as {
        updateItemStatus: (item: { id: string; projectId: string; url: string }, status: string, rawText?: string, errorMessage?: string) => Promise<void>
      }).updateItemStatus.bind(useCase)

      const mockItem = { id: 'image-123', projectId: 'project-456', url: 'https://example.com/image.jpg' }
      await updateMethod(mockItem, 'failed', undefined, 'Analysis failed')

      expect(mockImageRepository.update).toHaveBeenCalledWith('image-123', {
        status: 'failed',
        rawText: undefined,
        errorMessage: 'Analysis failed',
      })
    })
  })

  describe('toProcessableImages helper', () => {
    it('should convert Prisma images to ProcessableImage format', async () => {
      const { toProcessableImages } = await import(
        '@/application/use-cases/processing/ProcessImagesUseCase'
      )

      const prismaImages = [
        { id: 'img-1', projectId: 'proj-1', url: 'https://example.com/1.jpg' },
        { id: 'img-2', projectId: 'proj-1', url: 'https://example.com/2.jpg' },
      ]

      const result = toProcessableImages(prismaImages)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'img-1',
        projectId: 'proj-1',
        url: 'https://example.com/1.jpg',
      })
    })
  })
})
