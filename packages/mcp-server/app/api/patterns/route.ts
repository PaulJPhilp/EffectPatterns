/**
 * Patterns Search Endpoint
 *
 * GET /api/patterns?q=...&category=...&difficulty=...&limit=...
 * Returns patterns matching search criteria
 *
 * With Effect.fn("search-patterns"), spans are created automatically
 * in the OpenTelemetry trace.
 */

import { toPatternSummary } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
} from "../../../src/auth/apiKey";
import { errorHandler } from "../../../src/server/errorHandler";
import { MCPCacheService } from "../../../src/services/cache";
import { PatternsService, runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

/**
 * Create cache key from search parameters
 */
function createCacheKey(
  query?: string,
  category?: string,
  difficulty?: string,
  limit?: number
): string {
  const parts = [
    "patterns",
    query || "all",
    category || "all",
    difficulty || "all",
    limit || "50",
  ];
  return parts.join(":");
}

// Handler implementation with automatic span creation via Effect.fn
const handleSearchPatterns = Effect.fn("search-patterns")(function* (
  request: NextRequest
) {
  const tracing = yield* TracingService;
  const patterns = yield* PatternsService;
  const cache = yield* MCPCacheService;

  // Validate API key
  yield* validateApiKey(request);

  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const difficulty = searchParams.get("difficulty") || undefined;
  const limit = searchParams.get("limit")
    ? Number.parseInt(searchParams.get("limit")!, 10)
    : undefined;

  // Annotate span with search parameters
  yield* Effect.annotateCurrentSpan({
    query: query || "none",
    category: category || "all",
    difficulty: difficulty || "all",
    limit: limit ? String(limit) : "default",
  });

  // Map difficulty to skillLevel
  const skillLevel =
    difficulty === "beginner" || difficulty === "intermediate" || difficulty === "advanced"
      ? difficulty
      : undefined;

  // Create cache key and use cache with getOrSet
  const cacheKey = createCacheKey(query, category, difficulty, limit);
  const summaries = yield* cache.getOrSet(
    cacheKey,
    Effect.gen(function* () {
      // Cache miss - fetch from database
      const results = yield* patterns.searchPatterns({
        query,
        category,
        skillLevel,
        limit,
      });

      // Convert to summaries
      return results.map(toPatternSummary);
    }),
    300000 // 5 minute TTL for pattern searches
  );

  const traceId = tracing.getTraceId();

  return {
    count: summaries.length,
    patterns: summaries,
    traceId,
  };
});

export async function GET(request: NextRequest) {
  const result = await runWithRuntime(
    handleSearchPatterns(request).pipe(
      Effect.catchAll((error) => errorHandler(error))
    )
  );

  if (result instanceof Response) {
    return result;
  }

  return NextResponse.json(result, {
    status: 200,
    headers: {
      "x-trace-id": result.traceId || "",
    },
  });
}
