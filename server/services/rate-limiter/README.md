# Rate Limiter Service

A service for rate limiting requests based on IP address using sliding window expiration.

## Capabilities

### API Methods

#### `checkRateLimit(ip: string) -> Effect<RateLimitResult, never, never>`

Checks if an IP address is rate limited.

**Returns:**

* `allowed: boolean` - Whether the request is allowed
* `remaining: number` - Number of requests remaining in the window
* `resetTime?: number` - Timestamp when the window resets (only when blocked)

**Error Values:**

* Never throws errors (always succeeds)

## Configuration

The service uses the following configuration from constants:

* `RATE_LIMIT_CONFIG.windowMs`: Time window in milliseconds (default: 15 minutes)
* `RATE_LIMIT_CONFIG.maxRequests`: Maximum requests per window (default: 100)

## Usage Example

```typescript
import { RateLimiterService } from "./services/rate-limiter/service.js";

const program = Effect.gen(function* () {
  const rateLimiter = yield* RateLimiterService;
  const result = yield* rateLimiter.checkRateLimit("127.0.0.1");
  
  if (result.allowed) {
    // Process request
  } else {
    // Return 429 Too Many Requests
  }
});
```

## Implementation Details

* Uses in-memory Map for tracking requests per IP
* Sliding window expiration based on timestamps
* Thread-safe operations using Effect.Ref
* In production, replace with Redis or similar distributed cache

## Testing

The service includes comprehensive tests covering:

* Request allowance within limits
* Request blocking when limits exceeded
* Independent handling of different IP addresses

Tests use real service implementations without mocks, following project standards.
