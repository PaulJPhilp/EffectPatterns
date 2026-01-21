import { Effect } from "effect";
import type { GuidanceResult } from "./types";
import {
	GUIDANCE_MAP,
	loadGuidanceContent,
	getGuidanceKeyForRule,
} from "./helpers";

/**
 * GuidanceLoaderService - Load pattern guidance files
 *
 * Loads .md guidance files from the guidance folder.
 * If a guidance file doesn't exist for a rule, returns undefined gracefully.
 */
export class GuidanceLoaderService extends Effect.Service<
	GuidanceLoaderService
>()("GuidanceLoaderService", {
	effect: Effect.gen(function* () {
		/**
		 * Load guidance markdown for a given ruleId
		 * Returns the guidance content, or undefined if not found
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
