import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/routes/**/*.test.ts", "src/server/__tests__/**/*.test.ts"],
    setupFiles: ["src/test/setup-env.ts"],
    testTimeout: 30_000,
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
