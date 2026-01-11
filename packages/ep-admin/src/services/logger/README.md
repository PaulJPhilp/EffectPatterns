# Logger Service

Centralized logging service for the ep-admin CLI with configurable log levels, color output control, and format options.

## Features

- **Configurable log levels**: debug, info, warn, error, silent
- **Multiple output formats**: text and JSON
- **Color support**: Respects color configuration
- **Verbose mode**: Optional data output
- **Modern Effect.Service pattern**: Type-safe and composable

## Usage

```typescript
import { Logger } from "./index.js";

// Basic logging
yield* Logger.info("Application started");
yield* Logger.error("Something went wrong", { error: details });
yield* Logger.success("Operation completed");

// With data
yield* Logger.debug("Debug info", { userId: 123, action: "login" });

// Configuration
const config = yield* Logger.getConfig();
yield* Logger.updateConfig({ logLevel: "debug", useColors: false });
```

## API

### LoggerService

- `debug(message, data?)`: Log debug message
- `info(message, data?)`: Log info message  
- `warn(message, data?)`: Log warning message
- `error(message, data?)`: Log error message
- `success(message, data?)`: Log success message
- `shouldLog(level)`: Check if level should be logged
- `updateConfig(update)`: Update logger configuration
- `getConfig()`: Get current configuration

## Configuration

```typescript
interface LoggerConfig {
  logLevel: LogLevel;        // "debug" | "info" | "warn" | "error" | "silent"
  useColors: boolean;        // Enable/disable colors
  outputFormat: OutputFormat; // "text" | "json"
  verbose: boolean;          // Show data output
}
```

## Layers

- `Logger.Default`: Default logger layer with standard configuration
- `LoggerLive(config)`: Logger layer with custom configuration

## Dependencies

- Effect: Core functional programming library
- utils: Shared color utilities
- Console: Effect console operations

## Testing

See `__tests__/` directory for unit tests covering:
- Log level filtering
- Output formatting
- Configuration updates
- Error handling
