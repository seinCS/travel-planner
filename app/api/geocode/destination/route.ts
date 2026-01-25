import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const destination = searchParams.get('destination')
  const country = searchParams.get('country')

  if (!destination) {
    return NextResponse.json({ error: 'destination is required' }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.error('Google Maps API key not configured')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const searchQuery = country ? `${destination}, ${country}` : destination
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    searchQuery
  )}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      return NextResponse.json({
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      })
    }

    console.error('Geocoding destination failed:', data.status)
    return NextResponse.json({ error: 'Geocoding failed', status: data.status }, { status: 404 })
  } catch (error) {
    console.error('Geocoding destination error:', error)
    return NextResponse.json({ error: 'Geocoding error' }, { status: 500 })
  }
}
