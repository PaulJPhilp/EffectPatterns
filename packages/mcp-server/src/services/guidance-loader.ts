/**
 * GuidanceLoader - Load pattern guidance files
 *
 * Loads .md guidance files from the guidance folder.
 * If a guidance file doesn't exist for a rule, returns undefined gracefully.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Mapping from ruleId to guidance filename (without .md extension).
 * Filenames use semantic namespace (e.g., "errors/avoid-throw", "async/avoid-async-await").
 * Add entries here as guidance files are created.
 */
const GUIDANCE_MAP: Record<string, string> = {
	// Async patterns
	"async-await": "async-await-in-effect",

	// Error handling patterns
	"throw-in-effect-code": "throw-in-effect-code",
	"try-catch-in-effect": "try-catch-in-effect",
	"generic-error-type": "generic-error-type",

	// Concurrency patterns
	"promise-all-in-effect": "promise-all-in-effect",
};

/**
 * Load guidance markdown for a given ruleId.
 * Returns the guidance content, or undefined if not found.
 */
export function loadGuidance(ruleId: string): string | undefined {
	const guidanceKey = GUIDANCE_MAP[ruleId];
	if (!guidanceKey) {
		return undefined;
	}

	try {
		const guidancePath = join(
			__dirname,
			"guidance",
			`${guidanceKey}.md`
		);
		return readFileSync(guidancePath, "utf-8");
	} catch {
		// Silently return undefined if file doesn't exist
		return undefined;
	}
}

/**
 * Get the guidance key (filename) for a given ruleId.
 */
export function getGuidanceKey(ruleId: string): string | undefined {
	return GUIDANCE_MAP[ruleId];
}
