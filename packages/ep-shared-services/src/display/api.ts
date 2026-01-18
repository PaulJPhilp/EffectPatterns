/**
 * Display service API
 */

import { Effect } from "effect";
import { DisplayError, TUIError } from "./errors.js";
import type { PanelOptions, TableOptions } from "./types.js";

/**
 * Display service errors
 */
export type DisplayServiceError = DisplayError | TUIError;

/**
 * Display service interface
 */
export interface DisplayService {
	// Basic message display
	readonly showSuccess: (message: string) => Effect.Effect<void, DisplayServiceError>;
	readonly showError: (message: string) => Effect.Effect<void, DisplayServiceError>;
	readonly showInfo: (message: string) => Effect.Effect<void, DisplayServiceError>;
	readonly showWarning: (message: string) => Effect.Effect<void, DisplayServiceError>;

	// Raw text output (no decoration)
	readonly showText: (text: string) => Effect.Effect<void, DisplayServiceError>;

	// Advanced display
	readonly showPanel: (
		content: string,
		title: string,
		options?: PanelOptions
	) => Effect.Effect<void, DisplayServiceError>;
	readonly showTable: <T extends Record<string, unknown>>(
		data: T[],
		options: TableOptions<T>
	) => Effect.Effect<void, DisplayServiceError>;
	readonly showHighlight: (message: string) => Effect.Effect<void, DisplayServiceError>;
	readonly showSeparator: () => Effect.Effect<void, DisplayServiceError>;
}
