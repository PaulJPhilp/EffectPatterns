# Execution Service

Execution service with TUI spinner support for the ep-admin CLI. Executes external scripts (child processes) with optional TUI spinner feedback, falling back to console output when TUI is not available.

## Features

- **Script execution**: Execute scripts with TUI spinner or console fallback
- **Output capture**: Capture script output for processing
- **Streaming output**: Stream script output in real-time
- **Spinner wrapper**: Wrap any Effect with spinner feedback
- **TUI integration**: Automatically uses effect-cli-tui spinner when available
- **Modern Effect.Service pattern**: Type-safe and composable

## Usage

```typescript
import { Execution } from "./services/execution/index.js";

// Execute script with TUI spinner
yield* Execution.executeScriptWithTUI(
  "scripts/publish/validate.ts",
  "Validating patterns",
  { verbose: false }
);

// Execute script and capture output
const output = yield* Execution.executeScriptCapture(
  "scripts/generate-report.ts"
);

// Execute script with streaming output
yield* Execution.executeScriptStream(
  "scripts/build.ts",
  { verbose: true }
);

// Wrap any Effect with spinner
const result = yield* Execution.withSpinner(
  "Processing data",
  processDataEffect
);
```

## API

### ExecutionService

- `executeScriptWithTUI(scriptPath, taskName, options?)`: Execute script with TUI spinner if available
- `executeScriptCapture(scriptPath, options?)`: Execute script and capture stdout output
- `executeScriptStream(scriptPath, options?)`: Execute script with streaming stdio output
- `withSpinner(message, effect, options?)`: Wrap any Effect with spinner feedback

## Options

```typescript
interface ExecutionOptions {
  verbose?: boolean;   // Show script output (default: false)
  timeout?: number;    // Execution timeout in milliseconds
}
```

## Error Handling

The service uses Effect tagged errors:

- `ExecutionError`: Thrown when script execution fails
- `ScriptExecutionError`: Thrown when script exits with non-zero code
- `TimeoutError`: Thrown when script execution times out

## Layers

- `Execution.Default`: Default execution layer
- `ExecutionLive`: Execution layer factory (for future customization)

## Dependencies

- Effect: Core functional programming library
- Node.js child_process: For executing scripts
- effect-cli-tui: Optional TUI module (loaded lazily if available)

## Testing

See `__tests__/` directory for unit tests covering:
- Execution method availability
- Spinner wrapper functionality
