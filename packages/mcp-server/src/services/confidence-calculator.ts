/**
 * ConfidenceCalculator - Calculate confidence levels for findings
 *
 * Confidence scoring based on:
 * - Detection method (AST-based = high)
 * - Code complexity context (nesting reduces confidence)
 * - Pattern specificity (specific patterns = higher confidence)
 * - Rule category (errors/async = higher, style = lower)
 */

import * as ts from "typescript";
import type { ConfidenceLevel, ConfidenceScore, Finding, RuleDefinition } from "../tools/schemas";

/**
 * Calculate confidence score for a finding based on multiple factors
 * @param finding The code finding
 * @param sourceFile TypeScript source file for AST analysis
 * @param rule The rule definition that triggered
 * @returns ConfidenceScore with level (high/medium/low) and explanation
 */
export function calculateConfidence(
	finding: Finding,
	sourceFile: ts.SourceFile,
	rule: RuleDefinition
): ConfidenceScore {
	let baseScore = 0.9; // AST-based detection starts at 0.9
	const factors: string[] = ["AST-based detection"];

	// Factor 1: Complexity penalty (nesting level reduces confidence)
	const complexityPenalty = calculateComplexityPenalty(
		finding,
		sourceFile
	);
	baseScore -= complexityPenalty;
	if (complexityPenalty > 0) {
		const nestingLevel = Math.round(complexityPenalty * 10);
		factors.push(`Nested context (${nestingLevel} level penalty)`);
	}

	// Factor 2: Pattern specificity bonus
	const specifityBonus = calculatePatternSpecificity(finding, rule);
	baseScore += specifityBonus;
	if (specifityBonus > 0) {
		if (specifityBonus >= 0.2) {
			factors.push("Specific method/type signature match");
		} else if (specifityBonus >= 0.1) {
			factors.push("Type annotation detected");
		}
	}

	// Factor 3: Category modifier
	const categoryModifier = getCategoryModifier(rule.category);
	baseScore += categoryModifier;
	if (categoryModifier > 0) {
		factors.push(`Category boost: ${rule.category}`);
	} else if (categoryModifier < 0) {
		factors.push(`Category penalty: ${rule.category}`);
	}

	// Clamp score to 0-1 range
	const finalScore = Math.max(0, Math.min(1, baseScore));

	// Map score to confidence level
	const level = scoreToLevel(finalScore);

	return {
		level,
		score: parseFloat(finalScore.toFixed(2)),
		factors,
	};
}

/**
 * Calculate complexity penalty based on nesting level
 * @returns Penalty value 0 to 0.3
 */
function calculateComplexityPenalty(
	finding: Finding,
	sourceFile: ts.SourceFile
): number {
	let nestingLevel = 0;
	let nodeCount = 0;

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
			nodeCount++;
		}

		// Don't recurse too deeply
		if (depth < 10) {
			ts.forEachChild(node, (child) => visit(child, depth + 1));
		}
	};

	visit(sourceFile, 0);

	// Apply penalty: up to 0.1 per level, max 0.3
	return Math.min(nestingLevel * 0.1, 0.3);
}

/**
 * Calculate specificity bonus based on pattern characteristics
 * @returns Bonus value 0 to 0.2
 */
function calculatePatternSpecificity(
	_finding: Finding,
	rule: RuleDefinition
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

	return Math.min(bonus, 0.2); // Max bonus is 0.2
}

/**
 * Get category modifier based on rule category
 * @returns Modifier value -0.1 to +0.1
 */
function getCategoryModifier(category: string): number {
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
function scoreToLevel(score: number): ConfidenceLevel {
	if (score >= 0.8) {
		return "high";
	} else if (score >= 0.6) {
		return "medium";
	}
	return "low";
}
