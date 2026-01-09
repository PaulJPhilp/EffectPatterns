/**
 * Output formatting for lint results
 */

import type { LintResult } from "./types.js";

const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Print linting results
 * Returns exit code (0 = success, 1 = errors found)
 */
export function printLintResults(results: LintResult[]): number {
	console.log(colorize("\n📋 Effect Patterns Linter Results", "cyan"));
	console.log("═".repeat(60));

	const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
	const totalInfo = results.reduce((sum, r) => sum + r.info, 0);
	const clean = results.filter(
		(r) => r.errors === 0 && r.warnings === 0
	).length;

	console.log(`${colorize("Total:", "bright")}     ${results.length} files`);
	console.log(`${colorize("Clean:", "green")}     ${clean} files`);
	if (totalErrors > 0) {
		console.log(`${colorize("Errors:", "red")}    ${totalErrors} issues`);
	}
	if (totalWarnings > 0) {
		console.log(
			`${colorize("Warnings:", "yellow")}  ${totalWarnings} issues`
		);
	}
	if (totalInfo > 0) {
		console.log(`${colorize("Info:", "blue")}      ${totalInfo} suggestions`);
	}

	// Files with errors
	const filesWithErrors = results.filter((r) => r.errors > 0);
	if (filesWithErrors.length > 0) {
		console.log(`\n${colorize("❌ Files with Errors:", "red")}`);
		console.log("─".repeat(60));

		for (const result of filesWithErrors) {
			console.log(`\n${colorize(result.file, "bright")}`);

			for (const issue of result.issues) {
				if (issue.severity === "error") {
					console.log(
						colorize(
							`  ${issue.line}:${issue.column} - ${issue.rule}: ` +
							`${issue.message}`,
							"red"
						)
					);
					if (issue.suggestion) {
						console.log(colorize(`    → ${issue.suggestion}`, "dim"));
					}
				}
			}
		}
	}

	// Files with warnings
	const filesWithWarnings = results.filter(
		(r) => r.warnings > 0 && r.errors === 0
	);
	if (filesWithWarnings.length > 0) {
		console.log(`\n${colorize("⚠️  Files with Warnings:", "yellow")}`);
		console.log("─".repeat(60));

		for (const result of filesWithWarnings) {
			console.log(`\n${colorize(result.file, "bright")}`);

			for (const issue of result.issues) {
				if (issue.severity === "warning") {
					console.log(
						colorize(
							`  ${issue.line}:${issue.column} - ${issue.rule}: ` +
							`${issue.message}`,
							"yellow"
						)
					);
					if (issue.suggestion) {
						console.log(colorize(`    → ${issue.suggestion}`, "dim"));
					}
				}
			}
		}
	}

	// Info suggestions
	if (totalInfo > 0) {
		console.log(
			`\n${colorize(`ℹ️  ${totalInfo} style suggestions available`, "blue")}`
		);
		console.log(colorize("  Run with --verbose to see details", "dim"));
	}

	console.log(`\n${"═".repeat(60)}`);

	if (totalErrors > 0) {
		console.log(
			colorize(`\n❌ Linting failed with ${totalErrors} error(s)\n`, "red")
		);
		return 1;
	}
	if (totalWarnings > 0) {
		console.log(
			colorize(
				`\n⚠️  Linting completed with ${totalWarnings} warning(s)\n`,
				"yellow"
			)
		);
		return 0;
	}
	console.log(
		colorize("\n✨ All files passed Effect patterns linting!\n", "green")
	);
	return 0;
}
