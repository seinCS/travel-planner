import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clean chat response by removing unwanted JSON and markdown artifacts
 * Client-side defense layer for LLM responses
 */
export function cleanChatResponse(text: string): string {
  if (!text || typeof text !== 'string') return ''

  let cleaned = text

  // 1. Remove ```json:place blocks (with backticks)
  cleaned = cleaned.replace(/```json:place\s*[\s\S]*?```/g, '')

  // 2. Remove json:place with COMPLETE JSON (has closing brace)
  cleaned = cleaned.replace(/json:place\s*\{[\s\S]*?\}\s*/gi, '')

  // 3. Remove incomplete json:place blocks - match until double newline (paragraph break)
  // This preserves text after the incomplete JSON block
  cleaned = cleaned.replace(/json:place\s*\{[^}]*?(?=\n\n)/gi, '')

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
