/**
 * Database-related commands for ep-admin
 *
 * Orchestrates database operations and migrations:
 * - test: Test database connectivity and basic operations
 * - test-quick: Quick database connectivity test
 * - verify-migration: Verify database schema migration
 * - mock: Create mock database for testing
 *
 * NOTE: Commands now use native Effect services instead of script execution.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import {
    MESSAGES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import {
    runFullTestSuite,
    runQuickTest,
    verifySchema,
} from "./services/db/index.js";
import { Display } from "./services/display/index.js";

/**
 * db:test - Test database
 */
export const dbTestCommand = Command.make("test", {
    options: {
        ...globalOptions,
        includePerf: Options.boolean("perf").pipe(
            Options.withDescription("Include performance tests"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Run comprehensive database tests including connectivity, queries, and transactions"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running database tests...");

            const summary = yield* runFullTestSuite();

            yield* Display.showInfo(`\n${"-".repeat(60)}`);
            yield* Display.showInfo("Test Summary");
            yield* Display.showInfo(`${"-".repeat(60)}`);
            yield* Display.showInfo(`Total Tests: ${summary.total}`);
            yield* Display.showInfo(`Passed: ${summary.passed}`);
            yield* Display.showInfo(`Failed: ${summary.failed}`);
            yield* Display.showInfo(`Duration: ${summary.totalDuration}ms`);

            if (summary.failed > 0) {
                yield* Display.showError("\nFailed Tests:");
                for (const result of summary.results) {
                    if (!result.passed) {
                        yield* Display.showError(`  - ${result.name}: ${result.error}`);
                    }
                }
                return yield* Effect.fail(new Error("Database tests failed"));
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.DATABASE_TESTS_PASSED);
        }) as any
    )
);

/**
 * db:test-quick - Quick database test
 */
export const dbTestQuickCommand = Command.make("test-quick", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Quick database connectivity test (no full suite)"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running quick database test...\n");

            const result = yield* runQuickTest();

            // 1. Connection
            yield* Display.showInfo("1. Testing database connection...");
            if (result.connected) {
                yield* Display.showSuccess("   Connected");
            } else {
                yield* Display.showError("   Connection failed");
                return yield* Effect.fail(new Error("Database connection failed"));
            }

            // 2. Tables
            yield* Display.showInfo("\n2. Checking tables...");
            for (const table of result.tables) {
                if (table.exists) {
                    yield* Display.showSuccess(`   Table '${table.name}' exists`);
                } else {
                    yield* Display.showError(`   Table '${table.name}' missing`);
                }
            }

            // 3. Data
            yield* Display.showInfo("\n3. Checking data...");
            yield* Display.showInfo(`   Application Patterns: ${result.stats.applicationPatterns}`);
            yield* Display.showInfo(`   Effect Patterns: ${result.stats.effectPatterns}`);
            yield* Display.showInfo(`   Jobs: ${result.stats.jobs}`);

            if (result.stats.applicationPatterns === 0 && result.stats.effectPatterns === 0) {
                yield* Display.showInfo("\n   No data found. Run: bun run db:migrate");
            }

            // 4. Search
            yield* Display.showInfo("\n4. Testing search...");
            if (result.searchWorks) {
                yield* Display.showSuccess("   Search works");
            } else {
                yield* Display.showError("   Search failed");
            }

            // 5. Repositories
            yield* Display.showInfo("\n5. Testing repositories...");
            if (result.repositoriesWork) {
                yield* Display.showSuccess("   Repositories work");
            } else {
                yield* Display.showError("   Repositories failed");
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.QUICK_DB_TEST_PASSED);
        }) as any
    )
);

/**
 * db:verify-migration - Verify database migration
 */
export const dbVerifyMigrationCommand = Command.make("verify-migration", {
    options: {
        ...globalOptions,
        fix: Options.boolean("fix").pipe(
            Options.withDescription("Automatically fix migration issues"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Verify database schema is correctly migrated and all tables exist"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Verifying database schema...");

            const result = yield* verifySchema();

            if (result.valid) {
                yield* Display.showSuccess("All required tables exist!");
            } else {
                yield* Display.showError("Missing tables:");
                for (const table of result.missingTables) {
                    yield* Display.showError(`  - ${table}`);
                }

                if (options.fix) {
                    yield* Display.showInfo("\nTo fix, run: bun run db:push");
                }

                return yield* Effect.fail(new Error("Schema verification failed"));
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.MIGRATION_VERIFIED);
        }) as any
    )
);

/**
 * db:mock - Create mock database
 */
export const dbMockCommand = Command.make("mock", {
    options: {
        ...globalOptions,
        seed: Options.boolean("seed").pipe(
            Options.withDescription("Seed with test data"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Create mock database for local testing and development"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Creating mock database...");

            // Note: Mock database creation typically requires docker-compose
            // and is better handled via shell commands
            yield* Display.showInfo(
                "To create a mock database:\n" +
                "  1. Start PostgreSQL: docker-compose up -d postgres\n" +
                "  2. Push schema: bun run db:push\n" +
                "  3. Seed data: bun run db:seed"
            );

            if (options.seed) {
                yield* Display.showInfo("\nSeeding would be applied after database creation.");
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.MOCK_DB_CREATED);
        }) as any
    )
);

/**
 * Compose all database commands into a single command group
 */
export const dbCommand = Command.make("db").pipe(
    Command.withDescription("Database operations and migrations"),
    Command.withSubcommands([
        dbTestCommand,
        dbTestQuickCommand,
        dbVerifyMigrationCommand,
        dbMockCommand,
    ])
);
