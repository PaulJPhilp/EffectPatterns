/**
 * Centralized logging service for ep-admin CLI
 *
 * Provides consistent logging with configurable log levels,
 * color output control, and format options (text/JSON).
 */

import { Context, Effect, Layer, Ref } from "effect";

// =============================================================================
// Log Level Types
// =============================================================================

/**
 * Available log levels in order of verbosity
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

/**
 * Numeric priority for log levels (lower = more verbose)
 */
export const LogLevelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};

// =============================================================================
// Output Format Types
// =============================================================================

/**
 * Output format options
 */
export type OutputFormat = "text" | "json";

// =============================================================================
// Logger Configuration
// =============================================================================

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
    readonly logLevel: LogLevel;
    readonly useColors: boolean;
    readonly outputFormat: OutputFormat;
    readonly verbose: boolean;
}

/**
 * Default logger configuration
 */
export const defaultLoggerConfig: LoggerConfig = {
    logLevel: "info",
    useColors: true,
    outputFormat: "text",
    verbose: false,
};

// =============================================================================
// ANSI Color Codes
// =============================================================================

const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
} as const;

/**
 * Icons for different log levels
 */
const ICONS: Record<string, string> = {
    debug: "🔍",
    info: "ℹ",
    warn: "⚠",
    error: "✖",
    success: "✓",
    silent: "",
};

/**
 * Colors for different log levels
 */
const LEVEL_COLORS: Record<string, string> = {
    debug: COLORS.gray,
    info: COLORS.blue,
    warn: COLORS.yellow,
    error: COLORS.red,
    success: COLORS.green,
    silent: "",
};

// =============================================================================
// Logger Service Interface
// =============================================================================

/**
 * Logger service interface
 */
export interface LoggerService {
    readonly config: LoggerConfig;

    /** Log a debug message (most verbose) */
    readonly debug: (message: string, data?: unknown) => Effect.Effect<void>;

    /** Log an info message */
    readonly info: (message: string, data?: unknown) => Effect.Effect<void>;

    /** Log a warning message */
    readonly warn: (message: string, data?: unknown) => Effect.Effect<void>;

    /** Log an error message */
    readonly error: (message: string, data?: unknown) => Effect.Effect<void>;

    /** Log a success message (info level) */
    readonly success: (message: string, data?: unknown) => Effect.Effect<void>;

    /** Check if a log level would be displayed */
    readonly shouldLog: (level: LogLevel) => boolean;

    /** Update the logger configuration */
    readonly updateConfig: (update: Partial<LoggerConfig>) => Effect.Effect<void>;

    /** Get current configuration */
    readonly getConfig: () => Effect.Effect<LoggerConfig>;
}

// =============================================================================
// Logger Service Tag
// =============================================================================

export class Logger extends Context.Tag("Logger")<Logger, LoggerService>() { }

// =============================================================================
// Logger Implementation
// =============================================================================

/**
 * Format a message based on configuration
 */
const formatMessage = (
    level: LogLevel | "success",
    message: string,
    data: unknown | undefined,
    config: LoggerConfig
): string => {
    if (config.outputFormat === "json") {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...(data !== undefined ? { data } : {}),
        });
    }

    // Text format
    const icon = ICONS[level] ?? "";
    const color = config.useColors ? (LEVEL_COLORS[level] ?? "") : "";
    const reset = config.useColors ? COLORS.reset : "";

    let output = `${color}${icon}${reset} ${message}`;

    if (data !== undefined && config.verbose) {
        const dataStr =
            typeof data === "string" ? data : JSON.stringify(data, null, 2);
        output += `\n${COLORS.dim}${dataStr}${reset}`;
    }

    return output;
};

/**
 * Write to appropriate output stream
 */
const writeOutput = (
    level: LogLevel | "success",
    message: string
): Effect.Effect<void> => {
    if (level === "error") {
        return Effect.sync(() => console.error(message));
    }
    if (level === "warn") {
        return Effect.sync(() => console.warn(message));
    }
    return Effect.sync(() => console.log(message));
};

/**
 * Create a logger service with the given initial configuration
 */
export const makeLogger = (
    initialConfig: LoggerConfig = defaultLoggerConfig
): Effect.Effect<LoggerService> =>
    Effect.gen(function* () {
        const configRef = yield* Ref.make(initialConfig);

        const shouldLog = (level: LogLevel): boolean => {
            const currentConfig = Effect.runSync(Ref.get(configRef));
            return LogLevelPriority[level] >= LogLevelPriority[currentConfig.logLevel];
        };

        const log = (
            level: LogLevel | "success",
            message: string,
            data?: unknown
        ): Effect.Effect<void> =>
            Effect.gen(function* () {
                const config = yield* Ref.get(configRef);
                const effectiveLevel = level === "success" ? "info" : level;

                if (
                    LogLevelPriority[effectiveLevel] < LogLevelPriority[config.logLevel]
                ) {
                    return;
                }

                const formatted = formatMessage(level, message, data, config);
                yield* writeOutput(level, formatted);
            });

        return {
            config: initialConfig,

            debug: (message: string, data?: unknown) => log("debug", message, data),
            info: (message: string, data?: unknown) => log("info", message, data),
            warn: (message: string, data?: unknown) => log("warn", message, data),
            error: (message: string, data?: unknown) => log("error", message, data),
            success: (message: string, data?: unknown) =>
                log("success", message, data),

            shouldLog,

            updateConfig: (update: Partial<LoggerConfig>) =>
                Ref.update(configRef, (current) => ({ ...current, ...update })),

            getConfig: () => Ref.get(configRef),
        };
    });

// =============================================================================
// Logger Layer
// =============================================================================

/**
 * Create a logger layer with optional configuration
 */
export const LoggerLive = (config?: Partial<LoggerConfig>) =>
    Layer.effect(Logger, makeLogger({ ...defaultLoggerConfig, ...config }));

/**
 * Default logger layer with standard configuration
 */
export const LoggerDefault = LoggerLive();

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Log a debug message using the Logger service
 */
export const logDebug = (message: string, data?: unknown) =>
    Effect.gen(function* () {
        const logger = yield* Logger;
        yield* logger.debug(message, data);
    });

/**
 * Log an info message using the Logger service
 */
export const logInfo = (message: string, data?: unknown) =>
    Effect.gen(function* () {
        const logger = yield* Logger;
        yield* logger.info(message, data);
    });

/**
 * Log a warning message using the Logger service
 */
export const logWarn = (message: string, data?: unknown) =>
    Effect.gen(function* () {
        const logger = yield* Logger;
        yield* logger.warn(message, data);
    });

/**
 * Log an error message using the Logger service
 */
export const logError = (message: string, data?: unknown) =>
    Effect.gen(function* () {
        const logger = yield* Logger;
        yield* logger.error(message, data);
    });

/**
 * Log a success message using the Logger service
 */
export const logSuccess = (message: string, data?: unknown) =>
    Effect.gen(function* () {
        const logger = yield* Logger;
        yield* logger.success(message, data);
    });

// =============================================================================
// Parse Log Level from String
// =============================================================================

/**
 * Parse a log level string, returning the level or undefined if invalid
 */
export const parseLogLevel = (value: string): LogLevel | undefined => {
    const normalized = value.toLowerCase().trim();
    if (normalized in LogLevelPriority) {
        return normalized as LogLevel;
    }
    return undefined;
};

/**
 * Valid log level values for CLI options
 */
export const LOG_LEVEL_VALUES = [
    "debug",
    "info",
    "warn",
    "error",
    "silent",
] as const;
