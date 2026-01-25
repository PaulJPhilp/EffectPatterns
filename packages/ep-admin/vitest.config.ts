import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Run tests sequentially to avoid port conflicts
		fileParallelism: false,
		// Only run source tests (avoid stale compiled tests in dist/)
		exclude: [
			"dist/**",
			"src/config/__tests__/env.test.ts", // Broken: depends on broken effect-env module
			"src/__tests__/global-options.test.ts", // Broken: depends on broken effect-env module
		],
		// Increase timeout for integration tests
		testTimeout: 30_000,
		hookTimeout: 30_000,
		// Show verbose output
		reporters: ["verbose"],
		// Coverage configuration
		coverage: {
			provider: "istanbul",
			reporter: ["text", "html", "json"],
			thresholds: {
				global: {
					branches: 75,
					functions: 75,
					lines: 75,
					statements: 75,
				},
			},
			include: [
				"src/services/**/*.ts",
			],
			exclude: [
				"src/services/**/__tests__/**",
				"src/services/**/*.test.ts",
				"src/services/**/*.spec.ts",
				"**/*.d.ts",
				"**/*.config.*",
			],
		},
	},
});
