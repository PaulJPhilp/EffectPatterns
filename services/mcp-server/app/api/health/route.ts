/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns service health status and version
 *
 * With Effect.fn("health-check"), spans are created automatically
 * in the OpenTelemetry trace.
 */

import { Effect } from "effect";
import { NextResponse } from "next/server";
import { runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

// Handler implementation with automatic span creation via Effect.fn
const handleHealthCheck = Effect.fn("health-check")(function* () {
  const tracing = yield* TracingService;
  const traceId = tracing.getTraceId();

  // Annotate span with service info
  yield* Effect.annotateCurrentSpan({
    service: "effect-patterns-mcp-server",
    version: "0.5.0",
  });

  return {
    ok: true,
    version: "0.5.0",
    service: "effect-patterns-mcp-server",
    timestamp: new Date().toISOString(),
    traceId,
  };
});

export async function GET() {
  try {
    const result = await runWithRuntime(handleHealthCheck());

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "x-trace-id": result.traceId || "",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
