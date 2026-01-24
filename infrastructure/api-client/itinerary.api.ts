/**
 * Itinerary API Client
 * 일정 관리 관련 API 호출
 */
import { apiClient } from './index'

// ============================================================================
// Types
// ============================================================================

export interface Itinerary {
  id: string
  projectId: string
  title: string | null
  startDate: string
  endDate: string
  createdAt: Date
  updatedAt: Date
}

export interface ItineraryDay {
  id: string
  itineraryId: string
  dayNumber: number
  date: string
  items: ItineraryItem[]
}

export type ItineraryItemType =
  | 'place'
  | 'accommodation_checkin'
  | 'accommodation_checkout'
  | 'accommodation_stay'

export interface ItineraryItem {
  id: string
  dayId: string
  placeId: string | null
  accommodationId: string | null
  itemType: ItineraryItemType
  order: number
  startTime: string | null
  note: string | null
  place: {
    id: string
    name: string
    category: string
    latitude: number
    longitude: number
  } | null
  accommodation: {
    id: string
    name: string
    address: string | null
    latitude: number | null
    longitude: number | null
  } | null
  createdAt: Date
  updatedAt: Date
}

export interface Flight {
  id: string
  itineraryId: string
  airline: string | null
  flightNumber: string | null
  departureCity: string
  arrivalCity: string
  departureDate: string
  arrivalDate: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Accommodation {
  id: string
  itineraryId: string
  name: string
  address: string | null
  checkIn: string
  checkOut: string
  note: string | null
  latitude: number | null
  longitude: number | null
  createdAt: Date
  updatedAt: Date
}

export interface ItineraryWithDetails extends Itinerary {
  days: ItineraryDay[]
  flights: Flight[]
  accommodations: Accommodation[]
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateItineraryInput {
  title?: string
  startDate: string
  endDate: string
}

export interface UpdateItineraryInput {
  title?: string
  startDate?: string
  endDate?: string
}

export interface CreateItineraryItemInput {
  dayId: string
  placeId: string
  order?: number
  startTime?: string
  note?: string
}

export interface UpdateItineraryItemInput {
  order?: number
  startTime?: string | null
  note?: string | null
}

export interface ReorderItemsInput {
  dayId: string
  itemIds: string[]
}

export interface MoveItemInput {
  targetDayId: string
  order?: number
}

export interface CreateFlightInput {
  airline?: string
  flightNumber?: string
  departureCity: string
  arrivalCity: string
  departureDate: string
  arrivalDate?: string
  note?: string
}

export interface UpdateFlightInput {
  airline?: string | null
  flightNumber?: string | null
  departureCity?: string
  arrivalCity?: string
  departureDate?: string
  arrivalDate?: string | null
  note?: string | null
}

export interface CreateAccommodationInput {
  name: string
  address?: string
  checkIn: string
  checkOut: string
  note?: string
  latitude?: number
  longitude?: number
}

export interface UpdateAccommodationInput {
  name?: string
  address?: string | null
  checkIn?: string
  checkOut?: string
  note?: string | null
  latitude?: number | null
  longitude?: number | null
}

// ============================================================================
// Response Types
// ============================================================================

export interface ItineraryResponse {
  itinerary: ItineraryWithDetails | null
}

export interface ItineraryItemResponse {
  item: ItineraryItem
}

export interface FlightResponse {
  flight: Flight
}

export interface AccommodationResponse {
  accommodation: Accommodation
}

// ============================================================================
// API Client
// ============================================================================

export const itineraryApi = {
  // -------------------------------------------------------------------------
  // Itinerary CRUD
  // -------------------------------------------------------------------------

  /**
   * 프로젝트의 일정 조회
   */
  get: (projectId: string) =>
    apiClient.get<ItineraryResponse>(`/projects/${projectId}/itinerary`),

  /**
   * 프로젝트에 일정 생성
   */
  create: (projectId: string, data: CreateItineraryInput) =>
    apiClient.post<ItineraryResponse>(`/projects/${projectId}/itinerary`, data),

  /**
   * 일정 수정
   */
  update: (projectId: string, data: UpdateItineraryInput) =>
    apiClient.put<ItineraryResponse>(`/projects/${projectId}/itinerary`, data),

  /**
   * 일정 삭제
   */
  delete: (projectId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/itinerary`),

  // -------------------------------------------------------------------------
  // Itinerary Items
  // -------------------------------------------------------------------------

  /**
   * 일정 항목 추가
   */
  addItem: (itineraryId: string, data: CreateItineraryItemInput) =>
    apiClient.post<ItineraryItemResponse>(`/itinerary/${itineraryId}/items`, data),

  /**
   * 일정 항목 수정
   */
  updateItem: (itemId: string, data: UpdateItineraryItemInput) =>
    apiClient.put<ItineraryItemResponse>(`/itinerary/items/${itemId}`, data),

  /**
   * 일정 항목 삭제
   */
  deleteItem: (itemId: string) =>
    apiClient.delete<void>(`/itinerary/items/${itemId}`),

  /**
   * 일정 항목 순서 변경
   */
  reorderItems: (itineraryId: string, dayId: string, itemIds: string[]) =>
    apiClient.put<{ items: ItineraryItem[] }>(`/itinerary/${itineraryId}/reorder`, { dayId, itemIds }),

  /**
   * 일정 항목을 다른 Day로 이동
   */
  moveItemToDay: (itemId: string, data: MoveItemInput) =>
    apiClient.put<ItineraryItemResponse>(`/itinerary/items/${itemId}/move`, data),

  // -------------------------------------------------------------------------
  // Flights
  // -------------------------------------------------------------------------

  /**
   * 항공편 추가
   */
  addFlight: (itineraryId: string, data: CreateFlightInput) =>
    apiClient.post<FlightResponse>(`/itinerary/${itineraryId}/flights`, data),

  /**
   * 항공편 수정
   */
  updateFlight: (flightId: string, data: UpdateFlightInput) =>
    apiClient.put<FlightResponse>(`/itinerary/flights/${flightId}`, data),

  /**
   * 항공편 삭제
   */
  deleteFlight: (flightId: string) =>
    apiClient.delete<void>(`/itinerary/flights/${flightId}`),

  // -------------------------------------------------------------------------
  // Accommodations
  // -------------------------------------------------------------------------

  /**
   * 숙소 추가
   */
  addAccommodation: (itineraryId: string, data: CreateAccommodationInput) =>
    apiClient.post<AccommodationResponse>(`/itinerary/${itineraryId}/accommodations`, data),

  /**
   * 숙소 수정
   */
  updateAccommodation: (accommodationId: string, data: UpdateAccommodationInput) =>
    apiClient.put<AccommodationResponse>(`/itinerary/accommodations/${accommodationId}`, data),

  /**
   * 숙소 삭제
   */
  deleteAccommodation: (accommodationId: string) =>
    apiClient.delete<void>(`/itinerary/accommodations/${accommodationId}`),
}

export default itineraryApi
