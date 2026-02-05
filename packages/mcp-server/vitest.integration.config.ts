import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    },
    test: {
      setupFiles: ["src/test/setup-env.ts"],
      globalSetup: ["src/test/global-setup.ts"], // Starts Next.js dev server on :3000
      include: [
        "src/**/*.integration.test.ts",
        "src/server/init.test.ts",
        "tests/integration/**/*.test.ts",
      ],
      testTimeout: 45_000,   // HTTP calls + server startup need time
      hookTimeout: 30_000,   // BeforeAll/afterAll needs sufficient time
      fileParallelism: false, // Integration tests run sequentially (shared server instance)
    },
  })
);
