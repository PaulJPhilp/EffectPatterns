import { Effect } from "effect";
import type { GuidanceResult } from "./types";
import {
	GUIDANCE_MAP,
	loadGuidanceContent,
	getGuidanceKeyForRule,
	initializeGuidanceCache,
} from "./helpers";

/**
 * GuidanceLoaderService - Load pattern guidance files
 *
 * Loads .md guidance files from the guidance folder at initialization time.
 * This eliminates synchronous I/O from the request hot path.
 * 
 * PERFORMANCE: The guidance cache is initialized once at service startup.
 * After that, all lookups are fast O(1) in-memory operations.
 */
export class GuidanceLoaderService extends Effect.Service<
	GuidanceLoaderService
>()("GuidanceLoaderService", {
	effect: Effect.gen(function* () {
		// PERFORMANCE: Initialize guidance cache at service startup (not per-request)
		yield* Effect.sync(() => {
			initializeGuidanceCache();
		});

		/**
		 * Load guidance markdown for a given ruleId
		 * Returns the guidance content, or undefined if not found
		 * 
		 * PERFORMANCE: This is a fast in-memory lookup, not a disk read.
		 */
		const loadGuidance = (
			ruleId: string
		): Effect.Effect<string | undefined, never> =>
			Effect.sync(() => {
				const guidanceKey = getGuidanceKeyForRule(ruleId);
				if (!guidanceKey) {
					return undefined;
				}
				return loadGuidanceContent(guidanceKey);
			});

		/**
		 * Get the guidance key (filename) for a given ruleId
		 */
		const getGuidanceKey = (ruleId: string): Effect.Effect<string | undefined, never> =>
			Effect.sync(() => getGuidanceKeyForRule(ruleId));

		/**
		 * Load guidance with full result info
		 * 
		 * PERFORMANCE: This is a fast in-memory lookup, not a disk read.
		 */
		const loadGuidanceWithKey = (
			ruleId: string
		): Effect.Effect<GuidanceResult, never> =>
			Effect.sync(() => {
				const key = getGuidanceKeyForRule(ruleId);
				const content = key ? loadGuidanceContent(key) : undefined;
				return {
					ruleId,
					key,
					content,
				};
			});

		/**
		 * Get all guidance mappings
		 */
		const getGuidanceMappings = (): Effect.Effect<typeof GUIDANCE_MAP, never> =>
			Effect.succeed(GUIDANCE_MAP);

		return {
			loadGuidance,
			getGuidanceKey,
			loadGuidanceWithKey,
			getGuidanceMappings,
		};
	}),
}) { }
