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
	"missing-error-channel": "missing-error-channel",
	"schema-validation": "schema-validation",
	"catching-errors-too-early": "catching-errors-too-early",
	"swallowing-errors-in-catchall": "swallowing-errors-in-catchall",
	"or-die-outside-boundaries": "or-die-outside-boundaries",

	// Concurrency patterns
	"promise-all-in-effect": "promise-all-in-effect",
	"unbounded-parallelism": "unbounded-parallelism",
	"no-floating-promises": "no-floating-promises",
	"fire-and-forget-fork": "fire-and-forget-fork",
	"forking-inside-loops": "forking-inside-loops",
	"mutable-ref-in-effect": "mutable-ref-in-effect",

	// Resource management patterns
	"leaking-scopes": "leaking-scopes",
	"connection-pool-awareness": "connection-pool-awareness",
	"layer-dependency-cycle": "layer-dependency-cycle",
	"blocking-calls-in-effect": "blocking-calls-in-effect",

	// Resilience patterns
	"retry-backoff-timeouts": "retry-backoff-timeouts",

	// Testing & observability patterns
	"hidden-effect-execution": "hidden-effect-execution",
	"logging-discipline": "logging-discipline",
	"avoid-console-log": "avoid-console-log",
	"global-singletons-instead-of-layers": "global-singletons-instead-of-layers",

	// Core Effect idioms
	"avoid-effect-run-sync": "avoid-effect-run-sync",
	"prefer-effect-gen": "prefer-effect-gen",
	"prefer-match-over-if": "prefer-match-over-if",
	"no-nested-gen": "no-nested-gen",
	"service-definition-style": "service-definition-style",

	// Application configuration patterns
	"config-handling": "config-handling",

	// Domain modeling patterns
	"primitives-for-domain-concepts": "primitives-for-domain-concepts",
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
