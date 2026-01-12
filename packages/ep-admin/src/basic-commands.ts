/**
 * Basic administrative commands
 * 
 * validate, test, pipeline, generate
 *
 * NOTE: These are convenience aliases that delegate to publish commands.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { CONTENT_DIRS, MESSAGES } from "./constants.js";
import { Display } from "./services/display/index.js";
import {
	generateReadme,
	runFullPipeline,
	summarizeTestResults,
	summarizeValidationResults,
	testAllPatterns,
	validateAllPatterns
} from "./services/publish/index.js";

const PROJECT_ROOT = process.cwd();

const getValidatorConfig = (): any => ({
	publishedDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_PROCESSED}`,
	srcDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`,
	concurrency: 10,
});

const getTesterConfig = (): any => ({
	srcDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`,
	concurrency: 10,
	enableTypeCheck: true,
	timeout: 30_000,
	expectedErrors: new Map(),
});

const getGeneratorConfig = (): any => ({
	readmePath: `${PROJECT_ROOT}/README.md`,
});

const getPipelineConfig = (): any => ({
	validation: getValidatorConfig(),
	testing: getTesterConfig(),
	publishing: {
		processedDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_PROCESSED}`,
		publishedDir: `${PROJECT_ROOT}/${CONTENT_DIRS.PUBLISHED}`,
		srcDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`,
	},
	generation: getGeneratorConfig(),
	linting: {
		srcDirs: [`${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`],
		concurrency: 10,
	},
});

/**
 * admin:validate - Validates all pattern files
 */
export const validateCommand = Command.make("validate", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed validation output"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Validates all pattern files for correctness and consistency."
	),
	Command.withHandler(
		({ options }) =>
			Effect.gen(function* () {
				yield* Display.showInfo("Validating patterns...");

				const config = getValidatorConfig();
				const results = yield* validateAllPatterns(config);
				const summary = summarizeValidationResults(results);

				yield* Display.showInfo(
					`Validated ${summary.total} patterns: ${summary.valid} valid, ${summary.invalid} invalid`
				);

				if (summary.totalErrors > 0) {
					yield* Display.showError(
						`Found ${summary.totalErrors} errors and ${summary.totalWarnings} warnings`
					);
					return yield* Effect.fail(new Error("Validation failed"));
				}

				yield* Display.showSuccess(MESSAGES.SUCCESS.ALL_PATTERNS_VALID);
			})
	)
);

/**
 * admin:test - Runs all TypeScript example tests
 */
export const testCommand = Command.make("test", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed test output"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Runs all TypeScript example tests to ensure patterns execute correctly."
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* Display.showInfo("Running pattern tests...");

			const config = getTesterConfig();
			const results = yield* testAllPatterns(config);
			const summary = summarizeTestResults(results);

			yield* Display.showInfo(
				`Tested ${summary.total} patterns: ${summary.passed} passed, ${summary.failed} failed`
			);

			if (summary.failed > 0) {
				yield* Display.showError(`${summary.failed} tests failed`);
				return yield* Effect.fail(new Error("Tests failed"));
			}

			yield* Display.showSuccess("All tests passed!");
		})
	)
);

/**
 * admin:pipeline - Runs the full ingestion and publishing pipeline
 */
export const pipelineCommand = Command.make("pipeline", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed output from each step"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Runs the complete pattern publishing pipeline from test to " +
		"rules generation."
	),
	Command.withHandler(
		({ options }) =>
			Effect.gen(function* () {
				yield* Display.showInfo("Running full publishing pipeline...");

				const config = getPipelineConfig();
				const result = yield* runFullPipeline(config);

				yield* Display.showInfo(`\nPipeline Results:`);
				yield* Display.showInfo(`  Validated: ${result.validation.summary.valid}/${result.validation.summary.total}`);
				yield* Display.showInfo(`  Tests Passed: ${result.testing.summary.passed}/${result.testing.summary.total}`);
				yield* Display.showInfo(`  Published: ${result.publishing.summary.published}`);

				yield* Display.showSuccess(MESSAGES.SUCCESS.PIPELINE_COMPLETED);
			})
	)
);

/**
 * admin:generate - Generates the main project README.md file
 */
export const generateCommand = Command.make("generate", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed generation output"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Generates the main project README.md file from pattern metadata."
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* Display.showInfo("Generating README.md...");

			const config = getGeneratorConfig();
			yield* generateReadme(config);

			yield* Display.showSuccess("README.md generated!");
		})
	)
);
