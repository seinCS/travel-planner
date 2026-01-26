/**
 * Logger
 *
 * Structured logging utility for consistent log format.
 * In production, logs are JSON formatted for log aggregation.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLogLevel = (process.env.LOG_LEVEL || 'info') as LogLevel

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString()

  if (process.env.NODE_ENV === 'production') {
    // JSON format for production (log aggregation)
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...context,
    })
  }

  // Human-readable format for development
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', message, context))
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog('info')) {
      console.info(formatLog('info', message, context))
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, context))
    }
  },

  error(message: string, context?: LogContext) {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, context))
    }
  },

  /**
   * Log chat-related events (sanitized - no message content)
   */
  chat(event: string, data: { sessionId?: string; userId?: string; messageId?: string; error?: string }) {
    this.info(`[Chat] ${event}`, {
      ...data,
      // Never log actual message content
    })
  },
}
