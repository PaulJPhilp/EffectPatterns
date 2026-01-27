import { CacheEntry } from "./types";

/**
 * Calculate memory usage (rough estimate)
 */
export const calculateMemoryUsage = (cache: Map<string, CacheEntry<unknown>>): number => {
  let totalSize = 0;
  for (const [key, entry] of cache.entries()) {
    // Rough estimation: key length + value size + metadata
    totalSize += key.length * 2; // UTF-16 characters
    const valueStr = entry.value !== undefined ? JSON.stringify(entry.value) : "";
    totalSize += valueStr.length * 2;
    totalSize += 100; // Metadata overhead
  }
  return totalSize;
};

/**
 * Check if entry is expired
 */
export const isExpired = (entry: CacheEntry<unknown>): boolean => {
  return Date.now() - entry.timestamp > entry.ttl;
};

/**
 * Legacy cache functions (for backward compatibility)
 */
export function getCacheKey(...parts: string[]): string {
  return parts.join(":");
}

export function createCacheKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}
