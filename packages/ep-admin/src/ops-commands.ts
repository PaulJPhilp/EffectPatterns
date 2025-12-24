/**
 * Operations commands for ep-admin
 *
 * Orchestrates system operations and maintenance:
 * - health-check: Run system health check
 * - rotate-api-key: Rotate API key
 * - upgrade-baseline: Upgrade test baseline
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { showInfo, showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * ops:health-check - Run health check
 */
export const opsHealthCheckCommand = Command.make("health-check", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Run comprehensive system health check"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/health-check.sh"),
                "Running health check",
                { verbose: options.verbose }
            );

            yield* showSuccess("Health check completed!");
        }) as any
    )
);

/**
 * ops:rotate-api-key - Rotate API key
 */
export const opsRotateApiKeyCommand = Command.make("rotate-api-key", {
    options: {
        ...globalOptions,
        backup: Options.boolean("backup").pipe(
            Options.withDescription("Backup current key before rotation"),
            Options.withDefault(true)
        ),
    },
}).pipe(
    Command.withDescription(
        "Rotate API key for external services"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            if (options.backup) {
                yield* showInfo("Creating backup of current API key...");
            }

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/rotate-api-key.sh"),
                "Rotating API key",
                { verbose: options.verbose }
            );

            yield* showSuccess("API key rotated successfully!");
        }) as any
    )
);

/**
 * ops:upgrade-baseline - Upgrade test baseline
 */
export const opsUpgradeBaselineCommand = Command.make("upgrade-baseline", {
    options: {
        ...globalOptions,
        confirm: Options.boolean("confirm").pipe(
            Options.withDescription("Skip confirmation prompt"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Upgrade test baseline snapshots to current state"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            if (!options.confirm) {
                yield* showInfo("This will update all test baselines");
            }

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/upgrade-baseline.sh"),
                "Upgrading test baseline",
                { verbose: options.verbose }
            );

            yield* showSuccess("Test baseline upgraded!");
        }) as any
    )
);

/**
 * Compose all operations commands into a single command group
 */
export const opsCommand = Command.make("ops").pipe(
    Command.withDescription("System operations and maintenance"),
    Command.withSubcommands([
        opsHealthCheckCommand,
        opsRotateApiKeyCommand,
        opsUpgradeBaselineCommand,
    ])
);
