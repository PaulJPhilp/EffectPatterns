/**
 * MCP Cache Service - Effect-based caching
 *
 * Wraps SimpleCache as an Effect.Service.
 * Provides get/set/clear/getStats operations.
 */

import { Effect } from "effect";
import { SimpleCache } from "@/utils/cache.js";

export class MCPCacheService extends Effect.Service<MCPCacheService>()(
  "MCPCacheService",
  {
    effect: Effect.sync(() => {
      const cache = new SimpleCache(1000);

      return {
        get<T>(key: string): T | null {
          return cache.get<T>(key);
        },

        set<T>(key: string, value: T, ttlMs?: number): void {
          cache.set(key, value, ttlMs);
        },

        clear(): void {
          cache.clear();
        },

        getStats() {
          return cache.getStats();
        },
      };
    }),
  }
) {}
