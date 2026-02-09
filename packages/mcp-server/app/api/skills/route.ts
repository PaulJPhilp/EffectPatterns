/**
 * Skills Search Endpoint
 *
 * GET /api/skills?q=...&category=...&limit=...
 * Returns skills matching search criteria
 */

import { searchSkillsDb } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  validateApiKey,
} from "../../../src/auth/apiKey";
import { errorHandler, errorToResponse } from "../../../src/server/errorHandler";
import { runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

const handleSearchSkills = Effect.fn("search-skills")(function* (
  request: NextRequest
) {
  const tracing = yield* TracingService;

  // Validate API key
  yield* validateApiKey(request);

  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const limit = searchParams.get("limit")
    ? Number.parseInt(searchParams.get("limit")!, 10)
    : undefined;

  // Annotate span with search parameters
  yield* Effect.annotateCurrentSpan({
    query: query || "none",
    category: category || "all",
    limit: limit ? String(limit) : "default",
  });

  const dbUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;
  const results = yield* Effect.tryPromise({
    try: () =>
      searchSkillsDb(
        { query, category, limit },
        dbUrl
      ),
    catch: (error) => new Error(`Failed to search skills: ${String(error)}`),
  });

  let traceId = tracing.getTraceId();

  if (!traceId) {
    traceId = randomUUID().replace(/-/g, '');
  }

  return {
    count: results.length,
    skills: results,
    traceId,
  };
});

export async function GET(request: NextRequest) {
  try {
    const result = await runWithRuntime(
      handleSearchSkills(request).pipe(
        Effect.catchAll((error) => errorHandler(error))
      )
    );

    if (result instanceof Response) {
      return result;
    }

    return NextResponse.json(result, {
      status: 200,
      headers: result.traceId ? {
        "x-trace-id": result.traceId,
      } : {},
    });
  } catch (error) {
    const traceId = randomUUID().replace(/-/g, "");
    return errorToResponse(error, traceId);
  }
}
