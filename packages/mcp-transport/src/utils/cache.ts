/**
 * Shared cache implementations for MCP transport entry points.
 *
 * BoundedCache: LRU-evicting, TTL-based cache for API responses (patterns, search).
 * SimpleCache:  FIFO-evicting, TTL-based cache for tool handler results.
 */

/**
 * LRU cache with TTL-based expiration and bounded size.
 */
export class BoundedCache<T> {
  private cache = new Map<string, { expiresAt: number; value: T; accessTime: number }>();
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.accessTime = Date.now();
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      let oldestKey = "";
      let oldestAccessTime = Infinity;

      for (const [k, v] of this.cache) {
        if (v.accessTime < oldestAccessTime) {
          oldestAccessTime = v.accessTime;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      accessTime: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}

/**
 * Simple FIFO cache with TTL-based expiration.
 */
export class SimpleCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}
