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
 * migrate:state - Migrate pipeline state
 */
export const migrateStateCommand = Command.make("state", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);

            if (options.dryRun) {
                yield* Display.showInfo(MESSAGES.INFO.DRY_RUN_MODE);
            }
            if (options.backup) {
                yield* Display.showInfo("Creating backup of state...");
            }

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.MIGRATE.STATE),
                "Migrating pipeline state",
                {
                    verbose: options.verbose
                }
            );

            yield* Display.showSuccess("Pipeline state migrated successfully!");
        }) as any
    )
);

/**
 * migrate:postgres - Migrate to PostgreSQL
 */
export const migratePostgresCommand = Command.make("postgres", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);

            if (options.dryRun) {
                yield* Display.showInfo(MESSAGES.INFO.DRY_RUN_MODE);
            }
            if (options.backup) {
                yield* Display.showWarning("This will backup your current database before migration");
            }

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.MIGRATE.POSTGRES),
                "Migrating to PostgreSQL",
                {
                    verbose: options.verbose
                }
            );

            yield* Display.showSuccess("PostgreSQL migration completed successfully!");
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
