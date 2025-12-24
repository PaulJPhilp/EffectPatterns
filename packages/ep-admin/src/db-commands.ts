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
import { showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * db:test - Test database
 */
export const dbTestCommand = Command.make("test", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
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
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-db.ts"),
                "Testing database",
                { verbose: options.verbose, includePerf: options.includePerf }
            );

            yield* showSuccess("Database tests passed!");
        }) as any
    )
);

/**
 * db:test-quick - Quick database test
 */
export const dbTestQuickCommand = Command.make("test-quick", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Quick database connectivity test (no full suite)"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-db-quick.ts"),
                "Quick testing database",
                { verbose: options.verbose }
            );

            yield* showSuccess("Quick database test passed!");
        }) as any
    )
);

/**
 * db:verify-migration - Verify database migration
 */
export const dbVerifyMigrationCommand = Command.make("verify-migration", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed verification output"),
            Options.withDefault(false)
        ),
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
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/verify-migration.ts"),
                "Verifying database migration",
                { verbose: options.verbose, fix: options.fix }
            );

            yield* showSuccess("Database migration verified!");
        }) as any
    )
);

/**
 * db:mock - Create mock database
 */
export const dbMockCommand = Command.make("mock", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed output"),
            Options.withDefault(false)
        ),
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
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/mock-db.ts"),
                "Creating mock database",
                { verbose: options.verbose, seed: options.seed }
            );

            yield* showSuccess("Mock database created!");
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
