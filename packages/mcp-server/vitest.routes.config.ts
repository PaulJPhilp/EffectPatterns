import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["tests/routes/**/*.test.ts", "src/server/__tests__/**/*.test.ts"],
      setupFiles: ["src/test/setup-env.ts"],
      testTimeout: 45_000,   // Route handlers make DB calls
      hookTimeout: 30_000,   // Setup/teardown includes database operations
    },
  })
);
