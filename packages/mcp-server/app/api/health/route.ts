/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns service health status and version
 *
 * Lightweight health check that doesn't require database or tracing connectivity
 * to avoid crashes during cold starts or connection issues.
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple synchronous health check - no external dependencies
    const result = {
      ok: true,
      version: "0.5.0",
      service: "effect-patterns-mcp-server",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    // Return error response instead of crashing
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
        version: "0.5.0",
        service: "effect-patterns-mcp-server",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
