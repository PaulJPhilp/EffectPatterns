/**
 * Pattern Testing Service
 *
 * Tests TypeScript pattern files for:
 * - Type checking with tsc
 * - Runtime execution
 * - Expected error handling
 * - Performance tracking
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// --- TYPES ---

export interface TestResult {
	file: string;
	success: boolean;
	duration: number;
	error?: string;
	expectedError?: boolean;
}

export interface TesterConfig {
	srcDir: string;
	concurrency: number;
	enableTypeCheck: boolean;
	timeout: number;
	expectedErrors: Map<string, string[]>;
}

export interface TestSummary {
	total: number;
	passed: number;
	failed: number;
	expectedErrors: number;
	totalDuration: number;
	avgDuration: number;
	minDuration: number;
	maxDuration: number;
}

// --- DEFAULT CONFIG ---

export const defaultTesterConfig: TesterConfig = {
	srcDir: "content/new/src",
	concurrency: 10,
	enableTypeCheck: true,
	timeout: 30_000,
	expectedErrors: new Map([
		["write-tests-that-adapt-to-application-code", ["NotFoundError"]],
		["control-repetition-with-schedule", ["Transient error"]],
	]),
};

// --- TYPE CHECKING ---

export const runTypeCheck = (): Effect.Effect<boolean, never, never> =>
	Effect.promise(async () => {
		try {
			await execAsync("tsc --noEmit", {
				maxBuffer: 10 * 1024 * 1024,
			});
			return true;
		} catch {
			return false;
		}
	});

// --- RUNTIME TESTING ---

export const runTypeScriptFile = (
	filePath: string,
	config: TesterConfig,
): Effect.Effect<TestResult, never, never> =>
	Effect.promise(async () => {
		const fileName = filePath.split("/").pop()?.replace(".ts", "") || "unknown";
		const expectedErrors = config.expectedErrors.get(fileName) || [];
		const startTime = Date.now();

		try {
			await execAsync(`bun run ${filePath}`, {
				timeout: config.timeout,
				maxBuffer: 1024 * 1024,
			});

			return {
				file: fileName,
				success: true,
				duration: Date.now() - startTime,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = String(error);
			const isExpectedError = expectedErrors.some((expected) =>
				errorMessage.includes(expected),
			);

			if (isExpectedError) {
				return {
					file: fileName,
					success: true,
					duration,
					expectedError: true,
				};
			}

			return {
				file: fileName,
				success: false,
				duration,
				error: errorMessage,
			};
		}
	});

// --- PARALLEL TESTING ---

export const testAllPatterns = (
	config: TesterConfig,
): Effect.Effect<TestResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Get all TypeScript files
		const files = yield* fs.readDirectory(config.srcDir);
		const tsFiles = files.filter((f) => f.endsWith(".ts"));

		// Build file paths
		const filePaths = tsFiles.map((f) => `${config.srcDir}/${f}`);

		// Run tests in parallel with concurrency limit
		const results = yield* Effect.all(
			filePaths.map((fp) => runTypeScriptFile(fp, config)),
			{ concurrency: config.concurrency },
		);

		return results;
	});

// --- FULL TEST SUITE ---

export const runFullTestSuite = (
	config: TesterConfig,
): Effect.Effect<
	{ typeCheckPassed: boolean; testResults: TestResult[] },
	Error,
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		// Step 1: Type check if enabled
		let typeCheckPassed = true;
		if (config.enableTypeCheck) {
			typeCheckPassed = yield* runTypeCheck();
			if (!typeCheckPassed) {
				// Return early if type check fails
				return {
					typeCheckPassed: false,
					testResults: [],
				};
			}
		}

		// Step 2: Run runtime tests
		const testResults = yield* testAllPatterns(config);

		return {
			typeCheckPassed,
			testResults,
		};
	});

// --- SUMMARY HELPERS ---

export const summarizeResults = (results: TestResult[]): TestSummary => {
	const passed = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;
	const expectedErrors = results.filter((r) => r.expectedError).length;

	const durations = results.map((r) => r.duration);
	const totalDuration = durations.reduce((sum, d) => sum + d, 0);
	const avgDuration = Math.round(totalDuration / results.length);
	const minDuration = Math.min(...durations);
	const maxDuration = Math.max(...durations);

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

export const getFailedTests = (results: TestResult[]): TestResult[] =>
	results.filter((r) => !r.success);

export const getSlowestTests = (
	results: TestResult[],
	count: number = 5,
): TestResult[] =>
	[...results].sort((a, b) => b.duration - a.duration).slice(0, count);
