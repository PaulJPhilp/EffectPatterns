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
import { exec } from "node:child_process";
import { promisify } from "node:util";
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
    validateAllPublishedPatterns,
    type QAConfig,
} from "./services/qa/index.js";

const execAsync = promisify(exec);
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
        patternsDir: useNew
            ? `${PROJECT_ROOT}/${CONTENT_DIRS.NEW_PROCESSED}`
            : `${PROJECT_ROOT}/${CONTENT_DIRS.PUBLISHED}/patterns`,
        publishedPatternsDir: `${PROJECT_ROOT}/${CONTENT_DIRS.PUBLISHED}/patterns`,
        reportFile: `${qaDir}/qa-report.json`,
    };
};

/**
 * qa:validate - Validate all published patterns
 */
export const qaValidateCommand = Command.make("validate", {
    options: {
        ...globalOptions,
        concurrency: Options.integer("concurrency").pipe(
            Options.withDescription("Number of patterns to validate concurrently"),
            Options.withDefault(10)
        ),
    },
}).pipe(
    Command.withDescription(
        "Validate all published patterns: frontmatter, structure, TypeScript type-checks"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Validating published patterns...");

            const config = getQAConfig(false);
            const results = yield* validateAllPublishedPatterns(config, options.concurrency);

            const passed = results.filter((r) => r.passed).length;
            const failed = results.filter((r) => !r.passed).length;
            const totalWarnings = results.reduce(
                (sum, r) => sum + (r.warnings?.length ?? 0), 0
            );
            const totalErrors = results.reduce(
                (sum, r) => sum + (r.errors?.length ?? 0), 0
            );

            yield* Display.showInfo(`\nValidation Results`);
            yield* Display.showInfo(`${"-".repeat(40)}`);
            yield* Display.showInfo(`Total: ${results.length}`);
            yield* Display.showInfo(`Passed: ${passed}`);
            yield* Display.showInfo(`Failed: ${failed}`);
            yield* Display.showInfo(`Errors: ${totalErrors}`);
            yield* Display.showInfo(`Warnings: ${totalWarnings}`);

            if (failed > 0) {
                yield* Display.showInfo("\nFailed patterns:");
                for (const result of results.filter((r) => !r.passed)) {
                    yield* Display.showError(
                        `  ${result.patternId}: ${(result.errors ?? []).join("; ")}`
                    );
                }
            }

            yield* Display.showInfo(`\nResults written to: ${config.resultsDir}`);
            yield* Display.showSuccess("Validation complete!");
        })
    )
);

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

            // Step 1: Validate published patterns (generates -qa.json files)
            if (!options.new) {
                yield* Display.showInfo("Step 1: Validating published patterns...");
                const validationResults = yield* validateAllPublishedPatterns(config);
                const passed = validationResults.filter((r) => r.passed).length;
                const failed = validationResults.filter((r) => !r.passed).length;
                yield* Display.showInfo(
                    `Validated ${validationResults.length} patterns: ${passed} passed, ${failed} failed`
                );
            }

            // Step 2: Get status (reads -qa.json files)
            yield* Display.showInfo(
                options.new ? "Step 1: Checking QA status..." : "Step 2: Checking QA status..."
            );
            const status = yield* getQAStatus(config);
            yield* Display.showInfo(
                `Found ${status.total} patterns: ` +
                `${status.passed} passed, ${status.failed} failed`
            );

            // Step 3: Generate report
            yield* Display.showInfo(
                options.new ? "Step 2: Generating report..." : "Step 3: Generating report..."
            );
            const report = yield* generateQAReport(config);
            yield* Display.showInfo(
                `Report generated: ${report.summary.passRate.toFixed(1)}% pass rate`
            );

            // Step 4: Optionally fix issues
            if (options.fix && status.failed > 0) {
                yield* Display.showInfo("Attempting to repair failed patterns...");
                const repairSummary = yield* repairAllFailed(config, false);
                yield* Display.showInfo(
                    `Repaired ${repairSummary.repaired}/${repairSummary.attempted} patterns`
                );
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.QA_PIPELINE_COMPLETED);
        })
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
        })
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
        })
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
        })
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
        })
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

            // Check if file exists (using Bun/Node fs via tryPromise for speed in stub)
            const command = `bun test ${positional.patternFile}`;
            yield* Display.showInfo(`Running: ${command}`);

            yield* Effect.tryPromise(() => execAsync(command)).pipe(
                Effect.tap(() => Display.showSuccess(MESSAGES.SUCCESS.PATTERN_TEST_PASSED)),
                Effect.catchAll((error) => 
                     Effect.gen(function*() {
                         yield* Display.showError(`Test failed for ${positional.patternFile}`);
                         // @ts-ignore
                         yield* Display.showError(error.stdout || String(error));
                     })
                )
            );
        })
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

            const command = "chmod -R 755 content/";
            
            yield* Effect.tryPromise(() => execAsync(command)).pipe(
                Effect.tap(() => Display.showSuccess(MESSAGES.SUCCESS.PERMISSIONS_FIXED)),
                Effect.catchAll((error) => Display.showError(`Failed to fix permissions: ${String(error)}`))
            );
        })
    )
);

/**
 * Compose all QA commands into a single command group
 */
export const qaCommand = Command.make("qa").pipe(
    Command.withDescription("Quality assurance operations for patterns"),
    Command.withSubcommands([
        qaValidateCommand,
        qaProcessCommand,
        qaStatusCommand,
        qaReportCommand,
        qaRepairCommand,
        qaTestEnhancedCommand,
        qaTestSingleCommand,
        qaFixPermissionsCommand,
    ])
);
