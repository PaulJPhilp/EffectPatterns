/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
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
