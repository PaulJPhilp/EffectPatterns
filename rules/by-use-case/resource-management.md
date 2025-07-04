## Manage Resource Lifecycles with Scope
**Rule:** Use Scope for fine-grained, manual control over resource lifecycles and cleanup guarantees.

### Example
This example shows how to acquire a resource (like a file handle), use it, and have `Scope` guarantee its release.

```typescript
import { Effect, Scope } from "effect";

// Simulate acquiring and releasing a resource
const acquireFile = Effect.log("File opened").pipe(
  Effect.as({ write: (data: string) => Effect.log(`Wrote: ${data}`) }),
);
const releaseFile = Effect.log("File closed.");

// Create a "scoped" effect. This effect, when used, will acquire the
// resource and register its release action with the current scope.
const scopedFile = Effect.acquireRelease(acquireFile, () => releaseFile);

// The main program that uses the scoped resource
const program = Effect.gen(function* () {
  // Effect.scoped "uses" the resource. It runs the acquire effect,
  // provides the resource to the inner effect, and ensures the
  // release effect is run when this block completes.
  const file = yield* Effect.scoped(scopedFile);

  yield* file.write("hello");
  yield* file.write("world");

  // The file will be automatically closed here.
});

Effect.runPromise(program);
/*
Output:
File opened
Wrote: hello
Wrote: world
File closed
*/
```

---

## Implement Graceful Shutdown for Your Application
**Rule:** Use Effect.runFork and OS signal listeners to implement graceful shutdown for long-running applications.

### Example
This example creates a server with a "scoped" database connection. It uses `runFork` to start the server and sets up a `SIGINT` handler to interrupt the server fiber, which in turn guarantees the database finalizer is called.

```typescript
import { Effect, Layer, Fiber } from "effect";
import * as http from "http";

// 1. A service with a finalizer for cleanup
class Database extends Effect.Tag("Database")<Database, { query: () => Effect.Effect<string> }> {}
const DatabaseLive = Layer.scoped(
  Database,
  Effect.acquireRelease(
    Effect.log("Acquiring DB connection").pipe(Effect.as({ query: () => Effect.succeed("data") })),
    () => Effect.log("DB connection closed."),
  ),
);

// 2. The main server logic
const server = Effect.gen(function* () {
  const db = yield* Database;
  const server = http.createServer((_req, res) => {
    Effect.runFork(
      db.query().pipe(
        Effect.map((data) => res.end(data)),
      ),
    );
  });
  // Add a finalizer to the server itself
  yield* Effect.addFinalizer(() => Effect.sync(() => server.close()));
  server.listen(3000);
  yield* Effect.log("Server started on port 3000. Press Ctrl+C to exit.");
  // This will keep the effect running forever until interrupted
  yield* Effect.never;
});

// 3. Provide the layer and launch with runFork
const app = Effect.provide(server, DatabaseLive);
const appFiber = Effect.runFork(app);

// 4. Listen for Ctrl+C and interrupt the fiber
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT. Shutting down gracefully...");
  Effect.runFork(Fiber.interrupt(appFiber));
});
```

---

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