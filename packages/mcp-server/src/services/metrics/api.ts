import { Effect, Ref } from "effect";
import { MCPConfigService } from "../config";
import { MCPLoggerService } from "../logger";
import {
  createMetricKey,
  defaultBuckets,
  formatPrometheusMetrics,
} from "./helpers";
import {
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  MetricsSnapshot,
} from "./types";

/**
 * MCP Server Metrics Service
 */
export class MCPMetricsService extends Effect.Service<MCPMetricsService>()(
  "MCPMetricsService",
  {
    dependencies: [MCPConfigService.Default, MCPLoggerService.Default],
    effect: Effect.gen(function* () {
      const config = yield* MCPConfigService;
      const logger = yield* MCPLoggerService;

      // Metrics configuration (direct property access)
      const enabled = config.metricsEnabled;

      // In-memory metrics storage using Ref
      const countersRef = yield* Ref.make(new Map<string, CounterMetric>());
      const histogramsRef = yield* Ref.make(new Map<string, HistogramMetric>());
      const gaugesRef = yield* Ref.make(new Map<string, GaugeMetric>());

      /**
       * Increment counter
       */
      const incrementCounter = (
        name: string,
        value: number = 1,
        labels?: Record<string, string>
      ): Effect.Effect<void, never> => {
        if (!enabled) {
          return Effect.succeed(undefined);
        }

        return Effect.gen(function* () {
          const startTime = Date.now();
          const key = createMetricKey(name, labels);

          yield* Ref.update(countersRef, (counters) => {
            const newCounters = new Map(counters);
            const existing = newCounters.get(key);
            const newValue = (existing?.value || 0) + value;
            const metric: CounterMetric = {
              name,
              type: "counter",
              value: newValue,
              labels,
              timestamp: Date.now(),
            };
            newCounters.set(key, metric);
            return newCounters;
          });

          yield* logger
            .withOperation("metrics.counter")
            .debug(`Counter incremented: ${name}`, {
              name,
              value: value,
              labels,
              duration: Date.now() - startTime,
            });
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
      ): Effect.Effect<void, never> => {
        if (!enabled) {
          return Effect.succeed(undefined);
        }

        return Effect.gen(function* () {
          const startTime = Date.now();
          const key = createMetricKey(name, labels);

          yield* Ref.update(histogramsRef, (histograms) => {
            const newHistograms = new Map(histograms);
            const existing = newHistograms.get(key);

            const newCount = (existing?.count || 0) + 1;
            const newSum = (existing?.sum || 0) + value;

            // Calculate bucket counts
            const bucketCounts = buckets.map((bucket, index) => {
              const prevCount = existing?.buckets?.[index] || 0;
              return value <= bucket ? prevCount + 1 : prevCount;
            });

            const metric: HistogramMetric = {
              name,
              type: "histogram",
              value, // Last observed value
              labels,
              timestamp: Date.now(),
              buckets: bucketCounts,
              sum: newSum,
              count: newCount,
            };

            newHistograms.set(key, metric);
            return newHistograms;
          });

          yield* logger
            .withOperation("metrics.histogram")
            .debug(`Histogram observed: ${name}`, {
              name,
              value,
              labels,
              duration: Date.now() - startTime,
            });
        });
      };

      /**
       * Set gauge value
       */
      const setGauge = (
        name: string,
        value: number,
        labels?: Record<string, string>
      ): Effect.Effect<void, never> => {
        if (!enabled) {
          return Effect.succeed(undefined);
        }

        return Effect.gen(function* () {
          const startTime = Date.now();
          const key = createMetricKey(name, labels);

          const metric: GaugeMetric = {
            name,
            type: "gauge",
            value,
            labels,
            timestamp: Date.now(),
          };

          yield* Ref.update(gaugesRef, (gauges) => {
            const newGauges = new Map(gauges);
            newGauges.set(key, metric);
            return newGauges;
          });

          yield* logger
            .withOperation("metrics.gauge")
            .debug(`Gauge set: ${name}`, {
              name,
              value,
              labels,
              duration: Date.now() - startTime,
            });
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
          yield* incrementCounter("http_requests_total", 1, {
            method,
            path,
            status: statusCode.toString(),
            ...labels,
          });

          // Record request duration
          yield* observeHistogram(
            "http_request_duration_seconds",
            duration / 1000,
            {
              method,
              path,
              ...labels,
            }
          );

          // Set active requests gauge (decrement)
          yield* incrementCounter("http_active_requests", -1, {
            method,
            path,
            ...labels,
          });
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
          yield* incrementCounter("cache_operations_total", 1, {
            operation,
            result: hit ? "hit" : "miss",
            ...labels,
          });

          // Record cache operation duration
          yield* observeHistogram(
            "cache_operation_duration_seconds",
            duration / 1000,
            {
              operation,
              ...labels,
            }
          );
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
          yield* incrementCounter("pattern_operations_total", 1, {
            operation,
            ...labels,
          });

          // Record pattern operation duration if provided
          if (duration !== undefined) {
            yield* observeHistogram(
              "pattern_operation_duration_seconds",
              duration / 1000,
              {
                operation,
                ...labels,
              }
            );
          }

          // Set patterns loaded gauge if applicable
          if (operation === "load" && count !== undefined) {
            yield* setGauge("patterns_loaded", count, labels);
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
          yield* incrementCounter("validation_operations_total", 1, {
            operation,
            result: success ? "success" : "failure",
            ...labels,
          });

          // Record validation duration
          yield* observeHistogram(
            "validation_duration_seconds",
            duration / 1000,
            {
              operation,
              ...labels,
            }
          );
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
          yield* incrementCounter("rate_limit_checks_total", 1, {
            result: allowed ? "allowed" : "blocked",
            ...labels,
          });

          // Record rate limit check duration
          yield* observeHistogram(
            "rate_limit_check_duration_seconds",
            duration / 1000,
            labels
          );
        });
      };

      /**
       * Get metrics snapshot
       */
      const getSnapshot = (): Effect.Effect<MetricsSnapshot, never> =>
        Effect.gen(function* () {
          const counters = yield* Ref.get(countersRef);
          const histograms = yield* Ref.get(histogramsRef);
          const gauges = yield* Ref.get(gaugesRef);

          return {
            counters: Array.from(counters.values()),
            histograms: Array.from(histograms.values()),
            gauges: Array.from(gauges.values()),
            timestamp: Date.now(),
          };
        });

      /**
       * Export metrics in Prometheus format
       */
      const exportPrometheus = (): Effect.Effect<string, never> =>
        Effect.gen(function* () {
          const snapshot = yield* getSnapshot();
          return formatPrometheusMetrics(snapshot);
        });

      /**
       * Reset all metrics
       */
      const reset = (): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          const startTime = Date.now();

          yield* Ref.set(countersRef, new Map());
          yield* Ref.set(histogramsRef, new Map());
          yield* Ref.set(gaugesRef, new Map());

          yield* logger
            .withOperation("metrics.reset")
            .debug("All metrics reset", { duration: Date.now() - startTime });
        });

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
        isEnabled: (): Effect.Effect<boolean, never> => Effect.succeed(enabled),
      };
    }),
  }
) {}
