/**
 * Generate Code Snippet Endpoint
 *
 * POST /api/generate
 * Generates a code snippet from a pattern with customization options
 *
 * With Effect.fn("generate-snippet"), spans are created automatically
 * in the OpenTelemetry trace.
 */

import { Schema as S } from "@effect/schema";
import { buildSnippet, GenerateRequest } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
  isAuthenticationError,
  validateApiKey,
} from "../../../src/auth/apiKey.js";
import { PatternsService, runWithRuntime } from "../../../src/server/init.js";
import { TracingService } from "../../../src/tracing/otlpLayer.js";

// Handler implementation with automatic span creation via Effect.fn
const handleGenerateSnippet = Effect.fn("generate-snippet")(function* (
  request: NextRequest
) {
  const tracing = yield* TracingService;
  const patternsService = yield* PatternsService;

  // Validate API key
  yield* validateApiKey(request);

  // Parse and validate request body
  const body = yield* Effect.tryPromise(() => request.json());
  const generateRequest = yield* S.decode(GenerateRequest)(body);

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
      new Error(`Pattern not found: ${generateRequest.patternId}`)
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
  try {
    const result = await runWithRuntime(handleGenerateSnippet(request));

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "x-trace-id": result.traceId || "",
      },
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: String(error),
      },
      { status: 400 }
    );
  }
}
