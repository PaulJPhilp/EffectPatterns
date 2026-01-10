/**
 * Publishing Pipeline Service
 *
 * Orchestrates the complete publishing workflow:
 * 1. Validate patterns
 * 2. Test TypeScript examples
 * 3. Publish MDX files
 * 4. Generate README
 * 5. Lint Effect patterns
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import {
	type GeneratorConfig,
	generateReadmeWithStats,
} from "./generator.js";
import {
	type LintResult,
	type LinterConfig,
	lintAllFiles,
	summarizeLintResults,
} from "./linter.js";
import {
	type PublishResult,
	type PublisherConfig,
	publishAllPatterns,
	summarizePublishResults,
} from "./publisher.js";
import {
	type TestResult,
	type TesterConfig,
	runFullTestSuite,
	summarizeResults as summarizeTestResults,
} from "./tester.js";
import {
	type ValidationResult,
	type ValidatorConfig,
	summarizeResults as summarizeValidationResults,
	validateAllPatterns,
} from "./validator.js";

// --- TYPES ---

export interface PipelineConfig {
	validator: ValidatorConfig;
	tester: TesterConfig;
	publisher: PublisherConfig;
	generator: GeneratorConfig;
	linter: LinterConfig;
}

export interface PipelineResult {
	validation: {
		results: ValidationResult[];
		summary: ReturnType<typeof summarizeValidationResults>;
	};
	testing: {
		typeCheckPassed: boolean;
		results: TestResult[];
		summary: ReturnType<typeof summarizeTestResults>;
	};
	publishing: {
		results: PublishResult[];
		summary: ReturnType<typeof summarizePublishResults>;
	};
	generation: {
		applicationPatterns: number;
		effectPatterns: number;
	};
	linting: {
		results: LintResult[];
		summary: ReturnType<typeof summarizeLintResults>;
	};
	success: boolean;
	duration: number;
}

// --- PIPELINE STEPS ---

export const runValidationStep = (
	config: ValidatorConfig,
): Effect.Effect<ValidationResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const results = yield* validateAllPatterns(config);
		return results;
	});

export const runTestingStep = (
	config: TesterConfig,
): Effect.Effect<
	{ typeCheckPassed: boolean; testResults: TestResult[] },
	Error,
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		const result = yield* runFullTestSuite(config);
		return result;
	});

export const runPublishingStep = (
	config: PublisherConfig,
): Effect.Effect<PublishResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const results = yield* publishAllPatterns(config);
		return results;
	});

export const runGenerationStep = (
	config: GeneratorConfig,
): Effect.Effect<
	{ applicationPatterns: number; effectPatterns: number },
	Error,
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		const stats = yield* generateReadmeWithStats(config);
		return stats;
	});

export const runLintingStep = (
	config: LinterConfig,
): Effect.Effect<LintResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const results = yield* lintAllFiles(config);
		return results;
	});

// --- FULL PIPELINE ---

export const runFullPipeline = (
	config: PipelineConfig,
): Effect.Effect<PipelineResult, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const startTime = Date.now();

		// Step 1: Validate
		const validationResults = yield* runValidationStep(config.validator);
		const validationSummary = summarizeValidationResults(validationResults);

		if (validationSummary.invalid > 0) {
			return yield* Effect.fail(
				new Error(
					`Validation failed: ${validationSummary.totalErrors} errors, ${validationSummary.totalWarnings} warnings`,
				),
			);
		}

		// Step 2: Test
		const testingResult = yield* runTestingStep(config.tester);
		const testingSummary = summarizeTestResults(testingResult.testResults);

		if (!testingResult.typeCheckPassed || testingSummary.failed > 0) {
			return yield* Effect.fail(
				new Error(
					`Testing failed: Type check ${testingResult.typeCheckPassed ? "passed" : "failed"}, ${testingSummary.failed} test failures`,
				),
			);
		}

		// Step 3: Publish
		const publishResults = yield* runPublishingStep(config.publisher);
		const publishSummary = summarizePublishResults(publishResults);

		if (publishSummary.failed > 0) {
			return yield* Effect.fail(
				new Error(`Publishing failed: ${publishSummary.failed} files failed`),
			);
		}

		// Step 4: Generate README
		const generationStats = yield* runGenerationStep(config.generator);

		// Step 5: Lint (optional, doesn't fail pipeline)
		const lintResults = yield* runLintingStep(config.linter);
		const lintSummary = summarizeLintResults(lintResults);

		const duration = Date.now() - startTime;

		return {
			validation: {
				results: validationResults,
				summary: validationSummary,
			},
			testing: {
				typeCheckPassed: testingResult.typeCheckPassed,
				results: testingResult.testResults,
				summary: testingSummary,
			},
			publishing: {
				results: publishResults,
				summary: publishSummary,
			},
			generation: generationStats,
			linting: {
				results: lintResults,
				summary: lintSummary,
			},
			success: true,
			duration,
		};
	});

// --- PARTIAL PIPELINE RUNS ---

export const runValidateAndTest = (
	config: Pick<PipelineConfig, "validator" | "tester">,
): Effect.Effect<
	{
		validation: ValidationResult[];
		testing: { typeCheckPassed: boolean; testResults: TestResult[] };
	},
	Error,
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		const validation = yield* runValidationStep(config.validator);
		const testing = yield* runTestingStep(config.tester);

		return { validation, testing };
	});

export const runPublishAndGenerate = (
	config: Pick<PipelineConfig, "publisher" | "generator">,
): Effect.Effect<
	{
		publishing: PublishResult[];
		generation: { applicationPatterns: number; effectPatterns: number };
	},
	Error,
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		const publishing = yield* runPublishingStep(config.publisher);
		const generation = yield* runGenerationStep(config.generator);

		return { publishing, generation };
	});
