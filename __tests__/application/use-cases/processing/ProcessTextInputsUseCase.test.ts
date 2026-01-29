/**
 * ProcessTextInputsUseCase Unit Tests
 *
 * Tests for the refactored ProcessTextInputsUseCase that uses Repository pattern
 * instead of direct Prisma calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ITextInputRepository } from '@/domain/interfaces/ITextInputRepository'

// Mock the claude module
vi.mock('@/lib/claude', () => ({
  analyzeText: vi.fn(),
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

describe('ProcessTextInputsUseCase', () => {
  let mockTextInputRepository: ITextInputRepository

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock repository
    mockTextInputRepository = {
      findPendingByProjectId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      resetToPending: vi.fn(),
      linkToPlace: vi.fn(),
    }
  })

  describe('constructor', () => {
    it('should accept ITextInputRepository as dependency', async () => {
      const { ProcessTextInputsUseCase } = await import(
        '@/application/use-cases/processing/ProcessTextInputsUseCase'
      )

      const useCase = new ProcessTextInputsUseCase(mockTextInputRepository)
      expect(useCase).toBeDefined()
    })

    it('should accept optional confidence threshold', async () => {
      const { ProcessTextInputsUseCase } = await import(
        '@/application/use-cases/processing/ProcessTextInputsUseCase'
      )

      const useCase = new ProcessTextInputsUseCase(mockTextInputRepository, 0.8)
      expect(useCase).toBeDefined()
    })
  })

  describe('linkItemToPlace', () => {
    it('should call textInputRepository.linkToPlace with correct arguments', async () => {
      const { ProcessTextInputsUseCase } = await import(
        '@/application/use-cases/processing/ProcessTextInputsUseCase'
      )

      const useCase = new ProcessTextInputsUseCase(mockTextInputRepository)

      // Access protected method via type assertion for testing
      const linkMethod = (useCase as unknown as {
        linkItemToPlace: (textInputId: string, placeId: string) => Promise<void>
      }).linkItemToPlace.bind(useCase)

      await linkMethod('text-input-123', 'place-456')

      expect(mockTextInputRepository.linkToPlace).toHaveBeenCalledWith('text-input-123', 'place-456')
      expect(mockTextInputRepository.linkToPlace).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateItemStatus', () => {
    it('should call textInputRepository.update for processed status', async () => {
      const { ProcessTextInputsUseCase } = await import(
        '@/application/use-cases/processing/ProcessTextInputsUseCase'
      )

      const useCase = new ProcessTextInputsUseCase(mockTextInputRepository)

      const updateMethod = (useCase as unknown as {
        updateItemStatus: (item: { id: string; projectId: string; content: string }, status: string, rawText?: string, errorMessage?: string) => Promise<void>
      }).updateItemStatus.bind(useCase)

      const mockItem = { id: 'text-123', projectId: 'project-456', content: 'Test content' }
      await updateMethod(mockItem, 'processed')

      expect(mockTextInputRepository.update).toHaveBeenCalledWith('text-123', {
        status: 'processed',
        errorMessage: null,
      })
    })

    it('should call textInputRepository.update for failed status with error message', async () => {
      const { ProcessTextInputsUseCase } = await import(
        '@/application/use-cases/processing/ProcessTextInputsUseCase'
      )

      const useCase = new ProcessTextInputsUseCase(mockTextInputRepository)

      const updateMethod = (useCase as unknown as {
        updateItemStatus: (item: { id: string; projectId: string; content: string }, status: string, rawText?: string, errorMessage?: string) => Promise<void>
      }).updateItemStatus.bind(useCase)

      const mockItem = { id: 'text-123', projectId: 'project-456', content: 'Test content' }
      await updateMethod(mockItem, 'failed', undefined, 'Processing failed')

      expect(mockTextInputRepository.update).toHaveBeenCalledWith('text-123', {
        status: 'failed',
        errorMessage: 'Processing failed',
      })
    })
  })

  describe('toProcessableTextInputs helper', () => {
    it('should convert Prisma text inputs to ProcessableTextInput format', async () => {
      const { toProcessableTextInputs } = await import(
        '@/application/use-cases/processing/ProcessTextInputsUseCase'
      )

      const prismaTextInputs = [
        { id: 'txt-1', projectId: 'proj-1', type: 'text', content: 'Tokyo travel guide', extractedText: null },
        { id: 'txt-2', projectId: 'proj-1', type: 'url', content: 'https://example.com', extractedText: 'Osaka food tour' },
      ]

      const result = toProcessableTextInputs(prismaTextInputs)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'txt-1',
        projectId: 'proj-1',
        type: 'text',
        content: 'Tokyo travel guide',
        extractedText: null,
      })
      expect(result[1].type).toBe('url')
      expect(result[1].extractedText).toBe('Osaka food tour')
    })
  })
})
