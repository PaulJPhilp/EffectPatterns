import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/test/setup-env.ts"],
    // Only run unit tests in src/ directory (exclude integration tests)
    include: ["src/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/tests/**", // Exclude all tests/ directory (integration tests)
      "**/*.route.test.ts", // Exclude route tests (require running server)
      "**/*.integration.test.ts", // Exclude integration tests
      "**/server/init.test.ts", // Exclude server init test (complex dependencies)
    ],
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/**",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
    },
  },
});
