/**
 * Get Pattern by ID Endpoint
 *
 * GET /api/patterns/:id
 * Returns full pattern details for a specific pattern ID
 *
 * With Effect.fn("get-pattern"), spans are created automatically
 * in the OpenTelemetry trace.
 */

import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
} from "../../../../src/auth/apiKey";
import { errorHandler } from "../../../../src/server/errorHandler";
import { MCPCacheService } from "../../../../src/services/cache";
import { PatternsService, runWithRuntime } from "../../../../src/server/init";
import { TracingService } from "../../../../src/tracing/otlpLayer";

// Handler implementation with automatic span creation via Effect.fn
const handleGetPattern = Effect.fn("get-pattern")(function* (
  request: NextRequest,
  patternId: string
) {
  const tracing = yield* TracingService;
  const patternsService = yield* PatternsService;
  const cache = yield* MCPCacheService;

  // Validate API key
  yield* validateApiKey(request);

  // Annotate span with pattern ID
  yield* Effect.annotateCurrentSpan({
    patternId,
  });

  // Fetch pattern with caching
  const pattern = yield* cache.getOrSet(
    `pattern:${patternId}`,
    Effect.gen(function* () {
      const result = yield* patternsService.getPatternById(patternId);

      if (!result) {
        return yield* Effect.fail(
          new Error(`Pattern not found: ${patternId}`)
        );
      }

      return result;
    }),
    600000 // 10 minute TTL for individual patterns
  );

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
}
