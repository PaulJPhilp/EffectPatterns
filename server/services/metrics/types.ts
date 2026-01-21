/**
 * Metrics service types
 */

/**
 * Server metrics data structure
 */
export interface ServerMetrics {
    readonly startTime: number;
    readonly requestCount: number;
    readonly errorCount: number;
    readonly lastHealthCheck: number;
    readonly rateLimitHits: number;
    readonly uptime: number;
    readonly healthCheckAge: number;
}
