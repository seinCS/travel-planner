/**
 * PrismaTextInputRepository Unit Tests
 *
 * Tests for the PrismaTextInputRepository implementation including the new linkToPlace method.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma client
const mockPrisma = {
  textInput: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  placeTextInput: {
    upsert: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

describe('PrismaTextInputRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findPendingByProjectId', () => {
    it('should find pending text inputs for a project', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      const mockTextInputs = [
        { id: 'txt-1', projectId: 'proj-1', status: 'pending', content: 'Tokyo guide' },
        { id: 'txt-2', projectId: 'proj-1', status: 'pending', content: 'Osaka food' },
      ]

      mockPrisma.textInput.findMany.mockResolvedValue(mockTextInputs)

      const repository = new PrismaTextInputRepository()
      const result = await repository.findPendingByProjectId('proj-1')

      expect(mockPrisma.textInput.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1', status: 'pending' },
      })
      expect(result).toEqual(mockTextInputs)
    })
  })

  describe('findById', () => {
    it('should find a text input by id', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      const mockTextInput = { id: 'txt-1', projectId: 'proj-1', content: 'Tokyo guide' }
      mockPrisma.textInput.findUnique.mockResolvedValue(mockTextInput)

      const repository = new PrismaTextInputRepository()
      const result = await repository.findById('txt-1')

      expect(mockPrisma.textInput.findUnique).toHaveBeenCalledWith({
        where: { id: 'txt-1' },
      })
      expect(result).toEqual(mockTextInput)
    })

    it('should return null if text input not found', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      mockPrisma.textInput.findUnique.mockResolvedValue(null)

      const repository = new PrismaTextInputRepository()
      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update text input status to processed', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      const mockUpdatedTextInput = { id: 'txt-1', status: 'processed' }
      mockPrisma.textInput.update.mockResolvedValue(mockUpdatedTextInput)

      const repository = new PrismaTextInputRepository()
      const result = await repository.update('txt-1', {
        status: 'processed',
      })

      expect(mockPrisma.textInput.update).toHaveBeenCalledWith({
        where: { id: 'txt-1' },
        data: {
          status: 'processed',
          errorMessage: null,
        },
      })
      expect(result).toEqual(mockUpdatedTextInput)
    })

    it('should update text input status to failed with error message', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      const mockUpdatedTextInput = { id: 'txt-1', status: 'failed', errorMessage: 'Processing error' }
      mockPrisma.textInput.update.mockResolvedValue(mockUpdatedTextInput)

      const repository = new PrismaTextInputRepository()
      await repository.update('txt-1', {
        status: 'failed',
        errorMessage: 'Processing error',
      })

      expect(mockPrisma.textInput.update).toHaveBeenCalledWith({
        where: { id: 'txt-1' },
        data: {
          status: 'failed',
          errorMessage: 'Processing error',
        },
      })
    })
  })

  describe('resetToPending', () => {
    it('should reset multiple text inputs to pending status', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      mockPrisma.textInput.updateMany.mockResolvedValue({ count: 2 })

      const repository = new PrismaTextInputRepository()
      await repository.resetToPending(['txt-1', 'txt-2'])

      expect(mockPrisma.textInput.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['txt-1', 'txt-2'] } },
        data: { status: 'pending', errorMessage: null },
      })
    })
  })

  describe('linkToPlace', () => {
    it('should create a link between text input and place using upsert', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      mockPrisma.placeTextInput.upsert.mockResolvedValue({ placeId: 'place-1', textInputId: 'txt-1' })

      const repository = new PrismaTextInputRepository()
      await repository.linkToPlace('txt-1', 'place-1')

      expect(mockPrisma.placeTextInput.upsert).toHaveBeenCalledWith({
        where: {
          placeId_textInputId: {
            placeId: 'place-1',
            textInputId: 'txt-1',
          },
        },
        update: {},
        create: {
          placeId: 'place-1',
          textInputId: 'txt-1',
        },
      })
    })

    it('should handle existing link gracefully (upsert behavior)', async () => {
      const { PrismaTextInputRepository } = await import(
        '@/infrastructure/repositories/PrismaTextInputRepository'
      )

      mockPrisma.placeTextInput.upsert.mockResolvedValue({ placeId: 'place-1', textInputId: 'txt-1' })

      const repository = new PrismaTextInputRepository()

      // Should not throw even if link exists
      await expect(repository.linkToPlace('txt-1', 'place-1')).resolves.toBeUndefined()
    })
  })
})
