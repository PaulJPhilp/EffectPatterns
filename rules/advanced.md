## Handle Unexpected Errors by Inspecting the Cause
**Rule:** Handle unexpected errors by inspecting the cause.

### Example
```typescript
import { Cause, Effect } from "effect";

const programThatDies = Effect.sync(() => { throw new Error("bug!") });

const handled = programThatDies.pipe(
  Effect.catchAllCause((cause) => {
    if (Cause.isDie(cause)) {
      return Effect.logFatal("Caught a defect!", cause);
    }
    return Effect.failCause(cause);
  }),
);
```

**Explanation:**  
By inspecting the `Cause`, you can distinguish between expected and unexpected
failures, logging or escalating as appropriate.

## Organize Layers into Composable Modules
**Rule:** Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

### Example
This example shows a `BaseLayer` with a `Logger`, a `UserModule` that uses the `Logger`, and a final `AppLayer` that wires them together.

### 1. The Base Infrastructure Layer

```typescript
// src/core/Logger.ts
import { Console, Effect } from "effect";

export class Logger extends Effect.Tag("App/Logger")<Logger, {
  readonly log: (message: string) => Effect.Effect<void>;
}>() {}

export const LoggerLive = Logger.toLayer(
  Effect.sync(() => Logger.of({ log: (msg) => Console.log(`[INFO] ${msg}`) })),
);

// src/core/index.ts
import { Layer } from "effect";
import { LoggerLive } from "./Logger";

// The BaseLayer merges all core, cross-cutting services.
export const BaseLayer = Layer.mergeAll(LoggerLive);
```

### 2. The Feature Module Layer

```typescript
// src/features/User/UserRepository.ts
import { Effect, Layer } from "effect";
import { Logger } from "../../core/Logger";

export class UserRepository extends Effect.Tag("App/User/UserRepository")<UserRepository, any>() {}

export const UserRepositoryLive = UserRepository.toLayer(
  Effect.gen(function* () {
    const logger = yield* Logger; // <-- Dependency on a base service
    return UserRepository.of({
      findById: (id: number) => logger.log(`Finding user ${id}`),
    });
  }),
);

// src/features/User/index.ts
import { Layer } from "effect";
import { UserRepositoryLive } from "./UserRepository";
// ... other user services would be merged here

// The UserModule provides all services for the User domain.
// It exposes its own dependencies (like Logger) in its requirements.
export const UserModuleLive = Layer.mergeAll(UserRepositoryLive);
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

## Add Caching by Wrapping a Layer
**Rule:** Use a wrapping Layer to add cross-cutting concerns like caching to a service without altering its original implementation.

### Example
We have a `WeatherService` that makes slow API calls. We create a `WeatherService.cached` wrapper layer that adds an in-memory cache using a `Ref` and a `Map`.

```typescript
import { Effect, Layer, Ref, Duration } from "effect";

// 1. The original service definition
class WeatherService extends Effect.Tag("WeatherService")<
  WeatherService,
  { readonly getForecast: (city: string) => Effect.Effect<string, "ApiError"> }
>() {}

// 2. The "Live" implementation that is slow
const WeatherServiceLive = Layer.succeed(
  WeatherService,
  WeatherService.of({
    getForecast: (city) =>
      Effect.succeed(`Sunny in ${city}`).pipe(
        Effect.delay("2 seconds"),
        Effect.tap(() => Effect.log(`Fetched live forecast for ${city}`)),
      ),
  }),
);

// 3. The Caching Wrapper Layer
const WeatherServiceCached = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    // It REQUIRES the original WeatherService
    const underlyingService = yield* WeatherService;
    const cache = yield* Ref.make(new Map<string, string>());

    return WeatherService.of({
      getForecast: (city) =>
        Ref.get(cache).pipe(
          Effect.flatMap((map) =>
            map.has(city)
              ? Effect.log(`Cache HIT for ${city}`).pipe(Effect.as(map.get(city)!))
              : Effect.log(`Cache MISS for ${city}`).pipe(
                  Effect.flatMap(() => underlyingService.getForecast(city)),
                  Effect.tap((forecast) => Ref.update(cache, (map) => map.set(city, forecast))),
                ),
          ),
        ),
    });
  }),
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
import { Logger } from "./core/Logger";

const program = Effect.gen(function* () {
  const userService = yield* UserService;
  const logger = yield* Logger;

  const user = yield* userService.getUser("123");
  yield* logger.log(`Found user: ${user.name}`);
});
```

---

## Manage Resources Safely in a Pipeline
**Rule:** Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

### Example
This example creates and writes to a temporary file. `Stream.acquireRelease` is used to acquire a readable stream from that file. The pipeline then processes the file but is designed to fail partway through. The logs demonstrate that the `release` effect (which deletes the file) is still executed, preventing any resource leaks.

```typescript
import { Effect, Stream } from 'effect';
import { NodeFileSystem } from '@effect/platform-node';
import * as path from 'node:path';
import * as fs from 'node:fs';

// The resource we want to manage: a file handle
const acquire = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, 'temp-resource.txt');
  yield* fs.writeFileString(filePath, 'data 1\ndata 2\nFAIL\ndata 4');
  yield* Effect.log('Resource ACQUIRED: Opened file for reading.');
  return fs.createReadStream(filePath);
});

// The release function for our resource
const release = (stream: fs.ReadStream) =>
  Effect.gen(function* () {
    const fs = yield* NodeFileSystem;
    const filePath = path.join(__dirname, 'temp-resource.txt');
    yield* fs.remove(filePath);
    yield* Effect.log('Resource RELEASED: Closed and deleted file.');
  });

// The stream that uses the acquired resource
const stream = Stream.acquireRelease(acquire, release).pipe(
  Stream.flatMap((readable) => Stream.fromReadable(() => readable)),
  Stream.decodeText('utf-8'),
  Stream.splitLines,
  Stream.tap((line) => Effect.log(`Processing: ${line}`)),
  // Introduce a failure to demonstrate release is still called
  Stream.mapEffect((line) =>
    line === 'FAIL' ? Effect.fail('Boom!') : Effect.succeed(line)
  )
);

// We expect this program to fail, but the release logic should still execute.
const program = Stream.runDrain(stream);

Effect.runPromiseExit(program).then((exit) => {
  if (exit._tag === 'Failure') {
    console.log('\nPipeline failed as expected, but resources were cleaned up.');
  }
});
/*
Output:
... level=INFO msg="Resource ACQUIRED: Opened file for reading."
... level=INFO msg="Processing: data 1"
... level=INFO msg="Processing: data 2"
... level=INFO msg="Processing: FAIL"
... level=INFO msg="Resource RELEASED: Closed and deleted file."

Pipeline failed as expected, but resources were cleaned up.
*/
```

## Run Background Tasks with Effect.fork
**Rule:** Use Effect.fork to start a non-blocking background process and manage its lifecycle via its Fiber.

### Example
This program forks a background process that logs a "tick" every second. The main process does its own work for 5 seconds and then explicitly interrupts the background logger before exiting.

```typescript
import { Effect, Fiber } from "effect";

// A long-running effect that logs a message every second, forever
const tickingClock = Effect.log("tick").pipe(
  Effect.delay("1 second"),
  Effect.forever,
);

const program = Effect.gen(function* () {
  yield* Effect.log("Forking the ticking clock into the background.");
  // Start the clock, but don't wait for it.
  const clockFiber = yield* Effect.fork(tickingClock);

  yield* Effect.log("Main process is now doing other work for 5 seconds...");
  yield* Effect.sleep("5 seconds");

  yield* Effect.log("Main process is done. Interrupting the clock fiber.");
  // Stop the background process.
  yield* Fiber.interrupt(clockFiber);

  yield* Effect.log("Program finished.");
});

Effect.runPromise(program);
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

## Decouple Fibers with Queues and PubSub
**Rule:** Use Queue for point-to-point work distribution and PubSub for broadcast messaging between fibers.

### Example
A producer fiber adds jobs to a `Queue`, and a worker fiber takes jobs off the queue to process them.

```typescript
import { Effect, Queue } from "effect";

const program = Effect.gen(function* () {
  // Create a bounded queue that can hold a maximum of 10 items.
  const queue = yield* Queue.bounded<string>(10);

  // Producer Fiber: Add a job to the queue every second.
  const producer = Effect.gen(function* () {
    let i = 0;
    while (true) {
      yield* Queue.offer(queue, `job-${i++}`);
      yield* Effect.sleep("1 second");
    }
  }).pipe(Effect.fork);

  // Worker Fiber: Take a job from the queue and process it.
  const worker = Effect.gen(function* () {
    while (true) {
      const job = yield* Queue.take(queue);
      yield* Effect.log(`Processing ${job}...`);
      yield* Effect.sleep("2 seconds"); // Simulate work
    }
  }).pipe(Effect.fork);

  // Let them run for a while...
  yield* Effect.sleep("10 seconds");
});
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

## Build a Basic HTTP Server
**Rule:** Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

### Example
This example creates a simple server with a `Greeter` service. The server starts, creates a runtime containing the `Greeter`, and then uses that runtime to handle requests.

```typescript
import * as http from "http";
import { Effect, Layer, Runtime } from "effect";

// 1. Define a service and its layer
class Greeter extends Effect.Tag("Greeter")<
  Greeter,
  { readonly greet: () => Effect.Effect<string> }
>() {}

const GreeterLive = Layer.succeed(
  Greeter,
  Greeter.of({ greet: () => Effect.succeed("Hello, World!") }),
);

// 2. Define the main application layer
const AppLayer = GreeterLive;

// 3. The main program: create the runtime and start the server
const program = Effect.gen(function* () {
  // Create the runtime once
  const runtime = yield* Layer.toRuntime(AppLayer);
  const runPromise = Runtime.runPromise(runtime);

  const server = http.createServer((_req, res) => {
    // For each request, create and run an Effect
    const requestEffect = Greeter.pipe(
      Effect.flatMap((greeter) => greeter.greet()),
      Effect.map((message) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(message);
      }),
      Effect.catchAllCause((cause) =>
        Effect.sync(() => {
          console.error(cause);
          res.writeHead(500);
          res.end("Internal Server Error");
        }),
      ),
    );

    // Execute the request effect with our runtime
    runPromise(requestEffect);
  });

  yield* Effect.log("Server starting on http://localhost:3000");
  server.listen(3000);
});

// Run the main program to start the server
Effect.runPromise(program);
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

## Understand Fibers as Lightweight Threads
**Rule:** Understand that a Fiber is a lightweight, virtual thread managed by the Effect runtime for massive concurrency.

### Example
This program demonstrates the efficiency of fibers by forking 100,000 of them. Each fiber does a small amount of work (sleeping for 1 second). Trying to do this with 100,000 OS threads would instantly crash any system.

```typescript
import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  const fiberCount = 100_000;
  yield* Effect.log(`Forking ${fiberCount} fibers...`);

  // Create an array of 100,000 simple effects
  const tasks = Array.from({ length: fiberCount }, (_, i) =>
    Effect.sleep("1 second").pipe(Effect.as(i)),
  );

  // Fork all of them into background fibers
  const fibers = yield* Effect.forEach(tasks, Effect.fork);

  yield* Effect.log("All fibers have been forked. Now waiting for them to complete...");

  // Wait for all fibers to finish their work
  const results = yield* Fiber.joinAll(fibers);

  yield* Effect.log(`All ${results.length} fibers have completed.`);
});

// This program runs successfully, demonstrating the low overhead of fibers.
Effect.runPromise(program);
```

---