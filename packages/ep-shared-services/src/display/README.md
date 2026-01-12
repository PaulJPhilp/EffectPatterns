# Display Service

The Display service provides output formatting and display functionality with support for both TUI and console output modes.

## Overview

This service abstracts display functionality to work with different TUI implementations while providing a consistent interface across CLI tools. It supports rich terminal interfaces when available and falls back to console output when TUI is not available.

## Features

- **TUI Adapter Pattern**: Abstracts TUI differences between CLI tools
- **Rich Terminal Output**: Interactive displays, panels, tables, and highlighting when TUI is available
- **Console Fallbacks**: Graceful fallback to console output when TUI is not available
- **Color Support**: Beautiful colored output in console mode
- **Effect Integration**: Full Effect-TS service pattern support
- **Multiple Display Types**: Success, Error, Info, Warning, Panel, Table, Highlight

## API

### Main Methods

- `showSuccess(message)` - Display success message
- `showError(message)` - Display error message  
- `showInfo(message)` - Display info message
- `showWarning(message)` - Display warning message
- `showPanel(content, title, options?)` - Display a panel
- `showTable(data, options)` - Display a table
- `showHighlight(message)` - Display highlighted message
- `showSeparator()` - Display a separator line

### Display Options

```typescript
interface PanelOptions {
  type?: "info" | "success" | "error" | "warning";
}

interface TableOptions {
  columns: Array<{
    key: string;
    header: string;
    width?: number;
    align?: string;
    formatter?: (value: unknown) => string;
  }>;
  bordered?: boolean;
  head?: { bold?: boolean; color?: string };
}
```

## Usage

### Basic Display

```typescript
import { Display } from "@effect-patterns/ep-shared-services/display";

// Simple messages
yield* Display.showSuccess("Operation completed successfully");
yield* Display.showError("Configuration error");
yield* Display.showInfo("Processing request...");
yield* Display.showWarning("Deprecated feature used");
```

### Rich Display

```typescript
// Display panels
yield* Display.showPanel(
  "Application Status",
  "All systems operational",
  { type: "success" }
);

// Display tables
yield* Display.showTable(
  [
    { name: "John", age: 30, city: "New York" },
    { name: "Jane", age: 25, city: "Los Angeles" }
  ],
  {
    columns: [
      { key: "name", header: "Name", width: 20 },
      { key: "age", header: "Age", width: 10 },
      { key: "city", header: "City", width: 20 }
    ],
    bordered: true,
    head: { bold: true, color: "cyan" }
  }
);

// Highlighted messages
yield* Display.showHighlight("Important notice!");
```

## Implementation Details

### TUI Adapter Pattern

The service uses a TUI adapter pattern to handle differences between CLI tools:

```typescript
export interface TUIAdapter {
  load: () => Effect.Effect<TUIDisplayMethods | null>;
}

export interface TUIDisplayMethods {
  displaySuccess?: (message: string) => Effect.Effect<void>;
  displayError?: (message: string) => Effect.Effect<void>;
  displayInfo?: (message: string) => Effect.Effect<void>;
  displayWarning?: (message: string) => Effect.Effect<void>;
  displayPanel?: (
    content: string,
    title: string,
    options?: PanelOptions
  ) => Effect.Effect<void>;
  displayTable?: <T extends Record<string, unknown>>(
    data: T[],
    options: TableOptions
  ) => Effect.Effect<void>;
  displayHighlight?: (message: string) => Effect.Effect<void>;
}
```

### Service Pattern

The Display service uses the Effect.Service pattern:

```typescript
export const Display = Effect.Service<DisplayServiceInterface>()("Display", {
  accessors: true,
  effect: Effect.gen(function* () {
    const logger = yield* Logger;
    const loggerConfig = yield* logger.getConfig();
    const tuiAdapter: TUIAdapter = NoTUIAdapter;
    
    // Service implementation with TUI adapter integration
  }),
});
```

### Fallback Strategy

When TUI is not available, the service gracefully falls back to console output with:

- **Color Support**: Uses ANSI color codes for visual distinction
- **Icon Indicators**: Visual icons for different message types
- **Structured Output**: Consistent formatting across all message types

## TUI Integration

### ep-admin TUI Adapter

```typescript
export const EpAdminTUIAdapter: TUIAdapter = {
  load: () =>
    Effect.gen(function* () {
      const tuiService = yield* TUIService;
      const tuiModule = yield* tuiService.load();
      
      if (!tuiModule) {
        return null;
      }
      
      // Extract display methods from the TUI module
      return {
        displaySuccess: tuiModule.displaySuccess,
        displayError: tuiModule.displayError,
        // ... other methods
      };
    }),
};
```

### ep-cli TUI Adapter

```typescript
export const EpCliTUIAdapter: TUIAdapter = {
  load: () =>
    Effect.gen(function* () {
      const tuiLoader = yield* TUILoader;
      const tuiModule = yield* tuiLoader.load();
      
      if (!tuiModule) {
        return null;
      }
      
      // Extract display methods from the TUI module
      return {
        displaySuccess: tuiModule.displaySuccess,
        displayError: tuiModule.displayError,
        // ... other methods
      };
    }),
};
```

## Error Handling

The service provides structured error handling:

- **DisplayError**: Display-related errors
- **TUIError**: TUI integration errors

Both errors extend `Data.TaggedError` for proper error discrimination.

## Dependencies

- **Logger Service**: For color configuration and logging
- **TUI Service**: For TUI module loading (when available)
- **Effect**: Core Effect-TS library
- **Node.js**: For console output

## Color Support

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
  BRIGHT_BLACK: "\x1b[1;30m",
  BRIGHT_RED: "\x1b[1;31m",
  // ... more colors
};
```

## Testing

The service includes comprehensive error handling and can be safely used in test environments with different TUI adapter configurations.

## Examples

### Console Output (No TUI)

```
✅ Operation completed successfully
❌ Configuration error found
ℹ️ Processing request...
⚠️ Deprecated feature used
⚡ Important notice!
```

### TUI Output (When Available)

Rich terminal interfaces with interactive elements, panels, tables, and formatted displays.

## Performance Considerations

- **Lazy Loading**: TUI modules are only loaded when needed
- **Fallback Optimization**: Console fallbacks are lightweight and fast
- **Color Caching**: ANSI color codes are pre-computed
- **Buffer Management**: Efficient output handling for large displays

## Integration

This service is designed to be used by other services like Execution that need display functionality. The service provides a consistent display interface across all CLI tools while allowing tool-specific TUI implementations.
