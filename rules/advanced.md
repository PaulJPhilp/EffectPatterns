# Advanced Level Rules

## Add Caching by Wrapping a Layer
**Rule:** Use a wrapping Layer to add cross-cutting concerns like caching to a service without altering its original implementation.

### Example
We have a `WeatherService` that makes slow API calls. We create a `WeatherService.cached` wrapper layer that adds an in-memory cache using a `Ref` and a `Map`.

```typescript
import { Effect, Layer, Ref } from "effect";

// 1. Define the service interface
class WeatherService extends Effect.Service<WeatherService>()(
  "WeatherService",
  {
    sync: () => ({
      getForecast: (city: string) => Effect.succeed(`Sunny in ${city}`),
    }),
  }
) {}

// 2. The "Live" implementation that is slow
const WeatherServiceLive = Layer.succeed(
  WeatherService,
  WeatherService.of({
    _tag: "WeatherService",
    getForecast: (city) =>
      Effect.succeed(`Sunny in ${city}`).pipe(
        Effect.delay("2 seconds"),
        Effect.tap(() => Effect.log(`Fetched live forecast for ${city}`))
      ),
  })
);

// 3. The Caching Wrapper Layer
const WeatherServiceCached = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    // It REQUIRES the original WeatherService
    const underlyingService = yield* WeatherService;
    const cache = yield* Ref.make(new Map<string, string>());

    return WeatherService.of({
      _tag: "WeatherService",
      getForecast: (city) =>
        Ref.get(cache).pipe(
          Effect.flatMap((map) =>
            map.has(city)
              ? Effect.log(`Cache HIT for ${city}`).pipe(
                  Effect.as(map.get(city)!)
                )
              : Effect.log(`Cache MISS for ${city}`).pipe(
                  Effect.flatMap(() => underlyingService.getForecast(city)),
                  Effect.tap((forecast) =>
                    Ref.update(cache, (map) => map.set(city, forecast))
                  )
                )
          )
        ),
    });
  })
);

// 4. Compose the final layer. The wrapper is provided with the live implementation.
const AppLayer = Layer.provide(WeatherServiceCached, WeatherServiceLive);

// 5. The application logic
const program = Effect.gen(function* () {
  const weather = yield* WeatherService;
  yield* weather.getForecast("London"); // First call is slow (MISS)
  yield* weather.getForecast("London"); // Second call is instant (HIT)
});

Effect.runPromise(Effect.provide(program, AppLayer));

```

---

## Build a Basic HTTP Server
**Rule:** Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

### Example
This example creates a simple server with a `Greeter` service. The server starts, creates a runtime containing the `Greeter`, and then uses that runtime to handle requests.

```typescript
import { HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Duration, Effect, Fiber, Layer } from "effect"
import { createServer } from "node:http"

// Create a server layer using Node's built-in HTTP server
const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3001 })

// Define your HTTP app (here responding "Hello World" to every request)
const app = Effect.gen(function* () {
  yield* Effect.logInfo("Received HTTP request")
  return yield* HttpServerResponse.text("Hello World")
})

const serverLayer = HttpServer.serve(app).pipe(Layer.provide(ServerLive));

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Server starting on http://localhost:3001")
  const fiber = yield* Layer.launch(serverLayer).pipe(Effect.fork)
  yield* Effect.sleep(Duration.seconds(2))
  yield* Fiber.interrupt(fiber)
  yield* Effect.logInfo("Server shutdown complete")
})

Effect.runPromise(program as unknown as Effect.Effect<void, unknown, never>);
```

---

## Create a Managed Runtime for Scoped Resources
**Rule:** Create a managed runtime for scoped resources.

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

## Create a Reusable Runtime from Layers
**Rule:** Create a reusable runtime from layers.

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

## Decouple Fibers with Queues and PubSub
**Rule:** Use Queue for point-to-point work distribution and PubSub for broadcast messaging between fibers.

### Example
A producer fiber adds jobs to a `Queue`, and a worker fiber takes jobs off the queue to process them.

```typescript
import { Effect, Queue, Fiber } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting queue demo...");

  // Create a bounded queue that can hold a maximum of 10 items.
  // This prevents memory issues by applying backpressure when the queue is full.
  // If a producer tries to add to a full queue, it will suspend until space is available.
  const queue = yield* Queue.bounded<string>(10);
  yield* Effect.logInfo("Created bounded queue");

  // Producer Fiber: Add a job to the queue every second.
  // This fiber runs independently and continuously produces work items.
  // The producer-consumer pattern decouples work generation from work processing.
  const producer = yield* Effect.gen(function* () {
    let i = 0;
    while (true) {
      const job = `job-${i++}`;
      yield* Effect.logInfo(`Producing ${job}...`);

      // Queue.offer adds an item to the queue. If the queue is full,
      // this operation will suspend the fiber until space becomes available.
      // This provides natural backpressure control.
      yield* Queue.offer(queue, job);

      // Sleep for 500ms between job creation. This controls the production rate.
      // Producer is faster than consumer (500ms vs 1000ms) to demonstrate queue buffering.
      yield* Effect.sleep("500 millis");
    }
  }).pipe(Effect.fork); // Fork creates a new fiber that runs concurrently

  yield* Effect.logInfo("Started producer fiber");

  // Worker Fiber: Take a job from the queue and process it.
  // This fiber runs independently and processes work items as they become available.
  // Multiple workers could be created to scale processing capacity.
  const worker = yield* Effect.gen(function* () {
    while (true) {
      // Queue.take removes and returns an item from the queue.
      // If the queue is empty, this operation will suspend the fiber
      // until an item becomes available. This prevents busy-waiting.
      const job = yield* Queue.take(queue);
      yield* Effect.logInfo(`Processing ${job}...`);

      // Simulate work by sleeping for 1 second.
      // This makes the worker slower than the producer, causing queue buildup.
      yield* Effect.sleep("1 second");
      yield* Effect.logInfo(`Completed ${job}`);
    }
  }).pipe(Effect.fork); // Fork creates another independent fiber

  yield* Effect.logInfo("Started worker fiber");

  // Let them run for a while...
  // The main fiber sleeps while the producer and worker fibers run concurrently.
  // During this time, you'll see the queue acting as a buffer between
  // the fast producer and slow worker.
  yield* Effect.logInfo("Running for 10 seconds...");
  yield* Effect.sleep("10 seconds");
  yield* Effect.logInfo("Done!");

  // Interrupt both fibers to clean up resources.
  // Fiber.interrupt sends an interruption signal to the fiber,
  // allowing it to perform cleanup operations before terminating.
  // This is safer than forcefully killing fibers.
  yield* Fiber.interrupt(producer);
  yield* Fiber.interrupt(worker);

  // Note: In a real application, you might want to:
  // 1. Drain the queue before interrupting workers
  // 2. Use Fiber.join to wait for graceful shutdown
  // 3. Handle interruption signals in the fiber loops
});

// Run the program
// This demonstrates the producer-consumer pattern with Effect fibers:
// - Fibers are lightweight threads that can be created in large numbers
// - Queues provide safe communication between fibers
// - Backpressure prevents resource exhaustion
// - Interruption allows for graceful shutdown
Effect.runPromise(program);

```


A publisher sends an event, and multiple subscribers react to it independently.

```typescript
import { Effect, PubSub } from "effect";

const program = Effect.gen(function* () {
  const pubsub = yield* PubSub.bounded<string>(10);

  // Subscriber 1: The "Audit" service
  const auditSub = PubSub.subscribe(pubsub).pipe(
    Effect.flatMap((subscription) =>
      Effect.gen(function* () {
        while (true) {
          const event = yield* Queue.take(subscription);
          yield* Effect.log(`AUDIT: Received event: ${event}`);
        }
      }),
    ),
    Effect.fork,
  );

  // Subscriber 2: The "Notifier" service
  const notifierSub = PubSub.subscribe(pubsub).pipe(
    Effect.flatMap((subscription) =>
      Effect.gen(function* () {
        while (true) {
          const event = yield* Queue.take(subscription);
          yield* Effect.log(`NOTIFIER: Sending notification for: ${event}`);
        }
      }),
    ),
    Effect.fork,
  );

  // Give subscribers time to start
  yield* Effect.sleep("1 second");

  // Publisher: Publish an event that both subscribers will receive.
  yield* PubSub.publish(pubsub, "user_logged_in");
});
```

---

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

## Handle Unexpected Errors by Inspecting the Cause
**Rule:** Handle unexpected errors by inspecting the cause.

### Example
```typescript
import { Cause, Effect, Data, Schedule, Duration } from "effect";

// Define domain types
interface DatabaseConfig {
  readonly url: string;
}

interface DatabaseConnection {
  readonly success: true;
}

interface UserData {
  readonly id: string;
  readonly name: string;
}

// Define error types
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly operation: string;
  readonly details: string;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Define database service
class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    sync: () => ({
      // Connect to database with proper error handling
      connect: (config: DatabaseConfig): Effect.Effect<DatabaseConnection, DatabaseError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Connecting to database: ${config.url}`);
          
          if (!config.url) {
            const error = new DatabaseError({
              operation: "connect",
              details: "Missing URL"
            });
            yield* Effect.logError(`Database error: ${JSON.stringify(error)}`);
            return yield* Effect.fail(error);
          }
          
          // Simulate unexpected errors
          if (config.url === "invalid") {
            yield* Effect.logError("Invalid connection string");
            return yield* Effect.sync(() => {
              throw new Error("Failed to parse connection string");
            });
          }
          
          if (config.url === "timeout") {
            yield* Effect.logError("Connection timeout");
            return yield* Effect.sync(() => {
              throw new Error("Connection timed out");
            });
          }
          
          yield* Effect.logInfo("Database connection successful");
          return { success: true };
        })
    })
  }
) {}

// Define user service
class UserService extends Effect.Service<UserService>()(
  "UserService",
  {
    sync: () => ({
      // Parse user data with validation
      parseUser: (input: unknown): Effect.Effect<UserData, ValidationError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Parsing user data: ${JSON.stringify(input)}`);
          
          try {
            if (typeof input !== "object" || !input) {
              const error = new ValidationError({
                field: "input",
                message: "Invalid input type"
              });
              yield* Effect.logWarning(`Validation error: ${JSON.stringify(error)}`);
              throw error;
            }
            
            const data = input as Record<string, unknown>;
            
            if (typeof data.id !== "string" || typeof data.name !== "string") {
              const error = new ValidationError({
                field: "input",
                message: "Missing required fields"
              });
              yield* Effect.logWarning(`Validation error: ${JSON.stringify(error)}`);
              throw error;
            }
            
            const user = { id: data.id, name: data.name };
            yield* Effect.logInfo(`Successfully parsed user: ${JSON.stringify(user)}`);
            return user;
          } catch (e) {
            if (e instanceof ValidationError) {
              return yield* Effect.fail(e);
            }
            yield* Effect.logError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
            throw e;
          }
        })
    })
  }
) {}

// Define test service
class TestService extends Effect.Service<TestService>()(
  "TestService",
  {
    sync: () => {
      // Create instance methods
      const printCause = (prefix: string, cause: Cause.Cause<unknown>): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`\n=== ${prefix} ===`);
          
          if (Cause.isDie(cause)) {
            const defect = Cause.failureOption(cause);
            if (defect._tag === "Some") {
              const error = defect.value as Error;
              yield* Effect.logError("Defect (unexpected error)");
              yield* Effect.logError(`Message: ${error.message}`);
              yield* Effect.logError(`Stack: ${error.stack?.split('\n')[1]?.trim() ?? 'N/A'}`);
            }
          } else if (Cause.isFailure(cause)) {
            const error = Cause.failureOption(cause);
            yield* Effect.logWarning("Expected failure");
            yield* Effect.logWarning(`Error: ${JSON.stringify(error)}`);
          }

          return Effect.succeed(void 0);
        });

      const runScenario = <E, A extends { [key: string]: any }>(
        name: string,
        program: Effect.Effect<A, E>
      ): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`\n=== Testing: ${name} ===`);
          
          type TestError = { readonly _tag: "error"; readonly cause: Cause.Cause<E> };
          
          const result = yield* Effect.catchAllCause(
            program,
            (cause) => Effect.succeed({ _tag: "error" as const, cause } as TestError)
          );
          
          if ("cause" in result) {
            yield* printCause("Error details", result.cause);
          } else {
            yield* Effect.logInfo(`Success: ${JSON.stringify(result)}`);
          }

          return Effect.succeed(void 0);
        });

      // Return bound methods
      return {
        printCause,
        runScenario
      };
    }
  }
) {}

// Create program with proper error handling
const program = Effect.gen(function* () {
  const db = yield* DatabaseService;
  const users = yield* UserService;
  const test = yield* TestService;
  
  yield* Effect.logInfo("=== Starting Error Handling Tests ===");
  
  // Test expected database errors
  yield* test.runScenario(
    "Expected database error",
    Effect.gen(function* () {
      const result = yield* Effect.retry(
        db.connect({ url: "" }),
        Schedule.exponential(100)
      ).pipe(
        Effect.timeout(Duration.seconds(5)),
        Effect.catchAll(() => Effect.fail("Connection timeout"))
      );
      return result;
    })
  );
  
  // Test unexpected connection errors
  yield* test.runScenario(
    "Unexpected connection error",
    Effect.gen(function* () {
      const result = yield* Effect.retry(
        db.connect({ url: "invalid" }),
        Schedule.recurs(3)
      ).pipe(
        Effect.catchAllCause(cause =>
          Effect.gen(function* () {
            yield* Effect.logError("Failed after 3 retries");
            yield* Effect.logError(Cause.pretty(cause));
            return yield* Effect.fail("Max retries exceeded");
          })
        )
      );
      return result;
    })
  );
  
  // Test user validation with recovery
  yield* test.runScenario(
    "Valid user data",
    Effect.gen(function* () {
      const result = yield* users.parseUser({ id: "1", name: "John" }).pipe(
        Effect.orElse(() => 
          Effect.succeed({ id: "default", name: "Default User" })
        )
      );
      return result;
    })
  );
  
  // Test concurrent error handling with timeout
  yield* test.runScenario(
    "Concurrent operations",
    Effect.gen(function* () {
      const results = yield* Effect.all([
        db.connect({ url: "" }).pipe(
          Effect.timeout(Duration.seconds(1)),
          Effect.catchAll(() => Effect.succeed({ success: true }))
        ),
        users.parseUser({ id: "invalid" }).pipe(
          Effect.timeout(Duration.seconds(1)),
          Effect.catchAll(() => Effect.succeed({ id: "timeout", name: "Timeout" }))
        )
      ], { concurrency: 2 });
      return results;
    })
  );
  
  yield* Effect.logInfo("\n=== Error Handling Tests Complete ===");

  return Effect.succeed(void 0);
});

// Run the program with all services
Effect.runPromise(
  Effect.provide(
    Effect.provide(
      Effect.provide(
        program,
        TestService.Default
      ),
      DatabaseService.Default
    ),
    UserService.Default
  )
);
```

**Explanation:**  
By inspecting the `Cause`, you can distinguish between expected and unexpected
failures, logging or escalating as appropriate.

## Implement Graceful Shutdown for Your Application
**Rule:** Use Effect.runFork and OS signal listeners to implement graceful shutdown for long-running applications.

### Example
This example creates a server with a "scoped" database connection. It uses `runFork` to start the server and sets up a `SIGINT` handler to interrupt the server fiber, which in turn guarantees the database finalizer is called.

```typescript
import { Effect, Layer, Fiber, Context, Scope } from "effect";
import * as http from "http";

// 1. A service with a finalizer for cleanup
class Database extends Effect.Service<Database>()("Database", {
  effect: Effect.gen(function* () {
    yield* Effect.log("Acquiring DB connection");
    return {
      query: () => Effect.succeed("data"),
    };
  }),
}) {}

// 2. The main server logic
const server = Effect.gen(function* () {
  const db = yield* Database;

  // Create server with proper error handling
  const httpServer = yield* Effect.sync(() => {
    const server = http.createServer((_req, res) => {
      Effect.runFork(
        Effect.provide(
          db.query().pipe(Effect.map((data) => res.end(data))),
          Database.Default
        )
      );
    });
    return server;
  });

  // Add a finalizer to close the server
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      httpServer.close();
      console.log("Server closed");
    })
  );

  // Start server with error handling
  yield* Effect.async<void, Error>((resume) => {
    httpServer.once('error', (err: Error) => {
      resume(Effect.fail(new Error(`Failed to start server: ${err.message}`)));
    });

    httpServer.listen(3456, () => {
      resume(Effect.succeed(void 0));
    });
  });

  yield* Effect.log("Server started on port 3456. Press Ctrl+C to exit.");

  // For testing purposes, we'll run for a short time instead of forever
  yield* Effect.sleep("2 seconds");
  yield* Effect.log("Shutting down gracefully...");
});

// 3. Provide the layer and launch with runFork
const app = Effect.provide(server.pipe(Effect.scoped), Database.Default);

// 4. Run the app and handle shutdown
Effect.runPromise(app).catch((error) => {
  console.error("Application error:", error);
  process.exit(1);
});

```

---

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

## Manage Resources Safely in a Pipeline
**Rule:** Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

### Example
This example creates and writes to a temporary file. `Stream.acquireRelease` is used to acquire a readable stream from that file. The pipeline then processes the file but is designed to fail partway through. The logs demonstrate that the `release` effect (which deletes the file) is still executed, preventing any resource leaks.

```typescript
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { NodeFileSystem } from "@effect/platform-node";
import * as path from "node:path";

interface ProcessError {
  readonly _tag: "ProcessError";
  readonly message: string;
}

const ProcessError = (message: string): ProcessError => ({
  _tag: "ProcessError",
  message,
});

interface FileServiceType {
  readonly createTempFile: () => Effect.Effect<{ filePath: string }, never>;
  readonly cleanup: (filePath: string) => Effect.Effect<void, never>;
  readonly readFile: (filePath: string) => Effect.Effect<string, never>;
}

export class FileService extends Effect.Service<FileService>()("FileService", {
  sync: () => {
    const filePath = path.join(__dirname, "temp-resource.txt");
    return {
      createTempFile: () => Effect.succeed({ filePath }),
      cleanup: (filePath: string) =>
        Effect.sync(() => console.log("✅ Resource cleaned up successfully")),
      readFile: (filePath: string) =>
        Effect.succeed("data 1\ndata 2\nFAIL\ndata 4"),
    };
  },
}) {}

// Process a single line
const processLine = (line: string): Effect.Effect<void, ProcessError> =>
  line === "FAIL"
    ? Effect.fail(ProcessError("Failed to process line"))
    : Effect.sync(() => console.log(`Processed: ${line}`));

// Create and process the file with proper resource management
const program = Effect.gen(function* () {
  console.log("=== Stream Resource Management Demo ===");
  console.log(
    "This demonstrates proper resource cleanup even when errors occur"
  );

  const fileService = yield* FileService;
  const { filePath } = yield* fileService.createTempFile();

  // Use scoped to ensure cleanup happens even on failure
  yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.addFinalizer(() => fileService.cleanup(filePath));

      const content = yield* fileService.readFile(filePath);
      const lines = content.split("\n");

      // Process each line, continuing even if some fail
      for (const line of lines) {
        yield* processLine(line).pipe(
          Effect.catchAll((error) =>
            Effect.sync(() =>
              console.log(`⚠️  Skipped line due to error: ${error.message}`)
            )
          )
        );
      }

      console.log("✅ Processing completed with proper resource management");
    })
  );
});

// Run the program with FileService layer
Effect.runPromise(Effect.provide(program, FileService.Default)).catch(
  (error) => {
    console.error("Unexpected error:", error);
  }
);

```

## Manually Manage Lifecycles with `Scope`
**Rule:** Use `Effect.scope` and `Scope.addFinalizer` for fine-grained control over resource cleanup.

### Example
```typescript
import { Effect, Console } from "effect";

// Mocking a complex file operation
const openFile = (path: string) =>
  Effect.succeed({ path, handle: Math.random() }).pipe(
    Effect.tap((f) => Console.log(`Opened ${f.path}`)),
  );
const createTempFile = (path: string) =>
  Effect.succeed({ path: `${path}.tmp`, handle: Math.random() }).pipe(
    Effect.tap((f) => Console.log(`Created temp file ${f.path}`)),
  );
const closeFile = (file: { path: string }) =>
  Effect.sync(() => Console.log(`Closed ${file.path}`));
const deleteFile = (file: { path: string }) =>
  Effect.sync(() => Console.log(`Deleted ${file.path}`));

// This program acquires two resources (a file and a temp file)
// and ensures both are cleaned up correctly using acquireRelease.
const program = Effect.gen(function* () {
  const file = yield* Effect.acquireRelease(
    openFile("data.csv"),
    (f) => closeFile(f)
  );

  const tempFile = yield* Effect.acquireRelease(
    createTempFile("data.csv"),
    (f) => deleteFile(f)
  );

  yield* Console.log("...writing data from temp file to main file...");
});

// Run the program with a scope
Effect.runPromise(Effect.scoped(program));

/*
Output (note the LIFO cleanup order):
Opened data.csv
Created temp file data.csv.tmp
...writing data from temp file to main file...
Deleted data.csv.tmp
Closed data.csv
*/
```

**Explanation:**
`Effect.scope` creates a new `Scope` and provides it to the `program`. Inside `program`, we access this `Scope` and use `addFinalizer` to register cleanup actions immediately after acquiring each resource. When `Effect.scope` finishes executing `program`, it closes the scope, which in turn executes all registered finalizers in the reverse order of their addition.

## Organize Layers into Composable Modules
**Rule:** Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

### Example
This example shows a `BaseLayer` with a `Logger`, a `UserModule` that uses the `Logger`, and a final `AppLayer` that wires them together.

### 1. The Base Infrastructure Layer

```typescript
// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()(
  "App/Core/Logger",
  {
    sync: () => ({
      log: (msg: string) => Effect.sync(() => console.log(`[LOG] ${msg}`))
    })
  }
) {}

// src/features/User/UserRepository.ts
export class UserRepository extends Effect.Service<UserRepository>()(
  "App/User/UserRepository",
  {
    // Define implementation that uses Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding user ${id}`);
            return { id, name: `User ${id}` };
          })
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default]
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(
  Effect.provide(
    program,
    UserRepository.Default
  )
).then(console.log);
```

### 2. The Feature Module Layer

```typescript
// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()(
  "App/Core/Logger",
  {
    sync: () => ({
      log: (msg: string) => Effect.sync(() => console.log(`[LOG] ${msg}`))
    })
  }
) {}

// src/features/User/UserRepository.ts
export class UserRepository extends Effect.Service<UserRepository>()(
  "App/User/UserRepository",
  {
    // Define implementation that uses Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding user ${id}`);
            return { id, name: `User ${id}` };
          })
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default]
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(
  Effect.provide(
    program,
    UserRepository.Default
  )
).then(console.log);
```

### 3. The Final Application Composition

```typescript
// src/layers.ts
import { Layer } from "effect";
import { BaseLayer } from "./core";
import { UserModuleLive } from "./features/User";
// import { ProductModuleLive } from "./features/Product";

const AllModules = Layer.mergeAll(UserModuleLive /*, ProductModuleLive */);

// Provide the BaseLayer to all modules at once, creating a self-contained AppLayer.
export const AppLayer = Layer.provide(AllModules, BaseLayer);
```

---

## Poll for Status Until a Task Completes
**Rule:** Use Effect.race to run a repeating polling task that is automatically interrupted when a main task completes.

### Example
This program simulates a long-running data processing job. While it's running, a separate effect polls for its status every 2 seconds. When the main job finishes after 10 seconds, the polling automatically stops.

```typescript
import { Effect, Schedule, Duration } from "effect";

// The main task that takes a long time to complete
const longRunningJob = Effect.log("Data processing complete!").pipe(
  Effect.delay(Duration.seconds(10)),
);

// The polling task that checks the status
const pollStatus = Effect.log("Polling for job status: In Progress...");

// A schedule that repeats the polling task every 2 seconds, forever
const pollingSchedule = Schedule.fixed(Duration.seconds(2));

// The complete polling effect that will run indefinitely until interrupted
const repeatingPoller = pollStatus.pipe(Effect.repeat(pollingSchedule));

// Race the main job against the poller.
// The longRunningJob will win after 10 seconds, interrupting the poller.
const program = Effect.race(longRunningJob, repeatingPoller);

Effect.runPromise(program);
/*
Output:
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Data processing complete!
*/
```

---

## Run Background Tasks with Effect.fork
**Rule:** Use Effect.fork to start a non-blocking background process and manage its lifecycle via its Fiber.

### Example
This program forks a background process that logs a "tick" every second. The main process does its own work for 5 seconds and then explicitly interrupts the background logger before exiting.

```typescript
import { Effect, Fiber } from "effect";

// A long-running effect that logs a message every second, forever
// Effect.forever creates an infinite loop that repeats the effect
// This simulates a background service like a health check or monitoring task
const tickingClock = Effect.log("tick").pipe(
  Effect.delay("1 second"), // Wait 1 second between ticks
  Effect.forever, // Repeat indefinitely - this creates an infinite effect
);

const program = Effect.gen(function* () {
  yield* Effect.log("Forking the ticking clock into the background.");
  
  // Start the clock, but don't wait for it.
  // Effect.fork creates a new fiber that runs concurrently with the main program
  // The main fiber continues immediately without waiting for the background task
  // This is essential for non-blocking background operations
  const clockFiber = yield* Effect.fork(tickingClock);
  
  // At this point, we have two fibers running:
  // 1. The main fiber (this program)
  // 2. The background clock fiber (ticking every second)

  yield* Effect.log("Main process is now doing other work for 5 seconds...");
  
  // Simulate the main application doing work
  // While this sleep happens, the background clock continues ticking
  // This demonstrates true concurrency - both fibers run simultaneously
  yield* Effect.sleep("5 seconds");

  yield* Effect.log("Main process is done. Interrupting the clock fiber.");
  
  // Stop the background process.
  // Fiber.interrupt sends an interruption signal to the fiber
  // This allows the fiber to perform cleanup operations before terminating
  // Without this, the background task would continue running indefinitely
  yield* Fiber.interrupt(clockFiber);
  
  // Important: Always clean up background fibers to prevent resource leaks
  // In a real application, you might want to:
  // 1. Use Fiber.join instead of interrupt to wait for graceful completion
  // 2. Handle interruption signals within the background task
  // 3. Implement proper shutdown procedures

  yield* Effect.log("Program finished.");
  
  // Key concepts demonstrated:
  // 1. Fork creates concurrent fibers without blocking
  // 2. Background tasks run independently of the main program
  // 3. Fiber interruption provides controlled shutdown
  // 4. Multiple fibers can run simultaneously on the same thread pool
});

// This example shows how to:
// - Run background tasks that don't block the main program
// - Manage fiber lifecycles (create, run, interrupt)
// - Coordinate between multiple concurrent operations
// - Properly clean up resources when shutting down
Effect.runPromise(program);
```

---

## Teach your AI Agents Effect with the MCP Server
**Rule:** Use the MCP server to provide live application context to AI coding agents, enabling more accurate assistance.

### Example
The "Good Example" is the workflow this pattern enables.

1.  **You run the MCP server** in your terminal, pointing it at your main `AppLayer`.
    ```bash
    npx @effect/mcp-server --layer src/layers.ts:AppLayer
    ```

2.  **You configure your AI agent** (e.g., Cursor) to use the MCP server's endpoint (`http://localhost:3333`).

3.  **You ask the AI a question** that requires deep context about your app:
    > "Refactor this code to use the `UserService` to fetch a user by ID and log the result with the `Logger`."

4.  **The AI, in the background, queries the MCP server:**
    -   It discovers that `UserService` and `Logger` are available in the `AppLayer`.
    -   It retrieves the exact method signature for `UserService.getUser` and `Logger.log`.

5.  **The AI generates correct, context-aware code** because it's not guessing; it's using the live architectural information provided by the MCP server.

```typescript
// The AI generates this correct code:
import { Effect } from "effect";
import { UserService } from "./features/User/UserService";
const program = Effect.gen(function* () {
  const userService = yield* UserService;

  const user = yield* userService.getUser("123");
  yield* Effect.log(`Found user: ${user.name}`);
});
```

---

## Understand Fibers as Lightweight Threads
**Rule:** Understand that a Fiber is a lightweight, virtual thread managed by the Effect runtime for massive concurrency.

### Example
This program demonstrates the efficiency of fibers by forking 100,000 of them. Each fiber does a small amount of work (sleeping for 1 second). Trying to do this with 100,000 OS threads would instantly crash any system.

```typescript
import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  // Demonstrate the lightweight nature of fibers by creating 100,000 of them
  // This would be impossible with OS threads due to memory and context switching overhead
  const fiberCount = 100_000;
  yield* Effect.log(`Forking ${fiberCount} fibers...`);

  // Create an array of 100,000 simple effects
  // Each effect sleeps for 1 second and then returns its index
  // This simulates lightweight concurrent tasks
  const tasks = Array.from({ length: fiberCount }, (_, i) =>
    Effect.sleep("1 second").pipe(Effect.as(i))
  );

  // Fork all of them into background fibers
  // Effect.fork creates a new fiber for each task without blocking
  // This demonstrates fiber creation scalability - 100k fibers created almost instantly
  // Each fiber is much lighter than an OS thread (typically ~1KB vs ~8MB per thread)
  const fibers = yield* Effect.forEach(tasks, Effect.fork);

  yield* Effect.log(
    "All fibers have been forked. Now waiting for them to complete..."
  );

  // Wait for all fibers to finish their work
  // Fiber.joinAll waits for all fibers to complete and collects their results
  // This demonstrates fiber coordination - managing thousands of concurrent operations
  // The runtime efficiently schedules these fibers using a work-stealing thread pool
  const results = yield* Fiber.joinAll(fibers);

  yield* Effect.log(`All ${results.length} fibers have completed.`);

  // Key insights from this example:
  // 1. Fibers are extremely lightweight - 100k fibers use minimal memory
  // 2. Fiber creation is fast - no expensive OS thread allocation
  // 3. The Effect runtime efficiently schedules fibers across available CPU cores
  // 4. Fibers can be suspended and resumed without blocking OS threads
  // 5. This enables massive concurrency for I/O-bound operations
});

// This program runs successfully, demonstrating the low overhead of fibers.
// Try running this with OS threads - you'd likely hit system limits around 1000-10000 threads
// With fibers, 100k+ concurrent operations are easily achievable
Effect.runPromise(program);

```

---

