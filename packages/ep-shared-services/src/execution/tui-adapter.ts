/**
 * TUI Adapter interface for Execution Service
 * 
 * This abstraction allows different CLI tools to provide their own TUI implementations
 * while the Execution Service remains consistent across all tools.
 */

import { Effect } from "effect";

// Type for the actual imported module - using any for optional dependency
type ImportedTuiModule = any;

/**
 * TUI spinner methods that adapters must provide
 */
export interface ExecutionTUISpinnerMethods {
	readonly spinnerEffect?: <A, E>(
		message: string,
		effect: Effect.Effect<A, E>,
		options?: { type?: string; color?: string }
	) => Effect.Effect<A, E>;
	readonly InkService?: any;
}

/**
 * TUI Adapter interface for Execution Service
 * Different CLI tools implement this to provide their TUI functionality
 */
export interface ExecutionTUIAdapter {
	/**
	 * Load the TUI module and return spinner methods
	 */
	readonly load: () => Effect.Effect<ExecutionTUISpinnerMethods | null>;
}

/**
 * Default fallback adapter that always returns null (no TUI support)
 */
export const NoExecutionTUIAdapter: ExecutionTUIAdapter = {
	load: () => Effect.succeed(null),
};
