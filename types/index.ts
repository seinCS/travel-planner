import { PlaceCategory } from '@/lib/constants'

export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
}

export interface Project {
  id: string
  userId: string
  name: string
  destination: string
  country: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ProjectWithCounts extends Project {
  _count: {
    places: number
    images: number
  }
}

export interface Image {
  id: string
  projectId: string
  url: string
  status: 'pending' | 'processed' | 'failed'
  rawText: string | null
  errorMessage: string | null
  createdAt: Date
}

export interface Place {
  id: string
  projectId: string
  name: string
  category: PlaceCategory
  comment: string | null
  latitude: number
  longitude: number
  status: 'auto' | 'manual' | 'edited'
  // Google Place 연동
  googlePlaceId: string | null
  formattedAddress: string | null
  googleMapsUrl: string | null
  rating: number | null
  userRatingsTotal: number | null
  priceLevel: number | null
  createdAt: Date
  updatedAt: Date
}

export interface PlaceWithImages extends Place {
  images: Image[]
}

export interface ImageWithPlaces extends Image {
  places: Place[]
}

export interface CreateProjectInput {
  name: string
  destination: string
  country?: string
}

export interface CreatePlaceInput {
  name: string
  category: PlaceCategory
  comment?: string
  latitude?: number
  longitude?: number
  imageIds?: string[]
  // Google Place data (from search)
  googlePlaceId?: string
  formattedAddress?: string
  googleMapsUrl?: string
  rating?: number | null
  userRatingsTotal?: number | null
  priceLevel?: number | null
}

export interface UpdatePlaceInput {
  name?: string
  category?: PlaceCategory
  comment?: string
  latitude?: number
  longitude?: number
}

// TextInput 관련 타입
export interface TextInput {
  id: string
  projectId: string
  type: 'text' | 'url'
  content: string
  sourceUrl: string | null
  extractedText: string | null
  status: 'pending' | 'processed' | 'failed'
  errorMessage: string | null
  createdAt: Date
}

export interface CreateTextInputRequest {
  type: 'text' | 'url'
  content: string
}

// ========================================
// Itinerary 관련 타입
// ========================================

export interface Itinerary {
  id: string
  projectId: string
  title: string | null
  startDate: Date
  endDate: Date
  days: ItineraryDay[]
  flights: Flight[]
  accommodations: Accommodation[]
  createdAt: Date
  updatedAt: Date
}

export interface ItineraryDay {
  id: string
  itineraryId: string
  dayNumber: number
  date: Date
  items: ItineraryItem[]
}

export interface ItineraryItem {
  id: string
  dayId: string
  placeId: string
  order: number
  startTime: string | null
  note: string | null
  place: Place
  createdAt: Date
  updatedAt: Date
}

// ========================================
// Flight 타입
// ========================================

export interface Flight {
  id: string
  itineraryId: string
  type: 'departure' | 'return'
  airline: string | null
  flightNumber: string | null
  departureAirport: string
  arrivalAirport: string
  departureTime: Date
  arrivalTime: Date
  note: string | null
  createdAt: Date
  updatedAt: Date
}

// ========================================
// Accommodation 타입
// ========================================

export interface Accommodation {
  id: string
  itineraryId: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  checkIn: Date
  checkOut: Date
  confirmationNumber: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}

// ========================================
// ProjectMember 타입
// ========================================

export type ProjectMemberRole = 'owner' | 'member'

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: ProjectMemberRole
  user?: User
  createdAt: Date
  updatedAt: Date
}

// ========================================
// Itinerary API 요청/응답 타입
// ========================================

export interface CreateItineraryInput {
  title?: string
  startDate: Date | string
  endDate: Date | string
}

export interface UpdateItineraryInput {
  title?: string
  startDate?: Date | string
  endDate?: Date | string
}

export interface AddItineraryItemInput {
  dayId: string
  placeId: string
  order?: number
  startTime?: string
  note?: string
}

export interface ReorderItemsInput {
  items: {
    id: string
    dayId: string
    order: number
  }[]
}

// Flight API 요청 타입
export interface CreateFlightInput {
  type: 'departure' | 'return'
  airline?: string
  flightNumber?: string
  departureAirport: string
  arrivalAirport: string
  departureTime: Date | string
  arrivalTime: Date | string
  note?: string
}

export interface UpdateFlightInput {
  type?: 'departure' | 'return'
  airline?: string
  flightNumber?: string
  departureAirport?: string
  arrivalAirport?: string
  departureTime?: Date | string
  arrivalTime?: Date | string
  note?: string
}

// Accommodation API 요청 타입
export interface CreateAccommodationInput {
  name: string
  address?: string
  latitude?: number
  longitude?: number
  checkIn: Date | string
  checkOut: Date | string
  confirmationNumber?: string
  note?: string
}

export interface UpdateAccommodationInput {
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  checkIn?: Date | string
  checkOut?: Date | string
  confirmationNumber?: string
  note?: string
}
