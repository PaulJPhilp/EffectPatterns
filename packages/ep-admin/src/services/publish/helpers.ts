/**
 * Publish Service Helpers
 *
 * Helper functions for the complete publishing pipeline
 */

import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type {
	LintIssue,
	LintResult,
	PatternInfo,
	PublishResult,
	TestResult,
	ValidationIssue,
	ValidationResult,
} from "./types.js";

const execAsync = promisify(exec);

// --- VALIDATION HELPERS ---

// Validation functions using Effect patterns
const validateFilePath = (filePath: string): Effect.Effect<string, Error> =>
	Effect.succeed(filePath).pipe(
		Effect.filterOrFail(
			(path) => path.length > 0 && !path.includes(".."),
			() => new Error(`Invalid file path: ${filePath}`)
		)
	);

const validateTimeout = (timeout: number): Effect.Effect<number, Error> =>
	Effect.succeed(timeout).pipe(
		Effect.filterOrFail(
			(t) => t >= 1000 && t <= 300000,
			() => new Error(`Timeout must be between 1s and 5 minutes (1000ms to 300000ms)`)
		)
	);

const validatePatternInfo = (pattern: PatternInfo): Effect.Effect<PatternInfo, Error> =>
	Effect.succeed(pattern).pipe(
		Effect.filterOrFail(
			(p): p is PatternInfo => Boolean(p.id && p.id.length > 0),
			() => new Error("Pattern ID cannot be empty")
		),
		Effect.filterOrFail(
			(p): p is PatternInfo => Boolean(p.title && p.title.length > 0),
			() => new Error("Pattern title cannot be empty")
		)
	);

/**
 * Check if file exists
 */
export const fileExists = (
	filePath: string,
): Effect.Effect<boolean, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const validatedPath = yield* validateFilePath(filePath);
		const fs = yield* FileSystem.FileSystem;
		return yield* fs.exists(validatedPath);
	});

/**
 * Read file content
 */
export const readFileContent = (
	filePath: string,
): Effect.Effect<string, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const validatedPath = yield* validateFilePath(filePath);
		const fs = yield* FileSystem.FileSystem;
		return yield* fs.readFileString(validatedPath);
	});

/**
 * Write file content
 */
export const writeFileContent = (
	filePath: string,
	content: string,
): Effect.Effect<void, Error, FileSystem.FileSystem | Path.Path> =>
	Effect.gen(function* () {
		const validatedPath = yield* validateFilePath(filePath);
		const fs = yield* FileSystem.FileSystem;
		const pathService = yield* Path.Path;

		// Ensure directory exists
		const dir = pathService.dirname(validatedPath);
		yield* fs.makeDirectory(dir, { recursive: true });

		yield* fs.writeFileString(validatedPath, content);
	});

/**
 * Get all MDX files in directory
 */
export const getMdxFiles = (
	directory: string,
): Effect.Effect<string[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const validatedDir = yield* validateFilePath(directory);
		const fs = yield* FileSystem.FileSystem;
		const files = yield* fs.readDirectory(validatedDir);
		return files.filter((file) => file.endsWith(".mdx"));
	});

/**
 * Get all TypeScript files in directory
 */
export const getTsFiles = (
	directory: string,
): Effect.Effect<string[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const validatedDir = yield* validateFilePath(directory);
		const fs = yield* FileSystem.FileSystem;
		const files = yield* fs.readDirectory(validatedDir);
		return files.filter((file) => file.endsWith(".ts"));
	});

// --- EXECUTION HELPERS ---

/**
 * Execute shell command with timeout
 */
export const executeCommand = (
	command: string,
	timeout: number = 30000,
): Effect.Effect<{ stdout: string; stderr: string }, Error | PlatformError> =>
	Effect.gen(function* () {
		const validatedTimeout = yield* validateTimeout(timeout);

		return yield* Effect.tryPromise({
			try: async () => {
				const execAsync = promisify(exec);
				return await execAsync(command, { timeout: validatedTimeout, maxBuffer: 1024 * 1024 });
			},
			catch: (error) => new Error(`Command execution failed: ${error}`)
		});
	});

/**
 * Run TypeScript compiler on file
 */
export const runTypeScriptCheck = (
	filePath: string,
): Effect.Effect<boolean, Error | PlatformError> =>
	Effect.gen(function* () {
		const validatedPath = yield* validateFilePath(filePath);

		try {
			const result = yield* executeCommand(`npx tsc --noEmit "${validatedPath}"`, 10000);
			return result.stderr.length === 0;
		} catch {
			return false;
		}
	});

/**
 * Run TypeScript file
 */
export const runTypeScriptFile = (
	filePath: string,
	timeout: number = 10000,
): Effect.Effect<{ success: boolean; output: string; error?: string }, Error | PlatformError> =>
	Effect.gen(function* () {
		const validatedPath = yield* validateFilePath(filePath);
		const validatedTimeout = yield* validateTimeout(timeout);

		try {
			const result = yield* executeCommand(`bun run "${validatedPath}"`, validatedTimeout);
			return {
				success: true,
				output: result.stdout,
			};
		} catch (error) {
			return {
				success: false,
				output: "",
				error: String(error),
			};
		}
	});

// --- VALIDATION HELPERS ---

/**
 * Count validation issues by type
 */
export const countValidationIssues = (
	results: ValidationResult[],
): { total: number; errors: number; warnings: number } => {
	const total = results.reduce((sum, result) => sum + result.issues.length, 0);
	const errors = results.reduce((sum, result) => sum + result.errors, 0);
	const warnings = results.reduce((sum, result) => sum + result.warnings, 0);

	return { total, errors, warnings };
}

/**
 * Group validation issues by category
 */
export const groupValidationIssuesByCategory = (
	results: ValidationResult[],
): Record<string, ValidationIssue[]> => {
	const grouped: Record<string, ValidationIssue[]> = {};

	for (const result of results) {
		for (const issue of result.issues) {
			if (!grouped[issue.category]) {
				grouped[issue.category] = [];
			}
			grouped[issue.category].push(issue);
		}
	}

	return grouped;
};

/**
 * Get failed validation results
 */
export const getFailedValidations = (results: ValidationResult[]): ValidationResult[] => {
	return results.filter((result) => !result.valid);
}

// --- TESTING HELPERS ---

/**
 * Calculate test statistics
 */
export const calculateTestStats = (results: TestResult[]) => {
	const passed = results.filter((r) => r.success).length;
	const failed = results.length - passed;
	const expectedErrors = results.filter((r) => r.expectedError).length;
	const durations = results.map((r) => r.duration);
	const totalDuration = durations.reduce((sum, d) => sum + d, 0);
	const avgDuration = results.length > 0 ? totalDuration / results.length : 0;
	const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
	const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

	return {
		total: results.length,
		passed,
		failed,
		expectedErrors,
		totalDuration,
		avgDuration,
		minDuration,
		maxDuration,
	};
};

/**
 * Get failed tests
 */
export const getFailedTests = (results: TestResult[]): TestResult[] => {
	return results.filter((result) => !result.success && !result.expectedError);
};

/**
 * Get slowest tests
 */
export const getSlowestTests = (results: TestResult[], count: number = 5): TestResult[] => {
	return results
		.sort((a, b) => b.duration - a.duration)
		.slice(0, count);
};

// --- PUBLISHING HELPERS ---

/**
 * Calculate publish statistics
 */
export const calculatePublishStats = (results: PublishResult[]) => {
	const published = results.filter((r) => r.success).length;
	const failed = results.length - published;
	const durations = results.map((r) => r.duration);
	const totalDuration = durations.reduce((sum, d) => sum + d, 0);
	const avgDuration = results.length > 0 ? totalDuration / results.length : 0;

	return {
		total: results.length,
		published,
		failed,
		totalDuration,
		avgDuration,
	};
};

/**
 * Get failed publishes
 */
export const getFailedPublishes = (results: PublishResult[]): PublishResult[] => {
	return results.filter((result) => !result.success);
};

// --- LINTING HELPERS ---

/**
 * Calculate lint statistics
 */
export const calculateLintStats = (results: LintResult[]) => {
	const passed = results.filter((r) => r.success).length;
	const failed = results.length - passed;
	const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
	const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
	const durations = results.map((r) => r.duration);
	const totalDuration = durations.reduce((sum, d) => sum + d, 0);

	return {
		total: results.length,
		passed,
		failed,
		totalIssues,
		totalErrors,
		totalWarnings,
		totalDuration,
	};
};

/**
 * Get files with lint issues
 */
export const getFilesWithIssues = (results: LintResult[]): LintResult[] => {
	return results.filter((result) => result.issues.length > 0);
};

/**
 * Group lint issues by rule
 */
export const groupLintIssuesByRule = (results: LintResult[]): Record<string, LintIssue[]> => {
	const grouped: Record<string, LintIssue[]> = {};

	for (const result of results) {
		for (const issue of result.issues) {
			if (!grouped[issue.rule]) {
				grouped[issue.rule] = [];
			}
			grouped[issue.rule].push(issue);
		}
	}

	return grouped;
};

// --- GENERATION HELPERS ---

/**
 * Extract pattern info from frontmatter
 */
export const extractPatternInfo = (
	filePath: string,
	frontmatter: Record<string, unknown>,
): PatternInfo => {
	if (filePath.length === 0 || filePath.includes("..")) {
		throw new Error(`Invalid file path: ${filePath}`);
	}

	const validatedPath = filePath;
	const pattern: PatternInfo = {
		id: String(frontmatter.id || validatedPath.replace(".mdx", "")),
		title: String(frontmatter.title || "Unknown"),
		skillLevel: String(frontmatter.skillLevel || "unknown"),
		useCase: (frontmatter.useCase as string | string[]) || "unknown",
		tags: (frontmatter.tags as string[]) || [],
		filePath: validatedPath,
	};

	if (!pattern.id || pattern.id.length === 0) {
		throw new Error("Pattern ID cannot be empty");
	}
	if (!pattern.title || pattern.title.length === 0) {
		throw new Error("Pattern title cannot be empty");
	}

	return pattern;
};

/**
 * Generate pattern link for README
 */
export const generatePatternLink = (pattern: PatternInfo): string => {
	const title = pattern.title.replace(/[^a-zA-Z0-9\s]/g, "").trim();
	const slug = title.toLowerCase().replace(/\s+/g, "-");
	return `- [${pattern.title}](./${pattern.id}.mdx) - ${pattern.skillLevel} - ${Array.isArray(pattern.useCase) ? pattern.useCase.join(", ") : pattern.useCase}`;
};

/**
 * Sort patterns by skill level and title
 */
export const sortPatterns = (patterns: PatternInfo[]): PatternInfo[] => {
	const skillOrder = { beginner: 1, intermediate: 2, advanced: 3 };

	return patterns.sort((a, b) => {
		const aLevel = skillOrder[a.skillLevel as keyof typeof skillOrder] || 999;
		const bLevel = skillOrder[b.skillLevel as keyof typeof skillOrder] || 999;

		if (aLevel !== bLevel) {
			return aLevel - bLevel;
		}

		return a.title.localeCompare(b.title);
	});
};

// --- UTILITY HELPERS ---

/**
 * Create a safe filename from a string
 */
export const createSafeFilename = (input: string): string => {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
};

/**
 * Format duration in human readable format
 */
export const formatDuration = (ms: number): string => {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
	return `${(ms / 3600000).toFixed(1)}h`;
};
