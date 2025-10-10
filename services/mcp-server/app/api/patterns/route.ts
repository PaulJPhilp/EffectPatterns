/**
 * Patterns Search Endpoint
 *
 * GET /api/patterns?q=...&category=...&difficulty=...&limit=...
 * Returns patterns matching search criteria
 */

import { NextRequest, NextResponse } from "next/server";
import { Effect } from "effect";
import { runWithRuntime, PatternsService } from "../../../src/server/init.js";
import { TracingService } from "../../../src/tracing/otlpLayer.js";
import { validateApiKey, isAuthenticationError } from "../../../src/auth/apiKey.js";
import { searchPatterns, toPatternSummary } from "@effect-patterns/toolkit";

export async function GET(request: NextRequest) {
  const searchEffect = Effect.gen(function* () {
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
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;

    // Get all patterns
    const allPatterns = yield* patterns.getAllPatterns();

    // Search with filters
    const results = searchPatterns(
      allPatterns,
      query,
      category,
      difficulty,
      limit
    );

    // Convert to summaries
    const summaries = results.map(toPatternSummary);

    const traceId = tracing.getTraceId();

    return {
      count: summaries.length,
      patterns: summaries,
      traceId,
    };
  });

  try {
    const result = await runWithRuntime(searchEffect);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "x-trace-id": result.traceId || "",
      },
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: String(error),
      },
      { status: 500 }
    );
  }
}
