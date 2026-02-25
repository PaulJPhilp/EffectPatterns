import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: "workflows",
      include: ["tests/workflows/**/*.test.ts"],
      setupFiles: ["src/test/setup-env.ts"],
      testTimeout: 60000,   // Multi-step workflows need time
      hookTimeout: 30000,   // Client initialization takes time
      fileParallelism: false, // E2E tests run sequentially (shared API instance)
    },
  })
);
