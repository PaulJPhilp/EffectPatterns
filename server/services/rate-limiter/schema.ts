/**
 * Rate limiter service schemas
 */

import { Schema } from "effect";

/**
 * Schema for rate limit entry
 */
export const RateLimitEntrySchema = Schema.Struct({
    count: Schema.Number,
    resetTime: Schema.Number,
});

/**
 * Schema for rate limit result
 */
export const RateLimitResultSchema = Schema.Struct({
    allowed: Schema.Boolean,
    remaining: Schema.Number,
    resetTime: Schema.optional(Schema.Number),
});

/**
 * Schema for rate limit configuration
 */
export const RateLimitConfigSchema = Schema.Struct({
    windowMs: Schema.Number,
    maxRequests: Schema.Number,
});
