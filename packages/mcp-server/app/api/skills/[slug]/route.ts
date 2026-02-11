/**
 * Get Skill by Slug Endpoint
 *
 * GET /api/skills/:slug
 * Returns full skill details for a specific skill slug
 */

import { getSkillBySlugDb } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
    validateApiKey,
} from "../../../../src/auth/apiKey";
import { SkillNotFoundError } from "../../../../src/errors";
import { errorHandler, errorToResponse } from "../../../../src/server/errorHandler";
import { runWithRuntime } from "../../../../src/server/init";
import { TracingService } from "../../../../src/tracing/otlpLayer";

const handleGetSkill = (request: NextRequest, slug: string) => Effect.gen(function* () {
  const tracing = yield* TracingService;

  // Validate API key
  yield* validateApiKey(request);

  // Annotate span with skill slug
  yield* Effect.annotateCurrentSpan({ slug });

  const dbUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;
  const result = yield* Effect.tryPromise({
    try: () => getSkillBySlugDb(slug, dbUrl),
    catch: () => undefined,
  });

  if (!result) {
    return yield* Effect.fail(new SkillNotFoundError({ slug }));
  }

  const traceId = tracing.getTraceId();

  return {
    skill: result,
    traceId,
  };
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await runWithRuntime(
      handleGetSkill(request, slug).pipe(
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
    // Runtime init or unexpected failure: avoid runWithRuntime (may fail again).
    // Use errorToResponse directly; no Effect runtime required.
    const traceId = randomUUID().replace(/-/g, "");
    return errorToResponse(error, traceId);
  }
}
