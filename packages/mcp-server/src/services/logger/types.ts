import { Effect } from "effect";

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log entry structure
 */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly operation?: string;
  readonly duration?: number;
  readonly data?: Record<string, unknown>;
  readonly error?: {
    name: string;
    message: string;
    stack?: string;
  };
  readonly traceId?: string;
  readonly requestId?: string;
}

/**
 * Operation logger interface
 */
export interface OperationLogger {
  readonly debug: (
    message: string,
    data?: Record<string, unknown>
  ) => Effect.Effect<void>;
  readonly info: (
    message: string,
    data?: Record<string, unknown>
  ) => Effect.Effect<void>;
  readonly warn: (
    message: string,
    data?: Record<string, unknown>
  ) => Effect.Effect<void>;
  readonly error: (
    message: string,
    error?: unknown,
    data?: Record<string, unknown>
  ) => Effect.Effect<void>;
}
