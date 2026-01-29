/**
 * Tool Executor Interface
 *
 * Interface for executing tools in chat/LLM context.
 * This interface lives in the domain layer to enable dependency inversion.
 * Infrastructure services (like GeminiService) depend on this interface,
 * while Application layer provides the implementation.
 */

/**
 * Place information for tool execution context
 */
export interface ToolContextPlace {
  id?: string
  name: string
  category: string
  latitude?: number
  longitude?: number
}

/**
 * Itinerary information for tool execution context
 */
export interface ToolContextItinerary {
  id: string
  startDate: string
  endDate: string
  days: Array<{
    dayNumber: number
    date: string
    items: Array<{ placeName: string; startTime?: string }>
  }>
}

export interface ToolExecutionContext {
  projectId: string
  userId: string
  existingPlaces: ToolContextPlace[]
  itinerary?: ToolContextItinerary
  destination: string
  country?: string
  itineraryId?: string
}

export interface ToolExecutionResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface IToolExecutor {
  execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>
}
