import { Effect } from "effect";
import {
	FREE_TIER_FEATURES,
	PAID_TIER_FEATURES,
	isEndpointAllowed,
	loadTierConfig,
} from "./helpers";

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
							? "This capability is not available via MCP. Use the HTTP API or CLI."
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
