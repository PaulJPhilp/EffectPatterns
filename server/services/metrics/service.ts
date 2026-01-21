/**
 * Metrics service implementation
 */

import { Effect } from "effect";
import { ServerMetrics } from "./types.js";

/**
 * Metrics service for tracking server statistics
 */
export class MetricsService extends Effect.Service<MetricsService>()(
    "MetricsService",
    {
        sync: () => {
            const metrics = {
                startTime: Date.now(),
                requestCount: 0,
                errorCount: 0,
                lastHealthCheck: Date.now(),
                rateLimitHits: 0,
            };

            return {
                incrementRequestCount: () => {
                    metrics.requestCount++;
                },

                incrementErrorCount: () => {
                    metrics.errorCount++;
                },

                incrementRateLimitHits: () => {
                    metrics.rateLimitHits++;
                },

                updateHealthCheck: () => {
                    metrics.lastHealthCheck = Date.now();
                },

                getMetrics: (): ServerMetrics => ({
                    ...metrics,
                    uptime: Date.now() - metrics.startTime,
                    healthCheckAge: Date.now() - metrics.lastHealthCheck,
                }),
            };
        },
    },
) { }
