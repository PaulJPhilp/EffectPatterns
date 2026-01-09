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
	// Script execution
	readonly executeScriptWithTUI: (
		scriptPath: string,
		taskName: string,
		options?: ExecutionOptions
	) => Effect.Effect<void, ExecutionError>;
	readonly executeScriptCapture: (
		scriptPath: string,
		options?: ExecutionOptions
	) => Effect.Effect<string, ScriptExecutionError>;
	readonly executeScriptStream: (
		scriptPath: string,
		options?: ExecutionOptions
	) => Effect.Effect<void, ExecutionError>;
	readonly withSpinner: <A, E, R>(
		message: string,
		effect: Effect.Effect<A, E, R>,
		options?: ExecutionOptions
	) => Effect.Effect<A, E, R>;
}
