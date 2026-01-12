# Logger Service

The Logger service provides structured logging with support for multiple output formats, log levels, and ANSI color formatting.

## Overview

This service offers a comprehensive logging solution for CLI applications with support for both text and JSON output formats, configurable log levels, and beautiful colored console output.

## Features

- **Multiple Output Formats**: Text and JSON output modes
- **Configurable Log Levels**: Debug, Info, Warn, Error, Silent
- **ANSI Color Support**: Beautiful colored console output
- **Structured Logging**: Consistent log message formatting
- **Performance Optimized**: Efficient output handling
- **Effect Integration**: Full Effect-TS service pattern support

## API

### Main Methods

- `debug(message, data?)` - Log debug message
- `info(message, data?)` - Log info message
- `warn(message, data?)` - Log warning message
- `error(message, data?)` - Log error message
- `success(message, data?)` - Log success message
- `isLoggable(level)` - Check if a log level should be output
- `getConfig()` - Get current logger configuration
- `updateConfig(config)` - Update logger configuration

### Configuration Options

```typescript
interface LoggerConfig {
  readonly level: LogLevel;
  readonly format: OutputFormat;
  readonly noColor: boolean;
  readonly json: boolean;
}
```

### Log Levels

- `debug` - Verbose debugging information
- `info` - General information messages
- `warn` - Warning messages
- `error` - Error messages
- `silent` - No output

### Output Formats

- `text` - Formatted text with colors
- `json` - Structured JSON output

## Usage

### Basic Usage

```typescript
import { Logger } from "@effect-patterns/ep-shared-services/logger";

// Simple logging
yield* Logger.info("Application started");
yield* Logger.error("Something went wrong");
yield* Logger.success("Operation completed");

// With structured data
yield* Logger.info("User logged in", { userId: 123, email: "user@example.com" });
```

### Configuration

```typescript
// Update log level
yield* Logger.updateConfig({ level: "debug" });

// Switch to JSON output
yield* Logger.updateConfig({ format: "json" });

// Disable colors
yield* Logger updateConfig({ noColor: true });
```

### Conditional Logging

```typescript
// Check if message should be logged
const shouldLog = yield* Logger.isLoggable("debug");
if (shouldLog) {
  yield* Logger.debug("Debug information");
}
```

## Implementation Details

### Service Pattern

The Logger service uses the Effect.Service pattern:

```typescript
export const Logger = Effect.Service<LoggerServiceInterface>()("Logger", {
  accessors: true,
  effect: Effect.gen(function* () {
    // Service implementation
  }),
});
```

### Message Formatting

The service provides sophisticated message formatting with:

- **Icons**: Visual indicators for different log levels
- **Colors**: ANSI color codes for terminal output
- **Timestamps**: Optional timestamp inclusion
- **Structured Data**: JSON serialization support

### Color Support

The service includes comprehensive ANSI color constants:

```typescript
const ANSI_COLORS = {
  RESET: "\x1b[0m",
  BLACK: "\x1b[30m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",
  // ... more colors
};
```

## Error Handling

The service provides structured error handling:

- **LoggerConfigError**: Configuration validation errors
- **LogFormatError**: Message formatting errors

Both errors extend `Data.TaggedError` for proper error discrimination.

## Dependencies

- **Effect**: Core Effect-TS library
- **Node.js**: For console output

## Performance Considerations

- **Lazy Loading**: Configuration is only computed when needed
- **Output Buffering**: Efficient output handling for high-volume logging
- **Color Caching**: ANSI color codes are pre-computed

## Integration

This service is designed to be used by other services like Display and Execution that need logging functionality. The service provides a consistent logging interface across all CLI tools.

## Examples

### Text Output

```
ℹ️  Application started
✅  User logged in
⚠️  Configuration error found
❌  Operation failed
```

### JSON Output

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Application started",
  "data": {
    "userId": 123,
    "email": "user@example.com"
  }
}
```

## Testing

The service includes comprehensive error handling and can be safely used in test environments with different configuration options.
