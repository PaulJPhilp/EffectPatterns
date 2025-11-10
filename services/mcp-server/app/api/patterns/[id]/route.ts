/**
 * Get Pattern by ID Endpoint
 *
 * GET /api/patterns/:id
 * Returns full pattern details for a specific pattern ID
 */

import { Effect } from 'effect';
import { type NextRequest, NextResponse } from 'next/server';
import {
  isAuthenticationError,
  validateApiKey,
} from '../../../../src/auth/apiKey';
import {
  PatternsService,
  runWithRuntime,
} from '../../../../src/server/init';
import { TracingService } from '../../../../src/tracing/otlpLayer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const getPatternEffect = Effect.gen(function* () {
    const tracing = yield* TracingService;
    const patternsService = yield* PatternsService;

    // Validate API key
    yield* validateApiKey(request);

    // Get pattern ID from params
    const { id } = yield* Effect.promise(() => params);

    // Fetch pattern
    const pattern = yield* patternsService.getPatternById(id);

    if (!pattern) {
      return yield* Effect.fail(new Error(`Pattern not found: ${id}`));
    }

    const traceId = tracing.getTraceId();

    return {
      pattern,
      traceId,
    };
  });

  try {
    const result = await runWithRuntime(getPatternEffect);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'x-trace-id': result.traceId || '',
      },
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: String(error),
      },
      { status: 500 },
    );
  }
}
