/**
 * MCP Server Metrics Service
 *
 * Production-ready metrics collection with counters, histograms,
 * and configurable metric exports.
 */

import { Effect } from 'effect';
import { MCPConfigService } from './config.js';
import { MCPLoggerService } from './logger.js';

/**
 * Metric types
 */
export type MetricType = 'counter' | 'histogram' | 'gauge';

/**
 * Metric value
 */
export interface MetricValue {
    readonly name: string;
    readonly type: MetricType;
    readonly value: number;
    readonly labels?: Record<string, string>;
    readonly timestamp: number;
}

/**
 * Counter metric
 */
export interface CounterMetric extends MetricValue {
    readonly type: 'counter';
}

/**
 * Histogram metric
 */
export interface HistogramMetric extends MetricValue {
    readonly type: 'histogram';
    readonly buckets?: readonly number[];
    readonly sum: number;
    readonly count: number;
}

/**
 * Gauge metric
 */
export interface GaugeMetric extends MetricValue {
    readonly type: 'gauge';
}

/**
 * Metrics snapshot
 */
export interface MetricsSnapshot {
    readonly counters: readonly CounterMetric[];
    readonly histograms: readonly HistogramMetric[];
    readonly gauges: readonly GaugeMetric[];
    readonly timestamp: number;
}

/**
 * MCP Server Metrics Service
 */
export class MCPMetricsService extends Effect.Service<MCPMetricsService>()('MCPMetricsService', {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    effect: Effect.gen(function* () {
        const config = yield* MCPConfigService;
        const logger = yield* MCPLoggerService;

        // Metrics configuration
        const enabled = yield* config.isMetricsEnabled();

        // In-memory metrics storage
        const counters = new Map<string, CounterMetric>();
        const histograms = new Map<string, HistogramMetric>();
        const gauges = new Map<string, GaugeMetric>();

        // Default histogram buckets
        const defaultBuckets = [0.1, 0.5, 1, 2.5, 5, 10] as const;

        /**
         * Create metric key with labels
         */
        const createMetricKey = (name: string, labels?: Record<string, string>): string => {
            if (!labels || Object.keys(labels).length === 0) {
                return name;
            }

            const sortedLabels = Object.keys(labels)
                .sort()
                .map(key => `${key}=${labels[key]}`)
                .join(',');

            return `${name}{${sortedLabels}}`;
        };

        /**
         * Increment counter
         */
        const incrementCounter = (
            name: string,
            value: number = 1,
            labels?: Record<string, string>
        ): Effect.Effect<void> => {
            if (!enabled) {
                return Effect.succeed(undefined);
            }

            return Effect.gen(function* () {
                const startTime = Date.now();
                const key = createMetricKey(name, labels);
                const existing = counters.get(key);

                const newValue = (existing?.value || 0) + value;
                const metric: CounterMetric = {
                    name,
                    type: 'counter',
                    value: newValue,
                    labels,
                    timestamp: Date.now(),
                };

                counters.set(key, metric);

                yield* logger.withOperation('metrics.counter').debug(
                    `Counter incremented: ${name}`,
                    { name, value: newValue, labels, duration: Date.now() - startTime }
                );
            });
        };

        /**
         * Record histogram observation
         */
        const observeHistogram = (
            name: string,
            value: number,
            labels?: Record<string, string>,
            buckets: readonly number[] = defaultBuckets
        ): Effect.Effect<void> => {
            if (!enabled) {
                return Effect.succeed(undefined);
            }

            return Effect.gen(function* () {
                const startTime = Date.now();
                const key = createMetricKey(name, labels);
                const existing = histograms.get(key);

                const newCount = (existing?.count || 0) + 1;
                const newSum = (existing?.sum || 0) + value;

                // Calculate bucket counts
                const bucketCounts = buckets.map((bucket, index) => {
                    const prevCount = existing?.buckets?.[index] || 0;
                    return value <= bucket ? prevCount + 1 : prevCount;
                });

                const metric: HistogramMetric = {
                    name,
                    type: 'histogram',
                    value, // Last observed value
                    labels,
                    timestamp: Date.now(),
                    buckets: bucketCounts,
                    sum: newSum,
                    count: newCount,
                };

                histograms.set(key, metric);

                yield* logger.withOperation('metrics.histogram').debug(
                    `Histogram observed: ${name}`,
                    { name, value, count: newCount, sum: newSum, labels, duration: Date.now() - startTime }
                );
            });
        };

        /**
         * Set gauge value
         */
        const setGauge = (
            name: string,
            value: number,
            labels?: Record<string, string>
        ): Effect.Effect<void> => {
            if (!enabled) {
                return Effect.succeed(undefined);
            }

            return Effect.gen(function* () {
                const startTime = Date.now();
                const key = createMetricKey(name, labels);

                const metric: GaugeMetric = {
                    name,
                    type: 'gauge',
                    value,
                    labels,
                    timestamp: Date.now(),
                };

                gauges.set(key, metric);

                yield* logger.withOperation('metrics.gauge').debug(
                    `Gauge set: ${name}`,
                    { name, value, labels, duration: Date.now() - startTime }
                );
            });
        };

        /**
         * Record request metrics
         */
        const recordRequest = (
            method: string,
            path: string,
            statusCode: number,
            duration: number,
            labels?: Record<string, string>
        ): Effect.Effect<void> => {
            return Effect.gen(function* () {
                // Increment request counter
                yield* incrementCounter('http_requests_total', 1, {
                    method,
                    path,
                    status: statusCode.toString(),
                    ...labels,
                });

                // Record request duration
                yield* observeHistogram('http_request_duration_seconds', duration / 1000, {
                    method,
                    path,
                    ...labels,
                });

                // Set active requests gauge (decrement)
                yield* incrementCounter('http_active_requests', -1, { method, path, ...labels });
            });
        };

        /**
         * Record cache metrics
         */
        const recordCacheOperation = (
            operation: string,
            hit: boolean,
            duration: number,
            labels?: Record<string, string>
        ): Effect.Effect<void> => {
            return Effect.gen(function* () {
                // Increment cache operation counter
                yield* incrementCounter('cache_operations_total', 1, {
                    operation,
                    result: hit ? 'hit' : 'miss',
                    ...labels,
                });

                // Record cache operation duration
                yield* observeHistogram('cache_operation_duration_seconds', duration / 1000, {
                    operation,
                    ...labels,
                });
            });
        };

        /**
         * Record pattern metrics
         */
        const recordPatternOperation = (
            operation: string,
            count?: number,
            duration?: number,
            labels?: Record<string, string>
        ): Effect.Effect<void> => {
            return Effect.gen(function* () {
                // Increment pattern operation counter
                yield* incrementCounter('pattern_operations_total', 1, {
                    operation,
                    ...labels,
                });

                // Record pattern operation duration if provided
                if (duration !== undefined) {
                    yield* observeHistogram('pattern_operation_duration_seconds', duration / 1000, {
                        operation,
                        ...labels,
                    });
                }

                // Set patterns loaded gauge if applicable
                if (operation === 'load' && count !== undefined) {
                    yield* setGauge('patterns_loaded', count, labels);
                }
            });
        };

        /**
         * Record validation metrics
         */
        const recordValidation = (
            operation: string,
            success: boolean,
            duration: number,
            labels?: Record<string, string>
        ): Effect.Effect<void> => {
            return Effect.gen(function* () {
                // Increment validation counter
                yield* incrementCounter('validation_operations_total', 1, {
                    operation,
                    result: success ? 'success' : 'failure',
                    ...labels,
                });

                // Record validation duration
                yield* observeHistogram('validation_duration_seconds', duration / 1000, {
                    operation,
                    ...labels,
                });
            });
        };

        /**
         * Record rate limit metrics
         */
        const recordRateLimit = (
            allowed: boolean,
            duration: number,
            labels?: Record<string, string>
        ): Effect.Effect<void> => {
            return Effect.gen(function* () {
                // Increment rate limit counter
                yield* incrementCounter('rate_limit_checks_total', 1, {
                    result: allowed ? 'allowed' : 'blocked',
                    ...labels,
                });

                // Record rate limit check duration
                yield* observeHistogram('rate_limit_check_duration_seconds', duration / 1000, labels);
            });
        };

        /**
         * Get metrics snapshot
         */
        const getSnapshot = (): Effect.Effect<MetricsSnapshot> => {
            return Effect.succeed({
                counters: Array.from(counters.values()),
                histograms: Array.from(histograms.values()),
                gauges: Array.from(gauges.values()),
                timestamp: Date.now(),
            });
        };

        /**
         * Export metrics in Prometheus format
         */
        const exportPrometheus = (): Effect.Effect<string> => {
            return Effect.gen(function* () {
                const snapshot = yield* getSnapshot();
                const lines: string[] = [];

                // Add HELP and TYPE comments for all metrics
                const addMetricHeader = (name: string, type: MetricType, help: string) => {
                    lines.push(`# HELP ${name} ${help}`);
                    lines.push(`# TYPE ${name} ${type}`);
                };

                // Add headers for all counters
                for (const counter of snapshot.counters) {
                    addMetricHeader(counter.name, 'counter', `${counter.name} counter`);
                }

                // Add headers for all histograms
                for (const histogram of snapshot.histograms) {
                    addMetricHeader(histogram.name, 'histogram', `${histogram.name} histogram`);
                }

                // Add headers for all gauges
                for (const gauge of snapshot.gauges) {
                    addMetricHeader(gauge.name, 'gauge', `${gauge.name} gauge`);
                }

                // Export actual metric values
                for (const counter of snapshot.counters) {
                    const labelString = counter.labels
                        ? '{' + Object.entries(counter.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
                        : '';
                    lines.push(`${counter.name}${labelString} ${counter.value}`);
                }

                for (const histogram of snapshot.histograms) {
                    const labelString = histogram.labels
                        ? '{' + Object.entries(histogram.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
                        : '';

                    // Histogram buckets
                    if (histogram.buckets) {
                        for (let i = 0; i < histogram.buckets.length; i++) {
                            const bucket = defaultBuckets[i];
                            lines.push(`${histogram.name}_bucket${labelString}{le="${bucket}"} ${histogram.buckets[i]}`);
                        }
                        lines.push(`${histogram.name}_bucket${labelString}{le="+Inf"} ${histogram.count}`);
                    }

                    lines.push(`${histogram.name}_count${labelString} ${histogram.count}`);
                    lines.push(`${histogram.name}_sum${labelString} ${histogram.sum}`);
                }

                for (const gauge of snapshot.gauges) {
                    const labelString = gauge.labels
                        ? '{' + Object.entries(gauge.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
                        : '';
                    lines.push(`${gauge.name}${labelString} ${gauge.value}`);
                }

                return lines.join('\n');
            });
        };

        /**
         * Reset all metrics
         */
        const reset = (): Effect.Effect<void> => {
            return Effect.gen(function* () {
                const startTime = Date.now();

                counters.clear();
                histograms.clear();
                gauges.clear();

                yield* logger.withOperation('metrics.reset').debug(
                    'All metrics reset',
                    { duration: Date.now() - startTime }
                );
            });
        };

        return {
            // Core metrics recording
            incrementCounter,
            observeHistogram,
            setGauge,

            // Specialized metrics
            recordRequest,
            recordCacheOperation,
            recordPatternOperation,
            recordValidation,
            recordRateLimit,

            // Export and management
            getSnapshot,
            exportPrometheus,
            reset,

            // Configuration access
            isEnabled: () => Effect.succeed(enabled),
        };
    })
}) { }

/**
 * Default MCP metrics service layer
 */
export const MCPMetricsServiceLive = MCPMetricsService.Default;

/**
 * Legacy metrics functions (for backward compatibility)
 */
export function createMetricLabels(...entries: Array<[string, string]>): Record<string, string> {
    return Object.fromEntries(entries);
}

export function formatDurationForMetrics(durationMs: number): number {
    return durationMs / 1000; // Convert to seconds
}