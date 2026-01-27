/**
 * Admin Authentication Middleware
 *
 * Provides stricter authentication for administrative operations like
 * database management, migrations, and configuration changes.
 *
 * Uses a separate ADMIN_API_KEY environment variable for security.
 */

import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { AuthorizationError } from "../errors";
import { MCPConfigService } from "../services/config";

/**
 * Extract admin API key from request
 *
 * Checks:
 * 1. x-admin-key header
 * 2. ?admin-key query parameter (less preferred, less secure)
 */
function extractAdminKey(request: NextRequest): string | null {
  // Check header first (more secure)
  const headerKey = request.headers.get("x-admin-key");
  if (headerKey) return headerKey;

  // Check query parameter (less secure, but supported)
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get("admin-key");
  if (queryKey) return queryKey;

  return null;
}

/**
 * Validate admin key Effect
 *
 * @param request - Next.js request object
 * @returns Effect that succeeds if admin auth is valid, fails otherwise
 *
 * Environment Variables:
 * - ADMIN_API_KEY: The admin API key (required for admin operations)
 */
export const validateAdminKey = (
  request: NextRequest
): Effect.Effect<void, AuthorizationError, MCPConfigService> =>
  Effect.gen(function* () {
    const config = yield* MCPConfigService;
    const nodeEnv = config.nodeEnv;

    // Get admin key from environment (not in config service)
    const adminKey = yield* Effect.sync(() => process.env.ADMIN_API_KEY);

    // If no admin key is configured
    if (!adminKey || adminKey.trim() === "") {
      if (nodeEnv === "development") {
        console.warn(
          "[Auth] No ADMIN_API_KEY configured - admin operations require authentication in production"
        );
        return;
      }

      return yield* Effect.fail(
        new AuthorizationError({
          message: "Admin key not configured on server",
        })
      );
    }

    // Extract key from request
    const providedKey = extractAdminKey(request);

    if (!providedKey) {
      return yield* Effect.fail(
        new AuthorizationError({
          message: "Admin key required for this operation",
          requiredRole: "admin",
        })
      );
    }

    // Validate key (never include provided key in error for security)
    if (providedKey !== adminKey) {
      return yield* Effect.fail(
        new AuthorizationError({
          message: "Invalid admin credentials",
          requiredRole: "admin",
        })
      );
    }

    // Success - admin auth passed
    return;
  });

/**
 * Check if authorization error and get appropriate HTTP status
 */
export function isAuthorizationError(
  error: unknown
): error is AuthorizationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "AuthorizationError"
  );
}
