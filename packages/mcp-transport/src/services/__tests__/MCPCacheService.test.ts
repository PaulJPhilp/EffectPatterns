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
        yield* cache.set("key1", { value: 42 }, 60_000);
        return yield* cache.get<{ value: number }>("key1");
      })
    );
    expect(result).toEqual({ value: 42 });
  });

  it("should return null for missing keys", async () => {
    const result = await runWithCache(
      Effect.gen(function* () {
        const cache = yield* MCPCacheService;
        return yield* cache.get("nonexistent");
      })
    );
    expect(result).toBeNull();
  });

  it("should clear all entries", async () => {
    const result = await runWithCache(
      Effect.gen(function* () {
        const cache = yield* MCPCacheService;
        yield* cache.set("a", 1, 60_000);
        yield* cache.set("b", 2, 60_000);
        yield* cache.clear();
        return {
          a: yield* cache.get("a"),
          b: yield* cache.get("b"),
          stats: yield* cache.getStats(),
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
        yield* cache.set("x", 1, 60_000);
        yield* cache.set("y", 2, 60_000);
        return yield* cache.getStats();
      })
    );
    expect(result.size).toBe(2);
    expect(result.maxEntries).toBe(1000);
  });
});
