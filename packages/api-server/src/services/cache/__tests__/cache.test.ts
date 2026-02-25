import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";
import { MCPCacheService } from "../index";

const TestLayer = Layer.provideMerge(
	MCPCacheService.Default,
	Layer.provideMerge(
		MCPLoggerService.Default,
		MCPConfigService.Default
	)
);

describe("MCPCacheService", () => {
	it("should cache and retrieve values", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				// Set a value
				yield* cache.set("test-key", "test-value", 5000);

				// Get the value
				const getResult = yield* cache.get("test-key");

				return getResult;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.hit).toBe(true);
		expect(result.value).toBe("test-value");
		expect(result.stats.entries).toBe(1);
	});

	it("should handle cache misses", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				const getResult = yield* cache.get("nonexistent-key");

				return getResult;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.hit).toBe(false);
		expect(result.value).toBeUndefined();
	});

	it("should support getOrSet pattern", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				const value = yield* cache.getOrSet(
					"test-key-2",
					() => Effect.succeed("computed-value"),
					5000
				);

				return value;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe("computed-value");
	});

	it("should delete cached values", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				yield* cache.set("delete-test", "value");
				const existed = yield* cache.del("delete-test");
				const getResult = yield* cache.get("delete-test");

				return { existed, hit: getResult.hit };
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.existed).toBe(true);
		expect(result.hit).toBe(false);
	});

	it("should provide cache statistics", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				yield* cache.set("stats-key", "stats-value");
				const stats = yield* cache.getStats();

				return stats;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.entries).toBe(1);
		expect(result.hits).toBe(0); // No hits yet
		expect(result.misses).toBe(0);
	});

	it("should set and get values", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				// Set a value
				yield* cache.set("test-key", "test-value");

				// Get the value
				const result = yield* cache.get("test-key");

				expect(result.hit).toBe(true);
				expect(result.value).toBe("test-value");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should return miss for non-existent keys", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				const result = yield* cache.get("non-existent-key");

				expect(result.hit).toBe(false);
				expect(result.value).toBeUndefined();

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should check if key exists", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				// Initially should not exist
				const exists1 = yield* cache.has("test-key");
				expect(exists1).toBe(false);

				// Set a value
				yield* cache.set("test-key", "test-value");

				// Should exist now
				const exists2 = yield* cache.has("test-key");
				expect(exists2).toBe(true);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should delete keys", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				// Set a value
				yield* cache.set("test-key", "test-value");

				// Verify it exists
				const exists1 = yield* cache.has("test-key");
				expect(exists1).toBe(true);

				// Delete the key
				const deleted = yield* cache.del("test-key");
				expect(deleted).toBe(true);

				// Verify it's gone
				const exists2 = yield* cache.has("test-key");
				expect(exists2).toBe(false);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should clear all keys", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				// Set multiple values
				yield* cache.set("key1", "value1");
				yield* cache.set("key2", "value2");
				yield* cache.set("key3", "value3");

				// Clear all
				yield* cache.clear();

				// Verify they're all gone
				expect(yield* cache.has("key1")).toBe(false);
				expect(yield* cache.has("key2")).toBe(false);
				expect(yield* cache.has("key3")).toBe(false);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should handle TTL expiration", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				// Set a value with very short TTL (50ms)
				yield* cache.set("ttl-key", "ttl-value", 50);

				// Should be available immediately
				const result1 = yield* cache.get("ttl-key");
				expect(result1.hit).toBe(true);

				// Wait for expiration
				yield* Effect.sleep(100);

				// Should be expired now
				const result2 = yield* cache.get("ttl-key");
				expect(result2.hit).toBe(false);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should warm up cache with initial data", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;

				// Warm up with initial data
				yield* cache.warmup(
					["warm-key-1", "warm-key-2", "warm-key-3"],
					(key) => Effect.succeed(`warm-value-${key.split("-")[2]}`)
				);

				// Verify warm-up data exists
				const result1 = yield* cache.get("warm-key-1");
				const result2 = yield* cache.get("warm-key-2");
				const result3 = yield* cache.get("warm-key-3");

				expect(result1.hit).toBe(true);
				expect(result1.value).toBe("warm-value-1");
				expect(result2.hit).toBe(true);
				expect(result2.value).toBe("warm-value-2");
				expect(result3.hit).toBe(true);
				expect(result3.value).toBe("warm-value-3");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should check if cache is enabled", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const cache = yield* MCPCacheService;
				const config = yield* MCPConfigService;

				const enabled = yield* cache.isEnabled();
				const configEnabled = config.cacheEnabled;

				expect(enabled).toBe(configEnabled);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});
});
