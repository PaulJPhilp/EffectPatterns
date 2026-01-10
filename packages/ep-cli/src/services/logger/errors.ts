/**
 * Logger service errors
 */

import { Data } from "effect";

/**
 * Error thrown when logger configuration is invalid
 */
export class LoggerConfigError extends Data.TaggedError("LoggerConfigError")<{
	readonly message: string;
}> {
	/**
	 * Create a new logger config error
	 */
	static readonly make = (message: string) => new LoggerConfigError({ message });
}

/**
 * Error thrown when log message formatting fails
 */
export class LogFormatError extends Data.TaggedError("LogFormatError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {
	/**
	 * Create a new log format error
	 */
	static readonly make = (message: string, cause?: unknown) =>
		new LogFormatError({ message, cause });
}
