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
        effect: Effect.gen(function* () {
            const metrics = {
                startTime: Date.now(),
                requestCount: 0,
                errorCount: 0,
                lastHealthCheck: Date.now(),
                rateLimitHits: 0,
            };

            const incrementRequestCount = () => {
                metrics.requestCount++;
            };

            const incrementErrorCount = () => {
                metrics.errorCount++;
            };

            const incrementRateLimitHits = () => {
                metrics.rateLimitHits++;
            };

            const updateHealthCheck = () => {
                metrics.lastHealthCheck = Date.now();
            };

            const getMetrics = (): ServerMetrics => ({
                ...metrics,
                uptime: Date.now() - metrics.startTime,
                healthCheckAge: Date.now() - metrics.lastHealthCheck,
            });

            return {
                incrementRequestCount,
                incrementErrorCount,
                incrementRateLimitHits,
                updateHealthCheck,
                getMetrics,
            };
        }),
    },
) { }
