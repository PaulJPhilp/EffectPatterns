import { LogEntry, LogLevel } from "./types";

/**
 * Format log entry as JSON
 */
export const formatLogEntry = (entry: LogEntry): string => {
  return JSON.stringify(entry, null, 0);
};

/**
 * Create a log entry
 */
export const createLogEntry = (
  level: LogLevel,
  message: string,
  operation?: string,
  data?: Record<string, unknown>,
  error?: unknown,
  duration?: number
): LogEntry => {
  const baseEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    operation,
    duration,
    data,
  };

  if (error) {
    if (error instanceof Error) {
      return {
        ...baseEntry,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    } else {
      return {
        ...baseEntry,
        error: {
          name: "UnknownError",
          message: String(error),
        },
      };
    }
  }

  return baseEntry;
};

/**
 * Log levels and their priorities
 */
const LOG_LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get current log level priority
 */
function getLogLevelPriority(): number {
  const defaultLevel = process.env.NODE_ENV === "production" ? "warn" : "info";
  const level = process.env.LOG_LEVEL || defaultLevel;
  // MCP_DEBUG=true forces debug level
  if (process.env.MCP_DEBUG === "true") return LOG_LEVELS.debug;
  return LOG_LEVELS[level.toLowerCase()] ?? LOG_LEVELS[defaultLevel];
}

/**
 * Legacy logging functions (for backward compatibility)
 */
export function logDebug(
  message: string,
  data?: Record<string, unknown>
): void {
  if (getLogLevelPriority() <= LOG_LEVELS.debug) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "debug",
        message,
        data,
      })
    );
  }
}

export function logInfo(message: string, data?: Record<string, unknown>): void {
  if (getLogLevelPriority() <= LOG_LEVELS.info) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message,
        data,
      })
    );
  }
}

export function logWarn(message: string, data?: Record<string, unknown>): void {
  if (getLogLevelPriority() <= LOG_LEVELS.warn) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        message,
        data,
      })
    );
  }
}

export function logError(
  message: string,
  error?: unknown,
  data?: Record<string, unknown>
): void {
  if (getLogLevelPriority() <= LOG_LEVELS.error) {
    const logEntry: any = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      data,
    };

    if (error) {
      if (error instanceof Error) {
        logEntry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        logEntry.error = {
          name: "UnknownError",
          message: String(error),
        };
      }
    }

    console.error(JSON.stringify(logEntry));
  }
}
