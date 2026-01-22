/**
 * Places API Client
 */
import { apiClient } from './index'
import type { Place, CreatePlaceInput, UpdatePlaceInput } from '@/types'

export interface PlacesResponse {
  places: Place[]
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
}

export default placesApi
