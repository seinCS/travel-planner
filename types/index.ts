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
