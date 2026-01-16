/**
 * ReviewCodeService - Free Tier Code Review
 *
 * Provides limited, high-fidelity architectural recommendations for Effect
 * codebases. Acts as the "Hook" for the Free Tier by demonstrating the
 * value of the Analysis Core while driving users toward Pro Tier features.
 */

import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import * as ts from "typescript";
import type { Finding, RuleDefinition, RuleId, FixDefinition } from "../tools/schemas";
import { calculateConfidence } from "./confidence-calculator";
import { generateFixPlan } from "./fix-plan-generator";
import { extractSnippet } from "./snippet-extractor";
import { loadGuidance, getGuidanceKey } from "./guidance-loader";

/**
 * Maximum number of recommendations to return in Free Tier
 */
const MAX_FREE_TIER_RECOMMENDATIONS = 3;

/**
 * Maximum file size in bytes (100KB)
 */
const MAX_FILE_SIZE_BYTES = 100 * 1024;

/**
 * Severity ranking for sorting (higher = more important)
 */
const SEVERITY_RANK = {
	high: 3,
	medium: 2,
	low: 1,
} as const;

/**
 * Code recommendation for Free Tier output
 */
export interface CodeRecommendation {
	readonly severity: "high" | "medium" | "low";
	readonly title: string;
	readonly line: number;
	readonly message: string;
}

/**
 * Metadata about the analysis results
 */
export interface ReviewCodeMeta {
	readonly totalFound: number;
	readonly hiddenCount: number;
	readonly upgradeMessage?: string;
}

/**
 * Confidence level for a finding (high/medium/low)
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Confidence score with reasoning
 */
export interface ConfidenceScore {
	readonly level: ConfidenceLevel;
	readonly score: number; // 0.0 - 1.0
	readonly factors: readonly string[]; // Explanation of confidence factors
}

/**
 * Code snippet extracted from source, showing context around issue
 */
export interface CodeSnippet {
	readonly beforeContext: readonly string[]; // Lines before issue
	readonly targetLines: readonly string[]; // The problematic lines
	readonly afterContext: readonly string[]; // Lines after issue
	readonly startLine: number; // 1-based line number
	readonly endLine: number; // 1-based line number
}

/**
 * Single step in the fix plan
 */
export interface FixStep {
	readonly order: number;
	readonly action: string; // e.g. "Replace X with Y"
	readonly detail: string; // Additional explanation
}

/**
 * Description of what will change when fix is applied
 */
export interface ChangeDescription {
	readonly type: "add" | "modify" | "remove" | "refactor";
	readonly scope: string; // e.g. "This file", "3 imports", "Service layer"
	readonly description: string; // What changes
}

/**
 * Plan to fix a finding (actionable but not copy-paste)
 */
export interface FixPlan {
	readonly steps: readonly FixStep[]; // 3-5 action items
	readonly changes: readonly ChangeDescription[]; // 2-4 changes
	readonly risks: readonly string[]; // 1-3 watch-outs
}

/**
 * Enhanced recommendation with confidence, evidence, and fix plan
 */
export interface EnhancedCodeRecommendation {
	readonly severity: "high" | "medium" | "low";
	readonly title: string;
	readonly line: number;
	readonly message: string;
	readonly ruleId: RuleId; // e.g. "errors/avoid-generic-error"
	readonly category: string; // From rule definition
	readonly confidence: ConfidenceScore;
	readonly evidence: CodeSnippet;
	readonly fixPlan: FixPlan;
	readonly guidanceKey?: string; // e.g. "async-await-in-effect" (optional, if guidance exists)
	readonly guidance?: string; // Full guidance markdown (optional, if guidance exists)
}

/**
 * Machine-readable summary of analysis results
 */
export interface MachineSummary {
	readonly findingsByLevel: Readonly<{
		high: number;
		medium: number;
		low: number;
	}>;
	readonly topIssueRuleIds: readonly RuleId[];
	readonly confidenceDistribution: Readonly<{
		high: number;
		medium: number;
		low: number;
	}>;
}

/**
 * Complete review code response
 */
export interface ReviewCodeResult {
	readonly recommendations: readonly CodeRecommendation[];
	readonly enhancedRecommendations: readonly EnhancedCodeRecommendation[];
	readonly summary: MachineSummary;
	readonly meta: ReviewCodeMeta;
	readonly markdown: string;
}

/**
 * Validation error types
 */
export class FileSizeError extends Error {
	readonly _tag = "FileSizeError";
	constructor(readonly size: number, readonly maxSize: number) {
		super(
			`File size ${size} bytes exceeds maximum of ${maxSize} bytes`
		);
	}
}

export class NonTypeScriptError extends Error {
	readonly _tag = "NonTypeScriptError";
	constructor(readonly filePath: string) {
		super(
			`File ${filePath} is not a TypeScript file. Only .ts and .tsx files are supported.`
		);
	}
}

/**
 * Validate file size
 */
function validateFileSize(
	code: string
): Effect.Effect<void, FileSizeError> {
	return Effect.gen(function* () {
		const size = Buffer.byteLength(code, "utf8");
		if (size > MAX_FILE_SIZE_BYTES) {
			yield* Effect.fail(
				new FileSizeError(size, MAX_FILE_SIZE_BYTES)
			);
		}
	});
}

/**
 * Validate TypeScript file extension
 */
function validateTypeScript(
	filePath?: string
): Effect.Effect<void, NonTypeScriptError> {
	return Effect.gen(function* () {
		if (!filePath) {
			return;
		}

		const isTypeScript =
			filePath.endsWith(".ts") || filePath.endsWith(".tsx");

		if (!isTypeScript) {
			yield* Effect.fail(new NonTypeScriptError(filePath));
		}
	});
}

/**
 * Sort findings by severity (high > medium > low), then by line number
 * (Option A from PRD)
 */
function sortFindings(findings: readonly Finding[]): readonly Finding[] {
	return [...findings].sort((a, b) => {
		const severityDiff =
			SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];

		if (severityDiff !== 0) {
			return severityDiff;
		}

		return a.range.startLine - b.range.startLine;
	});
}


/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: "high" | "medium" | "low"): string {
	switch (severity) {
		case "high":
			return "🔴";
		case "medium":
			return "🟡";
		case "low":
			return "🔵";
	}
}

/**
 * Extract one-line summary from a longer message
 */
function extractOneLineSummary(message: string): string {
	const sentences = message.split(/[.!?]\s+/);
	return (sentences[0] || message).slice(0, 100) + (sentences[0].length > 100 ? "..." : "");
}

/**
 * Format code snippet for markdown with highlighting
 */
function formatCodeSnippet(evidence: {
	beforeContext: readonly string[];
	targetLines: readonly string[];
	afterContext: readonly string[];
	startLine: number;
	endLine: number;
}): string {
	const lines: string[] = [];

	lines.push("```typescript");
	lines.push(`// Line ${evidence.startLine}${evidence.startLine !== evidence.endLine ? `-${evidence.endLine}` : ""}`);

	// Add before context
	evidence.beforeContext.forEach((line) => {
		lines.push(line);
	});

	// Add target lines with highlighting
	evidence.targetLines.forEach((line) => {
		lines.push(`>> ${line}  // ← Issue detected here`);
	});

	// Add after context
	evidence.afterContext.forEach((line) => {
		lines.push(line);
	});

	lines.push("```");

	return lines.join("\n");
}

/**
 * Generate enhanced markdown output for recommendations
 */
function generateEnhancedMarkdown(
	enhancedRecommendations: readonly EnhancedCodeRecommendation[],
	summary: MachineSummary,
	meta: ReviewCodeMeta
): string {
	const lines: string[] = [];

	lines.push("# Code Review Results\n");

	if (enhancedRecommendations.length === 0) {
		lines.push("✅ No issues found. Your code looks good!\n");
		return lines.join("\n");
	}

	// Machine summary section
	lines.push("## Summary");
	lines.push(
		`**Findings:** ${summary.findingsByLevel.high} high / ${summary.findingsByLevel.medium} medium / ${summary.findingsByLevel.low} low`
	);
	lines.push(
		`**Top Issues:** ${summary.topIssueRuleIds.slice(0, 3).join(", ")}`
	);
	lines.push(
		`**Confidence:** High (${summary.confidenceDistribution.high} findings) / Medium (${summary.confidenceDistribution.medium} findings)`
	);
	lines.push("\n---\n");

	// Enhanced findings
	enhancedRecommendations.forEach((rec, index) => {
		const emoji = getSeverityEmoji(rec.severity);

		lines.push(`## ${index + 1}. ${emoji} ${rec.title}\n`);
		lines.push(
			`**Rule:** \`${rec.ruleId}\` (severity: ${rec.severity}, confidence: ${rec.confidence.level})`
		);
		lines.push(`**Why it matters:** ${extractOneLineSummary(rec.message)}\n`);

		// Evidence
		lines.push("### Evidence");
		lines.push(formatCodeSnippet(rec.evidence));
		lines.push("");

		// Fix Plan
		lines.push("### Fix Plan\n");
		lines.push("**Steps:**");
		rec.fixPlan.steps.forEach((step) => {
			lines.push(`${step.order}. ${step.action}`);
		});
		lines.push("");

		lines.push("**What will change:**");
		rec.fixPlan.changes.forEach((change) => {
			lines.push(
				`- ${change.type}: ${change.description} (${change.scope})`
			);
		});
		lines.push("");

		if (rec.fixPlan.risks.length > 0) {
			lines.push("**Risks:**");
			rec.fixPlan.risks.forEach((risk) => {
				lines.push(`- ${risk}`);
			});
			lines.push("");
		}

		// Include pattern guidance if available
		if (rec.guidance) {
			lines.push("### Pattern Guidance");
			lines.push(rec.guidance);
			lines.push("");
		}

		lines.push("---\n");
	});

	// Upgrade message
	if (meta.upgradeMessage) {
		lines.push(`💡 **${meta.upgradeMessage}**`);
	}

	return lines.join("\n");
}

/**
 * Helper: Count findings by severity
 */
function countBySeverity(
	findings: readonly EnhancedCodeRecommendation[]
): Readonly<{ high: number; medium: number; low: number }> {
	const counts = { high: 0, medium: 0, low: 0 };
	findings.forEach((f) => {
		counts[f.severity]++;
	});
	return counts;
}

/**
 * Helper: Count findings by confidence level
 */
function countByConfidence(
	findings: readonly EnhancedCodeRecommendation[]
): Readonly<{ high: number; medium: number; low: number }> {
	const counts = { high: 0, medium: 0, low: 0 };
	findings.forEach((f) => {
		counts[f.confidence.level]++;
	});
	return counts;
}

/**
 * Helper: Build enhanced recommendation from finding
 */
function buildEnhancedRecommendation(
	finding: Finding,
	rule: RuleDefinition,
	code: string,
	sourceFile: ts.SourceFile,
	allFixes: readonly { id: string; description: string; title: string }[]
): EnhancedCodeRecommendation {
	const confidence = calculateConfidence(finding, sourceFile, rule);
	const evidence = extractSnippet(finding, code);
	// Cast allFixes to FixDefinition[] (safe because placeholder fixes follow the same shape)
	const fixPlan = generateFixPlan(finding, rule, allFixes as never as readonly FixDefinition[]);

	// Load guidance if available for this rule
	const guidanceKey = getGuidanceKey(finding.ruleId);
	const guidance = guidanceKey ? loadGuidance(finding.ruleId) : undefined;

	return {
		severity: finding.severity,
		title: finding.title,
		line: finding.range.startLine,
		message: finding.message,
		ruleId: finding.ruleId,
		category: rule.category,
		confidence,
		evidence,
		fixPlan,
		guidanceKey,
		guidance,
	};
}

/**
 * Review Code Service
 */
export class ReviewCodeService extends Effect.Service<ReviewCodeService>()(
	"ReviewCodeService",
	{
		effect: Effect.gen(function* () {
			const analysis = yield* AnalysisService;

			return {
				/**
				 * Review code and return top 3 recommendations with enhanced details
				 */
				reviewCode: (
					code: string,
					filePath?: string
				): Effect.Effect<
					ReviewCodeResult,
					FileSizeError | NonTypeScriptError
				> =>
					Effect.gen(function* () {
						yield* validateFileSize(code);
						yield* validateTypeScript(filePath);

						const filename = filePath ?? "unknown.ts";
						const result = yield* analysis.analyzeFile(
							filename,
							code,
							{
								analysisType: "all",
							}
						);

						const sortedFindings = sortFindings(result.findings);
						const totalFound = sortedFindings.length;
						const hiddenCount = Math.max(
							0,
							totalFound - MAX_FREE_TIER_RECOMMENDATIONS
						);

						// Build source file for AST analysis (used in confidence calculation)
						const sourceFile = ts.createSourceFile(
							filename,
							code,
							ts.ScriptTarget.Latest,
							true
						);

						// Prepare rules and fixes for enhancement (placeholder - normally from registry)
						// In a full implementation, these would come from RuleRegistryService
						const rulesMap = new Map<string, RuleDefinition>();
						const allFixes: { id: string; description: string; title: string }[] = [];

						// For now, we'll create a minimal rule definition for each finding
						// In production, these would come from RuleRegistryService
						sortedFindings.forEach((finding) => {
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

						// Build enhanced recommendations for all findings
						const allEnhancedFindings = sortedFindings.map((finding) => {
							const rule = rulesMap.get(finding.ruleId)!;
							return buildEnhancedRecommendation(
								finding,
								rule,
								code,
								sourceFile,
								allFixes
							);
						});

						// Take top 3 for free tier
						const topEnhancedFindings = allEnhancedFindings.slice(
							0,
							MAX_FREE_TIER_RECOMMENDATIONS
						);

						// Build machine summary
						const summary: MachineSummary = {
							findingsByLevel: countBySeverity(allEnhancedFindings),
							topIssueRuleIds: allEnhancedFindings
								.slice(0, 5)
								.map((f) => f.ruleId),
							confidenceDistribution: countByConfidence(
								allEnhancedFindings
							),
						};

						// Build backward-compatible recommendations
						const recommendations = topEnhancedFindings.map(
							(f): CodeRecommendation => ({
								severity: f.severity,
								title: f.title,
								line: f.line,
								message: f.message,
							})
						);

						const upgradeMessage =
							hiddenCount > 0
								? `${hiddenCount} more architectural issue${hiddenCount === 1 ? "" : "s"} found. Upgrade to Pro to see all issues and auto-fix them.`
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
							meta
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
		dependencies: [AnalysisService.Default],
	}
) { }
