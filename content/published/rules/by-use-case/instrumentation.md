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

// Use Effect.fn to instrument the function with observability
const addWithLogging = Effect.fn("add")(add).pipe(
  Effect.withSpan("add", { attributes: { "fn.name": "add" } })
);

// Use the instrumented function in an Effect workflow
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Calling add function");
  const sum = yield* addWithLogging(2, 3);
  yield* Effect.logInfo(`Sum is ${sum}`);
  return sum;
});

// Run the program
Effect.runPromise(program);
```

**Explanation:**

- `Effect.fn("name")(fn)` wraps a function with instrumentation capabilities, enabling observability.
- You can add tracing spans, logging, metrics, and other observability logic to function boundaries.
- Keeps instrumentation separate from business logic and fully composable.
- The wrapped function integrates seamlessly with Effect's observability and tracing infrastructure.

---

