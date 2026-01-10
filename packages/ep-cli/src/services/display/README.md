# Display Service

Service for handling CLI output, with support for TUI integration and console fallbacks.

## Features

- **TUI Support**: Automatically uses TUI components if available.
- **Console Fallback**: Gracefully falls back to colorized console output.
- **Standardized UI**: Success, error, info, warning, and highlight methods.
- **Rich Elements**: Support for panels, tables, and separators.

## Usage

```typescript
import { Display } from "./services/display/index.js";

const program = Effect.gen(function*() {
  const display = yield* Display;
  yield* display.showSuccess("Operation completed");
});
```
