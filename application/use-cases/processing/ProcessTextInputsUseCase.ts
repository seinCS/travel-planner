/**
 * Process Text Inputs Use Case
 *
 * Processes text inputs (direct text or URL-extracted text) to extract and geocode places.
 * Extends ProcessItemsBaseUseCase with text-input-specific behavior.
 */

import type { PlaceExtractionResult } from '@/lib/claude'
import { analyzeText } from '@/lib/claude'
import { prisma } from '@/lib/db'
import {
  ProcessItemsBaseUseCase,
  type ProcessableItem,
} from './ProcessItemsBaseUseCase'

interface ProcessableTextInput extends ProcessableItem {
  id: string
  projectId: string
  type: 'text' | 'url'
  content: string
  extractedText: string | null
}

/**
 * Minimal type for Prisma TextInput result
 */
interface PrismaTextInput {
  id: string
  projectId: string
  type: string
  content: string
  extractedText: string | null
}

export class ProcessTextInputsUseCase extends ProcessItemsBaseUseCase<ProcessableTextInput> {
  protected getItemTypeName(): 'images' | 'text inputs' {
    return 'text inputs'
  }

  protected getLogPrefix(): string {
    return 'Process Text'
  }

  protected getAnalysisErrorMessage(): string {
    return '텍스트 분석 중 오류가 발생했습니다.'
  }

  protected getTextToAnalyze(item: ProcessableTextInput): string | null {
    // URL type uses extractedText, text type uses content
    return item.type === 'url' ? item.extractedText : item.content
  }

  protected async analyze(
    text: string,
    destination: string,
    country: string
  ): Promise<PlaceExtractionResult> {
    return analyzeText(text, destination, country)
  }

  protected async linkItemToPlace(textInputId: string, placeId: string): Promise<void> {
    await prisma.placeTextInput.upsert({
      where: {
        placeId_textInputId: {
          placeId,
          textInputId,
        },
      },
      update: {},
      create: {
        placeId,
        textInputId,
      },
    })
  }

  protected async updateItemStatus(
    item: ProcessableTextInput,
    status: 'processed' | 'failed',
    _rawText?: string,
    errorMessage?: string
  ): Promise<void> {
    // TextInput doesn't have rawText field
    await prisma.textInput.update({
      where: { id: item.id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
      },
    })
  }
}

/**
 * Helper function to convert Prisma TextInput[] to ProcessableTextInput[]
 */
export function toProcessableTextInputs(textInputs: PrismaTextInput[]): ProcessableTextInput[] {
  return textInputs.map((ti) => ({
    id: ti.id,
    projectId: ti.projectId,
    type: ti.type as 'text' | 'url',
    content: ti.content,
    extractedText: ti.extractedText,
  }))
}
