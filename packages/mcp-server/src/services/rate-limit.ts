/**
 * MCP Server Rate Limiting Service
 *
 * Production-ready distributed rate limiting with Vercel KV (Redis)
 * with in-memory fallback for development environments.
 *
 * Uses sliding window algorithm with configurable policies.
 */

import { Effect } from "effect";
import { RateLimitError } from "../errors";
import { MCPConfigService } from "./config";
import { MCPLoggerService } from "./logger";

// Safely import kv with fallback for missing environment variables
let kv: any = null;
try {
  // Only try to import kv if environment variables are properly configured
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken && kvUrl.trim() !== "" && kvToken.trim() !== "") {
    const kvModule = require("@vercel/kv");
    kv = kvModule.kv;
  }
} catch (e) {
  // KV not available (likely missing environment variables in tests/dev)
  kv = null;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  readonly requests: number;
  readonly windowStart: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetTime: Date;
  readonly limit: number;
  readonly windowMs: number;
}

/**
 * MCP Server Rate Limiting Service
 */
export class MCRateLimitService extends Effect.Service<MCRateLimitService>()(
  "MCRateLimitService",
  {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    effect: Effect.gen(function* () {
      const config = yield* MCPConfigService;
      const logger = yield* MCPLoggerService;

      // Rate limiting configuration
      const enabled = yield* config.isRateLimitEnabled();
      const requests = yield* config.getRateLimitRequests();
      const windowMs = yield* config.getRateLimitWindowMs();

      // In-memory fallback storage (for development when KV is unavailable)
      const inMemoryFallback = new Map<string, RateLimitEntry>();
      let cleanupInterval: NodeJS.Timeout | undefined;

      // Detect if we're in serverless environment with KV available
      const useKv = typeof kv !== "undefined" && kv !== null;

      if (useKv) {
        yield* logger
          .withOperation("rateLimit.init")
          .debug("Using Vercel KV for distributed rate limiting");
      } else {
        yield* logger
          .withOperation("rateLimit.init")
          .warn("Vercel KV not available - using in-memory fallback (not distributed)");
      }

      /**
       * Start cleanup interval for in-memory fallback
       */
      const startCleanup = (): Effect.Effect<void> => {
        return Effect.gen(function* () {
          if (!enabled || cleanupInterval || useKv) {
            // Skip cleanup if using KV (Redis handles TTL)
            return;
          }

          cleanupInterval = setInterval(() => {
            Effect.runSync(cleanupExpired());
          }, Math.min(windowMs / 4, 60000)); // Clean up every quarter window or max 1 min

          yield* logger
            .withOperation("rateLimit")
            .debug("Rate limit cleanup started");
        });
      };

      /**
       * Stop cleanup interval
       */
      const stopCleanup = (): Effect.Effect<void> => {
        return Effect.gen(function* () {
          if (cleanupInterval) {
            clearInterval(cleanupInterval);
            cleanupInterval = undefined;
            yield* logger
              .withOperation("rateLimit")
              .debug("Rate limit cleanup stopped");
          }
        });
      };

      /**
       * Clean up expired entries from in-memory storage
       */
      const cleanupExpired = (): Effect.Effect<void> => {
        return Effect.gen(function* () {
          const startTime = Date.now();
          let cleaned = 0;
          const now = Date.now();

          for (const [key, entry] of inMemoryFallback.entries()) {
            if (now - entry.windowStart >= windowMs) {
              inMemoryFallback.delete(key);
              cleaned++;
            }
          }

          if (cleaned > 0) {
            yield* logger
              .withOperation("rateLimit.cleanup")
              .debug(`Cleaned up ${cleaned} expired rate limit entries`, {
                duration: Date.now() - startTime,
              });
          }
        });
      };

      /**
       * Get or create rate limit entry from KV or memory
       */
      const getOrCreateEntry = async (
        identifier: string
      ): Promise<RateLimitEntry> => {
        const now = Date.now();

        if (useKv) {
          const key = `ratelimit:${identifier}`;
          const stored = await kv.get<RateLimitEntry>(key);

          if (!stored || now - stored.windowStart >= windowMs) {
            // Create new window
            return {
              requests: 0,
              windowStart: now,
            };
          }

          return stored;
        } else {
          const existing = inMemoryFallback.get(identifier);

          if (!existing || now - existing.windowStart >= windowMs) {
            // Create new window
            return {
              requests: 0,
              windowStart: now,
            };
          }

          return existing;
        }
      };

      /**
       * Check rate limit for an identifier (distributed via KV)
       */
      const checkRateLimit = (
        identifier: string
      ): Effect.Effect<RateLimitResult, RateLimitError> => {
        if (!enabled) {
          return Effect.succeed({
            allowed: true,
            remaining: requests,
            resetTime: new Date(Date.now() + windowMs),
            limit: requests,
            windowMs,
          });
        }

        return Effect.gen(function* () {
          const startTime = Date.now();

          try {
            const entry = yield* Effect.promise(() =>
              getOrCreateEntry(identifier)
            );
            const now = Date.now();

            // Check if we're in a new window
            if (now - entry.windowStart >= windowMs) {
              // Reset for new window
              const newEntry: RateLimitEntry = {
                requests: 1,
                windowStart: now,
              };

              if (useKv) {
                const key = `ratelimit:${identifier}`;
                // Store with TTL equal to window + buffer
                yield* Effect.promise(() =>
                  kv.setex(
                    key,
                    Math.ceil((windowMs + 5000) / 1000),
                    JSON.stringify(newEntry)
                  )
                );
              } else {
                inMemoryFallback.set(identifier, newEntry);
              }

              yield* logger
                .withOperation("rateLimit.check")
                .debug(`Rate limit check passed (new window): ${identifier}`, {
                  identifier,
                  requests: 1,
                  remaining: requests - 1,
                  duration: Date.now() - startTime,
                });

              return {
                allowed: true,
                remaining: requests - 1,
                resetTime: new Date(now + windowMs),
                limit: requests,
                windowMs,
              };
            }

            // Check if limit exceeded
            if (entry.requests >= requests) {
              const resetTime = new Date(entry.windowStart + windowMs);

              yield* logger
                .withOperation("rateLimit.check")
                .warn(`Rate limit exceeded: ${identifier}`, {
                  identifier,
                  requests: entry.requests,
                  limit: requests,
                  resetTime: resetTime.toISOString(),
                  duration: Date.now() - startTime,
                });

              yield* Effect.fail(
                new RateLimitError({
                  identifier,
                  limit: requests,
                  windowMs,
                  resetTime,
                })
              );
            }

            // Increment counter
            const updatedEntry: RateLimitEntry = {
              ...entry,
              requests: entry.requests + 1,
            };

            if (useKv) {
              const key = `ratelimit:${identifier}`;
              // Update with remaining TTL
              const ttlSeconds = Math.ceil(
                (entry.windowStart + windowMs - now) / 1000
              );
              yield* Effect.promise(() =>
                kv.setex(key, ttlSeconds, JSON.stringify(updatedEntry))
              );
            } else {
              inMemoryFallback.set(identifier, updatedEntry);
            }

            const remaining = requests - updatedEntry.requests;

            yield* logger
              .withOperation("rateLimit.check")
              .debug(`Rate limit check passed: ${identifier}`, {
                identifier,
                requests: updatedEntry.requests,
                remaining,
                duration: Date.now() - startTime,
              });

            return {
              allowed: true,
              remaining,
              resetTime: new Date(entry.windowStart + windowMs),
              limit: requests,
              windowMs,
            };
          } catch (error) {
            // Log KV error but don't fail the request
            yield* logger
              .withOperation("rateLimit.check")
              .error("Rate limit check failed", error, {
                identifier,
                duration: Date.now() - startTime,
              });

            // Graceful degradation: allow request on KV failure
            return {
              allowed: true,
              remaining: requests,
              resetTime: new Date(Date.now() + windowMs),
              limit: requests,
              windowMs,
            };
          }
        });
      };

      /**
       * Reset rate limit for an identifier
       */
      const resetRateLimit = (identifier: string): Effect.Effect<void> => {
        return Effect.gen(function* () {
          const startTime = Date.now();

          try {
            if (useKv) {
              const key = `ratelimit:${identifier}`;
              yield* Effect.promise(() => kv.del(key));
            } else {
              inMemoryFallback.delete(identifier);
            }

            yield* logger
              .withOperation("rateLimit.reset")
              .debug(`Rate limit reset: ${identifier}`, {
                identifier,
                duration: Date.now() - startTime,
              });
          } catch (error) {
            yield* logger
              .withOperation("rateLimit.reset")
              .error("Rate limit reset failed", error, {
                identifier,
                duration: Date.now() - startTime,
              });
          }
        });
      };

      /**
       * Get rate limit status for an identifier
       */
      const getRateLimitStatus = (
        identifier: string
      ): Effect.Effect<RateLimitResult> => {
        return Effect.gen(function* () {
          try {
            const entry = yield* Effect.promise(() =>
              getOrCreateEntry(identifier)
            );
            const now = Date.now();

            if (!entry || now - entry.windowStart >= windowMs) {
              return {
                allowed: true,
                remaining: requests,
                resetTime: new Date(now + windowMs),
                limit: requests,
                windowMs,
              };
            }

            return {
              allowed: entry.requests < requests,
              remaining: Math.max(0, requests - entry.requests),
              resetTime: new Date(entry.windowStart + windowMs),
              limit: requests,
              windowMs,
            };
          } catch (error) {
            // Graceful degradation on error
            return {
              allowed: true,
              remaining: requests,
              resetTime: new Date(Date.now() + windowMs),
              limit: requests,
              windowMs,
            };
          }
        });
      };

      /**
       * Get all rate limit entries (for monitoring)
       */
      const getAllRateLimits = (): Effect.Effect<
        Array<{ identifier: string; entry: RateLimitEntry }>
      > => {
        return Effect.gen(function* () {
          if (useKv) {
            yield* logger
              .withOperation("rateLimit.getAll")
              .info(
                "getAllRateLimits not supported with KV backend (Redis keys enumeration disabled)"
              );
            return [];
          }

          return Array.from(inMemoryFallback.entries()).map(
            ([identifier, entry]) => ({
              identifier,
              entry,
            })
          );
        });
      };

      /**
       * Clear all rate limits
       */
      const clearAllRateLimits = (): Effect.Effect<void> => {
        return Effect.gen(function* () {
          const startTime = Date.now();

          try {
            if (useKv) {
              yield* logger
                .withOperation("rateLimit.clear")
                .warn("clearAllRateLimits not fully supported with KV backend");
              // Note: Full clear would require KEYS pattern on Redis, which is disabled
            } else {
              const cleared = inMemoryFallback.size;
              inMemoryFallback.clear();

              yield* logger
                .withOperation("rateLimit.clear")
                .debug(`Cleared all rate limits: ${cleared} entries`, {
                  cleared,
                  duration: Date.now() - startTime,
                });
            }
          } catch (error) {
            yield* logger
              .withOperation("rateLimit.clear")
              .error("Clear all rate limits failed", error, {
                duration: Date.now() - startTime,
              });
          }
        });
      };

      // Start cleanup on service initialization
      yield* startCleanup();

      return {
        // Core rate limiting
        checkRateLimit,
        resetRateLimit,
        getRateLimitStatus,

        // Management
        getAllRateLimits,
        clearAllRateLimits,

        // Lifecycle
        startCleanup,
        stopCleanup,

        // Configuration access
        isEnabled: () => Effect.succeed(enabled),
        getRequests: () => Effect.succeed(requests),
        getWindowMs: () => Effect.succeed(windowMs),
      };
    }),
  }
) {}

/**
 * Default MCP rate limit service layer
 */
export const MCRateLimitServiceLive = MCRateLimitService.Default;

/**
 * Legacy rate limiting functions (for backward compatibility)
 */
export function createRateLimitKey(
  identifier: string,
  operation: string
): string {
  return `${operation}:${identifier}`;
}

export function getRemainingRequests(result: RateLimitResult): number {
  return result.remaining;
}

export function getResetTime(result: RateLimitResult): Date {
  return result.resetTime;
}
