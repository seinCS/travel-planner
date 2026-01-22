/**
 * Analysis Service Interface
 *
 * Abstract interface for AI-powered place extraction.
 */

import type { PlaceCategory } from '@/infrastructure/services/claude/prompts'

export interface ExtractedPlaceData {
  place_name: string
  place_name_en: string | null
  category: PlaceCategory
  comment: string | null
  confidence: number
}

export interface AnalysisResult {
  places: ExtractedPlaceData[]
  raw_text: string
}

export interface IAnalysisService {
  analyzeImage(imageUrl: string, destination: string, country: string): Promise<AnalysisResult>
  analyzeText(text: string, destination: string, country: string): Promise<AnalysisResult>
}
