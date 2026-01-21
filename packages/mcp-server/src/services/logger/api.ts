import { Effect } from "effect";
import { MCPConfigService } from "../config";
import { createLogEntry, formatLogEntry } from "./helpers";
import { LogEntry, LogLevel, OperationLogger } from "./types";

/**
 * MCP Server Logging Service
 */
export class MCPLoggerService extends Effect.Service<MCPLoggerService>()(
  "MCPLoggerService",
  {
    dependencies: [MCPConfigService.Default],
    effect: Effect.gen(function* () {
      const config = yield* MCPConfigService;
      const logLevel = config.logLevel;
      const loggingEnabled = config.loggingEnabled;

      // Log level hierarchy
      const levelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
      };

      /**
       * Check if a log level should be output
       */
      const shouldLog = (level: LogLevel): boolean => {
        return (
          loggingEnabled && levelPriority[level] >= levelPriority[logLevel]
        );
      };

      /**
       * Write log entry to console
       */
      const writeLog = (entry: LogEntry): Effect.Effect<void> => {
        if (!shouldLog(entry.level)) {
          return Effect.succeed(undefined);
        }

        const formatted = formatLogEntry(entry);
        const output = entry.level === "error" ? console.error : console.log;
        return Effect.sync(() => output(formatted));
      };

      /**
       * Log a message at the specified level
       */
      const log = (
        level: LogLevel,
        message: string,
        operation?: string,
        data?: Record<string, unknown>,
        error?: unknown
      ): Effect.Effect<void> => {
        const entry = createLogEntry(level, message, operation, data, error);
        return writeLog(entry);
      };

      /**
       * Create an operation-scoped logger
       */
      const withOperation = (operation: string): OperationLogger => ({
        debug: (message: string, data?: Record<string, unknown>) =>
          log("debug", message, operation, data),

        info: (message: string, data?: Record<string, unknown>) =>
          log("info", message, operation, data),

        warn: (message: string, data?: Record<string, unknown>) =>
          log("warn", message, operation, data),

        error: (
          message: string,
          error?: unknown,
          data?: Record<string, unknown>
        ) => log("error", message, operation, data, error),
      });

      /**
       * Create a duration-tracking logger
       */
      const withDuration = (startTime: number, operation: string) => {
        const duration = Date.now() - startTime;
        return {
          debug: (message: string, data?: Record<string, unknown>) =>
            log("debug", message, operation, { ...data, duration }),

          info: (message: string, data?: Record<string, unknown>) =>
            log("info", message, operation, { ...data, duration }),

          warn: (message: string, data?: Record<string, unknown>) =>
            log("warn", message, operation, { ...data, duration }),

          error: (
            message: string,
            error?: unknown,
            data?: Record<string, unknown>
          ) => log("error", message, operation, { ...data, duration }, error),
        };
      };

      /**
       * Log request start
       */
      const logRequestStart = (
        method: string,
        path: string,
        requestId?: string,
        traceId?: string
      ): Effect.Effect<void> => {
        return log(
          "info",
          `Request started: ${method} ${path}`,
          "http.request",
          {
            method,
            path,
            requestId,
            traceId,
          }
        );
      };

      /**
       * Log request completion
       */
      const logRequestComplete = (
        method: string,
        path: string,
        statusCode: number,
        duration: number,
        requestId?: string,
        traceId?: string
      ): Effect.Effect<void> => {
        const level: LogLevel = statusCode >= 400 ? "warn" : "info";
        return log(
          level,
          `Request completed: ${method} ${path} ${statusCode}`,
          "http.request",
          {
            method,
            path,
            statusCode,
            duration,
            requestId,
            traceId,
          }
        );
      };

      /**
       * Log request error
       */
      const logRequestError = (
        method: string,
        path: string,
        error: unknown,
        duration?: number,
        requestId?: string,
        traceId?: string
      ): Effect.Effect<void> => {
        return log(
          "error",
          `Request failed: ${method} ${path}`,
          "http.request",
          {
            method,
            path,
            duration,
            requestId,
            traceId,
          },
          error
        );
      };

      /**
       * Log cache operation
       */
      const logCacheOperation = (
        operation: string,
        key: string,
        hit: boolean,
        duration?: number
      ): Effect.Effect<void> => {
        return log(
          "debug",
          `Cache ${operation}: ${hit ? "hit" : "miss"}`,
          "cache",
          {
            operation,
            key,
            hit,
            duration,
          }
        );
      };

      /**
       * Log pattern operation
       */
      const logPatternOperation = (
        operation: string,
        patternId?: string,
        count?: number,
        duration?: number
      ): Effect.Effect<void> => {
        return log("debug", `Pattern ${operation}`, "patterns", {
          patternId,
          count,
          duration,
        });
      };

      return {
        // Core logging
        log,
        withOperation,
        withDuration,

        // HTTP request logging
        logRequestStart,
        logRequestComplete,
        logRequestError,

        // Specialized logging
        logCacheOperation,
        logPatternOperation,

        // Configuration access
        getLogLevel: () => Effect.succeed(logLevel),
        isLoggingEnabled: () => Effect.succeed(loggingEnabled),
      };
    }),
  }
) { }
