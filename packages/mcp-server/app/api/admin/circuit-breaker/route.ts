/**
 * Circuit Breaker Admin Endpoint
 *
 * GET /api/admin/circuit-breaker - View all circuit breaker states
 * POST /api/admin/circuit-breaker - Reset a specific circuit
 *
 * Admin-only endpoint for monitoring and managing circuit breakers.
 * Requires x-admin-key header. Uses standard admin auth via routeHandler.
 */

import type { NextRequest } from "next/server";
import { Effect } from "effect";
import { CircuitBreakerService } from "../../../../src/services/circuit-breaker";
import {
  createRouteHandler,
  createSimpleHandler,
} from "../../../../src/server/routeHandler";
import { ValidationError } from "../../../../src/errors";

/**
 * GET /api/admin/circuit-breaker
 * Returns current state of all circuit breakers
 */
const handleGetStats = (_request: NextRequest) =>
  Effect.gen(function* () {
    const cb = yield* CircuitBreakerService;
    const stats = yield* cb.getStats();
    return { ok: true, data: stats };
  });

export const GET = createRouteHandler(handleGetStats, {
  requireAuth: false,
  requireAdmin: true,
});

/**
 * POST /api/admin/circuit-breaker
 * Reset a specific circuit breaker to CLOSED state
 */
const handleReset = (request: NextRequest) =>
  Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => request.json() as Promise<Record<string, unknown>>,
      catch: () =>
        new ValidationError({ field: "body", message: "Invalid request body" }),
    });

    const { circuitName } = body;

    if (!circuitName || typeof circuitName !== "string") {
      return yield* Effect.fail(
        new ValidationError({
          field: "circuitName",
          message: "circuitName is required and must be a string",
        })
      );
    }

    const cb = yield* CircuitBreakerService;
    yield* cb.reset(circuitName);

    return {
      ok: true,
      message: `Circuit "${circuitName}" reset to CLOSED state`,
      timestamp: new Date().toISOString(),
    };
  });

export const POST = createSimpleHandler(handleReset, {
  requireAuth: false,
  requireAdmin: true,
});
