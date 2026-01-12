# @effect-patterns/ep-shared-services

Shared services for Effect Patterns CLI tools

## Overview

This package provides shared services for Effect-TS based CLI tools including TUI, Logger, Display, and Execution services. The package eliminates code duplication and ensures consistent behavior across all CLI applications in the Effect Patterns ecosystem.

## Services

- 🖥️ **[TUI Service](./src/tui/README.md)** - Dynamic loading of `effect-cli-tui` with graceful fallbacks
- 📝 **[Logger Service](./src/logger/README.md)** - Structured logging with multiple output formats and color support
- 🖥️ **[Display Service](./src/display/README.md)** - Output formatting with TUI adapter pattern for different CLI tools
- ⚡ **[Execution Service](./src/execution/README.md)** - Script execution with TUI spinner support and error handling

## Quick Start

```typescript
import { TUIService, Logger, Display, Execution } from "@effect-patterns/ep-shared-services";

// Use services in your CLI application
const logger = yield* Logger;
const display = yield* Display;
const execution = yield* Execution;
```

## Documentation

- [TUI Service](./src/tui/README.md) - TUI service documentation
- [Logger Service](./src/logger/README.md) - Logger service documentation  
- [Display Service](./src/display/README.md) - Display service documentation
- [Execution Service](./src/execution/README.md) - Execution service documentation

## Architecture

The shared services use the Effect.Service pattern for dependency injection and composability. Each service is designed to be:

1. **Composable**: Services can be easily combined
2. **Testable**: Services include comprehensive error handling
3. **Configurable**: Services support runtime configuration
4. **Portable**: Services work across different CLI tools

### Service Dependencies

```
TUI → Logger → Console
Display → Logger → Console
Execution → Logger → Console
```

### TUI Adapter Pattern

Services that need TUI functionality use the TUI adapter pattern:

```typescript
export interface TUIAdapter {
  load: () => Effect.Effect<TUIDisplayMethods | null>;
}
```

This allows different CLI tools to provide their own TUI implementations while using a shared service interface.

## Installation

```bash
npm install @effect-patterns/ep-shared-services
```

## Usage Examples

### Basic Service Usage

```typescript
import { TUIService, Logger, Display, Execution } from "@effect-patterns/ep-shared-services";

// Load TUI module
const tuiModule = yield* TUIService.load();

// Check availability
const isAvailable = yield* TUIService.isAvailable();

// Log messages
yield* Logger.info("Application started");
yield* Logger.error("Error occurred");

// Display output
yield* Display.showSuccess("Operation completed");
```

### Advanced Usage

```typescript
// Script execution with TUI spinner
yield* Execution.executeScriptWithTUI(
  "./scripts/build.sh",
  "Building project...",
  { verbose: false }
);

// Capture script output
const output = yield* Execution.executeScriptCapture(
  "./scripts/test.sh",
  { timeout: 30000 }
);

// Wrap effects with spinner
const result = yield* Execution.withSpinner(
  "Processing data...",
  Effect.succeed("Processing complete"),
  { verbose: false }
);
```

## Runtime Configuration

### ep-admin

```typescript
const ProductionLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  NodeFileSystem.layer,
  Logger.Default,
  Layer.provide(Display.Default, Logger.Default),
  Layer.provide(Execution.Default, Logger.Default),
  StateStore.Default
);
```

### ep-cli

```typescript
const BaseLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  layerNoop({ /* FileSystem methods */ }),
  LoggerLive(globalConfig),
  LiveTUILoader,
  StateStore.Default
);

const ServiceLayer = Layer.mergeAll(
  Linter.Default,
  Skills.Default,
  Display.Default,
  Layer.provide(Execution.Default, Logger.Default)
);
```

## Development

### Building

```bash
cd packages/ep-shared-services
npm run build
```

### Testing

```bash
cd packages/ep-shared-services
npm test
```

### Linting

```bash
cd packages/ep-shared-services
npm run lint
```

## Contributing

1. Follow Effect-TS patterns and conventions
2. Maintain backward compatibility
3. Add comprehensive tests
4. Update documentation
5. Consider impact on all consuming applications

## License

This package is part of the Effect Patterns project and follows its licensing terms.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version information and breaking changes.
