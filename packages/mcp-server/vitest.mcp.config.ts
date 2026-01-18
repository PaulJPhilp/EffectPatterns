import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/mcp-protocol/**/*.test.ts"],
    setupFiles: ["tests/mcp-protocol/setup.ts"],
    testTimeout: 30_000, // MCP communication needs more time
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
    },
  },
});
