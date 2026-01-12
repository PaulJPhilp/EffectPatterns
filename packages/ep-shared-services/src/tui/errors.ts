/**
 * TUI Service Errors
 */

import { Data } from "effect";

/**
 * Error thrown when TUI module fails to load
 */
export class TUILoadError extends Data.TaggedError("TUILoadError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {
	/**
	 * Create a new TUI load error
	 */
	static readonly make = (message: string, cause?: unknown) =>
		new TUILoadError({ message, cause });
}

/**
 * Error thrown when TUI service is unavailable
 */
export class TUIUnavailableError extends Data.TaggedError("TUIUnavailableError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {
	/**
	 * Create a new TUI unavailable error
	 */
	static readonly make = (message: string, cause?: unknown) =>
		new TUIUnavailableError({ message, cause });
}
