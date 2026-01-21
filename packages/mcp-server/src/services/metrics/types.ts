/**
 * Metric types
 */
export type MetricType = "counter" | "histogram" | "gauge";

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
  readonly type: "counter";
}

/**
 * Histogram metric
 */
export interface HistogramMetric extends MetricValue {
  readonly type: "histogram";
  readonly buckets?: readonly number[];
  readonly sum: number;
  readonly count: number;
}

/**
 * Gauge metric
 */
export interface GaugeMetric extends MetricValue {
  readonly type: "gauge";
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
