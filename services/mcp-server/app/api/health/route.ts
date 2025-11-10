/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns service health status and version
 */

import { Effect } from "effect";
import { NextResponse } from "next/server";
import { runWithRuntime } from "../../../src/server/init";
import { TracingService } from "../../../src/tracing/otlpLayer";

export async function GET() {
  const healthEffect = Effect.gen(function* () {
    const tracing = yield* TracingService;
    const traceId = tracing.getTraceId();

    return {
      ok: true,
      version: "0.5.0",
      service: "effect-patterns-mcp-server",
      timestamp: new Date().toISOString(),
      traceId,
    };
  });

  try {
    const result = await runWithRuntime(healthEffect);

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
