/**
 * Prompt Injection Filter
 *
 * Service to detect and prevent prompt injection attacks.
 */

import { logger } from '@/lib/logger'

/**
 * Patterns that indicate potential prompt injection
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // System prompt disclosure attempts
  { pattern: /시스템.*프롬프트/i, name: 'system_prompt_ko' },
  { pattern: /system.*prompt/i, name: 'system_prompt_en' },
  { pattern: /reveal.*instruction/i, name: 'reveal_instruction' },
  { pattern: /show.*hidden/i, name: 'show_hidden' },

  // Instruction override attempts
  { pattern: /이전.*지시.*무시/i, name: 'ignore_prev_ko' },
  { pattern: /ignore.*previous.*instruction/i, name: 'ignore_prev_en' },
  { pattern: /forget.*everything/i, name: 'forget_everything' },
  { pattern: /disregard.*above/i, name: 'disregard_above' },

  // Role manipulation
  { pattern: /역할극/i, name: 'roleplay_ko' },
  { pattern: /roleplay/i, name: 'roleplay_en' },
  { pattern: /pretend.*you.*are/i, name: 'pretend' },
  { pattern: /act.*as.*if/i, name: 'act_as' },
  { pattern: /you.*are.*now/i, name: 'you_are_now' },

  // Jailbreak attempts
  { pattern: /DAN.*mode/i, name: 'dan_mode' },
  { pattern: /jailbreak/i, name: 'jailbreak' },
  { pattern: /developer.*mode/i, name: 'developer_mode' },
  { pattern: /bypass.*filter/i, name: 'bypass_filter' },

  // Special character obfuscation
  { pattern: /\u200B/, name: 'zero_width_space' },
  { pattern: /\u200C/, name: 'zero_width_non_joiner' },
  { pattern: /\u200D/, name: 'zero_width_joiner' },
  { pattern: /\uFEFF/, name: 'bom' },

  // Base64 encoded payloads (actual base64 strings, not just mentions)
  // Matches strings that look like base64-encoded data (40+ chars of base64 alphabet)
  { pattern: /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/, name: 'base64_payload' },

  // Delimiter manipulation
  { pattern: /```.*system/i, name: 'code_block_system' },
  { pattern: /<\|.*\|>/i, name: 'special_delimiter' },
]

/**
 * Maximum allowed message length
 */
const MAX_MESSAGE_LENGTH = 2000

export interface FilterResult {
  isClean: boolean
  reason?: string
  matchedPattern?: string
}

export class PromptInjectionFilter {
  /**
   * Check if a message is clean (no injection detected)
   */
  filter(message: string): FilterResult {
    // Check message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      logger.warn('Message too long', { length: message.length })
      return {
        isClean: false,
        reason: '메시지가 너무 깁니다. (최대 2000자)',
        matchedPattern: 'length_exceeded',
      }
    }

    // Check for empty message
    if (!message.trim()) {
      return {
        isClean: false,
        reason: '메시지를 입력해 주세요.',
        matchedPattern: 'empty_message',
      }
    }

    // Check against injection patterns
    for (const { pattern, name } of INJECTION_PATTERNS) {
      if (pattern.test(message)) {
        logger.warn('Prompt injection detected', { pattern: name })
        return {
          isClean: false,
          reason: '허용되지 않는 요청입니다.',
          matchedPattern: name,
        }
      }
    }

    return { isClean: true }
  }

  /**
   * Sanitize message by removing potentially harmful characters
   */
  sanitize(message: string): string {
    return message
      // Remove zero-width characters
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Trim
      .trim()
  }
}

export const promptInjectionFilter = new PromptInjectionFilter()
