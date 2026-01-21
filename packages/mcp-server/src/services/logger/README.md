# Logger Service

Structured logging service for the MCP server.

## Overview

The `MCPLoggerService` provides structured logging with configurable levels, formats, and context support.

## API

### Methods

#### `debug(message: string, context?: Record<string, unknown>): Effect<void>`
Log a debug message with optional context.

```typescript
yield* logger.debug("User lookup started", { userId: "123" });
```

#### `info(message: string, context?: Record<string, unknown>): Effect<void>`
Log an info message.

```typescript
yield* logger.info("Server started", { port: 3000 });
```

#### `warn(message: string, context?: Record<string, unknown>): Effect<void>`
Log a warning message.

```typescript
yield* logger.warn("Cache miss", { key: "user:123" });
```

#### `error(message: string, error?: Error | unknown, context?: Record<string, unknown>): Effect<void>`
Log an error with optional error object and context.

```typescript
yield* logger.error("Request failed", err, { requestId: "abc" });
```

#### `getLogLevel(): Effect<LogLevel>`
Get the current log level.

```typescript
const level = yield* logger.getLogLevel();
```

#### `setLogLevel(level: LogLevel): Effect<void>`
Set the log level dynamically.

```typescript
yield* logger.setLogLevel("debug");
```

## Configuration

- `LOG_LEVEL` - Minimum log level (debug/info/warn/error)
- `LOG_FORMAT` - Output format (json/text)

## Levels

- **debug** - Verbose diagnostic information
- **info** - General informational messages
- **warn** - Warning conditions
- **error** - Error conditions

## Example

```typescript
import { Effect } from "effect";
import { MCPLoggerService } from "./services/logger";

const program = Effect.gen(function* () {
  const logger = yield* MCPLoggerService;
  
  yield* logger.info("Starting service");
  yield* logger.debug("Configuration loaded", { env: "production" });
  
  try {
    yield* someOperation();
  } catch (err) {
    yield* logger.error("Operation failed", err, { operation: "sync" });
  }
});

Effect.runPromise(program);
```

## Structured Logging

All logs include:
- Timestamp
- Level
- Message
- Context (optional)
- Stack trace (for errors)

JSON output format:
```json
{
  "timestamp": "2024-01-21T10:30:00Z",
  "level": "info",
  "message": "Request processed",
  "context": {
    "requestId": "abc123",
    "duration": 145
  }
}
```
