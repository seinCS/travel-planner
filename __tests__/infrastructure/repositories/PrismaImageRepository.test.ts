/**
 * PrismaImageRepository Unit Tests
 *
 * Tests for the PrismaImageRepository implementation including the new linkToPlace method.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma client
const mockPrisma = {
  image: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  placeImage: {
    upsert: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

describe('PrismaImageRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findPendingByProjectId', () => {
    it('should find pending images for a project', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      const mockImages = [
        { id: 'img-1', projectId: 'proj-1', status: 'pending', url: 'https://example.com/1.jpg' },
        { id: 'img-2', projectId: 'proj-1', status: 'pending', url: 'https://example.com/2.jpg' },
      ]

      mockPrisma.image.findMany.mockResolvedValue(mockImages)

      const repository = new PrismaImageRepository()
      const result = await repository.findPendingByProjectId('proj-1')

      expect(mockPrisma.image.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1', status: 'pending' },
      })
      expect(result).toEqual(mockImages)
    })
  })

  describe('findById', () => {
    it('should find an image by id', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      const mockImage = { id: 'img-1', projectId: 'proj-1', url: 'https://example.com/1.jpg' }
      mockPrisma.image.findUnique.mockResolvedValue(mockImage)

      const repository = new PrismaImageRepository()
      const result = await repository.findById('img-1')

      expect(mockPrisma.image.findUnique).toHaveBeenCalledWith({
        where: { id: 'img-1' },
      })
      expect(result).toEqual(mockImage)
    })

    it('should return null if image not found', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      mockPrisma.image.findUnique.mockResolvedValue(null)

      const repository = new PrismaImageRepository()
      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update image status to processed', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      const mockUpdatedImage = { id: 'img-1', status: 'processed', rawText: 'analyzed text' }
      mockPrisma.image.update.mockResolvedValue(mockUpdatedImage)

      const repository = new PrismaImageRepository()
      const result = await repository.update('img-1', {
        status: 'processed',
        rawText: 'analyzed text',
      })

      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: 'img-1' },
        data: {
          status: 'processed',
          rawText: 'analyzed text',
          errorMessage: null,
        },
      })
      expect(result).toEqual(mockUpdatedImage)
    })

    it('should update image status to failed with error message', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      const mockUpdatedImage = { id: 'img-1', status: 'failed', errorMessage: 'Analysis error' }
      mockPrisma.image.update.mockResolvedValue(mockUpdatedImage)

      const repository = new PrismaImageRepository()
      await repository.update('img-1', {
        status: 'failed',
        errorMessage: 'Analysis error',
      })

      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: 'img-1' },
        data: {
          status: 'failed',
          rawText: undefined,
          errorMessage: 'Analysis error',
        },
      })
    })
  })

  describe('resetToPending', () => {
    it('should reset multiple images to pending status', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      mockPrisma.image.updateMany.mockResolvedValue({ count: 3 })

      const repository = new PrismaImageRepository()
      await repository.resetToPending(['img-1', 'img-2', 'img-3'])

      expect(mockPrisma.image.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['img-1', 'img-2', 'img-3'] } },
        data: { status: 'pending', errorMessage: null },
      })
    })
  })

  describe('linkToPlace', () => {
    it('should create a link between image and place using upsert', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      mockPrisma.placeImage.upsert.mockResolvedValue({ placeId: 'place-1', imageId: 'img-1' })

      const repository = new PrismaImageRepository()
      await repository.linkToPlace('img-1', 'place-1')

      expect(mockPrisma.placeImage.upsert).toHaveBeenCalledWith({
        where: {
          placeId_imageId: {
            placeId: 'place-1',
            imageId: 'img-1',
          },
        },
        update: {},
        create: {
          placeId: 'place-1',
          imageId: 'img-1',
        },
      })
    })

    it('should handle existing link gracefully (upsert behavior)', async () => {
      const { PrismaImageRepository } = await import(
        '@/infrastructure/repositories/PrismaImageRepository'
      )

      // Upsert returns the existing record when it already exists
      mockPrisma.placeImage.upsert.mockResolvedValue({ placeId: 'place-1', imageId: 'img-1' })

      const repository = new PrismaImageRepository()

      // Should not throw even if link exists
      await expect(repository.linkToPlace('img-1', 'place-1')).resolves.toBeUndefined()
    })
  })
})
