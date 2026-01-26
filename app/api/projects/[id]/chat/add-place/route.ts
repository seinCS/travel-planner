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

    // 3. Parse request body
    const body: AddPlaceRequestBody = await request.json()
    const { place } = body

    if (!place || !place.name || !place.category) {
      return Response.json(createChatError('INVALID_REQUEST'), { status: 400 })
    }

    // 4. Check for duplicate place by name
    const existingPlace = await prisma.place.findFirst({
      where: {
        projectId,
        name: place.name,
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
    let formattedAddress = place.address
    let googlePlaceId: string | undefined
    let googleMapsUrl: string | undefined

    if (!latitude || !longitude) {
      const geocodeResult = await geocodePlaceWithFallback(
        place.name,
        place.name_en || null,
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

    // 6. Create the place
    const newPlace = await prisma.place.create({
      data: {
        projectId,
        name: place.name,
        category: place.category,
        comment: place.description,
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
