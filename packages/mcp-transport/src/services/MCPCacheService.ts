/**
 * MCP Cache Service - Effect-based caching
 *
 * Wraps SimpleCache as an Effect.Service.
 * Provides get/set/clear/getStats operations.
 */

import { Effect } from "effect";
import { SimpleCache } from "../utils/cache.js";

export class MCPCacheService extends Effect.Service<MCPCacheService>()(
  "MCPCacheService",
  {
    accessors: true,
    sync: () => {
      const cache = new SimpleCache(1000);

      return {
        get: <T>(key: string): Effect.Effect<T | null, never> =>
          Effect.sync(() => cache.get<T>(key)),

        set: <T>(
          key: string,
          value: T,
          ttlMs?: number,
        ): Effect.Effect<void, never> =>
          Effect.sync(() => {
            cache.set(key, value, ttlMs);
          }),

        clear: (): Effect.Effect<void, never> =>
          Effect.sync(() => {
            cache.clear();
          }),

        getStats: (): Effect.Effect<{ size: number; maxEntries: number }, never> =>
          Effect.sync(() => cache.getStats()),
      };
    },
  }
) {}
