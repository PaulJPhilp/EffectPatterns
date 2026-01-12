/**
 * TUI Adapter interface for Display Service
 * 
 * This abstraction allows different CLI tools to provide their own TUI implementations
 * while the Display Service remains consistent across all tools.
 */

import { Effect } from "effect";

// Type for the actual imported module - using any for optional dependency
type ImportedTuiModule = any;

/**
 * TUI display methods that adapters must provide
 */
export interface TUIDisplayMethods {
	readonly displaySuccess?: (message: string) => Effect.Effect<void>;
	readonly displayError?: (message: string) => Effect.Effect<void>;
	readonly displayInfo?: (message: string) => Effect.Effect<void>;
	readonly displayWarning?: (message: string) => Effect.Effect<void>;
	readonly displayPanel?: (
		content: string,
		title: string,
		options?: { type?: "info" | "success" | "error" | "warning" }
	) => Effect.Effect<void>;
	readonly displayTable?: <T extends Record<string, unknown>>(
		data: T[],
		options: {
			columns: Array<{
				key: string;
				header: string;
				width?: number;
				align?: string;
				formatter?: (value: unknown) => string;
			}>;
			bordered?: boolean;
			head?: { bold?: boolean; color?: string };
		}
	) => Effect.Effect<void>;
	readonly displayHighlight?: (message: string) => Effect.Effect<void>;
}

/**
 * TUI Adapter interface
 * Different CLI tools implement this to provide their TUI functionality
 */
export interface TUIAdapter {
	/**
	 * Load the TUI module and return display methods
	 */
	readonly load: () => Effect.Effect<TUIDisplayMethods | null>;
}

/**
 * Default fallback adapter that always returns null (no TUI support)
 */
export const NoTUIAdapter: TUIAdapter = {
	load: () => Effect.succeed(null),
};
