import { Effect, Ref, Schedule, Duration, Fiber } from "effect";
import { MCPConfigService } from "../config";
import { MCPLoggerService } from "../logger";
import { RateLimitError } from "./errors";
import { getKvClient } from "./helpers";
import { RateLimitEntry, RateLimitResult } from "./types";

/**
 * MCP Server Rate Limiting Service
 */
export class MCRateLimitService extends Effect.Service<MCRateLimitService>()(
  "MCRateLimitService",
  {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    scoped: Effect.gen(function* () {
      const config = yield* MCPConfigService;
      const logger = yield* MCPLoggerService;

      // Rate limiting configuration (direct property access)
      const enabled = config.rateLimitEnabled;
      const requests = config.rateLimitRequests;
      const windowMs = config.rateLimitWindowMs;

      // In-memory fallback storage using Ref (for development when KV is unavailable)
      const inMemoryFallbackRef = yield* Ref.make(new Map<string, RateLimitEntry>());

      // Get KV client
      const kv = getKvClient();
      const useKv = kv !== null;

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
       * Clean up expired entries from in-memory storage
       */
      const cleanupExpired = Effect.gen(function* () {
        const startTime = Date.now();
        const now = Date.now();

        const cleaned = yield* Ref.modify(inMemoryFallbackRef, (fallback) => {
          const newFallback = new Map(fallback);
          let count = 0;
          for (const [key, entry] of newFallback.entries()) {
            if (now - entry.windowStart >= windowMs) {
              newFallback.delete(key);
              count++;
            }
          }
          return [count, newFallback];
        });

        if (cleaned > 0) {
          yield* logger
            .withOperation("rateLimit.cleanup")
            .debug(`Cleaned up ${cleaned} expired rate limit entries`, {
              duration: Date.now() - startTime,
            });
        }
      });

      // Start cleanup fiber if not using KV
      if (!useKv && enabled) {
        const cleanupLoop = cleanupExpired.pipe(
          Effect.repeat(
            Schedule.spaced(Duration.millis(Math.min(windowMs / 4, 60000)))
          ),
          Effect.catchAll(() => Effect.succeed(undefined)) // Ignore errors in cleanup
        );

        const cleanupFiber = yield* Effect.forkDaemon(cleanupLoop);
        yield* Effect.addFinalizer(() => 
          Fiber.interrupt(cleanupFiber).pipe(Effect.ignore)
        );
        yield* logger
          .withOperation("rateLimit")
          .debug("Rate limit cleanup started");
      }

      /**
       * Get or create rate limit entry from KV or memory
       */
      const getOrCreateEntry = (
        identifier: string
      ): Effect.Effect<RateLimitEntry, never> =>
        Effect.gen(function* () {
          const now = Date.now();

          if (useKv) {
            const key = `ratelimit:${identifier}`;
            const stored = yield* Effect.tryPromise(() => 
              kv!.get<RateLimitEntry>(key)
            ).pipe(Effect.orElseSucceed(() => null));

            if (!stored || now - stored.windowStart >= windowMs) {
              // Create new window
              return {
                requests: 0,
                windowStart: now,
              };
            }

            return stored;
          } else {
            const fallback = yield* Ref.get(inMemoryFallbackRef);
            const existing = fallback.get(identifier);

            if (!existing || now - existing.windowStart >= windowMs) {
              // Create new window
              return {
                requests: 0,
                windowStart: now,
              };
            }

            return existing;
          }
        });

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

          const entry = yield* getOrCreateEntry(identifier);
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
              yield* Effect.tryPromise(() =>
                kv!.setex(
                  key,
                  Math.ceil((windowMs + 5000) / 1000),
                  newEntry
                )
              ).pipe(Effect.orElseSucceed(() => undefined));
            } else {
              yield* Ref.update(inMemoryFallbackRef, (fallback) => {
                const newFallback = new Map(fallback);
                newFallback.set(identifier, newEntry);
                return newFallback;
              });
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

            return yield* Effect.fail(
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
            yield* Effect.tryPromise(() =>
              kv!.setex(key, ttlSeconds, updatedEntry)
            ).pipe(Effect.orElseSucceed(() => undefined));
          } else {
            yield* Ref.update(inMemoryFallbackRef, (fallback) => {
              const newFallback = new Map(fallback);
              newFallback.set(identifier, updatedEntry);
              return newFallback;
            });
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
        });
      };

      /**
       * Reset rate limit for an identifier
       */
      const resetRateLimit = (identifier: string): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          const startTime = Date.now();

          if (useKv) {
            const key = `ratelimit:${identifier}`;
            yield* Effect.tryPromise(() => kv!.del(key)).pipe(
              Effect.orElseSucceed(() => undefined)
            );
          } else {
            yield* Ref.update(inMemoryFallbackRef, (fallback) => {
              const newFallback = new Map(fallback);
              newFallback.delete(identifier);
              return newFallback;
            });
          }

          yield* logger
            .withOperation("rateLimit.reset")
            .debug(`Rate limit reset: ${identifier}`, {
              identifier,
              duration: Date.now() - startTime,
            });
        }).pipe(
          Effect.catchAll((error) =>
            logger
              .withOperation("rateLimit.reset")
              .error("Rate limit reset failed", error, {
                identifier,
                duration: Date.now() - Date.now(),
              })
          )
        );

      /**
       * Get rate limit status for an identifier
       */
      const getRateLimitStatus = (
        identifier: string
      ): Effect.Effect<RateLimitResult, never> =>
        Effect.gen(function* () {
          const entry = yield* getOrCreateEntry(identifier);
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
        }).pipe(
          Effect.catchAll(() =>
            Effect.succeed({
              allowed: true,
              remaining: requests,
              resetTime: new Date(Date.now() + windowMs),
              limit: requests,
              windowMs,
            })
          )
        );

      /**
       * Get all rate limit entries (for monitoring)
       */
      const getAllRateLimits = (): Effect.Effect<
        Array<{ identifier: string; entry: RateLimitEntry }>,
        never
      > =>
        Effect.gen(function* () {
          if (useKv) {
            yield* logger
              .withOperation("rateLimit.getAll")
              .info(
                "getAllRateLimits not supported with KV backend (Redis keys enumeration disabled)"
              );
            return [];
          }

          const fallback = yield* Ref.get(inMemoryFallbackRef);
          return Array.from(fallback.entries()).map(
            ([identifier, entry]) => ({
              identifier,
              entry,
            })
          );
        });

      /**
       * Clear all rate limits
       */
      const clearAllRateLimits = (): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          const startTime = Date.now();

          if (useKv) {
            yield* logger
              .withOperation("rateLimit.clear")
              .warn("clearAllRateLimits not fully supported with KV backend");
            // Note: Full clear would require KEYS pattern on Redis, which is disabled
          } else {
            const fallback = yield* Ref.get(inMemoryFallbackRef);
            const cleared = fallback.size;
            yield* Ref.set(inMemoryFallbackRef, new Map());

            yield* logger
              .withOperation("rateLimit.clear")
              .debug(`Cleared all rate limits: ${cleared} entries`, {
                cleared,
                duration: Date.now() - startTime,
              });
          }
        }).pipe(
          Effect.catchAll((error) =>
            logger
              .withOperation("rateLimit.clear")
              .error("Clear all rate limits failed", error, {
                duration: Date.now() - Date.now(),
              })
          )
        );

      return {
        // Core rate limiting
        checkRateLimit,
        resetRateLimit,
        getRateLimitStatus,

        // Management
        getAllRateLimits,
        clearAllRateLimits,

        // Configuration access
        isEnabled: (): Effect.Effect<boolean, never> => Effect.succeed(enabled),
        getRequests: (): Effect.Effect<number, never> => Effect.succeed(requests),
        getWindowMs: (): Effect.Effect<number, never> => Effect.succeed(windowMs),
      };
    }),
  }
) {}
