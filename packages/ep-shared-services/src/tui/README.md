# TUI Service

The TUI (Terminal User Interface) service provides dynamic loading and management of the `effect-cli-tui` library for interactive CLI experiences.

## Overview

This service abstracts the loading and usage of the TUI module, allowing CLI tools to provide rich terminal interfaces when available, with graceful fallbacks when not available.

## Features

- **Dynamic Loading**: Safely imports `effect-cli-tui` at runtime
- **Caching**: Caches the loaded module for performance
- **Availability Checking**: Provides methods to check if TUI is available
- **Error Handling**: Structured error handling for TUI loading failures
- **Graceful Fallbacks**: Works correctly when `effect-cli-tui` is not installed

## API

### Main Methods

- `load()` - Load the TUI module dynamically
- `isAvailable()` - Check if TUI is available
- `clearCache()` - Clear the TUI module cache

### Error Types

- `TUILoadError` - Failed to load TUI module
- `TUIUnavailableError` - TUI module is not available

## Usage

```typescript
import { TUIService } from "@effect-patterns/ep-shared-services/tui";

// Load TUI module
const tuiModule = yield* TUIService.load();

// Check if TUI is available
const isAvailable = yield* TUIService.isAvailable();

// Clear cache
yield* TUIService.clearCache();
```

## Implementation Details

### Service Pattern

The TUI service uses the Effect.Service pattern for dependency injection and composability:

```typescript
export const TUIService = Effect.Service<TUIServiceInterface>()("TUIService", {
  accessors: true,
  effect: Effect.gen(function* () {
    // Service implementation
  }),
});
```

### Dynamic Import Strategy

The service uses dynamic imports to avoid bundling issues with optional dependencies:

```typescript
let tuiModuleCache: any | false | null = null;

try {
  const tuiModule = await import("effect-cli-tui");
  tuiModuleCache = module;
} catch {
  // TUI not available, will use console fallback
}
```

## Error Handling

The service provides structured error handling for different failure scenarios:

- **TUILoadError**: When the dynamic import fails
- **TUIUnavailableError**: When TUI is not available or fails to load

Both errors extend `Data.TaggedError` for proper error discrimination in Effect programs.

## Dependencies

- **Peer Dependency**: `effect-cli-tui` (optional)
- **Effect**: Core Effect-TS library

## Integration

This service is designed to be used by other services like Display and Execution that need TUI functionality. The TUI adapter pattern allows different CLI tools to provide their own TUI implementations while using a shared service interface.

## Testing

The service includes comprehensive error handling and can be safely used in test environments without requiring the actual TUI library to be installed.
