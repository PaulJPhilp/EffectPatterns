/**
 * QA Service Helpers
 *
 * Helper functions for QA operations
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import type { QAConfig, QAResult } from "./types.js";

// --- CONSTANTS ---

export const ERROR_CATEGORIES = {
	IMPORTS: "imports",
	TYPESCRIPT: "typescript",
	DEPRECATED: "deprecated",
	EXAMPLES: "examples",
	DOCUMENTATION: "documentation",
	METADATA: "metadata",
	PATTERNS: "patterns",
	OTHER: "other",
} as const;

export const QA_FILE_SUFFIX = "-qa.json" as const;

// --- ERROR CATEGORIZATION ---

/**
 * Categorize QA errors by type
 */
export const categorizeError = (error: string): string => {
	const errorLower = error.toLowerCase();

	if (errorLower.includes("import") || errorLower.includes("export")) {
		return ERROR_CATEGORIES.IMPORTS;
	}
	if (errorLower.includes("type") || errorLower.includes("typescript")) {
		return ERROR_CATEGORIES.TYPESCRIPT;
	}
	if (errorLower.includes("deprecated") || errorLower.includes("outdated")) {
		return ERROR_CATEGORIES.DEPRECATED;
	}
	if (errorLower.includes("example") || errorLower.includes("demo")) {
		return ERROR_CATEGORIES.EXAMPLES;
	}
	if (
		errorLower.includes("documentation") ||
		errorLower.includes("clarity")
	) {
		return ERROR_CATEGORIES.DOCUMENTATION;
	}
	if (errorLower.includes("metadata") || errorLower.includes("frontmatter")) {
		return ERROR_CATEGORIES.METADATA;
	}
	if (errorLower.includes("pattern") || errorLower.includes("best practice")) {
		return ERROR_CATEGORIES.PATTERNS;
	}

	return ERROR_CATEGORIES.OTHER;
};

// --- FILE OPERATIONS ---

/**
 * Load QA results from directory
 */
export const loadQAResults = (
	config: QAConfig,
): Effect.Effect<QAResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const dirExists = yield* fs.exists(config.resultsDir);
		if (!dirExists) {
			return [];
		}

		const files = yield* fs.readDirectory(config.resultsDir);
		const qaFiles = files.filter((f) => f.endsWith(QA_FILE_SUFFIX));

		const results: QAResult[] = [];
		for (const file of qaFiles) {
			const filePath = `${config.resultsDir}/${file}`;
			const content = yield* fs.readFileString(filePath);
			results.push(JSON.parse(content) as QAResult);
		}

		return results;
	});

/**
 * Filter failed patterns from QA results
 */
export const filterFailedPatterns = (results: QAResult[]): QAResult[] => {
	return results.filter((result) => !result.passed);
};

/**
 * Extract pattern IDs from failed results
 */
export const extractFailedPatternIds = (results: QAResult[]): string[] => {
	return results
		.filter((result) => !result.passed && result.patternId)
		.map((result) => result.patternId!);
};

/**
 * Check if pattern file exists
 */
export const patternExists = (
	patternId: string,
	config: QAConfig,
): Effect.Effect<boolean, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const patternPath = `${config.patternsDir}/${patternId}.mdx`;
		return yield* fs.exists(patternPath);
	});

/**
 * Create backup of pattern file
 */
export const createPatternBackup = (
	patternId: string,
	config: QAConfig,
): Effect.Effect<string, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const patternPath = `${config.patternsDir}/${patternId}.mdx`;
		const backupPath = `${config.backupsDir}/${patternId}-${Date.now()}.mdx`;

		const content = yield* fs.readFileString(patternPath);
		yield* fs.makeDirectory(config.backupsDir, { recursive: true });
		yield* fs.writeFileString(backupPath, content);

		return backupPath;
	});

// --- STATISTICS ---

/**
 * Calculate pass rate from results
 */
export const calculatePassRate = (results: QAResult[]): number => {
	if (results.length === 0) return 0;
	const passed = results.filter((r) => r.passed).length;
	return (passed / results.length) * 100;
};

/**
 * Group results by skill level
 */
export const groupBySkillLevel = (
	results: QAResult[],
): Record<string, { passed: number; failed: number }> => {
	const grouped: Record<string, { passed: number; failed: number }> = {};

	for (const result of results) {
		const level = result.metadata?.skillLevel || "unknown";
		if (!grouped[level]) {
			grouped[level] = { passed: 0, failed: 0 };
		}

		if (result.passed) {
			grouped[level].passed++;
		} else {
			grouped[level].failed++;
		}
	}

	return grouped;
};

/**
 * Group results by tags
 */
export const groupByTags = (
	results: QAResult[],
): Record<string, { passed: number; failed: number }> => {
	const grouped: Record<string, { passed: number; failed: number }> = {};

	for (const result of results) {
		const tags = result.metadata?.tags || [];
		for (const tag of tags) {
			if (!grouped[tag]) {
				grouped[tag] = { passed: 0, failed: 0 };
			}

			if (result.passed) {
				grouped[tag].passed++;
			} else {
				grouped[tag].failed++;
			}
		}
	}

	return grouped;
};

/**
 * Count failures by category
 */
export const countFailuresByCategory = (
	results: QAResult[],
): Record<string, number> => {
	const counts: Record<string, number> = {};

	for (const result of results) {
		if (!result.passed && result.errors) {
			for (const error of result.errors) {
				const category = categorizeError(error);
				counts[category] = (counts[category] || 0) + 1;
			}
		}
	}

	return counts;
};

// --- RECOMMENDATIONS ---

/**
 * Generate repair recommendations based on results
 */
export const generateRecommendations = (results: QAResult[]): string[] => {
	const recommendations: string[] = [];
	const failedPatterns = filterFailedPatterns(results);

	if (failedPatterns.length > 0) {
		recommendations.push(
			`Found ${failedPatterns.length} failed patterns. Run "ep-admin qa repair" to fix them.`,
		);

		const failuresByCategory = countFailuresByCategory(results);
		const topCategory = Object.entries(failuresByCategory).sort(
			(a, b) => b[1] - a[1],
		)[0];

		if (topCategory) {
			recommendations.push(
				`Most common issue category: ${topCategory[0]} (${topCategory[1]} patterns)`,
			);
		}
	}

	const passRate = calculatePassRate(results);
	if (passRate < 80) {
		recommendations.push(
			`Overall pass rate is ${passRate.toFixed(1)}%. Consider reviewing patterns with common issues.`,
		);
	}

	return recommendations;
};
