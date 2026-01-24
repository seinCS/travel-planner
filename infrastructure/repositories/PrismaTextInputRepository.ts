/**
 * Prisma TextInput Repository
 *
 * Implements ITextInputRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type { TextInput } from '@/types'
import type { ITextInputRepository, UpdateTextInputData } from '@/domain/interfaces/ITextInputRepository'

export class PrismaTextInputRepository implements ITextInputRepository {
  async findPendingByProjectId(projectId: string): Promise<TextInput[]> {
    const results = await prisma.textInput.findMany({
      where: { projectId, status: 'pending' },
    })
    return results as TextInput[]
  }

  async findById(id: string): Promise<TextInput | null> {
    const result = await prisma.textInput.findUnique({
      where: { id },
    })
    return result as TextInput | null
  }

  async update(id: string, data: UpdateTextInputData): Promise<TextInput> {
    const result = await prisma.textInput.update({
      where: { id },
      data: {
        status: data.status,
        errorMessage: data.errorMessage ?? null,
      },
    })
    return result as TextInput
  }

  async resetToPending(ids: string[]): Promise<void> {
    await prisma.textInput.updateMany({
      where: { id: { in: ids } },
      data: { status: 'pending', errorMessage: null },
    })
  }
}

/**
 * Default instance for convenience
 */
export const textInputRepository = new PrismaTextInputRepository()
