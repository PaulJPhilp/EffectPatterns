/**
 * Integration tests for the Discord service
 *
 * These tests connect to the real Discord API using DiscordChatExporter.Cli
 *
 * Prerequisites:
 * 1. Set DISCORD_BOT_TOKEN in .env
 * 2. Set DISCORD_TEST_CHANNEL_ID in .env (a channel the bot has access to)
 * 3. Download DiscordChatExporter.Cli to tools/ directory
 *
 * To run:
 *   bun test packages/effect-discord/test/integration.test.ts
 *
 * To skip (for CI):
 *   Set SKIP_INTEGRATION_TESTS=true
 */

import { describe, expect, test } from 'bun:test';
import { NodeContext } from '@effect/platform-node';
import { Effect, Exit, Layer, Secret } from 'effect';
import {
  type ChannelExport,
  Discord,
  DiscordConfig,
  DiscordExportError,
} from '../dist/index.js';
import { DiscordLive } from '../dist/layer.js';

// Skip integration tests if environment variable is set
const SKIP_TESTS = process.env.SKIP_INTEGRATION_TESTS === 'true';

// Check for required environment variables
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TEST_CHANNEL_ID = process.env.DISCORD_TEST_CHANNEL_ID;
const EXPORTER_PATH =
  process.env.DISCORD_EXPORTER_PATH || './tools/DiscordChatExporter.Cli';

const shouldSkip = SKIP_TESTS || !BOT_TOKEN || !TEST_CHANNEL_ID;

if (shouldSkip && !SKIP_TESTS) {
  console.warn(`
⚠️  Integration tests will be skipped because required environment variables are not set.

Required:
  - DISCORD_BOT_TOKEN: Your Discord bot token
  - DISCORD_TEST_CHANNEL_ID: A channel ID the bot has access to
  - DISCORD_EXPORTER_PATH: Path to DiscordChatExporter.Cli (optional, defaults to ./tools/DiscordChatExporter.Cli)

To set up:
  1. Create a Discord bot at https://discord.com/developers/applications
  2. Invite the bot to a test server
  3. Get a channel ID (right-click a channel → Copy ID)
  4. Add to .env:
     DISCORD_BOT_TOKEN="your-bot-token"
     DISCORD_TEST_CHANNEL_ID="your-channel-id"
     DISCORD_EXPORTER_PATH="./tools/DiscordChatExporter.Cli"

To skip these warnings, set: SKIP_INTEGRATION_TESTS=true
`);
}

describe('Discord Integration Tests', () => {
  // Create the configuration layer
  const ConfigLive = Layer.succeed(DiscordConfig, {
    botToken: Secret.fromString(BOT_TOKEN || 'mock-token'),
    exporterPath: EXPORTER_PATH,
  });

  // Compose all layers
  const TestLayer = DiscordLive.pipe(
    Layer.provide(ConfigLive),
    Layer.provide(NodeContext.layer),
  );

  // Helper to run an Effect with our test layer
  const runTest = <E, A>(effect: Effect.Effect<A, E, Discord>) =>
    Effect.runPromise(
      effect.pipe(Effect.provide(TestLayer), Effect.provide(NodeContext.layer)),
    );

  test.skipIf(shouldSkip)(
    'should export messages from a real Discord channel',
    async () => {
      const channelId = TEST_CHANNEL_ID;

      if (!channelId) {
        throw new Error(
          'DISCORD_TEST_CHANNEL_ID environment variable is missing',
        );
      }

      const program = Effect.gen(function* () {
        const discord = yield* Discord;
        const result = yield* discord.exportChannel(channelId);
        return result;
      });

      const result = await runTest(program);

      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);

      // Verify we got at least one message (assuming the test channel has messages)
      expect(result.messages.length).toBeGreaterThan(0);

      // Verify message structure
      const firstMessage = result.messages[0];
      expect(firstMessage.id).toBeDefined();
      expect(firstMessage.content).toBeDefined();
      expect(firstMessage.author).toBeDefined();
      expect(firstMessage.author.id).toBeDefined();
      expect(firstMessage.author.name).toBeDefined();
    },
    30_000,
  ); // 30 second timeout for API call

  test.skipIf(shouldSkip)(
    'should handle invalid channel ID gracefully',
    async () => {
      const program = Effect.gen(function* () {
        const discord = yield* Discord;
        return yield* discord.exportChannel('invalid-channel-id');
      });

      const exit = await Effect.runPromise(
        program.pipe(
          Effect.provide(TestLayer),
          Effect.provide(NodeContext.layer),
          Effect.exit,
        ),
      );

      // Should fail with DiscordExportError
      expect(Exit.isFailure(exit)).toBe(true);

      if (Exit.isFailure(exit)) {
        const error = exit.cause;
        // The error should be a DiscordExportError with reason "CommandFailed"
        expect(error).toBeDefined();
      }
    },
    30_000,
  );

  test.skipIf(shouldSkip)(
    'should export messages with correct structure',
    async () => {
      const channelId = TEST_CHANNEL_ID;

      if (!channelId) {
        throw new Error(
          'DISCORD_TEST_CHANNEL_ID environment variable is missing',
        );
      }

      const program = Effect.gen(function* () {
        const discord = yield* Discord;
        return yield* discord.exportChannel(channelId);
      });

      const result = await runTest(program);

      // Verify all messages have required fields
      result.messages.forEach((message) => {
        expect(typeof message.id).toBe('string');
        expect(typeof message.content).toBe('string');
        expect(message.author).toBeDefined();
        expect(typeof message.author.id).toBe('string');
        expect(typeof message.author.name).toBe('string');
      });
    },
    30_000,
  );

  test('should have correct service interface', async () => {
    const program = Effect.gen(function* () {
      const discord = yield* Discord;

      // Verify the service has the expected method
      expect(typeof discord.exportChannel).toBe('function');

      return 'ok';
    });

    const result = await runTest(program);
    expect(result).toBe('ok');
  });
});

describe('Discord Error Handling', () => {
  test('should create proper error types', () => {
    const error = new DiscordExportError({
      reason: 'CommandFailed',
      cause: new Error('Test error'),
    });

    expect(error._tag).toBe('DiscordExportError');
    expect(error.reason).toBe('CommandFailed');
    expect(error.cause).toBeDefined();
  });

  test('should support all error reasons', () => {
    const reasons: Array<DiscordExportError['reason']> = [
      'CommandFailed',
      'FileNotFound',
      'JsonParseError',
    ];

    reasons.forEach((reason) => {
      const error = new DiscordExportError({ reason });
      expect(error.reason).toBe(reason);
    });
  });
});

describe('Discord Data Models', () => {
  test('should create ChannelExport instances', () => {
    const channelExport: ChannelExport = {
      messages: [
        {
          id: '123',
          content: 'Test message',
          author: {
            id: '456',
            name: 'TestUser',
          },
        },
      ],
    };

    expect(channelExport.messages).toHaveLength(1);
    expect(channelExport.messages[0].id).toBe('123');
  });
});
