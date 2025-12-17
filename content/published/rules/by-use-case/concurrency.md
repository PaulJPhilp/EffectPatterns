# Concurrency Patterns

## Manage Shared State Safely with Ref

Use Ref to safely manage shared, mutable state in concurrent and effectful programs.

### Example

```typescript
import { Effect, Ref } from "effect";

// Create a Ref with an initial value
const makeCounter = Ref.make(0);

// Increment the counter atomically
const increment = makeCounter.pipe(
  Effect.flatMap((counter) => Ref.update(counter, (n) => n + 1))
);

// Read the current value
const getValue = makeCounter.pipe(
  Effect.flatMap((counter) => Ref.get(counter))
);

// Use Ref in a workflow
const program = Effect.gen(function* () {
  const counter = yield* Ref.make(0);
  yield* Ref.update(counter, (n) => n + 1);
  const value = yield* Ref.get(counter);
  yield* Effect.log(`Counter value: ${value}`);
});
```

**Explanation:**

- `Ref` is an atomic, mutable reference for effectful and concurrent code.
- All operations are safe, composable, and free of race conditions.
- Use `Ref` for counters, caches, or any shared mutable state.

---

## Modeling Effect Results with Exit

Use Exit to capture the outcome of an Effect, including success, failure, and defects, for robust error handling and coordination.

### Example

```typescript
import { Effect, Exit } from "effect";

// Run an Effect and capture its Exit value
const program = Effect.succeed(42);

const runAndCapture = Effect.runPromiseExit(program); // Promise<Exit<never, number>>

// Pattern match on Exit
runAndCapture.then((exit) => {
  if (Exit.isSuccess(exit)) {
    console.log("Success:", exit.value);
  } else if (Exit.isFailure(exit)) {
    console.error("Failure:", exit.cause);
  }
});
```

**Explanation:**

- `Exit` captures both success (`Exit.success(value)`) and failure (`Exit.failure(cause)`).
- Use `Exit` for robust error handling, supervision, and coordination of concurrent effects.
- Pattern matching on `Exit` lets you handle all possible outcomes.

---

