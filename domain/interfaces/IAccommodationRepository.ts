/**
 * Accommodation Repository Interface
 *
 * Abstract interface for Accommodation persistence operations.
 * Manages accommodation (hotel, hostel, etc.) information within itineraries.
 */

/**
 * Accommodation entity representing lodging
 */
export interface Accommodation {
  id: string
  itineraryId: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  checkIn: Date
  checkOut: Date
  note: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Data required to create a new accommodation
 */
export interface CreateAccommodationData {
  itineraryId: string
  name: string
  address?: string
  latitude?: number
  longitude?: number
  checkIn: Date
  checkOut: Date
  note?: string
}

/**
 * Data for updating an existing accommodation
 */
export interface UpdateAccommodationData {
  name?: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  checkIn?: Date
  checkOut?: Date
  note?: string | null
}

/**
 * Repository interface for Accommodation persistence operations
 */
export interface IAccommodationRepository {
  /**
   * Find all accommodations for an itinerary
   * @param itineraryId - The itinerary ID
   * @returns Array of accommodations sorted by check-in date
   */
  findByItineraryId(itineraryId: string): Promise<Accommodation[]>

  /**
   * Find an accommodation by ID
   * @param id - The accommodation ID
   * @returns Accommodation or null if not found
   */
  findById(id: string): Promise<Accommodation | null>

  /**
   * Create a new accommodation
   * @param data - Accommodation creation data
   * @returns Created accommodation
   */
  create(data: CreateAccommodationData): Promise<Accommodation>

  /**
   * Update an existing accommodation
   * @param id - The accommodation ID
   * @param data - Update data
   * @returns Updated accommodation
   */
  update(id: string, data: UpdateAccommodationData): Promise<Accommodation>

  /**
   * Delete an accommodation
   * @param id - The accommodation ID
   */
  delete(id: string): Promise<void>

  /**
   * Delete all accommodations for an itinerary
   * @param itineraryId - The itinerary ID
   */
  deleteByItineraryId(itineraryId: string): Promise<void>

  /**
   * Find accommodations that overlap with a date range
   * @param itineraryId - The itinerary ID
   * @param startDate - Range start date
   * @param endDate - Range end date
   * @returns Array of overlapping accommodations
   */
  findByDateRange(itineraryId: string, startDate: Date, endDate: Date): Promise<Accommodation[]>

  /**
   * Count accommodations in an itinerary
   * @param itineraryId - The itinerary ID
   * @returns Number of accommodations
   */
  countByItineraryId(itineraryId: string): Promise<number>
}
