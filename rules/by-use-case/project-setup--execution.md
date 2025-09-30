# Project Setup & Execution Patterns

## Create a Managed Runtime for Scoped Resources

Create a managed runtime for scoped resources.

### Example

```typescript
import { Effect, Layer } from "effect";

class DatabasePool extends Effect.Service<DatabasePool>()(
  "DbPool",
  {
    effect: Effect.gen(function* () {
      yield* Effect.log("Acquiring pool");
      return {
        query: () => Effect.succeed("result")
      };
    })
  }
) {}

// Create a program that uses the DatabasePool service
const program = Effect.gen(function* () {
  const db = yield* DatabasePool;
  yield* Effect.log("Using DB");
  yield* db.query();
});

// Run the program with the service implementation
Effect.runPromise(
  program.pipe(
    Effect.provide(DatabasePool.Default),
    Effect.scoped
  )
);
```

**Explanation:**  
`Layer.launch` ensures that resources are acquired and released safely, even
in the event of errors or interruptions.

---

## Create a Reusable Runtime from Layers

Create a reusable runtime from layers.

### Example

```typescript
import { Effect, Layer, Runtime } from "effect";

class GreeterService extends Effect.Service<GreeterService>()(
  "Greeter",
  {
    sync: () => ({
      greet: (name: string) => Effect.sync(() => `Hello ${name}`)
    })
  }
) {}

const runtime = Effect.runSync(
  Layer.toRuntime(GreeterService.Default).pipe(
    Effect.scoped
  )
);

// In a server, you would reuse `run` for every request.
Runtime.runPromise(runtime)(Effect.log("Hello"));
```

**Explanation:**  
By compiling your layers into a Runtime once, you avoid rebuilding the
dependency graph for every effect execution.

---

## Execute Asynchronous Effects with Effect.runPromise

Execute asynchronous effects with Effect.runPromise.

### Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed("Hello, World!").pipe(
  Effect.delay("1 second"),
);

const promise = Effect.runPromise(program);

const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(result); // Logs "Hello, World!" after 1 second.
  return result;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
`Effect.runPromise` executes your effect and returns a Promise, making it
easy to integrate with existing JavaScript async workflows.

---

## Execute Long-Running Apps with Effect.runFork

Use Effect.runFork to launch a long-running application as a manageable, detached fiber.

### Example

This example starts a simple "server" that runs forever. We use `runFork` to launch it and then use the returned `Fiber` to shut it down gracefully after 5 seconds.

```typescript
import { Effect, Fiber } from "effect";

// A server that listens for requests forever
const server = Effect.log("Server received a request.").pipe(
  Effect.delay("1 second"),
  Effect.forever,
);

Effect.runSync(Effect.log("Starting server..."));

// Launch the server as a detached, top-level fiber
const appFiber = Effect.runFork(server);

// In a real app, you would listen for OS signals.
// Here, we simulate a shutdown signal after 5 seconds.
setTimeout(() => {
  const shutdownProgram = Effect.gen(function* () {
    yield* Effect.log("Shutdown signal received. Interrupting server fiber...");
    // This ensures all cleanup logic within the server effect would run.
    yield* Fiber.interrupt(appFiber);
  });
  Effect.runPromise(shutdownProgram);
}, 5000);
```

---

---

## Execute Synchronous Effects with Effect.runSync

Execute synchronous effects with Effect.runSync.

### Example

```typescript
import { Effect } from "effect"

// Simple synchronous program
const program1 = Effect.gen(function* () {
  const n = 10
  const result = n * 2
  yield* Effect.log(`Simple program result: ${result}`)
  return result
})

// Run simple program
Effect.runSync(program1)

// Program with logging
const program2 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting calculation...")
  const n = yield* Effect.sync(() => 10)
  yield* Effect.logInfo(`Got number: ${n}`)
  const result = yield* Effect.sync(() => n * 2)
  yield* Effect.logInfo(`Result: ${result}`)
  return result
})

// Run with logging
Effect.runSync(program2)

// Program with error handling
const program3 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting division...")
  const n = yield* Effect.sync(() => 10)
  const divisor = yield* Effect.sync(() => 0)
  
  yield* Effect.logInfo(`Attempting to divide ${n} by ${divisor}...`)
  return yield* Effect.try({
    try: () => {
      if (divisor === 0) throw new Error("Cannot divide by zero")
      return n / divisor
    },
    catch: (error) => {
      if (error instanceof Error) {
        return error
      }
      return new Error("Unknown error occurred")
    }
  })
}).pipe(
  Effect.catchAll((error) =>
    Effect.logInfo(`Error occurred: ${error.message}`)
  )
)

// Run with error handling
Effect.runSync(program3)
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

---

## Set Up a New Effect Project

Set up a new Effect project.

### Example

```typescript
// 1. Init project (e.g., `npm init -y`)
// 2. Install deps (e.g., `npm install effect`, `npm install -D typescript tsx`)
// 3. Create tsconfig.json with `"strict": true`
// 4. Create src/index.ts
import { Effect } from "effect";

const program = Effect.log("Hello, World!");

Effect.runSync(program);

// 5. Run the program (e.g., `npx tsx src/index.ts`)
```

**Explanation:**  
This setup ensures you have TypeScript and Effect ready to go, with strict
type-checking for maximum safety and correctness.

---

