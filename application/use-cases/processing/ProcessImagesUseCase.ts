/**
 * Process Images Use Case
 *
 * Processes uploaded images to extract and geocode places.
 * Extends ProcessItemsBaseUseCase with image-specific behavior.
 */

import type { PlaceExtractionResult } from '@/lib/claude'
import { analyzeImage } from '@/lib/claude'
import { prisma } from '@/lib/db'
import {
  ProcessItemsBaseUseCase,
  type ProcessableItem,
} from './ProcessItemsBaseUseCase'

interface ProcessableImage extends ProcessableItem {
  id: string
  projectId: string
  url: string
}

/**
 * Minimal type for Prisma Image result
 */
interface PrismaImage {
  id: string
  projectId: string
  url: string
}

export class ProcessImagesUseCase extends ProcessItemsBaseUseCase<ProcessableImage> {
  protected getItemTypeName(): 'images' | 'text inputs' {
    return 'images'
  }

  protected getLogPrefix(): string {
    return 'Process Images'
  }

  protected getAnalysisErrorMessage(): string {
    return '이미지 분석 중 오류가 발생했습니다.'
  }

  protected getTextToAnalyze(item: ProcessableImage): string | null {
    // For images, we pass the URL to Claude Vision
    return item.url
  }

  protected async analyze(
    imageUrl: string,
    destination: string,
    country: string
  ): Promise<PlaceExtractionResult> {
    return analyzeImage(imageUrl, destination, country)
  }

  protected async linkItemToPlace(imageId: string, placeId: string): Promise<void> {
    await prisma.placeImage.upsert({
      where: {
        placeId_imageId: {
          placeId,
          imageId,
        },
      },
      update: {},
      create: {
        placeId,
        imageId,
      },
    })
  }

  protected async updateItemStatus(
    item: ProcessableImage,
    status: 'processed' | 'failed',
    rawText?: string,
    errorMessage?: string
  ): Promise<void> {
    await prisma.image.update({
      where: { id: item.id },
      data: {
        status,
        rawText: rawText ?? undefined,
        errorMessage: errorMessage ?? null,
      },
    })
  }
}

/**
 * Helper function to convert Prisma Image[] to ProcessableImage[]
 */
export function toProcessableImages(images: PrismaImage[]): ProcessableImage[] {
  return images.map((img) => ({
    id: img.id,
    projectId: img.projectId,
    url: img.url,
  }))
}
