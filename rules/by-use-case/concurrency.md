## Control Repetition with Schedule
**Rule:** Use Schedule to create composable policies for controlling the repetition and retrying of effects.

### Example
This example demonstrates composition by creating a common, robust retry policy: exponential backoff with jitter, limited to 5 attempts.

```typescript
import { Effect, Schedule, Duration } from "effect";

// A simple effect that can fail
const flakyEffect = Effect.try({
  try: () => {
    if (Math.random() > 0.2) {
      console.log("Operation failed, retrying...");
      throw new Error("Transient error");
    }
    return "Operation succeeded!";
  },
  catch: () => "ApiError" as const,
});

// --- Building a Composable Schedule ---

// 1. Start with a base exponential backoff (100ms, 200ms, 400ms...)
const exponentialBackoff = Schedule.exponential(Duration.millis(100));

// 2. Add random jitter to avoid thundering herd problems
const withJitter = exponentialBackoff.pipe(Schedule.jittered);

// 3. Limit the schedule to a maximum of 5 repetitions
const limitedWithJitter = withJitter.pipe(Schedule.andThen(Schedule.recurs(5)));

// --- Using the Schedule ---
const program = flakyEffect.pipe(Effect.retry(limitedWithJitter));

Effect.runPromise(program).then(console.log);
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

## Race Concurrent Effects for the Fastest Result
**Rule:** Use Effect.race to get the result from the first of several effects to succeed, automatically interrupting the losers.

### Example
A classic use case is checking a fast cache before falling back to a slower database. We can race the cache lookup against the database query.

```typescript
import { Effect, Option } from "effect";

// Simulate a fast cache lookup that might find nothing (None)
const checkCache = Effect.succeed(Option.none()).pipe(
  Effect.delay("10 millis"),
);

// Simulate a slower database query that will always find the data
const queryDatabase = Effect.succeed(Option.some({ id: 1, name: "Paul" })).pipe(
  Effect.delay("100 millis"),
);

// Race them. If the cache had returned Some(user), it would have won,
// and the database query would have been instantly interrupted.
const program = Effect.race(checkCache, queryDatabase).pipe(
  // The result of the race is an Option, so we can handle it.
  Effect.flatMap(Option.match({
    onNone: () => Effect.fail("User not found anywhere."),
    onSome: (user) => Effect.succeed(user),
  })),
);

// In this case, the database wins the race.
Effect.runPromise(program).then(console.log); // { id: 1, name: 'Paul' }
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

## Manage Shared State Safely with Ref
**Rule:** Use Ref to manage shared, mutable state concurrently, ensuring atomicity.

### Example
This program simulates 1,000 concurrent fibers all trying to increment a shared counter. Because we use `Ref.update`, every single increment is applied atomically, and the final result is always correct.

```typescript
import { Effect, Ref } from "effect";

const program = Effect.gen(function* () {
  // Create a new Ref with an initial value of 0
  const ref = yield* Ref.make(0);

  // Define an effect that increments the counter by 1
  const increment = Ref.update(ref, (n) => n + 1);

  // Create an array of 1,000 increment effects
  const tasks = Array.from({ length: 1000 }, () => increment);

  // Run all 1,000 effects concurrently
  yield* Effect.all(tasks, { concurrency: "unbounded" });

  // Get the final value of the counter
  return yield* Ref.get(ref);
});

// The result will always be 1000
Effect.runPromise(program).then(console.log);
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

## Run Independent Effects in Parallel with Effect.all
**Rule:** Use Effect.all to execute a collection of independent effects concurrently.

### Example
Imagine fetching a user's profile and their latest posts from two different API endpoints. These are independent operations and can be run in parallel to save time.

```typescript
import { Effect } from "effect";

// Simulate fetching a user, takes 1 second
const fetchUser = Effect.succeed({ id: 1, name: "Paul" }).pipe(
  Effect.delay("1 second"),
);

// Simulate fetching posts, takes 1.5 seconds
const fetchPosts = Effect.succeed([{ title: "Effect is great" }]).pipe(
  Effect.delay("1.5 seconds"),
);

// Run both effects concurrently
const program = Effect.all([fetchUser, fetchPosts]);

// The resulting effect will succeed with a tuple: [{id, name}, [{title}]]
// Total execution time will be ~1.5 seconds (the duration of the longest task).
Effect.runPromise(program).then(console.log);
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

## Process a Collection in Parallel with Effect.forEach
**Rule:** Use Effect.forEach with the `concurrency` option to process a collection in parallel with a fixed limit.

### Example
Imagine you have a list of 100 user IDs and you need to fetch the data for each one. `Effect.forEach` with a concurrency of 10 will process them in controlled parallel batches.

```typescript
import { Effect } from "effect";

const userIds = Array.from({ length: 100 }, (_, i) => i + 1);

// A function that simulates fetching a single user's data
const fetchUserById = (id: number): Effect.Effect<{ id: number; name: string }> =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay(Math.random() * 100), // Simulate variable network latency
  );

// Process the entire array, but only run 10 fetches at a time.
const program = Effect.forEach(userIds, fetchUserById, {
  concurrency: 10,
});

// The result will be an array of all 100 user objects.
// The total time will be much less than running them sequentially.
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