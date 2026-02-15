/**
 * Ingest-related commands for ep-admin
 *
 * Orchestrates the pattern ingestion pipeline:
 * - process: Process raw MDX files into structured patterns
 * - validate: Validate ingest data and structure
 * - test: Test the ingest pipeline
 * - populate: Populate test expectations
 * - process-one: Process a single pattern file
 * - status: Show ingest operation status
 * - pipeline: Full workflow (process → validate → test)
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
    discoverPatterns,
    processAllPatterns,
    processPattern,
    runIngestPipeline,
    summarizeProcessResults,
    testPatterns,
    validatePatterns,
    type IngestConfig
} from "./services/ingest/index.js";

const PROJECT_ROOT = process.cwd();

// --- DEFAULT CONFIG ---

const getIngestConfig = (): IngestConfig => ({
    rawDir: `${PROJECT_ROOT}/content/new/raw`,
    srcDir: `${PROJECT_ROOT}/content/new/src`,
    processedDir: `${PROJECT_ROOT}/content/new/processed`,
    publishedDir: `${PROJECT_ROOT}/content/new/published`,
    targetPublishedDir: `${PROJECT_ROOT}/${CONTENT_DIRS.PUBLISHED}`,
    reportDir: `${PROJECT_ROOT}/content/new/ingest-reports`,
});

/**
 * ingest:process - Process raw MDX files
 */
export const ingestProcessCommand = Command.make("process", {
    options: {
        ...globalOptions,
        clean: Options.boolean("clean").pipe(
            Options.withDescription("Clean processed files before processing"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Process raw MDX files from content/new/raw into structured patterns"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getIngestConfig();
            const results = yield* processAllPatterns(config);
            const summary = summarizeProcessResults(results);

            if (options.json) {
                yield* emitJson({
                    ok: summary.failed === 0,
                    summary,
                    results,
                });
                return;
            }

            yield* Display.showInfo("Processing raw MDX files...");

            yield* Display.showInfo(
                `Processed ${summary.processed}/${summary.total} patterns`
            );

            if (summary.failed > 0) {
                yield* Display.showError(
                    `${summary.failed} patterns failed to process`
                );
                for (const f of summary.failedFiles) {
                    yield* Display.showError(`  - ${f.file}: ${f.error}`);
                }
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERNS_PROCESSED);
        })
    )
);

/**
 * ingest:process-one - Process single pattern
 */
export const ingestProcessOneCommand = Command.make("process-one", {
    positional: {
        patternFile: Options.text("pattern-file").pipe(
            Options.withDescription("Pattern MDX file to process")
        ),
    },
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Process a single pattern file from content/new/raw"
    ),
    Command.withHandler(({ positional, options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getIngestConfig();
            const result = yield* processPattern(positional.patternFile, config);

            if (options.json) {
                yield* emitJson({
                    ok: result.success,
                    result,
                });
                if (!result.success) {
                    return yield* Effect.fail(new Error(result.error));
                }
                return;
            }

            yield* Display.showInfo(`Processing ${positional.patternFile}...`);

            if (!result.success) {
                yield* Display.showError(
                    `Failed to process ${positional.patternFile}: ${result.error}`
                );
                return yield* Effect.fail(new Error(result.error));
            }

            yield* Display.showSuccess(
                `Pattern ${positional.patternFile} processed! ID: ${result.id}`
            );
        })
    )
);

/**
 * ingest:validate - Validate ingest data
 */
export const ingestValidateCommand = Command.make("validate", {
    options: {
        ...globalOptions,
        fix: Options.boolean("fix").pipe(
            Options.withDescription("Automatically fix common issues"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Validate ingested patterns for correctness and consistency"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getIngestConfig();
            const patterns = yield* discoverPatterns(config);
            const results = yield* validatePatterns(patterns, config);

            const valid = results.filter((r) => r.valid).length;
            const invalid = results.filter((r) => !r.valid).length;

            if (options.json) {
                yield* emitJson({
                    ok: invalid === 0,
                    summary: {
                        total: results.length,
                        valid,
                        invalid,
                    },
                    results,
                });
                return;
            }

            yield* Display.showInfo("Validating ingested patterns...");

            yield* Display.showInfo(
                `Validated ${results.length} patterns: ${valid} valid, ${invalid} invalid`
            );

            if (invalid > 0) {
                for (const r of results.filter((r) => !r.valid)) {
                    yield* Display.showError(`  - ${r.pattern.id}:`);
                    for (const issue of r.issues) {
                        yield* Display.showError(
                            `      [${issue.type}] ${issue.message}`
                        );
                    }
                }
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.INGEST_VALIDATION_COMPLETE);
        })
    )
);

/**
 * ingest:test - Test ingest pipeline
 */
export const ingestTestCommand = Command.make("test", {
    options: {
        ...globalOptions,
        publish: Options.boolean("publish").pipe(
            Options.withDescription("Test publishing of ingested patterns"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test the ingest pipeline with validation and example execution"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getIngestConfig();
            const patterns = yield* discoverPatterns(config);
            const validated = yield* validatePatterns(patterns, config);
            const tested = yield* testPatterns(validated);

            const passed = tested.filter((r) => r.testPassed).length;
            const failed = tested.filter((r) => r.valid && !r.testPassed).length;

            if (options.json) {
                yield* emitJson({
                    ok: failed === 0,
                    summary: {
                        total: tested.length,
                        passed,
                        failed,
                    },
                    results: tested,
                });
                if (failed > 0) {
                    return yield* Effect.fail(new Error("Some tests failed"));
                }
                return;
            }

            yield* Display.showInfo("Testing ingested patterns...");

            yield* Display.showInfo(
                `Tested ${tested.length} patterns: ${passed} passed, ${failed} failed`
            );

            if (failed === 0) {
                yield* Display.showSuccess(MESSAGES.SUCCESS.INGEST_TESTS_PASSED);
            } else {
                for (const r of tested.filter((r) => r.valid && !r.testPassed)) {
                    yield* Display.showError(`  - ${r.pattern.id}: test failed`);
                }
                return yield* Effect.fail(new Error("Some tests failed"));
            }
        })
    )
);

/**
 * ingest:populate - Populate test expectations
 */
export const ingestPopulateCommand = Command.make("populate", {
    options: {
        ...globalOptions,
        reset: Options.boolean("reset").pipe(
            Options.withDescription("Reset expectations before populating"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Populate test expectations from current ingest state"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            // Run the ingest pipeline to get current state
            const config = getIngestConfig();
            const report = yield* runIngestPipeline(config);

            if (options.json) {
                yield* emitJson({
                    ok: true,
                    report,
                });
                return;
            }

            yield* Display.showInfo("Populating test expectations...");

            yield* Display.showInfo(
                `Populated expectations for ${report.totalPatterns} patterns`
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.EXPECTATIONS_POPULATED);
        })
    )
);

/**
 * ingest:status - Show ingest status
 */
export const ingestStatusCommand = Command.make("status", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Show current status of ingest pipeline (processed, pending, errors)"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getIngestConfig();
            const patterns = yield* discoverPatterns(config);
            const results = yield* validatePatterns(patterns, config);

            const valid = results.filter((r) => r.valid).length;
            const invalid = results.filter((r) => !r.valid).length;
            const withTs = patterns.filter((p) => p.hasTypeScript).length;

            if (options.json) {
                yield* emitJson({
                    ok: true,
                    summary: {
                        totalPatterns: patterns.length,
                        withTypeScript: withTs,
                        valid,
                        invalid,
                    },
                });
                return;
            }

            yield* Display.showInfo("Checking ingest status...");

            yield* Display.showInfo(`\nIngest Status:`);
            yield* Display.showInfo(`  Total patterns: ${patterns.length}`);
            yield* Display.showInfo(`  With TypeScript: ${withTs}`);
            yield* Display.showInfo(`  Valid: ${valid}`);
            yield* Display.showInfo(`  Invalid: ${invalid}`);

            yield* Display.showSuccess(MESSAGES.SUCCESS.STATUS_CHECK_COMPLETE);
        })
    )
);

/**
 * ingest:pipeline - Full ingest workflow
 */
export const ingestPipelineCommand = Command.make("pipeline", {
    options: {
        ...globalOptions,
        test: Options.boolean("test").pipe(
            Options.withDescription("Run tests after processing"),
            Options.withDefault(false)
        ),
        clean: Options.boolean("clean").pipe(
            Options.withDescription("Clean before processing"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Run full ingest pipeline: discover → validate → test → migrate"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            const config = getIngestConfig();
            const report = yield* runIngestPipeline(config);

            if (options.json) {
                yield* emitJson({
                    ok: report.failed === 0,
                    report,
                });
                if (report.failed > 0) {
                    return yield* Effect.fail(new Error("Ingest pipeline failed"));
                }
                return;
            }

            yield* Display.showInfo("Running full ingest pipeline...");

            yield* Display.showInfo(`\nIngest Pipeline Results:`);
            yield* Display.showInfo(`  Total: ${report.totalPatterns}`);
            yield* Display.showInfo(`  Validated: ${report.validated}`);
            yield* Display.showInfo(`  Tests Passed: ${report.testsPassed}`);
            yield* Display.showInfo(`  Duplicates: ${report.duplicates}`);
            yield* Display.showInfo(`  Migrated: ${report.migrated}`);
            yield* Display.showInfo(`  Failed: ${report.failed}`);

            if (report.failed > 0) {
                yield* Display.showError(
                    `\n${report.failed} patterns failed. Check the report for details.`
                );
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.INGEST_PIPELINE_COMPLETED);
        })
    )
);

/**
 * Compose all ingest commands into a single command group
 */
export const ingestCommand = Command.make("ingest").pipe(
    Command.withDescription("Manage pattern ingest pipeline"),
    Command.withSubcommands([
        ingestProcessCommand,
        ingestProcessOneCommand,
        ingestValidateCommand,
        ingestTestCommand,
        ingestPopulateCommand,
        ingestStatusCommand,
        ingestPipelineCommand,
    ])
);
