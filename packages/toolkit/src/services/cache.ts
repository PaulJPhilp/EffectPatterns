/**
 * Production-Ready Caching Service
 *
 * Effect-based caching with TTL, memory management, and proper error handling.
 * Supports both in-memory and configurable storage backends.
 */

import { Data, Effect, Layer, Metric } from "effect";
import { ToolkitConfig } from "./config.js";
import { ToolkitLogger } from "./logger.js";
import * as ToolkitMetrics from "./metrics.js";

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  /** Cached value */
  value: T;
  /** Timestamp when entry was created */
  createdAt: number;
  /** Timestamp when entry expires */
  expiresAt: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Timestamp of last access */
  lastAccessedAt: number;
}

/**
 * Cache Store Interface
 * Abstract backend for caching
 */
export interface CacheStore {
  get<T>(key: string): Effect.Effect<CacheEntry<T> | undefined>;
  set<T>(key: string, entry: CacheEntry<T>): Effect.Effect<void>;
  delete(key: string): Effect.Effect<boolean>;
  clear(): Effect.Effect<void>;
  keys(): Effect.Effect<string[]>;
  size(): Effect.Effect<number>;
  cleanup(now: number): Effect.Effect<number>;
}

/**
 * In-Memory Cache Store Implementation
 */
export class MemoryStore implements CacheStore {
  private cache = new Map<string, CacheEntry>();
  
  constructor(private maxEntries: number) {}

  get<T>(key: string): Effect.Effect<CacheEntry<T> | undefined> {
    return Effect.sync(() => this.cache.get(key) as CacheEntry<T> | undefined);
  }

  set<T>(key: string, entry: CacheEntry<T>): Effect.Effect<void> {
    return Effect.sync(() => {
      // Enforce max entries via LRU if we are at capacity and inserting new key
      if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
        let oldestKey: string | undefined;
        let oldestTime = Infinity;

        for (const [k, e] of this.cache.entries()) {
          if (e.lastAccessedAt < oldestTime) {
            oldestTime = e.lastAccessedAt;
            oldestKey = k;
          }
        }

        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
      this.cache.set(key, entry);
    });
  }

  delete(key: string): Effect.Effect<boolean> {
    return Effect.sync(() => this.cache.delete(key));
  }

  clear(): Effect.Effect<void> {
    return Effect.sync(() => this.cache.clear());
  }

  keys(): Effect.Effect<string[]> {
    return Effect.sync(() => Array.from(this.cache.keys()));
  }

  size(): Effect.Effect<number> {
    return Effect.sync(() => this.cache.size);
  }

  cleanup(now: number): Effect.Effect<number> {
    return Effect.sync(() => {
      let expiredCount = 0;
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt <= now) {
          this.cache.delete(key);
          expiredCount++;
        }
      }
      return expiredCount;
    });
  }
}

/**
 * Multi-Tier Cache Store (L1 + L2)
 */
export class MultiTierStore implements CacheStore {
  constructor(
    private l1: CacheStore,
    private l2: CacheStore
  ) {}

  get<T>(key: string): Effect.Effect<CacheEntry<T> | undefined> {
    const self = this;
    return Effect.gen(function* () {
      // Try L1
      const l1Entry = yield* self.l1.get<T>(key);
      if (l1Entry) return l1Entry;

      // Try L2
      const l2Entry = yield* self.l2.get<T>(key);
      if (l2Entry) {
        // Populate L1 on cache miss
        yield* self.l1.set(key, l2Entry);
        return l2Entry;
      }

      return undefined;
    });
  }

  set<T>(key: string, entry: CacheEntry<T>): Effect.Effect<void> {
    const self = this;
    return Effect.gen(function* () {
      yield* self.l1.set(key, entry);
      yield* self.l2.set(key, entry);
    });
  }

  delete(key: string): Effect.Effect<boolean> {
    const self = this;
    return Effect.gen(function* () {
      const l1Existed = yield* self.l1.delete(key);
      const l2Existed = yield* self.l2.delete(key);
      return l1Existed || l2Existed;
    });
  }

  clear(): Effect.Effect<void> {
    const self = this;
    return Effect.gen(function* () {
      yield* self.l1.clear();
      yield* self.l2.clear();
    });
  }

  keys(): Effect.Effect<string[]> {
    // Only returning L1 keys for simplicity in this implementation
    return this.l1.keys();
  }

  size(): Effect.Effect<number> {
    return this.l1.size();
  }

  cleanup(now: number): Effect.Effect<number> {
    const self = this;
    return Effect.gen(function* () {
      const l1Count = yield* self.l1.cleanup(now);
      const l2Count = yield* self.l2.cleanup(now);
      return l1Count + l2Count;
    });
  }
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * Cache operation errors
 */
export class CacheError extends Data.TaggedError("CacheError")<{
  operation: string;
  key?: string;
  cause?: unknown;
}> {}

export class CacheKeyNotFoundError extends Data.TaggedError(
  "CacheKeyNotFoundError"
)<{
  key: string;
}> {}

/**
 * Cache service with production features
 */
export class CacheService extends Effect.Service<CacheService>()(
  "CacheService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ToolkitConfig;
      const logger = yield* ToolkitLogger;

      // Configuration
      const defaultTtlMs = yield* config.getCacheTtlMs();
      const maxEntries = yield* config.getMaxCacheSize();
      const redisUrl = yield* config.getRedisUrl();
      const cleanupIntervalMs = 60000;
      const isLoggingEnabled = yield* config.isLoggingEnabled();

      // Initialize Stores
      const memoryStore = new MemoryStore(maxEntries);
      let store: CacheStore = memoryStore;

      // TODO: Initialize Redis Store if redisUrl is present and wrap in MultiTierStore
      if (redisUrl) {
         yield* logger.info("Redis L2 Cache configuration detected (Not implemented yet, using MemoryStore)", { redisUrl });
         // const redisStore = new RedisStore(redisUrl);
         // store = new MultiTierStore(memoryStore, redisStore);
      }

      // Statistics
      let totalHits = 0;
      let totalMisses = 0;
      let cleanupInterval: NodeJS.Timeout | null = null;

      const startCleanup = Effect.gen(function* () {
        if (cleanupInterval) return;
        cleanupInterval = setInterval(() => {
          Effect.runSync(cleanupExpired);
        }, cleanupIntervalMs);

        if (isLoggingEnabled) {
          yield* logger.withOperation("cache").debug("Started cache cleanup interval", { intervalMs: cleanupIntervalMs });
        }
      });

      const stopCleanup = Effect.gen(function* () {
        if (cleanupInterval) {
          clearInterval(cleanupInterval);
          cleanupInterval = null;
          if (isLoggingEnabled) {
            yield* logger.withOperation("cache").debug("Stopped cache cleanup interval");
          }
        }
      });

      const cleanupExpired = Effect.gen(function* () {
        const now = Date.now();
        const expiredCount = yield* store.cleanup(now);
        
        if (expiredCount > 0 && isLoggingEnabled) {
          const remaining = yield* store.size();
          yield* logger.withOperation("cache").debug("Cleaned up expired entries", { expiredCount, remainingCount: remaining });
        }
        return expiredCount;
      });

      /**
       * Get value from cache
       */
      const get = <T>(key: string) =>
        Effect.gen(function* () {
          const operationLogger = logger.withOperation("cache.get");
          try {
            const entry = yield* store.get<T>(key);

            if (!entry) {
              totalMisses++;
              yield* Metric.update(ToolkitMetrics.cacheOps.pipe(Metric.tagged("operation", "get"), Metric.tagged("result", "miss")), 1);
              if (isLoggingEnabled) yield* operationLogger.debug("Cache miss", { key });
              yield* Effect.fail(new CacheKeyNotFoundError({ key }));
              return undefined as unknown as T; // Unreachable due to fail
            }

            if (entry.expiresAt <= Date.now()) {
                yield* store.delete(key);
                totalMisses++; // Count expired as miss
                yield* Metric.update(ToolkitMetrics.cacheOps.pipe(Metric.tagged("operation", "get"), Metric.tagged("result", "miss_expired")), 1);
                yield* Effect.fail(new CacheKeyNotFoundError({ key }));
                return undefined as unknown as T;
            }

            // Update stats (simulated, ideally would write back access time to store async)
            totalHits++;
            entry.lastAccessedAt = Date.now();
            entry.accessCount++;

            yield* Metric.update(ToolkitMetrics.cacheOps.pipe(Metric.tagged("operation", "get"), Metric.tagged("result", "hit")), 1);

            if (isLoggingEnabled) {
              yield* operationLogger.debug("Cache hit", { key, accessCount: entry.accessCount });
            }

            return entry.value;
          } catch (error) {
             // If error is ours rethrow, otherwise wrap
             if (error instanceof CacheKeyNotFoundError) return yield* Effect.fail(error);

             yield* operationLogger.error("Cache get operation failed", { key, error });
             return yield* Effect.fail(new CacheError({ operation: "get", key, cause: error }));
          }
        });

      /**
       * Set value in cache
       */
      const set = <T>(key: string, value: T, ttlMs?: number) =>
        Effect.gen(function* () {
            const operationLogger = logger.withOperation("cache.set");
            try {
                const now = Date.now();
                const effectiveTtl = ttlMs ?? defaultTtlMs;
                const entry: CacheEntry<T> = {
                    value,
                    createdAt: now,
                    expiresAt: now + effectiveTtl,
                    accessCount: 0,
                    lastAccessedAt: now
                };
                
                yield* store.set(key, entry);
                
                yield* Metric.update(ToolkitMetrics.cacheOps.pipe(Metric.tagged("operation", "set"), Metric.tagged("result", "success")), 1);
                yield* Metric.set(ToolkitMetrics.cacheSize, yield* store.size());



                if (isLoggingEnabled) {
                    const size = yield* store.size();
                    yield* operationLogger.debug("Cache set", { key, ttlMs: effectiveTtl, totalEntries: size });
                }
            } catch (error) {
                yield* operationLogger.error("Cache set operation failed", { key, error });
                yield* Effect.fail(new CacheError({ operation: "set", key, cause: error }));
            }
        });

      const delete_ = (key: string) => 
        Effect.gen(function*() {
            try {
                return yield* store.delete(key);
            } catch (error) {
                 yield* Effect.fail(new CacheError({ operation: "delete", key, cause: error }));
            }
        });

      const has = (key: string) =>
         Effect.gen(function*() {
             const entry = yield* store.get(key);
             return entry !== undefined;
         }).pipe(
             Effect.catchAll(() => Effect.succeed(false))
         );

      const clear = Effect.gen(function*() {
          yield* store.clear();
      });

      const getStats = Effect.gen(function*() {
          const totalEntries = yield* store.size();
          // Simplified implementation for stats
          const hitRate = (totalHits + totalMisses) > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;
          
          return {
              totalEntries,
              expiredEntries: 0, // Not tracking historically
              hits: totalHits,
              misses: totalMisses,
              hitRate,
              memoryUsage: 0 // Not calculating for now impact
          } satisfies CacheStats;
      });

      const keys = store.keys();

      // Advanced: Invalidation by Pattern
      const invalidateByPattern = (pattern: RegExp | string) => Effect.gen(function*() {
          const allKeys = yield* store.keys();
          const regex = typeof pattern === 'string' ? new RegExp(pattern.replace('*', '.*')) : pattern;
          
          let count = 0;
          for (const key of allKeys) {
              if (regex.test(key)) {
                  yield* store.delete(key);
                  count++;
              }
          }
          yield* Metric.update(ToolkitMetrics.cacheInvalidations.pipe(Metric.tagged("type", "pattern")), count);
          if (isLoggingEnabled) {
             yield* logger.withOperation("cache.invalidate").debug("Invalidated keys by pattern", { pattern: String(pattern), count });
          }
          return count;
      });

      // Advanced: Cache Warming
      const warm = <A, E, R>(key: string, loader: Effect.Effect<A, E, R>, ttlMs?: number) => Effect.gen(function*() {
          const value = yield* loader;
          yield* set(key, value, ttlMs);
          return value;
      });

      yield* startCleanup;

      return {
        get,
        set,
        delete: delete_,
        has,
        clear,
        getStats,
        keys,
        invalidateByPattern,
        warm,
        cleanupExpired
      };
    }),
    dependencies: [ToolkitLogger.Default, ToolkitConfig.Default],
  }
) {}

export const CacheServiceLive = CacheService.Default.pipe(
    Layer.provide(ToolkitLogger.Default),
    Layer.provide(ToolkitConfig.Default)
);

// Compatibility Layer
const legacyCache = new Map<string, { value: unknown; expiresAt: number }>();
export function getCacheEntry<T>(key: string): T | undefined {
  const entry = legacyCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    legacyCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}
export function setCacheEntry<T>(key: string, value: T, ttlMs: number = 300000): void {
  legacyCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
export function deleteCacheEntry(key: string): boolean { return legacyCache.delete(key); }
export function clearCache(): void { legacyCache.clear(); }
export function getCacheStats(): { size: number } { return { size: legacyCache.size }; }
