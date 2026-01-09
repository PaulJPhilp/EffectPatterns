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
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import {
	MESSAGES,
	SCRIPTS,
	TASK_NAMES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import { Execution } from "./services/execution/index.js";

const PROJECT_ROOT = process.cwd();

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
        "Process raw MDX files from content/new/raw into structured patterns in content/new/processed"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            if (options.clean) {
                yield* Display.showInfo(MESSAGES.INFO.CLEANING_PATTERNS);
            }

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.INGEST.PROCESS),
                TASK_NAMES.PROCESSING_RAW_PATTERNS,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERNS_PROCESSED);
        }) as any
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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.INGEST.PROCESS_ONE),
                `${TASK_NAMES.PROCESSING_PATTERN}: ${positional.patternFile}`,
                {
                    verbose: options.verbose
                }
            );

            yield* Display.showSuccess(`Pattern ${positional.patternFile} processed!`);
        }) as any
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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.INGEST.PROCESS),
                TASK_NAMES.VALIDATING_INGEST_DATA,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.INGEST_VALIDATION_COMPLETE);
        }) as any
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

            const scriptPath = options.publish
                ? SCRIPTS.INGEST.TEST_PUBLISH
                : SCRIPTS.INGEST.TEST_NEW;

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest", scriptPath),
                TASK_NAMES.TESTING_INGEST_PIPELINE,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.INGEST_TESTS_PASSED);
        }) as any
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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.INGEST.POPULATE_EXPECTATIONS),
                TASK_NAMES.POPULATING_EXPECTATIONS,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.EXPECTATIONS_POPULATED);
        }) as any
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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.INGEST.PIPELINE),
                TASK_NAMES.CHECKING_INGEST_STATUS,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.STATUS_CHECK_COMPLETE);
        }) as any
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
        "Run full ingest pipeline: process → validate → test"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.INGEST.PIPELINE),
                TASK_NAMES.RUNNING_INGEST_PIPELINE,
                {
                    verbose: options.verbose
                }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.INGEST_PIPELINE_COMPLETED);
        }) as any
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
