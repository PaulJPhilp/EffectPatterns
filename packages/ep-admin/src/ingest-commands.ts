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
import { showInfo, showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * ingest:process - Process raw MDX files
 */
export const ingestProcessCommand = Command.make("process", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed processing output"),
            Options.withDefault(false)
        ),
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
            if (options.clean) {
                yield* showInfo("Cleaning processed patterns...");
            }

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest/process.ts"),
                "Processing raw patterns",
                { verbose: options.verbose }
            );

            yield* showSuccess("Patterns processed successfully!");
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
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed processing output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Process a single pattern file from content/new/raw"
    ),
    Command.withHandler(({ positional, options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest/process-one.ts"),
                `Processing pattern: ${positional.patternFile}`,
                {
                    verbose: options.verbose
                }
            );

            yield* showSuccess(`Pattern ${positional.patternFile} processed!`);
        }) as any
    )
);

/**
 * ingest:validate - Validate ingest data
 */
export const ingestValidateCommand = Command.make("validate", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed validation output"),
            Options.withDefault(false)
        ),
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
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest/validate.ts"),
                "Validating ingest data",
                { verbose: options.verbose }
            );

            yield* showSuccess("Ingest validation complete!");
        }) as any
    )
);

/**
 * ingest:test - Test ingest pipeline
 */
export const ingestTestCommand = Command.make("test", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
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
            const scriptPath = options.publish
                ? "test-publish.ts"
                : "test-new.ts";

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest", scriptPath),
                "Testing ingest pipeline",
                { verbose: options.verbose }
            );

            yield* showSuccess("Ingest pipeline tests passed!");
        }) as any
    )
);

/**
 * ingest:populate - Populate test expectations
 */
export const ingestPopulateCommand = Command.make("populate", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed population output"),
            Options.withDefault(false)
        ),
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
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest/populate-expectations.ts"),
                "Populating test expectations",
                { verbose: options.verbose }
            );

            yield* showSuccess("Test expectations populated!");
        }) as any
    )
);

/**
 * ingest:status - Show ingest status
 */
export const ingestStatusCommand = Command.make("status", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed status output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Show current status of ingest pipeline (processed, pending, errors)"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest/run.ts"),
                "Checking ingest status",
                { verbose: options.verbose }
            );

            yield* showSuccess("Status check complete!");
        }) as any
    )
);

/**
 * ingest:pipeline - Full ingest workflow
 */
export const ingestPipelineCommand = Command.make("pipeline", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed pipeline output"),
            Options.withDefault(false)
        ),
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
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest/ingest-pipeline-improved.ts"),
                "Running full ingest pipeline",
                {
                    verbose: options.verbose
                }
            );

            yield* showSuccess("Ingest pipeline completed successfully!");
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
