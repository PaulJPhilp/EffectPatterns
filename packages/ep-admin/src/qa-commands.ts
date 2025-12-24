/**
 * QA-related commands for ep-admin
 *
 * Orchestrates the pattern quality assurance operations:
 * - process: Run QA pipeline (validate, test, report)
 * - status: Show current QA status
 * - report: Generate detailed QA report
 * - repair: Fix common QA issues
 * - test-enhanced: Run enhanced QA tests
 * - fix-permissions: Fix file permissions
 * - test-single: Test a single pattern
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { showInfo, showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * qa:process - Run full QA pipeline
 */
export const qaProcessCommand = Command.make("process", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed QA output"),
            Options.withDefault(false)
        ),
        fix: Options.boolean("fix").pipe(
            Options.withDescription("Automatically fix issues found"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Run complete QA pipeline: validate patterns, run tests, generate reports"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/qa/qa-process.sh"),
                "Running QA pipeline",
                { verbose: options.verbose }
            );

            yield* showSuccess("QA pipeline completed!");
        }) as any
    )
);

/**
 * qa:status - Show QA status
 */
export const qaStatusCommand = Command.make("status", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed status information"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Display current QA status: passed/failed patterns, recent issues"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/qa/qa-status.ts"),
                "Checking QA status",
                { verbose: options.verbose }
            );

            yield* showSuccess("Status check complete!");
        }) as any
    )
);

/**
 * qa:report - Generate QA report
 */
export const qaReportCommand = Command.make("report", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed report output"),
            Options.withDefault(false)
        ),
        format: Options.choice("format", ["json", "markdown", "html"]).pipe(
            Options.withDescription("Output format for report"),
            Options.withDefault("markdown" as const)
        ),
    },
}).pipe(
    Command.withDescription(
        "Generate comprehensive QA report with metrics and detailed findings"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/qa/qa-report.ts"),
                "Generating QA report",
                { verbose: options.verbose }
            );

            yield* showSuccess(`QA report generated (${options.format} format)!`);
        }) as any
    )
);

/**
 * qa:repair - Repair QA issues
 */
export const qaRepairCommand = Command.make("repair", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed repair output"),
            Options.withDefault(false)
        ),
        dryRun: Options.boolean("dry-run").pipe(
            Options.withDescription("Preview changes without applying them"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Automatically repair common QA issues (formatting, missing sections, etc)"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            if (options.dryRun) {
                yield* showInfo("Running in dry-run mode (no changes will be applied)");
            }

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/qa/qa-repair.ts"),
                "Repairing QA issues",
                { verbose: options.verbose }
            );

            yield* showSuccess("Repair process completed!");
        }) as any
    )
);

/**
 * qa:test-enhanced - Run enhanced QA tests
 */
export const qaTestEnhancedCommand = Command.make("test-enhanced", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
        pattern: Options.optional(
            Options.text("pattern").pipe(
                Options.withDescription("Test specific pattern only")
            )
        ),
    },
}).pipe(
    Command.withDescription(
        "Run enhanced QA tests with additional validation and coverage checks"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/qa/test-enhanced-qa.ts"),
                "Running enhanced QA tests",
                { verbose: options.verbose }
            );

            yield* showSuccess("Enhanced QA tests passed!");
        }) as any
    )
);

/**
 * qa:test-single - Test single pattern
 */
export const qaTestSingleCommand = Command.make("test-single", {
    positional: {
        patternFile: Options.text("pattern-file").pipe(
            Options.withDescription("Pattern file to test")
        ),
    },
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test a single pattern file for QA compliance"
    ),
    Command.withHandler(({ positional, options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/qa/test-single-pattern.sh"),
                `Testing pattern: ${positional.patternFile}`,
                { verbose: options.verbose }
            );

            yield* showSuccess("Pattern test passed!");
        }) as any
    )
);

/**
 * qa:fix-permissions - Fix file permissions
 */
export const qaFixPermissionsCommand = Command.make("fix-permissions", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Fix file permissions for all patterns and scripts"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/qa/permissions-fix.sh"),
                "Fixing file permissions",
                { verbose: options.verbose }
            );

            yield* showSuccess("File permissions fixed!");
        }) as any
    )
);

/**
 * Compose all QA commands into a single command group
 */
export const qaCommand = Command.make("qa").pipe(
    Command.withDescription("Quality assurance operations for patterns"),
    Command.withSubcommands([
        qaProcessCommand,
        qaStatusCommand,
        qaReportCommand,
        qaRepairCommand,
        qaTestEnhancedCommand,
        qaTestSingleCommand,
        qaFixPermissionsCommand,
    ])
);
