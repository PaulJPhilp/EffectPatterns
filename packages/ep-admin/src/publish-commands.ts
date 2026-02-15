/**
 * Publish-related commands for ep-admin
 *
 * Orchestrates the pattern publishing pipeline:
 * - validate: Check pattern structure and content
 * - test: Run TypeScript examples
 * - publish: Move patterns to published directory
 * - generate: Create README and rules documentation
 * - pipeline: Full workflow (validate → test → publish → generate)
 *
 * NOTE: Commands now use native Effect services instead of script execution.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { emitJson } from "./cli/output.js";
import {
    CONTENT_DIRS,
    MESSAGES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import {
    generateReadme,
    lintAllFiles,
    publishAllPatterns,
    runFullPipeline,
    summarizeLintResults,
    summarizePublishResults,
    summarizeTestResults,
    summarizeValidationResults,
    testAllPatterns,
    validateAllPatterns
} from "./services/publish/index.js";

const PROJECT_ROOT = process.cwd();

// --- DEFAULT CONFIGS ---

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
    expectedErrors: new Map([
        ["write-tests-that-adapt-to-application-code", ["NotFoundError"]],
        ["control-repetition-with-schedule", ["Transient error"]],
    ]),
});

const getPublisherConfig = (): any => ({
    processedDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_PROCESSED}`,
    publishedDir: `${PROJECT_ROOT}/${CONTENT_DIRS.PUBLISHED}`,
    srcDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`,
});

const getGeneratorConfig = (): any => ({
    readmePath: `${PROJECT_ROOT}/README.md`,
});

const getLinterConfig = (): any => ({
    srcDirs: [
        `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_SRC}`,
        `${PROJECT_ROOT}/content/src`,
    ],
    concurrency: 10,
});

const getPipelineConfig = (): any => ({
    validation: getValidatorConfig(),
    testing: getTesterConfig(),
    publishing: getPublisherConfig(),
    generation: getGeneratorConfig(),
    linting: getLinterConfig(),
});

/**
 * publish:validate - Validate patterns before publishing
 */
export const publishValidateCommand = Command.make("validate", {
    options: {
        ...globalOptions,
        pattern: Options.optional(
            Options.text("pattern").pipe(
                Options.withDescription("Validate specific pattern only")
            )
        ),
    },
}).pipe(
    Command.withDescription(
        "Validate all patterns for correctness and consistency before publishing."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getValidatorConfig();
            const results = yield* validateAllPatterns(config);
            const summary = summarizeValidationResults(results);

            if (options.json) {
                yield* emitJson({
                    ok: summary.totalErrors === 0,
                    summary,
                    results,
                });
                if (summary.totalErrors > 0) {
                    return yield* Effect.fail(new Error("Validation failed"));
                }
                return;
            }

            yield* Display.showInfo("Validating patterns...");

            yield* Display.showInfo(
                `Validated ${summary.total} patterns: ` +
                `${summary.valid} valid, ${summary.invalid} invalid`
            );

            if (summary.totalErrors > 0) {
                yield* Display.showError(
                    `Found ${summary.totalErrors} errors and ` +
                    `${summary.totalWarnings} warnings`
                );
                return yield* Effect.fail(new Error("Validation failed"));
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERNS_VALIDATED);
            yield* Display.showInfo("Next: ep-admin publish test");
        })
    )
);

/**
 * publish:test - Run TypeScript examples in patterns
 */
export const publishTestCommand = Command.make("test", {
    options: {
        ...globalOptions,
        pattern: Options.optional(
            Options.text("pattern").pipe(
                Options.withDescription("Test specific pattern only")
            )
        ),
    },
}).pipe(
    Command.withDescription(
        "Run all TypeScript examples to ensure patterns execute correctly."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getTesterConfig();
            const results = yield* testAllPatterns(config);
            const summary = summarizeTestResults(results);

            if (options.json) {
                yield* emitJson({
                    ok: summary.failed === 0,
                    summary,
                    results,
                });
                if (summary.failed > 0) {
                    return yield* Effect.fail(new Error("Tests failed"));
                }
                return;
            }

            yield* Display.showInfo("Running TypeScript examples...");

            yield* Display.showInfo(
                `Tested ${summary.total} files: ` +
                `${summary.passed} passed, ${summary.failed} failed`
            );

            if (summary.failed > 0) {
                yield* Display.showError(`${summary.failed} tests failed`);
                return yield* Effect.fail(new Error("Tests failed"));
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.ALL_EXAMPLES_PASSED);
            yield* Display.showInfo("Next: ep-admin publish run");
        })
    )
);

/**
 * publish:run - Publish patterns to content/published
 */
export const publishRunCommand = Command.make("run", {
    options: {
        ...globalOptions,
        pattern: Options.optional(
            Options.text("pattern").pipe(
                Options.withDescription("Publish specific pattern only")
            )
        ),
        force: Options.boolean("force").pipe(
            Options.withAlias("f"),
            Options.withDescription("Overwrite existing published patterns"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Publish validated patterns to content/published directory."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getPublisherConfig();
            const results = yield* publishAllPatterns(config);
            const summary = summarizePublishResults(results);

            if (options.json) {
                yield* emitJson({
                    ok: summary.failed === 0,
                    summary,
                    results,
                });
                if (summary.failed > 0) {
                    return yield* Effect.fail(new Error("Publishing failed"));
                }
                return;
            }

            yield* Display.showInfo("Publishing patterns...");

            yield* Display.showInfo(
                `Published ${summary.published}/${summary.total} patterns`
            );

            if (summary.failed > 0) {
                yield* Display.showError(
                    `${summary.failed} patterns failed to publish`
                );
                return yield* Effect.fail(new Error("Publishing failed"));
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERNS_PUBLISHED);
            yield* Display.showInfo("Next: ep-admin publish generate --readme");
        })
    )
);

/**
 * publish:generate - Generate README and rules documentation
 */
export const publishGenerateCommand = Command.make("generate", {
    options: {
        ...globalOptions,
        readme: Options.boolean("readme").pipe(
            Options.withDescription("Generate README only"),
            Options.withDefault(false)
        ),
        rules: Options.boolean("rules").pipe(
            Options.withDescription("Generate rules only"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Generate documentation files (README, rules, etc.) from published patterns."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            const shouldGenerateReadme =
                options.readme || (!options.readme && !options.rules);
            const shouldGenerateRules =
                options.rules || (!options.readme && !options.rules);

            if (options.json) {
                yield* emitJson({
                    ok: true,
                    generated: {
                        readme: shouldGenerateReadme,
                        rules: shouldGenerateRules,
                    },
                    note: "Rules generation is now handled via database.",
                });
                return;
            }

            if (shouldGenerateReadme) {
                yield* Display.showInfo("Generating README.md...");
                const config = getGeneratorConfig();
                yield* generateReadme(config);
                yield* Display.showSuccess("README.md generated!");
            }

            if (shouldGenerateRules) {
                yield* Display.showInfo(
                    "Rules generation is now handled via database. " +
                    "Use 'ep-admin rules generate' instead."
                );
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.DOCUMENTATION_GENERATED);
            yield* Display.showInfo("Next: ep-admin release preview");
        })
    )
);

/**
 * publish:lint - Lint patterns for Effect-TS best practices
 */
export const publishLintCommand = Command.make("lint", {
    options: {
        ...globalOptions,
        fix: Options.boolean("fix").pipe(
            Options.withDescription("Automatically fix linting issues"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Lint patterns for Effect-TS idioms and best practices."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getLinterConfig();
            const results = yield* lintAllFiles(config);
            const summary = summarizeLintResults(results);

            if (options.json) {
                yield* emitJson({
                    ok: summary.totalErrors === 0,
                    summary,
                    results,
                });
                if (summary.totalErrors > 0) {
                    return yield* Effect.fail(new Error("Linting failed"));
                }
                return;
            }

            yield* Display.showInfo("Linting patterns...");

            yield* Display.showInfo(
                `Linted ${summary.totalFiles} files: ` +
                `${summary.totalErrors} errors, ` +
                `${summary.totalWarnings} warnings, ` +
                `${summary.totalInfo} suggestions`
            );

            if (summary.totalErrors > 0) {
                yield* Display.showError(
                    `Found ${summary.totalErrors} linting errors`
                );
                return yield* Effect.fail(new Error("Linting failed"));
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.LINTING_COMPLETE);
            yield* Display.showInfo("Next: ep-admin publish pipeline");
        })
    )
);

/**
 * publish:pipeline - Run full publishing pipeline
 */
export const publishPipelineCommand = Command.make("pipeline", {
    options: {
        ...globalOptions,
        skipValidation: Options.boolean("skip-validation").pipe(
            Options.withDescription("Skip validation step"),
            Options.withDefault(false)
        ),
        skipTests: Options.boolean("skip-tests").pipe(
            Options.withDescription("Skip test execution"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Run the complete pattern publishing pipeline (validate → test → publish → generate)."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getPipelineConfig();
            const result = yield* runFullPipeline(config);

            if (options.json) {
                yield* emitJson({
                    ok: true,
                    result,
                });
                return;
            }

            yield* Display.showInfo(MESSAGES.INFO.STARTING_PIPELINE);

            // Show results
            yield* Display.showInfo(
                `Validation: ${result.validation.summary.valid}/` +
                `${result.validation.summary.total} valid`
            );
            yield* Display.showInfo(
                `Testing: ${result.testing.summary.passed}/` +
                `${result.testing.summary.total} passed`
            );
            yield* Display.showInfo(
                `Publishing: ${result.publishing.summary.published}/` +
                `${result.publishing.summary.total} published`
            );
            yield* Display.showInfo(
                `Generation: ${result.generation.applicationPatterns} APs, ` +
                `${result.generation.effectPatterns} EPs`
            );
            yield* Display.showInfo(
                `Linting: ${result.linting.summary.totalErrors} errors, ` +
                `${result.linting.summary.totalWarnings} warnings`
            );
            yield* Display.showInfo(`Duration: ${result.duration}ms`);

            yield* Display.showSuccess(MESSAGES.SUCCESS.PIPELINE_COMPLETED);
            yield* Display.showInfo("Next: ep-admin release preview");
        })
    )
);

/**
 * Main publish command group
 */
export const publishCommand = Command.make("publish").pipe(
    Command.withDescription(
        "Pattern publishing workflow: validate, test, publish, and generate documentation"
    ),
    Command.withSubcommands([
        publishValidateCommand,
        publishTestCommand,
        publishRunCommand,
        publishGenerateCommand,
        publishLintCommand,
        publishPipelineCommand,
    ])
);
