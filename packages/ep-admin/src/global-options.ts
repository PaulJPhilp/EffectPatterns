/**
 * Global CLI options for ep-admin
 *
 * These options are available on all commands and control
 * cross-cutting concerns like logging, output format, and colors.
 */

import { Options } from "@effect/cli";
import type { OutputFormat } from "./constants.js";
import { type LogLevel } from "./services/logger/index.js";

// =============================================================================
// Color Control Option
// =============================================================================

const noColorOption = Options.boolean("no-color").pipe(
    Options.withDescription("Disable colored output (useful for CI/scripts)"),
    Options.withDefault(false)
);

const jsonOutputOption = Options.boolean("json").pipe(
    Options.withDescription("Output results in JSON format for programmatic use"),
    Options.withDefault(false)
);

const verboseOption = Options.boolean("verbose").pipe(
    Options.withAlias("v"),
    Options.withDescription("Show detailed output and diagnostic information"),
    Options.withDefault(false)
);

const quietOption = Options.boolean("quiet").pipe(
    Options.withAlias("q"),
    Options.withDescription("Suppress all output except errors"),
    Options.withDefault(false)
);

const debugOption = Options.boolean("debug").pipe(
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
    noColor: noColorOption,
    json: jsonOutputOption,
    verbose: verboseOption,
    quiet: quietOption,
    debug: debugOption,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

const mapCliLogLevel = (
    value: string
): "debug" | "info" | "warn" | "error" | "silent" | undefined => {
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
        case "all":
        case "trace":
        case "debug":
            return "debug";
        case "info":
            return "info";
        case "warning":
            return "warn";
        case "error":
        case "fatal":
            return "error";
        case "none":
            return "silent";
        default:
            return undefined;
    }
};

const getGlobalCliLogLevel = (
    argv: ReadonlyArray<string> = process.argv
): "debug" | "info" | "warn" | "error" | "silent" | undefined => {
    for (let i = 0; i < argv.length; i++) {
        const current = argv[i];
        if (!current) continue;

        if (current.startsWith("--log-level=")) {
            return mapCliLogLevel(current.slice("--log-level=".length));
        }
        if (current === "--log-level") {
            const next = argv[i + 1];
            if (next) return mapCliLogLevel(next);
        }
    }

    return undefined;
};

/**
 * Resolve effective log level from options
 *
 * Priority: debug > quiet > CLI --log-level > LOG_LEVEL env > default
 */
export const resolveLogLevel = (options: Partial<GlobalOptions>): LogLevel => {
    if (options.debug) return "debug";
    if (options.quiet) return "error";
    const cliLevel = getGlobalCliLogLevel(process.argv);
    if (cliLevel) return cliLevel;
    const envLevel = process.env.LOG_LEVEL?.trim().toLowerCase();
    switch (envLevel) {
        case "debug":
            return "debug";
        case "info":
            return "info";
        case "warn":
        case "warning":
            return "warn";
        case "error":
        case "fatal":
            return "error";
        case "silent":
        case "none":
            return "silent";
        default:
            return "info";
    }
};

/**
 * Resolve output format from options
 */
export const resolveOutputFormat = (options: Partial<GlobalOptions>): OutputFormat => {
    return options.json ? "json" : "text";
};

/**
 * Check if colors should be used based on options and environment (synchronous version)
 * 
 * For use in Layer and sync contexts only.
 * For Effect contexts, use shouldUseColorsEffect.
 */
const shouldUseColorSync = (options: Partial<GlobalOptions>): boolean => {
    // Explicit --no-color flag
    if (options.noColor) return false;

    // JSON output should not have colors
    if (options.json) return false;

    // Check common environment variables synchronously
    if (process.env.NO_COLOR) return false;
    if (process.env.CI) return false;
    if (process.env.TERM === "dumb") return false;

    // Check if stdout is a TTY
    if (!process.stdout.isTTY) return false;

    return true;
};

/**
 * Check if colors should be used based on options and environment
 */
export const shouldUseColors = shouldUseColorSync;

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
            useColors: shouldUseColorSync(options),
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
    useColors: shouldUseColorSync(options),
    verbose: options.verbose ?? false,
});
