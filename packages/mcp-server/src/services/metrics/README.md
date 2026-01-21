# Metrics Service

Metrics collection and reporting for MCP server.

## Overview

The `MCPMetricsService` collects and reports server metrics including request counts, response times, error rates, and cache performance.

## API

### Methods

#### `recordRequest(method: string, path: string, statusCode: number, durationMs: number): Effect<void>`
Record an HTTP request metric.

```typescript
yield* metrics.recordRequest("GET", "/api/patterns", 200, 145);
```

#### `recordError(method: string, path: string, error: Error): Effect<void>`
Record an error that occurred.

```typescript
yield* metrics.recordError("POST", "/api/analyze", error);
```

#### `recordCacheHit(key: string): Effect<void>`
Record a cache hit.

```typescript
yield* metrics.recordCacheHit("user:123");
```

#### `recordCacheMiss(key: string): Effect<void>`
Record a cache miss.

```typescript
yield* metrics.recordCacheMiss("user:123");
```

#### `recordDuration(operation: string, durationMs: number): Effect<void>`
Record operation duration.

```typescript
yield* metrics.recordDuration("analyze_file", 234);
```

#### `getMetrics(): Effect<Metrics>`
Get all collected metrics.

```typescript
const metrics = yield* metrics.getMetrics();
console.log(`Total requests: ${metrics.totalRequests}`);
console.log(`Error rate: ${metrics.errorRate}%`);
```

#### `reset(): Effect<void>`
Reset all metrics.

```typescript
yield* metrics.reset();
```

## Metrics Tracked

- Total requests
- Requests by method (GET, POST, etc.)
- Requests by status code
- Response times (min, max, average)
- Error count and rate
- Cache hits and misses
- Cache hit rate

## Example

```typescript
import { Effect } from "effect";
import { MCPMetricsService } from "./services/metrics";

const program = Effect.gen(function* () {
  const metrics = yield* MCPMetricsService;
  
  // Record a successful request
  yield* metrics.recordRequest("GET", "/api/patterns", 200, 145);
  
  // Record cache activity
  yield* metrics.recordCacheHit("user:123");
  
  // Get metrics
  const data = yield* metrics.getMetrics();
  console.log(data);
  // {
  //   totalRequests: 1,
  //   averageResponseTime: 145,
  //   errorCount: 0,
  //   errorRate: 0,
  //   cacheHits: 1,
  //   cacheMisses: 0,
  //   cacheHitRate: 100
  // }
});

Effect.runPromise(program);
```

## Types

```typescript
interface Metrics {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByStatusCode: Record<number, number>;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
}
```
