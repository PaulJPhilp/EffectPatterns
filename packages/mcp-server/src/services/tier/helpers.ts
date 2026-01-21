import { Effect } from "effect";
import { ConfigurationError } from "./errors";
import { TierFeatures, TierMode } from "./types";

/**
 * Free tier features
 */
export const FREE_TIER_FEATURES: TierFeatures = {
	tier: "free",
	allowedEndpoints: [
		"/api/health",
		"/api/patterns",
		"/api/patterns/[id]",
		"/api/analyze-code",
		"/api/list-rules",
		"/api/review-code",
	],
	featureCategories: [
		{
			name: "Pattern Search",
			description: "Search Effect-TS patterns by category, skill level, and keywords",
			endpoints: ["/api/patterns"],
		},
		{
			name: "Pattern Retrieval",
			description: "Get full pattern details including code examples",
			endpoints: ["/api/patterns/[id]"],
		},
		{
			name: "Read-Only Analysis",
			description: "Anti-pattern detection and code quality analysis (read-only)",
			endpoints: ["/api/analyze-code", "/api/list-rules"],
		},
		{
			name: "Code Review",
			description: "High-fidelity architectural recommendations (top 3 issues, unlimited queries)",
			endpoints: ["/api/review-code"],
		},
		{
			name: "Infrastructure",
			description: "Health checks and service status",
			endpoints: ["/api/health"],
		},
	],
};

/**
 * Paid tier features (includes all features except admin operations)
 *
 * Note: Admin endpoints (/api/db-check, /api/migrate, /api/reset-db, etc.)
 * are NOT tier-gated. They require separate admin authentication via ADMIN_API_KEY.
 */
export const PAID_TIER_FEATURES: TierFeatures = {
	tier: "paid",
	allowedEndpoints: [
		// Free tier features
		"/api/health",
		"/api/patterns",
		"/api/patterns/[id]",
		"/api/analyze-code",
		"/api/list-rules",
		// Paid tier exclusive features
		"/api/generate",
		"/api/generate-pattern",
		"/api/analyze-consistency",
		"/api/apply-refactoring",
		"/api/list-fixes",
		"/api/trace-wiring",
	],
	featureCategories: [
		// Free tier categories
		...FREE_TIER_FEATURES.featureCategories,
		// Paid tier exclusive categories
		{
			name: "Code Generation",
			description: "Generate customized Effect-TS code from templates",
			endpoints: ["/api/generate", "/api/generate-pattern"],
		},
		{
			name: "Consistency Analysis",
			description: "Multi-file code consistency detection",
			endpoints: ["/api/analyze-consistency"],
		},
		{
			name: "Refactoring Engine",
			description: "Automated code refactoring and fixes",
			endpoints: ["/api/apply-refactoring", "/api/list-fixes"],
		},
		{
			name: "Tracing Examples",
			description: "Setup examples for different tracing frameworks",
			endpoints: ["/api/trace-wiring"],
		},
	],
};

/**
 * Admin-only endpoints (require ADMIN_API_KEY, not tier-gated)
 */
export const ADMIN_ENDPOINTS = [
	"/api/db-check",
	"/api/env-check",
	"/api/migrate",
	"/api/migrate-final",
	"/api/reset-db",
	"/api/simple-reset",
	"/api/final-reset",
	"/api/test",
];

/**
 * Load tier configuration from environment
 */
export function loadTierConfig(): Effect.Effect<TierMode, ConfigurationError> {
	return Effect.gen(function* () {
		const tierMode = process.env.TIER_MODE?.toLowerCase() as TierMode;

		// Validate tier mode
		const validTiers = ["free", "paid"];
		if (!tierMode || !validTiers.includes(tierMode)) {
			yield* Effect.fail(
				new ConfigurationError({
					key: "TIER_MODE",
					expected: "one of: free, paid",
					received: tierMode || "undefined",
				})
			);
		}

		return tierMode;
	});
}

/**
 * Check if endpoint is allowed for current tier
 */
export function isEndpointAllowed(
	endpoint: string,
	tierFeatures: TierFeatures
): boolean {
	// Handle dynamic routes (e.g., /api/patterns/[id])
	const normalizedEndpoint = endpoint
		.replace(/\[.*?\]/g, "[id]") // Replace any [param] with [id]
		.split("?")[0]; // Remove query parameters

	return tierFeatures.allowedEndpoints.some((allowed) => {
		const normalizedAllowed = allowed
			.replace(/\[.*?\]/g, "[id]")
			.split("?")[0];

		// Exact match
		if (normalizedAllowed === normalizedEndpoint) {
			return true;
		}

		// Pattern match for dynamic routes
		if (normalizedAllowed.includes("[id]")) {
			const pattern = normalizedAllowed.replace("[id]", "[^/]+");
			const regex = new RegExp(`^${pattern}$`);
			return regex.test(normalizedEndpoint);
		}

		return false;
	});
}

/**
 * Legacy tier access (for backward compatibility)
 */
export function getTierFeatures(): Promise<TierFeatures> {
	return Effect.runPromise(
		loadTierConfig().pipe(
			Effect.map((tier) => (tier === "free" ? FREE_TIER_FEATURES : PAID_TIER_FEATURES))
		)
	);
}
