import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: [
      "src/**/*.test.ts",
      "src/**/__tests__/**/*.test.ts",
    ],
    exclude: [
      "**/.next/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "src/mcp-stdio.ts",
        "src/mcp-streamable-http.ts",
        "src/mcp-production-client.ts",
        "src/auth/oauth-server.ts",
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 75,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
