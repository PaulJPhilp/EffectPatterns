# Metrics Service

A service for tracking server statistics and performance metrics.

## Capabilities

### API Methods

#### `incrementRequestCount() -> void`

Increments the total request count.

#### `incrementErrorCount() -> void`

Increments the total error count.

#### `incrementRateLimitHits() -> void`

Increments the rate limit hit count.

#### `updateHealthCheck() -> void`

Updates the timestamp of the last health check.

#### `getMetrics() -> ServerMetrics`

Returns current server metrics including calculated values.

**Returns:**

* `startTime: number` - Server start timestamp
* `requestCount: number` - Total requests processed
* `errorCount: number` - Total errors encountered
* `lastHealthCheck: number` - Last health check timestamp
* `rateLimitHits: number` - Total rate limit violations
* `uptime: number` - Server uptime in milliseconds
* `healthCheckAge: number` - Time since last health check in milliseconds

**Error Values:**

* Never throws errors (always succeeds)

## Usage Example

```typescript
import { MetricsService } from "./services/metrics/service.js";

const program = Effect.gen(function* () {
  const metrics = yield* MetricsService;
  
  // Track a request
  metrics.incrementRequestCount();
  
  // Get current metrics
  const current = metrics.getMetrics();
  console.log(`Requests: ${current.requestCount}, Uptime: ${current.uptime}ms`);
});
```

## Implementation Details

* Uses in-memory state tracking with Effect.Ref
* Thread-safe operations for concurrent access
* Calculates derived metrics (uptime, healthCheckAge) on demand
* Provides atomic increment operations for counters

## Testing

The service includes comprehensive tests covering:

* Request count tracking
* Error count tracking
* Rate limit hit tracking
* Health check timestamp updates
* Uptime calculations

Tests use real service implementations without mocks, following project standards.
