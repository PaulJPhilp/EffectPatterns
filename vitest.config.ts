import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests sequentially to avoid port conflicts
    fileParallelism: false,
    // Increase timeout for integration tests
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Show verbose output
    reporters: ['verbose'],
  },
});
