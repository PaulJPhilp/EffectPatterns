/**
 * Execution service errors
 */

import { Data } from "effect";

/**
 * Error during script execution
 */
export class ExecutionError extends Data.TaggedError("ExecutionError")<{
	readonly message: string;
	readonly scriptOutput?: string;
	readonly cause?: unknown;
}> {
	static make(message: string, scriptOutput?: string, cause?: unknown) {
		return new ExecutionError({ message, scriptOutput, cause });
	}
}

/**
 * Specifically for capture where we want the exit code
 */
export class ScriptExecutionError extends Data.TaggedError("ScriptExecutionError")<{
	readonly message: string;
	readonly exitCode: number;
	readonly scriptOutput?: string;
}> {
	static make(message: string, exitCode: number, scriptOutput?: string) {
		return new ScriptExecutionError({ message, exitCode, scriptOutput });
	}
}
