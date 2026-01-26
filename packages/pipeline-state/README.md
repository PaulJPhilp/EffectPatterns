# @effect-patterns/pipeline-state

> State machine implementation for managing the Effect Patterns publishing pipeline workflow

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.19+-purple.svg)](https://effect.website/)

A pure Effect library providing a state machine for managing the Effect Patterns publishing pipeline workflow. Built with modern Effect.Service patterns for type-safe dependency injection and composability.

## Features

- **6-step workflow**: draft → ingested → tested → validated → published → finalized
- **Semi-automatic transitions**: User confirms before advancing to next step
- **Checkpointing**: Track operations within each step with full context
- **Failure recovery**: Retry failed steps with full history preservation
- **Persistence**: JSON-based state file (`.pipeline-state.json`)
- **Effect-native**: Built with Effect.Service pattern for composability
- **Type-safe**: Full TypeScript support with @effect/schema validation
- **Error handling**: Comprehensive error types for different failure scenarios

## Installation

```bash
# npm
npm install @effect-patterns/pipeline-state effect @effect/platform

# bun
bun add @effect-patterns/pipeline-state effect @effect/platform

# pnpm
pnpm add @effect-patterns/pipeline-state effect @effect/platform
```

## Quick Start

```typescript
import { PipelineStateMachine, StateStore } from "@effect-patterns/pipeline-state";
import { Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";

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

// Run with NodeContext for file system access
Effect.runPromise(
  program.pipe(
    Effect.provide(StateStore.Default),
    Effect.provide(PipelineStateMachine.Default),
    Effect.provide(NodeContext.layer)
  )
);
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
- `pending`: Step has not started yet
- `running`: Currently executing a step
- `completed`: Step finished successfully
- `failed`: Step execution failed, waiting for retry or fix
- `blocked`: Cannot proceed (dependencies not met)

## API Reference

### Services

The package provides two main services using the Effect.Service pattern:

#### `PipelineStateMachine`

Main service for managing pattern workflow state transitions.

#### `StateStore`

Service for persisting and loading state from the filesystem.

### PipelineStateMachine API

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

**Returns**: `Effect<PatternState, StateError>`

#### `getPatternState(patternId)`

Get the current state of a pattern.

```typescript
const state = yield* stateMachine.getPatternState("my-pattern");
console.log(state.currentStep); // "tested"
console.log(state.status); // "completed"
```

**Returns**: `Effect<PatternState, PatternNotFoundError>`

#### `canTransition(patternId, toStep)`

Check if a pattern can transition to a specific step.

```typescript
const canTransition = yield* stateMachine.canTransition("my-pattern", "validated");
if (canTransition) {
  // Proceed with transition
}
```

**Returns**: `Effect<boolean, PatternNotFoundError | InvalidTransitionError>`

#### `transitionToStep(patternId, toStep)`

Transition a pattern to a specific step.

```typescript
yield* stateMachine.transitionToStep("my-pattern", "validated");
```

**Returns**: `Effect<void, PatternNotFoundError | InvalidTransitionError>`

#### `startStep(patternId, step)`

Mark a step as running.

```typescript
yield* stateMachine.startStep("my-pattern", "tested");
```

**Returns**: `Effect<void, PatternNotFoundError | InvalidTransitionError>`

#### `completeStep(patternId, step)`

Mark a step as completed.

```typescript
yield* stateMachine.completeStep("my-pattern", "tested");
```

**Returns**: `Effect<void, PatternNotFoundError | StepAlreadyCompletedError>`

#### `failStep(patternId, step, error)`

Mark a step as failed with error message.

```typescript
yield* stateMachine.failStep(
  "my-pattern",
  "tested",
  "Type error in example.ts:5"
);
```

**Returns**: `Effect<void, PatternNotFoundError>`

#### `retryStep(patternId, step)`

Retry a failed step (max 3 attempts per step).

```typescript
yield* stateMachine.retryStep("my-pattern", "tested");
```

**Returns**: `Effect<void, PatternNotFoundError | CannotRetryError>`

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

**Returns**: `Effect<void, PatternNotFoundError>`

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

**Returns**: `Effect<void, PatternNotFoundError>`

### StateStore API

The StateStore service handles persistence of the pipeline state.

#### `loadState()`

Load the complete pipeline state from file.

```typescript
const state = yield* StateStore.loadState();
```

**Returns**: `Effect<PipelineStateFile, StateFilePersistenceError>`

#### `saveState(state)`

Save the pipeline state to file.

```typescript
yield* StateStore.saveState(pipelineState);
```

**Returns**: `Effect<void, StateFilePersistenceError>`

### Validators

Utility functions for validating state transitions and conditions.

```typescript
import {
  canRetryStep,
  getNextStep,
  isFinalStep,
  isReadyForNextStep,
  validatePatternState,
  validateTransition,
} from "@effect-patterns/pipeline-state";

// Check if step can be retried
const canRetry = canRetryStep(stepState);

// Get next step in workflow
const nextStep = getNextStep(currentStep);

// Check if this is the final step
const isFinal = isFinalStep(currentStep);

// Check if pattern is ready for next step
const isReady = isReadyForNextStep(patternState);

// Validate pattern state
const validation = validatePatternState(patternState);

// Validate state transition
const isValidTransition = validateTransition(currentStep, nextStep);
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
      "status": "running",
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

## Schemas and Types

The package provides comprehensive TypeScript types and @effect/schema validations:

```typescript
import {
  // Core types
  type PatternState,
  type PatternMetadata,
  type PipelineStateFile,
  type StepState,
  type StepCheckpoint,
  type WorkflowStep,
  type WorkflowStatus,
  
  // Schema validators
  PatternStateSchema,
  PatternMetadataSchema,
  PipelineStateFileSchema,
  StepStateSchema,
  StepCheckpointSchema,
  
  // Helper functions
  createInitialPatternState,
  createInitialPipelineState,
  createInitialStepState,
  
  // Constants
  WORKFLOW_STEPS,
} from "@effect-patterns/pipeline-state";

// Validate data with schemas
const validatedState = yield* Schema.decodeUnknown(PatternStateSchema)(rawData);
```

## Error Handling

The package defines specific error types for different scenarios:

```typescript
import {
  CannotRetryError,
  InvalidStateError,
  InvalidTransitionError,
  PatternNotFoundError,
  StateFileNotFoundError,
  StateFilePersistenceError,
  StepAlreadyCompletedError,
  type StateError,
} from "@effect-patterns/pipeline-state";
```

### Error Types

- `InvalidTransitionError`: Invalid state transition (e.g., skipping steps)
- `PatternNotFoundError`: Pattern doesn't exist
- `StateFileNotFoundError`: State file cannot be found
- `StateFilePersistenceError`: Error reading/writing state file
- `InvalidStateError`: Pattern state is corrupted
- `StepAlreadyCompletedError`: Step was already completed
- `CannotRetryError`: Cannot retry step (max attempts exceeded)

### Error Handling Pattern

```typescript
const program = Effect.gen(function* () {
  return yield* stateMachine.completeStep("my-pattern", "tested");
}).pipe(
  Effect.catchTag("PatternNotFoundError", (error) =>
    Effect.log(`Pattern not found: ${error.message}`)
  ),
  Effect.catchTag("StepAlreadyCompletedError", (error) =>
    Effect.log(`Step already completed: ${error.message}`)
  ),
  Effect.catchAll((error) =>
    Effect.log(`Unexpected error: ${error.message}`)
  )
);

## Usage Examples

### Basic Pattern Workflow

```typescript
import { PipelineStateMachine, StateStore } from "@effect-patterns/pipeline-state";
import { Effect } from "effect";
import { NodeContext } from "@effect/platform-node";

const processPattern = (patternId: string, metadata: PatternMetadata) =>
  Effect.gen(function* () {
    const stateMachine = yield* PipelineStateMachine;
    
    // Initialize pattern
    yield* stateMachine.initializePattern(patternId, metadata);
    
    // Process each step
    for (const step of WORKFLOW_STEPS) {
      yield* stateMachine.startStep(patternId, step);
      
      try {
        // Simulate step processing
        yield* Effect.sleep(1000);
        
        // Add checkpoint
        yield* stateMachine.addCheckpoint(
          patternId,
          step,
          "step-completed",
          { timestamp: Date.now() }
        );
        
        yield* stateMachine.completeStep(patternId, step);
      } catch (error) {
        yield* stateMachine.failStep(patternId, step, error.message);
        throw error;
      }
    }
  });
```

### Error Recovery and Retries

```typescript
const retryFailedStep = (patternId: string, step: WorkflowStep) =>
  Effect.gen(function* () {
    const stateMachine = yield* PipelineStateMachine;
    
    // Check if retry is possible
    const state = yield* stateMachine.getPatternState(patternId);
    const stepState = state.steps[step];
    
    if (!canRetryStep(stepState)) {
      return yield* Effect.fail(
        new CannotRetryError(`Cannot retry ${step}: max attempts exceeded`)
      );
    }
    
    // Retry the step
    yield* stateMachine.retryStep(patternId, step);
    yield* stateMachine.startStep(patternId, step);
    
    // Process step again...
    yield* stateMachine.completeStep(patternId, step);
  });
```

### State Monitoring

```typescript
const monitorPipeline = () =>
  Effect.gen(function* () {
    const stateMachine = yield* PipelineStateMachine;
    
    // Get patterns needing attention
    const state = yield* StateStore.loadState();
    const failedPatterns = Object.entries(state.patterns)
      .filter(([_, pattern]) => 
        Object.values(pattern.steps).some(step => step.status === "failed")
      )
      .map(([id, pattern]) => ({ id, pattern }));
    
    if (failedPatterns.length > 0) {
      console.log(`Found ${failedPatterns.length} patterns needing attention:`);
      for (const { id, pattern } of failedPatterns) {
        console.log(`- ${id}: ${pattern.metadata.title}`);
      }
    }
  });
```

## Testing

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Testing with Services

```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { PipelineStateMachine, StateStore } from "@effect-patterns/pipeline-state";
import { NodeContext } from "@effect/platform-node";

describe("PipelineStateMachine", () => {
  it("should initialize pattern", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const stateMachine = yield* PipelineStateMachine;
        const state = yield* stateMachine.initializePattern("test-pattern", {
          id: "test-pattern",
          title: "Test Pattern",
          rawPath: "test.mdx",
          srcPath: "test.ts",
        });
        return state;
      }).pipe(
        Effect.provide(StateStore.Default),
        Effect.provide(PipelineStateMachine.Default),
        Effect.provide(NodeContext.layer)
      )
    );
    
    expect(result.id).toBe("test-pattern");
    expect(result.currentStep).toBe("draft");
  });
});
```

## Architecture

The package follows Effect best practices:

- **Effect.Service Pattern**: Modern service definition with dependency injection
- **Type Safety**: Full TypeScript support with @effect/schema validation
- **Pure Functions**: All business logic is pure and testable
- **Error Handling**: Explicit error types in Effect channels
- **Persistence**: File-based state storage using @effect/platform FileSystem
- **Composability**: Services can be easily combined and tested

## Dependencies

- **effect**: Core Effect library
- **@effect/platform**: Platform services (FileSystem)
- **@effect/schema**: Runtime validation and type safety

## License

MIT © Effect Patterns Team

---

**Part of the [Effect Patterns Hub](https://github.com/PaulJPhilp/Effect-Patterns)**
