import type { RuleId } from "../../tools/schemas";

/**
 * Code recommendation for review output
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
 * Input for reviewing code
 */
export interface ReviewCodeInput {
	readonly code: string;
	readonly filePath?: string;
}
