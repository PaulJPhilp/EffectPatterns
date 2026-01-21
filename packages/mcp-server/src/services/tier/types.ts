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
