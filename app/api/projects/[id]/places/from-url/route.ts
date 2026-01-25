import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkProjectAccess } from '@/lib/project-auth'
import { z } from 'zod'
import {
  parseGoogleMapsUrlFull,
  isGoogleMapsUrl,
  type ParsedGoogleMapsUrl,
} from '@/lib/google-maps-parser'
import { getPlaceDetails, getServerApiKey } from '@/lib/google-maps'
import { API_ERRORS, type PlaceCategory } from '@/lib/constants'

const fromUrlSchema = z.object({
  url: z.string().url(),
  category: z
    .enum(['restaurant', 'cafe', 'attraction', 'shopping', 'accommodation', 'other'])
    .optional()
    .default('other'),
  comment: z.string().optional(),
})

interface PlacePreviewData {
  name: string
  category: PlaceCategory
  latitude: number
  longitude: number
  formattedAddress: string | null
  googlePlaceId: string | null
  googleMapsUrl: string | null
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
}

/**
 * Fetch place details from Google Places API using place ID
 */
async function getPlaceFromPlaceId(placeId: string): Promise<PlacePreviewData | null> {
  const details = await getPlaceDetails(placeId)
  if (!details) return null

  // Extract coordinates from the Google Maps URL or fetch via geocoding
  // For now, we'll use the Places API to get full details
  const apiKey = getServerApiKey()
  if (!apiKey) return null

  // Get place geometry using Place Details API
  const fieldsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}`

  try {
    const geoResponse = await fetch(fieldsUrl)
    const geoData = await geoResponse.json()

    if (geoData.status !== 'OK' || !geoData.result?.geometry?.location) {
      return null
    }

    return {
      name: details.name,
      category: 'other',
      latitude: geoData.result.geometry.location.lat,
      longitude: geoData.result.geometry.location.lng,
      formattedAddress: details.formattedAddress,
      googlePlaceId: placeId,
      googleMapsUrl: details.googleMapsUrl,
      rating: details.rating,
      userRatingsTotal: details.userRatingsTotal,
      priceLevel: details.priceLevel,
    }
  } catch (error) {
    console.error('Error fetching place geometry:', error)
    return null
  }
}

/**
 * Search for a place by name and coordinates to get more details
 */
async function searchPlaceByNameAndCoords(
  name: string,
  lat: number,
  lng: number
): Promise<PlacePreviewData | null> {
  const apiKey = getServerApiKey()
  if (!apiKey) return null

  // Use nearby search with the name as keyword
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name)}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0]
      return {
        name: result.name || name,
        category: 'other',
        latitude: result.geometry?.location?.lat || lat,
        longitude: result.geometry?.location?.lng || lng,
        formattedAddress: result.vicinity || result.formatted_address || null,
        googlePlaceId: result.place_id || null,
        googleMapsUrl: result.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}`
          : null,
        rating: result.rating || null,
        userRatingsTotal: result.user_ratings_total || null,
        priceLevel: result.price_level ?? null,
      }
    }

    // If no nearby results, return basic info with coordinates
    return {
      name,
      category: 'other',
      latitude: lat,
      longitude: lng,
      formattedAddress: null,
      googlePlaceId: null,
      googleMapsUrl: null,
      rating: null,
      userRatingsTotal: null,
      priceLevel: null,
    }
  } catch (error) {
    console.error('Error searching place:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to get address and place details
 */
async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<PlacePreviewData | null> {
  const apiKey = getServerApiKey()
  if (!apiKey) return null

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0]
      return {
        name: result.formatted_address?.split(',')[0] || '선택한 위치',
        category: 'other',
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address || null,
        googlePlaceId: result.place_id || null,
        googleMapsUrl: result.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}`
          : null,
        rating: null,
        userRatingsTotal: null,
        priceLevel: null,
      }
    }

    return {
      name: '선택한 위치',
      category: 'other',
      latitude: lat,
      longitude: lng,
      formattedAddress: null,
      googlePlaceId: null,
      googleMapsUrl: null,
      rating: null,
      userRatingsTotal: null,
      priceLevel: null,
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * Process parsed Google Maps URL and extract place data
 */
async function processGoogleMapsUrl(
  parsed: ParsedGoogleMapsUrl
): Promise<PlacePreviewData | null> {
  // If we have a place ID, use it directly
  if (parsed.placeId) {
    return getPlaceFromPlaceId(parsed.placeId)
  }

  // If we have name and coordinates, search for the place
  if (parsed.placeName && parsed.latitude && parsed.longitude) {
    return searchPlaceByNameAndCoords(parsed.placeName, parsed.latitude, parsed.longitude)
  }

  // If we only have coordinates, reverse geocode
  if (parsed.latitude && parsed.longitude) {
    return reverseGeocodeCoords(parsed.latitude, parsed.longitude)
  }

  return null
}

// GET /api/projects/[id]/places/from-url - Preview place from Google Maps URL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id } = await params

    // Owner 또는 Member 권한 확인
    const { hasAccess } = await checkProjectAccess(id, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: API_ERRORS.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: API_ERRORS.URL_REQUIRED }, { status: 400 })
    }

    if (!isGoogleMapsUrl(url)) {
      return NextResponse.json({ error: API_ERRORS.INVALID_GOOGLE_MAPS_URL }, { status: 400 })
    }

    // Parse the URL (this resolves short URLs too)
    const parsed = await parseGoogleMapsUrlFull(url)

    if (parsed.type === 'unknown') {
      return NextResponse.json(
        { error: API_ERRORS.CANNOT_PARSE_URL },
        { status: 400 }
      )
    }

    // Process and get place data
    const placeData = await processGoogleMapsUrl(parsed)

    if (!placeData) {
      return NextResponse.json(
        { error: API_ERRORS.CANNOT_EXTRACT_PLACE },
        { status: 400 }
      )
    }

    return NextResponse.json({
      preview: placeData,
      parsed: {
        type: parsed.type,
        placeName: parsed.placeName,
        placeId: parsed.placeId,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      },
    })
  } catch (error) {
    console.error('Error previewing place from URL:', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}

// POST /api/projects/[id]/places/from-url - Create place from Google Maps URL
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id } = await params

    // Owner 또는 Member 권한 확인
    const { hasAccess } = await checkProjectAccess(id, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: API_ERRORS.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const body = await request.json()
    const validated = fromUrlSchema.parse(body)

    if (!isGoogleMapsUrl(validated.url)) {
      return NextResponse.json({ error: API_ERRORS.INVALID_GOOGLE_MAPS_URL }, { status: 400 })
    }

    // Parse the URL
    const parsed = await parseGoogleMapsUrlFull(validated.url)

    if (parsed.type === 'unknown') {
      return NextResponse.json(
        { error: API_ERRORS.CANNOT_PARSE_URL },
        { status: 400 }
      )
    }

    // Process and get place data
    const placeData = await processGoogleMapsUrl(parsed)

    if (!placeData) {
      return NextResponse.json(
        { error: API_ERRORS.CANNOT_EXTRACT_PLACE },
        { status: 400 }
      )
    }

    // Check for duplicates by googlePlaceId or coordinates
    if (placeData.googlePlaceId) {
      const existingPlace = await prisma.place.findFirst({
        where: {
          projectId: id,
          googlePlaceId: placeData.googlePlaceId,
        },
      })

      if (existingPlace) {
        return NextResponse.json(
          { error: API_ERRORS.PLACE_DUPLICATE, existingPlace },
          { status: 409 }
        )
      }
    }

    // Create the place
    const place = await prisma.place.create({
      data: {
        projectId: id,
        name: placeData.name,
        category: validated.category,
        comment: validated.comment,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        status: 'auto',
        googlePlaceId: placeData.googlePlaceId,
        formattedAddress: placeData.formattedAddress,
        googleMapsUrl: placeData.googleMapsUrl || validated.url,
        rating: placeData.rating,
        userRatingsTotal: placeData.userRatingsTotal,
        priceLevel: placeData.priceLevel,
      },
    })

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating place from URL:', error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
