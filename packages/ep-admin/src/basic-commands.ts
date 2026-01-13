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

// Configuration types for better type safety
interface ValidatorConfig {
	readonly publishedDir: string;
	readonly srcDir: string;
	readonly concurrency: number;
}

interface TesterConfig {
	readonly srcDir: string;
	readonly concurrency: number;
	readonly enableTypeCheck: boolean;
	readonly timeout: number;
	readonly expectedErrors: Map<string, string[]>;
}

interface GeneratorConfig {
	readonly readmePath: string;
}

interface PipelineConfig {
	readonly validator: ValidatorConfig;
	readonly tester: TesterConfig;
	readonly publisher: {
		readonly processedDir: string;
		readonly publishedDir: string;
		readonly srcDir: string;
	};
	readonly generator: GeneratorConfig;
	readonly linter: {
		readonly srcDirs: string[];
		readonly concurrency: number;
	};
}

// Validation functions using Effect patterns
const validateConcurrency = (value: number): Effect.Effect<number, Error> =>
	Effect.succeed(value).pipe(
		Effect.filterOrFail(
			(n) => n >= 1 && n <= 20,
			() => new Error("Concurrency must be between 1 and 20")
		)
	);

const validateTimeout = (value: number): Effect.Effect<number, Error> =>
	Effect.succeed(value).pipe(
		Effect.filterOrFail(
			(n) => n >= 1000 && n <= 300000,
			() => new Error("Timeout must be between 1s and 5 minutes")
		)
	);

const validateDirectory = (path: string): Effect.Effect<string, Error> =>
	Effect.succeed(path).pipe(
		Effect.filterOrFail(
			(dir) => dir.length > 0,
			() => new Error("Directory path cannot be empty")
		)
	);

// Configuration builders with validation
const getValidatorConfig = (concurrency: number = 10): Effect.Effect<ValidatorConfig, Error> =>
	Effect.gen(function* () {
		const PROJECT_ROOT = process.cwd();
		const validatedConcurrency = yield* validateConcurrency(concurrency);
		const validatedPublishedDir = yield* validateDirectory(`${PROJECT_ROOT}/${CONTENT_DIRS.NEW_PROCESSED}`);
		const validatedSrcDir = yield* validateDirectory(`${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`);

		return {
			publishedDir: validatedPublishedDir,
			srcDir: validatedSrcDir,
			concurrency: validatedConcurrency,
		};
	});

const getTesterConfig = (concurrency: number = 10, timeout: number = 30_000): Effect.Effect<TesterConfig, Error> =>
	Effect.gen(function* () {
		const PROJECT_ROOT = process.cwd();
		const validatedConcurrency = yield* validateConcurrency(concurrency);
		const validatedTimeout = yield* validateTimeout(timeout);
		const validatedSrcDir = yield* validateDirectory(`${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`);

		return {
			srcDir: validatedSrcDir,
			concurrency: validatedConcurrency,
			enableTypeCheck: true,
			timeout: validatedTimeout,
			expectedErrors: new Map(),
		};
	});

const getGeneratorConfig = (): Effect.Effect<GeneratorConfig, Error> =>
	Effect.gen(function* () {
		const PROJECT_ROOT = process.cwd();
		const validatedReadmePath = yield* validateDirectory(`${PROJECT_ROOT}/README.md`);

		return {
			readmePath: validatedReadmePath,
		};
	});

const getPipelineConfig = (
	concurrency: number = 10,
	timeout: number = 30_000
): Effect.Effect<PipelineConfig, Error> =>
	Effect.gen(function* () {
		const [validationConfig, testingConfig, generationConfig] = yield* Effect.all([
			getValidatorConfig(concurrency),
			getTesterConfig(concurrency, timeout),
			getGeneratorConfig()
		]);

		const PROJECT_ROOT = process.cwd();
		const validatedProcessedDir = yield* validateDirectory(`${PROJECT_ROOT}/${CONTENT_DIRS.NEW_PROCESSED}`);
		const validatedPublishedDir = yield* validateDirectory(`${PROJECT_ROOT}/${CONTENT_DIRS.PUBLISHED}`);
		const validatedSrcDir = yield* validateDirectory(`${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`);

		return {
			validator: validationConfig,
			tester: testingConfig,
			publisher: {
				processedDir: validatedProcessedDir,
				publishedDir: validatedPublishedDir,
				srcDir: validatedSrcDir,
			},
			generator: generationConfig,
			linter: {
				srcDirs: [validatedSrcDir],
				concurrency: validationConfig.concurrency,
			},
		};
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
		concurrency: Options.optional(
			Options.integer("concurrency").pipe(
				Options.withDescription("Number of patterns to validate concurrently"),
				Options.withDefault(10)
			)
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

				// Validate and build configuration
				const concurrency = options.concurrency._tag === "Some" ? options.concurrency.value : 10;
				const config = yield* getValidatorConfig(concurrency);

				// Show configuration if verbose
				if (options.verbose) {
					yield* Display.showInfo(
						`Configuration:\n  Source: ${config.srcDir}\n  Published: ${config.publishedDir}\n  Concurrency: ${config.concurrency}`
					);
				}

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
		concurrency: Options.optional(
			Options.integer("concurrency").pipe(
				Options.withDescription("Number of tests to run concurrently"),
				Options.withDefault(10)
			)
		),
		timeout: Options.optional(
			Options.integer("timeout").pipe(
				Options.withDescription("Test timeout in milliseconds"),
				Options.withDefault(30_000)
			)
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

			// Validate and build configuration
			const concurrency = options.concurrency._tag === "Some" ? options.concurrency.value : 10;
			const timeout = options.timeout._tag === "Some" ? options.timeout.value : 30_000;
			const config = yield* getTesterConfig(concurrency, timeout);

			// Show configuration if verbose
			if (options.verbose) {
				yield* Display.showInfo(
					`Configuration:\n  Source: ${config.srcDir}\n  Concurrency: ${config.concurrency}\n  Timeout: ${config.timeout}ms`
				);
			}

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
		concurrency: Options.optional(
			Options.integer("concurrency").pipe(
				Options.withDescription("Number of operations to run concurrently"),
				Options.withDefault(10)
			)
		),
		timeout: Options.optional(
			Options.integer("timeout").pipe(
				Options.withDescription("Test timeout in milliseconds"),
				Options.withDefault(30_000)
			)
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

				// Validate and build configuration
				const concurrency = options.concurrency._tag === "Some" ? options.concurrency.value : 10;
				const timeout = options.timeout._tag === "Some" ? options.timeout.value : 30_000;
				const config = yield* getPipelineConfig(concurrency, timeout);

				// Show configuration if verbose
				if (options.verbose) {
					yield* Display.showInfo(
						`Configuration:\n  Concurrency: ${config.validator.concurrency}\n  Timeout: ${config.tester.timeout}ms\n  Source: ${config.validator.srcDir}`
					);
				}

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
		output: Options.optional(
			Options.text("output").pipe(
				Options.withDescription("Output file path for README"),
				Options.withDefault("README.md")
			)
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

			// Validate and build configuration
			const outputPath = options.output._tag === "Some" ? options.output.value : "README.md";
			const config = yield* Effect.gen(function* () {
				const PROJECT_ROOT = process.cwd();
				const validatedPath = yield* validateDirectory(`${PROJECT_ROOT}/${outputPath}`);
				return { readmePath: validatedPath };
			});

			// Show configuration if verbose
			if (options.verbose) {
				yield* Display.showInfo(
					`Configuration:\n  Output: ${config.readmePath}`
				);
			}

			yield* generateReadme(config);

			yield* Display.showSuccess(`${config.readmePath} generated!`);
		})
	)
);
