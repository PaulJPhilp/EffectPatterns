/**
 * Get Pattern by ID Endpoint
 *
 * GET /api/patterns/:id
 * Returns full pattern details for a specific pattern ID
 *
 * With Effect.fn("get-pattern"), spans are created automatically
 * in the OpenTelemetry trace.
 */

import { getPatternByIdDb } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
    validateApiKey,
} from "../../../../src/auth/apiKey";
import { PatternNotFoundError } from "../../../../src/errors";
import { errorHandler } from "../../../../src/server/errorHandler";
import { runWithRuntime } from "../../../../src/server/init";
import { TracingService } from "../../../../src/tracing/otlpLayer";

// Handler implementation with automatic span creation via Effect.fn
const handleGetPattern = (request: NextRequest, patternId: string) => Effect.gen(function* () {
  const tracing = yield* TracingService;

  // Validate API key
  yield* validateApiKey(request);

  // Annotate span with pattern ID
  yield* Effect.annotateCurrentSpan({
    patternId,
  });

  // Fetch pattern - handle errors gracefully
  const dbUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;
  const result = yield* Effect.tryPromise({
    try: () => getPatternByIdDb(patternId, dbUrl),
    catch: () => undefined,
  });

  if (!result) {
    return yield* Effect.fail(new PatternNotFoundError({ patternId }));
  }

  const pattern = result;

  const traceId = tracing.getTraceId();

  return {
    pattern,
    traceId,
  };
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await runWithRuntime(
      handleGetPattern(request, id).pipe(
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
  } catch (error) {
    // Handle any unhandled errors (defects, etc.)
    const errorResponse = await runWithRuntime(errorHandler(error));
    return errorResponse;
  }
}
