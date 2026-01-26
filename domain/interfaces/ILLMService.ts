/**
 * LLM Service Interface
 *
 * Defines the contract for Large Language Model services.
 */

export interface RecommendedPlace {
  name: string
  name_en?: string
  address?: string
  category: string
  description?: string
  latitude?: number
  longitude?: number
}

export interface StreamChunk {
  type: 'text' | 'place' | 'done' | 'error'
  content?: string
  place?: RecommendedPlace
  messageId?: string
}

export interface ChatContext {
  projectId: string
  destination: string
  country?: string
  existingPlaces: Array<{
    name: string
    category: string
  }>
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface ILLMService {
  /**
   * Generate a streaming response for a chat message
   * Returns an async iterator of stream chunks
   */
  streamChat(
    message: string,
    context: ChatContext
  ): AsyncGenerator<StreamChunk, void, unknown>

  /**
   * Check if the service is available
   */
  isAvailable(): Promise<boolean>
}

/**
 * Type guard for StreamChunk
 */
export function isTextChunk(chunk: StreamChunk): chunk is StreamChunk & { type: 'text'; content: string } {
  return chunk.type === 'text' && typeof chunk.content === 'string'
}

export function isPlaceChunk(chunk: StreamChunk): chunk is StreamChunk & { type: 'place'; place: RecommendedPlace } {
  return chunk.type === 'place' && chunk.place !== undefined
}

export function isDoneChunk(chunk: StreamChunk): chunk is StreamChunk & { type: 'done' } {
  return chunk.type === 'done'
}

export function isErrorChunk(chunk: StreamChunk): chunk is StreamChunk & { type: 'error' } {
  return chunk.type === 'error'
}
