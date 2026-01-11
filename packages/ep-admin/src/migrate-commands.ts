/**
 * Migration commands for ep-admin
 *
 * Orchestrates database and state migrations:
 * - migrate-state: Migrate pipeline state to new format
 * - migrate-postgres: Migrate data to PostgreSQL database
 *
 * NOTE: These commands provide migration guidance.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import {
    MESSAGES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

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

            yield* Display.showInfo("Pipeline State Migration");
            yield* Display.showInfo(
                "\nThe pipeline state is stored in .pipeline-state.json\n" +
                "\nTo migrate state:\n" +
                "  1. Backup: cp .pipeline-state.json .pipeline-state.json.bak\n" +
                "  2. State is automatically migrated on next pipeline run\n" +
                "\nState tracking includes:\n" +
                "  - Pattern processing checkpoints\n" +
                "  - Validation results\n" +
                "  - Test outcomes"
            );

            yield* Display.showSuccess("Pipeline state info displayed!");
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

            yield* Display.showInfo("PostgreSQL Migration");
            yield* Display.showInfo(
                "\nTo migrate to PostgreSQL:\n" +
                "  1. Start PostgreSQL: docker-compose up -d postgres\n" +
                "  2. Push schema: bun run db:push\n" +
                "  3. Run migrations: bun run db:migrate\n" +
                "  4. Verify: ep-admin db test-quick\n" +
                "\nDatabase configuration is in drizzle.config.ts"
            );

            yield* Display.showSuccess("PostgreSQL migration info displayed!");
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
