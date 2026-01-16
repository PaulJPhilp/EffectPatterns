/**
 * Generate Code Snippet Endpoint
 *
 * POST /api/generate
 * Generates a code snippet from a pattern with customization options
 *
 * With Effect.fn("generate-snippet"), spans are created automatically
 * in the OpenTelemetry trace.
 */

import { validateTierAccess } from "@/auth/tierAccess";
import { buildSnippet, GenerateRequest } from "@effect-patterns/toolkit";
import { Schema as S } from "@effect/schema";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
} from "../../../src/auth/apiKey";
import { errorHandler } from "../../../src/server/errorHandler";
import { PatternNotFoundError } from "../../../src/errors";
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

  // Get the pattern
  const pattern = yield* patternsService.getPatternById(
    generateRequest.patternId
  );

  if (!pattern) {
    return yield* Effect.fail(
      new PatternNotFoundError({
        patternId: generateRequest.patternId,
      })
    );
  }

  // Generate snippet
  const snippet = buildSnippet({
    pattern,
    customName: generateRequest.name,
    customInput: generateRequest.input,
    moduleType: generateRequest.moduleType,
    effectVersion: generateRequest.effectVersion,
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
