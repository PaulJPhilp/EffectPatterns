/**
 * MCP Server Tier Configuration Service
 *
 * Manages Free vs Paid tier feature access and endpoint gating.
 * Provides type-safe tier checking and feature availability.
 */

import { Effect } from "effect";
import { ConfigurationError } from "../errors";

/**
 * Tier type definitions
 */
export type TierMode = "free" | "paid";

/**
 * Feature categories for tier-based access control
 */
export interface FeatureCategory {
	readonly name: string;
	readonly description: string;
	readonly endpoints: readonly string[];
}

/**
 * Tier feature definitions
 */
export interface TierFeatures {
	readonly tier: TierMode;
	readonly allowedEndpoints: readonly string[];
	readonly featureCategories: readonly FeatureCategory[];
}

/**
 * Free tier features
 */
const FREE_TIER_FEATURES: TierFeatures = {
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
 * Paid tier features (includes all features)
 */
const PAID_TIER_FEATURES: TierFeatures = {
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
		// Admin features
		"/api/db-check",
		"/api/env-check",
		"/api/migrate",
		"/api/migrate-final",
		"/api/reset-db",
		"/api/simple-reset",
		"/api/final-reset",
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
		{
			name: "Administration",
			description: "Database operations and environment checks",
			endpoints: [
				"/api/db-check",
				"/api/env-check",
				"/api/migrate",
				"/api/migrate-final",
				"/api/reset-db",
				"/api/simple-reset",
				"/api/final-reset",
			],
		},
	],
};

/**
 * Load tier configuration from environment
 */
function loadTierConfig(): Effect.Effect<TierMode, ConfigurationError> {
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
function isEndpointAllowed(
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
 * MCP Server Tier Configuration Service
 */
export class MCPTierService extends Effect.Service<MCPTierService>()(
	"MCPTierService",
	{
		effect: Effect.gen(function* () {
			const tierMode = yield* loadTierConfig();
			const tierFeatures =
				tierMode === "free" ? FREE_TIER_FEATURES : PAID_TIER_FEATURES;

			return {
				/**
				 * Get current tier mode
				 */
				getTierMode: () => Effect.succeed(tierMode),

				/**
				 * Get tier features
				 */
				getTierFeatures: () => Effect.succeed(tierFeatures),

				/**
				 * Check if endpoint is allowed for current tier
				 */
				isEndpointAllowed: (endpoint: string) =>
					Effect.succeed(isEndpointAllowed(endpoint, tierFeatures)),

				/**
				 * Get available feature categories for current tier
				 */
				getFeatureCategories: () => Effect.succeed(tierFeatures.featureCategories),

				/**
				 * Check if a specific feature category is available
				 */
				isFeatureAvailable: (featureName: string) =>
					Effect.succeed(
						tierFeatures.featureCategories.some(
							(category) => category.name === featureName
						)
					),

				/**
				 * Get upgrade message for gated features
				 */
				getUpgradeMessage: () =>
					Effect.succeed(
						tierMode === "free"
							? "This feature is available in the Paid Tier. Upgrade to unlock code generation, refactoring, and advanced analysis features."
							: "All features are available in your Paid Tier."
					),

				/**
				 * Check if current tier is free
				 */
				isFreeTier: () => Effect.succeed(tierMode === "free"),

				/**
				 * Check if current tier is paid
				 */
				isPaidTier: () => Effect.succeed(tierMode === "paid"),
			};
		}),
	}
) { }

/**
 * Default MCP tier service layer
 */
export const MCPTierServiceLive = MCPTierService.Default;

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
