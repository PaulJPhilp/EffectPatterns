# Rate Limit Service

Request rate limiting with per-identifier tracking.

## Overview

The `MCRateLimitService` implements token bucket rate limiting to prevent abuse and ensure fair resource allocation.

## API

### Methods

#### `checkRateLimit(identifier: string): Effect<void, RateLimitError>`
Check if request is allowed. Fails with `RateLimitError` if rate limit exceeded.

```typescript
try {
  yield* rateLimit.checkRateLimit("ip:192.168.1.1");
} catch (err) {
  // Rate limit exceeded
  console.log(err.retryAfter);
}
```

#### `getRateLimitStatus(identifier: string): Effect<RateLimitStatus>`
Get current status for an identifier (remaining requests, reset time, etc.).

```typescript
const status = yield* rateLimit.getRateLimitStatus("ip:192.168.1.1");
console.log(`Remaining: ${status.remaining}/${status.limit}`);
console.log(`Resets at: ${status.resetTime}`);
```

#### `resetRateLimit(identifier: string): Effect<void>`
Reset rate limit for an identifier.

```typescript
yield* rateLimit.resetRateLimit("ip:192.168.1.1");
```

#### `isEnabled(): Effect<boolean>`
Check if rate limiting is enabled.

```typescript
const enabled = yield* rateLimit.isEnabled();
```

## Configuration

- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting (default: true)
- `RATE_LIMIT_REQUESTS` - Requests per window (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Window duration in ms (default: 900000 = 15 min)

## Error Handling

```typescript
import { RateLimitError } from "./services/rate-limit";

const result = yield* rateLimit.checkRateLimit("ip:192.168.1.1")
  .pipe(Effect.either);

if (Either.isLeft(result)) {
  const error = result.left as RateLimitError;
  console.log(error.identifier);  // "ip:192.168.1.1"
  console.log(error.limit);        // 100
  console.log(error.remaining);    // 0
  console.log(error.resetTime);    // Date
  console.log(error.retryAfter);   // seconds
}
```

## Helper Functions

#### `createRateLimitKey(id: string, operation: string): string`
Create a rate limit key from ID and operation.

```typescript
const key = createRateLimitKey("user:123", "search");
// Returns: "search:user:123"
```

#### `getRemainingRequests(status: RateLimitStatus): number`
Extract remaining requests from status.

```typescript
const remaining = getRemainingRequests(status);
```

#### `getResetTime(status: RateLimitStatus): Date`
Extract reset time from status.

```typescript
const resetTime = getResetTime(status);
```

## Example

```typescript
import { Effect } from "effect";
import { MCRateLimitService, createRateLimitKey } from "./services/rate-limit";

const program = Effect.gen(function* () {
  const rateLimit = yield* MCRateLimitService;
  
  // Create a key for this user's search operation
  const key = createRateLimitKey("user:123", "search");
  
  // Check if allowed
  const result = yield* rateLimit.checkRateLimit(key)
    .pipe(Effect.either);
  
  if (Either.isRight(result)) {
    // Request allowed, proceed
    yield* performSearch();
  } else {
    // Rate limited
    const error = result.left;
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  }
});

Effect.runPromise(program);
```

## Types

```typescript
interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  limit: number;
  windowMs: number;
}

class RateLimitError extends Error {
  readonly identifier: string;
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Date;
  readonly retryAfter: number; // seconds
}
```

## Testing

Run rate limit service tests:
```bash
bun run test src/services/rate-limit/__tests__
```
