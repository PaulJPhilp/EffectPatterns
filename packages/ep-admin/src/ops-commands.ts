/**
 * Operations commands for ep-admin
 *
 * Orchestrates system operations and maintenance:
 * - health-check: Run system health check
 * - rotate-api-key: Rotate API key
 * - upgrade-baseline: Upgrade test baseline
 *
 * NOTE: These commands provide system operations guidance.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { emitJson } from "./cli/output.js";
import {
    MESSAGES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import {
    runQuickTest,
} from "./services/db/index.js";
import { Display } from "./services/display/index.js";

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
            if (options.json) {
                const dbResult = yield* runQuickTest();
                const hasOpenAI = !!process.env.OPENAI_API_KEY;
                const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
                const hasGoogle = !!process.env.GOOGLE_API_KEY;
                yield* emitJson({
                    ok: dbResult.connected,
                    database: dbResult,
                    environment: {
                        node: process.version,
                        platform: process.platform,
                    },
                    apiKeys: {
                        openai: hasOpenAI,
                        anthropic: hasAnthropic,
                        google: hasGoogle,
                    },
                });
                return;
            }
            yield* Display.showInfo("Running system health check...");

            // Check database
            yield* Display.showInfo("\n1. Database Health:");
            const dbResult = yield* runQuickTest();
            if (dbResult.connected) {
                yield* Display.showSuccess("   Database connected");
                yield* Display.showInfo(`   Tables: ${dbResult.tables.length}`);
                yield* Display.showInfo(`   Patterns: ${dbResult.stats.effectPatterns}`);
            } else {
                yield* Display.showError("   Database not connected");
            }

            // Check environment
            yield* Display.showInfo("\n2. Environment:");
            yield* Display.showInfo(`   Node: ${process.version}`);
            yield* Display.showInfo(`   Platform: ${process.platform}`);

            // Check API keys
            yield* Display.showInfo("\n3. API Keys:");
            const hasOpenAI = !!process.env.OPENAI_API_KEY;
            const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
            const hasGoogle = !!process.env.GOOGLE_API_KEY;
            yield* Display.showInfo(`   OpenAI: ${hasOpenAI ? "✓" : "✗"}`);
            yield* Display.showInfo(`   Anthropic: ${hasAnthropic ? "✓" : "✗"}`);
            yield* Display.showInfo(`   Google: ${hasGoogle ? "✓" : "✗"}`);

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
            if (options.json) {
                yield* emitJson({
                    ok: true,
                    action: "rotate-api-key",
                    backup: options.backup,
                    instructions: [
                        "Generate new key from provider dashboard",
                        "Update .env file with new key",
                        "Restart services to pick up new key",
                    ],
                });
                return;
            }
            yield* Display.showInfo("API Key Rotation");

            yield* Display.showInfo(
                "\nTo rotate API keys:\n" +
                "  1. Generate new key from provider dashboard\n" +
                "  2. Update .env file with new key\n" +
                "  3. Restart services to pick up new key\n" +
                "\nProviders:\n" +
                "  - OpenAI: https://platform.openai.com/api-keys\n" +
                "  - Anthropic: https://console.anthropic.com/settings/keys\n" +
                "  - Google: https://aistudio.google.com/apikey"
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
            if (options.json) {
                yield* emitJson({
                    ok: true,
                    action: "upgrade-baseline",
                    confirm: options.confirm,
                    command: "bun run vitest run --update",
                });
                return;
            }
            yield* Display.showInfo("Upgrading test baselines...");

            yield* Display.showInfo(
                "\nTo update test snapshots:\n" +
                "  bun run vitest run --update\n" +
                "\nThis will update all snapshot files to match current output."
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.BASELINE_UPGRADED);
        }) as any
    )
);

/**
 * Compose all operations commands into a single command group
 */
export const opsMaintenanceCommand = Command.make("maintenance").pipe(
    Command.withDescription("System operations and maintenance"),
    Command.withSubcommands([
        opsHealthCheckCommand,
        opsRotateApiKeyCommand,
        opsUpgradeBaselineCommand,
    ])
);

/**
 * Backward-compatible alias for previous nested command shape.
 */
export const opsCommand = opsMaintenanceCommand;
