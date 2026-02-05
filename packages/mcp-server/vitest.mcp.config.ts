import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["tests/mcp-protocol/**/*.test.ts"],
      setupFiles: ["tests/mcp-protocol/setup.ts"],
      testTimeout: 35_000,   // Network I/O and SDK communication need buffer
      hookTimeout: 30_000,   // SDK initialization (client.connect) takes time
    },
  })
);
