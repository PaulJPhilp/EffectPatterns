/**
 * Migration commands for ep-admin
 *
 * Orchestrates database and state migrations:
 * - migrate-state: Migrate pipeline state to new format
 * - migrate-postgres: Migrate data to PostgreSQL database
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { showInfo, showSuccess, showWarning } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * migrate:state - Migrate pipeline state
 */
export const migrateStateCommand = Command.make("state", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed migration output"),
            Options.withDefault(false)
        ),
        backup: Options.boolean("backup").pipe(
            Options.withDescription("Create backup before migration"),
            Options.withDefault(true)
        ),
        dryRun: Options.boolean("dry-run").pipe(
            Options.withDescription("Preview changes without applying them"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Migrate pipeline state to new format"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            if (options.dryRun) {
                yield* showInfo("Running in dry-run mode (no changes will be applied)");
            }
            if (options.backup) {
                yield* showInfo("Creating backup of state...");
            }

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/migrate-state.ts"),
                "Migrating pipeline state",
                {
                    verbose: options.verbose,
                    backup: options.backup,
                    dryRun: options.dryRun
                }
            );

            yield* showSuccess("Pipeline state migrated successfully!");
        }) as any
    )
);

/**
 * migrate:postgres - Migrate to PostgreSQL
 */
export const migratePostgresCommand = Command.make("postgres", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed migration output"),
            Options.withDefault(false)
        ),
        backup: Options.boolean("backup").pipe(
            Options.withDescription("Create backup before migration"),
            Options.withDefault(true)
        ),
        dryRun: Options.boolean("dry-run").pipe(
            Options.withDescription("Preview changes without applying them"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Migrate data and schema to PostgreSQL database"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            if (options.dryRun) {
                yield* showInfo("Running in dry-run mode (no changes will be applied)");
            }
            if (options.backup) {
                yield* showWarning("This will backup your current database before migration");
            }

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/migrate-to-postgres.ts"),
                "Migrating to PostgreSQL",
                {
                    verbose: options.verbose,
                    backup: options.backup,
                    dryRun: options.dryRun
                }
            );

            yield* showSuccess("PostgreSQL migration completed successfully!");
        }) as any
    )
);

/**
 * Compose all migration commands into a single command group
 */
export const migrateCommand = Command.make("migrate").pipe(
    Command.withDescription("Database and state migrations"),
    Command.withSubcommands([
        migrateStateCommand,
        migratePostgresCommand,
    ])
);
