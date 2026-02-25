import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GuidanceMapping } from "./types";

/**
 * Mapping from ruleId to guidance filename (without .md extension).
 * Filenames use semantic namespace (e.g., "errors/avoid-throw", "async/avoid-async-await").
 * Add entries here as guidance files are created.
 */
export const GUIDANCE_MAP: GuidanceMapping = {
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
 * In-memory cache for guidance content.
 * Loaded once at startup to eliminate synchronous I/O during requests.
 * 
 * PERFORMANCE: This cache is populated at service initialization time,
 * not lazily at request time. This eliminates blocking readFileSync() calls
 * from the hot path (per-finding guidance loading).
 */
let guidanceCache: Map<string, string> | null = null;

/**
 * Initialize the guidance content cache from disk.
 * Called once at service startup to preload all guidance files.
 * 
 * PERFORMANCE: This is a synchronous operation at startup, not in request hot path.
 */
export function initializeGuidanceCache(): void {
	if (guidanceCache !== null) {
		// Already initialized
		return;
	}

	guidanceCache = new Map<string, string>();

	// Load all guidance files from disk at startup
	for (const [, guidanceKey] of Object.entries(GUIDANCE_MAP)) {
		try {
			const guidancePath = join(
				__dirname,
				"guidance",
				`${guidanceKey}.md`
			);
			const content = readFileSync(guidancePath, "utf-8");
			guidanceCache.set(guidanceKey, content);
		} catch {
			// Silently skip missing files - guidance is optional
			// (not all rules have guidance documentation)
		}
	}
}

/**
 * Load guidance markdown content from in-memory cache.
 * 
 * PERFORMANCE: This is a fast O(1) Map lookup, not synchronous I/O.
 * The cache is populated at startup via initializeGuidanceCache().
 */
export function loadGuidanceContent(guidanceKey: string): string | undefined {
	// Ensure cache is initialized (defensive; normally done at startup)
	if (guidanceCache === null) {
		initializeGuidanceCache();
	}

	return guidanceCache!.get(guidanceKey);
}

/**
 * Get the guidance key (filename) for a given ruleId
 */
export function getGuidanceKeyForRule(ruleId: string): string | undefined {
	return GUIDANCE_MAP[ruleId];
}
