/**
 * Shared Tool Implementation Utilities
 *
 * Extracted from tool-implementations.ts to reduce file complexity.
 * Contains reusable helper functions for all MCP tools.
 */

import type { TextContent } from "@/schemas/structured-output.js";

/**
 * Telemetry counters for cache performance.
 * Internal mutable state — external consumers should use getCacheMetrics().
 */
const _cacheMetrics = {
  searchHits: 0,
  searchMisses: 0,
  patternHits: 0,
  patternMisses: 0,
};

export function getCacheMetrics(): Readonly<typeof _cacheMetrics> {
  return Object.freeze({ ..._cacheMetrics });
}

/**
 * Generate a unique request ID for tracking tool handler execution
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normalize annotations to valid MCP 2.0 format
 * Ensures priority is between 0 and 1
 */
export function normalizeAnnotations(
  annotations: TextContent["annotations"] | undefined,
): TextContent["annotations"] | undefined {
  if (!annotations) return undefined;
  if (typeof annotations.priority !== "number") return annotations;
  return {
    ...annotations,
    priority: Math.min(annotations.priority, 1),
  };
}

/**
 * Normalize content blocks to ensure all have text field
 * Filters out invalid blocks and ensures type consistency
 */
export function normalizeContentBlocks(
  content: Array<TextContent | { type: "text"; text: string; mimeType?: string }>
): Array<TextContent | { type: "text"; text: string; mimeType?: string }> {
  return content
    .filter((block) => typeof (block as any).text === "string")
    .map((block) => ({
      ...block,
      text: String((block as any).text),
    }));
}

/**
 * Extract API names from code examples
 * Identifies Effect-TS API usage (Effect, Layer, Stream, etc.)
 */
export function extractApiNames(text: string): string[] {
  const matches = text.match(/\\b(Effect|Layer|Stream|Schedule|Metric|Ref|Queue|PubSub)\\.\\w+/g);
  return matches ? Array.from(new Set(matches)).slice(0, 6) : [];
}

/**
 * Truncate text at word boundary to avoid mid-sentence cuts
 * Preserves word integrity for better readability
 */
export function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  // If we found a space reasonably close to maxLength, use it
  if (lastSpace > maxLength * 0.8) {
    return text.substring(0, lastSpace) + "...";
  }

  // Otherwise, just truncate and add ellipsis
  return truncated + "...";
}

/**
 * Track cache metrics
 */
export function recordSearchHit() {
  _cacheMetrics.searchHits++;
}

export function recordSearchMiss() {
  _cacheMetrics.searchMisses++;
}

export function recordPatternHit() {
  _cacheMetrics.patternHits++;
}

export function recordPatternMiss() {
  _cacheMetrics.patternMisses++;
}
