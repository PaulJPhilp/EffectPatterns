/**
 * Rate limiter service implementation
 */

import { Effect, Ref } from "effect";
import { RATE_LIMIT_CONFIG } from "../../constants.js";
import { RateLimitEntry, RateLimitResult } from "./types.js";

/**
 * Rate limiter service using Effect.Service pattern
 */
export class RateLimiterService extends Effect.Service<RateLimiterService>()(
    "RateLimiterService",
    {
        effect: Effect.gen(function* () {
            // In production, this should be Redis or similar
            const store = yield* Ref.make(new Map<string, RateLimitEntry>());

            const checkRateLimit = (ip: string) =>
                Effect.gen(function* () {
                    const currentTime = Date.now();
                    const current = yield* Ref.get(store);

                    const entry = current.get(ip);

                    if (!entry || currentTime > entry.resetTime) {
                        // First request or window expired
                        const newEntry: RateLimitEntry = {
                            count: 1,
                            resetTime: currentTime + RATE_LIMIT_CONFIG.windowMs,
                        };
                        yield* Ref.update(store, (map) => new Map(map).set(ip, newEntry));
                        return {
                            allowed: true,
                            remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
                        } as RateLimitResult;
                    }

                    if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
                        // Rate limit exceeded
                        return {
                            allowed: false,
                            remaining: 0,
                            resetTime: entry.resetTime,
                        } as RateLimitResult;
                    }

                    // Increment counter
                    const updatedEntry: RateLimitEntry = {
                        ...entry,
                        count: entry.count + 1,
                    };
                    yield* Ref.update(store, (map) => new Map(map).set(ip, updatedEntry));

                    return {
                        allowed: true,
                        remaining: RATE_LIMIT_CONFIG.maxRequests - updatedEntry.count,
                    } as RateLimitResult;
                });

            return { checkRateLimit };
        }),
    },
) { }
