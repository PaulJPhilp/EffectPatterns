/**
 * Circuit Breaker Admin Endpoint
 *
 * GET /api/admin/circuit-breaker - View all circuit breaker states
 * POST /api/admin/circuit-breaker/reset - Reset a specific circuit
 *
 * Admin-only endpoint for monitoring and managing circuit breakers.
 * Requires x-admin-key header.
 */

import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { Effect } from "effect";
import { CircuitBreakerService } from "../../../../src/services/circuit-breaker";
import { runWithRuntime } from "../../../../src/server/init";

/**
 * Verify admin access
 */
function verifyAdminAccess(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.warn(
      "[Circuit Breaker Admin] ADMIN_API_KEY not configured - admin endpoints disabled"
    );
    return false;
  }

  return adminKey === expectedKey;
}

/**
 * GET /api/admin/circuit-breaker
 * Returns current state of all circuit breakers
 */
export async function GET(request: NextRequest) {
  const traceId = randomUUID();

  try {
    // Verify admin access
    if (!verifyAdminAccess(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid or missing admin key",
          traceId,
        },
        {
          status: 401,
          headers: { "x-trace-id": traceId },
        }
      );
    }

    // Get circuit breaker stats
    const stats = await runWithRuntime(
      Effect.gen(function* () {
        const cb = yield* CircuitBreakerService;
        return yield* cb.getStats();
      })
    );

    return NextResponse.json(
      {
        ok: true,
        data: stats,
        timestamp: new Date().toISOString(),
        traceId,
      },
      {
        status: 200,
        headers: { "x-trace-id": traceId },
      }
    );
  } catch (error) {
    console.error("[Circuit Breaker Admin] GET failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to get circuit breaker stats",
        message: String(error),
        traceId,
      },
      {
        status: 500,
        headers: { "x-trace-id": traceId },
      }
    );
  }
}

/**
 * POST /api/admin/circuit-breaker/reset
 * Reset a specific circuit breaker to CLOSED state
 */
export async function POST(request: NextRequest) {
  const traceId = randomUUID();

  try {
    // Verify admin access
    if (!verifyAdminAccess(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid or missing admin key",
          traceId,
        },
        {
          status: 401,
          headers: { "x-trace-id": traceId },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { circuitName } = body;

    if (!circuitName || typeof circuitName !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "circuitName is required and must be a string",
          traceId,
        },
        {
          status: 400,
          headers: { "x-trace-id": traceId },
        }
      );
    }

    // Reset the circuit
    await runWithRuntime(
      Effect.gen(function* () {
        const cb = yield* CircuitBreakerService;
        yield* cb.reset(circuitName);
      })
    );

    return NextResponse.json(
      {
        ok: true,
        message: `Circuit "${circuitName}" reset to CLOSED state`,
        timestamp: new Date().toISOString(),
        traceId,
      },
      {
        status: 200,
        headers: { "x-trace-id": traceId },
      }
    );
  } catch (error) {
    console.error("[Circuit Breaker Admin] POST failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to reset circuit breaker",
        message: String(error),
        traceId,
      },
      {
        status: 500,
        headers: { "x-trace-id": traceId },
      }
    );
  }
}
