import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "workflows",
    include: ["tests/workflows/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});
