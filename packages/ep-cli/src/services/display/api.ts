/**
 * Display service API
 */

import { Effect } from "effect";
import type { PanelOptions, TableOptions } from "./types.js";

/**
 * Display service interface
 */
export interface DisplayService {
	// Basic message display
	readonly showSuccess: (message: string) => Effect.Effect<void, unknown>;
	readonly showError: (message: string) => Effect.Effect<void, unknown>;
	readonly showInfo: (message: string) => Effect.Effect<void, unknown>;
	readonly showWarning: (message: string) => Effect.Effect<void, unknown>;

	// Advanced display
	readonly showPanel: (
		content: string,
		title: string,
		options?: PanelOptions
	) => Effect.Effect<void, unknown>;
	readonly showTable: <T extends Record<string, unknown>>(
		data: T[],
		options: TableOptions<T>
	) => Effect.Effect<void, unknown, any>;
	readonly showHighlight: (message: string) => Effect.Effect<void, unknown>;
	readonly showSeparator: () => Effect.Effect<void, unknown>;
}
