/**
 * API Key Authentication Middleware
 *
 * Validates PATTERN_API_KEY from x-api-key header or ?key query param.
 * Returns 401 Unauthorized for invalid/missing keys.
 */

import { Effect } from 'effect';
import type { NextRequest } from 'next/server';
import { ConfigService } from '../server/init';

/**
 * Authentication error
 */
export class AuthenticationError extends Error {
  readonly _tag = 'AuthenticationError';

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Extract API key from request
 *
 * Checks:
 * 1. x-api-key header
 * 2. ?key query parameter
 */
function extractApiKey(request: NextRequest): string | null {
  // Check header first
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey;

  // Check query parameter
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get('key');
  if (queryKey) return queryKey;

  return null;
}

/**
 * Validate API key Effect
 *
 * @param request - Next.js request object
 * @returns Effect that succeeds if auth is valid, fails otherwise
 */
export const validateApiKey = (
  request: NextRequest,
): Effect.Effect<void, AuthenticationError, ConfigService> =>
  Effect.gen(function* () {
    const config = yield* ConfigService;

    // If no API key is configured, skip validation (dev mode)
    if (!config.apiKey || config.apiKey.trim() === '') {
      if (config.nodeEnv === 'development') {
        console.warn(
          '[Auth] No PATTERN_API_KEY configured - running in open mode',
        );
        return;
      }
      return yield* Effect.fail(
        new AuthenticationError('API key not configured on server'),
      );
    }

    // Extract key from request
    const providedKey = extractApiKey(request);

    if (!providedKey) {
      return yield* Effect.fail(new AuthenticationError('Missing API key'));
    }

    // Validate key
    if (providedKey !== config.apiKey) {
      return yield* Effect.fail(new AuthenticationError('Invalid API key'));
    }

    // Success - auth passed
    return;
  });

/**
 * Check if auth error and get appropriate HTTP status
 */
export function isAuthenticationError(
  error: unknown,
): error is AuthenticationError {
  return (
    error instanceof AuthenticationError ||
    (typeof error === 'object' &&
      error !== null &&
      '_tag' in error &&
      error._tag === 'AuthenticationError')
  );
}
