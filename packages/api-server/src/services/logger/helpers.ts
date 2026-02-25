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

