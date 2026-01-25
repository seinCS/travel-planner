import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(255),
  locationBias: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  language: z.string().optional().default('ko'),
})

export interface PlaceSearchPrediction {
  placeId: string
  mainText: string
  secondaryText: string
  types: string[]
}

export interface PlaceSearchResponse {
  predictions: PlaceSearchPrediction[]
}

// GET /api/places/search - Google Places Autocomplete search
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const language = searchParams.get('language') || 'ko'

    const validated = searchSchema.parse({
      query,
      locationBias:
        lat && lng
          ? { latitude: parseFloat(lat), longitude: parseFloat(lng) }
          : undefined,
      language,
    })

    // 서버 전용 API 키 사용
    // TODO: NEXT_PUBLIC_ fallback은 2026-03-01까지 유지 후 제거 예정
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Build the Places Autocomplete API URL
    const params = new URLSearchParams({
      input: validated.query,
      key: apiKey,
      language: validated.language,
    })

    // Add location bias if provided (biases results towards this location)
    if (validated.locationBias) {
      params.set(
        'location',
        `${validated.locationBias.latitude},${validated.locationBias.longitude}`
      )
      params.set('radius', '50000') // 50km radius for bias
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      const predictions: PlaceSearchPrediction[] = (
        data.predictions || []
      ).map(
        (prediction: {
          place_id: string
          structured_formatting: {
            main_text: string
            secondary_text: string
          }
          types: string[]
        }) => ({
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting?.main_text || '',
          secondaryText: prediction.structured_formatting?.secondary_text || '',
          types: prediction.types || [],
        })
      )

      return NextResponse.json({ predictions })
    }

    console.error('[Places Autocomplete API] Error:', data.status, data.error_message)
    return NextResponse.json(
      { error: data.error_message || 'Search failed' },
      { status: 500 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error searching places:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/places/search/details - Get place details by place_id
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { placeId } = body

    if (!placeId) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 })
    }

    // 서버 전용 API 키 사용
    // TODO: NEXT_PUBLIC_ fallback은 2026-03-01까지 유지 후 제거 예정
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Get place details
    const fields = [
      'name',
      'formatted_address',
      'geometry',
      'types',
      'rating',
      'user_ratings_total',
      'price_level',
      'url',
    ].join(',')

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=ko&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.result) {
      const result = data.result
      return NextResponse.json({
        place: {
          placeId,
          name: result.name,
          formattedAddress: result.formatted_address,
          latitude: result.geometry?.location?.lat,
          longitude: result.geometry?.location?.lng,
          types: result.types || [],
          rating: result.rating || null,
          userRatingsTotal: result.user_ratings_total || null,
          priceLevel: result.price_level ?? null,
          googleMapsUrl: result.url || null,
        },
      })
    }

    console.error('[Place Details API] Error:', data.status, data.error_message)
    return NextResponse.json(
      { error: data.error_message || 'Failed to get place details' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error getting place details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
