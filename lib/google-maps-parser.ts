/**
 * Google Maps URL Parser
 *
 * Parses various Google Maps URL formats and extracts place information.
 *
 * Supported formats:
 * - Short URL: https://maps.app.goo.gl/ABC123
 * - Place URL: https://www.google.com/maps/place/센소지/@35.7147651,139.7966553,17z
 * - Coordinates URL: https://www.google.com/maps?q=35.7147651,139.7966553
 * - Place ID URL: https://www.google.com/maps/place/?q=place_id:ChIJ...
 */

export type GoogleMapsUrlType = 'short' | 'place' | 'coordinates' | 'place_id' | 'unknown'

export interface ParsedGoogleMapsUrl {
  type: GoogleMapsUrlType
  isGoogleMapsUrl: boolean
  placeName?: string
  placeId?: string
  latitude?: number
  longitude?: number
  zoom?: number
  originalUrl: string
}

/**
 * Check if the URL is a Google Maps URL
 */
export function isGoogleMapsUrl(url: string): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    return (
      hostname === 'maps.app.goo.gl' ||
      hostname === 'goo.gl' ||
      hostname === 'maps.google.com' ||
      hostname === 'www.google.com' ||
      hostname === 'google.com'
    )
  } catch {
    return false
  }
}

/**
 * Detect the type of Google Maps URL
 */
export function detectGoogleMapsUrlType(url: string): GoogleMapsUrlType {
  if (!url) return 'unknown'

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    const pathname = parsed.pathname

    // Short URL (maps.app.goo.gl or goo.gl/maps)
    if (hostname === 'maps.app.goo.gl' || hostname === 'goo.gl') {
      return 'short'
    }

    // Check if it's a maps URL on google.com
    if (
      hostname.includes('google.com') &&
      (pathname.startsWith('/maps') || parsed.searchParams.has('q'))
    ) {
      // Place ID URL: /maps/place/?q=place_id:ChIJ...
      const qParam = parsed.searchParams.get('q')
      if (qParam?.startsWith('place_id:')) {
        return 'place_id'
      }

      // Coordinates URL: /maps?q=35.7147651,139.7966553
      if (qParam && /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(qParam)) {
        return 'coordinates'
      }

      // Place URL: /maps/place/PlaceName/@lat,lng,zoom
      if (pathname.includes('/place/')) {
        // Check for place_id in query
        if (qParam?.startsWith('place_id:')) {
          return 'place_id'
        }
        return 'place'
      }

      // Coordinates in URL path: /maps/@lat,lng,zoom
      if (pathname.includes('/@')) {
        return 'coordinates'
      }

      return 'unknown'
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Extract coordinates from URL path like /@35.7147651,139.7966553,17z
 */
function extractCoordsFromPath(pathname: string): { lat: number; lng: number; zoom?: number } | null {
  // Match pattern: /@lat,lng,zoomz or /@lat,lng,zoom
  const match = pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),?(\d+)?z?/)
  if (match) {
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    const zoom = match[3] ? parseInt(match[3], 10) : undefined

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, zoom }
    }
  }
  return null
}

/**
 * Extract place name from URL path like /maps/place/センソウジ/
 */
function extractPlaceNameFromPath(pathname: string): string | undefined {
  // Match /maps/place/PlaceName/@ or /maps/place/PlaceName?
  const match = pathname.match(/\/maps\/place\/([^/@?]+)/)
  if (match) {
    try {
      // Decode URL-encoded place name
      return decodeURIComponent(match[1].replace(/\+/g, ' '))
    } catch {
      return match[1]
    }
  }
  return undefined
}

/**
 * Extract place ID from URL
 */
function extractPlaceId(url: URL): string | undefined {
  // From query param: ?q=place_id:ChIJ...
  const qParam = url.searchParams.get('q')
  if (qParam?.startsWith('place_id:')) {
    return qParam.replace('place_id:', '')
  }

  // From data param (some URLs encode place_id in data)
  const dataParam = url.searchParams.get('data')
  if (dataParam) {
    const placeIdMatch = dataParam.match(/!1s(ChIJ[A-Za-z0-9_-]+)/)
    if (placeIdMatch) {
      return placeIdMatch[1]
    }
  }

  return undefined
}

/**
 * Parse a Google Maps URL and extract place information
 */
export function parseGoogleMapsUrl(url: string): ParsedGoogleMapsUrl {
  const result: ParsedGoogleMapsUrl = {
    type: 'unknown',
    isGoogleMapsUrl: false,
    originalUrl: url,
  }

  if (!isGoogleMapsUrl(url)) {
    return result
  }

  result.isGoogleMapsUrl = true
  result.type = detectGoogleMapsUrlType(url)

  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname

    switch (result.type) {
      case 'short':
        // Short URLs need to be resolved server-side
        // We just mark them as short for now
        break

      case 'place':
        // Extract place name and coordinates
        result.placeName = extractPlaceNameFromPath(pathname)
        const placeCoords = extractCoordsFromPath(pathname)
        if (placeCoords) {
          result.latitude = placeCoords.lat
          result.longitude = placeCoords.lng
          result.zoom = placeCoords.zoom
        }
        result.placeId = extractPlaceId(parsed)
        break

      case 'place_id':
        result.placeId = extractPlaceId(parsed)
        break

      case 'coordinates':
        // Extract from query param or path
        const qParam = parsed.searchParams.get('q')
        if (qParam) {
          const coords = qParam.split(',')
          if (coords.length >= 2) {
            result.latitude = parseFloat(coords[0])
            result.longitude = parseFloat(coords[1])
          }
        } else {
          const pathCoords = extractCoordsFromPath(pathname)
          if (pathCoords) {
            result.latitude = pathCoords.lat
            result.longitude = pathCoords.lng
            result.zoom = pathCoords.zoom
          }
        }
        break
    }
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error)
  }

  return result
}

/**
 * Resolve a short Google Maps URL to its full form
 * This must be called from the server side
 */
export async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
    })
    return response.url
  } catch (error) {
    console.error('Error resolving short URL:', error)
    return null
  }
}

/**
 * Full URL parsing with short URL resolution
 * Must be called from server side
 */
export async function parseGoogleMapsUrlFull(url: string): Promise<ParsedGoogleMapsUrl> {
  let parsedUrl = parseGoogleMapsUrl(url)

  // If it's a short URL, resolve it first
  if (parsedUrl.type === 'short') {
    const resolvedUrl = await resolveShortUrl(url)
    if (resolvedUrl) {
      parsedUrl = parseGoogleMapsUrl(resolvedUrl)
      parsedUrl.originalUrl = url
    }
  }

  return parsedUrl
}
