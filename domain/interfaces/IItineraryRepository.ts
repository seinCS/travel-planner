/**
 * Itinerary Repository Interface
 *
 * Abstract interface for Itinerary persistence operations.
 * Manages travel itineraries including days and items.
 */

import type { Place } from '@/types'

/**
 * Itinerary entity representing a travel schedule
 */
export interface Itinerary {
  id: string
  projectId: string
  title: string | null
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Itinerary with related days data
 */
export interface ItineraryWithDays extends Itinerary {
  days: ItineraryDayWithItems[]
}

/**
 * Single day in an itinerary
 */
export interface ItineraryDay {
  id: string
  itineraryId: string
  dayNumber: number
  date: Date
}

/**
 * Day with related items
 */
export interface ItineraryDayWithItems extends ItineraryDay {
  items: ItineraryItemWithPlace[]
}

/**
 * Single item (place visit) in a day
 */
export interface ItineraryItem {
  id: string
  dayId: string
  placeId: string
  order: number
  startTime: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Item with related place data
 */
export interface ItineraryItemWithPlace extends ItineraryItem {
  place: Place
}

/**
 * Data required to create a new itinerary
 */
export interface CreateItineraryData {
  projectId: string
  title?: string
  startDate: Date
  endDate: Date
}

/**
 * Data for updating an existing itinerary
 */
export interface UpdateItineraryData {
  title?: string
  startDate?: Date
  endDate?: Date
}

/**
 * Data required to create a new itinerary day
 */
export interface CreateItineraryDayData {
  itineraryId: string
  dayNumber: number
  date: Date
}

/**
 * Data required to create a new itinerary item
 */
export interface CreateItineraryItemData {
  dayId: string
  placeId: string
  order: number
  startTime?: string
  note?: string
}

/**
 * Data for updating an existing itinerary item
 */
export interface UpdateItineraryItemData {
  order?: number
  startTime?: string | null
  note?: string | null
}

/**
 * Repository interface for Itinerary persistence operations
 */
export interface IItineraryRepository {
  /**
   * Find an itinerary by project ID
   * @param projectId - The project ID
   * @returns Itinerary with days and items, or null if not found
   */
  findByProjectId(projectId: string): Promise<ItineraryWithDays | null>

  /**
   * Find an itinerary by ID
   * @param id - The itinerary ID
   * @returns Itinerary with days and items, or null if not found
   */
  findById(id: string): Promise<ItineraryWithDays | null>

  /**
   * Create a new itinerary with days
   * @param data - Itinerary creation data
   * @returns Created itinerary with days
   */
  create(data: CreateItineraryData): Promise<ItineraryWithDays>

  /**
   * Update an existing itinerary
   * @param id - The itinerary ID
   * @param data - Update data
   * @returns Updated itinerary
   */
  update(id: string, data: UpdateItineraryData): Promise<Itinerary>

  /**
   * Delete an itinerary and all related data
   * @param id - The itinerary ID
   */
  delete(id: string): Promise<void>

  /**
   * Add an item to a day
   * @param data - Item creation data
   * @returns Created item with place
   */
  addItem(data: CreateItineraryItemData): Promise<ItineraryItemWithPlace>

  /**
   * Update an item
   * @param itemId - The item ID
   * @param data - Update data
   * @returns Updated item with place
   */
  updateItem(itemId: string, data: UpdateItineraryItemData): Promise<ItineraryItemWithPlace>

  /**
   * Remove an item from a day
   * @param itemId - The item ID
   */
  removeItem(itemId: string): Promise<void>

  /**
   * Reorder items within a day
   * @param dayId - The day ID
   * @param itemIds - Ordered array of item IDs
   */
  reorderItems(dayId: string, itemIds: string[]): Promise<void>
}
