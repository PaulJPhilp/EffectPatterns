import type { CacheEntry, MemoryRouterResponse, Pattern } from "./types";

/**
 * PatternsService Helpers
 * Utility functions for pattern operations
 */

/**
 * Check if cache entry is still valid
 */
export function isCacheValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() < entry.expiresAt;
}

/**
 * Create a cache entry with expiration time
 */
export function createCacheEntry<T>(data: T, expiryMs: number): CacheEntry<T> {
  return {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + expiryMs,
  };
}

/**
 * Parse Supermemory memories into Pattern objects
 */
export function parseMemoriesToPatterns(
  response: MemoryRouterResponse
): Pattern[] {
  return response.memories
    .map((memory) => {
      const metadata = memory.metadata as Record<string, unknown> | undefined;

      return {
        id: memory.id,
        title: (metadata?.title as string) || "Untitled Pattern",
        description: (metadata?.description as string) || "",
        content: memory.content,
        skillLevel: ((metadata?.skillLevel as string) ||
          "intermediate") as Pattern["skillLevel"],
        tags: (metadata?.tags as string[]) || [],
        useCase: (metadata?.useCase as string[]) || [],
        relevanceScore: memory.relevanceScore || 0,
        source: "supermemory" as const,
        url: (metadata?.url as string) || undefined,
      };
    })
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

/**
 * Build cache key from query and options
 */
export function buildCacheKey(query: string, limit: number): string {
  return `${query}:${limit}`;
}

/**
 * Format headers for Supermemory API requests
 */
export function buildApiHeaders(
  apiKey: string,
  projectId: string
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Project-Id": projectId,
  };
}
