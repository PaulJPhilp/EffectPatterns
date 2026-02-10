# Changelog

All notable changes to @effect-patterns/ep-shared-services will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-02-10

### Changed
- Added repository, bugs, homepage, and engines metadata to package.json
- Added LICENSE file to package
- Dependency updates

## [1.0.0] - 2026-01-11

### Added
- **TUI Service** - Dynamic loading and management of `effect-cli-tui` library
  - Dynamic module loading with caching
  - Graceful fallbacks when TUI is unavailable
  - Structured error handling with `TUILoadError` and `TUIUnavailableError`
  - Availability checking and cache management

- **Logger Service** - Structured logging with multiple output formats
  - Configurable log levels (debug, info, warn, error, silent)
  - Text and JSON output modes
  - Beautiful colored console output with ANSI color support
  - Structured logging with data support
  - Performance optimized output handling

- **Display Service** - Output formatting with TUI adapter pattern
  - TUI adapter pattern for tool-specific implementations
  - Rich terminal displays when TUI is available
  - Console fallbacks with color support
  - Multiple display types (messages, panels, tables, highlights)
  - Effect-TS service pattern integration

- **Execution Service** - Script execution with TUI spinner support
  - Multiple execution modes (capture, stream, with TUI spinner)
  - Timeout protection and comprehensive error handling
  - Progress feedback and visual spinners
  - Script output capture and streaming
  - Effect-TS service pattern integration

### Features
- **Effect.Service Pattern** - All services use the Effect.Service pattern for dependency injection
- **TUI Adapter Pattern** - Abstracts TUI differences between CLI tools
- **Service Dependencies** - Clear dependency chains between services
- **Error Handling** - Structured error handling with `Data.TaggedError`
- **Type Safety** - Full TypeScript typing throughout
- **Performance Optimization** - Lazy loading, caching, and efficient output handling

### Integration
- **ep-admin** - Full integration with production runtime
- **ep-cli** - Full integration with production runtime
- **Backward Compatibility** - Maintained through re-exports
- **Service Composition** - Proper layering and dependency management

### Documentation
- Comprehensive README files for all services
- API documentation with examples
- Architecture documentation
- Usage examples and best practices
- Troubleshooting guides

### Breaking Changes
- None - This is the initial release

### Dependencies
- **Effect** - Core Effect-TS library
- **@effect/platform** - Platform services
- **@effect/platform-node** - Node.js platform services
- **effect-cli-tui** - Optional peer dependency for TUI functionality

### Security
- Proper error handling to prevent information leakage
- Safe dynamic imports with fallbacks
- Input validation for script execution
- Resource management for child processes

### Performance
- Lazy loading of optional dependencies
- Caching of TUI modules
- Efficient output buffering
- Optimized color handling

### Testing
- Comprehensive error handling tests
- Service composition tests
- Integration tests with both ep-admin and ep-cli
- Graceful fallback testing

---

## Migration Guide

### From Individual Services

If you were previously using individual service implementations:

**Before:**
```typescript
import { Logger } from "./services/logger";
import { Display } from "./services/display";
```

**After:**
```typescript
import { Logger, Display } from "@effect-patterns/ep-shared-services";
```

### Service Adapters

For tool-specific implementations, create TUI adapters:

```typescript
// ep-admin TUI Adapter
export const EpAdminTUIAdapter: TUIAdapter = {
  load: () => Effect.gen(function* () {
    const tuiService = yield* TUIService;
    const tuiModule = yield* tuiService.load();
    return tuiModule ? { /* methods */ } : null;
  }),
};
```

### Runtime Configuration

Update your runtime layers to include the shared services:

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

---

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

---

## Contributing

When contributing to the shared services:

1. Follow Effect-TS patterns and conventions
2. Maintain backward compatibility
3. Add comprehensive tests
4. Update documentation
5. Consider the impact on all consuming applications

---

## License

This package is part of the Effect Patterns project and follows its licensing terms.
