/**
 * IToolExecutor Interface Unit Tests
 *
 * Tests for the IToolExecutor interface and type definitions.
 * This validates the interface structure for dependency inversion.
 */

import { describe, it, expect } from 'vitest'
import type {
  IToolExecutor,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@/domain/interfaces/services/IToolExecutor'

describe('IToolExecutor Interface', () => {
  describe('ToolExecutionContext type', () => {
    it('should accept valid context with required fields', () => {
      const context: ToolExecutionContext = {
        projectId: 'proj-123',
        userId: 'user-456',
        existingPlaces: [],
        destination: 'Tokyo',
      }

      expect(context.projectId).toBe('proj-123')
      expect(context.userId).toBe('user-456')
      expect(context.destination).toBe('Tokyo')
      expect(context.existingPlaces).toEqual([])
    })

    it('should accept context with optional itineraryId', () => {
      const context: ToolExecutionContext = {
        projectId: 'proj-123',
        userId: 'user-456',
        existingPlaces: [{ name: 'Tokyo Tower', category: 'landmark' }],
        destination: 'Tokyo',
        country: 'Japan',
        itineraryId: 'itin-789',
      }

      expect(context.itineraryId).toBe('itin-789')
      expect(context.country).toBe('Japan')
    })
  })

  describe('ToolExecutionResult type', () => {
    it('should represent successful result', () => {
      const result: ToolExecutionResult = {
        success: true,
        data: { places: ['Tokyo Tower', 'Senso-ji'] },
      }

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ places: ['Tokyo Tower', 'Senso-ji'] })
      expect(result.error).toBeUndefined()
    })

    it('should represent failed result', () => {
      const result: ToolExecutionResult = {
        success: false,
        error: 'Tool execution failed',
      }

      expect(result.success).toBe(false)
      expect(result.error).toBe('Tool execution failed')
      expect(result.data).toBeUndefined()
    })
  })

  describe('IToolExecutor interface', () => {
    it('should be implementable with execute method', () => {
      // Mock implementation
      const mockToolExecutor: IToolExecutor = {
        execute: async (toolName, args, context) => {
          return {
            success: true,
            data: { toolName, args, context },
          }
        },
      }

      expect(mockToolExecutor.execute).toBeDefined()
      expect(typeof mockToolExecutor.execute).toBe('function')
    })

    it('should allow async execute method', async () => {
      const mockToolExecutor: IToolExecutor = {
        execute: async (toolName: string, args: Record<string, unknown>, context: ToolExecutionContext) => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10))
          return {
            success: true,
            data: { executed: toolName, projectId: context.projectId },
          }
        },
      }

      const result = await mockToolExecutor.execute(
        'add_place',
        { name: 'Tokyo Tower' },
        { projectId: 'proj-1', userId: 'user-1', existingPlaces: [], destination: 'Tokyo' }
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        executed: 'add_place',
        projectId: 'proj-1',
      })
    })
  })
})
