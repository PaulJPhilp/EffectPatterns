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

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.OPS.HEALTH_CHECK),
                TASK_NAMES.RUNNING_HEALTH_CHECK,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.HEALTH_CHECK_COMPLETED);
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
                yield* Display.showInfo(MESSAGES.INFO.CREATING_BACKUP);
            }

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.OPS.ROTATE_API_KEY),
                TASK_NAMES.ROTATING_API_KEY,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.API_KEY_ROTATED);
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
                yield* Display.showInfo(MESSAGES.INFO.UPDATING_BASELINES);
            }

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.OPS.UPGRADE_BASELINE),
                TASK_NAMES.UPGRADING_BASELINE,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.BASELINE_UPGRADED);
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
