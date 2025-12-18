# Observability Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when adding observability to Effect applications. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started ✅

### Jobs:
- [x] Add basic logging to Effects
- [x] Understand log levels
- [x] Add context to logs

### Patterns (1):
- `observability-hello-world.mdx` - Your First Logs

---

## 2. Structured Logging ✅

### Jobs:
- [x] Use Effect's built-in structured logging
- [x] Configure log levels and formats

### Patterns (1):
- `structured-logging.mdx` - Leverage Effect's Built-in Structured Logging

---

## 3. Debugging ✅

### Jobs:
- [x] Debug Effect programs
- [x] Use tap to inspect values
- [x] Trace execution flow

### Patterns (1):
- `observability-debugging.mdx` - Debug Effect Programs

---

## 4. Tracing ✅

### Jobs:
- [x] Add spans for timing information
- [x] Trace operations across services
- [x] Integrate with OpenTelemetry

### Patterns (3):
- `spans.mdx` - Trace Operations Across Services with Spans
- `opentelemetry.mdx` - Integrate Effect Tracing with OpenTelemetry
- `effect-fn.mdx` - Instrument and Observe Function Calls with Effect.fn

---

## 5. Metrics ✅

### Jobs:
- [x] Add custom metrics to your application
- [x] Track counters, gauges, histograms

### Patterns (1):
- `custom-metrics.mdx` - Add Custom Metrics to Your Application

---

## 6. Advanced Observability ✅

### Jobs:
- [x] Implement distributed tracing
- [x] Export metrics to Prometheus
- [x] Create dashboards
- [x] Set up alerting

### Patterns (4):
- `observability-distributed-tracing.mdx` - Implement Distributed Tracing
- `observability-prometheus.mdx` - Export Metrics to Prometheus
- `observability-dashboards.mdx` - Create Observability Dashboards
- `observability-alerting.mdx` - Set Up Alerting

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Getting Started | 3 | 1 | 0 |
| Structured Logging | 2 | 1 | 0 |
| Debugging | 3 | 1 | 0 |
| Tracing | 3 | 3 | 0 |
| Metrics | 2 | 1 | 0 |
| Advanced Observability | 4 | 4 | 0 |
| **Total** | **17** | **11** | **0** |

### Coverage: 100%

