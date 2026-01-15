/**
 * Shared Error Handler for API Routes
 *
 * Provides consistent error handling across all MCP server endpoints.
 * Converts typed errors to appropriate HTTP responses with proper status codes.
 */

import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import {
  isAuthenticationError,
  isAuthorizationError,
} from "../auth/apiKey";
import {
  isTierAccessError,
} from "../auth/tierAccess";
import type {
  AuthenticationError,
  AuthorizationError,
  TierAccessError,
  PatternNotFoundError,
  ValidationError,
  RateLimitError,
  FileSizeError,
  NonTypeScriptError,
  RequestValidationError,
  PatternValidationError,
  PatternLoadError,
} from "../errors";

/**
 * Guard functions for each error type
 */
function isPatternNotFoundError(
  error: unknown
): error is PatternNotFoundError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "PatternNotFoundError"
  );
}

function isValidationError(
  error: unknown
): error is ValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "ValidationError"
  );
}

function isRequestValidationError(
  error: unknown
): error is RequestValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "RequestValidationError"
  );
}

function isRateLimitError(
  error: unknown
): error is RateLimitError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "RateLimitError"
  );
}

function isFileSizeError(
  error: unknown
): error is FileSizeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "FileSizeError"
  );
}

function isNonTypeScriptError(
  error: unknown
): error is NonTypeScriptError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "NonTypeScriptError"
  );
}

function isPatternValidationError(
  error: unknown
): error is PatternValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "PatternValidationError"
  );
}

function isPatternLoadError(
  error: unknown
): error is PatternLoadError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "PatternLoadError"
  );
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
 */
export function errorToResponse(
  error: unknown,
  traceId?: string
): Response {
  const baseHeaders: Record<string, string> = {};
  if (traceId) {
    baseHeaders["x-trace-id"] = traceId;
  }

  // Authentication errors (401)
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

  // Authorization errors (403)
  if (isAuthorizationError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "forbidden",
    };
    return NextResponse.json(response, {
      status: 403,
      headers: baseHeaders,
    });
  }

  // Tier access errors (402 Payment Required)
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

  // Pattern not found (404)
  if (isPatternNotFoundError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "not_found",
    };
    return NextResponse.json(response, {
      status: 404,
      headers: baseHeaders,
    });
  }

  // File size errors (413 Payload Too Large)
  if (isFileSizeError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "payload_too_large",
      maxSize: (error as any).maxSize,
      actualSize: (error as any).actualSize,
    };
    return NextResponse.json(response, {
      status: 413,
      headers: baseHeaders,
    });
  }

  // Non-TypeScript file errors (400 Bad Request)
  if (isNonTypeScriptError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "invalid_file_type",
    };
    return NextResponse.json(response, {
      status: 400,
      headers: baseHeaders,
    });
  }

  // Rate limit errors (429 Too Many Requests)
  if (isRateLimitError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "rate_limit_exceeded",
    };
    return NextResponse.json(response, {
      status: 429,
      headers: {
        ...baseHeaders,
        "X-RateLimit-Reset": new Date(
          (error as any).resetTime
        ).toISOString(),
      },
    });
  }

  // Validation errors (400 Bad Request)
  if (isValidationError(error) || isRequestValidationError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "validation_failed",
      details: (error as any).details,
    };
    return NextResponse.json(response, {
      status: 400,
      headers: baseHeaders,
    });
  }

  // Pattern validation errors (400 Bad Request)
  if (isPatternValidationError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "pattern_validation_failed",
    };
    return NextResponse.json(response, {
      status: 400,
      headers: baseHeaders,
    });
  }

  // Pattern load errors (500 Internal Server Error)
  if (isPatternLoadError(error)) {
    const response: ApiErrorResponse = {
      error: error.message,
      status: "pattern_load_error",
    };
    return NextResponse.json(response, {
      status: 500,
      headers: baseHeaders,
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

    // Default to 500 for unhandled errors
    const response: ApiErrorResponse = {
      error: error.message,
      status: "internal_server_error",
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
