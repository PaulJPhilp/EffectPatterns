# Cache Service

In-memory caching service with TTL support, statistics tracking, and warm-up capabilities.

## Overview

The `MCPCacheService` provides a simple, efficient in-memory cache for storing and retrieving data with automatic expiration. It includes cache statistics, hit/miss tracking, and batch warm-up operations.

## API

### Methods

#### `set(key: string, value: T, ttlMs?: number): Effect<void>`
Set a value in the cache with optional TTL (time-to-live).

```typescript
yield* cache.set("user:123", userData, 3600000); // 1 hour TTL
```

#### `get(key: string): Effect<CacheResult<T>>`
Retrieve a value from the cache with hit/miss status.

```typescript
const result = yield* cache.get("user:123");
if (result.hit) {
  console.log(result.value);
} else {
  console.log("Cache miss");
}
```

#### `has(key: string): Effect<boolean>`
Check if a key exists in the cache.

```typescript
const exists = yield* cache.has("user:123");
```

#### `del(key: string): Effect<boolean>`
Delete a key from the cache. Returns true if key existed.

```typescript
const wasDeleted = yield* cache.del("user:123");
```

#### `getOrSet(key: string, compute: Effect<T>, ttlMs?: number): Effect<T>`
Get a value or compute and cache it if missing.

```typescript
const value = yield* cache.getOrSet(
  "expensive:data",
  computeExpensiveData(),
  3600000
);
```

#### `clear(): Effect<void>`
Clear all entries from the cache.

```typescript
yield* cache.clear();
```

#### `getStats(): Effect<CacheStats>`
Get cache statistics (entries, hits, misses).

```typescript
const stats = yield* cache.getStats();
console.log(`Cache: ${stats.hits} hits, ${stats.misses} misses`);
```

#### `warmup(keys: readonly string[], compute: (key: string) => Effect<T>, ttlMs?: number): Effect<void>`
Pre-populate cache with computed values.

```typescript
yield* cache.warmup(
  ["user:1", "user:2", "user:3"],
  (key) => loadUser(key),
  3600000
);
```

#### `isEnabled(): Effect<boolean>`
Check if caching is enabled from config.

```typescript
const enabled = yield* cache.isEnabled();
```

## Configuration

Respects config settings:
- `CACHE_ENABLED` - Enable/disable caching (default: true)
- `CACHE_TTL_MS` - Default TTL in milliseconds

## Dependencies

- `MCPConfigService` - Configuration service
- `MCPLoggerService` - Logging service

## Testing

Run cache service tests:
```bash
bun run test src/services/cache/__tests__
```

## Example

```typescript
import { Effect } from "effect";
import { MCPCacheService } from "./services/cache";
import { MCPConfigService } from "./services/config";
import { MCPLoggerService } from "./services/logger";

const program = Effect.gen(function* () {
  const cache = yield* MCPCacheService;
  
  // Set a value
  yield* cache.set("key", "value", 5000);
  
  // Get the value
  const result = yield* cache.get("key");
  console.log(result.value); // "value"
  
  // Get or compute
  const data = yield* cache.getOrSet(
    "expensive",
    Effect.promise(() => fetchData()),
    3600000
  );
  
  // Check stats
  const stats = yield* cache.getStats();
  console.log(`Entries: ${stats.entries}`);
});

Effect.runPromise(program);
```

## Types

```typescript
interface CacheResult<T> {
  hit: boolean;
  value: T | undefined;
  stats: CacheStats;
}

interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
}
```
