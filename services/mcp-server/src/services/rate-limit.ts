/**
 * MCP Server Rate Limiting Service
 *
 * Production-ready rate limiting with configurable policies,
 * sliding window algorithm, and proper cleanup.
 */

import { Effect } from 'effect';
import { RateLimitError } from '../errors.js';
import { MCPConfigService } from './config.js';
import { MCPLoggerService } from './logger.js';

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
export class MCRateLimitService extends Effect.Service<MCRateLimitService>()('MCRateLimitService', {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    effect: Effect.gen(function* () {
        const config = yield* MCPConfigService;
        const logger = yield* MCPLoggerService;

        // Rate limiting configuration
        const enabled = yield* config.isRateLimitEnabled();
        const requests = yield* config.getRateLimitRequests();
        const windowMs = yield* config.getRateLimitWindowMs();

        // In-memory storage for rate limiting
        const rateLimits = new Map<string, RateLimitEntry>();

        // Cleanup interval
        let cleanupInterval: NodeJS.Timeout | undefined;

        /**
         * Start cleanup interval
         */
        const startCleanup = (): Effect.Effect<void> => {
            return Effect.gen(function* () {
                if (!enabled || cleanupInterval) {
                    return;
                }

                cleanupInterval = setInterval(() => {
                    Effect.runSync(cleanupExpired());
                }, windowMs / 4); // Clean up every quarter window

                yield* logger.withOperation('rateLimit').debug('Rate limit cleanup started');
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
                    yield* logger.withOperation('rateLimit').debug('Rate limit cleanup stopped');
                }
            });
        };

        /**
         * Clean up expired entries
         */
        const cleanupExpired = (): Effect.Effect<void> => {
            return Effect.gen(function* () {
                const startTime = Date.now();
                let cleaned = 0;
                const now = Date.now();

                for (const [key, entry] of rateLimits.entries()) {
                    if (now - entry.windowStart >= windowMs) {
                        rateLimits.delete(key);
                        cleaned++;
                    }
                }

                if (cleaned > 0) {
                    yield* logger.withOperation('rateLimit.cleanup').debug(
                        `Cleaned up ${cleaned} expired rate limit entries`,
                        { duration: Date.now() - startTime }
                    );
                }
            });
        };

        /**
         * Get or create rate limit entry
         */
        const getOrCreateEntry = (identifier: string): RateLimitEntry => {
            const now = Date.now();
            const existing = rateLimits.get(identifier);

            if (!existing || now - existing.windowStart >= windowMs) {
                // Create new window
                return {
                    requests: 0,
                    windowStart: now,
                };
            }

            return existing;
        };

        /**
         * Check rate limit for an identifier
         */
        const checkRateLimit = (identifier: string): Effect.Effect<RateLimitResult, RateLimitError> => {
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
                const entry = getOrCreateEntry(identifier);
                const now = Date.now();

                // Check if we're in a new window
                if (now - entry.windowStart >= windowMs) {
                    // Reset for new window
                    const newEntry: RateLimitEntry = {
                        requests: 1,
                        windowStart: now,
                    };
                    rateLimits.set(identifier, newEntry);

                    yield* logger.withOperation('rateLimit.check').debug(
                        `Rate limit check passed (new window): ${identifier}`,
                        {
                            identifier,
                            requests: 1,
                            remaining: requests - 1,
                            duration: Date.now() - startTime
                        }
                    );

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

                    yield* logger.withOperation('rateLimit.check').warn(
                        `Rate limit exceeded: ${identifier}`,
                        {
                            identifier,
                            requests: entry.requests,
                            limit: requests,
                            resetTime: resetTime.toISOString(),
                            duration: Date.now() - startTime
                        }
                    );

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
                rateLimits.set(identifier, updatedEntry);

                const remaining = requests - updatedEntry.requests;

                yield* logger.withOperation('rateLimit.check').debug(
                    `Rate limit check passed: ${identifier}`,
                    {
                        identifier,
                        requests: updatedEntry.requests,
                        remaining,
                        duration: Date.now() - startTime
                    }
                );

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
        const resetRateLimit = (identifier: string): Effect.Effect<void> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                rateLimits.delete(identifier);

                yield* logger.withOperation('rateLimit.reset').debug(
                    `Rate limit reset: ${identifier}`,
                    { identifier, duration: Date.now() - startTime }
                );
            });
        };

        /**
         * Get rate limit status for an identifier
         */
        const getRateLimitStatus = (identifier: string): Effect.Effect<RateLimitResult> => {
            return Effect.gen(function* () {
                const entry = rateLimits.get(identifier);
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
            });
        };

        /**
         * Get all rate limit entries (for monitoring)
         */
        const getAllRateLimits = (): Effect.Effect<Array<{ identifier: string; entry: RateLimitEntry }>> => {
            return Effect.succeed(
                Array.from(rateLimits.entries()).map(([identifier, entry]) => ({
                    identifier,
                    entry,
                }))
            );
        };

        /**
         * Clear all rate limits
         */
        const clearAllRateLimits = (): Effect.Effect<void> => {
            return Effect.gen(function* () {
                const startTime = Date.now();
                const cleared = rateLimits.size;

                rateLimits.clear();

                yield* logger.withOperation('rateLimit.clear').debug(
                    `Cleared all rate limits: ${cleared} entries`,
                    { cleared, duration: Date.now() - startTime }
                );
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
    })
}) { }

/**
 * Default MCP rate limit service layer
 */
export const MCRateLimitServiceLive = MCRateLimitService.Default;

/**
 * Legacy rate limiting functions (for backward compatibility)
 */
export function createRateLimitKey(identifier: string, operation: string): string {
    return `${operation}:${identifier}`;
}

export function getRemainingRequests(result: RateLimitResult): number {
    return result.remaining;
}

export function getResetTime(result: RateLimitResult): Date {
    return result.resetTime;
}