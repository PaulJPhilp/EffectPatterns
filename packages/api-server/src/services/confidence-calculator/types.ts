import type { ConfidenceLevel, Finding, RuleDefinition } from "../../tools/schemas";

/**
 * Confidence score result from calculation
 */
export interface ConfidenceScore {
	readonly level: ConfidenceLevel;
	readonly score: number;
	readonly factors: readonly string[];
}

/**
 * Configuration for confidence scoring
 */
export interface ConfidenceConfig {
	readonly baseScore: number;
	readonly complexityPenaltyFactor: number;
	readonly maxComplexityPenalty: number;
	readonly maxSpecificityBonus: number;
	readonly minScore: number;
	readonly maxScore: number;
	readonly highThreshold: number;
	readonly mediumThreshold: number;
}

/**
 * Input for calculating confidence
 */
export interface CalculateConfidenceInput {
	readonly finding: Finding;
	readonly sourceCode: string;
	readonly rule: RuleDefinition;
}

/**
 * Scoring factors breakdown
 */
export interface ScoringFactors {
	readonly baseScore: number;
	readonly complexityPenalty: number;
	readonly specificityBonus: number;
	readonly categoryModifier: number;
	readonly finalScore: number;
}
