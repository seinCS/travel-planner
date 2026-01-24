/**
 * Places API Client
 */
import { apiClient } from './index'
import type { Place, CreatePlaceInput, UpdatePlaceInput } from '@/types'
import type { PlaceCategory } from '@/lib/constants'

export interface PlacesResponse {
  places: Place[]
}

export interface PlaceSearchPrediction {
  placeId: string
  mainText: string
  secondaryText: string
  types: string[]
}

export interface PlaceSearchResponse {
  predictions: PlaceSearchPrediction[]
}

export interface PlaceSearchDetails {
  placeId: string
  name: string
  formattedAddress: string
  latitude: number
  longitude: number
  types: string[]
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
  googleMapsUrl: string | null
}

export interface PlaceSearchDetailsResponse {
  place: PlaceSearchDetails
}

export interface PlaceDetailsResponse {
  hasGoogleData: boolean
  place: {
    id: string
    name: string
    category: string
    comment: string | null
    latitude: number
    longitude: number
    formattedAddress?: string | null
    formattedPhoneNumber?: string | null
    website?: string | null
    openingHours?: {
      openNow: boolean
      weekdayText: string[]
    } | null
    rating?: number | null
    userRatingsTotal?: number | null
    priceLevel?: number | null
    reviews?: Array<{
      authorName: string
      rating: number
      text: string
      relativeTimeDescription: string
    }>
    photos?: Array<{
      photoReference: string
      width: number
      height: number
    }>
    googleMapsUrl?: string | null
  }
}

export interface RelocateResponse {
  place: Place
  newAddress?: string
}

export interface PlacePreviewData {
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

export interface PlaceFromUrlPreviewResponse {
  preview: PlacePreviewData
  parsed: {
    type: string
    placeName?: string
    placeId?: string
    latitude?: number
    longitude?: number
  }
}

export interface CreatePlaceFromUrlInput {
  url: string
  category?: PlaceCategory
  comment?: string
}

export const placesApi = {
  // Project-scoped
  getByProject: (projectId: string) =>
    apiClient.get<PlacesResponse>(`/projects/${projectId}/places`),

  create: (projectId: string, data: CreatePlaceInput) =>
    apiClient.post<Place>(`/projects/${projectId}/places`, data),

  // Place-scoped
  getById: (placeId: string) =>
    apiClient.get<Place>(`/places/${placeId}`),

  update: (placeId: string, data: UpdatePlaceInput) =>
    apiClient.put<Place>(`/places/${placeId}`, data),

  relocate: async (placeId: string, searchQuery: string): Promise<Place> => {
    const response = await apiClient.patch<RelocateResponse>(`/places/${placeId}`, { searchQuery })
    return response.place
  },

  updateLocation: (placeId: string, data: { latitude: number; longitude: number; googlePlaceId?: string; formattedAddress?: string; googleMapsUrl?: string }) =>
    apiClient.patch<Place>(`/places/${placeId}`, data),

  delete: (placeId: string) =>
    apiClient.delete<void>(`/places/${placeId}`),

  getDetails: (placeId: string) =>
    apiClient.get<PlaceDetailsResponse>(`/places/${placeId}/details`),

  // Share context
  getDetailsWithToken: (placeId: string, token: string) =>
    apiClient.get<PlaceDetailsResponse>(`/share/${token}/places/${placeId}/details`),

  // Search
  search: (
    query: string,
    options?: { lat?: number; lng?: number; language?: string }
  ) => {
    const params = new URLSearchParams({ query })
    if (options?.lat !== undefined && options?.lng !== undefined) {
      params.set('lat', options.lat.toString())
      params.set('lng', options.lng.toString())
    }
    if (options?.language) {
      params.set('language', options.language)
    }
    return apiClient.get<PlaceSearchResponse>(`/places/search?${params.toString()}`)
  },

  getSearchDetails: (placeId: string) =>
    apiClient.post<PlaceSearchDetailsResponse>('/places/search', { placeId }),

  // Google Maps URL processing
  previewFromUrl: (projectId: string, url: string) =>
    apiClient.get<PlaceFromUrlPreviewResponse>(
      `/projects/${projectId}/places/from-url?url=${encodeURIComponent(url)}`
    ),

  createFromUrl: (projectId: string, data: CreatePlaceFromUrlInput) =>
    apiClient.post<Place>(`/projects/${projectId}/places/from-url`, data),
}

export default placesApi
