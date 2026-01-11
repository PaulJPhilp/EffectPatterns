/**
 * Global CLI options for ep-admin
 *
 * These options are available on all commands and control
 * cross-cutting concerns like logging, output format, and colors.
 */

import { Options } from "@effect/cli";
import { OUTPUT_FORMATS, type OutputFormat } from "./constants.js";
import { LOG_LEVEL_VALUES, type LogLevel } from "./services/logger/index.js";

// =============================================================================
// Log Level Option
// =============================================================================

/**
 * --log-level option for controlling output verbosity
 *
 * Values: debug, info, warn, error, silent
 * Default: info
 */
export const logLevelOption = Options.choice("log-level", LOG_LEVEL_VALUES).pipe(
    Options.withDescription(
        "Set the log level for output verbosity (debug, info, warn, error, silent)"
    ),
    Options.withDefault("info" as LogLevel)
);

// =============================================================================
// Color Control Option
// =============================================================================

/**
 * --no-color flag to disable ANSI color codes
 *
 * Useful for CI environments or piping output to files
 */
export const noColorOption = Options.boolean("no-color").pipe(
    Options.withDescription("Disable colored output (useful for CI/scripts)"),
    Options.withDefault(false)
);

// =============================================================================
// Output Format Option
// =============================================================================

/**
 * --json flag for JSON output format
 *
 * Useful for programmatic parsing of CLI output
 */
export const jsonOutputOption = Options.boolean("json").pipe(
    Options.withDescription("Output results in JSON format for programmatic use"),
    Options.withDefault(false)
);

/**
 * --format option for explicit format selection
 *
 * Values: text, json
 * Default: text
 */
export const formatOption = Options.choice("format", OUTPUT_FORMATS).pipe(
    Options.withDescription("Output format (text or json)"),
    Options.withDefault("text" as OutputFormat)
);

// =============================================================================
// Verbose Option (Enhanced)
// =============================================================================

/**
 * --verbose / -v flag for detailed output
 *
 * Enables additional diagnostic information
 */
export const verboseOption = Options.boolean("verbose").pipe(
    Options.withAlias("v"),
    Options.withDescription("Show detailed output and diagnostic information"),
    Options.withDefault(false)
);

// =============================================================================
// Quiet Option
// =============================================================================

/**
 * --quiet / -q flag for minimal output
 *
 * Suppresses all output except errors
 */
export const quietOption = Options.boolean("quiet").pipe(
    Options.withAlias("q"),
    Options.withDescription("Suppress all output except errors"),
    Options.withDefault(false)
);

// =============================================================================
// Debug Option
// =============================================================================

/**
 * --debug flag for maximum verbosity
 *
 * Enables debug-level logging with stack traces
 */
export const debugOption = Options.boolean("debug").pipe(
    Options.withDescription("Enable debug mode with maximum verbosity and stack traces"),
    Options.withDefault(false)
);

// =============================================================================
// Global Options Struct
// =============================================================================

/**
 * Combined global options type
 */
export interface GlobalOptions {
    readonly logLevel: LogLevel;
    readonly noColor: boolean;
    readonly json: boolean;
    readonly verbose: boolean;
    readonly quiet: boolean;
    readonly debug: boolean;
}

/**
 * All global options combined for easy composition
 *
 * Usage:
 * ```typescript
 * const myCommand = Command.make("my-command", {
 *   options: Options.all({
 *     ...globalOptions,
 *     myOption: Options.text("my-option"),
 *   }),
 * });
 * ```
 */
export const globalOptions = {
    logLevel: logLevelOption,
    noColor: noColorOption,
    json: jsonOutputOption,
    verbose: verboseOption,
    quiet: quietOption,
    debug: debugOption,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Resolve effective log level from options
 *
 * Priority: debug > quiet > logLevel
 */
export const resolveLogLevel = (options: Partial<GlobalOptions>): LogLevel => {
    if (options.debug) return "debug";
    if (options.quiet) return "error";
    return options.logLevel ?? "info";
};

/**
 * Resolve output format from options
 */
export const resolveOutputFormat = (options: Partial<GlobalOptions>): OutputFormat => {
    return options.json ? "json" : "text";
};

/**
 * Check if colors should be used based on options and environment
 */
export const shouldUseColors = (options: Partial<GlobalOptions>): boolean => {
    // Explicit --no-color flag
    if (options.noColor) return false;

    // JSON output should not have colors
    if (options.json) return false;

    // Check common CI environment variables
    if (process.env.NO_COLOR) return false;
    if (process.env.CI) return false;
    if (process.env.TERM === "dumb") return false;

    // Check if stdout is a TTY
    if (!process.stdout.isTTY) return false;

    return true;
};

// =============================================================================
// Logger Configuration from Options
// =============================================================================

import { Effect } from "effect";
import { Logger, type LoggerConfig } from "./services/logger/index.js";

/**
 * Configure the Logger service based on global CLI options
 *
 * Call this at the start of a command handler to apply user's preferences
 *
 * @example
 * ```typescript
 * const myCommand = Command.make("my-cmd", { options }, ({ options }) =>
 *   Effect.gen(function* () {
 *     yield* configureLoggerFromOptions(options);
 *     // ... rest of command
 *   })
 * );
 * ```
 */
export const configureLoggerFromOptions = (
    options: Partial<GlobalOptions>
): Effect.Effect<void, never, Logger> =>
    Effect.gen(function* () {
        const logger = yield* Logger;

        const config: Partial<LoggerConfig> = {
            logLevel: resolveLogLevel(options),
            outputFormat: resolveOutputFormat(options),
            useColors: shouldUseColors(options),
            verbose: options.verbose ?? false,
        };

        yield* logger.updateConfig(config);
    });

/**
 * Create a LoggerConfig from global options (synchronous, for Layer creation)
 */
export const loggerConfigFromOptions = (
    options: Partial<GlobalOptions>
): LoggerConfig => ({
    logLevel: resolveLogLevel(options),
    outputFormat: resolveOutputFormat(options),
    useColors: shouldUseColors(options),
    verbose: options.verbose ?? false,
});
