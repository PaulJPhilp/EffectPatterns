
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
    CacheService,
    MemoryStore,
    MultiTierStore
} from "../src/services/cache.js";
import { ToolkitConfig } from "../src/services/config.js";
import { ToolkitLogger } from "../src/services/logger.js";

// Mock Config helper
const createMockConfig = () => ({
  getCacheTtlMs: () => Effect.succeed(60000),
  getMaxCacheSize: () => Effect.succeed(100),
  getRedisUrl: () => Effect.succeed(undefined),
  isLoggingEnabled: () => Effect.succeed(false),
} as unknown as ToolkitConfig);

describe("Cache Service Multi-Tier & Advanced Features", () => {
  
  it("Legacy MemoryStore behavior works", async () => {
    const store = new MemoryStore(10);
    const entry = {
      value: "test-value",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
      accessCount: 0,
      lastAccessedAt: Date.now()
    };

    await Effect.runPromise(store.set("key1", entry));
    const result = await Effect.runPromise(store.get("key1"));
    expect(result?.value).toBe("test-value");
  });

  it("MultiTierStore promotes L2 hits to L1", async () => {
    const l1 = new MemoryStore(10);
    const l2 = new MemoryStore(10);
    const store = new MultiTierStore(l1, l2);

    const entry = {
      value: "l2-value",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
      accessCount: 0,
      lastAccessedAt: Date.now()
    };

    // Pre-populate L2 only
    await Effect.runPromise(l2.set("key1", entry));

    // L1 should be empty
    expect(await Effect.runPromise(l1.get("key1"))).toBeUndefined();

    // Get from Store (should look in L1 -> fail -> L2 -> success)
    const result = await Effect.runPromise(store.get("key1"));
    expect(result?.value).toBe("l2-value");

    // L1 should now be populated (Promotion)
    const l1Result = await Effect.runPromise(l1.get("key1"));
    expect(l1Result?.value).toBe("l2-value");
  });

  it("Invalidate by pattern removes matching keys", async () => {
      // We need to test the Service level logic here
      const mockConfig = createMockConfig();
      const TestLayer = Layer.mergeAll(
          Layer.succeed(ToolkitConfig, mockConfig),
          Layer.succeed(ToolkitLogger, { 
              error: () => Effect.void, 
              warn: () => Effect.void,
              debug: () => Effect.void,
              withOperation: () => ({ debug: () => Effect.void }) 
          } as any)
      );

      const program = Effect.gen(function*() {
          const cache = yield* CacheService;
          
          yield* cache.set("user:1", "paul");
          yield* cache.set("user:2", "john");
          yield* cache.set("post:1", "content");

          // Invalidate users
          const count = yield* cache.invalidateByPattern("user:.*");
          
          const u1 = yield* cache.has("user:1");
          const u2 = yield* cache.has("user:2");
          const p1 = yield* cache.has("post:1");

          return { count, u1, u2, p1 };
      }).pipe(Effect.provide(CacheService.Default), Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);

      expect(result.count).toBe(2);
      expect(result.u1).toBe(false);
      expect(result.u2).toBe(false);
      expect(result.p1).toBe(true);
  });

  it("Cache Warming pre-populates data", async () => {
      const mockConfig = createMockConfig();
      const TestLayer = Layer.mergeAll(
          Layer.succeed(ToolkitConfig, mockConfig),
          Layer.succeed(ToolkitLogger, { 
              error: () => Effect.void, 
              warn: () => Effect.void,
              debug: () => Effect.void,
              withOperation: () => ({ debug: () => Effect.void }) 
          } as any)
      );

      const program = Effect.gen(function*() {
          const cache = yield* CacheService;
          
          // Warm the cache
          const value = yield* cache.warm("warm-key", Effect.succeed("hot-data"));
          
          // Retrieve immediately (should be instant hit)
          const retrieved = yield* cache.get("warm-key");

          return { value, retrieved };
      }).pipe(Effect.provide(CacheService.Default), Effect.provide(TestLayer));

      const result = await Effect.runPromise(program);
      expect(result.value).toBe("hot-data");
      expect(result.retrieved).toBe("hot-data");
  });
});
