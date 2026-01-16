import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/deployment/**/*.test.ts"],
    testTimeout: 60_000, // Network requests need more time
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
