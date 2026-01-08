/**
 * Main linter implementation
 */

import * as path from "node:path";
import {
	checkDeprecatedAPIs,
	checkErrorModel,
	checkExplicitConcurrency,
	checkPreferPipe,
	checkStreamMemory,
	checkUseTapError,
} from "./checkers.js";
import type { LintResult } from "./types.js";

/**
 * Lint a single file
 */
export async function lintFile(
	filePath: string,
	readFile: (path: string) => Promise<string>
): Promise<LintResult> {
	const fileName = path.basename(filePath);
	const content = await readFile(filePath);

	const allIssues = [
		...checkUseTapError(content, filePath),
		...checkExplicitConcurrency(content, filePath),
		...checkDeprecatedAPIs(content, filePath),
		...checkPreferPipe(content, filePath),
		...checkStreamMemory(content, filePath),
		...checkErrorModel(content, filePath),
	];

	allIssues.sort((a, b) => a.line - b.line);

	const errors = allIssues.filter((i) => i.severity === "error").length;
	const warnings = allIssues.filter((i) => i.severity === "warning").length;
	const info = allIssues.filter((i) => i.severity === "info").length;

	return {
		file: fileName,
		issues: allIssues,
		errors,
		warnings,
		info,
	};
}

/**
 * Lint multiple files in parallel
 */
export async function lintInParallel(
	files: string[],
	readFile: (path: string) => Promise<string>
): Promise<LintResult[]> {
	const CONCURRENCY = 10;
	const results: LintResult[] = [];
	const queue = [...files];

	async function worker() {
		while (queue.length > 0) {
			const file = queue.shift();
			if (!file) break;

			const result = await lintFile(file, readFile);
			results.push(result);
		}
	}

	const workers = Array.from({ length: CONCURRENCY }, () => worker());
	await Promise.all(workers);

	return results;
}
