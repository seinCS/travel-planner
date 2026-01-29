/**
 * Chat Tool Executor
 *
 * Executes Function Calling tool invocations from Gemini.
 * Handles recommend_places, generate_itinerary, and search_nearby_places.
 */

import type { IPlaceValidationService, ValidatedPlace } from '@/domain/interfaces/IPlaceValidationService'
import type { ItineraryPreviewData, RecommendedPlace } from '@/domain/interfaces/ILLMService'
import type { IToolExecutor, ToolExecutionContext, ToolExecutionResult } from '@/domain/interfaces/services/IToolExecutor'
import {
  validateToolArgs,
  type recommendPlacesArgsSchema,
  type generateItineraryArgsSchema,
  type searchNearbyArgsSchema,
} from '@/infrastructure/services/gemini/tools/chatTools'
import { calculateDistance } from '@/lib/google-maps'
import { logger } from '@/lib/logger'
import type { z } from 'zod'

// Re-export for backward compatibility
export type { ToolExecutionContext, ToolExecutionResult as ToolResult } from '@/domain/interfaces/services/IToolExecutor'

type RecommendPlacesArgs = z.infer<typeof recommendPlacesArgsSchema>
type GenerateItineraryArgs = z.infer<typeof generateItineraryArgsSchema>
type SearchNearbyArgs = z.infer<typeof searchNearbyArgsSchema>

// ============================================================
// ToolExecutor
// ============================================================

export class ToolExecutor implements IToolExecutor {
  constructor(
    private readonly placeValidationService: IPlaceValidationService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    // Validate args with Zod
    const validation = validateToolArgs(toolName, args)
    if (!validation.success) {
      logger.warn('Tool args validation failed', { toolName, error: validation.error })
      return { success: false, error: validation.error }
    }

    try {
      switch (toolName) {
        case 'recommend_places':
          return await this.handleRecommendPlaces(validation.data as RecommendPlacesArgs, context)
        case 'generate_itinerary':
          return this.handleGenerateItinerary(validation.data as GenerateItineraryArgs, context)
        case 'search_nearby_places':
          return await this.handleSearchNearby(validation.data as SearchNearbyArgs, context)
        default:
          return { success: false, error: `Unknown tool: ${toolName}` }
      }
    } catch (error) {
      logger.error('Tool execution failed', {
        toolName,
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        success: false,
        error: '도구 실행 중 오류가 발생했습니다.',
      }
    }
  }

  // ============================================================
  // Tool Handlers
  // ============================================================

  private async handleRecommendPlaces(
    args: RecommendPlacesArgs,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    // 1. Validate and enrich with Google Places API
    const validated = await this.placeValidationService.validateAndEnrich(
      args.places,
      context.destination,
      context.country,
    )

    // 2. Filter out already existing places
    const existingNames = new Set(
      context.existingPlaces.map(p => p.name.toLowerCase())
    )
    const filtered = validated.map(place => ({
      ...place,
      alreadyExists: existingNames.has(place.name.toLowerCase()),
    }))

    // 3. Calculate distance from existing places centroid
    const centroid = this.calculateCentroid(context.existingPlaces)
    if (centroid) {
      for (const place of filtered) {
        if (place.latitude && place.longitude) {
          place.distanceFromReference = calculateDistance(
            centroid.lat,
            centroid.lng,
            place.latitude,
            place.longitude,
          )
        }
      }
      // Sort by distance (nearest first)
      filtered.sort((a, b) =>
        (a.distanceFromReference ?? Infinity) - (b.distanceFromReference ?? Infinity)
      )
    }

    return {
      success: true,
      data: {
        places: filtered,
        reasoning: args.reasoning,
      },
    }
  }

  private handleGenerateItinerary(
    args: GenerateItineraryArgs,
    context: ToolExecutionContext,
  ): ToolExecutionResult {
    const existingPlaceNames = new Map(
      context.existingPlaces.map(p => [p.name.toLowerCase(), p])
    )

    const skippedPlaces: string[] = []
    const days = args.days.map(day => ({
      dayNumber: day.dayNumber,
      date: '', // Will be filled by the client based on itinerary start date
      items: day.items
        .map((item, index) => {
          const matchedPlace = existingPlaceNames.get(item.placeName.toLowerCase())
          if (!matchedPlace) {
            skippedPlaces.push(item.placeName)
          }
          return {
            order: index + 1,
            placeName: item.placeName,
            placeNameEn: undefined as string | undefined,
            category: matchedPlace?.category || 'etc',
            startTime: item.startTime,
            duration: item.duration,
            note: item.note,
            matched: !!matchedPlace,
          }
        }),
    }))

    const preview: ItineraryPreviewData = {
      title: args.title,
      days,
    }

    return {
      success: true,
      data: {
        preview,
        skippedPlaces,
        requiresConfirmation: true,
      },
    }
  }

  private async handleSearchNearby(
    args: SearchNearbyArgs,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    // Find reference place coordinates
    const refPlace = context.existingPlaces.find(
      p => p.name.toLowerCase() === args.referencePlaceName.toLowerCase()
    )

    if (!refPlace?.latitude || !refPlace?.longitude) {
      return {
        success: false,
        error: `장소 "${args.referencePlaceName}"의 좌표를 찾을 수 없습니다. 저장된 장소 중에서 선택해주세요.`,
      }
    }

    const nearby = await this.placeValidationService.searchNearby(
      refPlace.latitude,
      refPlace.longitude,
      args.category,
      args.keyword,
      args.maxResults || 3,
    )

    return {
      success: true,
      data: { places: nearby },
    }
  }

  // ============================================================
  // Utilities
  // ============================================================

  private calculateCentroid(
    places: Array<{ latitude?: number; longitude?: number }>
  ): { lat: number; lng: number } | null {
    const withCoords = places.filter(
      (p): p is { latitude: number; longitude: number } =>
        typeof p.latitude === 'number' && typeof p.longitude === 'number'
    )

    if (withCoords.length === 0) return null

    const sumLat = withCoords.reduce((sum, p) => sum + p.latitude, 0)
    const sumLng = withCoords.reduce((sum, p) => sum + p.longitude, 0)

    return {
      lat: sumLat / withCoords.length,
      lng: sumLng / withCoords.length,
    }
  }

  /**
   * Convert ValidatedPlace to RecommendedPlace for streaming
   */
  static toRecommendedPlace(validated: ValidatedPlace): RecommendedPlace {
    return {
      name: validated.name,
      name_en: validated.name_en,
      address: validated.address,
      category: validated.category,
      description: validated.description,
      latitude: validated.latitude,
      longitude: validated.longitude,
    }
  }
}
