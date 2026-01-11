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
  isAuthenticationError,
  validateApiKey,
} from "../../../src/auth/apiKey";
import { PatternsService, runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

// Handler implementation with automatic span creation via Effect.fn
const handleSearchPatterns = Effect.fn("search-patterns")(function* (
  request: NextRequest
) {
  const tracing = yield* TracingService;
  const patterns = yield* PatternsService;

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

  // Search patterns using database
  const results = yield* patterns.searchPatterns({
    query,
    category,
    skillLevel,
    limit,
  });

  // Convert to summaries
  const summaries = results.map(toPatternSummary);

  const traceId = tracing.getTraceId();

  return {
    count: summaries.length,
    patterns: summaries,
    traceId,
  };
});

export async function GET(request: NextRequest) {
  try {
    const result = await runWithRuntime(handleSearchPatterns(request));

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "x-trace-id": result.traceId || "",
      },
    });
  } catch (error) {
    // Log error for debugging (in production, this goes to Vercel logs)
    console.error("[Patterns API] Error:", error);
    
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Return structured error response instead of crashing
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : "UnknownError",
      },
      { status: 500 }
    );
  }
}
