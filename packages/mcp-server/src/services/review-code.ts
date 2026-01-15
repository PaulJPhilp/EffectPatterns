/**
 * ReviewCodeService - Free Tier Code Review
 *
 * Provides limited, high-fidelity architectural recommendations for Effect
 * codebases. Acts as the "Hook" for the Free Tier by demonstrating the
 * value of the Analysis Core while driving users toward Pro Tier features.
 */

import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import type { Finding } from "../tools/schemas";

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
 * Complete review code response
 */
export interface ReviewCodeResult {
	readonly recommendations: readonly CodeRecommendation[];
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
 * Transform Finding to CodeRecommendation
 */
function toRecommendation(finding: Finding): CodeRecommendation {
	return {
		severity: finding.severity,
		title: finding.title,
		line: finding.range.startLine,
		message: finding.message,
	};
}

/**
 * Generate Markdown output for recommendations
 */
function generateMarkdown(
	recommendations: readonly CodeRecommendation[],
	meta: ReviewCodeMeta
): string {
	const lines: string[] = [];

	lines.push("# Code Review Results\n");

	if (recommendations.length === 0) {
		lines.push("✅ No issues found. Your code looks good!\n");
		return lines.join("\n");
	}

	lines.push(
		`Found ${meta.totalFound} issue${meta.totalFound === 1 ? "" : "s"}.`
	);

	if (meta.hiddenCount > 0) {
		lines.push(
			`Showing top ${recommendations.length} highest-priority issues.\n`
		);
	} else {
		lines.push("");
	}

	recommendations.forEach((rec, index) => {
		const emoji =
			rec.severity === "high"
				? "🔴"
				: rec.severity === "medium"
					? "🟡"
					: "🔵";

		lines.push(`## ${index + 1}. ${emoji} ${rec.title}`);
		lines.push(`**Line ${rec.line}** • Severity: ${rec.severity}\n`);
		lines.push(rec.message);
		lines.push("");
	});

	if (meta.upgradeMessage) {
		lines.push("---\n");
		lines.push(`💡 **${meta.upgradeMessage}**`);
	}

	return lines.join("\n");
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
				 * Review code and return top 3 recommendations
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
						const topFindings = sortedFindings.slice(
							0,
							MAX_FREE_TIER_RECOMMENDATIONS
						);
						const hiddenCount = Math.max(
							0,
							totalFound - MAX_FREE_TIER_RECOMMENDATIONS
						);

						const recommendations = topFindings.map(toRecommendation);

						const upgradeMessage =
							hiddenCount > 0
								? `${hiddenCount} more architectural issue${hiddenCount === 1 ? "" : "s"} found. Upgrade to Pro to see all issues and auto-fix them.`
								: undefined;

						const meta: ReviewCodeMeta = {
							totalFound,
							hiddenCount,
							upgradeMessage,
						};

						const markdown = generateMarkdown(recommendations, meta);

						return {
							recommendations,
							meta,
							markdown,
						};
					}),
			};
		}),
		dependencies: [AnalysisService.Default],
	}
) { }
