/**
 * TUI Service Implementation
 *
 * Provides TUI module loading and management functionality
 */

import { Effect } from "effect";
import type { TUIService as TUIServiceInterface } from "./api.js";
import { TUILoadError } from "./errors.js";

// Internal cache for the loader
let tuiModuleCache: ImportedTuiModule | false | null = null;

// Type for the actual imported module
type ImportedTuiModule = typeof import("effect-cli-tui");

/**
 * TUI service using Effect.Service pattern
 */
export const TUIService = Effect.Service<TUIServiceInterface>()("TUIService", {
	accessors: true,
	effect: Effect.gen(function* () {
		return {
			/**
			 * Load the TUI module dynamically
			 */
			load: () =>
				Effect.tryPromise({
					try: async () => {
						// Return cached result if already attempted
						if (tuiModuleCache !== null) {
							return tuiModuleCache;
						}

						// Mark as attempted
						tuiModuleCache = false;

						// Dynamic import of TUI module
						const module = await import("effect-cli-tui");
						tuiModuleCache = module;
						return module;
					},
					catch: (error) => {
						tuiModuleCache = null;
						throw TUILoadError.make(
							"Failed to load TUI module",
							error
						);
					},
				}),

			/**
			 * Check if TUI is available
			 */
			isAvailable: () =>
				Effect.suspend(() => {
					return Effect.succeed(tuiModuleCache !== null && tuiModuleCache !== false);
				}),

			/**
			 * Clear the TUI cache
			 */
			clearCache: () =>
				Effect.suspend(() => {
					tuiModuleCache = null;
					return Effect.void;
				}),
		};
	}),
});
