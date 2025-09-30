# Debugging Patterns

## Handle Unexpected Errors by Inspecting the Cause

Use Cause to inspect, analyze, and handle all possible failure modes of an Effect, including expected errors, defects, and interruptions.

### Example

```typescript
import { Cause, Effect } from "effect";

// An Effect that may fail with an error or defect
const program = Effect.try({
  try: () => {
    throw new Error("Unexpected failure!");
  },
  catch: (err) => err,
});

// Catch all causes and inspect them
const handled = program.pipe(
  Effect.catchAllCause((cause) =>
    Effect.sync(() => {
      if (Cause.isDie(cause)) {
        console.error("Defect (die):", Cause.pretty(cause));
      } else if (Cause.isFailure(cause)) {
        console.error("Expected error:", Cause.pretty(cause));
      } else if (Cause.isInterrupted(cause)) {
        console.error("Interrupted:", Cause.pretty(cause));
      }
      // Handle or rethrow as needed
    })
  )
);

```

**Explanation:**  
- `Cause` distinguishes between expected errors (`fail`), defects (`die`), and interruptions.
- Use `Cause.pretty` for human-readable error traces.
- Enables advanced error handling and debugging.

---

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

## Leverage Effect's Built-in Structured Logging

Use Effect.log, Effect.logInfo, and Effect.logError to add structured, context-aware logging to your Effect code.

### Example

```typescript
import { Effect } from "effect";

// Log a simple message
const program = Effect.log("Starting the application");

// Log at different levels
const info = Effect.logInfo("User signed in");
const error = Effect.logError("Failed to connect to database");

// Log with dynamic values
const userId = 42;
const logUser = Effect.logInfo(`Processing user: ${userId}`);

// Use logging in a workflow
const workflow = Effect.gen(function* () {
  yield* Effect.log("Beginning workflow");
  // ... do some work
  yield* Effect.logInfo("Workflow step completed");
  // ... handle errors
  yield* Effect.logError("Something went wrong");
});
```

**Explanation:**  
- `Effect.log` logs a message at the default level.
- `Effect.logInfo` and `Effect.logError` log at specific levels.
- Logging is context-aware and can be used anywhere in your Effect workflows.

---

## Trace Operations Across Services with Spans

Use Effect.withSpan to create and annotate tracing spans for operations, enabling distributed tracing and performance analysis.

### Example

```typescript
import { Effect } from "effect";

// Trace a database query with a custom span
const fetchUser = Effect.sync(() => {
  // ...fetch user from database
  return { id: 1, name: "Alice" };
}).pipe(Effect.withSpan("db.fetchUser"));

// Trace an HTTP request with additional attributes
const fetchData = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then((res) => res.json()),
  catch: (err) => `Network error: ${String(err)}`,
}).pipe(
  Effect.withSpan("http.fetchData", {
    attributes: { url: "https://api.example.com/data" },
  })
);

// Use spans in a workflow
const program = Effect.gen(function* () {
  yield* Effect.log("Starting workflow").pipe(
    Effect.withSpan("workflow.start")
  );
  const user = yield* fetchUser;
  yield* Effect.log(`Fetched user: ${user.name}`).pipe(
    Effect.withSpan("workflow.end")
  );
});

```

**Explanation:**  
- `Effect.withSpan` creates a tracing span around an operation.
- Spans can be named and annotated with attributes for richer context.
- Tracing enables distributed observability and performance analysis.

---

