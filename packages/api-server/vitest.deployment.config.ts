import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["tests/deployment/**/*.test.ts"],
      setupFiles: ["tests/deployment/setup.ts"],  // Validates required env vars (API keys, environment)
      testTimeout: 90_000,    // Remote API calls with retries need buffer
      hookTimeout: 30_000,    // Setup validation needs time
      fileParallelism: false, // Sequential execution prevents rate limit issues
    },
  })
);
