/**
 * DI Container Unit Tests
 *
 * Tests for the refactored container that uses Repository pattern
 * instead of direct Prisma calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only module first
vi.mock('server-only', () => ({}))

// Mock repositories
const mockImageRepository = {
  findPendingByProjectId: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  resetToPending: vi.fn(),
  linkToPlace: vi.fn(),
}

const mockTextInputRepository = {
  findPendingByProjectId: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  resetToPending: vi.fn(),
  linkToPlace: vi.fn(),
}

const mockPlaceRepository = {
  findByProjectId: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/infrastructure/repositories/PrismaImageRepository', () => ({
  imageRepository: mockImageRepository,
  PrismaImageRepository: vi.fn().mockImplementation(() => mockImageRepository),
}))

vi.mock('@/infrastructure/repositories/PrismaTextInputRepository', () => ({
  textInputRepository: mockTextInputRepository,
  PrismaTextInputRepository: vi.fn().mockImplementation(() => mockTextInputRepository),
}))

vi.mock('@/infrastructure/repositories/PrismaPlaceRepository', () => ({
  placeRepository: mockPlaceRepository,
  PrismaPlaceRepository: vi.fn().mockImplementation(() => mockPlaceRepository),
}))

vi.mock('@/lib/google-maps', () => ({
  geocodePlaceWithFallback: vi.fn(),
}))

vi.mock('@/domain/value-objects/Coordinates', () => ({
  createCoordinates: vi.fn((lat, lng) => ({ latitude: lat, longitude: lng })),
}))

// Mock Use Cases
vi.mock('@/application/use-cases/processing/ProcessImagesUseCase', () => {
  return {
    ProcessImagesUseCase: class MockProcessImagesUseCase {
      imageRepository: unknown
      constructor(repo: unknown) {
        this.imageRepository = repo
      }
      execute = vi.fn()
    },
    toProcessableImages: (images: unknown[]) => images,
  }
})

vi.mock('@/application/use-cases/processing/ProcessTextInputsUseCase', () => {
  return {
    ProcessTextInputsUseCase: class MockProcessTextInputsUseCase {
      textInputRepository: unknown
      constructor(repo: unknown) {
        this.textInputRepository = repo
      }
      execute = vi.fn()
    },
    toProcessableTextInputs: (textInputs: unknown[]) => textInputs,
  }
})

describe('DI Container', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProcessImagesUseCase', () => {
    it('should create ProcessImagesUseCase with imageRepository', async () => {
      const { createProcessImagesUseCase } = await import('@/infrastructure/container')

      const useCase = createProcessImagesUseCase()

      expect(useCase).toBeDefined()
      // Verify the repository was injected by checking the instance property
      expect((useCase as unknown as { imageRepository: unknown }).imageRepository).toBe(mockImageRepository)
    })
  })

  describe('createProcessTextInputsUseCase', () => {
    it('should create ProcessTextInputsUseCase with textInputRepository', async () => {
      const { createProcessTextInputsUseCase } = await import('@/infrastructure/container')

      const useCase = createProcessTextInputsUseCase()

      expect(useCase).toBeDefined()
      // Verify the repository was injected by checking the instance property
      expect((useCase as unknown as { textInputRepository: unknown }).textInputRepository).toBe(mockTextInputRepository)
    })
  })

  describe('createProcessingContext', () => {
    it('should create processing context with project and existing places', async () => {
      const { createProcessingContext } = await import('@/infrastructure/container')
      const { geocodePlaceWithFallback } = await import('@/lib/google-maps')

      const mockProject = {
        id: 'proj-1',
        name: 'Tokyo Trip',
        destination: 'Tokyo',
        country: 'Japan',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        shareToken: null,
      }

      const mockExistingPlaces = [
        { id: 'place-1', name: 'Tokyo Tower', latitude: 35.6586, longitude: 139.7454 },
      ]

      const context = createProcessingContext(mockProject, mockExistingPlaces)

      expect(context.project).toEqual(mockProject)
      expect(context.existingPlaces).toEqual(mockExistingPlaces)
      expect(context.geocodingFetcher).toBe(geocodePlaceWithFallback)
    })
  })

  describe('createPlaceCreator', () => {
    it('should create place creator that uses placeRepository', async () => {
      const { createPlaceCreator } = await import('@/infrastructure/container')

      const mockCreatedPlace = {
        id: 'new-place-1',
        name: 'Senso-ji Temple',
        latitude: 35.7148,
        longitude: 139.7967,
        category: 'temple',
        googlePlaceId: 'google-123',
      }

      mockPlaceRepository.create.mockResolvedValue(mockCreatedPlace)

      const placeCreator = createPlaceCreator()
      const result = await placeCreator.create({
        projectId: 'proj-1',
        name: 'Senso-ji Temple',
        category: 'temple',
        comment: 'Famous temple',
        latitude: 35.7148,
        longitude: 139.7967,
        status: 'auto',
        googlePlaceId: 'google-123',
        formattedAddress: '2-3-1 Asakusa, Tokyo',
        googleMapsUrl: 'https://maps.google.com/?q=Sensoji',
        rating: 4.6,
        userRatingsTotal: 50000,
        priceLevel: null,
      })

      expect(mockPlaceRepository.create).toHaveBeenCalledWith({
        projectId: 'proj-1',
        name: 'Senso-ji Temple',
        category: 'temple',
        comment: 'Famous temple',
        coordinates: { latitude: 35.7148, longitude: 139.7967 },
        googleData: {
          latitude: 35.7148,
          longitude: 139.7967,
          googlePlaceId: 'google-123',
          formattedAddress: '2-3-1 Asakusa, Tokyo',
          googleMapsUrl: 'https://maps.google.com/?q=Sensoji',
          rating: 4.6,
          userRatingsTotal: 50000,
          priceLevel: null,
        },
      })

      expect(result).toEqual({
        id: 'new-place-1',
        name: 'Senso-ji Temple',
        latitude: 35.7148,
        longitude: 139.7967,
        googlePlaceId: 'google-123',
      })
    })
  })

  describe('resetImagesToPending', () => {
    it('should use imageRepository.resetToPending', async () => {
      const { resetImagesToPending } = await import('@/infrastructure/container')

      await resetImagesToPending('proj-1', ['img-1', 'img-2'])

      expect(mockImageRepository.resetToPending).toHaveBeenCalledWith(['img-1', 'img-2'])
    })

    it('should not call repository if imageIds is empty', async () => {
      const { resetImagesToPending } = await import('@/infrastructure/container')

      await resetImagesToPending('proj-1', [])

      expect(mockImageRepository.resetToPending).not.toHaveBeenCalled()
    })
  })

  describe('resetTextInputsToPending', () => {
    it('should use textInputRepository.resetToPending', async () => {
      const { resetTextInputsToPending } = await import('@/infrastructure/container')

      await resetTextInputsToPending('proj-1', ['txt-1', 'txt-2'])

      expect(mockTextInputRepository.resetToPending).toHaveBeenCalledWith(['txt-1', 'txt-2'])
    })

    it('should not call repository if textInputIds is empty', async () => {
      const { resetTextInputsToPending } = await import('@/infrastructure/container')

      await resetTextInputsToPending('proj-1', [])

      expect(mockTextInputRepository.resetToPending).not.toHaveBeenCalled()
    })
  })
})
