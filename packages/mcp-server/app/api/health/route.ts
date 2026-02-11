/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns service health status and version
 *
 * Lightweight health check that doesn't require database or tracing connectivity
 * to avoid crashes during cold starts or connection issues.
 */

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const SERVICE_NAME = "effect-patterns-mcp-server";
const SERVICE_VERSION = "0.7.7";

export async function GET() {
  try {
    // Generate a trace ID for this request
    const traceId = randomUUID();

    // Simple synchronous health check - no external dependencies
    const result = {
      ok: true,
      version: SERVICE_VERSION,
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      traceId,
    };

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "x-trace-id": traceId,
      },
    });
  } catch (error) {
    // Generate a trace ID for error response
    const traceId = randomUUID();

    // Return error response instead of crashing
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
        version: SERVICE_VERSION,
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        traceId,
      },
      {
        status: 500,
        headers: {
          "x-trace-id": traceId,
        },
      }
    );
  }
}
