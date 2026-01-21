/**
 * Metrics service API
 */

import { ServerMetrics } from "./types.js";

/**
 * Metrics service interface
 */
export interface MetricsService {
    /**
     * Increment the request count
     */
    readonly incrementRequestCount: () => void;

    /**
     * Increment the error count
     */
    readonly incrementErrorCount: () => void;

    /**
     * Increment the rate limit hit count
     */
    readonly incrementRateLimitHits: () => void;

    /**
     * Update the last health check timestamp
     */
    readonly updateHealthCheck: () => void;

    /**
     * Get current server metrics
     */
    readonly getMetrics: () => ServerMetrics;
}
