import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { MCPCacheService } from "../MCPCacheService.js";

describe("MCPCacheService", () => {
  const runWithCache = <A>(effect: Effect.Effect<A, unknown, MCPCacheService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(MCPCacheService.Default)));

  it("should get/set values", async () => {
    const result = await runWithCache(
      Effect.gen(function* () {
        const cache = yield* MCPCacheService;
        cache.set("key1", { value: 42 }, 60_000);
        return cache.get<{ value: number }>("key1");
      })
    );
    expect(result).toEqual({ value: 42 });
  });

  it("should return null for missing keys", async () => {
    const result = await runWithCache(
      Effect.gen(function* () {
        const cache = yield* MCPCacheService;
        return cache.get("nonexistent");
      })
    );
    expect(result).toBeNull();
  });

  it("should clear all entries", async () => {
    const result = await runWithCache(
      Effect.gen(function* () {
        const cache = yield* MCPCacheService;
        cache.set("a", 1, 60_000);
        cache.set("b", 2, 60_000);
        cache.clear();
        return {
          a: cache.get("a"),
          b: cache.get("b"),
          stats: cache.getStats(),
        };
      })
    );
    expect(result.a).toBeNull();
    expect(result.b).toBeNull();
    expect(result.stats.size).toBe(0);
  });

  it("should report stats", async () => {
    const result = await runWithCache(
      Effect.gen(function* () {
        const cache = yield* MCPCacheService;
        cache.set("x", 1, 60_000);
        cache.set("y", 2, 60_000);
        return cache.getStats();
      })
    );
    expect(result.size).toBe(2);
    expect(result.maxEntries).toBe(1000);
  });
});
