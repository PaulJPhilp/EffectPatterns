import type { SnippetConfig } from "./types";

/**
 * Default snippet extraction configuration
 */
export const DEFAULT_SNIPPET_CONFIG: SnippetConfig = {
	defaultContextLines: 2,
	maxSnippetLines: 15,
	minContextLinesWhenTrimming: 1,
};

/**
 * Split source code into lines
 */
export function splitLines(source: string): readonly string[] {
	return source.split("\n");
}

/**
 * Calculate context boundaries for a finding
 */
export function calculateBoundaries(
	startLine: number,
	endLine: number,
	contextLines: number,
	totalLines: number,
): {
	readonly beforeStartIdx: number;
	readonly targetStartIdx: number;
	readonly targetEndIdx: number;
	readonly afterEndIdx: number;
} {
	const targetStartIdx = startLine - 1;
	const targetEndIdx = endLine - 1;

	return {
		beforeStartIdx: Math.max(0, targetStartIdx - contextLines),
		targetStartIdx,
		targetEndIdx,
		afterEndIdx: Math.min(totalLines - 1, targetEndIdx + contextLines),
	};
}

/**
 * Extract context sections from lines
 */
export function extractSections(
	lines: readonly string[],
	beforeStartIdx: number,
	targetStartIdx: number,
	targetEndIdx: number,
	afterEndIdx: number,
): {
	readonly beforeContext: readonly string[];
	readonly targetLines: readonly string[];
	readonly afterContext: readonly string[];
} {
	return {
		beforeContext: Array.from(lines.slice(beforeStartIdx, targetStartIdx)),
		targetLines: Array.from(lines.slice(targetStartIdx, targetEndIdx + 1)),
		afterContext: Array.from(lines.slice(targetEndIdx + 1, afterEndIdx + 1)),
	};
}

/**
 * Trim context if snippet exceeds maximum lines
 */
export function trimContextIfNeeded(
	beforeContext: readonly string[],
	targetLines: readonly string[],
	afterContext: readonly string[],
	config: SnippetConfig,
): {
	readonly beforeContext: readonly string[];
	readonly afterContext: readonly string[];
} {
	const totalLines =
		beforeContext.length + targetLines.length + afterContext.length;

	if (totalLines > config.maxSnippetLines) {
		return {
			beforeContext: Array.from(
				beforeContext.slice(-config.minContextLinesWhenTrimming),
			),
			afterContext: Array.from(
				afterContext.slice(0, config.minContextLinesWhenTrimming),
			),
		};
	}

	return {
		beforeContext: Array.from(beforeContext),
		afterContext: Array.from(afterContext),
	};
}
