/**
 * MCP Server Caching Service
 *
 * Production-ready TTL-based caching with statistics,
 * memory management, and configurable cache policies.
 */

import { Effect } from 'effect';
import { MCPConfigService } from './config.js';
import { MCPLoggerService } from './logger.js';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
    readonly value: T;
    readonly timestamp: number;
    readonly ttl: number;
    readonly hits: number;
    readonly lastAccessed: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    readonly entries: number;
    readonly hits: number;
    readonly misses: number;
    readonly evictions: number;
    readonly hitRate: number;
    readonly memoryUsage: number;
}

/**
 * Cache operation result
 */
export interface CacheResult<T> {
    readonly hit: boolean;
    readonly value?: T;
    readonly stats: CacheStats;
}

/**
 * MCP Server Caching Service
 */
export class MCPCacheService extends Effect.Service<MCPCacheService>()('MCPCacheService', {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    effect: Effect.gen(function* () {
        const config = yield* MCPConfigService;
        const logger = yield* MCPLoggerService;

        // Cache configuration
        const maxSize = yield* config.getCacheMaxEntries();
        const defaultTTL = yield* config.getCacheDefaultTtlMs();
        const enabled = yield* config.isCacheEnabled();

        // In-memory cache storage
        const cache = new Map<string, CacheEntry<unknown>>();

        // Statistics
        let stats = {
            entries: 0,
            hits: 0,
            misses: 0,
            evictions: 0,
            hitRate: 0,
            memoryUsage: 0,
        };

        /**
         * Calculate memory usage (rough estimate)
         */
        const calculateMemoryUsage = (): number => {
            let totalSize = 0;
            for (const [key, entry] of cache.entries()) {
                // Rough estimation: key length + value size + metadata
                totalSize += key.length * 2; // UTF-16 characters
                totalSize += JSON.stringify(entry.value).length * 2;
                totalSize += 100; // Metadata overhead
            }
            return totalSize;
        };

        /**
         * Update statistics
         */
        const updateStats = (): void => {
            stats.entries = cache.size;
            stats.hitRate = stats.hits + stats.misses > 0
                ? stats.hits / (stats.hits + stats.misses)
                : 0;
            stats.memoryUsage = calculateMemoryUsage();
        };

        /**
         * Check if entry is expired
         */
        const isExpired = (entry: CacheEntry<unknown>): boolean => {
            return Date.now() - entry.timestamp > entry.ttl;
        };

        /**
         * Evict expired entries
         */
        const evictExpired = (): Effect.Effect<void> => {
            const startTime = Date.now();
            let evicted = 0;

            for (const [key, entry] of cache.entries()) {
                if (isExpired(entry)) {
                    cache.delete(key);
                    evicted++;
                }
            }

            stats.evictions += evicted;

            if (evicted > 0) {
                return logger.logCacheOperation('evict', '', false, Date.now() - startTime);
            }

            return Effect.succeed(undefined);
        };

        /**
         * Evict entries using LRU policy when cache is full
         */
        const evictLRU = (): void => {
            if (cache.size < maxSize) return;

            // Find least recently used entry
            let lruKey = '';
            let lruTime = Date.now();

            for (const [key, entry] of cache.entries()) {
                if (entry.lastAccessed < lruTime) {
                    lruTime = entry.lastAccessed;
                    lruKey = key;
                }
            }

            if (lruKey) {
                cache.delete(lruKey);
                stats.evictions++;
            }
        };

        /**
         * Get value from cache
         */
        const get = <T>(key: string): Effect.Effect<CacheResult<T>> => {
            if (!enabled) {
                return Effect.succeed({
                    hit: false,
                    stats: { ...stats },
                });
            }

            return Effect.gen(function* () {
                const startTime = Date.now();

                // Clean up expired entries periodically
                if (Math.random() < 0.01) { // 1% chance
                    yield* evictExpired();
                }

                const entry = cache.get(key);

                if (!entry || isExpired(entry)) {
                    if (entry && isExpired(entry)) {
                        cache.delete(key);
                        stats.evictions++;
                    }

                    stats.misses++;
                    updateStats();

                    yield* logger.logCacheOperation('get', key, false, Date.now() - startTime);

                    return {
                        hit: false,
                        stats: { ...stats },
                    };
                }

                // Update access statistics
                const updatedEntry: CacheEntry<unknown> = {
                    ...entry,
                    hits: entry.hits + 1,
                    lastAccessed: Date.now(),
                };
                cache.set(key, updatedEntry);
                stats.hits++;
                updateStats();

                yield* logger.logCacheOperation('get', key, true, Date.now() - startTime);

                return {
                    hit: true,
                    value: entry.value as T,
                    stats: { ...stats },
                };
            });
        };

        /**
         * Set value in cache
         */
        const set = <T>(
            key: string,
            value: T,
            ttl: number = defaultTTL
        ): Effect.Effect<void> => {
            if (!enabled) {
                return Effect.succeed(undefined);
            }

            return Effect.gen(function* () {
                const startTime = Date.now();

                // Evict if cache is full
                evictLRU();

                const entry: CacheEntry<T> = {
                    value,
                    timestamp: Date.now(),
                    ttl,
                    hits: 0,
                    lastAccessed: Date.now(),
                };

                cache.set(key, entry);
                updateStats();

                yield* logger.logCacheOperation('set', key, false, Date.now() - startTime);
            });
        };

        /**
         * Delete value from cache
         */
        const del = (key: string): Effect.Effect<boolean> => {
            if (!enabled) {
                return Effect.succeed(false);
            }

            return Effect.gen(function* () {
                const startTime = Date.now();
                const existed = cache.delete(key);

                if (existed) {
                    updateStats();
                }

                yield* logger.logCacheOperation('delete', key, false, Date.now() - startTime);

                return existed;
            });
        };

        /**
         * Clear all cache entries
         */
        const clear = (): Effect.Effect<void> => {
            if (!enabled) {
                return Effect.succeed(undefined);
            }

            return Effect.gen(function* () {
                const startTime = Date.now();
                const clearedCount = cache.size;

                cache.clear();
                stats = {
                    entries: 0,
                    hits: 0,
                    misses: 0,
                    evictions: stats.evictions + clearedCount, // Count as evictions
                    hitRate: 0,
                    memoryUsage: 0,
                };

                yield* logger.logCacheOperation('clear', '', false, Date.now() - startTime);
            });
        };

        /**
         * Check if key exists in cache
         */
        const has = (key: string): Effect.Effect<boolean> => {
            if (!enabled) {
                return Effect.succeed(false);
            }

            const entry = cache.get(key);
            return Effect.succeed(entry !== undefined && !isExpired(entry));
        };

        /**
         * Get cache statistics
         */
        const getStats = (): Effect.Effect<CacheStats> => {
            updateStats();
            return Effect.succeed({ ...stats });
        };

        /**
         * Get or set pattern (common use case)
         */
        const getOrSet = <T>(
            key: string,
            fetcher: () => Effect.Effect<T>,
            ttl?: number
        ): Effect.Effect<T> => {
            return Effect.gen(function* () {
                const result = yield* get<T>(key);

                if (result.hit && result.value !== undefined) {
                    return result.value;
                }

                // Cache miss - fetch and cache
                const fetchEffect = fetcher();
                const value = yield* fetchEffect;
                yield* set(key, value, ttl);

                return value;
            });
        };

        /**
         * Warm up cache with common patterns
         */
        const warmup = (
            keys: readonly string[],
            fetcher: (key: string) => Effect.Effect<unknown>,
            ttl?: number
        ): Effect.Effect<void> => {
            return Effect.gen(function* () {
                yield* logger.withOperation('cache.warmup').info(`Warming up cache with ${keys.length} keys`);

                yield* Effect.forEach(
                    keys,
                    (key) => Effect.gen(function* () {
                        const exists = yield* has(key);
                        if (!exists) {
                            const value = yield* fetcher(key);
                            yield* set(key, value, ttl);
                        }
                    }),
                    { concurrency: 5 } // Limit concurrency
                );

                yield* logger.withOperation('cache.warmup').info('Cache warmup completed');
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
            isEnabled: () => Effect.succeed(enabled),
            getMaxSize: () => Effect.succeed(maxSize),
            getDefaultTTL: () => Effect.succeed(defaultTTL),
        };
    })
}) { }

/**
 * Default MCP cache service layer
 */
export const MCPCacheServiceLive = MCPCacheService.Default;

/**
 * Legacy cache functions (for backward compatibility)
 */
export function getCacheKey(...parts: string[]): string {
    return parts.join(':');
}

export function createCacheKey(prefix: string, id: string): string {
    return `${prefix}:${id}`;
}