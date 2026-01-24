/**
 * Flight Repository Interface
 *
 * Abstract interface for Flight persistence operations.
 * Manages flight information within itineraries.
 */

/**
 * Flight entity representing air travel
 */
export interface Flight {
  id: string
  itineraryId: string
  departureCity: string
  arrivalCity: string
  airline: string | null
  flightNumber: string | null
  departureDate: Date
  arrivalDate: Date | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Data required to create a new flight
 */
export interface CreateFlightData {
  itineraryId: string
  departureCity: string
  arrivalCity: string
  airline?: string
  flightNumber?: string
  departureDate: Date
  arrivalDate?: Date
  note?: string
}

/**
 * Data for updating an existing flight
 */
export interface UpdateFlightData {
  departureCity?: string
  arrivalCity?: string
  airline?: string | null
  flightNumber?: string | null
  departureDate?: Date
  arrivalDate?: Date | null
  note?: string | null
}

/**
 * Repository interface for Flight persistence operations
 */
export interface IFlightRepository {
  /**
   * Find all flights for an itinerary
   * @param itineraryId - The itinerary ID
   * @returns Array of flights sorted by departure date
   */
  findByItineraryId(itineraryId: string): Promise<Flight[]>

  /**
   * Find a flight by ID
   * @param id - The flight ID
   * @returns Flight or null if not found
   */
  findById(id: string): Promise<Flight | null>

  /**
   * Create a new flight
   * @param data - Flight creation data
   * @returns Created flight
   */
  create(data: CreateFlightData): Promise<Flight>

  /**
   * Update an existing flight
   * @param id - The flight ID
   * @param data - Update data
   * @returns Updated flight
   */
  update(id: string, data: UpdateFlightData): Promise<Flight>

  /**
   * Delete a flight
   * @param id - The flight ID
   */
  delete(id: string): Promise<void>

  /**
   * Delete all flights for an itinerary
   * @param itineraryId - The itinerary ID
   */
  deleteByItineraryId(itineraryId: string): Promise<void>

  /**
   * Count flights in an itinerary
   * @param itineraryId - The itinerary ID
   * @returns Number of flights
   */
  countByItineraryId(itineraryId: string): Promise<number>
}
