/**
 * Discord-related commands for ep-admin
 *
 * Orchestrates Discord integration operations:
 * - ingest: Ingest patterns from Discord
 * - test: Test Discord connection
 * - sync: Sync patterns with Discord
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { showInfo, showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * discord:ingest - Ingest from Discord
 */
export const discordIngestCommand = Command.make("ingest", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed ingest output"),
            Options.withDefault(false)
        ),
        channel: Options.optional(
            Options.text("channel").pipe(
                Options.withDescription("Discord channel to ingest from (e.g., patterns, feedback)")
            )
        ),
    },
}).pipe(
    Command.withDescription(
        "Ingest patterns and feedback from Discord channels"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            if (options.channel) {
                yield* showInfo(`Ingesting from Discord channel: ${options.channel}`);
            }

            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/ingest-discord.ts"),
                "Ingesting from Discord",
                { verbose: options.verbose, channel: options.channel }
            );

            yield* showSuccess("Discord ingest completed!");
        }) as any
    )
);

/**
 * discord:test - Test Discord connection
 */
export const discordTestCommand = Command.make("test", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test Discord bot connection and permissions"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-discord-simple.ts"),
                "Testing Discord connection",
                { verbose: options.verbose }
            );

            yield* showSuccess("Discord connection test passed!");
        }) as any
    )
);

/**
 * Compose all Discord commands into a single command group
 */
export const discordCommand = Command.make("discord").pipe(
    Command.withDescription("Discord integration operations"),
    Command.withSubcommands([
        discordIngestCommand,
        discordTestCommand,
    ])
);
