/**
 * Effect Patterns Linter Service
 *
 * Custom linter for Effect-TS patterns and idioms:
 * - Effect.catchAll + Effect.gen for logging (use tapError)
 * - Missing concurrency options in Effect.all
 * - Deprecated API usage
 * - Non-idiomatic Effect patterns
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";

// --- TYPES ---

export interface LintIssue {
	rule: string;
	severity: "error" | "warning" | "info";
	message: string;
	line: number;
	column: number;
	suggestion?: string;
}

export interface LintResult {
	file: string;
	issues: LintIssue[];
	errors: number;
	warnings: number;
	info: number;
}

export interface LinterConfig {
	srcDirs: string[];
	concurrency: number;
}

// --- LINT RULES ---

function checkUseTapError(content: string): LintIssue[] {
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
						"Use Effect.tapError for side-effect logging instead of Effect.catchAll + Effect.gen",
					line: i + 1,
					column: line.indexOf("catchAll"),
					suggestion: "Replace with .tapError((error) => Effect.log(...))",
				});
			}
		}
	}

	return issues;
}

function checkConcurrencyOptions(content: string): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (line.includes("Effect.all(") && !line.includes("concurrency")) {
			let hasOptions = false;
			for (let j = i; j < Math.min(i + 5, lines.length); j++) {
				if (lines[j].includes("concurrency")) {
					hasOptions = true;
					break;
				}
			}

			if (!hasOptions) {
				issues.push({
					rule: "effect-all-concurrency",
					severity: "info",
					message:
						"Consider adding concurrency option to Effect.all for better performance",
					line: i + 1,
					column: line.indexOf("Effect.all"),
					suggestion: 'Add { concurrency: "unbounded" } or { concurrency: N }',
				});
			}
		}
	}

	return issues;
}

function checkDeprecatedAPIs(content: string): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = content.split("\n");

	const deprecatedAPIs = [
		{
			pattern: "Effect.promise(",
			message: "Effect.promise is deprecated, use Effect.tryPromise instead",
			suggestion: "Replace with Effect.tryPromise",
		},
	];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		for (const api of deprecatedAPIs) {
			if (line.includes(api.pattern)) {
				issues.push({
					rule: "effect-deprecated-api",
					severity: "warning",
					message: api.message,
					line: i + 1,
					column: line.indexOf(api.pattern),
					suggestion: api.suggestion,
				});
			}
		}
	}

	return issues;
}

// --- LINTING ---

export const lintFile = (
	filePath: string,
): Effect.Effect<LintResult, never, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const fileName = filePath.split("/").pop() || "unknown";

		try {
			const content = yield* fs.readFileString(filePath);

			const issues: LintIssue[] = [
				...checkUseTapError(content),
				...checkConcurrencyOptions(content),
				...checkDeprecatedAPIs(content),
			];

			const errors = issues.filter((i) => i.severity === "error").length;
			const warnings = issues.filter((i) => i.severity === "warning").length;
			const info = issues.filter((i) => i.severity === "info").length;

			return {
				file: fileName,
				issues,
				errors,
				warnings,
				info,
			};
		} catch (error) {
			return {
				file: fileName,
				issues: [],
				errors: 0,
				warnings: 0,
				info: 0,
			};
		}
	}).pipe(
		Effect.catchAll(() =>
			Effect.succeed({
				file: filePath.split("/").pop() || "unknown",
				issues: [],
				errors: 0,
				warnings: 0,
				info: 0,
			}),
		),
	);

export const lintAllFiles = (
	config: LinterConfig,
): Effect.Effect<LintResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const allFiles: string[] = [];

		// Collect all TypeScript files from all source directories
		for (const srcDir of config.srcDirs) {
			const dirExists = yield* fs.exists(srcDir);
			if (!dirExists) continue;

			const files = yield* fs.readDirectory(srcDir);
			const tsFiles = files
				.filter((f) => f.endsWith(".ts"))
				.map((f) => `${srcDir}/${f}`);
			allFiles.push(...tsFiles);
		}

		// Lint all files in parallel
		const results = yield* Effect.all(
			allFiles.map((f) => lintFile(f)),
			{ concurrency: config.concurrency },
		);

		return results;
	});

// --- SUMMARY HELPERS ---

export const summarizeLintResults = (
	results: LintResult[],
): {
	totalFiles: number;
	totalIssues: number;
	totalErrors: number;
	totalWarnings: number;
	totalInfo: number;
} => {
	const totalFiles = results.length;
	const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
	const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
	const totalInfo = results.reduce((sum, r) => sum + r.info, 0);

	return {
		totalFiles,
		totalIssues,
		totalErrors,
		totalWarnings,
		totalInfo,
	};
};

export const getFilesWithIssues = (results: LintResult[]): LintResult[] =>
	results.filter((r) => r.issues.length > 0);
