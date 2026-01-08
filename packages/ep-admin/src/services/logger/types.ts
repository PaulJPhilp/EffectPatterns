/**
 * Logger service types
 */

/**
 * Available log levels in order of verbosity
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

/**
 * Array of valid log level values
 */
export const LOG_LEVEL_VALUES: readonly LogLevel[] = [
	"debug",
	"info",
	"warn",
	"error",
	"silent",
] as const;

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

/**
 * Parse a string into a LogLevel
 */
export const parseLogLevel = (value: string): LogLevel => {
	const normalized = value.toLowerCase();
	if (LOG_LEVEL_VALUES.includes(normalized as LogLevel)) {
		return normalized as LogLevel;
	}
	return "info"; // default fallback
};

/**
 * Output format options
 */
export type OutputFormat = "text" | "json";

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
