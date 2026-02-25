import * as ts from "typescript";
import { Effect } from "effect";
import type { Finding, RuleDefinition } from "../../tools/schemas";
import type { ConfidenceScore, CalculateConfidenceInput } from "./types";
import {
	DEFAULT_CONFIDENCE_CONFIG,
	calculateComplexityPenalty,
	calculatePatternSpecificity,
	getCategoryModifier,
	scoreToLevel,
	clampScore,
} from "./helpers";

/**
 * ConfidenceCalculatorService - Calculate confidence levels for findings
 *
 * Confidence scoring based on:
 * - Detection method (AST-based = high)
 * - Code complexity context (nesting reduces confidence)
 * - Pattern specificity (specific patterns = higher confidence)
 * - Rule category (errors/async = higher, style = lower)
 */
export class ConfidenceCalculatorService extends Effect.Service<
	ConfidenceCalculatorService
>()("ConfidenceCalculatorService", {
	effect: Effect.gen(function* () {
		/**
		 * Calculate confidence score for a finding
		 * 
		 * Performance optimization: Pass an optional pre-parsed sourceFile to avoid
		 * re-parsing the same source code multiple times per request.
		 */
		const calculate = (
			finding: Finding,
			sourceCode: string,
			rule: RuleDefinition,
			sourceFile?: ts.SourceFile
		): Effect.Effect<ConfidenceScore, Error> =>
			Effect.gen(function* () {
				// Reuse provided sourceFile to avoid expensive re-parsing
				const sf = sourceFile || ts.createSourceFile(
					"temp.ts",
					sourceCode,
					ts.ScriptTarget.Latest,
					true
				);

				const config = DEFAULT_CONFIDENCE_CONFIG;
				let baseScore = config.baseScore;
				const factors: string[] = ["AST-based detection"];

				// Factor 1: Complexity penalty (nesting level reduces confidence)
				const { penalty: complexityPenalty, nestingLevel } =
					calculateComplexityPenalty(finding, sf, config);
				baseScore -= complexityPenalty;
				if (complexityPenalty > 0) {
					factors.push(`Nested context (${nestingLevel} level penalty)`);
				}

				// Factor 2: Pattern specificity bonus
				const specificityBonus = calculatePatternSpecificity(rule, config);
				baseScore += specificityBonus;
				if (specificityBonus > 0) {
					if (specificityBonus >= 0.2) {
						factors.push("Specific method/type signature match");
					} else if (specificityBonus >= 0.1) {
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

				// Clamp score to valid range
				const finalScore = clampScore(baseScore, config);

				// Map score to confidence level
				const level = scoreToLevel(finalScore, config);

				return {
					level,
					score: parseFloat(finalScore.toFixed(2)),
					factors,
				};
			});

		/**
		 * Calculate confidence score from input object
		 */
		const calculateFromInput = (
			input: CalculateConfidenceInput
		): Effect.Effect<ConfidenceScore, Error> =>
			calculate(input.finding, input.sourceCode, input.rule);

		return {
			calculate,
			calculateFromInput,
		};
	}),
}) { }
