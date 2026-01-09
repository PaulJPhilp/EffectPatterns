/**
 * Auto-fix implementations for linting rules
 */

import { LINT_RULES } from "./rules.js";
import type { LintIssue } from "./types.js";

/**
 * Fix explicit concurrency issue by adding { concurrency: "unbounded" }
 */
export function fixExplicitConcurrency(
	content: string,
	issue: LintIssue
): string {
	const lines = content.split("\n");
	const lineIndex = issue.line - 1;

	if (lineIndex < 0 || lineIndex >= lines.length) {
		return content;
	}

	const line = lines[lineIndex];
	const effectAllIndex = line.indexOf("Effect.all(");

	if (effectAllIndex === -1) {
		return content;
	}

	// Find the matching closing parenthesis
	let depth = 0;
	let closingIndex = -1;
	let currentLineIndex = lineIndex;
	let charIndex = effectAllIndex + "Effect.all(".length;

	// Search for closing paren, handling nested parens
	while (currentLineIndex < lines.length) {
		const currentLine = lines[currentLineIndex];
		for (let i = charIndex; i < currentLine.length; i++) {
			if (currentLine[i] === "(") depth++;
			else if (currentLine[i] === ")") {
				if (depth === 0) {
					closingIndex = i;
					break;
				}
				depth--;
			}
		}

		if (closingIndex !== -1) {
			// Found closing paren - insert concurrency option before it
			const before = lines[currentLineIndex].substring(0, closingIndex);
			const after = lines[currentLineIndex].substring(closingIndex);
			lines[
				currentLineIndex
			] = `${before}, { concurrency: "unbounded" }${after}`;
			break;
		}

		currentLineIndex++;
		charIndex = 0;
	}

	return lines.join("\n");
}

/**
 * Fix deprecated API usage by replacing with modern equivalents
 */
export function fixDeprecatedAPI(content: string, issue: LintIssue): string {
	const lines = content.split("\n");
	const lineIndex = issue.line - 1;

	if (lineIndex < 0 || lineIndex >= lines.length) {
		return content;
	}

	let line = lines[lineIndex];

	// Replace deprecated APIs with modern equivalents
	if (line.includes("Option.zip(")) {
		line = line.replace(/Option\.zip\(/g, "Option.all(");
	} else if (line.includes("Either.zip(")) {
		line = line.replace(/Either\.zip\(/g, "Either.all(");
	} else if (line.includes("Option.cond(")) {
		// For Option.cond, we can't safely auto-fix as it requires restructuring
		// Skip this one for now
		return content;
	} else if (line.includes("Either.cond(")) {
		// For Either.cond, we can't safely auto-fix as it requires restructuring
		// Skip this one for now
		return content;
	} else if (line.includes("Effect.matchTag(")) {
		line = line.replace(/Effect\.matchTag\(/g, "Effect.catchTags(");
	} else if (line.includes("Effect.fromOption(")) {
		// Can't safely auto-fix - requires restructuring
		return content;
	} else if (line.includes("Effect.fromEither(")) {
		// Can't safely auto-fix - requires restructuring
		return content;
	}

	lines[lineIndex] = line;
	return lines.join("\n");
}

/**
 * Apply fixes to file content
 */
export async function applyFixes(
	filePath: string,
	issues: LintIssue[],
	readFile: (path: string) => Promise<string>
): Promise<{ fixed: number; content: string }> {
	let content = await readFile(filePath);
	let fixedCount = 0;

	// Sort issues by line number in reverse order to preserve line numbers
	const sortedIssues = [...issues].sort((a, b) => b.line - a.line);

	for (const issue of sortedIssues) {
		// Check if this rule can be auto-fixed
		const rule = LINT_RULES.find((r) => r.name === issue.rule);
		if (!rule?.canFix) {
			continue;
		}

		let newContent = content;

		// Apply the appropriate fix based on the rule
		if (issue.rule === "effect-explicit-concurrency") {
			newContent = fixExplicitConcurrency(content, issue);
		} else if (issue.rule === "effect-deprecated-api") {
			newContent = fixDeprecatedAPI(content, issue);
		}

		// Only count as fixed if content actually changed
		if (newContent !== content) {
			content = newContent;
			fixedCount++;
		}
	}

	return { fixed: fixedCount, content };
}
