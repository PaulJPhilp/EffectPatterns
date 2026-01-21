# Config Service

Environment-based configuration management for MCP server.

## Overview

The `MCPConfigService` loads and validates configuration from environment variables with strong type safety and helpful error messages.

## Configuration Variables

### Required
- `PATTERN_API_KEY` - API key for authentication

### Optional with Defaults

#### Server
- `NODE_ENV` - Environment (development/production, default: development)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: localhost)

#### Logging
- `LOG_LEVEL` - Log level (debug/info/warn/error, default: info)
- `LOG_FORMAT` - Log format (json/text, default: json)

#### Timeouts
- `REQUEST_TIMEOUT_MS` - Request timeout (default: 30000, min: 1000)

#### API
- `MAX_SEARCH_RESULTS` - Max search results (default: 100, min: 1, max: 500)
- `RATE_LIMIT_ENABLED` - Enable rate limiting (default: true)
- `RATE_LIMIT_REQUESTS` - Requests per window (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000 = 15 min)

#### Cache
- `CACHE_ENABLED` - Enable caching (default: true)
- `CACHE_TTL_MS` - Cache TTL in ms (default: 3600000 = 1 hour)

#### Database
- `DATABASE_URL` - Database connection URL (production only)

#### Observability
- `OTLP_HEADERS` - OpenTelemetry headers (format: key=value,key=value)

## API

### Methods

#### `getApiKey(): Effect<string, ConfigurationError>`
Get the API key.

#### `getPort(): Effect<number, ConfigurationError>`
Get the server port (validates 1-65535).

#### `getHost(): Effect<string>`
Get the server host.

#### `getLogLevel(): Effect<LogLevel, ConfigurationError>`
Get the log level (validates: debug, info, warn, error).

#### `getRequestTimeoutMs(): Effect<number, ConfigurationError>`
Get request timeout in ms (validates >= 1000).

#### `getMaxSearchResults(): Effect<number, ConfigurationError>`
Get max search results (validates 1-500).

#### `isCacheEnabled(): Effect<boolean>`
Check if caching is enabled.

#### `getCacheTtlMs(): Effect<number>`
Get cache TTL in milliseconds.

#### `isRateLimitEnabled(): Effect<boolean>`
Check if rate limiting is enabled.

#### `getRateLimitRequests(): Effect<number>`
Get rate limit request count.

#### `getRateLimitWindowMs(): Effect<number>`
Get rate limit window in milliseconds.

#### `getOtlpHeaders(): Effect<Record<string, string>>`
Get OpenTelemetry headers (parses CSV format).

#### `getDatabaseUrl(): Effect<string | undefined>`
Get database URL (optional).

## Error Handling

Configuration errors include:
- Missing required variables
- Invalid values
- Out-of-range numbers

```typescript
import { Either } from "effect";
import { ConfigurationError } from "./services/config";

const result = yield* config.getPort().pipe(Effect.either);
if (Either.isLeft(result)) {
  const error = result.left as ConfigurationError;
  console.log(error.key);      // "port"
  console.log(error.expected);  // "1-65535"
  console.log(error.received);  // 70000
}
```

## Testing

Run config service tests:
```bash
bun run test src/services/config/__tests__
```

## Example

```typescript
import { Effect } from "effect";
import { MCPConfigService } from "./services/config";

const program = Effect.gen(function* () {
  const config = yield* MCPConfigService;
  
  const apiKey = yield* config.getApiKey();
  const port = yield* config.getPort();
  const logLevel = yield* config.getLogLevel();
  
  console.log(`Starting server on port ${port}`);
  console.log(`Log level: ${logLevel}`);
});

Effect.runPromise(program);
```

## Types

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

class ConfigurationError extends Error {
  readonly key: string;
  readonly expected: string;
  readonly received: unknown;
}
```
