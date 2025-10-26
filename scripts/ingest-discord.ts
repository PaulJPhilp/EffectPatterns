import { FileSystem } from '@effect/platform/FileSystem';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Config, Effect, Layer, Logger, LogLevel } from 'effect';
import {
  Discord,
  DiscordConfig,
} from '../packages/effect-discord/dist/index.js';
import { DiscordLive } from '../packages/effect-discord/dist/layer.js';

// 1. Define the configuration layer for our script.
// This layer reads environment variables and provides them as a DiscordConfig service.
const DiscordConfigLive = Layer.effect(
  DiscordConfig,
  Effect.gen(function* () {
    const botToken = yield* Config.secret('DISCORD_BOT_TOKEN');
    const exporterPath = yield* Config.string('DISCORD_EXPORTER_PATH');

    return DiscordConfig.of({
      botToken,
      exporterPath,
    });
  }),
);

// 2. Define the main application logic as a single Effect.
const program = Effect.gen(function* () {
  yield* Effect.logInfo('Starting Discord channel export...');

  const discord = yield* Discord;
  const fs = yield* FileSystem;

  // Get the channel ID from environment variables.
  const channelId = yield* Config.string('DISCORD_CHANNEL_ID');

  // Export the channel data using our service.
  const channelExport = yield* discord.exportChannel(channelId);

  yield* Effect.log(
    `Successfully exported ${channelExport.messages.length} messages.`,
  );
  yield* Effect.log('Anonymizing user data...');

  // Basic anonymization: map user IDs to pseudonyms.
  const userIdMap = new Map<string, string>();
  let userCounter = 1;

  const anonymizedMessages = channelExport.messages.map((message: any) => {
    const authorId = message.author.id;
    if (!userIdMap.has(authorId)) {
      userIdMap.set(authorId, `user_${userCounter++}`);
    }
    return {
      ...message,
      author: {
        ...message.author,
        id: userIdMap.get(authorId)!,
        name: userIdMap.get(authorId)!,
      },
    };
  });

  // Define the output path for the curated dataset.
  const outputPath = 'content/discord/beginner-questions.json';

  yield* Effect.log(`Saving anonymized data to ${outputPath}...`);

  // 3. Write the anonymized data to a JSON file.
  yield* fs.makeDirectory('content/discord', { recursive: true });
  yield* fs.writeFileString(
    outputPath,
    JSON.stringify({ messages: anonymizedMessages }, null, 2),
  );

  yield* Effect.logInfo('Export complete!');
});

// 4. Compose the final layer for our application.
// This provides all the necessary dependencies for the program to run.
const MainLayer = DiscordLive.pipe(
  Layer.provide(DiscordConfigLive),
  Layer.provide(NodeContext.layer),
  Layer.provide(Logger.minimumLogLevel(LogLevel.Info)),
);

// 5. Create an executable version of our program with the layer provided.
const runnable = program.pipe(
  Effect.provide(MainLayer),
  Effect.provide(NodeContext.layer),
);

// 6. Run the program using the Node.js runtime.
NodeRuntime.runMain(runnable);
