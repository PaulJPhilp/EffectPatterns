/**
 * Execution service errors
 */

import { Data } from "effect";

/**
 * Error thrown when script execution fails
 */
export class ExecutionError extends Data.TaggedError("ExecutionError")<{
	readonly message: string;
	readonly scriptOutput?: string;
	readonly cause?: unknown;
}> {
	/**
	 * Create a new execution error
	 */
	static readonly make = (
		message: string,
		scriptOutput?: string,
		cause?: unknown
	) => new ExecutionError({ message, scriptOutput, cause });
}

/**
 * Error thrown when script execution times out
 */
export class TimeoutError extends Data.TaggedError("TimeoutError")<{
	readonly message: string;
	readonly timeout: number;
}> {
	/**
	 * Create a new timeout error
	 */
	static readonly make = (message: string, timeout: number) =>
		new TimeoutError({ message, timeout });
}

/**
 * Error thrown when script output capture fails
 */
export class ScriptExecutionError extends Data.TaggedError("ScriptExecutionError")<{
	readonly message: string;
	readonly exitCode: number;
	readonly stderr?: string;
}> {
	/**
	 * Create a new script execution error
	 */
	static readonly make = (message: string, exitCode: number, stderr?: string) =>
		new ScriptExecutionError({ message, exitCode, stderr });
}
