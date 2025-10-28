/**
 * Production-Ready Caching Service
 *
 * Effect-based caching with TTL, memory management, and proper error handling.
 * Supports both in-memory and configurable storage backends.
 */

import { Data, Effect } from 'effect';
import { ToolkitConfig } from './config.js';
import { ToolkitLogger } from './logger.js';

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
 * Cache statistics
 */
export interface CacheStats {
    /** Total number of entries */
    totalEntries: number;
    /** Number of entries that have expired */
    expiredEntries: number;
    /** Total cache hits */
    hits: number;
    /** Total cache misses */
    misses: number;
    /** Hit rate percentage */
    hitRate: number;
    /** Memory usage in bytes (approximate) */
    memoryUsage: number;
}

/**
 * Cache operation errors
 */
export class CacheError extends Data.TaggedError('CacheError')<{
    operation: string;
    key?: string;
    cause?: unknown;
}> { }

export class CacheKeyNotFoundError extends Data.TaggedError('CacheKeyNotFoundError')<{
    key: string;
}> { }

/**
 * Cache service with production features
 */
export class CacheService extends Effect.Service<CacheService>()('CacheService', {
    effect: Effect.gen(function* () {
        const config = yield* ToolkitConfig;
        const logger = yield* ToolkitLogger;

        // Configuration
        const defaultTtlMs = yield* config.getCacheTtlMs();
        const maxEntries = yield* config.getMaxCacheSize();
        const cleanupIntervalMs = 60000; // 1 minute cleanup interval
        const isLoggingEnabled = yield* config.isLoggingEnabled();

        // In-memory storage
        const cache = new Map<string, CacheEntry>();

        // Statistics
        let totalHits = 0;
        let totalMisses = 0;

        // Cleanup interval reference
        let cleanupInterval: NodeJS.Timeout | null = null;

        /**
         * Start background cleanup process
         */
        const startCleanup = Effect.gen(function* () {
            if (cleanupInterval) return;

            cleanupInterval = setInterval(() => {
                Effect.runSync(cleanupExpired);
            }, cleanupIntervalMs);

            if (isLoggingEnabled) {
                yield* logger.withOperation('cache').debug('Started cache cleanup interval', {
                    intervalMs: cleanupIntervalMs
                });
            }
        });

        /**
         * Stop background cleanup process
         */
        const stopCleanup = Effect.gen(function* () {
            if (cleanupInterval) {
                clearInterval(cleanupInterval);
                cleanupInterval = null;

                if (isLoggingEnabled) {
                    yield* logger.withOperation('cache').debug('Stopped cache cleanup interval');
                }
            }
        });

        /**
         * Remove expired entries
         */
        const cleanupExpired = Effect.gen(function* () {
            const now = Date.now();
            const expiredKeys: string[] = [];

            for (const [key, entry] of cache.entries()) {
                if (entry.expiresAt <= now) {
                    expiredKeys.push(key);
                }
            }

            expiredKeys.forEach(key => cache.delete(key));

            if (expiredKeys.length > 0 && isLoggingEnabled) {
                yield* logger.withOperation('cache').debug('Cleaned up expired entries', {
                    expiredCount: expiredKeys.length,
                    remainingCount: cache.size
                });
            }

            return expiredKeys.length;
        });

        /**
         * Get cache entry (internal)
         */
        const getEntry = (key: string): CacheEntry | undefined => {
            const entry = cache.get(key);
            if (!entry) return undefined;

            // Check if expired
            if (entry.expiresAt <= Date.now()) {
                cache.delete(key);
                return undefined;
            }

            // Update access statistics
            entry.accessCount++;
            entry.lastAccessedAt = Date.now();

            return entry;
        };

        /**
         * Set cache entry (internal)
         */
        const setEntry = (key: string, entry: CacheEntry): void => {
            // Enforce max entries limit (simple LRU eviction)
            if (cache.size >= maxEntries && !cache.has(key)) {
                // Find least recently used entry
                let oldestKey: string | undefined;
                let oldestTime = Date.now();

                for (const [k, e] of cache.entries()) {
                    if (e.lastAccessedAt < oldestTime) {
                        oldestTime = e.lastAccessedAt;
                        oldestKey = k;
                    }
                }

                if (oldestKey) {
                    cache.delete(oldestKey);
                }
            }

            cache.set(key, entry);
        };

        /**
         * Get value from cache
         */
        const get = <T>(key: string) =>
            Effect.gen(function* () {
                const operationLogger = logger.withOperation('cache.get');

                try {
                    const entry = getEntry(key);

                    if (!entry) {
                        totalMisses++;
                        if (isLoggingEnabled) {
                            yield* operationLogger.debug('Cache miss', { key });
                        }
                        yield* Effect.fail(new CacheKeyNotFoundError({ key }));
                    }

                    totalHits++;
                    if (isLoggingEnabled && entry) {
                        yield* operationLogger.debug('Cache hit', {
                            key,
                            accessCount: entry.accessCount,
                            age: Date.now() - entry.createdAt
                        });
                    }

                    return (entry as CacheEntry).value as T;
                } catch (error) {
                    yield* operationLogger.error('Cache get operation failed', { key, error });
                    yield* Effect.fail(new CacheError({
                        operation: 'get',
                        key,
                        cause: error
                    }));
                }
            });

        /**
         * Set value in cache with optional TTL
         */
        const set = <T>(key: string, value: T, ttlMs?: number) =>
            Effect.gen(function* () {
                const operationLogger = logger.withOperation('cache.set');

                try {
                    const now = Date.now();
                    const effectiveTtl = ttlMs ?? defaultTtlMs;

                    const entry: CacheEntry<T> = {
                        value,
                        createdAt: now,
                        expiresAt: now + effectiveTtl,
                        accessCount: 0,
                        lastAccessedAt: now,
                    };

                    setEntry(key, entry);

                    if (isLoggingEnabled) {
                        yield* operationLogger.debug('Cache set', {
                            key,
                            ttlMs: effectiveTtl,
                            totalEntries: cache.size
                        });
                    }
                } catch (error) {
                    yield* operationLogger.error('Cache set operation failed', { key, error });
                    yield* Effect.fail(new CacheError({
                        operation: 'set',
                        key,
                        cause: error
                    }));
                }
            });

        /**
         * Delete value from cache
         */
        const delete_ = (key: string) =>
            Effect.gen(function* () {
                const operationLogger = logger.withOperation('cache.delete');

                try {
                    const existed = cache.delete(key);

                    if (isLoggingEnabled) {
                        yield* operationLogger.debug('Cache delete', { key, existed });
                    }

                    return existed;
                } catch (error) {
                    yield* operationLogger.error('Cache delete operation failed', { key, error });
                    yield* Effect.fail(new CacheError({
                        operation: 'delete',
                        key,
                        cause: error
                    }));
                }
            });

        /**
         * Check if key exists in cache
         */
        const has = (key: string) =>
            Effect.gen(function* () {
                try {
                    const entry = getEntry(key);
                    return entry !== undefined;
                } catch (error) {
                    yield* Effect.fail(new CacheError({
                        operation: 'has',
                        key,
                        cause: error
                    }));
                }
            });

        /**
         * Clear all cache entries
         */
        const clear = Effect.gen(function* () {
            const operationLogger = logger.withOperation('cache.clear');

            try {
                const clearedCount = cache.size;
                cache.clear();

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Cache cleared', { clearedCount });
                }

                return clearedCount;
            } catch (error) {
                yield* operationLogger.error('Cache clear operation failed', { error });
                yield* Effect.fail(new CacheError({
                    operation: 'clear',
                    cause: error
                }));
            }
        });

        /**
         * Get cache statistics
         */
        const getStats = Effect.gen(function* () {
            const now = Date.now();
            let expiredCount = 0;
            let totalMemoryUsage = 0;

            for (const entry of cache.values()) {
                if (entry.expiresAt <= now) {
                    expiredCount++;
                }
                // Rough memory estimation
                totalMemoryUsage += JSON.stringify(entry.value).length * 2; // UTF-16
            }

            const totalRequests = totalHits + totalMisses;
            const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

            return {
                totalEntries: cache.size,
                expiredEntries: expiredCount,
                hits: totalHits,
                misses: totalMisses,
                hitRate,
                memoryUsage: totalMemoryUsage,
            } satisfies CacheStats;
        });

        /**
         * Get all cache keys
         */
        const keys = Effect.gen(function* () {
            try {
                return Array.from(cache.keys());
            } catch (error) {
                yield* Effect.fail(new CacheError({
                    operation: 'keys',
                    cause: error
                }));
            }
        });

        // Start cleanup on service initialization
        yield* startCleanup;

        return {
            get,
            set,
            delete: delete_,
            has,
            clear,
            getStats,
            keys,
            cleanupExpired,
            startCleanup,
            stopCleanup,
        };
    })
}) { }

/**
 * Default cache service layer
 */
export const CacheServiceLive = CacheService.Default;

/**
 * Legacy compatibility functions
 * These will be deprecated in favor of the service-based approach
 */
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
    legacyCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
}

export function deleteCacheEntry(key: string): boolean {
    return legacyCache.delete(key);
}

export function clearCache(): void {
    legacyCache.clear();
}

export function getCacheStats(): { size: number } {
    return { size: legacyCache.size };
}