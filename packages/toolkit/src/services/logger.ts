/**
 * Toolkit Logging Service
 *
 * Structured logging service for toolkit operations with configurable
 * log levels and context-aware logging.
 */

import { Effect } from 'effect';
import { ToolkitConfig } from './config.js';

/**
 * Log level enumeration
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * Log entry structure
 */
export interface LogEntry {
    readonly level: LogLevel;
    readonly message: string;
    readonly timestamp: number;
    readonly context?: Record<string, unknown>;
    readonly operation?: string;
    readonly duration?: number;
}

/**
 * Toolkit logging service
 */
export class ToolkitLogger extends Effect.Service<ToolkitLogger>()('ToolkitLogger', {
    effect: Effect.gen(function* () {
        const config = yield* ToolkitConfig;

        const isLoggingEnabled = yield* config.isLoggingEnabled();

        const log = (level: LogLevel, message: string, context?: Record<string, unknown>) =>
            Effect.gen(function* () {
                if (!isLoggingEnabled) {
                    return;
                }

                const entry: LogEntry = {
                    level,
                    message,
                    timestamp: Date.now(),
                    context,
                };

                // In production, this would integrate with a proper logging system
                const levelName = LogLevel[level].toLowerCase();
                const contextStr = context ? ` ${JSON.stringify(context)}` : '';

                console.log(`[${new Date(entry.timestamp).toISOString()}] ${levelName.toUpperCase()}: ${message}${contextStr}`);
            });

        const debug = (message: string, context?: Record<string, unknown>) =>
            log(LogLevel.DEBUG, message, context);

        const info = (message: string, context?: Record<string, unknown>) =>
            log(LogLevel.INFO, message, context);

        const warn = (message: string, context?: Record<string, unknown>) =>
            log(LogLevel.WARN, message, context);

        const error = (message: string, context?: Record<string, unknown>) =>
            log(LogLevel.ERROR, message, context);

        const withOperation = (operation: string) => ({
            debug: (message: string, context?: Record<string, unknown>) =>
                debug(message, { ...context, operation }),
            info: (message: string, context?: Record<string, unknown>) =>
                info(message, { ...context, operation }),
            warn: (message: string, context?: Record<string, unknown>) =>
                warn(message, { ...context, operation }),
            error: (message: string, context?: Record<string, unknown>) =>
                error(message, { ...context, operation }),
        });

        const withDuration = (startTime: number, operation: string) => {
            const duration = Date.now() - startTime;
            return {
                debug: (message: string, context?: Record<string, unknown>) =>
                    debug(message, { ...context, operation, duration }),
                info: (message: string, context?: Record<string, unknown>) =>
                    info(message, { ...context, operation, duration }),
                warn: (message: string, context?: Record<string, unknown>) =>
                    warn(message, { ...context, operation, duration }),
                error: (message: string, context?: Record<string, unknown>) =>
                    error(message, { ...context, operation, duration }),
            };
        };

        return {
            log,
            debug,
            info,
            warn,
            error,
            withOperation,
            withDuration,
        };
    })
}) { }

/**
 * Default logging layer
 */
export const ToolkitLoggerLive = ToolkitLogger.Default;