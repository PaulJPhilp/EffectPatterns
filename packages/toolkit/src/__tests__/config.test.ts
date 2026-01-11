/**
 * Tests for Toolkit Configuration Service
 */

import { Effect } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TOOLKIT_CONFIG, ToolkitConfig } from "../services/config.js";

describe("ToolkitConfig Service", () => {
	beforeEach(() => {
		// Clear environment variables before each test
		delete process.env.TOOLKIT_MAX_SEARCH_RESULTS;
		delete process.env.TOOLKIT_SEARCH_TIMEOUT_MS;
		delete process.env.TOOLKIT_LOAD_TIMEOUT_MS;
		delete process.env.TOOLKIT_CACHE_TTL_MS;
		delete process.env.TOOLKIT_MAX_CACHE_SIZE;
		delete process.env.TOOLKIT_ENABLE_CACHE;
		delete process.env.TOOLKIT_ENABLE_LOGGING;
		delete process.env.TOOLKIT_ENABLE_METRICS;
	});

	it("should provide default configuration", async () => {
		const program = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const config = yield* configService.getConfig();
			expect(config).toEqual(DEFAULT_TOOLKIT_CONFIG);
		});

		await Effect.runPromise(
			Effect.provide(program, ToolkitConfig.Default)
		);
	});

	it("should load configuration from environment variables", async () => {
		// Set environment variables
		process.env.TOOLKIT_MAX_SEARCH_RESULTS = "200";
		process.env.TOOLKIT_SEARCH_TIMEOUT_MS = "10000";
		process.env.TOOLKIT_LOAD_TIMEOUT_MS = "20000";
		process.env.TOOLKIT_CACHE_TTL_MS = "600000";
		process.env.TOOLKIT_MAX_CACHE_SIZE = "2000";
		process.env.TOOLKIT_ENABLE_CACHE = "false";
		process.env.TOOLKIT_ENABLE_LOGGING = "true";
		process.env.TOOLKIT_ENABLE_METRICS = "true";

		const program = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const config = yield* configService.getConfig();

			expect(config.maxSearchResults).toBe(200);
			expect(config.searchTimeoutMs).toBe(10000);
			expect(config.loadTimeoutMs).toBe(20000);
			expect(config.cacheTtlMs).toBe(600000);
			expect(config.maxCacheSize).toBe(2000);
			expect(config.enableCache).toBe(false);
			expect(config.enableLogging).toBe(true);
			expect(config.enableMetrics).toBe(true);
		});

		await Effect.runPromise(
			Effect.provide(program, ToolkitConfig.Default)
		);
	});

	it("should handle invalid environment variables gracefully", async () => {
		// Set invalid environment variables
		process.env.TOOLKIT_MAX_SEARCH_RESULTS = "invalid";
		process.env.TOOLKIT_SEARCH_TIMEOUT_MS = "invalid";

		const program = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const config = yield* configService.getConfig();

			// Should fall back to defaults for invalid values
			expect(config.maxSearchResults).toBe(DEFAULT_TOOLKIT_CONFIG.maxSearchResults);
			expect(config.searchTimeoutMs).toBe(DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs);
		});

		await Effect.runPromise(
			Effect.provide(program, ToolkitConfig.Default)
		);
	});

	it("should provide individual configuration getters", async () => {
		const program = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const maxResults = yield* configService.getMaxSearchResults();
			const timeout = yield* configService.getSearchTimeoutMs();
			const loadTimeout = yield* configService.getLoadTimeoutMs();
			const cacheTtl = yield* configService.getCacheTtlMs();
			const maxCacheSize = yield* configService.getMaxCacheSize();
			const cacheEnabled = yield* configService.isCacheEnabled();
			const loggingEnabled = yield* configService.isLoggingEnabled();
			const metricsEnabled = yield* configService.isMetricsEnabled();

			expect(maxResults).toBe(DEFAULT_TOOLKIT_CONFIG.maxSearchResults);
			expect(timeout).toBe(DEFAULT_TOOLKIT_CONFIG.searchTimeoutMs);
			expect(loadTimeout).toBe(DEFAULT_TOOLKIT_CONFIG.loadTimeoutMs);
			expect(cacheTtl).toBe(DEFAULT_TOOLKIT_CONFIG.cacheTtlMs);
			expect(maxCacheSize).toBe(DEFAULT_TOOLKIT_CONFIG.maxCacheSize);
			expect(cacheEnabled).toBe(DEFAULT_TOOLKIT_CONFIG.enableCache);
			expect(loggingEnabled).toBe(DEFAULT_TOOLKIT_CONFIG.enableLogging);
			expect(metricsEnabled).toBe(DEFAULT_TOOLKIT_CONFIG.enableMetrics);
		});

		await Effect.runPromise(
			Effect.provide(program, ToolkitConfig.Default)
		);
	});

	it("should handle boolean environment variables correctly", async () => {
		// Test cache enabled (default true, false when set to "false")
		process.env.TOOLKIT_ENABLE_CACHE = "false";

		const program1 = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const cacheEnabled = yield* configService.isCacheEnabled();
			expect(cacheEnabled).toBe(false);
		});

		await Effect.runPromise(
			Effect.provide(program1, ToolkitConfig.Default)
		);

		// Test cache enabled (true when not set or set to anything other than "false")
		delete process.env.TOOLKIT_ENABLE_CACHE;

		const program2 = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const cacheEnabled = yield* configService.isCacheEnabled();
			expect(cacheEnabled).toBe(true);
		});

		await Effect.runPromise(
			Effect.provide(program2, ToolkitConfig.Default)
		);

		// Test logging enabled (false by default, true when set to "true")
		process.env.TOOLKIT_ENABLE_LOGGING = "true";

		const program3 = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const loggingEnabled = yield* configService.isLoggingEnabled();
			expect(loggingEnabled).toBe(true);
		});

		await Effect.runPromise(
			Effect.provide(program3, ToolkitConfig.Default)
		);

		// Test metrics enabled (false by default, true when set to "true")
		process.env.TOOLKIT_ENABLE_METRICS = "true";

		const program4 = Effect.gen(function* () {
			const configService = yield* ToolkitConfig;
			const metricsEnabled = yield* configService.isMetricsEnabled();
			expect(metricsEnabled).toBe(true);
		});

		await Effect.runPromise(
			Effect.provide(program4, ToolkitConfig.Default)
		);
	});
});
