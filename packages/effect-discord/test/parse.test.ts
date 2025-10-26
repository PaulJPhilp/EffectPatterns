import { describe, expect, it } from 'bun:test';
import { FileSystem } from '@effect/platform/FileSystem';
import { Path } from '@effect/platform/Path';
import { NodeContext, NodeFileSystem, NodePath } from '@effect/platform-node';
import { Effect, Layer } from 'effect';
import type { ChannelExport } from '../src/index.js';

const EXPECTED_MESSAGE_COUNT = 8;

const TestLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeFileSystem.layer,
  NodePath.layer,
);

describe('Discord export fixture', () => {
  it('should load and parse messages', async () => {
    const program = Effect.gen(function* () {
      const fs = yield* FileSystem;
      const path = yield* Path;
      const fixturePath = path.resolve(
        process.cwd(),
        'scripts',
        'analyzer',
        'test-data',
        'mock-export.json',
      );
      const raw = yield* fs.readFileString(fixturePath);
      const parsed = JSON.parse(raw) as ChannelExport;
      return parsed.messages as ChannelExport['messages'];
    });

    const messages = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, TestLayer)) as Effect.Effect<
        ChannelExport['messages'],
        never,
        never
      >,
    );

    expect(messages.length).toBe(EXPECTED_MESSAGE_COUNT);
    const first = messages[0];
    expect(first.id).toBe('1111111111');
    expect(first.content.includes('layers')).toBeTrue();
    expect(first.author.name).toBe('alex_newdev');
  });

  it('should include the bot entry for filtering tests', async () => {
    const program = Effect.gen(function* () {
      const fs = yield* FileSystem;
      const path = yield* Path;
      const fixturePath = path.resolve(
        process.cwd(),
        'scripts',
        'analyzer',
        'test-data',
        'mock-export.json',
      );
      const raw = yield* fs.readFileString(fixturePath);
      const parsed = JSON.parse(raw) as ChannelExport;
      return parsed.messages.find((msg) => msg.author.name === 'GitHubBot') as
        | ChannelExport['messages'][number]
        | undefined;
    });

    const botMessage = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, TestLayer)) as Effect.Effect<
        ChannelExport['messages'][number] | undefined,
        never,
        never
      >,
    );

    expect(botMessage).toBeDefined();
    if (botMessage) {
      expect(botMessage.content.includes('bot message')).toBeTrue();
    }
  });
});
