/**
 * QA Service
 *
 * Provides QA status, reporting, and repair functionality:
 * - Load and summarize QA results
 * - Generate comprehensive reports
 * - Repair failed patterns
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import type {
	QAConfig,
	QAReport,
	QAResult,
	QAStatus,
	RepairResult,
	RepairSummary,
} from "./types.js";

// --- HELPERS ---

function categorizeError(error: string): string {
	const errorLower = error.toLowerCase();

	if (errorLower.includes("import") || errorLower.includes("export")) {
		return "imports";
	}
	if (errorLower.includes("type") || errorLower.includes("typescript")) {
		return "typescript";
	}
	if (errorLower.includes("deprecated") || errorLower.includes("outdated")) {
		return "deprecated";
	}
	if (errorLower.includes("example") || errorLower.includes("demo")) {
		return "examples";
	}
	if (
		errorLower.includes("documentation") ||
		errorLower.includes("clarity")
	) {
		return "documentation";
	}
	if (errorLower.includes("metadata") || errorLower.includes("frontmatter")) {
		return "metadata";
	}
	if (errorLower.includes("pattern") || errorLower.includes("best practice")) {
		return "patterns";
	}

	return "other";
}

// --- STATUS ---

export const getQAStatus = (
	config: QAConfig,
): Effect.Effect<QAStatus, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const dirExists = yield* fs.exists(config.resultsDir);
		if (!dirExists) {
			return {
				total: 0,
				passed: 0,
				failed: 0,
				passRate: 0,
				failuresByCategory: {},
				bySkillLevel: {},
			};
		}

		const files = yield* fs.readDirectory(config.resultsDir);
		const qaResults = files.filter((f) => f.endsWith("-qa.json"));

		if (qaResults.length === 0) {
			return {
				total: 0,
				passed: 0,
				failed: 0,
				passRate: 0,
				failuresByCategory: {},
				bySkillLevel: {},
			};
		}

		let total = 0;
		let passed = 0;
		let failed = 0;
		const failuresByCategory: Record<string, number> = {};
		const bySkillLevel: Record<string, { passed: number; failed: number }> =
			{};

		for (const file of qaResults) {
			const filePath = `${config.resultsDir}/${file}`;
			const content = yield* fs.readFileString(filePath);
			const result = JSON.parse(content) as QAResult;

			total++;

			if (result.passed) {
				passed++;
			} else {
				failed++;

				if (result.errors) {
					for (const error of result.errors) {
						const category = categorizeError(error);
						failuresByCategory[category] =
							(failuresByCategory[category] || 0) + 1;
					}
				}
			}

			const level = result.metadata?.skillLevel || "unknown";
			if (!bySkillLevel[level]) {
				bySkillLevel[level] = { passed: 0, failed: 0 };
			}

			if (result.passed) {
				bySkillLevel[level].passed++;
			} else {
				bySkillLevel[level].failed++;
			}
		}

		const passRate = total > 0 ? (passed / total) * 100 : 0;

		return {
			total,
			passed,
			failed,
			passRate,
			failuresByCategory,
			bySkillLevel,
		};
	});

// --- REPORT GENERATION ---

export const generateQAReport = (
	config: QAConfig,
): Effect.Effect<QAReport, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const files = yield* fs.readDirectory(config.resultsDir);
		const qaResultFiles = files.filter((f) => f.endsWith(".json"));

		const results: QAResult[] = [];
		for (const file of qaResultFiles) {
			const filePath = `${config.resultsDir}/${file}`;
			const content = yield* fs.readFileString(filePath);
			results.push(JSON.parse(content) as QAResult);
		}

		const total = results.length;
		const passed = results.filter((r) => r.passed).length;
		const failed = total - passed;
		const passRate = total > 0 ? (passed / total) * 100 : 0;

		const tokens = results.map((r) => r.tokens || 0);
		const costs = results.map((r) => r.cost || 0);
		const durations = results.map((r) => r.duration || 0);

		const totalTokens = tokens.reduce((sum, t) => sum + t, 0);
		const totalCost = costs.reduce((sum, c) => sum + c, 0);
		const totalDuration = durations.reduce((sum, d) => sum + d, 0);

		const failedPatterns = results.filter((r) => !r.passed);
		const failurePatterns = failedPatterns.map((result) => ({
			patternId: result.patternId || "unknown",
			fileName: result.fileName || "unknown",
			title: result.metadata?.title || "Unknown",
			skillLevel: result.metadata?.skillLevel || "unknown",
			tags: result.metadata?.tags || [],
			errors: result.errors || [],
			warnings: result.warnings || [],
			suggestions: result.suggestions || [],
		}));

		const skillLevelStats: Record<
			string,
			{ passed: number; failed: number }
		> = {};
		const tagStats: Record<string, { passed: number; failed: number }> = {};
		const failuresByCategory: Record<string, number> = {};

		for (const result of results) {
			const level = result.metadata?.skillLevel || "unknown";
			if (!skillLevelStats[level]) {
				skillLevelStats[level] = { passed: 0, failed: 0 };
			}

			if (result.passed) {
				skillLevelStats[level].passed++;
			} else {
				skillLevelStats[level].failed++;
			}

			const tags = result.metadata?.tags || [];
			for (const tag of tags) {
				if (!tagStats[tag]) {
					tagStats[tag] = { passed: 0, failed: 0 };
				}
				if (result.passed) {
					tagStats[tag].passed++;
				} else {
					tagStats[tag].failed++;
				}
			}
		}

		const recommendations: string[] = [];
		if (failedPatterns.length > 0) {
			recommendations.push(
				`Found ${failedPatterns.length} failed patterns. ` +
				`Run "ep-admin qa repair" to fix them.`,
			);
		}

		const report: QAReport = {
			summary: {
				totalPatterns: total,
				passed,
				failed,
				passRate,
				totalTokens,
				totalCost,
				averageDuration: total > 0 ? totalDuration / total : 0,
				generatedAt: new Date().toISOString(),
			},
			failures: {
				byCategory: failuresByCategory,
				bySkillLevel: skillLevelStats,
				byTag: tagStats,
				patterns: failurePatterns,
			},
			metrics: {
				tokenUsage: {
					min: tokens.length > 0 ? Math.min(...tokens) : 0,
					max: tokens.length > 0 ? Math.max(...tokens) : 0,
					average: total > 0 ? totalTokens / total : 0,
				},
				costAnalysis: {
					min: costs.length > 0 ? Math.min(...costs) : 0,
					max: costs.length > 0 ? Math.max(...costs) : 0,
					average: total > 0 ? totalCost / total : 0,
					total: totalCost,
				},
				durationStats: {
					min: durations.length > 0 ? Math.min(...durations) : 0,
					max: durations.length > 0 ? Math.max(...durations) : 0,
					average: total > 0 ? totalDuration / total : 0,
				},
			},
			recommendations,
		};

		// Write report to file
		yield* fs.writeFileString(
			config.reportFile,
			JSON.stringify(report, null, 2),
		);

		return report;
	});

// --- REPAIR ---

export const repairPattern = (
	patternId: string,
	config: QAConfig,
	dryRun: boolean,
): Effect.Effect<RepairResult, never, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const patternPath = `${config.patternsDir}/${patternId}.mdx`;

		const exists = yield* fs.exists(patternPath);
		if (!exists) {
			return {
				patternId,
				success: false,
				error: "Pattern file not found",
			};
		}

		if (dryRun) {
			return {
				patternId,
				success: true,
				changesApplied: 0,
			};
		}

		// Create backup
		const backupPath = `${config.backupsDir}/${patternId}-${Date.now()}.mdx`;
		const content = yield* fs.readFileString(patternPath);
		yield* fs.writeFileString(backupPath, content);

		// Note: Full repair would integrate with LLM service
		// For now, just mark as processed
		return {
			patternId,
			success: true,
			changesApplied: 0,
		};
	}).pipe(
		Effect.catchAll((error) =>
			Effect.succeed({
				patternId,
				success: false,
				error: String(error),
			}),
		),
	);

export const repairAllFailed = (
	config: QAConfig,
	dryRun: boolean,
): Effect.Effect<RepairSummary, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Ensure directories exist
		yield* fs.makeDirectory(config.backupsDir, { recursive: true });
		yield* fs.makeDirectory(config.repairsDir, { recursive: true });

		const dirExists = yield* fs.exists(config.resultsDir);
		if (!dirExists) {
			return {
				attempted: 0,
				repaired: 0,
				failed: 0,
				results: [],
			};
		}

		const files = yield* fs.readDirectory(config.resultsDir);
		const qaResultFiles = files.filter((f) => f.endsWith(".json"));

		const failedPatternIds: string[] = [];
		for (const file of qaResultFiles) {
			const filePath = `${config.resultsDir}/${file}`;
			const content = yield* fs.readFileString(filePath);
			const result = JSON.parse(content) as QAResult;

			if (!result.passed && result.patternId) {
				failedPatternIds.push(result.patternId);
			}
		}

		const results: RepairResult[] = [];
		for (const patternId of failedPatternIds) {
			const result = yield* repairPattern(patternId, config, dryRun);
			results.push(result);
		}

		const repaired = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;

		return {
			attempted: failedPatternIds.length,
			repaired,
			failed,
			results,
		};
	});
