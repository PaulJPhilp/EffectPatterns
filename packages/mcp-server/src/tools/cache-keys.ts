/**
 * Cache Key Generation Utilities
 *
 * Provides consistent cache key generation across all tools and transports.
 * Uses stable serialization with sorted keys to ensure identical searches
 * with different argument orders produce the same cache key.
 */

import type { SearchPatternsArgs } from "@/schemas/tool-schemas.js";

/**
 * Generate a stable cache key from search arguments
 *
 * Uses JSON.stringify with sorted keys to ensure:
 * - Same search with different arg order -> same key
 * - No collisions from colon separators in args
 * - Stable keys across server restarts
 *
 * @param args - Search arguments
 * @returns Cache key (e.g., "search:v1:{...sorted json...}")
 */
export function generateSearchCacheKey(args: SearchPatternsArgs): string {
  // Create normalized object with consistent field order
  const normalized = {
    category: args.category || "",
    difficulty: args.difficulty || "",
    format: args.format || "markdown",
    includeProvenancePanel: args.includeProvenancePanel ?? false,
    includeStructuredPatterns: args.includeStructuredPatterns ?? false,
    limit: args.limit ?? 3,
    limitCards: args.limitCards ?? 10,
    q: args.q || "",
  };

  // JSON.stringify produces consistent output with sorted keys
  const key = JSON.stringify(normalized);
  return `search:v1:${key}`;
}

/**
 * Generate a stable cache key for HTTP API requests
 *
 * Combines endpoint, method, and data into a stable cache key.
 * For requests with body data (POST), serializes with sorted keys.
 *
 * @param endpoint - API endpoint (e.g., "/patterns")
 * @param method - HTTP method
 * @param data - Request body data (for POST requests)
 * @returns Cache key (e.g., "GET:/patterns:v1:{...}")
 */
export function generateRequestCacheKey(
  endpoint: string,
  method: "GET" | "POST",
  data?: unknown,
): string {
  if (!data) {
    return `${method}:${endpoint}:v1`;
  }

  // Serialize data with sorted keys for consistency
  const dataStr = JSON.stringify(
    sortObjectKeys(data as Record<string, unknown>)
  );
  return `${method}:${endpoint}:v1:${dataStr}`;
}

/**
 * Generate a stable cache key for pattern details
 *
 * @param patternId - Pattern identifier
 * @returns Cache key (e.g., "pattern:v1:effect-service")
 */
export function generatePatternCacheKey(patternId: string): string {
  return `pattern:v1:${patternId}`;
}

/**
 * Recursively sort object keys for stable serialization
 *
 * Ensures that {a: 1, b: 2} and {b: 2, a: 1} serialize identically
 * when passed to JSON.stringify.
 *
 * @param obj - Object to sort
 * @returns New object with sorted keys
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  Object.keys(obj as Record<string, unknown>)
    .sort()
    .forEach((key) => {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    });

  return sorted;
}
