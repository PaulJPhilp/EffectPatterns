import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import type {
	Finding,
	FixDefinition,
	RuleDefinition,
} from "../../tools/schemas";
import { ConfidenceCalculatorService } from "../confidence-calculator";
import { FixPlanGeneratorService } from "../fix-plan-generator";
import { GuidanceLoaderService } from "../guidance-loader";
import { SnippetExtractorService } from "../snippet-extractor";
import { FileSizeError, NonTypeScriptError } from "./errors";
import {
	countByConfidence,
	countBySeverity,
	generateEnhancedMarkdown,
	MAX_RECOMMENDATIONS,
	sortFindings as sortFindingsHelper,
	validateFileSize,
	validateTypeScript,
} from "./helpers";
import type {
	CodeRecommendation,
	CodeSnippet,
	ConfidenceScore,
	EnhancedCodeRecommendation,
	FixPlan,
	MachineSummary,
	ReviewCodeMeta,
	ReviewCodeResult,
} from "./types";

/**
 * Build enhanced recommendation from finding
 */
function buildEnhancedRecommendation(
	finding: Finding,
	rule: RuleDefinition,
	confidenceScore: ConfidenceScore,
	evidence: CodeSnippet,
	fixPlan: FixPlan,
	guidanceKey: string | undefined,
	guidance: string | undefined,
): EnhancedCodeRecommendation {
	return {
		severity: finding.severity,
		title: finding.title,
		line: finding.range.startLine,
		message: finding.message,
		ruleId: finding.ruleId,
		category: rule.category,
		confidence: confidenceScore,
		evidence,
		fixPlan,
		guidanceKey,
		guidance,
	};
}

/**
 * ReviewCodeService
 *
 * Provides high-fidelity architectural recommendations for Effect codebases.
 */
export class ReviewCodeService extends Effect.Service<ReviewCodeService>()(
	"ReviewCodeService",
	{
		effect: Effect.gen(function* () {
			const analysis = yield* AnalysisService;
			const confidenceCalculator = yield* ConfidenceCalculatorService;
			const fixPlanGenerator = yield* FixPlanGeneratorService;
			const snippetExtractor = yield* SnippetExtractorService;
			const guidanceLoader = yield* GuidanceLoaderService;

			return {
				/**
				 * Review code and return top 3 recommendations with enhanced details
				 * 
				 * IMPORTANT: This service only accepts code that is:
				 * 1. Cut and pasted into the prompt (code parameter)
				 * 2. Provided from an open editor file (code parameter with optional filePath for context)
				 * 
				 * Files are NOT read from disk. The filePath parameter is only used for:
				 * - TypeScript file extension validation
				 * - Context/metadata in analysis results
				 * 
				 * Only diagnostic information is returned (findings, recommendations, fix plans).
				 * No corrected code is included in the response.
				 */
				reviewCode: (
					code: string,
					filePath?: string,
				): Effect.Effect<
					ReviewCodeResult,
					FileSizeError | NonTypeScriptError | Error
				> =>
					Effect.gen(function* () {
						yield* validateFileSize(code);
						yield* validateTypeScript(filePath);

						const filename = filePath ?? "unknown.ts";
						const result = yield* analysis.analyzeFile(filename, code, {
							analysisType: "all",
						});

						const sortedFindings = sortFindingsHelper(
							result.findings.map(
								(f): EnhancedCodeRecommendation => ({
									severity: f.severity,
									title: f.title,
									line: f.range.startLine,
									message: f.message,
									ruleId: f.ruleId,
									category: "validation",
									confidence: { level: "medium", score: 0.5, factors: [] },
									evidence: {
										beforeContext: [],
										targetLines: [],
										afterContext: [],
										startLine: f.range.startLine,
										endLine: f.range.endLine,
									},
									fixPlan: { steps: [], changes: [], risks: [] },
								}),
							),
						);

						const totalFound = sortedFindings.length;
						const hiddenCount = Math.max(
							0,
							totalFound - MAX_RECOMMENDATIONS,
						);

						// Prepare rules and fixes for enhancement (placeholder - normally from registry)
						// In a full implementation, these would come from RuleRegistryService
						const rulesMap = new Map<string, RuleDefinition>();
						const allFixes: FixDefinition[] = [];

						// For now, we'll create a minimal rule definition for each finding
						// In production, these would come from RuleRegistryService
						result.findings.forEach((finding) => {
							if (!rulesMap.has(finding.ruleId)) {
								rulesMap.set(finding.ruleId, {
									id: finding.ruleId,
									title: finding.title,
									message: finding.message,
									severity: finding.severity,
									category: "validation", // Default category
									fixIds: [],
								});
							}
						});

						// PERFORMANCE: Build enhanced recommendations in parallel
						// Use Effect.forEach with concurrency limit to parallelize per-finding operations
						// while avoiding resource exhaustion from unlimited parallelism
						const allEnhancedFindings = yield* Effect.forEach(
							result.findings,
							(finding) =>
								Effect.gen(function* () {
									const rule = rulesMap.get(finding.ruleId)!;

									// PERFORMANCE: Parallelize independent operations using Effect.all()
									// These operations have no dependencies on each other
									const [confidenceScore, fixPlan, evidence, guidanceKey] = yield* Effect.all([
										confidenceCalculator.calculate(
											finding,
											code,
											rule,
											result.sourceFile, // PERFORMANCE: Pre-parsed SourceFile (Fix #1)
										),
										fixPlanGenerator.generate(
											finding,
											rule,
											allFixes,
										),
										snippetExtractor.extract(finding, code),
										guidanceLoader.getGuidanceKey(
											finding.ruleId,
										),
									]);

									// Load guidance only if key exists
									const guidance = guidanceKey
										? yield* guidanceLoader.loadGuidance(finding.ruleId)
										: undefined;

									// Build recommendation from all collected data
									const enhanced = buildEnhancedRecommendation(
										finding,
										rule,
										confidenceScore,
										evidence,
										fixPlan,
										guidanceKey,
										guidance,
									);

									return enhanced;
								}),
							{ concurrency: 5 }, // PERFORMANCE: Limit to 5 concurrent operations to avoid resource exhaustion
						);

						// Return the default bounded recommendation set
						const topEnhancedFindings = allEnhancedFindings.slice(
							0,
							MAX_RECOMMENDATIONS,
						);

						// Build machine summary
						const summary: MachineSummary = {
							findingsByLevel: countBySeverity(allEnhancedFindings),
							topIssueRuleIds: allEnhancedFindings
								.slice(0, 5)
								.map((f) => f.ruleId),
							confidenceDistribution: countByConfidence(allEnhancedFindings),
						};

						// Build backward-compatible recommendations
						const recommendations = topEnhancedFindings.map(
							(f): CodeRecommendation => ({
								severity: f.severity,
								title: f.title,
								line: f.line,
								message: f.message,
							}),
						);

						const upgradeMessage =
							hiddenCount > 0
								? `${hiddenCount} more architectural issue${hiddenCount === 1 ? "" : "s"} found. Use the HTTP API or CLI to see all issues and auto-fix them.`
								: undefined;

						const meta: ReviewCodeMeta = {
							totalFound,
							hiddenCount,
							upgradeMessage,
						};

						// Generate enhanced markdown
						const markdown = generateEnhancedMarkdown(
							topEnhancedFindings,
							summary,
							meta,
						);

						return {
							recommendations,
							enhancedRecommendations: topEnhancedFindings,
							summary,
							meta,
							markdown,
						};
					}),
			};
		}),
		dependencies: [
			AnalysisService.Default,
			ConfidenceCalculatorService.Default,
			FixPlanGeneratorService.Default,
			SnippetExtractorService.Default,
			GuidanceLoaderService.Default,
		],
	},
) { }
