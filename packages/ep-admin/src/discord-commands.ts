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
import {
	MESSAGES,
	SCRIPTS,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import { Execution } from "./services/execution/index.js";

const PROJECT_ROOT = process.cwd();

/**
 * discord:ingest - Ingest from Discord
 */
export const discordIngestCommand = Command.make("ingest", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);

            if (options.channel) {
                yield* Display.showInfo(`Ingesting from Discord channel: ${options.channel}`);
            }

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.DISCORD.INGEST),
                "Ingesting from Discord",
                { verbose: options.verbose }
            );

            yield* Display.showSuccess("Discord ingest completed!");
        }) as any
    )
);

/**
 * discord:test - Test Discord connection
 */
export const discordTestCommand = Command.make("test", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test Discord bot connection and permissions"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-discord-simple.ts"),
                "Testing Discord connection",
                { verbose: options.verbose }
            );

            yield* Display.showSuccess("Discord connection test passed!");
        }) as any
    )
);

/**
 * discord:flatten - Flatten nested Discord messages
 */
export const discordFlattenCommand = Command.make("flatten", {
    options: {
        ...globalOptions,
        file: Options.text("file").pipe(
            Options.withDescription("Path to Discord QnA JSON file"),
            Options.withDefault("packages/data/discord-qna.json")
        ),
    },
}).pipe(
    Command.withDescription(
        "Flatten nested Discord messages into a single array"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.DISCORD.FLATTEN_QNA),
                "Flattening Discord messages",
                { verbose: options.verbose }
            );

            yield* Display.showSuccess("Discord messages flattened!");
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
        discordFlattenCommand,
    ])
);
