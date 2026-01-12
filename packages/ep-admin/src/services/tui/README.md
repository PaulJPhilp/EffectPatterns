# TUI Service

Terminal User Interface service for dynamic loading and management of the effect-cli-tui module.

## Overview

The TUI Service provides:
- Dynamic loading of the effect-cli-tui module
- Availability checking for TUI features
- Cache management for loaded modules
- Graceful fallback when TUI is unavailable

## API

### `load(): Effect<ImportedTuiModule | null, TUIServiceError>`

Load the TUI module dynamically.

**Returns:** The loaded TUI module or `null` if unavailable

**Errors:**
- `TUILoadError` - If module loading fails
- `TUIUnavailableError` - If TUI is not available in the environment

---

### `isAvailable(): Effect<boolean, never>`

Check if TUI features are available in the current environment.

**Returns:** `true` if TUI is available, `false` otherwise

**Errors:** Never fails

---

### `clearCache(): Effect<void, never>`

Clear the cached TUI module to force reload on next access.

**Returns:** void

**Errors:** Never fails

## Types

### `Terminal`
```typescript
type Terminal = {
  width?: number;
  height?: number;
  colors?: boolean;
  type?: string;
}
```

### `TableOptions`
```typescript
interface TableOptions {
  columns: Array<{
    key: string;
    header: string;
    width?: number;
    align?: "left" | "center" | "right";
  }>;
  bordered?: boolean;
  maxWidth?: number;
}
```

### `PanelOptions`
```typescript
interface PanelOptions {
  border?: boolean;
  padding?: number;
  width?: number;
  align?: "left" | "center" | "right";
}
```

### `TUIModule`
```typescript
interface TUIModule {
  displaySuccess?: (message: string) => Effect<void, never, Terminal>;
  displayError?: (message: string) => Effect<void, never, Terminal>;
  displayInfo?: (message: string) => Effect<void, never, Terminal>;
  displayWarning?: (message: string) => Effect<void, never, Terminal>;
  displayPanel?: (content: string, title: string, options?: PanelOptions) => Effect<void, never, Terminal>;
  displayTable?: (data: TableRow[], options: TableOptions) => Effect<void, never, Terminal>;
  displayHighlight?: (message: string) => Effect<void, never, Terminal>;
  displaySeparator?: () => Effect<void, never, Terminal>;
}
```

## Errors

### `TUILoadError`
Thrown when the TUI module fails to load.

```typescript
class TUILoadError extends Data.TaggedError("TUILoadError")<{
  readonly message: string;
  readonly cause?: unknown;
}>
```

### `TUIUnavailableError`
Thrown when TUI features are not available in the environment.

```typescript
class TUIUnavailableError extends Data.TaggedError("TUIUnavailableError")<{
  readonly message: string;
}>
```

## Usage

```typescript
import { TUIService } from "./services/tui/index.js";

const program = Effect.gen(function* () {
  const tui = yield* TUIService;
  
  // Check availability
  const available = yield* tui.isAvailable();
  
  if (available) {
    // Load and use TUI module
    const module = yield* tui.load();
    if (module) {
      yield* module.displaySuccess("Operation completed!");
    }
  } else {
    // Fallback to console
    console.log("Operation completed!");
  }
});
```

## Notes

- The TUI module is loaded lazily to avoid startup overhead
- Results are cached after first load for performance
- Use `clearCache()` if you need to reload the module
- The Display service wraps TUI with automatic fallback to console
