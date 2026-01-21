/**
 * Guidance mapping configuration
 */
export interface GuidanceMapping {
	readonly [ruleId: string]: string;
}

/**
 * Result of loading guidance
 */
export interface GuidanceResult {
	readonly ruleId: string;
	readonly key: string | undefined;
	readonly content: string | undefined;
}
