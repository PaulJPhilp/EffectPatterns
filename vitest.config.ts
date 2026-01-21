import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      api: path.resolve(__dirname, "api"),
      packages: path.resolve(__dirname, "packages"),
      server: path.resolve(__dirname, "server"),
    },
  },
  test: {
    // Run tests sequentially to avoid port conflicts
    fileParallelism: false,
    // Increase timeout for integration tests
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Show verbose output
    reporters: ["verbose"],
  },
});
