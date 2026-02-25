/**
 * Shared Vitest Base Configuration
 *
 * Provides common settings for all test configurations to reduce duplication:
 * - Global test utilities (expect, describe, it, etc.)
 * - Node environment
 * - Path alias (@) for imports
 * - Coverage configuration
 *
 * Each specific config (unit, mcp, routes, etc.) extends this base with
 * custom timeouts, include patterns, and setup files.
 *
 * Usage in other configs:
 *   import path from "path";
 *   import { defineConfig, mergeConfig } from "vitest/config";
 *   import baseConfig from "./vitest.config.base";
 *
 *   export default mergeConfig(baseConfig, defineConfig({
 *     test: {
 *       include: ["tests/my-tests/**\/*.test.ts"],
 *       testTimeout: 30000,
 *     },
 *   }));
 */

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Global test utilities (expect, describe, it, beforeAll, etc.)
    // Available without imports: describe(...), it(...), expect(...)
    globals: true,

    // Run tests in Node environment (not browser/jsdom)
    environment: "node",

    // Default timeout for all tests (can be overridden per config)
    // This is a fallback; each config should set its own appropriate timeout
    testTimeout: 30000,

    // Coverage configuration for all test types
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/setup.ts",
        "**/setup/**",
      ],
    },
  },

  // Path alias for cleaner imports
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
