import * as ts from "typescript";
import type { Finding, RuleDefinition } from "../../tools/schemas";
import type { ScoringFactors, ConfidenceConfig } from "./types";

/**
 * Default confidence configuration
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
	baseScore: 0.9,
	complexityPenaltyFactor: 0.1,
	maxComplexityPenalty: 0.3,
	maxSpecificityBonus: 0.2,
	minScore: 0,
	maxScore: 1,
	highThreshold: 0.8,
	mediumThreshold: 0.6,
};

/**
 * Calculate complexity penalty based on nesting level
 * @returns Penalty value 0 to config.maxComplexityPenalty
 */
export function calculateComplexityPenalty(
	finding: Finding,
	sourceFile: ts.SourceFile,
	config: ConfidenceConfig
): { penalty: number; nestingLevel: number } {
	let nestingLevel = 0;

	// Visit all nodes and count nesting depth at the finding location
	const visit = (node: ts.Node, depth: number) => {
		const start = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
		const end = ts.getLineAndCharacterOfPosition(sourceFile, node.end);

		// Check if this node contains the finding
		if (
			start.line + 1 >= finding.range.startLine &&
			end.line + 1 <= finding.range.endLine
		) {
			nestingLevel = Math.max(nestingLevel, depth);
		}

		// Don't recurse too deeply
		if (depth < 10) {
			ts.forEachChild(node, (child) => visit(child, depth + 1));
		}
	};

	visit(sourceFile, 0);

	// Apply penalty: up to config.complexityPenaltyFactor per level, max config.maxComplexityPenalty
	const penalty = Math.min(
		nestingLevel * config.complexityPenaltyFactor,
		config.maxComplexityPenalty
	);

	return { penalty, nestingLevel };
}

/**
 * Calculate specificity bonus based on pattern characteristics
 * @returns Bonus value 0 to config.maxSpecificityBonus
 */
export function calculatePatternSpecificity(
	rule: RuleDefinition,
	config: ConfidenceConfig
): number {
	let bonus = 0;

	// Check for specific patterns in rule message
	const message = rule.message.toLowerCase();

	// Specific method signatures or type patterns
	if (
		message.includes("effect<") ||
		message.includes("schema") ||
		message.includes("tagged")
	) {
		bonus += 0.1; // Type pattern = +0.1
	}

	// Very specific patterns
	if (
		message.includes("promise.all") ||
		message.includes("throw") ||
		message.includes("console.")
	) {
		bonus += 0.1; // Very specific pattern = +0.1
	}

	return Math.min(bonus, config.maxSpecificityBonus); // Max bonus is configurable
}

/**
 * Get category modifier based on rule category
 * @returns Modifier value -0.1 to +0.1
 */
export function getCategoryModifier(category: string): number {
	switch (category) {
		case "errors":
		case "async":
		case "concurrency":
			return 0.1; // High impact categories get +0.1
		case "style":
			return -0.1; // Style issues are more subjective, -0.1
		case "validation":
		case "dependency-injection":
		case "resources":
			return 0.05; // Medium impact
		default:
			return 0;
	}
}

/**
 * Map numeric score to confidence level
 */
export function scoreToLevel(
	score: number,
	config: ConfidenceConfig
): "high" | "medium" | "low" {
	if (score >= config.highThreshold) {
		return "high";
	} else if (score >= config.mediumThreshold) {
		return "medium";
	}
	return "low";
}

/**
 * Clamp score to valid range
 */
export function clampScore(
	score: number,
	config: ConfidenceConfig
): number {
	return Math.max(config.minScore, Math.min(config.maxScore, score));
}

/**
 * Build scoring factors breakdown for a calculation
 */
export function buildScoringFactors(
	baseScore: number,
	complexityPenalty: number,
	specificityBonus: number,
	categoryModifier: number,
	finalScore: number
): ScoringFactors {
	return {
		baseScore,
		complexityPenalty,
		specificityBonus,
		categoryModifier,
		finalScore,
	};
}
