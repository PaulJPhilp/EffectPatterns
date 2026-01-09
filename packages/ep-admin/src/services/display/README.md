# Display Service

Adaptive display service for the ep-admin CLI that automatically detects if TUI services are available and uses them, falling back to console output when TUI is not available. This allows both ep (user CLI) and ep-admin (with TUI) to use the same API.

Integrates with the Logger service for consistent output formatting.

## Features

- **TUI integration**: Automatically uses effect-cli-tui when available
- **Console fallback**: Gracefully falls back to console output when TUI is unavailable
- **Logger integration**: Respects Logger service configuration for colors and formatting
- **Multiple display types**: Success, error, info, warning messages, panels, tables, highlights, and separators
- **Modern Effect.Service pattern**: Type-safe and composable

## Usage

```typescript
import { Display } from "./services/display/index.js";

// Basic message display
yield* Display.showSuccess("Operation completed successfully!");
yield* Display.showError("Something went wrong");
yield* Display.showInfo("Processing data...");
yield* Display.showWarning("This action cannot be undone");

// Advanced display
yield* Display.showPanel("Content here", "Title", { type: "info" });
yield* Display.showTable(data, {
  columns: [
    { key: "name", header: "Name" },
    { key: "value", header: "Value" },
  ],
});
yield* Display.showHighlight("Important information");
yield* Display.showSeparator();
```

## API

### DisplayService

- `showSuccess(message)`: Display success message
- `showError(message)`: Display error message
- `showInfo(message)`: Display info message
- `showWarning(message)`: Display warning message
- `showPanel(content, title, options?)`: Display content in a styled panel
- `showTable(data, options)`: Display data in a formatted table
- `showHighlight(message)`: Display highlighted/emphasized text
- `showSeparator()`: Display a separator line

## Configuration

The Display service automatically integrates with the Logger service to respect color and formatting configuration. Colors are automatically disabled when `Logger.config.useColors` is `false`.

## Layers

- `Display.Default`: Default display layer
- `DisplayLive`: Display layer factory (for future customization)

## Dependencies

- Effect: Core functional programming library
- Logger: For color and formatting configuration
- effect-cli-tui: Optional TUI module (loaded lazily if available)

## Testing

See `__tests__/` directory for unit tests covering:
- Display method execution
- TUI detection and fallback behavior
- Logger integration
