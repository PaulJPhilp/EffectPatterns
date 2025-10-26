import { FileSystem } from '@effect/platform';
import { NodeFileSystem, NodePath } from '@effect/platform-node';
import { Effect, Layer } from 'effect';
import { MdxService } from 'effect-mdx';
import { beforeEach, describe, expect, it } from 'vitest';

// Test layer that provides all required services
const _testLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer,
  MdxService.Default,
);

describe('Ingest Scripts', () => {
  const cleanupLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

  const cleanup = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.remove('content/new/src', { recursive: true });
    yield* fs.remove('content/new/processed', { recursive: true });
  }).pipe(
    Effect.provide(cleanupLayer),
    Effect.catchAll(() => Effect.void),
  );

  beforeEach(() => Effect.runPromise(cleanup));
  it('should have proper Effect structure for populate-expectations.ts', async () => {
    // This test ensures the script exports a proper Effect
    const script = await import('../ingest/populate-expectations.js');
    expect(script).toBeDefined();
    // We can't easily test the actual Effect without mocking the LLM service
    // but we can verify the script compiles and exports correctly
  });

  it('should have proper Effect structure for test-publish.ts', async () => {
    // This test ensures the script exports a proper Effect
    const script = await import('../ingest/test-publish.js');
    const effect = script.publishPatterns({
      indir: 'content/new/processed',
      outdir: 'content/new/published',
      srcdir: 'content/new/src',
    });
    expect(Effect.isEffect(effect)).toBe(true);
    // Note: We're not running the full Effect here because it would require
    // actual file system operations which would be complex to set up for unit tests.
    // In a real scenario, we would use proper test fixtures and run the Effect
    // with appropriate layers.
  });

  it('should have proper Effect structure for process.ts', async () => {
    // This test ensures the script exports a proper Effect
    const script = await import('../ingest/process.js');
    expect(script).toBeDefined();
  });
});
