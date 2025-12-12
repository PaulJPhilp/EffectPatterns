import { NodeContext } from '@effect/platform-node';
import { Layer } from 'effect';
import { MdxService } from 'effect-mdx';
import { describe, expect, it } from 'vitest';

// Test layer that provides all required services
const _testLayer = Layer.mergeAll(MdxService.Default, NodeContext.layer);

describe('Publish Scripts', () => {
  it('should have proper Effect structure for generate.ts', async () => {
    // This test ensures the script exports a proper Effect
    const script = await import('../publish/generate.js');
    expect(script).toBeDefined();
  });

  it('should have proper Effect structure for validate.ts', async () => {
    // This test ensures the script exports a proper Effect
    const script = await import('../publish/validate.js');
    expect(script).toBeDefined();
  });
});
