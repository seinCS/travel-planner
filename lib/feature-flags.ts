/**
 * Feature Flags
 *
 * Centralized feature flag management for gradual rollout.
 */

/**
 * Check if chatbot feature is enabled for a specific user
 */
export function isChatbotEnabled(userId?: string): boolean {
  // Global kill switch
  if (process.env.CHATBOT_ENABLED !== 'true') {
    return false
  }

  // If no userId, check only global flag
  if (!userId) {
    return true
  }

  // Beta users whitelist
  const betaUsers = process.env.CHATBOT_BETA_USERS?.split(',').map(s => s.trim()).filter(Boolean) || []
  if (betaUsers.includes(userId)) {
    return true
  }

  // Percentage rollout
  const rolloutPercent = parseInt(process.env.CHATBOT_ROLLOUT_PERCENT || '0', 10)
  if (rolloutPercent >= 100) {
    return true
  }
  if (rolloutPercent <= 0) {
    return betaUsers.length > 0 ? false : true // If no beta users, default to enabled
  }

  // Consistent hash based on userId
  const hash = hashString(userId)
  return (hash % 100) < rolloutPercent
}

/**
 * Check if Function Calling is enabled for chat
 */
export function isFunctionCallingEnabled(_userId?: string): boolean {
  return process.env.CHATBOT_FUNCTION_CALLING_ENABLED === 'true'
}

/**
 * Simple string hash function for consistent percentage rollout
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
