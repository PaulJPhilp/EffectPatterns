import { Effect, Ref } from "effect";
import { MCPConfigService } from "../config";
import { MCPLoggerService } from "../logger";
import { calculateMemoryUsage, isExpired } from "./helpers";
import { CacheEntry, CacheResult, CacheStats } from "./types";

/**
 * MCP Server Caching Service
 */
export class MCPCacheService extends Effect.Service<MCPCacheService>()(
  "MCPCacheService",
  {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    effect: Effect.gen(function* () {
      const config = yield* MCPConfigService;
      const logger = yield* MCPLoggerService;

      // Cache configuration (direct property access)
      const maxSize = config.cacheMaxEntries;
      const defaultTTL = config.cacheDefaultTtlMs;
      const enabled = config.cacheEnabled;

      // In-memory cache storage using Ref for thread-safe mutable state
      const cacheRef = yield* Ref.make(new Map<string, CacheEntry<unknown>>());

      // Statistics using Ref for thread-safe mutable state
      const statsRef = yield* Ref.make<CacheStats>({
        entries: 0,
        hits: 0,
        misses: 0,
        evictions: 0,
        hitRate: 0,
        memoryUsage: 0,
      });

      /**
       * Update statistics
       */
      const updateStats = (): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          const cache = yield* Ref.get(cacheRef);
          yield* Ref.update(statsRef, (stats) => ({
            ...stats,
            entries: cache.size,
            hitRate:
              stats.hits + stats.misses > 0
                ? stats.hits / (stats.hits + stats.misses)
                : 0,
            memoryUsage: calculateMemoryUsage(cache),
          }));
        });

      /**
       * Evict expired entries
       */
      const evictExpired = (): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          const startTime = Date.now();
          let evicted = 0;

          yield* Ref.update(cacheRef, (cache) => {
            const newCache = new Map(cache);
            for (const [key, entry] of newCache.entries()) {
              if (isExpired(entry)) {
                newCache.delete(key);
                evicted++;
              }
            }
            return newCache;
          });

          yield* Ref.update(statsRef, (stats) => ({
            ...stats,
            evictions: stats.evictions + evicted,
          }));

          if (evicted > 0) {
            yield* logger.logCacheOperation(
              "evict",
              "",
              false,
              Date.now() - startTime
            );
          }
        });

      /**
       * Evict entries using LRU policy when cache is full
       */
      const evictLRU = (): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          const cache = yield* Ref.get(cacheRef);
          if (cache.size < maxSize) return;

          // Find least recently used entry
          let lruKey = "";
          let lruTime = Date.now();

          for (const [key, entry] of cache.entries()) {
            if (entry.lastAccessed < lruTime) {
              lruTime = entry.lastAccessed;
              lruKey = key;
            }
          }

          if (lruKey) {
            yield* Ref.update(cacheRef, (cache) => {
              const newCache = new Map(cache);
              newCache.delete(lruKey);
              return newCache;
            });
            yield* Ref.update(statsRef, (stats) => ({
              ...stats,
              evictions: stats.evictions + 1,
            }));
          }
        });

      /**
       * Get value from cache
       */
      const get = <T>(key: string): Effect.Effect<CacheResult<T>, never> => {
        if (!enabled) {
          return Effect.gen(function* () {
            const stats = yield* Ref.get(statsRef);
            return {
              hit: false,
              stats,
            };
          });
        }

        return Effect.gen(function* () {
          const startTime = Date.now();

          // Clean up expired entries periodically
          if (Math.random() < 0.01) {
            // 1% chance
            yield* evictExpired();
          }

          const cache = yield* Ref.get(cacheRef);
          const entry = cache.get(key);

          if (!entry || isExpired(entry)) {
            if (entry && isExpired(entry)) {
              yield* Ref.update(cacheRef, (cache) => {
                const newCache = new Map(cache);
                newCache.delete(key);
                return newCache;
              });
              yield* Ref.update(statsRef, (stats) => ({
                ...stats,
                evictions: stats.evictions + 1,
              }));
            }

            yield* Ref.update(statsRef, (stats) => ({
              ...stats,
              misses: stats.misses + 1,
            }));
            yield* updateStats();

            yield* logger.logCacheOperation(
              "get",
              key,
              false,
              Date.now() - startTime
            );

            const stats = yield* Ref.get(statsRef);
            return {
              hit: false,
              stats,
            };
          }

          // Update access statistics
          const updatedEntry: CacheEntry<unknown> = {
            ...entry,
            hits: entry.hits + 1,
            lastAccessed: Date.now(),
          };
          yield* Ref.update(cacheRef, (cache) => {
            const newCache = new Map(cache);
            newCache.set(key, updatedEntry);
            return newCache;
          });
          yield* Ref.update(statsRef, (stats) => ({
            ...stats,
            hits: stats.hits + 1,
          }));
          yield* updateStats();

          yield* logger.logCacheOperation(
            "get",
            key,
            true,
            Date.now() - startTime
          );

          const stats = yield* Ref.get(statsRef);
          return {
            hit: true,
            value: entry.value,
            stats,
          } as CacheResult<T>;
        });
      };

      /**
       * Set value in cache
       */
      const set = <T>(
        key: string,
        value: T,
        ttl: number = defaultTTL
      ): Effect.Effect<void, never> => {
        if (!enabled) {
          return Effect.succeed(undefined);
        }

        return Effect.gen(function* () {
          const startTime = Date.now();

          // Evict if cache is full
          yield* evictLRU();

          const entry: CacheEntry<T> = {
            value,
            timestamp: Date.now(),
            ttl,
            hits: 0,
            lastAccessed: Date.now(),
          };

          yield* Ref.update(cacheRef, (cache) => {
            const newCache = new Map(cache);
            newCache.set(key, entry);
            return newCache;
          });
          yield* updateStats();

          yield* logger.logCacheOperation(
            "set",
            key,
            false,
            Date.now() - startTime
          );
        });
      };

      /**
       * Delete value from cache
       */
      const del = (key: string): Effect.Effect<boolean, never> => {
        if (!enabled) {
          return Effect.succeed(false);
        }

        return Effect.gen(function* () {
          const startTime = Date.now();
          const cache = yield* Ref.get(cacheRef);
          const existed = cache.has(key);

          if (existed) {
            yield* Ref.update(cacheRef, (cache) => {
              const newCache = new Map(cache);
              newCache.delete(key);
              return newCache;
            });
            yield* updateStats();
          }

          yield* logger.logCacheOperation(
            "delete",
            key,
            false,
            Date.now() - startTime
          );

          return existed;
        });
      };

      /**
       * Clear all cache entries
       */
      const clear = (): Effect.Effect<void, never> => {
        if (!enabled) {
          return Effect.succeed(undefined);
        }

        return Effect.gen(function* () {
          const startTime = Date.now();
          const cache = yield* Ref.get(cacheRef);
          const clearedCount = cache.size;

          yield* Ref.set(cacheRef, new Map());
          yield* Ref.update(statsRef, (stats) => ({
            entries: 0,
            hits: 0,
            misses: 0,
            evictions: stats.evictions + clearedCount, // Count as evictions
            hitRate: 0,
            memoryUsage: 0,
          }));

          yield* logger.logCacheOperation(
            "clear",
            "",
            false,
            Date.now() - startTime
          );
        });
      };

      /**
       * Check if key exists in cache
       */
      const has = (key: string): Effect.Effect<boolean, never> => {
        if (!enabled) {
          return Effect.succeed(false);
        }

        return Effect.gen(function* () {
          const cache = yield* Ref.get(cacheRef);
          const entry = cache.get(key);
          return entry !== undefined && !isExpired(entry);
        });
      };

      /**
       * Get cache statistics
       */
      const getStats = (): Effect.Effect<CacheStats, never> =>
        Effect.gen(function* () {
          yield* updateStats();
          return yield* Ref.get(statsRef);
        });

      /**
       * Get or set pattern (common use case)
       */
      const getOrSet = <T, E, R>(
        key: string,
        fetcher: () => Effect.Effect<T, E, R>,
        ttl?: number
      ): Effect.Effect<T, E, R> => {
        return Effect.gen(function* () {
          const result = yield* get<T>(key);

          if (result.hit && result.value !== undefined) {
            return result.value;
          }

          // Cache miss - fetch and cache
          const value = yield* fetcher();
          yield* set(key, value, ttl);

          return value;
        });
      };

      /**
       * Warm up cache with common patterns
       */
      const warmup = <E>(
        keys: readonly string[],
        fetcher: (key: string) => Effect.Effect<unknown, E>,
        ttl?: number
      ): Effect.Effect<void, E> => {
        return Effect.gen(function* () {
          yield* logger
            .withOperation("cache.warmup")
            .info(`Warming up cache with ${keys.length} keys`);

          yield* Effect.forEach(
            keys,
            (key) =>
              Effect.gen(function* () {
                const exists = yield* has(key);
                if (!exists) {
                  const value = yield* fetcher(key);
                  yield* set(key, value, ttl);
                }
              }),
            { concurrency: 5 } // Limit concurrency
          );

          yield* logger
            .withOperation("cache.warmup")
            .info("Cache warmup completed");
        });
      };

      return {
        // Core operations
        get,
        set,
        del,
        clear,
        has,

        // Statistics
        getStats,

        // Advanced operations
        getOrSet,
        warmup,

        // Configuration access
        isEnabled: (): Effect.Effect<boolean, never> => Effect.succeed(enabled),
        getMaxSize: (): Effect.Effect<number, never> => Effect.succeed(maxSize),
        getDefaultTTL: (): Effect.Effect<number, never> => Effect.succeed(defaultTTL),
      };
    }),
  }
) {}
