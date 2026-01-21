import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/test/setup-env.ts"],
    include: [
      "src/**/*.integration.test.ts",
      "src/server/init.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Resolve .ts and .js files
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    },
  },
});
