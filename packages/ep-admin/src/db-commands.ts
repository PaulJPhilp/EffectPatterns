/**
 * Database-related commands for ep-admin
 *
 * Orchestrates database operations and migrations:
 * - test: Test database connectivity and basic operations
 * - test-quick: Quick database connectivity test
 * - verify-migration: Verify database schema migration
 * - mock: Create mock database for testing
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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.DB.TEST),
                TASK_NAMES.TESTING_DATABASE,
                { verbose: options.verbose }
            );

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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.DB.TEST_QUICK),
                TASK_NAMES.QUICK_TESTING_DATABASE,
                { verbose: options.verbose }
            );

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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.DB.VERIFY_MIGRATION),
                TASK_NAMES.VERIFYING_MIGRATION,
                { verbose: options.verbose }
            );

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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.DB.MOCK),
                TASK_NAMES.CREATING_MOCK_DB,
                { verbose: options.verbose }
            );

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
