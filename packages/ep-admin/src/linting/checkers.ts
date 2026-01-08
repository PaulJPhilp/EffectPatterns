/**
 * Individual rule checker implementations
 */

import * as path from "node:path";
import type { LintIssue } from "./types.js";

/**
 * Rule: effect-use-taperror
 */
export function checkUseTapError(
	content: string,
	_filePath: string
): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (
			line.includes("catchAll") &&
			i + 1 < lines.length &&
			lines[i + 1].includes("Effect.gen")
		) {
			let nextLines = "";
			for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
				nextLines += lines[j];
				if (lines[j].includes("))")) break;
			}

			if (
				(nextLines.includes("Effect.log") ||
					nextLines.includes("console.log")) &&
				!nextLines.includes("return") &&
				!nextLines.includes("Effect.fail") &&
				!nextLines.includes("Effect.succeed")
			) {
				issues.push({
					rule: "effect-use-taperror",
					severity: "warning",
					message:
						"Use Effect.tapError for side-effect logging instead of " +
						"Effect.catchAll + Effect.gen",
					line: i + 1,
					column: line.indexOf("catchAll") + 1,
					suggestion:
						"Replace with: .pipe(Effect.tapError((error) => " +
						"Effect.log(...)), Effect.catchAll(...))",
				});
			}
		}
	}

	return issues;
}

/**
 * Rule: effect-explicit-concurrency
 */
export function checkExplicitConcurrency(
	content: string,
	filePath: string
): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");
	const fileName = path.basename(filePath, ".ts");

	if (
		fileName.includes("sequential") ||
		fileName.includes("sequence") ||
		content.includes("// sequential by design")
	) {
		return issues;
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (line.includes("Effect.all(") && !line.includes("concurrency")) {
			let hasConcurrency = false;
			for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
				if (lines[j].includes("concurrency")) {
					hasConcurrency = true;
					break;
				}
			}

			if (!hasConcurrency) {
				const isParallelPattern =
					fileName.includes("parallel") ||
					fileName.includes("concurrent") ||
					content.includes("// parallel") ||
					content.includes("// concurrently");

				issues.push({
					rule: "effect-explicit-concurrency",
					severity: isParallelPattern ? "error" : "warning",
					message: isParallelPattern
						? "Effect.all runs sequentially by default. Add " +
						"{ concurrency: 'unbounded' } for parallel execution"
						: "Effect.all should explicitly specify concurrency option " +
						"(default is sequential)",
					line: i + 1,
					column: line.indexOf("Effect.all") + 1,
					suggestion: isParallelPattern
						? "Add: { concurrency: 'unbounded' }"
						: "Add: { concurrency: 'unbounded' } or { concurrency: N }",
				});
			}
		}
	}

	return issues;
}

/**
 * Rule: effect-deprecated-api
 */
export function checkDeprecatedAPIs(
	content: string,
	_filePath: string
): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");

	const deprecatedAPIs = [
		{
			pattern: /Effect\.fromOption\(/,
			replacement: "Option.match with Effect.succeed/Effect.fail",
			reason: "Effect.fromOption is deprecated",
		},
		{
			pattern: /Effect\.fromEither\(/,
			replacement: "Either.match with Effect.succeed/Effect.fail",
			reason: "Effect.fromEither is deprecated",
		},
		{
			pattern: /Option\.zip\(/,
			replacement: "Option.all",
			reason: "Option.zip is deprecated, use Option.all",
		},
		{
			pattern: /Either\.zip\(/,
			replacement: "Either.all",
			reason: "Either.zip is deprecated, use Either.all",
		},
		{
			pattern: /Option\.cond\(/,
			replacement: "ternary expression with Option.some/Option.none",
			reason: "Option.cond is deprecated",
		},
		{
			pattern: /Either\.cond\(/,
			replacement: "ternary expression with Either.right/Either.left",
			reason: "Either.cond is deprecated",
		},
		{
			pattern: /Effect\.matchTag\(/,
			replacement: "Effect.catchTags",
			reason: "Effect.matchTag is deprecated, use Effect.catchTags",
		},
	];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		for (const api of deprecatedAPIs) {
			if (api.pattern.test(line)) {
				issues.push({
					rule: "effect-deprecated-api",
					severity: "error",
					message: api.reason,
					line: i + 1,
					column: line.search(api.pattern) + 1,
					suggestion: `Use ${api.replacement} instead`,
				});
			}
		}
	}

	return issues;
}

/**
 * Rule: effect-prefer-pipe
 */
export function checkPreferPipe(
	content: string,
	_filePath: string
): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const chainCount = (line.match(/\)\./g) || []).length;

		if (chainCount > 3 && !line.includes("pipe(")) {
			issues.push({
				rule: "effect-prefer-pipe",
				severity: "info",
				message:
					"Consider using pipe() for better readability with long chains",
				line: i + 1,
				column: 1,
				suggestion: "Refactor to: pipe(value, fn1, fn2, fn3, ...)",
			});
		}
	}

	return issues;
}

/**
 * Rule: effect-stream-memory
 */
export function checkStreamMemory(
	content: string,
	filePath: string
): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");
	const fileName = path.basename(filePath, ".ts");

	if (!fileName.includes("stream")) {
		return issues;
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (
			line.includes("readFileString") ||
			(line.includes("readFile") &&
				!line.includes("Stream") &&
				!line.includes("pipe"))
		) {
			issues.push({
				rule: "effect-stream-memory",
				severity: "error",
				message:
					"Streaming pattern loads entire content into memory. " +
					"Use proper streaming.",
				line: i + 1,
				column: line.indexOf("readFile") + 1,
				suggestion:
					"Use: fs.readFile(path).pipe(Stream.decodeText('utf-8'), " +
					"Stream.splitLines)",
			});
		}

		if (
			line.includes("Stream.runCollect") &&
			i > 0 &&
			!lines[i - 5]?.includes("// Intentionally collecting")
		) {
			issues.push({
				rule: "effect-stream-memory",
				severity: "warning",
				message:
					"Stream.runCollect loads entire stream into memory. " +
					"Consider using Stream.run instead.",
				line: i + 1,
				column: line.indexOf("Stream.runCollect") + 1,
				suggestion: "Use Stream.run or other streaming combinators",
			});
		}
	}

	return issues;
}

/**
 * Rule: effect-error-model
 */
export function checkErrorModel(
	content: string,
	_filePath: string
): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (
			(line.includes("Effect<") && line.includes(", Error,")) ||
			(line.includes("Effect.fail") && line.includes("new Error("))
		) {
			if (
				line.trim().startsWith("//") ||
				lines[i - 1]?.includes("Anti-Pattern") ||
				lines[i - 1]?.includes("Bad:")
			) {
				continue;
			}

			issues.push({
				rule: "effect-error-model",
				severity: "info",
				message:
					"Consider using typed errors (Data.TaggedError) instead of " +
					"generic Error",
				line: i + 1,
				column: line.indexOf("Error") + 1,
				suggestion:
					"Define: class MyError extends Data.TaggedError('MyError')<{...}>",
			});
		}
	}

	return issues;
}
