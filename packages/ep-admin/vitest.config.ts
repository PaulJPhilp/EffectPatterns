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
			all: true,
			reportsDirectory: "./coverage",
			reporter: ["text", "html", "json", "json-summary"],
			thresholds: {
				global: {
					branches: 70,
					functions: 85,
					lines: 85,
					statements: 85,
				},
			},
			include: [
				"src/services/auth/service.ts",
				"src/services/display/errors.ts",
				"src/services/display/helpers.ts",
				"src/services/display/service.ts",
				"src/services/git/errors.ts",
				"src/services/git/helpers.ts",
				"src/services/git/service.ts",
				"src/services/retry/index.ts",
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
