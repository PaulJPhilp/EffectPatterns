# Execution Service

The Execution service provides script execution capabilities with TUI spinner support and comprehensive error handling for CLI applications.

## Overview

This service offers robust script execution with support for different execution modes, timeout handling, and rich progress feedback when TUI is available.

## Features

- **Script Execution**: Execute scripts with proper error handling
- **TUI Integration**: Rich spinner progress indicators when TUI is available
- **Multiple Modes**: Capture output, stream output, or execute with TUI spinner
- **Timeout Protection**: Configurable timeout handling for long-running scripts
- **Error Capture**: Comprehensive error reporting with script output
- **Progress Feedback**: Visual progress indicators and completion status
- **Effect Integration**: Full Effect-TS service pattern support

## API

### Main Methods

- `executeScriptWithTUI(scriptPath, taskName, options?)` - Execute script with TUI spinner
- `executeScriptCapture(scriptPath, options?)` - Execute script and capture output
- `executeScriptStream(scriptPath, options?)` - Execute script with streaming stdio
- `withSpinner(message, effect, options?)` - Wrap any Effect with a console spinner

### Execution Options

```typescript
interface ExecutionOptions {
  readonly verbose?: boolean;
  readonly timeout?: number;
}
```

## Usage

### Basic Script Execution

```typescript
import { Execution } from "@effect-patterns/ep-shared-services/execution";

// Execute with TUI spinner
yield* Execution.executeScriptWithTUI(
  "./scripts/build.sh",
  "Building project...",
  { verbose: false }
);

// Capture script output
const output = yield* Execution.executeScriptCapture(
  "./scripts/deploy.sh",
  { timeout: 30000 }
);

// Stream output to console
yield* Execution.executeScriptStream(
  "./scripts/serve.sh",
  { verbose: true }
);
```

### Progress Feedback

```typescript
// Wrap any Effect with spinner
const result = yield* Execution.withSpinner(
  "Processing data...",
  Effect.succeed("Processing complete"),
  { verbose: false }
);
```

## Implementation Details

### Service Pattern

The Execution service uses the Effect.Service pattern:

```typescript
export const Execution = Effect.Service<ExecutionServiceInterface>()("Execution", {
  accessors: true,
  effect: Effect.gen(function* () {
    const logger = yield* Logger;
    const loggerConfig = yield* logger.getConfig();
    const tuiAdapter: ExecutionTUIAdapter = NoExecutionTUIAdapter;
    
    // Service implementation with TUI adapter integration
  }),
});
```

### TUI Integration

The service uses a TUI adapter pattern to handle differences between CLI tools:

```typescript
export interface ExecutionTUIAdapter {
  load: () => Effect.Effect<ExecutionTUISpinnerMethods | null>;
}

export interface ExecutionTUISpinnerMethods {
  spinnerEffect?: <A, E>(
    message: string,
    effect: Effect.Effect<A, E>,
    options?: { type?: string; color?: string }
  ) => Effect.Effect<A, E>;
  InkService?: any;
}
```

### Script Execution

The service uses Node.js `child_process.spawn` for script execution:

```typescript
const child = spawn("bun", ["run", scriptPath], {
  stdio: options?.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
  shell: true,
  timeout: options?.timeout,
});
```

### Error Handling

The service provides comprehensive error handling:

- **ExecutionError**: Script execution failures
- **ScriptExecutionError**: Script output capture failures
- **TimeoutError**: Script timeout failures

All errors extend `Data.TaggedError` for proper error discrimination.

## Dependencies

- **Logger Service**: For progress feedback and logging
- **TUI Service**: For spinner integration (when available)
- **Node.js**: For child process spawning
- **Effect**: Core Effect-TS library

## Error Handling

### ExecutionError

```typescript
export class ExecutionError extends Data.TaggedError("ExecutionError")<{
  readonly message: string;
  readonly scriptOutput?: string;
  readonly cause?: unknown;
}> {
  static readonly make = (
    message: string,
    scriptOutput?: string,
    cause?: unknown
  ) => new ExecutionError({ message, scriptOutput, cause });
}
```

### ScriptExecutionError

```typescript
export class ScriptExecutionError extends Data.TaggedError("ScriptExecutionError")<{
  readonly message: string;
  readonly exitCode: number;
  readonly stderr?: string;
}> {
  static readonly make = (
    message: string,
    exitCode: number,
    stderr?: string
  ) => new ScriptExecutionError({ message, exitCode, stderr });
}
```

## Performance Considerations

- **Process Management**: Proper child process cleanup and resource management
- **Output Buffering**: Efficient output handling for large script outputs
- **Timeout Handling**: Configurable timeouts prevent hanging scripts
- **Caching**: TUI module caching for performance
- **Error Aggregation**: Enhanced error messages with script output context

## Integration

This service is designed to be used by CLI commands that need to execute external scripts, build processes, or run automation tasks.

## Examples

### Build Process

```typescript
yield* Execution.executeScriptWithTUI(
  "./scripts/build.sh",
  "Building application...",
  { verbose: false }
);
```

### Deployment Process

```typescript
yield* Execution.executeScriptWithTUI(
  "./scripts/deploy.sh",
  "Deploying to production...",
  { timeout: 60000 }
);
```

### Data Processing

```typescript
const result = yield* Execution.executeScriptCapture(
  "./scripts/process-data.sh",
  { timeout: 30000 }
);
console.log("Processing result:", result);
```

## Testing

The service includes comprehensive error handling and can be safely used in test environments with different TUI adapter configurations.

## Troubleshooting

### Common Issues

1. **Script Not Found**: Ensure script paths are correct relative to the working directory
2. **Permission Denied**: Check file permissions and script execution rights
3. **Timeout Issues**: Increase timeout values for long-running scripts
4. **TUI Not Available**: The service will gracefully fallback to console output

### Debug Mode

Enable verbose mode to see detailed execution information:

```typescript
yield* Execution.executeScriptWithTUI(
  "./scripts/debug.sh",
  "Debugging...",
  { verbose: true }
);
```

## Security Considerations

- **Script Validation**: Only execute scripts from trusted sources
- **Path Traversal**: Prevent directory traversal attacks
- **Command Injection**: Avoid executing untrusted user input directly
- **Resource Limits**: Respect system resource constraints
