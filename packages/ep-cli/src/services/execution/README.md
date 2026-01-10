# Execution Service

Service for executing scripts and processes with TUI spinner support and output capture.

## Features

- **TUI Integration**: Seamlessly uses TUI spinners when available.
- **Output Capture**: Execute scripts and capture their standard output.
- **Streaming**: Stream script output directly to the console.
- **Spinner Wrapper**: Utility to wrap any Effect with a progress spinner.

## Usage

```typescript
import { Execution } from "./services/execution/index.js";

const program = Effect.gen(function*() {
  const execution = yield* Execution;
  yield* execution.executeScriptWithTUI("script.js", "Running Task");
});
```
