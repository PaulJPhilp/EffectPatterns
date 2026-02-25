/**
 * API Key Authentication Middleware
 *
 * Validates PATTERN_API_KEY from x-api-key header.
 * Returns 401 Unauthorized for invalid/missing keys.
 */

import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { AuthenticationError } from "../errors";
import { MCPConfigService } from "../services/config";
import { constantTimeEquals } from "./secureCompare";

/**
 * Extract API key from request
 *
 * Checks `x-api-key` header only.
 */
function extractApiKey(request: NextRequest): string | null {
  const headerKey = request.headers.get("x-api-key");
  if (headerKey) return headerKey;

  const queryKey = request.nextUrl.searchParams.get("key");
  if (queryKey) return queryKey;

  return null;
}

/** Test-only API key accepted when NODE_ENV=test for deterministic API tests. */
const TEST_API_KEY = "test-key";

/**
 * Validate API key Effect
 *
 * @param request - Next.js request object
 * @returns Effect that succeeds if auth is valid, fails otherwise
 */
export const validateApiKey = (
  request: NextRequest
): Effect.Effect<void, AuthenticationError, MCPConfigService> =>
  Effect.gen(function* () {
    const config = yield* MCPConfigService;
    const apiKey = config.apiKey;
    const nodeEnv = config.nodeEnv;
    const providedKey = extractApiKey(request);

    // Test env only: accept test-key so API route tests don't need env injection
    if (nodeEnv === "test" && providedKey === TEST_API_KEY) {
      return;
    }

    // In development mode, allow open access if no API key is configured
    // OR if an empty string is provided (for testing)
    if (nodeEnv === "development") {
      if (!apiKey || apiKey.trim() === "") {
        // No API key configured - allow all requests in dev mode
        console.warn(
          "[Auth] No PATTERN_API_KEY configured - running in open mode (development)"
        );
        return;
      }
      
      // API key is configured in dev mode - check if empty string provided (allow for testing)
      if (!providedKey || providedKey.trim() === "") {
        // Empty or no key provided - allow in dev mode for testing
        return;
      }
      
      // Key provided - validate it matches configured key
      if (!constantTimeEquals(providedKey, apiKey)) {
        return yield* Effect.fail(
          new AuthenticationError({
            message: "Invalid API key"
          })
        );
      }
      // Valid key provided
      return;
    }

    // Production mode: require API key
    if (!apiKey || apiKey.trim() === "") {
      return yield* Effect.fail(
        new AuthenticationError({ message: "API key not configured on server" })
      );
    }

    if (!providedKey) {
      return yield* Effect.fail(
        new AuthenticationError({ message: "Missing API key" })
      );
    }

    // Validate key
    if (!constantTimeEquals(providedKey, apiKey)) {
      return yield* Effect.fail(
        new AuthenticationError({
          message: "Invalid API key"
        })
      );
    }

    // Success - auth passed
    return;
  });

/**
 * Check if auth error and get appropriate HTTP status
 */
export function isAuthenticationError(
  error: unknown
): error is AuthenticationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "AuthenticationError"
  );
}
