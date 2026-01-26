/**
 * Prompt Injection Filter
 *
 * Service to detect and prevent prompt injection attacks.
 * Includes protection against:
 * - Direct injection attempts
 * - L33t speak variations
 * - Unicode obfuscation
 * - Base64 encoded payloads
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

  // L33t speak variations for system/prompt
  { pattern: /syst[e3]m/i, name: 'leet_system' },
  { pattern: /pr[o0]mpt/i, name: 'leet_prompt' },
  { pattern: /s[yi1]st[e3]m/i, name: 'leet_system_alt' },

  // Instruction override attempts
  { pattern: /이전.*지시.*무시/i, name: 'ignore_prev_ko' },
  { pattern: /ignore.*previous.*instruction/i, name: 'ignore_prev_en' },
  { pattern: /forget.*everything/i, name: 'forget_everything' },
  { pattern: /disregard.*above/i, name: 'disregard_above' },
  { pattern: /이전.*무시/i, name: 'ignore_prev_ko_short' },

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
  { pattern: /j[a4][i1]lbr[e3][a4]k/i, name: 'leet_jailbreak' },

  // Special character obfuscation
  { pattern: /\u200B/, name: 'zero_width_space' },
  { pattern: /\u200C/, name: 'zero_width_non_joiner' },
  { pattern: /\u200D/, name: 'zero_width_joiner' },
  { pattern: /\uFEFF/, name: 'bom' },
  // Additional invisible characters
  { pattern: /\u00AD/, name: 'soft_hyphen' },
  { pattern: /\u2060/, name: 'word_joiner' },
  { pattern: /\u180E/, name: 'mongolian_vowel_separator' },

  // Base64 encoded payloads - stricter detection
  // Only match strings that:
  // 1. Have 60+ chars (enough to encode meaningful payload)
  // 2. MUST end with proper Base64 padding (= or ==) to reduce false positives
  // 3. This avoids blocking normal text like "ABCDEFGHIJKLMNOPQRST"
  { pattern: /(?:[A-Za-z0-9+/]{4}){15,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)/, name: 'base64_payload' },

  // Delimiter manipulation
  { pattern: /```.*system/i, name: 'code_block_system' },
  { pattern: /<\|.*\|>/i, name: 'special_delimiter' },

  // XML/HTML injection attempts
  { pattern: /<system>/i, name: 'xml_system_tag' },
  { pattern: /<instruction>/i, name: 'xml_instruction_tag' },
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

    // Normalize Unicode to catch obfuscation attempts (NFKC normalization)
    // This converts lookalike characters to their canonical forms
    const normalizedMessage = message.normalize('NFKC')

    // Check against injection patterns on both original and normalized
    for (const { pattern, name } of INJECTION_PATTERNS) {
      if (pattern.test(message) || pattern.test(normalizedMessage)) {
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
      // Normalize Unicode (NFKC) to standardize characters
      .normalize('NFKC')
      // Remove zero-width and invisible characters
      .replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u180E]/g, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Trim
      .trim()
  }
}

export const promptInjectionFilter = new PromptInjectionFilter()
