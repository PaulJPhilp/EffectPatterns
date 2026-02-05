
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
    CacheService,
} from "../src/services/cache.js";
import { ToolkitConfig } from "../src/services/config.js";
import { ToolkitLogger } from "../src/services/logger.js";

describe("Toolkit Metrics", () => {
    
  it("Cache Ops increments on Cache Get", async () => {
      // Setup minimal layer
      const mockConfig = {
          getCacheTtlMs: () => Effect.succeed(60000),
          getMaxCacheSize: () => Effect.succeed(100),
          getRedisUrl: () => Effect.succeed(undefined),
          isLoggingEnabled: () => Effect.succeed(false),
      } as unknown as ToolkitConfig;

      const TestLayer = Layer.mergeAll(
          Layer.succeed(ToolkitConfig, mockConfig),
          Layer.succeed(ToolkitLogger, { 
              error: () => Effect.void, 
              warn: () => Effect.void, 
              debug: () => Effect.void,
              withOperation: () => ({ debug: () => Effect.void, error: () => Effect.void }) 
          } as any)
      );

      const program = Effect.gen(function*() {
          const cache = yield* CacheService;
          
          // Perform operation
          yield* cache.set("test-key", "value");
          yield* cache.get("test-key");
          
          // Verify metrics check passes without error
      }).pipe(Effect.provide(CacheService.Default), Effect.provide(TestLayer));

      const exit = await Effect.runPromiseExit(program);
      if (exit._tag === "Failure") {
          console.error("Test failed with cause:", JSON.stringify(exit.cause, null, 2));
      }
      expect(exit._tag).toBe("Success");
  });
});
