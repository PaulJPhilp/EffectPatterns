# @effect-patterns/pipeline-state

State machine implementation for managing the Effect Patterns publishing pipeline workflow.

## Features

- **6-step workflow**: draft → ingested → tested → validated → published → finalized
- **Semi-automatic transitions**: User confirms before advancing to next step
- **Checkpointing**: Track operations within each step with full context
- **Failure recovery**: Retry failed steps with full history preservation
- **Persistence**: JSON-based state file (`.pipeline-state.json`)
- **Effect-native**: Built with Effect.Service pattern for composability

## Installation

```bash
npm install @effect-patterns/pipeline-state
```

## Quick Start

```typescript
import { PipelineStateMachine, StateStore, StateStoreLive, PipelineStateMachineLive } from "@effect-patterns/pipeline-state";
import { Effect, Layer } from "effect";

const program = Effect.gen(function* () {
  const stateMachine = yield* PipelineStateMachine;

  // Initialize a pattern
  const metadata = {
    id: "my-pattern",
    title: "My Pattern",
    rawPath: "content/new/raw/my-pattern.mdx",
    srcPath: "content/new/src/my-pattern.ts",
  };
  const state = yield* stateMachine.initializePattern("my-pattern", metadata);
  console.log(state); // Pattern is now in "draft" state

  // Start testing
  yield* stateMachine.startStep("my-pattern", "tested");
  console.log("Tests running...");

  // Complete testing
  yield* stateMachine.completeStep("my-pattern", "tested");
  console.log("Tests completed!");
});

const layers = Layer.merge(StateStoreLive, PipelineStateMachineLive);
Effect.runPromise(program.pipe(Effect.provide(layers)));
```

## State Machine Workflow

### States

```
draft (initial)
  ↓
ingested (pattern extracted and processed)
  ↓
tested (TypeScript examples validated)
  ↓
validated (MDX structure verified)
  ↓
published (code embedded in MDX)
  ↓
finalized (moved to content/published)
```

### Status Values

- `draft`: Initial state, pattern being created
- `in-progress`: Currently executing a step
- `ready`: Waiting for user confirmation to advance
- `blocked`: Cannot proceed (dependencies not met)
- `completed`: All steps finished successfully
- `failed`: Step execution failed, waiting for retry or fix

## API Reference

### PipelineStateMachine

#### `initializePattern(patternId, metadata)`

Initialize a new pattern in the state machine.

```typescript
const state = yield* stateMachine.initializePattern("my-pattern", {
  id: "my-pattern",
  title: "My Pattern",
  rawPath: "content/new/raw/my-pattern.mdx",
  srcPath: "content/new/src/my-pattern.ts",
});
```

#### `getPatternState(patternId)`

Get the current state of a pattern.

```typescript
const state = yield* stateMachine.getPatternState("my-pattern");
console.log(state.currentStep); // "tested"
console.log(state.status); // "in-progress"
```

#### `startStep(patternId, step)`

Mark a step as running.

```typescript
yield* stateMachine.startStep("my-pattern", "tested");
```

#### `completeStep(patternId, step)`

Mark a step as completed.

```typescript
yield* stateMachine.completeStep("my-pattern", "tested");
```

#### `failStep(patternId, step, error)`

Mark a step as failed with error message.

```typescript
yield* stateMachine.failStep(
  "my-pattern",
  "tested",
  "Type error in example.ts:5"
);
```

#### `retryStep(patternId, step)`

Retry a failed step (max 3 attempts per step).

```typescript
yield* stateMachine.retryStep("my-pattern", "tested");
```

#### `addCheckpoint(patternId, step, operation, data?)`

Add a checkpoint recording an operation within a step.

```typescript
yield* stateMachine.addCheckpoint(
  "my-pattern",
  "tested",
  "type-check-passed",
  { filesChecked: 5, errors: 0 }
);
```

#### `addErrorCheckpoint(patternId, step, operation, error)`

Add an error checkpoint.

```typescript
yield* stateMachine.addErrorCheckpoint(
  "my-pattern",
  "tested",
  "type-check-failed",
  new Error("Type error in example.ts")
);
```

#### `getAllPatterns()`

Get all patterns in state.

```typescript
const patterns = yield* stateMachine.getAllPatterns();
console.log(Object.keys(patterns)); // ["pattern-1", "pattern-2", ...]
```

#### `getPatternsByStatus(status)`

Get patterns filtered by status.

```typescript
const failed = yield* stateMachine.getPatternsByStatus("failed");
const completed = yield* stateMachine.getPatternsByStatus("completed");
```

#### `getPatternsNeedingAttention()`

Get patterns that failed or are blocked.

```typescript
const attention = yield* stateMachine.getPatternsNeedingAttention();
```

#### `getPatternsReadyForNextStep()`

Get patterns that completed their current step and are ready to advance.

```typescript
const ready = yield* stateMachine.getPatternsReadyForNextStep();
```

## State File Format

The state machine persists to `.pipeline-state.json`:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-13T10:30:00.000Z",
  "patterns": {
    "my-pattern": {
      "id": "my-pattern",
      "status": "in-progress",
      "currentStep": "tested",
      "steps": {
        "draft": {
          "status": "completed",
          "startedAt": "2025-12-13T10:00:00.000Z",
          "completedAt": "2025-12-13T10:01:00.000Z",
          "duration": 60,
          "attempts": 1,
          "checkpoints": []
        },
        "ingested": {
          "status": "completed",
          "startedAt": "2025-12-13T10:01:00.000Z",
          "completedAt": "2025-12-13T10:05:00.000Z",
          "duration": 240,
          "attempts": 1,
          "checkpoints": [
            {
              "operation": "extract-typescript",
              "timestamp": "2025-12-13T10:02:00.000Z",
              "data": { "filesExtracted": 1 }
            }
          ]
        },
        "tested": {
          "status": "running",
          "startedAt": "2025-12-13T10:05:00.000Z",
          "attempts": 1,
          "checkpoints": [
            {
              "operation": "typecheck-started",
              "timestamp": "2025-12-13T10:05:00.000Z"
            }
          ]
        },
        "validated": {
          "status": "pending",
          "attempts": 0,
          "checkpoints": []
        },
        "published": {
          "status": "pending",
          "attempts": 0,
          "checkpoints": []
        },
        "finalized": {
          "status": "pending",
          "attempts": 0,
          "checkpoints": []
        }
      },
      "metadata": {
        "title": "My Pattern",
        "id": "my-pattern",
        "rawPath": "content/new/raw/my-pattern.mdx",
        "srcPath": "content/new/src/my-pattern.ts",
        "summary": "Pattern description"
      },
      "errors": [],
      "createdAt": "2025-12-13T10:00:00.000Z",
      "updatedAt": "2025-12-13T10:05:00.000Z"
    }
  },
  "global": {
    "currentStep": "tested",
    "stepHistory": ["draft", "ingested", "tested"]
  }
}
```

## Error Handling

The package defines specific error types for different scenarios:

- `InvalidTransitionError`: Invalid state transition (e.g., skipping steps)
- `PatternNotFoundError`: Pattern doesn't exist
- `StateFileNotFoundError`: State file cannot be found
- `StateFilePersistenceError`: Error reading/writing state file
- `InvalidStateError`: Pattern state is corrupted
- `StepAlreadyCompletedError`: Step was already completed
- `CannotRetryError`: Cannot retry step (max attempts exceeded)

## Usage in Pipeline

### 1. Initialize Pattern

```typescript
yield* stateMachine.initializePattern("my-pattern", metadata);
```

### 2. Run Step

```typescript
yield* stateMachine.startStep("my-pattern", "tested");
try {
  // Run tests...
  yield* stateMachine.completeStep("my-pattern", "tested");
} catch (error) {
  yield* stateMachine.failStep("my-pattern", "tested", error.message);
}
```

### 3. Add Checkpoints

```typescript
yield* stateMachine.addCheckpoint("my-pattern", "tested", "type-check-passed", {
  filesChecked: 5,
});
```

### 4. Handle Retries

```typescript
// User retries failed step
yield* stateMachine.retryStep("my-pattern", "tested");
```

### 5. Advance to Next Step

```typescript
const nextStep = getNextStep(state.currentStep);
yield* stateMachine.transitionToStep("my-pattern", nextStep);
```

## Testing

```bash
npm test
```

## License

MIT
