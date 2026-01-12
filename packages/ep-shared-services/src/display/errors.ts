/**
 * Display service errors
 */

import { Data } from "effect";

/**
 * Error thrown when display operation fails
 */
export class DisplayError extends Data.TaggedError("DisplayError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {
	/**
	 * Create a new display error
	 */
	static readonly make = (message: string, cause?: unknown) =>
		new DisplayError({ message, cause });
}

/**
 * Error thrown when TUI operation fails
 */
export class TUIError extends Data.TaggedError("TUIError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {
	/**
	 * Create a new TUI error
	 */
	static readonly make = (message: string, cause?: unknown) =>
		new TUIError({ message, cause });
}
