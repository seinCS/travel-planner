/**
 * Circuit Breaker
 *
 * Local circuit breaker implementation for serverless environment.
 * Note: In serverless, state is not shared between instances.
 * For production, consider using a database-backed implementation.
 */

import { logger } from './logger'

type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerOptions {
  /** Failure threshold before opening circuit */
  failureThreshold: number
  /** Time in ms before attempting to reset */
  resetTimeout: number
  /** Name for logging */
  name: string
}

interface CircuitBreakerState {
  failures: number
  lastFailure: number | null
  state: CircuitState
}

// In-memory state (per serverless instance)
const circuits = new Map<string, CircuitBreakerState>()

function getState(name: string): CircuitBreakerState {
  if (!circuits.has(name)) {
    circuits.set(name, {
      failures: 0,
      lastFailure: null,
      state: 'closed',
    })
  }
  return circuits.get(name)!
}

export function createCircuitBreaker(options: CircuitBreakerOptions) {
  const { failureThreshold, resetTimeout, name } = options

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      const state = getState(name)

      // Check if circuit should reset to half-open
      if (
        state.state === 'open' &&
        state.lastFailure &&
        Date.now() - state.lastFailure >= resetTimeout
      ) {
        state.state = 'half-open'
        logger.info(`Circuit breaker ${name} transitioning to half-open`)
      }

      // Reject if circuit is open
      if (state.state === 'open') {
        throw new Error(`Circuit breaker ${name} is open. Service unavailable.`)
      }

      try {
        const result = await fn()

        // Success: reset circuit
        if (state.state === 'half-open') {
          state.state = 'closed'
          state.failures = 0
          logger.info(`Circuit breaker ${name} closed after successful call`)
        }

        return result
      } catch (error) {
        // Failure: increment counter
        state.failures++
        state.lastFailure = Date.now()

        if (state.failures >= failureThreshold) {
          state.state = 'open'
          logger.warn(`Circuit breaker ${name} opened after ${state.failures} failures`)
        }

        throw error
      }
    },

    getState(): CircuitState {
      return getState(name).state
    },

    reset() {
      const state = getState(name)
      state.failures = 0
      state.lastFailure = null
      state.state = 'closed'
      logger.info(`Circuit breaker ${name} manually reset`)
    },
  }
}

// Pre-configured circuit breaker for Gemini API
export const geminiCircuitBreaker = createCircuitBreaker({
  name: 'gemini',
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
})
