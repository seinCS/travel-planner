/**
 * Prisma Image Repository
 *
 * Implements IImageRepository using Prisma ORM.
 */

import { prisma } from '@/lib/db'
import type { Image } from '@/types'
import type { IImageRepository, UpdateImageData } from '@/domain/interfaces/IImageRepository'

export class PrismaImageRepository implements IImageRepository {
  async findPendingByProjectId(projectId: string): Promise<Image[]> {
    const results = await prisma.image.findMany({
      where: { projectId, status: 'pending' },
    })
    return results as Image[]
  }

  async findById(id: string): Promise<Image | null> {
    const result = await prisma.image.findUnique({
      where: { id },
    })
    return result as Image | null
  }

  async update(id: string, data: UpdateImageData): Promise<Image> {
    const result = await prisma.image.update({
      where: { id },
      data: {
        status: data.status,
        rawText: data.rawText,
        errorMessage: data.errorMessage ?? null,
      },
    })
    return result as Image
  }

  async resetToPending(ids: string[]): Promise<void> {
    await prisma.image.updateMany({
      where: { id: { in: ids } },
      data: { status: 'pending', errorMessage: null },
    })
  }
}

/**
 * Default instance for convenience
 */
export const imageRepository = new PrismaImageRepository()
