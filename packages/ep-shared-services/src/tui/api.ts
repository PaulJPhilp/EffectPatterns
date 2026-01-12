/**
 * TUI Service API
 *
 * Interface for TUI module loading and management functionality
 */

import { Effect } from "effect";
import { TUILoadError, TUIUnavailableError } from "./errors.js";

// Type for the actual imported module - using any for optional dependency
type ImportedTuiModule = any;

/**
 * TUI Service errors
 */
export type TUIServiceError = TUILoadError | TUIUnavailableError;

/**
 * TUI service interface
 */
export interface TUIService {
	/**
	 * Load the TUI module dynamically
	 */
	readonly load: () => Effect.Effect<ImportedTuiModule | null, TUIServiceError>;

	/**
	 * Check if TUI is available
	 */
	readonly isAvailable: () => Effect.Effect<boolean, never>;

	/**
	 * Clear the TUI cache
	 */
	readonly clearCache: () => Effect.Effect<void, never>;
}
