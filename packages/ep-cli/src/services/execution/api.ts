/**
 * Execution service API
 */

import { Effect } from "effect";
import type { ExecutionError, ScriptExecutionError } from "./errors.js";
import type { ExecutionOptions } from "./types.js";

/**
 * Execution service interface
 */
export interface ExecutionService {
	/**
	 * Execute a script with TUI spinner if available
	 */
	readonly executeScriptWithTUI: (
		scriptPath: string,
		taskName: string,
		options?: ExecutionOptions
	) => Effect.Effect<void, ExecutionError>;

	/**
	 * Execute a script and capture its output
	 */
	readonly executeScriptCapture: (
		scriptPath: string,
		options?: ExecutionOptions
	) => Effect.Effect<string, ScriptExecutionError>;

	/**
	 * Execute a script with streaming stdio
	 */
	readonly executeScriptStream: (
		scriptPath: string,
		options?: ExecutionOptions
	) => Effect.Effect<void, ExecutionError>;

	/**
	 * Wrap any Effect with a console spinner
	 */
	readonly withSpinner: <A, E, R>(
		message: string,
		effect: Effect.Effect<A, E, R>,
		options?: ExecutionOptions
	) => Effect.Effect<A, E, R>;
}
