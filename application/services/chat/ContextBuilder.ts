/**
 * Chat Context Builder
 *
 * Builds enhanced context for LLM chat by aggregating:
 * - Recent conversation history
 * - Conversation summary (for long conversations)
 * - Current itinerary data
 * - User preferences based on saved places
 */

import type { IChatRepository } from '@/domain/interfaces/IChatRepository'
import type { IItineraryRepository, ItineraryWithDays } from '@/domain/interfaces/IItineraryRepository'
import type { ChatContext } from '@/domain/interfaces/ILLMService'

export interface ContextBuilderInput {
  projectId: string
  userId: string
  sessionId: string
  existingPlaces: Array<{
    id?: string
    name: string
    category: string
    latitude?: number
    longitude?: number
  }>
  destination: string
  country?: string
}

export class ChatContextBuilder {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly itineraryRepository: IItineraryRepository,
  ) {}

  async build(input: ContextBuilderInput): Promise<ChatContext> {
    const [recentMessages, itinerary, messageCount] = await Promise.all([
      this.chatRepository.getRecentMessages(input.sessionId, 10),
      this.itineraryRepository.findByProjectId(input.projectId),
      this.chatRepository.getMessages(input.sessionId, { limit: 100 }),
    ])

    // Build conversation summary if history exceeds 10 messages
    let conversationSummary: string | undefined
    if (messageCount.length > 10) {
      const olderMessages = messageCount.slice(0, -10)
      conversationSummary = this.summarizeConversation(
        olderMessages.map(m => ({ role: m.role, content: m.content }))
      )
    }

    const userPreferences = this.analyzePreferences(input.existingPlaces)
    const itineraryContext = itinerary ? this.formatItinerary(itinerary) : undefined

    return {
      projectId: input.projectId,
      destination: input.destination,
      country: input.country,
      existingPlaces: input.existingPlaces,
      conversationHistory: recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      conversationSummary,
      itinerary: itineraryContext,
      userPreferences,
    }
  }

  /**
   * Keyword-based conversation summary (no LLM call).
   * Extracts discussed topics, mentioned places, and message count.
   */
  private summarizeConversation(
    messages: Array<{ role: string; content: string }>
  ): string {
    const topics = new Set<string>()
    const mentionedPlaces: string[] = []

    const categoryKeywords: Record<string, string> = {
      '맛집': '맛집',
      '레스토랑': '맛집',
      '식당': '맛집',
      '라멘': '맛집',
      '스시': '맛집',
      '카페': '카페',
      '커피': '카페',
      '관광': '관광',
      '명소': '관광',
      '관광지': '관광',
      '쇼핑': '쇼핑',
      '백화점': '쇼핑',
      '숙소': '숙소',
      '호텔': '숙소',
      '교통': '교통',
      '지하철': '교통',
      '버스': '교통',
      '날씨': '날씨',
      '환율': '환율',
    }

    for (const msg of messages) {
      // Extract topic keywords
      for (const [keyword, topic] of Object.entries(categoryKeywords)) {
        if (msg.content.includes(keyword)) {
          topics.add(topic)
        }
      }

      // Extract place names from quoted strings
      const quotePatterns = [
        /[「『"'](.*?)[」』"']/g,
        /[""](.*?)[""]/g,
      ]
      for (const pattern of quotePatterns) {
        let match
        while ((match = pattern.exec(msg.content)) !== null) {
          if (match[1] && match[1].length > 1 && match[1].length < 50) {
            mentionedPlaces.push(match[1])
          }
        }
      }
    }

    const parts: string[] = []
    if (topics.size > 0) {
      parts.push(`논의 주제: ${[...topics].join(', ')}`)
    }
    if (mentionedPlaces.length > 0) {
      const unique = [...new Set(mentionedPlaces)].slice(0, 5)
      parts.push(`언급된 장소: ${unique.join(', ')}`)
    }
    parts.push(`이전 대화 ${messages.length}개 메시지`)

    return parts.join('. ')
  }

  /**
   * Analyze user preferences from saved places.
   */
  private analyzePreferences(
    places: Array<{ category: string }>
  ): ChatContext['userPreferences'] {
    if (places.length === 0) return undefined

    const counts: Record<string, number> = {}
    for (const p of places) {
      counts[p.category] = (counts[p.category] || 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const topCategories = sorted.slice(0, 3).map(([cat]) => cat)

    return { topCategories }
  }

  /**
   * Format itinerary data for LLM context.
   */
  private formatItinerary(itinerary: ItineraryWithDays): ChatContext['itinerary'] {
    return {
      id: itinerary.id,
      startDate: itinerary.startDate.toISOString().split('T')[0],
      endDate: itinerary.endDate.toISOString().split('T')[0],
      days: itinerary.days.map(d => ({
        dayNumber: d.dayNumber,
        date: d.date.toISOString().split('T')[0],
        items: d.items.map(i => ({
          placeName: i.place.name,
          startTime: i.startTime || undefined,
        })),
      })),
    }
  }
}
