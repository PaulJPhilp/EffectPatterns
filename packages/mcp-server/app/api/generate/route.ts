/**
 * Generate Code Snippet Endpoint
 *
 * POST /api/generate
 * Generates a code snippet from a pattern with customization options
 *
 * With Effect.fn("generate-snippet"), spans are created automatically
 * in the OpenTelemetry trace.
 */

import { buildSnippet, GenerateRequest } from "@effect-patterns/toolkit";
import { Schema as S } from "@effect/schema";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
    validateApiKey,
} from "../../../src/auth/apiKey";
import { validateTierAccess } from "../../../src/auth/tierAccess";
import { PatternNotFoundError } from "../../../src/errors";
import { errorHandler } from "../../../src/server/errorHandler";
import { PatternsService, runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

// Handler implementation with automatic span creation via Effect.fn
const handleGenerateSnippet = Effect.fn("generate-snippet")(function* (
  request: NextRequest
) {
  const tracing = yield* TracingService;
  const patternsService = yield* PatternsService;

  // Validate API key
  yield* validateApiKey(request);

  // Validate tier access
  yield* validateTierAccess(request);

  // Parse and validate request body
  const body = yield* Effect.tryPromise({
    try: () => request.json(),
    catch: (error) => new Error(`Invalid JSON: ${error}`),
  });
  const generateRequest = yield* S.decode(GenerateRequest)(body as any);

  // Annotate span with request details
  yield* Effect.annotateCurrentSpan({
    patternId: generateRequest.patternId,
    moduleType: generateRequest.moduleType,
  });

  // Get the pattern - handle both undefined result and errors
  const patternResult = yield* patternsService.getPatternById(
    generateRequest.patternId
  ).pipe(
    Effect.catchAll(() => {
      // If pattern lookup fails (DB error, etc), return PatternNotFoundError
      return Effect.succeed(undefined);
    })
  );
  
  const pattern = patternResult;

  if (!pattern) {
    return yield* Effect.fail(
      new PatternNotFoundError({
        patternId: generateRequest.patternId,
      })
    );
  }

  // Generate snippet - wrap in try/catch to handle any buildSnippet errors
  const snippet = yield* Effect.try({
    try: () => buildSnippet({
      pattern,
      customName: generateRequest.name,
      customInput: generateRequest.input,
      moduleType: generateRequest.moduleType,
      effectVersion: generateRequest.effectVersion,
    }),
    catch: () => {
      // If buildSnippet fails, it's likely because pattern structure is invalid
      // Return PatternNotFoundError to be consistent
      return new PatternNotFoundError({
        patternId: generateRequest.patternId,
      });
    },
  });

  const traceId = tracing.getTraceId();

  return {
    patternId: pattern.id,
    title: pattern.title,
    snippet,
    traceId,
    timestamp: new Date().toISOString(),
  };
});

export async function POST(request: NextRequest) {
  const result = await runWithRuntime(
    handleGenerateSnippet(request).pipe(
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
