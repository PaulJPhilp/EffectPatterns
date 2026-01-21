import { GuidanceLoaderService } from "./api";

export * from "./api";
export * from "./types";
export * from "./helpers";
export * from "./errors";

export const GuidanceLoaderServiceLive = GuidanceLoaderService.Default;

/**
 * Legacy exports for backward compatibility during transition
 */
export const loadGuidance = (ruleId: string): string | undefined => {
	// Synchronous wrapper for backward compatibility
	const { loadGuidanceContent, getGuidanceKeyForRule } = require("./helpers");
	const guidanceKey = getGuidanceKeyForRule(ruleId);
	if (!guidanceKey) {
		return undefined;
	}
	return loadGuidanceContent(guidanceKey);
};

export const getGuidanceKey = (ruleId: string): string | undefined => {
	const { getGuidanceKeyForRule } = require("./helpers");
	return getGuidanceKeyForRule(ruleId);
};
