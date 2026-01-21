import { MetricsSnapshot, MetricType } from "./types";

/**
 * Default histogram buckets
 */
export const defaultBuckets = [0.1, 0.5, 1, 2.5, 5, 10] as const;

/**
 * Create metric key with labels
 */
export const createMetricKey = (
  name: string,
  labels?: Record<string, string>
): string => {
  if (!labels || Object.keys(labels).length === 0) {
    return name;
  }

  const sortedLabels = Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(",");

  return `${name}{${sortedLabels}}`;
};

/**
 * Format metrics snapshot in Prometheus format
 */
export const formatPrometheusMetrics = (snapshot: MetricsSnapshot): string => {
  const lines: string[] = [];

  // Add HELP and TYPE comments for all metrics
  const addMetricHeader = (name: string, type: MetricType, help: string) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
  };

  // Add headers for all counters
  for (const counter of snapshot.counters) {
    addMetricHeader(counter.name, "counter", `${counter.name} counter`);
  }

  // Add headers for all histograms
  for (const histogram of snapshot.histograms) {
    addMetricHeader(
      histogram.name,
      "histogram",
      `${histogram.name} histogram`
    );
  }

  // Add headers for all gauges
  for (const gauge of snapshot.gauges) {
    addMetricHeader(gauge.name, "gauge", `${gauge.name} gauge`);
  }

  // Export actual metric values
  for (const counter of snapshot.counters) {
    const labelString = counter.labels
      ? "{" +
        Object.entries(counter.labels)
          .map(([k, v]) => `${k}="${v}"`) // Corrected escaping for quotes within labels
          .join(",") +
        "}"
      : "";
    lines.push(`${counter.name}${labelString} ${counter.value}`);
  }

  for (const histogram of snapshot.histograms) {
    const labelString = histogram.labels
      ? "{" +
        Object.entries(histogram.labels)
          .map(([k, v]) => `${k}="${v}"`) // Corrected escaping for quotes within labels
          .join(",") +
        "}"
      : "";

    // Histogram buckets
    if (histogram.buckets) {
      for (let i = 0; i < histogram.buckets.length; i++) {
        const bucket = defaultBuckets[i];
        lines.push(
          `${histogram.name}_bucket${labelString}{le="${bucket}"} ${histogram.buckets[i]}`
        );
      }
      lines.push(
        `${histogram.name}_bucket${labelString}{le="+Inf"} ${histogram.count}`
      );
    }

    lines.push(`${histogram.name}_count${labelString} ${histogram.count}`);
    lines.push(`${histogram.name}_sum${labelString} ${histogram.sum}`);
  }

  for (const gauge of snapshot.gauges) {
    const labelString = gauge.labels
      ? "{" +
        Object.entries(gauge.labels)
          .map(([k, v]) => `${k}="${v}"`) // Corrected escaping for quotes within labels
          .join(",") +
        "}"
      : "";
    lines.push(`${gauge.name}${labelString} ${gauge.value}`);
  }

  return lines.join("\n");
};

/**
 * Legacy metrics functions (for backward compatibility)
 */
export function createMetricLabels(
  ...entries: Array<[string, string]>
): Record<string, string> {
  return Object.fromEntries(entries);
}

export function formatDurationForMetrics(durationMs: number): number {
  return durationMs / 1000; // Convert to seconds
}