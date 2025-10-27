/**
 * MCP Server Logging Service
 *
 * Production-ready structured logging with operation tracking,
 * performance monitoring, and configurable log levels.
 */

import { Effect } from 'effect';
import { MCPConfigService } from './config.js';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
    readonly debug: (message: string, data?: Record<string, unknown>) => Effect.Effect<void>;
    readonly info: (message: string, data?: Record<string, unknown>) => Effect.Effect<void>;
    readonly warn: (message: string, data?: Record<string, unknown>) => Effect.Effect<void>;
    readonly error: (message: string, error?: unknown, data?: Record<string, unknown>) => Effect.Effect<void>;
}

/**
 * MCP Server Logging Service
 */
export class MCPLoggerService extends Effect.Service<MCPLoggerService>()('MCPLoggerService', {
    dependencies: [MCPConfigService.Default],
    effect: Effect.gen(function* () {
        const config = yield* MCPConfigService;
        const logLevel = yield* config.getLogLevel();
        const loggingEnabled = yield* config.isLoggingEnabled();

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
            return loggingEnabled && levelPriority[level] >= levelPriority[logLevel];
        };

        /**
         * Format log entry as JSON
         */
        const formatLogEntry = (entry: LogEntry): string => {
            return JSON.stringify(entry, null, 0);
        };

        /**
         * Write log entry to console
         */
        const writeLog = (entry: LogEntry): Effect.Effect<void> => {
            if (!shouldLog(entry.level)) {
                return Effect.succeed(undefined);
            }

            const formatted = formatLogEntry(entry);
            const output = entry.level === 'error' ? console.error : console.log;
            return Effect.sync(() => output(formatted));
        };        /**
     * Create a log entry
     */
        const createLogEntry = (
            level: LogLevel,
            message: string,
            operation?: string,
            data?: Record<string, unknown>,
            error?: unknown,
            duration?: number,
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
                            name: 'UnknownError',
                            message: String(error),
                        },
                    };
                }
            }

            return baseEntry;
        };

        /**
         * Log a message at the specified level
         */
        const log = (
            level: LogLevel,
            message: string,
            operation?: string,
            data?: Record<string, unknown>,
            error?: unknown,
        ): Effect.Effect<void> => {
            const entry = createLogEntry(level, message, operation, data, error);
            return writeLog(entry);
        };

        /**
         * Create an operation-scoped logger
         */
        const withOperation = (operation: string): OperationLogger => ({
            debug: (message: string, data?: Record<string, unknown>) =>
                log('debug', message, operation, data),

            info: (message: string, data?: Record<string, unknown>) =>
                log('info', message, operation, data),

            warn: (message: string, data?: Record<string, unknown>) =>
                log('warn', message, operation, data),

            error: (message: string, error?: unknown, data?: Record<string, unknown>) =>
                log('error', message, operation, data, error),
        });

        /**
         * Create a duration-tracking logger
         */
        const withDuration = (startTime: number, operation: string) => {
            const duration = Date.now() - startTime;
            return {
                debug: (message: string, data?: Record<string, unknown>) =>
                    log('debug', message, operation, { ...data, duration }),

                info: (message: string, data?: Record<string, unknown>) =>
                    log('info', message, operation, { ...data, duration }),

                warn: (message: string, data?: Record<string, unknown>) =>
                    log('warn', message, operation, { ...data, duration }),

                error: (message: string, error?: unknown, data?: Record<string, unknown>) =>
                    log('error', message, operation, { ...data, duration }, error),
            };
        };        /**
         * Log request start
         */
        const logRequestStart = (
            method: string,
            path: string,
            requestId?: string,
            traceId?: string,
        ): Effect.Effect<void> => {
            return log('info', `Request started: ${method} ${path}`, 'http.request', {
                method,
                path,
                requestId,
                traceId,
            });
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
            traceId?: string,
        ): Effect.Effect<void> => {
            const level: LogLevel = statusCode >= 400 ? 'warn' : 'info';
            return log(level, `Request completed: ${method} ${path} ${statusCode}`, 'http.request', {
                method,
                path,
                statusCode,
                duration,
                requestId,
                traceId,
            });
        };        /**
         * Log request error
         */
        const logRequestError = (
            method: string,
            path: string,
            error: unknown,
            duration?: number,
            requestId?: string,
            traceId?: string,
        ): Effect.Effect<void> => {
            return log('error', `Request failed: ${method} ${path}`, 'http.request', {
                method,
                path,
                duration,
                requestId,
                traceId,
            }, error);
        };

        /**
         * Log cache operation
         */
        const logCacheOperation = (
            operation: string,
            key: string,
            hit: boolean,
            duration?: number,
        ): Effect.Effect<void> => {
            return log('debug', `Cache ${operation}: ${hit ? 'hit' : 'miss'}`, 'cache', {
                operation,
                key,
                hit,
                duration,
            });
        };

        /**
         * Log pattern operation
         */
        const logPatternOperation = (
            operation: string,
            patternId?: string,
            count?: number,
            duration?: number,
        ): Effect.Effect<void> => {
            return log('debug', `Pattern ${operation}`, 'patterns', {
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
    })
}) { }

/**
 * Default MCP logger service layer
 */
export const MCPLoggerServiceLive = MCPLoggerService.Default;

/**
 * Legacy logging functions (for backward compatibility)
 */
export function logDebug(message: string, data?: Record<string, unknown>): void {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        data,
    }));
}

export function logInfo(message: string, data?: Record<string, unknown>): void {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        data,
    }));
}

export function logWarn(message: string, data?: Record<string, unknown>): void {
    console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        data,
    }));
}

export function logError(message: string, error?: unknown, data?: Record<string, unknown>): void {
    const logEntry: any = {
        timestamp: new Date().toISOString(),
        level: 'error',
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
                name: 'UnknownError',
                message: String(error),
            };
        }
    }

    console.error(JSON.stringify(logEntry));
}