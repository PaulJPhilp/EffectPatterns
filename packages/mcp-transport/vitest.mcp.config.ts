import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/mcp-protocol/**/*.test.ts"],
    setupFiles: ["tests/mcp-protocol/setup.ts"],
    testTimeout: 35_000,   // Network I/O and SDK communication need buffer
    hookTimeout: 30_000,   // SDK initialization (client.connect) takes time
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
