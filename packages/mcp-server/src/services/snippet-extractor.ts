/**
 * SnippetExtractor - Extract code snippets showing context around issues
 *
 * Extracts a snippet of code (before context + problem lines + after context)
 * to show the issue in context without showing the full file.
 */

import type { CodeSnippet, Finding } from "../tools/schemas";

/**
 * Extract a code snippet from source, showing context around the finding
 * @param finding The code finding with location information
 * @param source The full source code
 * @param contextLines Number of context lines to show before/after (default: 2)
 * @returns CodeSnippet with before, target, and after lines
 */
export function extractSnippet(
	finding: Finding,
	source: string,
	contextLines: number = 2
): CodeSnippet {
	const lines = source.split("\n");
	const { startLine, endLine } = finding.range;

	// Convert 1-based line numbers to 0-based array indices
	const targetStartIdx = startLine - 1;
	const targetEndIdx = endLine - 1;

	// Calculate context boundaries
	const beforeStartIdx = Math.max(0, targetStartIdx - contextLines);
	const afterEndIdx = Math.min(lines.length - 1, targetEndIdx + contextLines);

	// Extract sections
	const beforeContext = lines.slice(beforeStartIdx, targetStartIdx);
	const targetLines = lines.slice(targetStartIdx, targetEndIdx + 1);
	const afterContext = lines.slice(targetEndIdx + 1, afterEndIdx + 1);

	// Calculate total lines - if too large, trim context
	const totalLines =
		beforeContext.length + targetLines.length + afterContext.length;

	let finalBefore = beforeContext;
	let finalAfter = afterContext;

	// If snippet is too long (> 15 lines), reduce context
	if (totalLines > 15) {
		// Keep only 1 line of context on each side
		finalBefore = beforeContext.slice(-1);
		finalAfter = afterContext.slice(0, 1);
	}

	return {
		beforeContext: finalBefore,
		targetLines,
		afterContext: finalAfter,
		startLine,
		endLine,
	};
}
