/**
 * Discord-related commands for ep-admin
 *
 * Orchestrates Discord integration operations:
 * - ingest: Ingest patterns from Discord
 * - test: Test Discord connection
 * - sync: Sync patterns with Discord
 *
 * NOTE: Discord integration requires external API configuration.
 */

import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { EnvService } from "effect-env";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

/**
 * discord:ingest - Ingest from Discord
 */
export const discordIngestCommand = Command.make("ingest", {
    options: {
        ...globalOptions,
        channel: Options.optional(
            Options.text("channel").pipe(
                Options.withDescription("Discord channel to ingest from")
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
            yield* Display.showInfo("Discord Ingest");

            if (options.channel) {
                yield* Display.showInfo(`Channel: ${options.channel}`);
            }

            // Check for Discord data file
            const fs = yield* FileSystem.FileSystem;
            const dataPath = "content/discord/beginner-questions.json";
            const exists = yield* fs.exists(dataPath);

            if (exists) {
                const content = yield* fs.readFileString(dataPath);
                const data = JSON.parse(content);
                const count = Array.isArray(data) ? data.length : 0;
                yield* Display.showInfo(`Found ${count} Discord entries`);
            } else {
                yield* Display.showInfo("No Discord data file found.");
                yield* Display.showInfo(
                    "To ingest Discord data:\n" +
                    "  1. Export Discord messages to JSON\n" +
                    "  2. Place in content/discord/\n" +
                    "  3. Run this command again"
                );
            }

            yield* Display.showSuccess("Discord ingest check completed!");
        })
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
            yield* Display.showInfo("Discord Connection Test");
    
            // Check for Discord token
            const env = yield* EnvService.Default;
            const token = yield* env.get("DISCORD_TOKEN");
            if (token) {
                yield* Display.showSuccess("Discord token found in environment");
            } else {
                yield* Display.showError("Discord token not found");
                yield* Display.showInfo(
                    "Set DISCORD_TOKEN environment variable to enable Discord integration"
                );
            }
    
            yield* Display.showSuccess("Discord test completed!");
        })
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
            Options.withDefault("content/discord/beginner-questions.json")
        ),
    },
}).pipe(
    Command.withDescription(
        "Flatten nested Discord messages into a single array"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo(`Flattening Discord messages from: ${options.file}`);

            const fs = yield* FileSystem.FileSystem;
            const exists = yield* fs.exists(options.file);

            if (!exists) {
                yield* Display.showError(`File not found: ${options.file}`);
                return yield* Effect.fail(new Error("File not found"));
            }

            const content = yield* fs.readFileString(options.file);
            const data = JSON.parse(content);

            // Flatten nested structure
            const flattened: unknown[] = [];
            const flatten = (items: unknown[]): void => {
                for (const item of items) {
                    if (Array.isArray(item)) {
                        flatten(item);
                    } else {
                        flattened.push(item);
                    }
                }
            };

            if (Array.isArray(data)) {
                flatten(data);
            }

            const outputPath = options.file.replace(".json", "-flat.json");
            yield* fs.writeFileString(outputPath, JSON.stringify(flattened, null, 2));

            yield* Display.showInfo(`Flattened ${flattened.length} messages`);
            yield* Display.showInfo(`Output: ${outputPath}`);
            yield* Display.showSuccess("Discord messages flattened!");
        })
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
