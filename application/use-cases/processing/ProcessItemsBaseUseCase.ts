/**
 * Process Items Base Use Case (Template Method Pattern)
 *
 * Base class for processing items (images or text inputs) with shared logic:
 * 1. Parallel Claude API analysis
 * 2. Sequential result processing with duplicate detection
 * 3. Geocoding with caching
 * 4. Place creation/linking
 *
 * Subclasses implement:
 * - getTextToAnalyze(): Extract text from item
 * - linkItemToPlace(): Link item to place (placeImage or placeTextInput)
 * - updateItemStatus(): Update item status after processing
 */

import type { Project } from '@/types'
import type { ExtractedPlace, PlaceExtractionResult } from '@/lib/claude'
import { DuplicateDetectionService } from '@/application/services/DuplicateDetectionService'
import { GeocodingCacheService, type GeocodingFetcher } from '@/application/services/GeocodingCacheService'
import { createCoordinates } from '@/domain/value-objects/Coordinates'
import { createProcessingResult, createEmptyResult, type ProcessingResultDTO } from '@/application/dto/ProcessingResultDTO'

/**
 * Minimal place type for duplicate detection
 * More permissive than the full Place type to accept Prisma results
 */
export interface ExistingPlace {
  id: string
  name: string
  latitude: number
  longitude: number
  googlePlaceId?: string | null
}

export interface ProcessableItem {
  id: string
  projectId: string
}

export interface AnalysisResultWithItem<T extends ProcessableItem> {
  item: T
  analysisResult: PlaceExtractionResult | null
  error: Error | null
}

export interface ProcessingContext {
  project: Project
  existingPlaces: ExistingPlace[]
  geocodingFetcher: GeocodingFetcher
}

export interface PlaceCreator {
  create(data: {
    projectId: string
    name: string
    category: string
    comment: string | null
    latitude: number
    longitude: number
    status: string
    googlePlaceId?: string | null
    formattedAddress?: string | null
    googleMapsUrl?: string | null
    rating?: number | null
    userRatingsTotal?: number | null
    priceLevel?: number | null
  }): Promise<ExistingPlace>
}

export abstract class ProcessItemsBaseUseCase<T extends ProcessableItem> {
  protected readonly duplicateService: DuplicateDetectionService
  protected readonly geocodingCache: GeocodingCacheService
  protected readonly confidenceThreshold: number

  constructor(confidenceThreshold: number = 0.5) {
    this.duplicateService = new DuplicateDetectionService()
    this.geocodingCache = new GeocodingCacheService()
    this.confidenceThreshold = confidenceThreshold
  }

  /**
   * Main entry point - process all pending items
   */
  async execute(
    pendingItems: T[],
    context: ProcessingContext,
    placeCreator: PlaceCreator
  ): Promise<ProcessingResultDTO> {
    if (pendingItems.length === 0) {
      return createEmptyResult(this.getItemTypeName())
    }

    console.log(`[${this.getLogPrefix()}] Starting analysis for ${pendingItems.length} items`)

    // Step 1: Parallel Claude API analysis
    const analysisResults = await this.analyzeAllItems(pendingItems, context)

    // Step 2: Sequential result processing
    const { processed, failed } = await this.processAllResults(
      analysisResults,
      context,
      placeCreator
    )

    return createProcessingResult(pendingItems.length, processed, failed)
  }

  /**
   * Parallel analysis of all items
   */
  private async analyzeAllItems(
    items: T[],
    context: ProcessingContext
  ): Promise<AnalysisResultWithItem<T>[]> {
    const analysisPromises = items.map(async (item) => {
      try {
        const textToAnalyze = this.getTextToAnalyze(item)
        if (!textToAnalyze) {
          return { item, analysisResult: null, error: new Error('No text to analyze') }
        }

        console.log(`[${this.getLogPrefix()}] Analyzing item: ${item.id}`)
        const analysisResult = await this.analyze(
          textToAnalyze,
          context.project.destination,
          context.project.country || ''
        )
        console.log(`[${this.getLogPrefix()}] Analysis result for ${item.id}:`, JSON.stringify(analysisResult, null, 2))
        return { item, analysisResult, error: null }
      } catch (error) {
        console.error(`[${this.getLogPrefix()}] Error analyzing item:`, item.id, error)
        return { item, analysisResult: null, error: error as Error }
      }
    })

    return Promise.all(analysisPromises)
  }

  /**
   * Sequential processing of all analysis results
   */
  private async processAllResults(
    results: AnalysisResultWithItem<T>[],
    context: ProcessingContext,
    placeCreator: PlaceCreator
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0
    let failed = 0
    const existingPlaces = [...context.existingPlaces]

    for (const { item, analysisResult, error } of results) {
      try {
        // Handle analysis errors
        if (error || !analysisResult) {
          await this.updateItemStatus(item, 'failed', undefined, this.getAnalysisErrorMessage())
          failed++
          continue
        }

        // Handle no places found
        if (!analysisResult.places || analysisResult.places.length === 0) {
          console.log(`[${this.getLogPrefix()}] No places found for ${item.id}`)
          await this.updateItemStatus(item, 'failed', analysisResult.raw_text, '장소를 인식할 수 없습니다.')
          failed++
          continue
        }

        // Process each place
        const { successCount, errorMessage, newPlaces } = await this.processPlaces(
          item,
          analysisResult.places,
          existingPlaces,
          context,
          placeCreator
        )

        // Add new places to existing list for subsequent duplicate detection
        existingPlaces.push(...newPlaces)

        // Update item status
        if (successCount > 0) {
          await this.updateItemStatus(item, 'processed', analysisResult.raw_text)
          console.log(`[${this.getLogPrefix()}] Item ${item.id} processed with ${successCount} places`)
          processed++
        } else {
          await this.updateItemStatus(item, 'failed', analysisResult.raw_text, errorMessage || '유효한 장소를 찾을 수 없습니다.')
          console.log(`[${this.getLogPrefix()}] Item ${item.id} failed - no valid places`)
          failed++
        }
      } catch (err) {
        console.error(`Error processing item:`, item.id, err)
        await this.updateItemStatus(item, 'failed', undefined, '처리 중 오류가 발생했습니다.')
        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * Process extracted places for a single item
   */
  private async processPlaces(
    item: T,
    places: ExtractedPlace[],
    existingPlaces: ExistingPlace[],
    context: ProcessingContext,
    placeCreator: PlaceCreator
  ): Promise<{ successCount: number; errorMessage: string; newPlaces: ExistingPlace[] }> {
    const placesInThisItem = new Set<string>()
    let successCount = 0
    let errorMessage = ''
    const newPlaces: ExistingPlace[] = []

    console.log(`[${this.getLogPrefix()}] Processing ${places.length} places for item ${item.id}`)

    for (let i = 0; i < places.length; i++) {
      const place = places[i]
      console.log(`[${this.getLogPrefix()}] Processing place ${i + 1}/${places.length}: ${place.place_name}`)

      // Confidence check
      if (place.confidence < this.confidenceThreshold) {
        console.log(`[${this.getLogPrefix()}] Low confidence for ${place.place_name}: ${place.confidence}`)
        continue
      }

      // Same-item duplicate check
      const placeNameLower = place.place_name.toLowerCase()
      if (placesInThisItem.has(placeNameLower)) {
        console.log(`[${this.getLogPrefix()}] Duplicate within same item: ${place.place_name}`)
        continue
      }

      // Geocoding with cache
      const geoResult = await this.geocodingCache.getOrFetch(
        place.place_name,
        place.place_name_en,
        context.project.destination,
        context.project.country || undefined,
        context.geocodingFetcher
      )

      if (!geoResult) {
        console.log(`[${this.getLogPrefix()}] Geocoding failed for: ${place.place_name}`)
        errorMessage = '일부 장소의 위치를 찾을 수 없습니다.'
        continue
      }

      console.log(`[${this.getLogPrefix()}] Geocoding success: ${geoResult.latitude}, ${geoResult.longitude}`)

      // Project-level duplicate detection
      const coordinates = createCoordinates(geoResult.latitude, geoResult.longitude)
      const { isDuplicate, existingPlace } = this.duplicateService.findDuplicate(
        existingPlaces,
        place.place_name,
        geoResult.googlePlaceId,
        coordinates
      )

      if (isDuplicate && existingPlace) {
        // Link to existing place
        console.log(`[${this.getLogPrefix()}] Duplicate found: ${existingPlace.name}, linking item`)
        await this.linkItemToPlace(item.id, existingPlace.id)
      } else {
        // Create new place
        console.log(`[${this.getLogPrefix()}] Creating new place: ${place.place_name}`)
        const newPlace = await placeCreator.create({
          projectId: item.projectId,
          name: place.place_name,
          category: place.category,
          comment: place.comment,
          latitude: geoResult.latitude,
          longitude: geoResult.longitude,
          status: 'auto',
          googlePlaceId: geoResult.googlePlaceId,
          formattedAddress: geoResult.formattedAddress,
          googleMapsUrl: geoResult.googleMapsUrl,
          rating: geoResult.rating,
          userRatingsTotal: geoResult.userRatingsTotal,
          priceLevel: geoResult.priceLevel,
        })

        console.log(`[${this.getLogPrefix()}] Place created: ${newPlace.id}`)
        await this.linkItemToPlace(item.id, newPlace.id)
        newPlaces.push(newPlace)
      }

      placesInThisItem.add(placeNameLower)
      successCount++
    }

    return { successCount, errorMessage, newPlaces }
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Get the type name for logging and messages
   */
  protected abstract getItemTypeName(): 'images' | 'text inputs'

  /**
   * Get log prefix for console output
   */
  protected abstract getLogPrefix(): string

  /**
   * Get error message for analysis failures
   */
  protected abstract getAnalysisErrorMessage(): string

  /**
   * Extract text to analyze from the item
   */
  protected abstract getTextToAnalyze(item: T): string | null

  /**
   * Call the appropriate Claude analysis function
   */
  protected abstract analyze(
    text: string,
    destination: string,
    country: string
  ): Promise<PlaceExtractionResult>

  /**
   * Link the item to a place (placeImage or placeTextInput)
   */
  protected abstract linkItemToPlace(itemId: string, placeId: string): Promise<void>

  /**
   * Update the item's processing status
   */
  protected abstract updateItemStatus(
    item: T,
    status: 'processed' | 'failed',
    rawText?: string,
    errorMessage?: string
  ): Promise<void>
}
