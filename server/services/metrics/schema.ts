/**
 * Metrics service schemas
 */

import { Schema } from "effect";

/**
 * Schema for server metrics
 */
export const ServerMetricsSchema = Schema.Struct({
    startTime: Schema.Number,
    requestCount: Schema.Number,
    errorCount: Schema.Number,
    lastHealthCheck: Schema.Number,
    rateLimitHits: Schema.Number,
    uptime: Schema.Number,
    healthCheckAge: Schema.Number,
});
