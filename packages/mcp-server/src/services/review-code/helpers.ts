import { Effect } from "effect";
import { FileSizeError, NonTypeScriptError } from "./errors";
import type {
	EnhancedCodeRecommendation,
	MachineSummary,
	ReviewCodeMeta,
} from "./types";

/**
 * Maximum number of recommendations returned by this endpoint
 */
export const MAX_RECOMMENDATIONS = 3;

/**
 * Maximum file size in bytes (100KB)
 */
export const MAX_FILE_SIZE_BYTES = 100 * 1024;

/**
 * Severity ranking for sorting (higher = more important)
 */
export const SEVERITY_RANK = {
	high: 3,
	medium: 2,
	low: 1,
} as const;

/**
 * Validate file size
 */
export function validateFileSize(
	code: string,
): Effect.Effect<void, FileSizeError> {
	return Effect.gen(function* () {
		const size = Buffer.byteLength(code, "utf8");
		if (size > MAX_FILE_SIZE_BYTES) {
			yield* Effect.fail(new FileSizeError({ size, maxSize: MAX_FILE_SIZE_BYTES }));
		}
	});
}

/**
 * Validate TypeScript file extension
 */
export function validateTypeScript(
	filePath?: string,
): Effect.Effect<void, NonTypeScriptError> {
	return Effect.gen(function* () {
		if (!filePath) {
			return;
		}

		const isTypeScript = filePath.endsWith(".ts") || filePath.endsWith(".tsx");

		if (!isTypeScript) {
			yield* Effect.fail(new NonTypeScriptError({ filePath }));
		}
	});
}

/**
 * Sort findings by severity (high > medium > low), then by line number
 */
export function sortFindings(
	findings: readonly EnhancedCodeRecommendation[],
): readonly EnhancedCodeRecommendation[] {
	return [...findings].sort((a, b) => {
		const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];

		if (severityDiff !== 0) {
			return severityDiff;
		}

		return a.line - b.line;
	});
}

/**
 * Get emoji for severity level
 */
export function getSeverityEmoji(severity: "high" | "medium" | "low"): string {
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
export function extractOneLineSummary(message: string): string {
	const sentences = message.split(/[.!?]\s+/);
	return (
		(sentences[0] || message).slice(0, 100) +
		(sentences[0].length > 100 ? "..." : "")
	);
}

/**
 * Format a code snippet for markdown
 */
export function formatCodeSnippet(snippet: {
	readonly beforeContext: readonly string[];
	readonly targetLines: readonly string[];
	readonly afterContext: readonly string[];
	readonly startLine: number;
}): string {
	const lines: string[] = [];

	lines.push("```typescript");
	if (snippet.beforeContext.length > 0) {
		lines.push(...snippet.beforeContext);
	}
	if (snippet.targetLines.length > 0) {
		lines.push("// ⬇️ Issue is here:");
		lines.push(...snippet.targetLines);
	}
	if (snippet.afterContext.length > 0) {
		lines.push(...snippet.afterContext);
	}
	lines.push("```");
	lines.push(
		`_Lines ${snippet.startLine}-${snippet.startLine + snippet.targetLines.length - 1}_`,
	);

	return lines.join("\n");
}

/**
 * Generate enhanced markdown from findings
 */
export function generateEnhancedMarkdown(
	findings: readonly EnhancedCodeRecommendation[],
	summary: MachineSummary,
	meta: ReviewCodeMeta,
): string {
	const lines: string[] = [];

	// Header with metadata
	lines.push("# Code Review Results\n");
	lines.push(
		`**Found ${meta.totalFound} architectural issue${meta.totalFound === 1 ? "" : "s"} **\n`,
	);

	if (meta.totalFound === 0) {
		lines.push("Great! No architectural issues detected. ✨\n");
		return lines.join("\n");
	}

	// Summary stats
	lines.push("## Summary\n");
	lines.push(`- **High severity:** ${summary.findingsByLevel.high}`);
	lines.push(`- **Medium severity:** ${summary.findingsByLevel.medium}`);
	lines.push(`- **Low severity:** ${summary.findingsByLevel.low}`);
	lines.push("");

	lines.push(`- **High confidence:** ${summary.confidenceDistribution.high}`);
	lines.push(
		`- **Medium confidence:** ${summary.confidenceDistribution.medium}`,
	);
	lines.push(`- **Low confidence:** ${summary.confidenceDistribution.low}`);
	lines.push("");

	// Recommendations
	if (findings.length > 0) {
		lines.push("## Detailed Recommendations\n");
	}

	findings.forEach((rec) => {
		const emoji = getSeverityEmoji(rec.severity);
		lines.push(`### ${emoji} ${rec.title}\n`);
		lines.push(
			`**Rule:** \`${rec.ruleId}\` (severity: ${rec.severity}, confidence: ${rec.confidence.level})`,
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
			lines.push(`- ${change.type}: ${change.description} (${change.scope})`);
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
export function countBySeverity(
	findings: readonly EnhancedCodeRecommendation[],
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
export function countByConfidence(
	findings: readonly EnhancedCodeRecommendation[],
): Readonly<{ high: number; medium: number; low: number }> {
	const counts = { high: 0, medium: 0, low: 0 };
	findings.forEach((f) => {
		counts[f.confidence.level]++;
	});
	return counts;
}
