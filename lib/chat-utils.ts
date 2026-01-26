/**
 * Chat Utilities
 *
 * Shared utilities for chat response processing.
 * Used by both server (GeminiService) and client (components).
 */

/**
 * Clean chat response by removing unwanted JSON and markdown artifacts
 * Defense layer for LLM responses that may include raw JSON or incorrect formats
 */
export function cleanChatResponse(text: string): string {
  if (!text || typeof text !== 'string') return ''

  let cleaned = text

  // 1. Remove ```json:place blocks (with backticks)
  cleaned = cleaned.replace(/```json:place\s*[\s\S]*?```/g, '')

  // 2. Remove json:place with COMPLETE JSON (has closing brace)
  cleaned = cleaned.replace(/json:place\s*\{[\s\S]*?\}\s*/gi, '')

  // 2.5. Remove :place with COMPLETE JSON (Gemini sometimes omits 'json' prefix)
  cleaned = cleaned.replace(/:place\s*\{[\s\S]*?\}\s*/gi, '')

  // 3. Remove incomplete json:place blocks - match until double newline (paragraph break)
  // This preserves text after the incomplete JSON block
  cleaned = cleaned.replace(/json:place\s*\{[^}]*?(?=\n\n)/gi, '')

  // 3.5. Remove incomplete :place blocks (no 'json' prefix)
  cleaned = cleaned.replace(/:place\s*\{[^}]*?(?=\n\n)/gi, '')

  // 3.6. Remove standalone :place without JSON (just ":place" on its own line)
  cleaned = cleaned.replace(/^:place\s*$/gim, '')

  // 4. Remove generic ```json blocks
  cleaned = cleaned.replace(/```json\s*[\s\S]*?```/g, '')

  // 5. Remove other code blocks (javascript, typescript, etc.)
  cleaned = cleaned.replace(/```(?:javascript|typescript|js|ts|python|py)?\s*[\s\S]*?```/g, '')

  // 6. Remove raw JSON objects that look like place data (complete - has closing brace)
  cleaned = cleaned.replace(
    /\{\s*"name"\s*:\s*"[^"]*"\s*,\s*"(?:name_en|address|category|description)"[\s\S]*?\}/g,
    ''
  )

  // 7. Remove incomplete JSON objects - match until double newline
  cleaned = cleaned.replace(
    /\{\s*"name"\s*:\s*"[^"]*"[^}]*?(?=\n\n)/g,
    ''
  )

  // 7.5. Remove incomplete JSON at end of text - simple approach
  // Find last occurrence of JSON-like start and check if it has closing brace
  const lastJsonStart = cleaned.lastIndexOf('{"name"')
  if (lastJsonStart !== -1) {
    const afterStart = cleaned.slice(lastJsonStart)
    // If no closing brace found, remove from that point
    if (!afterStart.includes('}')) {
      cleaned = cleaned.slice(0, lastJsonStart)
    }
  }

  // 7.6. Also check for {"name_en" pattern (sometimes Gemini starts with different field)
  const lastJsonStart2 = cleaned.lastIndexOf('{"name_en"')
  if (lastJsonStart2 !== -1) {
    const afterStart2 = cleaned.slice(lastJsonStart2)
    if (!afterStart2.includes('}')) {
      cleaned = cleaned.slice(0, lastJsonStart2)
    }
  }

  // 8. Remove orphaned backticks
  cleaned = cleaned.replace(/```\w*\n?/g, '')
  cleaned = cleaned.replace(/`{3,}/g, '')

  // 9. Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()

  return cleaned
}

/**
 * Parse potential JSON string and extract message field if present
 * Fallback defense when LLM returns entire response as JSON
 */
export function extractMessageFromResponse(response: unknown): string {
  // If it's already a string, try to parse it
  if (typeof response === 'string') {
    // Check if it looks like JSON
    const trimmed = response.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        // If parsed has a message field, use it
        if (typeof parsed.message === 'string') {
          return cleanChatResponse(parsed.message)
        }
        // If parsed has a text or content field, use it
        if (typeof parsed.text === 'string') {
          return cleanChatResponse(parsed.text)
        }
        if (typeof parsed.content === 'string') {
          return cleanChatResponse(parsed.content)
        }
        // Otherwise, return cleaned original
        return cleanChatResponse(response)
      } catch {
        // Not valid JSON, return cleaned original
        return cleanChatResponse(response)
      }
    }
    return cleanChatResponse(response)
  }

  // If it's an object, try to extract message
  if (typeof response === 'object' && response !== null) {
    const obj = response as Record<string, unknown>
    if (typeof obj.message === 'string') {
      return cleanChatResponse(obj.message)
    }
    if (typeof obj.text === 'string') {
      return cleanChatResponse(obj.text)
    }
    if (typeof obj.content === 'string') {
      return cleanChatResponse(obj.content)
    }
  }

  return ''
}
