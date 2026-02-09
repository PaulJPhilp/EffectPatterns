/**
 * Shared Error Handler for API Routes
 *
 * Provides consistent error handling across all MCP server endpoints.
 * Converts typed errors to appropriate HTTP responses with proper status codes.
 */

import { Effect } from "effect";
import { NextResponse } from "next/server";
import {
    isAuthenticationError,
} from "../auth/apiKey";
import {
    isTierAccessError,
} from "../auth/tierAccess";
import {
    AuthorizationError,
    PatternLoadError,
    PatternNotFoundError,
    PatternValidationError,
    RateLimitError,
    RequestValidationError,
    SkillNotFoundError,
    ValidationError,
    ConfigurationError,
    CircuitBreakerOpenError,
} from "../errors";
import { FileSizeError, NonTypeScriptError } from "../services/review-code";

/**
 * Helper to check if error has a _tag property
 */
function hasTag(error: unknown): error is { _tag: string } {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  
  // Type-safe check for _tag property
  const errorObj = error as Record<string, unknown>;
  return "_tag" in errorObj && typeof errorObj._tag === "string";
}

/**
 * Standard API error response structure
 */
interface ApiErrorResponse {
  error: string;
  traceId?: string;
  status?: string;
  tier?: string;
  upgradeMessage?: string;
  maxSize?: number;
  actualSize?: number;
  details?: Record<string, unknown>;
}

/**
 * Convert errors to HTTP responses
 *
 * Handles all typed error cases and returns appropriate status codes and messages.
 * Uses tag-based dispatch for type-safe error handling.
 */
export function errorToResponse(
  error: unknown,
  traceId?: string
): Response {
  const baseHeaders: Record<string, string> = {};
  if (traceId) {
    baseHeaders["x-trace-id"] = traceId;
  }

  // Handle tagged errors by tag
  if (hasTag(error)) {
    switch (error._tag) {
      case "FileSizeError": {
        const e = error as FileSizeError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "payload_too_large",
          maxSize: e.maxSize,
          actualSize: e.size,
        };
        return NextResponse.json(response, {
          status: 413,
          headers: baseHeaders,
        });
      }

      case "NonTypeScriptError": {
        const e = error as NonTypeScriptError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "non_typescript_file",
        };
        return NextResponse.json(response, {
          status: 400,
          headers: baseHeaders,
        });
      }

      case "AuthorizationError": {
        const e = error as AuthorizationError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "forbidden",
        };
        return NextResponse.json(response, {
          status: 403,
          headers: baseHeaders,
        });
      }

      case "PatternNotFoundError": {
        const e = error as PatternNotFoundError;
        const response: ApiErrorResponse = {
          error: `Pattern '${e.patternId}' not found`,
          status: "not_found",
        };
        return NextResponse.json(response, {
          status: 404,
          headers: baseHeaders,
        });
      }

      case "SkillNotFoundError": {
        const e = error as SkillNotFoundError;
        const response: ApiErrorResponse = {
          error: `Skill '${e.slug}' not found`,
          status: "not_found",
        };
        return NextResponse.json(response, {
          status: 404,
          headers: baseHeaders,
        });
      }

      case "RateLimitError": {
        const e = error as RateLimitError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "rate_limit_exceeded",
        };
        return NextResponse.json(response, {
          status: 429,
          headers: {
            ...baseHeaders,
            "X-RateLimit-Reset": e.resetTime.toISOString(),
          },
        });
      }

      case "ValidationError": {
        const e = error as ValidationError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "validation_failed",
          details: { field: e.field, value: e.value },
        };
        return NextResponse.json(response, {
          status: 400,
          headers: baseHeaders,
        });
      }

      case "RequestValidationError": {
        const e = error as RequestValidationError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "validation_failed",
          details: { endpoint: e.endpoint, errors: e.errors },
        };
        return NextResponse.json(response, {
          status: 400,
          headers: baseHeaders,
        });
      }

      case "PatternValidationError": {
        const e = error as PatternValidationError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "pattern_validation_failed",
        };
        return NextResponse.json(response, {
          status: 400,
          headers: baseHeaders,
        });
      }

      case "ConfigurationError": {
        const e = error as ConfigurationError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "configuration_error",
          details: { key: e.key, expected: e.expected, received: e.received },
        };
        return NextResponse.json(response, {
          status: 500,
          headers: baseHeaders,
        });
      }

      case "PatternLoadError": {
        const e = error as PatternLoadError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "pattern_load_error",
        };
        return NextResponse.json(response, {
          status: 500,
          headers: baseHeaders,
        });
      }

      case "CircuitBreakerOpenError": {
        const e = error as CircuitBreakerOpenError;
        const response: ApiErrorResponse = {
          error: e.message,
          status: "service_unavailable",
          details: {
            circuit: e.circuitName,
            openedAt: e.openedAt.toISOString(),
          },
        };
        return NextResponse.json(response, {
          status: 503,
          headers: {
            ...baseHeaders,
            "Retry-After": "60",
          },
        });
      }
    }
  }

  // Check for authentication errors (uses custom type guard from auth module)
  if (isAuthenticationError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "authentication_required",
    };
    return NextResponse.json(response, {
      status: 401,
      headers: baseHeaders,
    });
  }

  // Check for tier access errors (uses custom type guard from auth module)
  if (isTierAccessError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "payment_required",
      tier: error.tierMode,
      upgradeMessage: error.upgradeMessage,
    };
    return NextResponse.json(response, {
      status: 402,
      headers: {
        ...baseHeaders,
        "X-Tier-Error": "feature-gated",
      },
    });
  }

  // Generic Error instances
  if (error instanceof Error) {
    // Check for JSON parsing errors
    if (error.message.includes("Invalid JSON")) {
      const response: ApiErrorResponse = {
        error: error.message,
        status: "invalid_json",
      };
      return NextResponse.json(response, {
        status: 400,
        headers: baseHeaders,
      });
    }

    // Check for schema validation errors from @effect/schema
    if (error.message.includes("is missing") || error.message.includes("└─")) {
      const response: ApiErrorResponse = {
        error: error.message,
        status: "validation_failed",
      };
      return NextResponse.json(response, {
        status: 400,
        headers: baseHeaders,
      });
    }

    // Default to 500 for unhandled errors (include structured details when available)
    const err = error as any;
    const response: ApiErrorResponse = {
      error: error.message,
      status: "internal_server_error",
      details: {
        code: err?.code,
        detail: err?.detail,
        hint: err?.hint,
        constraint: err?.constraint,
        table: err?.table ?? err?.table_name,
        column: err?.column ?? err?.column_name,
        schema: err?.schema ?? err?.schema_name,
        where: err?.where,
        cause: err?.cause?.message ?? err?.cause,
      },
    };
    return NextResponse.json(response, {
      status: 500,
      headers: baseHeaders,
    });
  }

  // Unknown error type
  const response: ApiErrorResponse = {
    error: String(error),
    status: "unknown_error",
  };
  return NextResponse.json(response, {
    status: 500,
    headers: baseHeaders,
  });
}

/**
 * Create an error handler Effect that returns a Response
 *
 * Use this in route handlers with Effect.catchAll to handle errors consistently.
 *
 * Example:
 * ```
 * const result = await runWithRuntime(
 *   handleOperation(request).pipe(
 *     Effect.catchAll((error) => errorHandler(error, traceId))
 *   )
 * );
 * return result;
 * ```
 */
export function errorHandler(
  error: unknown,
  traceId?: string
): Effect.Effect<Response> {
  return Effect.succeed(errorToResponse(error, traceId));
}
