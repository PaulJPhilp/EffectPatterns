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
 * qa:process - Run full QA pipeline
 */
export const qaProcessCommand = Command.make("process", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.QA.PROCESS),
                TASK_NAMES.RUNNING_QA_PIPELINE,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_PIPELINE_COMPLETED);
        }) as any
    )
);

/**
 * qa:status - Show QA status
 */
export const qaStatusCommand = Command.make("status", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Display current QA status: passed/failed patterns, recent issues"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.QA.STATUS),
                TASK_NAMES.CHECKING_QA_STATUS,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_STATUS_COMPLETE);
        }) as any
    )
);

/**
 * qa:report - Generate QA report
 */
export const qaReportCommand = Command.make("report", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.QA.REPORT),
                TASK_NAMES.GENERATING_QA_REPORT,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(`QA report generated (${options.format} format)!`);
        }) as any
    )
);

/**
 * qa:repair - Repair QA issues
 */
export const qaRepairCommand = Command.make("repair", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);

            if (options.dryRun) {
                yield* Display.showInfo(MESSAGES.INFO.DRY_RUN_MODE);
            }

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.QA.REPAIR),
                TASK_NAMES.REPAIRING_QA_ISSUES,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_REPAIR_COMPLETED);
        }) as any
    )
);

/**
 * qa:test-enhanced - Run enhanced QA tests
 */
export const qaTestEnhancedCommand = Command.make("test-enhanced", {
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
        "Run enhanced QA tests with additional validation and coverage checks"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.QA.TEST_ENHANCED),
                TASK_NAMES.RUNNING_ENHANCED_QA_TESTS,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_ENHANCED_TESTS_PASSED);
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
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test a single pattern file for QA compliance"
    ),
    Command.withHandler(({ positional, options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.QA.TEST_SINGLE),
                `${TASK_NAMES.TESTING_PATTERN}: ${positional.patternFile}`,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERN_TEST_PASSED);
        }) as any
    )
);

/**
 * qa:fix-permissions - Fix file permissions
 */
export const qaFixPermissionsCommand = Command.make("fix-permissions", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Fix file permissions for all patterns and scripts"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.QA.FIX_PERMISSIONS),
                TASK_NAMES.FIXING_PERMISSIONS,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PERMISSIONS_FIXED);
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
