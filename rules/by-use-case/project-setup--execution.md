## Execute Synchronous Effects with Effect.runSync
**Rule:** Execute synchronous effects with Effect.runSync.

### Example
```typescript
import { Effect } from "effect";

const program = Effect.succeed(10).pipe(Effect.map((n) => n * 2));

const result = Effect.runSync(program); // result is 20
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

## Execute Asynchronous Effects with Effect.runPromise
**Rule:** Execute asynchronous effects with Effect.runPromise.

### Example
```typescript
import { Effect } from "effect";

const program = Effect.succeed("Hello, World!").pipe(
  Effect.delay("1 second"),
);

const promise = Effect.runPromise(program);

promise.then(console.log); // Logs "Hello, World!" after 1 second.
```

**Explanation:**  
`Effect.runPromise` executes your effect and returns a Promise, making it
easy to integrate with existing JavaScript async workflows.

## Execute Long-Running Apps with Effect.runFork
**Rule:** Use Effect.runFork to launch a long-running application as a manageable, detached fiber.

### Example
This example starts a simple "server" that runs forever. We use `runFork` to launch it and then use the returned `Fiber` to shut it down gracefully after 5 seconds.

```typescript
import { Effect, Fiber } from "effect";

// A server that listens for requests forever
const server = Effect.log("Server received a request.").pipe(
  Effect.delay("1 second"),
  Effect.forever,
);

console.log("Starting server...");

// Launch the server as a detached, top-level fiber
const appFiber = Effect.runFork(server);

// In a real app, you would listen for OS signals.
// Here, we simulate a shutdown signal after 5 seconds.
setTimeout(() => {
  console.log("Shutdown signal received. Interrupting server fiber...");
  // This ensures all cleanup logic within the server effect would run.
  Effect.runPromise(Fiber.interrupt(appFiber));
}, 5000);
```

---

## Create a Reusable Runtime from Layers
**Rule:** Create a reusable runtime from layers.

### Example
```typescript
import { Effect, Layer, Runtime } from "effect";

class GreeterService extends Effect.Tag("Greeter")<GreeterService, any> {}
const GreeterLive = Layer.succeed(GreeterService, {});

const runtime = Layer.toRuntime(GreeterLive);
const run = Runtime.runPromise(runtime);

// In a server, you would reuse `run` for every request.
run(Effect.log("Hello"));
```

**Explanation:**  
By compiling your layers into a Runtime once, you avoid rebuilding the
dependency graph for every effect execution.

## Set Up a New Effect Project
**Rule:** Set up a new Effect project.

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

## Create a Managed Runtime for Scoped Resources
**Rule:** Create a managed runtime for scoped resources.

### Example
```typescript
import { Effect, Layer } from "effect";

class DatabasePool extends Effect.Tag("DbPool")<DatabasePool, any> {}

const DatabaseLive = Layer.scoped(
  DatabasePool,
  Effect.acquireRelease(
    Effect.log("Acquiring pool"),
    () => Effect.log("Releasing pool"),
  ),
);

const launchedApp = Layer.launch(
  Effect.provide(Effect.log("Using DB"), DatabaseLive)
);

Effect.runPromise(launchedApp);
```

**Explanation:**  
`Layer.launch` ensures that resources are acquired and released safely, even
in the event of errors or interruptions.