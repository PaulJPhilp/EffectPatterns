/**
 * Route Handler Factory
 *
 * Provides reusable patterns for creating API route handlers with
 * consistent authentication, error handling, and response formatting.
 */

import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { validateApiKey } from "../auth/apiKey";
import { validateAdminKey } from "../auth/adminAuth";
import { errorHandler } from "./errorHandler";
import { runWithRuntime } from "./init";
import { TracingService } from "../tracing/otlpLayer";

/**
 * Route handler options
 */
export interface RouteHandlerOptions {
  /**
   * Whether to require API key authentication (default: true)
   */
  requireAuth?: boolean;

  /**
   * Whether to require admin authentication (default: false)
   * Set to true for admin operations
   */
  requireAdmin?: boolean;

  /**
   * Whether to include request ID in response headers (default: true)
   */
  includeTraceId?: boolean;
}

/**
 * Response with metadata
 */
export interface RouteResponse<T> {
  data: T;
  traceId?: string;
  timestamp?: string;
}

/**
 * Create an authenticated route handler
 *
 * Handles common patterns like authentication, authorization, and error handling.
 *
 * Example:
 * ```typescript
 * const handleSearch = Effect.fn("search")(function* (request: NextRequest) {
 *   // Business logic here
 *   return { results: [...] };
 * });
 *
 * export const GET = createRouteHandler(handleSearch, {
 *   requireAuth: true,
 *   requireAdmin: false
 * });
 * ```
 */
export function createRouteHandler<T, E>(
  handler: (request: NextRequest) => Effect.Effect<T, E, any>,
  options: RouteHandlerOptions = {}
) {
  const {
    requireAuth = true,
    requireAdmin = false,
    includeTraceId = true,
  } = options;

  return async (request: NextRequest) => {
    // Wrap handler with authentication and error handling
    const effect = Effect.gen(function* () {
      // Authentication layer
      if (requireAdmin) {
        yield* validateAdminKey(request);
      } else if (requireAuth) {
        yield* validateApiKey(request);
      }

      // Execute handler
      const data = yield* handler(request);

      // Get trace ID if requested
      let traceId: string | undefined;
      if (includeTraceId) {
        const tracing = yield* TracingService;
        traceId = tracing.getTraceId() ?? undefined;
      }

      return {
        data,
        traceId,
        timestamp: new Date().toISOString(),
      };
    });

    // Execute with error handling
    const result = await runWithRuntime(
      effect.pipe(Effect.catchAll((error) => errorHandler(error)))
    );

    // Handle Response objects (from error handler)
    if (result instanceof Response) {
      return result;
    }

    // Return successful response
    return NextResponse.json(result, {
      status: 200,
      headers: result.traceId ? { "x-trace-id": result.traceId } : {},
    });
  };
}

/**
 * Simplified route handler factory for routes that only need basic auth
 *
 * Example:
 * ```typescript
 * const handleSearch = Effect.fn("search")(function* () {
 *   return { results: [...] };
 * });
 *
 * export const GET = createPublicHandler(handleSearch);
 * ```
 */
export function createPublicHandler<T, E>(
  handler: () => Effect.Effect<T, E, any>
) {
  return async () => {
    const effect = Effect.gen(function* () {
      const data = yield* handler();
      const tracing = yield* TracingService;
      const traceId = tracing.getTraceId() ?? undefined;

      return {
        data,
        traceId,
        timestamp: new Date().toISOString(),
      };
    });

    const result = await runWithRuntime(
      effect.pipe(Effect.catchAll((error) => errorHandler(error)))
    );

    if (result instanceof Response) {
      return result;
    }

    return NextResponse.json(result, {
      status: 200,
      headers: result.traceId ? { "x-trace-id": result.traceId } : {},
    });
  };
}

/**
 * Create a simple API endpoint that returns data without wrapper
 *
 * Useful for endpoints that return arrays or simple objects directly
 *
 * Example:
 * ```typescript
 * export const GET = createSimpleHandler(
 *   Effect.fn("list")(function* () {
 *     return [{ id: 1, name: "item" }];
 *   }),
 *   { requireAuth: true }
 * );
 * ```
 */
export function createSimpleHandler<T, E>(
  handler: (request: NextRequest) => Effect.Effect<T, E, any>,
  options: RouteHandlerOptions = {}
) {
  const {
    requireAuth = true,
    requireAdmin = false,
  } = options;

  return async (request: NextRequest) => {
    const effect = Effect.gen(function* () {
      // Authentication layer
      if (requireAdmin) {
        yield* validateAdminKey(request);
      } else if (requireAuth) {
        yield* validateApiKey(request);
      }

      // Execute handler
      const data = yield* handler(request);
      const tracing = yield* TracingService;
      const traceId = tracing.getTraceId() ?? undefined;

      return { data, traceId };
    });

    const result = await runWithRuntime(
      effect.pipe(Effect.catchAll((error) => errorHandler(error)))
    );

    if (result instanceof Response) {
      return result;
    }

    const headers: Record<string, string> = {};
    if (result.traceId) {
      headers["x-trace-id"] = result.traceId;
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers,
    });
  };
}
