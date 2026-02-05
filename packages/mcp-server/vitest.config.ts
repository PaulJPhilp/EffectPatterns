import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ["src/test/setup-env.ts"],
      // Note: globalSetup removed to prevent port conflicts with stress/integration tests
      // Tests that need server setup should use their own globalSetup
      include: [
        "src/**/*.test.ts",           // Unit tests for services, utilities
        "src/**/__tests__/**/*.test.ts", // Co-located service tests
      ],
      exclude: [
        "**/*.integration.test.ts",   // Integration tests use vitest.integration.config.ts
        "tests/**/*.test.ts",         // All tests under tests/ use specific configs
        "**/.next/**",
      ],
      testTimeout: 30000,  // Unit tests should be fast
    },
  })
);
