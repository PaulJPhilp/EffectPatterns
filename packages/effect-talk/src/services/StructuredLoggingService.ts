import { Effect, Context } from "effect";
import { LoggerService } from "./LoggerService";

/**
 * Structured Logging Service
 * Provides structured logging with metadata, performance tracking, and context propagation
 */

export interface LogContext {
  readonly requestId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly blockId?: string;
  readonly operation?: string;
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly timestamp: number;
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly context?: LogContext;
  readonly metadata?: Record<string, unknown>;
  readonly duration?: number;
  readonly error?: unknown;
}

export interface PerformanceMetrics {
  readonly startTime: number;
  readonly endTime?: number;
  readonly duration?: number;
  readonly memoryUsed?: number;
}

/**
 * Global log context for request-scoped logging
 */
export const LogContextVar = Context.Tag<LogContext>("LogContext");

export const StructuredLoggingService = Effect.gen(function* () {
  const baseLogger = yield* LoggerService;

  // Current log context (in real app, would use Context.local)
  let currentContext: LogContext = {};

  /**
   * Format log entry as JSON for structured logging
   */
  const formatLogEntry = (entry: LogEntry): string => {
    return JSON.stringify({
      timestamp: new Date(entry.timestamp).toISOString(),
      level: entry.level.toUpperCase(),
      message: entry.message,
      context: entry.context,
      metadata: entry.metadata,
      duration: entry.duration,
      error: entry.error instanceof Error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : entry.error,
    });
  };

  /**
   * Set current request context
   */
  const setContext = (context: LogContext) =>
    Effect.sync(() => {
      currentContext = { ...currentContext, ...context };
    });

  /**
   * Get current context
   */
  const getContext = (): Effect.Effect<LogContext> =>
    Effect.succeed(currentContext);

  /**
   * Clear context
   */
  const clearContext = () =>
    Effect.sync(() => {
      currentContext = {};
    });

  /**
   * Log with structured metadata
   */
  const logStructured = (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    metadata?: Record<string, unknown>,
    error?: unknown
  ): Effect.Effect<void> => {
    return Effect.sync(() => {
      const entry: LogEntry = {
        timestamp: Date.now(),
        level,
        message,
        context: currentContext,
        metadata,
        error,
      };

      const formatted = formatLogEntry(entry);
      const prefix = `[${level.toUpperCase()}]`;

      if (level === "error") {
        console.error(`${prefix} ${formatted}`);
      } else if (level === "warn") {
        console.warn(`${prefix} ${formatted}`);
      } else {
        console.log(`${prefix} ${formatted}`);
      }
    });
  };

  /**
   * Debug level logging
   */
  const debug = (message: string, metadata?: Record<string, unknown>) =>
    logStructured("debug", message, metadata);

  /**
   * Info level logging
   */
  const info = (message: string, metadata?: Record<string, unknown>) =>
    logStructured("info", message, metadata);

  /**
   * Warn level logging
   */
  const warn = (message: string, metadata?: Record<string, unknown>) =>
    logStructured("warn", message, metadata);

  /**
   * Error level logging
   */
  const error = (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => logStructured("error", message, metadata, error);

  /**
   * Log API request
   */
  const logRequest = (
    method: string,
    path: string,
    metadata?: Record<string, unknown>
  ) =>
    Effect.gen(function* () {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      yield* setContext({ requestId, operation: `${method} ${path}` });
      yield* info(`${method} ${path}`, {
        requestId,
        ...metadata,
      });
      return requestId;
    });

  /**
   * Log API response
   */
  const logResponse = (
    requestId: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, unknown>
  ) =>
    info(`Response ${statusCode}`, {
      requestId,
      statusCode,
      duration,
      ...metadata,
    });

  /**
   * Track operation performance
   */
  const trackOperation = <A>(
    operationName: string,
    effect: Effect.Effect<A, never, never>
  ): Effect.Effect<A> => {
    return Effect.gen(function* () {
      const startTime = Date.now();
      const startMetrics: PerformanceMetrics = { startTime };

      yield* info(`Operation started: ${operationName}`, {
        operation: operationName,
      });

      const result = yield* effect;

      const endTime = Date.now();
      const duration = endTime - startTime;

      yield* info(`Operation completed: ${operationName}`, {
        operation: operationName,
        duration,
        durationMs: duration,
      });

      return result;
    });
  };

  /**
   * Track block execution
   */
  const logBlockExecution = (
    blockId: string,
    command: string,
    status: string,
    metadata?: Record<string, unknown>
  ) =>
    info(`Block execution: ${status}`, {
      blockId,
      command,
      status,
      ...metadata,
    });

  /**
   * Track process lifecycle
   */
  const logProcessEvent = (
    pid: number,
    event: "spawn" | "exit" | "signal" | "error",
    metadata?: Record<string, unknown>
  ) =>
    info(`Process event: ${event}`, {
      pid,
      event,
      ...metadata,
    });

  /**
   * Track session changes
   */
  const logSessionChange = (
    sessionId: string,
    changeType: "created" | "updated" | "saved" | "restored",
    metadata?: Record<string, unknown>
  ) =>
    info(`Session ${changeType}: ${sessionId}`, {
      sessionId,
      changeType,
      ...metadata,
    });

  /**
   * Log performance metrics
   */
  const logMetrics = (
    label: string,
    metrics: Record<string, number | string>,
    metadata?: Record<string, unknown>
  ) =>
    info(`Metrics: ${label}`, {
      metrics,
      ...metadata,
    });

  /**
   * Audit log for important operations
   */
  const logAudit = (
    action: string,
    subject: string,
    result: "success" | "failure",
    metadata?: Record<string, unknown>
  ) =>
    info(`AUDIT: ${action} on ${subject}`, {
      action,
      subject,
      result,
      ...metadata,
    });

  /**
   * Create a child context for nested operations
   */
  const createChildContext = (childName: string) =>
    Effect.gen(function* () {
      const parent = yield* getContext();
      const childId = `${childName}-${Date.now()}`;
      yield* setContext({
        ...parent,
        parentOperation: parent.operation,
        operation: childName,
        childId,
      });
      return childId;
    });

  /**
   * Restore parent context
   */
  const restoreContext = (previousContext: LogContext) =>
    setContext(previousContext);

  return {
    // Basic logging
    debug,
    info,
    warn,
    error,

    // Context management
    setContext,
    getContext,
    clearContext,

    // Specialized logging
    logRequest,
    logResponse,
    logBlockExecution,
    logProcessEvent,
    logSessionChange,
    logMetrics,
    logAudit,

    // Performance tracking
    trackOperation,
    createChildContext,
    restoreContext,

    // Utilities
    formatLogEntry,
  } as const;
}).pipe(
  Effect.andThen((methods) => Effect.sync(() => methods))
);

export const StructuredLoggingServiceLayer = Effect.Service.layer(
  StructuredLoggingService
);
