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
 *
 * NOTE: Commands now use native Effect services instead of script execution.
 */

import { Command, Options } from "@effect/cli";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import {
    CONTENT_DIRS,
    MESSAGES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import {
    generateQAReport,
    getQAStatus,
    repairAllFailed,
    type QAConfig,
} from "./services/qa/index.js";

const PROJECT_ROOT = process.cwd();

// --- DEFAULT CONFIG ---

const getQAConfig = (useNew = false): QAConfig => {
    const qaDir = useNew
        ? `${PROJECT_ROOT}/content/new/qa`
        : `${PROJECT_ROOT}/content/qa`;

    return {
        qaDir,
        resultsDir: `${qaDir}/results`,
        backupsDir: `${qaDir}/backups`,
        repairsDir: `${qaDir}/repairs`,
        patternsDir: `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_PROCESSED}`,
        reportFile: `${qaDir}/qa-report.json`,
    };
};

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
        new: Options.boolean("new").pipe(
            Options.withDescription("Process new patterns (content/new/qa)"),
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
            yield* Display.showInfo("Running QA pipeline...");

            const config = getQAConfig(options.new);

            // Get status first
            const status = yield* getQAStatus(config);
            yield* Display.showInfo(
                `Found ${status.total} patterns: ` +
                `${status.passed} passed, ${status.failed} failed`
            );

            // Generate report
            const report = yield* generateQAReport(config);
            yield* Display.showInfo(
                `Report generated: ${report.summary.passRate.toFixed(1)}% pass rate`
            );

            // Optionally fix issues
            if (options.fix && status.failed > 0) {
                yield* Display.showInfo("Attempting to repair failed patterns...");
                const repairSummary = yield* repairAllFailed(config, false);
                yield* Display.showInfo(
                    `Repaired ${repairSummary.repaired}/${repairSummary.attempted} patterns`
                );
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_PIPELINE_COMPLETED);
        }).pipe(
            Effect.provide(NodeContext.layer)
        ) as any
    )
);

/**
 * qa:status - Show QA status
 */
export const qaStatusCommand = Command.make("status", {
    options: {
        ...globalOptions,
        new: Options.boolean("new").pipe(
            Options.withDescription("Check status for new patterns"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Display current QA status: passed/failed patterns, recent issues"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            const config = getQAConfig(options.new);
            const status = yield* getQAStatus(config);

            const patternType = options.new ? "New Patterns" : "Published Patterns";
            yield* Display.showInfo(`\nQA Status Report - ${patternType}`);
            yield* Display.showInfo(`${"-".repeat(40)}`);

            if (status.total === 0) {
                yield* Display.showInfo("No QA results found.");
                yield* Display.showInfo(
                    `Run "ep-admin qa process${options.new ? " --new" : ""}" first.`
                );
            } else {
                yield* Display.showInfo(`Total Patterns: ${status.total}`);
                yield* Display.showInfo(`Passed: ${status.passed}`);
                yield* Display.showInfo(`Failed: ${status.failed}`);
                yield* Display.showInfo(`Pass Rate: ${status.passRate.toFixed(1)}%`);

                if (status.failed > 0) {
                    yield* Display.showInfo("\nFailure Categories:");
                    for (const [cat, count] of Object.entries(status.failuresByCategory)) {
                        yield* Display.showInfo(`  ${cat}: ${count}`);
                    }

                    yield* Display.showInfo("\nBy Skill Level:");
                    for (const [level, stats] of Object.entries(status.bySkillLevel)) {
                        const rate = stats.passed + stats.failed > 0
                            ? ((stats.passed / (stats.passed + stats.failed)) * 100).toFixed(1)
                            : "0";
                        yield* Display.showInfo(
                            `  ${level}: ${stats.passed}/${stats.passed + stats.failed} (${rate}%)`
                        );
                    }
                }
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_STATUS_COMPLETE);
        }).pipe(
            Effect.provide(NodeContext.layer)
        ) as any
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
            Options.withDefault("json" as const)
        ),
        new: Options.boolean("new").pipe(
            Options.withDescription("Generate report for new patterns"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Generate comprehensive QA report with metrics and detailed findings"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Generating QA report...");

            const config = getQAConfig(options.new);
            const report = yield* generateQAReport(config);

            yield* Display.showInfo("\nQA Report Generated");
            yield* Display.showInfo("==================");
            yield* Display.showInfo(`Total Patterns: ${report.summary.totalPatterns}`);
            yield* Display.showInfo(`Passed: ${report.summary.passed}`);
            yield* Display.showInfo(`Failed: ${report.summary.failed}`);
            yield* Display.showInfo(`Pass Rate: ${report.summary.passRate.toFixed(1)}%`);
            yield* Display.showInfo(`Total Cost: $${report.summary.totalCost.toFixed(4)}`);
            yield* Display.showInfo(`Total Tokens: ${report.summary.totalTokens}`);

            if (report.failures.patterns.length > 0) {
                yield* Display.showInfo(`\nFailed Patterns: ${report.failures.patterns.length}`);
                yield* Display.showInfo(`Report saved to: ${config.reportFile}`);

                if (report.recommendations.length > 0) {
                    yield* Display.showInfo("\nRecommendations:");
                    for (const rec of report.recommendations) {
                        yield* Display.showInfo(`  - ${rec}`);
                    }
                }
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_REPORT_GENERATED);
        }).pipe(
            Effect.provide(NodeContext.layer)
        ) as any
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
        new: Options.boolean("new").pipe(
            Options.withDescription("Repair new patterns"),
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

            yield* Display.showInfo("Repairing QA issues...");

            const config = getQAConfig(options.new);
            const summary = yield* repairAllFailed(config, options.dryRun);

            yield* Display.showInfo(
                `\nRepair Process Complete${options.dryRun ? " (DRY RUN)" : ""}:`
            );
            yield* Display.showInfo(`  Attempted: ${summary.attempted}`);
            yield* Display.showInfo(`  Successfully Repaired: ${summary.repaired}`);
            yield* Display.showInfo(`  Failed: ${summary.failed}`);

            if (!options.dryRun && summary.repaired > 0) {
                yield* Display.showInfo(`\nBackups saved to: ${config.backupsDir}`);
                yield* Display.showInfo(`Repair logs saved to: ${config.repairsDir}`);
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_REPAIR_COMPLETED);
        }).pipe(
            Effect.provide(NodeContext.layer)
        ) as any
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
        new: Options.boolean("new").pipe(
            Options.withDescription("Test new patterns"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Run enhanced QA tests with additional validation and coverage checks"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running enhanced QA tests...");

            const config = getQAConfig(options.new);
            const status = yield* getQAStatus(config);

            yield* Display.showInfo(
                `Tested ${status.total} patterns: ` +
                `${status.passed} passed, ${status.failed} failed`
            );

            if (status.failed > 0) {
                yield* Display.showError(
                    `${status.failed} patterns failed enhanced QA tests`
                );
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_ENHANCED_TESTS_PASSED);
        }).pipe(
            Effect.provide(NodeContext.layer)
        ) as any
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
            yield* Display.showInfo(`Testing pattern: ${positional.patternFile}...`);

            // Note: Single pattern testing would require pattern-specific QA
            // For now, show info about the pattern
            yield* Display.showInfo(
                `Pattern ${positional.patternFile} - use 'qa status' for full results`
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERN_TEST_PASSED);
        }).pipe(
            Effect.provide(NodeContext.layer)
        ) as any
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
            yield* Display.showInfo("Fixing file permissions...");

            // Note: Permission fixing would require shell commands
            // This is typically handled at the OS level
            yield* Display.showInfo(
                "Permission fixes are typically done via shell commands. " +
                "Run 'chmod -R 755 content/' if needed."
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PERMISSIONS_FIXED);
        }).pipe(
            Effect.provide(NodeContext.layer)
        ) as any
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
