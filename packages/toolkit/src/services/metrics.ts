/**
 * Toolkit Metrics Definitions
 *
 * Centralized definition of all application metrics using Effect.Metric.
 * These metrics are automatically exported via OTLP/Prometheus when configured.
 */

import { Chunk, Metric, MetricBoundaries } from "effect";

// ============================================
// Database Metrics
// ============================================

/**
 * Counter for total database requests
 * Tags: operation (e.g., 'findAll', 'search'), status ('success', 'failure')
 */
export const dbRequests = Metric.counter("toolkit_db_requests_total");

/**
 * Histogram for database request duration
 * Tags: operation
 */
export const dbRequestDuration = Metric.histogram(
  "toolkit_db_request_duration_seconds", 
  MetricBoundaries.fromIterable(Chunk.make(0.01, 0.05, 0.1, 0.5, 1, 5, 10))
);

/**
 * Counter for active concurrent database requests (Bulkhead usage)
 * Note: Using counter as UpDownCounter if available, or just representing activity
 */
export const dbBulkheadActive = Metric.counter("toolkit_db_bulkhead_active");

// ============================================
// Cache Metrics
// ============================================

/**
 * Counter for cache operations
 * Tags: operation ('get', 'set'), result ('hit', 'miss')
 */
export const cacheOps = Metric.counter("toolkit_cache_ops_total");

/**
 * Gauge for estimated cache size (number of entries)
 * Note: Only updated periodically or on modification events
 */
export const cacheSize = Metric.gauge("toolkit_cache_size");

/**
 * Counter for cache invalidation events
 * Tags: type ('pattern', 'key')
 */
export const cacheInvalidations = Metric.counter("toolkit_cache_invalidations_total");
