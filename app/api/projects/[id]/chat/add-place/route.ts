/**
 * Add Place from Chat API Route
 *
 * POST /api/projects/[id]/chat/add-place - Add a recommended place to the project
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkProjectAccess } from '@/lib/project-auth'
import { prisma } from '@/lib/db'
import { geocodePlaceWithFallback } from '@/lib/google-maps'
import { logger } from '@/lib/logger'
import { createChatError } from '@/lib/constants/chat-errors'
import type { RecommendedPlace } from '@/domain/interfaces/ILLMService'

export const runtime = 'nodejs'

interface AddPlaceRequestBody {
  place: RecommendedPlace
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // 1. Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json(createChatError('UNAUTHORIZED'), { status: 401 })
    }

    const userId = session.user.id

    // 2. Project access check
    const accessResult = await checkProjectAccess(projectId, userId)
    if (!accessResult.hasAccess || !accessResult.project) {
      return Response.json(createChatError('NO_ACCESS'), { status: 403 })
    }

    // 3. Parse and validate request body
    const body: AddPlaceRequestBody = await request.json()
    const { place } = body

    if (!place || !place.name || !place.category) {
      return Response.json(createChatError('INVALID_REQUEST'), { status: 400 })
    }

    // Input validation and sanitization
    const MAX_NAME_LENGTH = 200
    const MAX_ADDRESS_LENGTH = 500
    const MAX_DESCRIPTION_LENGTH = 1000
    const VALID_CATEGORIES = ['restaurant', 'cafe', 'attraction', 'shopping', 'accommodation', 'transport', 'etc']

    /**
     * Sanitize string by removing potentially harmful characters
     * while preserving international characters (Korean, Chinese, Japanese, etc.)
     *
     * Note: Prisma ORM provides SQL injection protection, but we add extra
     * sanitization as defense-in-depth.
     */
    const sanitizeString = (str: string, maxLength: number): string => {
      return str
        // Normalize Unicode to canonical form (NFC) - handles lookalike characters
        .normalize('NFC')
        // Remove null bytes and other control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove SQL special characters (minimal set to preserve apostrophes in names)
        // Note: Prisma parameterizes queries, so this is extra precaution
        .replace(/[;\\`]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
    }

    // Validate and sanitize place name
    const sanitizedName = sanitizeString(place.name, MAX_NAME_LENGTH)
    if (sanitizedName.length === 0) {
      return Response.json(createChatError('INVALID_REQUEST'), { status: 400 })
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(place.category)) {
      return Response.json(
        { error: { code: 'INVALID_CATEGORY', message: '유효하지 않은 카테고리입니다.' } },
        { status: 400 }
      )
    }

    // Sanitize optional fields using the same sanitization function
    const sanitizedAddress = place.address ? sanitizeString(place.address, MAX_ADDRESS_LENGTH) : undefined
    const sanitizedDescription = place.description ? sanitizeString(place.description, MAX_DESCRIPTION_LENGTH) : undefined
    const sanitizedNameEn = place.name_en ? sanitizeString(place.name_en, MAX_NAME_LENGTH) : undefined

    // 4. Check for duplicate place by name (using sanitized name)
    const existingPlace = await prisma.place.findFirst({
      where: {
        projectId,
        name: sanitizedName,
      },
    })

    if (existingPlace) {
      return Response.json(
        { error: { code: 'DUPLICATE', message: '이미 추가된 장소입니다.' }, place: existingPlace },
        { status: 409 }
      )
    }

    // 5. Geocode the place if coordinates are not provided
    let latitude = place.latitude
    let longitude = place.longitude
    let formattedAddress = sanitizedAddress
    let googlePlaceId: string | undefined
    let googleMapsUrl: string | undefined

    if (!latitude || !longitude) {
      const geocodeResult = await geocodePlaceWithFallback(
        sanitizedName,
        sanitizedNameEn || null,
        accessResult.project.destination,
        accessResult.project.country || undefined
      )

      if (geocodeResult) {
        latitude = geocodeResult.latitude
        longitude = geocodeResult.longitude
        formattedAddress = geocodeResult.formattedAddress || formattedAddress
        googlePlaceId = geocodeResult.googlePlaceId || undefined
        googleMapsUrl = geocodeResult.googleMapsUrl || undefined
      } else {
        return Response.json(
          { error: { code: 'GEOCODE_FAILED', message: '장소의 위치를 찾을 수 없습니다.' } },
          { status: 400 }
        )
      }
    }

    // 6. Create the place with sanitized values
    const newPlace = await prisma.place.create({
      data: {
        projectId,
        name: sanitizedName,
        category: place.category,
        comment: sanitizedDescription,
        latitude: latitude!,
        longitude: longitude!,
        status: 'auto',
        formattedAddress,
        googlePlaceId,
        googleMapsUrl,
      },
    })

    logger.chat('place_added', {
      userId,
      messageId: newPlace.id,
    })

    return Response.json({
      success: true,
      place: newPlace,
    })
  } catch (error) {
    logger.error('Add place from chat API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(createChatError('UNKNOWN_ERROR'), { status: 500 })
  }
}
