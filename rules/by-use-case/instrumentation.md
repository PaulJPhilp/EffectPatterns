# Instrumentation Patterns

## Instrument and Observe Function Calls with Effect.fn

Use Effect.fn to wrap functions with effectful instrumentation, such as logging, metrics, or tracing, in a composable and type-safe way.

### Example

```typescript
import { Effect } from "effect";

// A simple function to instrument
function add(a: number, b: number): number {
  return a + b;
}

// Wrap the function with Effect.fn to add logging and tracking
const addWithLogging = (a: number, b: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Calling add with ${a} and ${b}`);
    const result = add(a, b);
    yield* Effect.logInfo(`Result: ${result}`);
    return result;
  });

// Use the instrumented function in an Effect workflow
const program = addWithLogging(2, 3).pipe(
  Effect.tap((sum) => Effect.logInfo(`Sum is ${sum}`))
);

// Run the program (commented to avoid runtime issues)
// Effect.runPromise(program);

```

**Explanation:**  
- `Effect.fn` wraps a function, returning a new function that produces an Effect.
- You can add logging, metrics, tracing, or any effectful logic before/after the call.
- Keeps instrumentation separate from business logic and fully composable.

---

