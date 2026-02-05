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
import { type NextRequest } from "next/server";
import { PatternNotFoundError } from "../../../src/errors";
import { PatternsService } from "../../../src/server/init";
import { createRouteHandler } from "../../../src/server/routeHandler";

// Handler implementation with automatic span creation via Effect.fn
const handleGenerateSnippet = Effect.fn("generate-snippet")(function* (
  request: NextRequest
) {
  const patternsService = yield* PatternsService;

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

  return {
    patternId: pattern.id,
    title: pattern.title,
    snippet,
  };
});

export const POST = createRouteHandler(handleGenerateSnippet, {
  requireAuth: true,
  requirePaidTier: true,
});
