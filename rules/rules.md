# Effect Coding Rules for AI (Cursor)

This document lists key architectural and style rules for our Effect-TS codebase. Use these as guidelines when generating or refactoring code.

--- (Pattern Start: access-config-in-context) ---

## Access Configuration from the Context

**Rule:** Access configuration from the Effect context.

### Full Pattern Content:

# Access Configuration from the Context

## Guideline

Inside an `Effect.gen` block, use `yield*` on your `Config` object to access the resolved, type-safe configuration values from the context.

## Rationale

This allows your business logic to declaratively state its dependency on a piece of configuration. The logic is clean, type-safe, and completely decoupled from *how* the configuration is provided.

## Good Example

```typescript
import { Config, Effect } from "effect";

const ServerConfig = Config.all({
  host: Config.string("HOST"),
  port: Config.number("PORT"),
});

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Starting server on http://${config.host}:${config.port}`);
});
```

**Explanation:**  
By yielding the config object, you make your dependency explicit and leverage Effect's context system for testability and modularity.

## Anti-Pattern

Passing configuration values down through multiple function arguments ("prop-drilling"). This is cumbersome and obscures which components truly need which values.

--- (Pattern Start: accessing-current-time-with-clock) ---

## Accessing the Current Time with Clock

**Rule:** Use the Clock service to get the current time, enabling deterministic testing with TestClock.

### Full Pattern Content:

## Guideline

Whenever you need to get the current time within an `Effect`, do not call `Date.now()` directly. Instead, depend on the `Clock` service and use one of its methods, such as `Clock.currentTimeMillis`.

---

## Rationale

Directly calling `Date.now()` makes your code impure and tightly coupled to the system clock. This makes testing difficult and unreliable, as the output of your function will change every time it's run.

The `Clock` service is Effect's solution to this problem. It's an abstraction for "the current time."
-   In **production**, the default `Live` `Clock` implementation uses the real system time.
-   In **tests**, you can provide the `TestClock` layer. This gives you a virtual clock that you can manually control, allowing you to set the time to a specific value or advance it by a specific duration.

This makes any time-dependent logic pure, deterministic, and easy to test with perfect precision.

---

## Good Example

This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Layer } from "effect";
import { TestClock } from "effect/TestClock";
import { describe, it, expect } from "vitest";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (token: Token): Effect.Effect<boolean, never, Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
  );

// --- Testing the function ---
describe("isTokenExpired", () => {
  const token = { value: "abc", expiresAt: 1000 };

  it("should return false when the clock is before the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(false);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));

  it("should return true when the clock is after the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(1500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(true);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));
});
```

---

## Anti-Pattern

Directly calling `Date.now()` inside your business logic. This creates an impure function that cannot be tested reliably without manipulating the system clock, which is a bad practice.

```typescript
import { Effect } from "effect";

interface Token { readonly expiresAt: number; }

// ❌ WRONG: This function's behavior changes every millisecond.
const isTokenExpiredUnsafely = (token: Token): Effect.Effect<boolean> =>
  Effect.sync(() => Date.now() > token.expiresAt);

// Testing this function would require complex mocking of global APIs
// or would be non-deterministic.
```

--- (Pattern Start: accumulate-multiple-errors-with-either) ---

## Accumulate Multiple Errors with Either

**Rule:** Use Either to accumulate multiple validation errors instead of failing on the first one.

### Full Pattern Content:

## Guideline

When you need to perform multiple validation checks and collect all failures, use the ``Either<E, A>`` data type. ``Either`` represents a value that can be one of two possibilities: a ``Left<E>`` (typically for failure) or a ``Right<A>`` (typically for success).

---

## Rationale

The `Effect` error channel is designed to short-circuit. The moment an `Effect` fails, the entire computation stops and the error is propagated. This is perfect for handling unrecoverable errors like a lost database connection.

However, for tasks like validating a user's input, this is poor user experience. You want to show the user all of their mistakes at once.

`Either` is the solution. Since it's a pure data structure, you can run multiple checks that each return an `Either`, and then combine the results to accumulate all the `Left` (error) values. The `Effect/Schema` module uses this pattern internally to provide powerful error accumulation.

---

## Good Example

Using `Schema.decode` with the `allErrors: true` option demonstrates this pattern perfectly. The underlying mechanism uses `Either` to collect all parsing errors into an array instead of stopping at the first one.

```typescript
import { Effect, Schema } from "effect";

const UserSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(3)),
  email: Schema.String.pipe(Schema.pattern(/@/)),
});

const invalidInput = {
  name: "Al", // Too short
  email: "bob-no-at-sign.com", // Invalid pattern
};

// Use { allErrors: true } to enable error accumulation
const decoded = Schema.decode(UserSchema)(invalidInput, { allErrors: true });

const program = Effect.match(decoded, {
  onFailure: (error) => {
    // The error contains a tree of all validation failures
    console.log("Validation failed with multiple errors:");
    error.errors.forEach((e, i) => console.log(`${i + 1}. ${e.message}`));
  },
  onSuccess: (user) => console.log("User is valid:", user),
});

Effect.runSync(program);
/*
Output:
Validation failed with multiple errors:
1. name must be a string at least 3 character(s) long
2. email must be a string matching the pattern /@/
*/
```

---

## Anti-Pattern

Using `Effect`'s error channel for validation that requires multiple error messages. The code below will only ever report the first error it finds, because `Effect.fail` short-circuits the entire `Effect.gen` block.

```typescript
import { Effect } from "effect";

const validateWithEffect = (input: { name: string; email: string }) =>
  Effect.gen(function* () {
    if (input.name.length < 3) {
      // The program will fail here and never check the email.
      return yield* Effect.fail("Name is too short.");
    }
    if (!input.email.includes("@")) {
      return yield* Effect.fail("Email is invalid.");
    }
    return yield* Effect.succeed(input);
  });
```

--- (Pattern Start: add-caching-by-wrapping-a-layer) ---

## Add Caching by Wrapping a Layer

**Rule:** Use a wrapping Layer to add cross-cutting concerns like caching to a service without altering its original implementation.

### Full Pattern Content:

## Guideline

To add cross-cutting concerns like caching to a service, create a "wrapper" `Layer`. This is a layer that takes the original service's `Layer` as input (as a dependency) and returns a new `Layer`. The new layer provides the same service interface but wraps the original methods with additional logic (e.g., checking a cache before calling the original method).

---

## Rationale

You often want to add functionality like caching, logging, or metrics to a service without polluting its core business logic. The wrapper layer pattern is a clean way to achieve this.

By creating a layer that *requires* the original service, you can get an instance of it from the context, and then provide a *new* implementation of that same service that calls the original.

This approach is powerful because:
-   **It's Non-Invasive:** The original service (`DatabaseLive`) remains completely unchanged.
-   **It's Composable:** You can apply multiple wrappers. You could wrap a database layer with a caching layer, then wrap that with a metrics layer.
-   **It's Explicit:** The composition is clearly defined at the application's top level where you build your final `AppLayer`.

---

## Good Example

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

## Anti-Pattern

Modifying the original service implementation to include caching logic directly. This violates the Single Responsibility Principle by mixing the core logic of fetching weather with the cross-cutting concern of caching.

```typescript
// ❌ WRONG: The service is now responsible for both its logic and its caching strategy.
const WeatherServiceWithInlineCache = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    const cache = yield* Ref.make(new Map<string, string>());
    return WeatherService.of({
      getForecast: (city) => {
        // ...caching logic mixed directly with fetching logic...
        return Effect.succeed("...");
      },
    });
  }),
);
```

--- (Pattern Start: add-custom-metrics) ---

## Add Custom Metrics to Your Application

**Rule:** Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

### Full Pattern Content:

## Guideline

To monitor the health and performance of your application, instrument your code with `Metric`s. The three main types are:
-   **`Metric.counter("name")`**: To count occurrences of an event (e.g., `users_registered_total`). It only goes up.
-   **`Metric.gauge("name")`**: To track a value that can go up or down (e.g., `active_connections`).
-   **`Metric.histogram("name")`**: To track the distribution of a value (e.g., `request_duration_seconds`).

---

## Rationale

While logs are for events and traces are for requests, metrics are for aggregation. They provide a high-level, numerical view of your system's health over time, which is perfect for building dashboards and setting up alerts.

Effect's `Metric` module provides a simple, declarative way to add this instrumentation. By defining your metrics upfront, you can then use operators like `Metric.increment` or `Effect.timed` to update them. This is fully integrated with Effect's context system, allowing you to provide different metric backends (like Prometheus or StatsD) via a `Layer`.

This allows you to answer questions like:
-   "What is our user sign-up rate over the last 24 hours?"
-   "Are we approaching our maximum number of database connections?"
-   "What is the 95th percentile latency for our API requests?"

---

## Good Example

This example creates a counter to track how many times a user is created and a histogram to track the duration of the database operation.

```typescript
import { Effect, Metric, Duration } from "effect";

// 1. Define your metrics. It's good practice to keep them in one place.
const userRegisteredCounter = Metric.counter("users_registered_total", {
  description: "A counter for how many users have been registered.",
});

const dbDurationHistogram = Metric.histogram(
  "db_operation_duration_seconds",
  Metric.Histogram.Boundaries.exponential({ start: 0.01, factor: 2, count: 10 }),
);

// 2. A simulated database call
const saveUserToDb = Effect.succeed("user saved").pipe(
  Effect.delay(Duration.millis(Math.random() * 100)),
);

// 3. Instrument the business logic
const createUser = Effect.gen(function* () {
  // Use .pipe() and Metric.trackDuration to time the operation
  yield* saveUserToDb.pipe(Metric.trackDuration(dbDurationHistogram));

  // Use Metric.increment to update the counter
  yield* Metric.increment(userRegisteredCounter);

  return { status: "success" };
});

// When run with a metrics backend, these metrics would be exported.
Effect.runPromise(createUser);
```

---

## Anti-Pattern

Not adding any metrics to your application. Without metrics, you are flying blind. You have no high-level overview of your application's health, performance, or business KPIs. You can't build dashboards, you can't set up alerts for abnormal behavior (e.g., "error rate is too high"), and you are forced to rely on digging through logs to 
understand the state of your system.

--- (Pattern Start: stream-retry-on-failure) ---

## Automatically Retry Failed Operations

**Rule:** Compose a Stream with the .retry(Schedule) operator to automatically recover from transient failures.

### Full Pattern Content:

## Guideline

To make a data pipeline resilient to transient failures, apply the `.retry(Schedule)` operator to the `Stream`.

---

## Rationale

Real-world systems are unreliable. Network connections drop, APIs return temporary `503` errors, and databases can experience deadlocks. A naive pipeline will fail completely on the first sign of trouble. A resilient pipeline, however, can absorb these transient errors and heal itself.

The `retry` operator, combined with the `Schedule` module, provides a powerful and declarative way to build this resilience:

1.  **Declarative Resilience**: Instead of writing complex `try/catch` loops with manual delay logic, you declaratively state *how* the pipeline should retry. For example, "retry 3 times, with an exponential backoff starting at 100ms."
2.  **Separation of Concerns**: Your core pipeline logic remains focused on the "happy path." The retry strategy is a separate, composable concern that you apply to the entire stream.
3.  **Rich Scheduling Policies**: `Schedule` is incredibly powerful. You can create schedules based on a fixed number of retries, exponential backoff, jitter (to avoid thundering herd problems), or even combinations of these.
4.  **Prevents Cascading Failures**: By handling temporary issues at the source, you prevent a small, transient glitch from causing a complete failure of your entire application.

---

## Good Example

This example simulates an API that fails the first two times it's called. The stream processes a list of IDs, and the `retry` operator ensures that the failing operation for `id: 2` is automatically retried until it succeeds.

```typescript
import { Effect, Stream, Schedule } from 'effect';

let attempts = 0;
// A mock function that simulates a flaky API call
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    yield* Effect.log(`Attempting to process item ${id}...`);
    if (id === 2 && attempts < 2) {
      attempts++;
      yield* Effect.log(`Item ${id} failed, attempt ${attempts}.`);
      return yield* Effect.fail(new Error('API is temporarily down'));
    }
    return `Successfully processed item ${id}`;
  });

const ids = [1, 2, 3];

// Define a retry policy: 3 attempts with a fixed 100ms delay
const retryPolicy = Schedule.recurs(3).pipe(Schedule.addDelay('100 millis'));

const program = Stream.fromIterable(ids).pipe(
  // Apply the processing function to each item
  Stream.mapEffect(processItem, { concurrency: 1 }),
  // Apply the retry policy to the entire stream
  Stream.retry(retryPolicy),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Attempting to process item 1..."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 1."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 2."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Attempting to process item 3..."
*/
```

## Anti-Pattern

The anti-pattern is to either have no retry logic at all, or to write manual, imperative retry loops inside your processing function.

```typescript
import { Effect, Stream } from 'effect';
// ... same mock processItem function ...

const ids = [1, 2, 3];

const program = Stream.fromIterable(ids).pipe(
  // No retry logic. The entire stream will fail when item 2 fails.
  Stream.mapEffect(processItem, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program).catch((error) => {
  console.error('Pipeline failed:', error);
});
/*
Output:
... level=INFO msg="Attempting to process item 1..."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 1."
Pipeline failed: Error: API is temporarily down
*/
```

This "fail-fast" approach is brittle. A single, temporary network blip would cause the entire pipeline to terminate, even if subsequent items could have been processed successfully. While manual retry logic inside `processItem` is possible, it pollutes the core logic with concerns about timing and attempt counting, and is far less composable and reusable than a `Schedule`.

--- (Pattern Start: avoid-long-andthen-chains) ---

## Avoid Long Chains of .andThen; Use Generators Instead

**Rule:** Prefer generators over long chains of .andThen.

### Full Pattern Content:

# Avoid Long Chains of .andThen; Use Generators Instead

## Guideline

For sequential logic involving more than two steps, prefer `Effect.gen` over
chaining multiple `.andThen` or `.flatMap` calls.

## Rationale

`Effect.gen` provides a flat, linear code structure that is easier to read and
debug than deeply nested functional chains.

## Good Example

```typescript
import { Effect } from "effect";
declare const step1: () => Effect.Effect<any>;
declare const step2: (a: any) => Effect.Effect<any>;

Effect.gen(function* () {
  const a = yield* step1();
  const b = yield* step2(a);
  return b;
});
```

**Explanation:**  
Generators keep sequential logic readable and easy to maintain.

## Anti-Pattern

```typescript
import { Effect } from "effect";
declare const step1: () => Effect.Effect<any>;
declare const step2: (a: any) => Effect.Effect<any>;

step1().pipe(Effect.flatMap((a) => step2(a))); // Or .andThen
```

Chaining many `.flatMap` or `.andThen` calls leads to deeply nested,
hard-to-read code.

--- (Pattern Start: beyond-the-date-type) ---

## Beyond the Date Type - Real World Dates, Times, and Timezones

**Rule:** Use the Clock service for testable time-based logic and immutable primitives for timestamps.

### Full Pattern Content:

## Guideline

To handle specific points in time robustly in Effect, follow these principles:
1.  **Access "now" via the `Clock` service** (`Clock.currentTimeMillis`) instead of `Date.now()`.
2.  **Store and pass timestamps** as immutable primitives: `number` for UTC milliseconds or `string` for ISO 8601 format.
3.  **Perform calculations locally:** When you need to perform date-specific calculations (e.g., "get the day of the week"), create a `new Date(timestamp)` instance inside a pure computation, use it, and then discard it. Never hold onto mutable `Date` objects in your application state.

---

## Rationale

JavaScript's native `Date` object is a common source of bugs. It is mutable, its behavior can be inconsistent across different JavaScript environments (especially with timezones), and its reliance on the system clock makes time-dependent logic difficult to test.

Effect's approach solves these problems:
-   The **`Clock` service** abstracts away the concept of "now." In production, the `Live` clock uses the system time. In tests, you can provide a `TestClock` that gives you complete, deterministic control over the passage of time.
-   Using **primitive `number` or `string`** for timestamps ensures immutability and makes your data easy to serialize, store, and transfer.

This makes your time-based logic pure, predictable, and easy to test.

---

## Good Example

This example shows a function that creates a timestamped event. It depends on the `Clock` service, making it fully testable.

```typescript
import { Effect, Clock, Layer } from "effect";
import { TestClock } from "effect/TestClock";
import { describe, it, expect } from "vitest";

interface Event {
  readonly message: string;
  readonly timestamp: number; // Store as a primitive number (UTC millis)
}

// This function is pure and testable because it depends on Clock
const createEvent = (message: string): Effect.Effect<Event, never, Clock> =>
  Effect.gen(function* () {
    const timestamp = yield* Clock.currentTimeMillis;
    return { message, timestamp };
  });

// --- Testing the function ---
describe("createEvent", () => {
  it("should use the time from the TestClock", () =>
    Effect.gen(function* () {
      // Manually set the virtual time
      yield* TestClock.setTime(1672531200000); // Jan 1, 2023 UTC
      const event = yield* createEvent("User logged in");

      // The timestamp is predictable and testable
      expect(event.timestamp).toBe(1672531200000);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));
});
```

---

## Anti-Pattern

Directly using `Date.now()` or `new Date()` inside your effects. This introduces impurity and makes your logic dependent on the actual system clock, rendering it non-deterministic and difficult to test.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This function is impure and not reliably testable.
const createEventUnsafely = (message: string): Effect.Effect<any> =>
  Effect.sync(() => ({
    message,
    timestamp: Date.now(), // Direct call to a system API
  }));

// How would you test that this function assigns the correct timestamp
// without manipulating the system clock or using complex mocks?
```

--- (Pattern Start: build-a-basic-http-server) ---

## Build a Basic HTTP Server

**Rule:** Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

### Full Pattern Content:

## Guideline

To build an HTTP server, create a main `AppLayer` that provides all your application's services. Compile this layer into a managed `Runtime` at startup. Use this runtime to execute an `Effect` for each incoming HTTP request, ensuring all logic is handled within the Effect system.

---

## Rationale

This pattern demonstrates the complete lifecycle of a long-running Effect application.
1.  **Setup Phase:** You define all your application's dependencies (database connections, clients, config) in `Layer`s and compose them into a single `AppLayer`.
2.  **Runtime Creation:** You use `Layer.toRuntime(AppLayer)` to create a highly-optimized `Runtime` object. This is done *once* when the server starts.
3.  **Request Handling:** For each incoming request, you create an `Effect` that describes the work to be done (e.g., parse request, call services, create response).
4.  **Execution:** You use the `Runtime` you created in the setup phase to execute the request-handling `Effect` using `Runtime.runPromise`.

This architecture ensures that your request handling logic is fully testable, benefits from structured concurrency, and is completely decoupled from the server's setup and infrastructure.

---

## Good Example

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

## Anti-Pattern

Creating a new runtime or rebuilding layers for every single incoming request. This is extremely inefficient and defeats the purpose of Effect's `Layer` system.

```typescript
import * as http from "http";
import { Effect, Layer } from "effect";
import { GreeterLive } from "./somewhere";

// ❌ WRONG: This rebuilds the GreeterLive layer on every request.
const server = http.createServer((_req, res) => {
  const requestEffect = Effect.succeed("Hello!").pipe(
    Effect.provide(GreeterLive), // Providing the layer here is inefficient
  );
  Effect.runPromise(requestEffect).then((msg) => res.end(msg));
});
```

--- (Pattern Start: stream-collect-results) ---

## Collect All Results into a List

**Rule:** Use Stream.runCollect to execute a stream and collect all its emitted values into a Chunk.

### Full Pattern Content:

## Guideline

To execute a stream and collect all of its emitted values into a single, in-memory list, use the `Stream.runCollect` sink.

---

## Rationale

A "sink" is a terminal operator that consumes a stream and produces a final `Effect`. `Stream.runCollect` is the most fundamental sink. It provides the bridge from the lazy, pull-based world of `Stream` back to the familiar world of a single `Effect` that resolves with a standard data structure.

Using `Stream.runCollect` is essential when:

1.  **You Need the Final Result**: The goal of your pipeline is to produce a complete list of transformed items that you need to use in a subsequent step (e.g., to return as a single JSON array from an API).
2.  **Simplicity is Key**: It's the most straightforward way to "run" a stream and see its output. It declaratively states your intent: "execute this entire pipeline and give me all the results."
3.  **The Dataset is Bounded**: It's designed for streams where the total number of items is known to be finite and small enough to fit comfortably in memory.

The result of `Stream.runCollect` is an `Effect` that, when executed, yields a `Chunk` containing all the items emitted by the stream.

---

## Good Example

This example creates a stream of numbers, filters for only the even ones, transforms them into strings, and then uses `runCollect` to gather the final results into a `Chunk`.

```typescript
import { Effect, Stream, Chunk } from 'effect';

const program = Stream.range(1, 10).pipe(
  // Find all the even numbers
  Stream.filter((n) => n % 2 === 0),
  // Transform them into strings
  Stream.map((n) => `Even number: ${n}`),
  // Run the stream and collect the results
  Stream.runCollect
);

Effect.runPromise(program).then((results) => {
  console.log('Collected results:', Chunk.toArray(results));
});
/*
Output:
Collected results: [
  'Even number: 2',
  'Even number: 4',
  'Even number: 6',
  'Even number: 8',
  'Even number: 10'
]
*/
```

## Anti-Pattern

The anti-pattern is using `Stream.runCollect` on a stream that produces an unbounded or extremely large number of items. This will inevitably lead to an out-of-memory error.

```typescript
import { Effect, Stream } from 'effect';

// An infinite stream of numbers
const infiniteStream = Stream.range(1, Infinity);

const program = infiniteStream.pipe(
  // This will run forever, attempting to buffer an infinite number of items.
  Stream.runCollect
);

// This program will never finish and will eventually crash the process
// by consuming all available memory.
// Effect.runPromise(program);
console.log(
  'This code is commented out because it would cause an out-of-memory crash.'
);
```

This is a critical mistake because `runCollect` must hold every single item emitted by the stream in memory simultaneously. For pipelines that process huge files, infinite data sources, or are designed to run forever, `runCollect` is the wrong tool. In those cases, you should use a sink like `Stream.runDrain`, which processes items without collecting them.

--- (Pattern Start: comparing-data-by-value-with-structural-equality) ---

## Comparing Data by Value with Structural Equality

**Rule:** Use Data.struct or implement the Equal interface for value-based comparison of objects and classes.

### Full Pattern Content:

## Guideline

To compare objects or classes by their contents rather than by their memory reference, use one of two methods:
1.  **For plain data objects:** Define them with `Data.struct`.
2.  **For classes:** Extend `Data.Class` or implement the `Equal.Equal` interface.

Then, compare instances using the `Equal.equals(a, b)` function.

---

## Rationale

In JavaScript, comparing two non-primitive values with `===` checks for *referential equality*. It only returns `true` if they are the exact same instance in memory. This means two objects with identical contents are not considered equal, which is a common source of bugs.

```typescript
{ a: 1 } === { a: 1 } // false!
```

Effect solves this with **structural equality**. All of Effect's built-in data structures (`Option`, `Either`, `Chunk`, etc.) can be compared by their structure and values. By using helpers like `Data.struct`, you can easily give your own data structures this same powerful and predictable behavior.

---

## Good Example

We define two points using `Data.struct`. Even though `p1` and `p2` are different instances in memory, `Equal.equals` correctly reports them as equal because their contents match.

```typescript
import { Data, Equal } from "effect";

// Define a Point data type with structural equality
const Point = Data.struct({
  x: Data.number,
  y: Data.number,
});

const p1 = Point({ x: 1, y: 2 });
const p2 = Point({ x: 1, y: 2 });
const p3 = Point({ x: 3, y: 4 });

// Standard reference equality fails
console.log(p1 === p2); // false

// Structural equality works as expected
console.log(Equal.equals(p1, p2)); // true
console.log(Equal.equals(p1, p3)); // false
```

---

## Anti-Pattern

Relying on `===` for object or array comparison. This will lead to bugs when you expect two objects with the same values to be treated as equal, especially when working with data in collections, `Ref`s, or `Effect`'s success values.

```typescript
// ❌ WRONG: This will not behave as expected.
const user1 = { id: 1, name: "Paul" };
const user2 = { id: 1, name: "Paul" };

if (user1 === user2) {
  // This code block will never be reached.
  console.log("Users are the same.");
}

// Another common pitfall
const selectedUsers = [user1];
// This check will fail, even though a user with id 1 is in the array.
if (selectedUsers.includes({ id: 1, name: "Paul" })) {
  // ...
}
```

--- (Pattern Start: conditionally-branching-workflows) ---

## Conditionally Branching Workflows

**Rule:** Use predicate-based operators like Effect.filter and Effect.if to declaratively control workflow branching.

### Full Pattern Content:

### Pattern: `conditionally-branching-workflows.mdx`

## Guideline

To make decisions based on a successful value within an `Effect` pipeline, use predicate-based operators:
-   **To Validate and Fail:** Use `Effect.filter(predicate)` to stop the workflow if a condition is not met.
-   **To Choose a Path:** Use `Effect.if(condition, { onTrue, onFalse })` or `Effect.gen` to execute different effects based on a condition.

---

## Rationale

This pattern allows you to embed decision-making logic directly into your composition pipelines, making your code more declarative and readable. It solves two key problems:

1.  **Separation of Concerns:** It cleanly separates the logic of producing a value from the logic of validating or making decisions about that value.
2.  **Reusable Business Logic:** A predicate function (e.g., `const isAdmin = (user: User) => ...`) becomes a named, reusable, and testable piece of business logic, far superior to scattering inline `if` statements throughout your code.

Using these operators turns conditional logic into a composable part of your `Effect`, rather than an imperative statement that breaks the flow.

---

## Good Example: Validating a User

Here, we use `Effect.filter` with named predicates to validate a user before proceeding. The intent is crystal clear, and the business rules (`isActive`, `isAdmin`) are reusable.

```typescript
import { Effect } from "effect";

interface User {
  id: number;
  status: "active" | "inactive";
  roles: string[];
}

const findUser = (id: number): Effect.Effect<User, "DbError"> =>
  Effect.succeed({ id, status: "active", roles: ["admin"] });

// Reusable, testable predicates that document business rules.
const isActive = (user: User) => user.status === "active";
const isAdmin = (user: User) => user.roles.includes("admin");

const program = (id: number) =>
  findUser(id).pipe(
    // If this predicate is false, the effect fails.
    Effect.filter(isActive, () => "UserIsInactive" as const),
    // If this one is false, the effect fails.
    Effect.filter(isAdmin, () => "UserIsNotAdmin" as const),
    // This part only runs if both filters pass.
    Effect.map((user) => `Welcome, admin user #${user.id}!`),
  );

// We can then handle the specific failures in a type-safe way.
const handled = program(123).pipe(
  Effect.catchTag("UserIsNotAdmin", () =>
    Effect.succeed("Access denied: requires admin role."),
  ),
);
```

---

## Anti-Pattern

Using `Effect.flatMap` with a manual `if` statement and forgetting to handle the `else` case. This is a common mistake that leads to an inferred type of `Effect<void, ...>`, which can cause confusing type errors downstream because the success value is lost.

```typescript
import { Effect } from "effect";
import { findUser, isAdmin } from "./somewhere"; // From previous example

// ❌ WRONG: The `else` case is missing.
const program = (id: number) =>
  findUser(id).pipe(
    Effect.flatMap((user) => {
      if (isAdmin(user)) {
        // This returns Effect<User>, but what happens if the user is not an admin?
        return Effect.succeed(user);
      }
      // Because there's no `else` branch, TypeScript infers that this
      // block can also implicitly return `void`.
      // The resulting type is Effect<User | void, "DbError">, which is problematic.
    }),
    // This `map` will now have a type error because `u` could be `void`.
    Effect.map((u) => `Welcome, ${u.name}!`),
  );

// `Effect.filter` avoids this problem entirely by forcing a failure,
// which keeps the success channel clean and correctly typed.
```

### Why This is Better

*   **It's a Real Bug:** This isn't just a style issue; it's a legitimate logical error that leads to incorrect types and broken code.
*   **It's a Common Mistake:** Developers new to functional pipelines often forget that every path must return a value.
*   **It Reinforces the "Why":** It perfectly demonstrates *why* `Effect.filter` is superior: `filter` guarantees that if the condition fails, the computation fails, preserving the integrity of the success channel.

--- (Pattern Start: control-flow-with-combinators) ---

## Control Flow with Conditional Combinators

**Rule:** Use conditional combinators for control flow.

### Full Pattern Content:

# Control Flow with Conditional Combinators

## Guideline

Use declarative combinators like `Effect.if`, `Effect.when`, and
`Effect.unless` to execute effects based on runtime conditions.

## Rationale

These combinators allow you to embed conditional logic directly into your
`.pipe()` compositions, maintaining a declarative style for simple branching.

## Good Example

```typescript
import { Effect } from "effect";

const attemptAdminAction = (user: { isAdmin: boolean }) =>
  Effect.if(user.isAdmin, {
    onTrue: Effect.succeed("Admin action completed."),
    onFalse: Effect.fail("Permission denied."),
  });
```

**Explanation:**  
`Effect.if` and related combinators allow you to branch logic without leaving
the Effect world or breaking the flow of composition.

## Anti-Pattern

Using `Effect.gen` for a single, simple conditional check can be more verbose
than necessary. For simple branching, `Effect.if` is often more concise.

--- (Pattern Start: control-repetition-with-schedule) ---

## Control Repetition with Schedule

**Rule:** Use Schedule to create composable policies for controlling the repetition and retrying of effects.

### Full Pattern Content:

## Guideline

A `Schedule<In, Out>` is a highly-composable blueprint that defines a recurring schedule. It takes an input of type `In` (e.g., the error from a failed effect) and produces an output of type `Out` (e.g., the decision to continue). Use `Schedule` with operators like `Effect.repeat` and `Effect.retry` to control complex repeating logic.

---

## Rationale

While you could write manual loops or recursive functions, `Schedule` provides a much more powerful, declarative, and composable way to manage repetition. The key benefits are:

-   **Declarative:** You separate the *what* (the effect to run) from the *how* and *when* (the schedule it runs on).
-   **Composable:** You can build complex schedules from simple, primitive ones. For example, you can create a schedule that runs "up to 5 times, with an exponential backoff, plus some random jitter" by composing `Schedule.recurs`, `Schedule.exponential`, and `Schedule.jittered`.
-   **Stateful:** A `Schedule` keeps track of its own state (like the number of repetitions), making it easy to create policies that depend on the execution history.

---

## Good Example

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

## Anti-Pattern

Writing manual, imperative retry logic. This is verbose, stateful, hard to reason about, and not easily composable.

```typescript
import { Effect } from "effect";
import { flakyEffect } from "./somewhere";

// ❌ WRONG: Manual, stateful, and complex retry logic.
function manualRetry(
  effect: typeof flakyEffect,
  retriesLeft: number,
  delay: number,
): Effect.Effect<string, "ApiError"> {
  return effect.pipe(
    Effect.catchTag("ApiError", () => {
      if (retriesLeft > 0) {
        return Effect.sleep(delay).pipe(
          Effect.flatMap(() => manualRetry(effect, retriesLeft - 1, delay * 2)),
        );
      }
      return Effect.fail("ApiError" as const);
    }),
  );
}

const program = manualRetry(flakyEffect, 5, 100);
```

--- (Pattern Start: launch-http-server) ---

## Create a Basic HTTP Server

**Rule:** Use Http.server.serve with a platform-specific layer to run an HTTP application.

### Full Pattern Content:

## Guideline

To create and run a web server, define your application as an `Http.App` and execute it using `Http.server.serve`, providing a platform-specific layer like `NodeHttpServer.layer`.

---

## Rationale

In Effect, an HTTP server is not just a side effect; it's a managed, effectful process. The `@effect/platform` package provides a platform-agnostic API for defining HTTP applications, while packages like `@effect/platform-node` provide the concrete implementation.

The core function `Http.server.serve(app)` takes your application logic and returns an `Effect` that, when run, starts the server. This `Effect` is designed to run indefinitely, only terminating if the server crashes or is gracefully shut down.

This approach provides several key benefits:

1.  **Lifecycle Management**: The server's lifecycle is managed by the Effect runtime. This means structured concurrency applies, ensuring graceful shutdowns and proper resource handling automatically.
2.  **Integration**: The server is a first-class citizen in the Effect ecosystem. It can seamlessly access dependencies provided by `Layer`, use `Config` for configuration, and integrate with `Logger`.
3.  **Platform Agnosticism**: By coding to the `Http.App` interface, your application logic remains portable across different JavaScript runtimes (Node.js, Bun, Deno) by simply swapping out the platform layer.

---

## Good Example

This example creates a minimal server that responds to all requests with "Hello, World!". The application logic is a simple `Effect` that returns an `Http.response`. We use `NodeRuntime.runMain` to execute the server effect, which is the standard way to launch a long-running application.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// An Http.App is an Effect that takes a request and returns a response.
// For this basic server, we ignore the request and always return the same response.
const app = Http.response.text('Hello, World!');

// Http.server.serve takes our app and returns an Effect that will run the server.
// We provide the NodeHttpServer.layer to specify the port and the server implementation.
const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

// NodeRuntime.runMain is used to execute a long-running application.
// It ensures the program runs forever and handles graceful shutdown.
NodeRuntime.runMain(program);

/*
To run this:
1. Save as index.ts
2. Run `npx tsx index.ts`
3. Open http://localhost:3000 in your browser.
*/
```

## Anti-Pattern

The common anti-pattern is to use the raw Node.js `http` module directly, outside of the Effect runtime. This approach creates a disconnect between your application logic and the server's lifecycle.

```typescript
import * as http from 'http';

// Manually create a server using the Node.js built-in module.
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, World!');
});

// Manually start the server and log the port.
const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
```

This imperative approach is discouraged when building an Effect application because it forfeits all the benefits of the ecosystem. It runs outside of Effect's structured concurrency, cannot be managed by its resource-safe `Scope`, does not integrate with `Layer` for dependency injection, and requires manual error handling, making it less robust and much harder to compose with other effectful logic.

--- (Pattern Start: create-managed-runtime-for-scoped-resources) ---

## Create a Managed Runtime for Scoped Resources

**Rule:** Create a managed runtime for scoped resources.

### Full Pattern Content:

# Create a Managed Runtime for Scoped Resources

## Guideline

For services that manage resources needing explicit cleanup (e.g., a database
connection), define them in a `Layer` using `Layer.scoped`. Then, use
`Layer.launch` to provide this layer to your application.

## Rationale

`Layer.launch` is designed for resource safety. It acquires all resources,
provides them to your effect, and—crucially—guarantees that all registered
finalizers are executed upon completion or interruption.

## Good Example

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

## Anti-Pattern

Do not use `Layer.toRuntime` with layers that contain scoped resources. This
will acquire the resource, but the runtime has no mechanism to release it,
leading to resource leaks.

--- (Pattern Start: create-reusable-runtime-from-layers) ---

## Create a Reusable Runtime from Layers

**Rule:** Create a reusable runtime from layers.

### Full Pattern Content:

# Create a Reusable Runtime from Layers

## Guideline

For applications that need to run multiple effects (e.g., a web server), use
`Layer.toRuntime(appLayer)` to compile your dependency graph into a single,
reusable `Runtime` object.

## Rationale

Building the dependency graph from layers has a one-time cost. Creating a
`Runtime` once when your application starts is highly efficient for
long-running applications.

## Good Example

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

## Anti-Pattern

For a long-running application, avoid providing layers and running an effect
in a single operation. This forces Effect to rebuild the dependency graph on
every execution.

--- (Pattern Start: stream-from-iterable) ---

## Create a Stream from a List

**Rule:** Use Stream.fromIterable to begin a pipeline from an in-memory collection.

### Full Pattern Content:

## Guideline

To start a data pipeline from an existing in-memory collection like an array, use `Stream.fromIterable`.

---

## Rationale

Every data pipeline needs a source. The simplest and most common source is a pre-existing list of items in memory. `Stream.fromIterable` is the bridge from standard JavaScript data structures to the powerful, composable world of Effect's `Stream`.

This pattern is fundamental for several reasons:

1.  **Entry Point**: It's the "Hello, World!" of data pipelines, providing the easiest way to start experimenting with stream transformations.
2.  **Testing**: In tests, you frequently need to simulate a data source (like a database query or API call). Creating a stream from a mock array of data is the standard way to do this, allowing you to test your pipeline's logic in isolation.
3.  **Composability**: It transforms a static, eager data structure (an array) into a lazy, pull-based stream. This allows you to pipe it into the rest of the Effect ecosystem, enabling asynchronous operations, concurrency, and resource management in subsequent steps.

---

## Good Example

This example takes a simple array of numbers, creates a stream from it, performs a transformation on each number, and then runs the stream to collect the results.

```typescript
import { Effect, Stream, Chunk } from 'effect';

const numbers = [1, 2, 3, 4, 5];

// Create a stream from the array of numbers.
const program = Stream.fromIterable(numbers).pipe(
  // Perform a simple, synchronous transformation on each item.
  Stream.map((n) => `Item: ${n}`),
  // Run the stream and collect all the transformed items into a Chunk.
  Stream.runCollect
);

Effect.runPromise(program).then((processedItems) => {
  console.log(Chunk.toArray(processedItems));
});
/*
Output:
[ 'Item: 1', 'Item: 2', 'Item: 3', 'Item: 4', 'Item: 5' ]
*/
```

## Anti-Pattern

The common alternative is to use standard array methods like `.map()` or a `for...of` loop. While perfectly fine for simple, synchronous tasks, this approach is an anti-pattern when building a *pipeline*.

```typescript
const numbers = [1, 2, 3, 4, 5];

// Using Array.prototype.map
const processedItems = numbers.map((n) => `Item: ${n}`);

console.log(processedItems);
```

This is an anti-pattern in the context of building a larger pipeline because:

1.  **It's Not Composable with Effects**: The result is just a new array. If the next step in your pipeline was an asynchronous database call for each item, you couldn't simply `.pipe()` the result into it. You would have to leave the synchronous world of `.map()` and start a new `Effect.forEach`, breaking the unified pipeline structure.
2.  **It's Eager**: The `.map()` operation processes the entire array at once. `Stream` is lazy; it only processes items as they are requested by downstream consumers, which is far more efficient for large collections or complex transformations.

--- (Pattern Start: create-a-testable-http-client-service) ---

## Create a Testable HTTP Client Service

**Rule:** Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

### Full Pattern Content:

## Guideline

To interact with external APIs, define an `HttpClient` service. Create two separate `Layer` implementations for this service:
1.  **`HttpClientLive`**: The production implementation that uses a real HTTP client (like `fetch`) to make network requests.
2.  **`HttpClientTest`**: A test implementation that returns mock data, allowing you to test your business logic without making actual network calls.

---

## Rationale

Directly using `fetch` in your business logic makes it nearly impossible to test. Your tests would become slow, flaky (dependent on network conditions), and could have unintended side effects.

By abstracting the HTTP client into a service, you decouple your application's logic from the specific implementation of how HTTP requests are made. Your business logic depends only on the abstract `HttpClient` interface. In production, you provide the `Live` layer. In tests, you provide the `Test` layer. This makes your tests fast, deterministic, and reliable.

---

## Good Example

### 1. Define the Service

```typescript
// src/services/HttpClient.ts
import { Effect, Data } from "effect";

// Define potential errors
export class HttpError extends Data.TaggedError("HttpError")<{
  readonly error: unknown;
}> {}

// Define the service interface
export class HttpClient extends Effect.Tag("HttpClient")<
  HttpClient,
  {
    readonly get: (
      url: string,
    ) => Effect.Effect<unknown, HttpError>;
  }
>() {}
```

### 2. Create the Live Implementation

```typescript
// src/services/HttpClientLive.ts
import { Effect, Layer } from "effect";
import { HttpClient, HttpError } from "./HttpClient";

export const HttpClientLive = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: (url) =>
      Effect.tryPromise({
        try: () => fetch(url).then((res) => res.json()),
        catch: (error) => new HttpError({ error }),
      }),
  }),
);
```

### 3. Create the Test Implementation

```typescript
// src/services/HttpClientTest.ts
import { Effect, Layer } from "effect";
import { HttpClient } from "./HttpClient";

export const HttpClientTest = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: (url) => Effect.succeed({ mock: "data", url }),
  }),
);
```

### 4. Usage in Business Logic

Your business logic is now clean and only depends on the abstract `HttpClient`.

```typescript
// src/features/User/UserService.ts
import { Effect } from "effect";
import { HttpClient } from "../../services/HttpClient";

export const getUserFromApi = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient;
    const data = yield* client.get(`https://api.example.com/users/${id}`);
    // ... logic to parse and return user
    return data;
  });
```

---

## Anti-Pattern

Calling `fetch` directly from within your business logic functions. This creates a hard dependency on the global `fetch` API, making the function difficult to test and reuse.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This function is not easily testable.
export const getUserDirectly = (id: number) =>
  Effect.tryPromise({
    try: () => fetch(`https://api.example.com/users/${id}`).then((res) => res.json()),
    catch: () => "ApiError" as const,
  });
```

--- (Pattern Start: create-pre-resolved-effect) ---

## Create Pre-resolved Effects with succeed and fail

**Rule:** Create pre-resolved effects with succeed and fail.

### Full Pattern Content:

# Create Pre-resolved Effects with succeed and fail

## Guideline

To lift a pure, already-known value into an `Effect`, use `Effect.succeed()`.
To represent an immediate and known failure, use `Effect.fail()`.

## Rationale

These are the simplest effect constructors, essential for returning static
values within functions that must return an `Effect`.

## Good Example

```typescript
import { Effect, Data } from "effect";

const successEffect = Effect.succeed(42);

class MyError extends Data.TaggedError("MyError") {}
const failureEffect = Effect.fail(new MyError());
```

**Explanation:**  
Use `Effect.succeed` for values you already have, and `Effect.fail` for
immediate, known errors.

## Anti-Pattern

Do not wrap a static value in `Effect.sync`. While it works, `Effect.succeed`
is more descriptive and direct for values that are already available.

--- (Pattern Start: decouple-fibers-with-queue-pubsub) ---

## Decouple Fibers with Queues and PubSub

**Rule:** Use Queue for point-to-point work distribution and PubSub for broadcast messaging between fibers.

### Full Pattern Content:

## Guideline

To enable communication between independent, concurrent fibers, use one of Effect's specialized data structures:
-   **``Queue<A>``**: For distributing work items. Each item put on the queue is taken and processed by only **one** consumer.
-   **``PubSub<A>``**: For broadcasting events. Each message published is delivered to **every** subscriber.

---

## Rationale

Directly calling functions between different logical parts of a concurrent application creates tight coupling, making the system brittle and hard to scale. `Queue` and `PubSub` solve this by acting as asynchronous, fiber-safe message brokers.

This decouples the **producer** of a message from its **consumer(s)**. The producer doesn't need to know who is listening, or how many listeners there are. This allows you to build resilient, scalable systems where you can add or remove workers/listeners without changing the producer's code.

Furthermore, bounded `Queue`s and `PubSub`s provide automatic **back-pressure**. If consumers can't keep up, the producer will automatically pause before adding new items, preventing your system from becoming overloaded.

---

## Good Example 1: `Queue` for a Work Pool

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

## Good Example 2: `PubSub` for Event Broadcasting

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

## Anti-Pattern

Simulating a queue with a simple `Ref<A[]>`. This approach is inefficient due to polling and is not safe from race conditions without manual, complex locking mechanisms. It also lacks critical features like back-pressure.

```typescript
import { Effect, Ref } from "effect";

// ❌ WRONG: This is inefficient and prone to race conditions.
const program = Effect.gen(function* () {
  const queueRef = yield* Ref.make<string[]>([]);

  // Producer adds to the array
  const producer = Ref.update(queueRef, (q) => [...q, "new_item"]);

  // Consumer has to constantly poll the array to see if it's empty.
  const consumer = Ref.get(queueRef).pipe(
    Effect.flatMap((q) =>
      q.length > 0
        ? Ref.set(queueRef, q.slice(1)).pipe(Effect.as(q[0]))
        : Effect.sleep("1 second").pipe(Effect.flatMap(() => consumer)), // Inefficient polling
    ),
  );
});
```

--- (Pattern Start: define-config-schema) ---

## Define a Type-Safe Configuration Schema

**Rule:** Define a type-safe configuration schema.

### Full Pattern Content:

# Define a Type-Safe Configuration Schema

## Guideline

Define all external configuration values your application needs using the schema-building functions from `Effect.Config`, such as `Config.string` and `Config.number`.

## Rationale

This creates a single, type-safe source of truth for your configuration, eliminating runtime errors from missing or malformed environment variables and making the required configuration explicit.

## Good Example

```typescript
import { Config } from "effect";

const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  }),
);
```

**Explanation:**  
This schema ensures that both `host` and `port` are present and properly typed, and that their source is clearly defined.

## Anti-Pattern

Directly accessing `process.env`. This is not type-safe, scatters configuration access throughout your codebase, and can lead to parsing errors or `undefined` values.

--- (Pattern Start: define-contracts-with-schema) ---

## Define Contracts Upfront with Schema

**Rule:** Define contracts upfront with schema.

### Full Pattern Content:

# Define Contracts Upfront with Schema

## Guideline

Before writing implementation logic, define the shape of your data models and
function signatures using `Effect/Schema`.

## Rationale

This "schema-first" approach separates the "what" (the data shape) from the
"how" (the implementation). It provides a single source of truth for both
compile-time static types and runtime validation.

## Good Example

```typescript
import { Schema, Effect } from "effect";

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
});
type User = Schema.Schema.Type<typeof User>;

const DatabaseServiceSchema = Schema.Struct({
  getUser: Schema.Function(Schema.Number, Effect.Effect(User)),
});
```

**Explanation:**  
Defining schemas upfront clarifies your contracts and ensures both type safety
and runtime validation.

## Anti-Pattern

Defining logic with implicit `any` types first and adding validation later as
an afterthought. This leads to brittle code that lacks a clear contract.

--- (Pattern Start: define-tagged-errors) ---

## Define Type-Safe Errors with Data.TaggedError

**Rule:** Define type-safe errors with Data.TaggedError.

### Full Pattern Content:

# Define Type-Safe Errors with Data.TaggedError

## Guideline

For any distinct failure mode in your application, define a custom error class
that extends `Data.TaggedError`.

## Rationale

This gives each error a unique, literal `_tag` that Effect can use for type
discrimination with `Effect.catchTag`, making your error handling fully
type-safe.

## Good Example

```typescript
import { Data, Effect } from "effect";

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

const findUser = (id: number): Effect.Effect<any, DatabaseError> =>
  Effect.fail(new DatabaseError({ cause: "Connection timed out" }));
```

**Explanation:**  
Tagged errors allow you to handle errors in a type-safe, self-documenting way.

## Anti-Pattern

Using generic `Error` objects or strings in the error channel. This loses all
type information, forcing consumers to use `catchAll` and perform unsafe
checks.

--- (Pattern Start: distinguish-not-found-from-errors) ---

## Distinguish 'Not Found' from Errors

**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

### Full Pattern Content:

## Guideline

When a computation can fail (e.g., a network error) or succeed but find nothing, model its return type as ``Effect<Option<A>>``. This separates the "hard failure" channel from the "soft failure" (or empty) channel.

---

## Rationale

This pattern provides a precise way to handle three distinct outcomes of an operation:

1.  **Success with a value:** `Effect.succeed(Option.some(value))`
2.  **Success with no value:** `Effect.succeed(Option.none())` (e.g., user not found)
3.  **Failure:** `Effect.fail(new DatabaseError())` (e.g., database connection lost)

By using `Option` inside the success channel of an `Effect`, you keep the error channel clean for true, unexpected, or unrecoverable errors. The "not found" case is often an expected and recoverable part of your business logic, and `Option.none()` models this perfectly.

---

## Good Example

This function to find a user can fail if the database is down, or it can succeed but find no user. The return type ``Effect.Effect<Option.Option<User>, DatabaseError>`` makes this contract perfectly clear.

```typescript
import { Effect, Option, Data } from "effect";

interface User {
  id: number;
  name: string;
}
class DatabaseError extends Data.TaggedError("DatabaseError") {}

// This signature is extremely honest about its possible outcomes.
const findUserInDb = (
  id: number,
): Effect.Effect<Option.Option<User>, DatabaseError> =>
  Effect.gen(function* () {
    // This could fail with a DatabaseError
    const dbResult = yield* Effect.try({
      try: () => (id === 1 ? { id: 1, name: "Paul" } : null),
      catch: () => new DatabaseError(),
    });

    // We wrap the potentially null result in an Option
    return Option.fromNullable(dbResult);
  });

// The caller can now handle all three cases explicitly.
const program = (id: number) =>
  findUserInDb(id).pipe(
    Effect.match({
      onFailure: (error) => "Error: Could not connect to the database.",
      onSuccess: (maybeUser) =>
        Option.match(maybeUser, {
          onNone: () => `Result: User with ID ${id} was not found.`,
          onSome: (user) => `Result: Found user ${user.name}.`,
        }),
    }),
  );

## Anti-Pattern

A common alternative is to create a specific NotFoundError and put it in the error channel alongside other errors.

```typescript
class NotFoundError extends Data.TaggedError("NotFoundError") {}
	
	// ❌ This signature conflates two different kinds of failure.
	const findUserUnsafely = (
	  id: number,
	): Effect.Effect<User, DatabaseError | NotFoundError> => {
	  // ...
	  return Effect.fail(new NotFoundError());
	};
```

While this works, it can be less expressive. It treats a "not found" result—which might be a normal part of your application's flow—the same as a catastrophic DatabaseError. 

Using ```Effect<Option<A>>``` often leads to clearer and more precise business logic.

--- (Pattern Start: execute-with-runpromise) ---

## Execute Asynchronous Effects with Effect.runPromise

**Rule:** Execute asynchronous effects with Effect.runPromise.

### Full Pattern Content:

# Execute Asynchronous Effects with Effect.runPromise

## Guideline

To execute an `Effect` that may be asynchronous and retrieve its result, use
`Effect.runPromise`. This should only be done at the outermost layer of your
application.

## Rationale

`Effect.runPromise` is the bridge from the Effect world to the Promise-based
world of Node.js and browsers. If the Effect succeeds, the Promise resolves;
if it fails, the Promise rejects.

## Good Example

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

## Anti-Pattern

Never call `runPromise` inside another `Effect` composition. Effects are
meant to be composed together *before* being run once at the end.

--- (Pattern Start: execute-long-running-apps-with-runfork) ---

## Execute Long-Running Apps with Effect.runFork

**Rule:** Use Effect.runFork to launch a long-running application as a manageable, detached fiber.

### Full Pattern Content:

## Guideline

To launch a long-running application (like a server or daemon) as a non-blocking, top-level process, use `Effect.runFork`. It immediately returns a `Fiber` representing your running application, which you can use to manage its lifecycle.

---

## Rationale

Unlike `Effect.runPromise`, which waits for the effect to complete, `Effect.runFork` starts the effect and immediately returns a `Fiber`. This is the ideal way to run an application that is meant to run forever, because it gives you a handle to the process.

The most critical use case for this is enabling graceful shutdown. You can start your application with `runFork`, and then set up listeners for OS signals (like `SIGINT` for Ctrl+C). When a shutdown signal is received, you call `Fiber.interrupt` on the application fiber, which guarantees that all finalizers (like closing database connections) are run before the process exits.

---

## Good Example

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

## Anti-Pattern

Using `runFork` when you immediately need the result of the effect. If you call `runFork` and then immediately call `Fiber.join` on the result, you have simply implemented a more complex and less direct version of `runPromise`.

```typescript
import { Effect, Fiber } from "effect";

const someEffect = Effect.succeed(42);

// ❌ WRONG: This is just a complicated way to write `Effect.runPromise(someEffect)`
const resultPromise = Effect.runFork(someEffect).pipe(Fiber.join, Effect.runPromise);
```

--- (Pattern Start: execute-with-runsync) ---

## Execute Synchronous Effects with Effect.runSync

**Rule:** Execute synchronous effects with Effect.runSync.

### Full Pattern Content:

# Execute Synchronous Effects with Effect.runSync

## Guideline

To execute an `Effect` that is guaranteed to be synchronous, use
`Effect.runSync`. This will return the success value directly or throw the
error.

## Rationale

`Effect.runSync` is an optimized runner for Effects that don't involve any
asynchronous operations. If the Effect contains any async operations,
`runSync` will throw an error.

## Good Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed(10).pipe(Effect.map((n) => n * 2));

const result = Effect.runSync(program); // result is 20
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

## Anti-Pattern

Do not use `runSync` on an Effect that contains asynchronous operations like
`Effect.delay` or `Effect.promise`. This will result in a runtime error.

--- (Pattern Start: extract-path-parameters) ---

## Extract Path Parameters

**Rule:** Define routes with colon-prefixed parameters (e.g., /users/:id) and access their values within the handler.

### Full Pattern Content:

## Guideline

To capture dynamic parts of a URL, define your route path with a colon-prefixed placeholder (e.g., `/users/:userId`) and access the parsed parameters within your handler `Effect`.

---

## Rationale

APIs often need to operate on specific resources identified by a unique key in the URL, such as `/products/123` or `/orders/abc`. The `Http.router` provides a clean, declarative way to handle these dynamic paths without resorting to manual string parsing.

By defining parameters directly in the path string, you gain several benefits:

1.  **Declarative**: The route's structure is immediately obvious from its definition. The code clearly states, "this route expects a dynamic segment here."
2.  **Safe and Robust**: The router handles the logic of extracting the parameter. This is less error-prone and more robust than manually splitting or using regular expressions on the URL string.
3.  **Clean Handler Logic**: The business logic inside your handler is separated from the concern of URL parsing. The handler simply receives the parameters it needs to do its job.
4.  **Composability**: This pattern composes perfectly with the rest of the `Http` module, allowing you to build complex and well-structured APIs.

---

## Good Example

This example defines a route that captures a `userId`. The handler for this route accesses the parsed parameters and uses the `userId` to construct a personalized greeting. The router automatically makes the parameters available to the handler.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// Define a route with a dynamic parameter `:userId`.
const userRoute = Http.router.get(
  '/users/:userId',
  // The handler is an Effect that can access the request.
  Http.request.ServerRequest.pipe(
    Effect.flatMap((req) =>
      // The router automatically parses params and makes them available on the request.
      Http.response.text(`Hello, user ${req.params.userId}!`)
    )
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(userRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);

/*
To run this:
- GET http://localhost:3000/users/123 -> "Hello, user 123!"
- GET http://localhost:3000/users/abc -> "Hello, user abc!"
- GET http://localhost:3000/users/ -> 404 Not Found
*/
```

## Anti-Pattern

The anti-pattern is to manually parse the URL string inside the handler. This approach is brittle, imperative, and mixes concerns.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// This route matches any sub-path of /users/, forcing manual parsing.
const app = Http.router.get(
  '/users/*', // Using a wildcard
  Http.request.ServerRequest.pipe(
    Effect.flatMap((req) => {
      // Manually split the URL to find the ID.
      const parts = req.url.split('/'); // e.g., ['', 'users', '123']
      if (parts.length === 3 && parts[2]) {
        const userId = parts[2];
        return Http.response.text(`Hello, user ${userId}!`);
      }
      // Manual handling for missing ID.
      return Http.response.empty({ status: 404 });
    })
  )
);

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

This manual method is highly discouraged. It's fragile—a change in the base path or an extra slash could break the logic (`parts[2]`). It's also not declarative; the intent is hidden inside imperative code. The router's built-in parameter handling is safer, clearer, and the correct approach.

--- (Pattern Start: handle-get-request) ---

## Handle a GET Request

**Rule:** Use Http.router.get to associate a URL path with a specific response Effect.

### Full Pattern Content:

## Guideline

To handle specific URL paths, create individual routes using `Http.router` functions (like `Http.router.get`) and combine them into a single `Http.App`.

---

## Rationale

A real application needs to respond differently to different URLs. The `Http.router` provides a declarative, type-safe, and composable way to manage this routing logic. Instead of a single handler with complex conditional logic, you define many small, focused handlers and assign them to specific paths and HTTP methods.

This approach has several advantages:

1.  **Declarative and Readable**: Your code clearly expresses the mapping between a URL path and its behavior, making the application's structure easy to understand.
2.  **Composability**: Routers are just values that can be created, combined, and passed around. This makes it easy to organize routes into logical groups (e.g., a `userRoutes` router and a `productRoutes` router) and merge them.
3.  **Type Safety**: The router ensures that the handler for a route is only ever called for a matching request, simplifying the logic within the handler itself.
4.  **Integration**: Each route handler is an `Effect`, meaning it has full access to dependency injection, structured concurrency, and integrated error handling, just like any other part of an Effect application.

---

## Good Example

This example defines two separate GET routes, one for the root path (`/`) and one for `/hello`. We create an empty router and add each route to it. The resulting `app` is then served. The router automatically handles sending a `404 Not Found` response for any path that doesn't match.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// Define a handler for the root path
const rootRoute = Http.router.get(
  '/',
  Effect.succeed(Http.response.text('Welcome to the home page!'))
);

// Define a handler for the /hello path
const helloRoute = Http.router.get(
  '/hello',
  Effect.succeed(Http.response.text('Hello, Effect!'))
);

// Create an application by combining multiple routes.
// Start with an empty router and add each route.
const app = Http.router.empty.pipe(
  Http.router.addRoute(rootRoute),
  Http.router.addRoute(helloRoute)
);

// Serve the router application
const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);

/*
To run this:
- GET http://localhost:3000/ -> "Welcome to the home page!"
- GET http://localhost:3000/hello -> "Hello, Effect!"
- GET http://localhost:3000/other -> 404 Not Found
*/
```

## Anti-Pattern

The anti-pattern is to create a single, monolithic handler that uses conditional logic to inspect the request URL. This imperative approach is difficult to maintain and scale.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// A single app that manually checks the URL
const app = Http.request.ServerRequest.pipe(
  Effect.flatMap((req) => {
    if (req.url === '/') {
      return Effect.succeed(Http.response.text('Welcome to the home page!'));
    } else if (req.url === '/hello') {
      return Effect.succeed(Http.response.text('Hello, Effect!'));
    } else {
      return Effect.succeed(Http.response.empty({ status: 404 }));
    }
  })
);

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

This manual routing logic is verbose, error-prone (a typo in a string breaks the route), and mixes the "what" (the response) with the "where" (the routing). It doesn't scale to handle different HTTP methods, path parameters, or middleware gracefully. The `Http.router` is designed to solve all of these problems elegantly.

--- (Pattern Start: handle-api-errors) ---

## Handle API Errors

**Rule:** Model application errors as typed classes and use Http.server.serveOptions to map them to specific HTTP responses.

### Full Pattern Content:

## Guideline

Define specific error types for your application logic and use `Http.server.serveOptions` with a custom `unhandledErrorResponse` function to map those errors to appropriate HTTP status codes and responses.

---

## Rationale

By default, any unhandled failure in an Effect route handler results in a generic `500 Internal Server Error`. This is a safe default, but it's not helpful for API clients who need to know *why* their request failed. Was it a client-side error (like a non-existent resource, `404`) or a true server-side problem (`500`)?

Centralizing error handling at the server level provides a clean separation of concerns:

1.  **Domain-Focused Logic**: Your business logic can fail with specific, descriptive errors (e.g., `UserNotFoundError`) without needing any knowledge of HTTP status codes.
2.  **Centralized Mapping**: You define the mapping from application errors to HTTP responses in a single location. This makes your API's error handling consistent and easy to maintain. If you need to change how an error is reported, you only change it in one place.
3.  **Type Safety**: Using `Data.TaggedClass` for your errors allows you to use `Match` to exhaustively handle all known error cases, preventing you from forgetting to map a specific error type.
4.  **Clear Client Communication**: It produces a predictable and useful API, allowing clients to programmatically react to different failure scenarios.

---

## Good Example

This example defines two custom error types, `UserNotFoundError` and `InvalidIdError`. The route logic can fail with either. The `unhandledErrorResponse` function inspects the error and returns a `404` or `400` response accordingly, with a generic `500` for any other unexpected errors.

```typescript
import { Effect, Data, Match } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// Define specific, typed errors for our domain
class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{ id: string }> {}
class InvalidIdError extends Data.TaggedError('InvalidIdError')<{ id:string }> {}

// A mock database function that can fail with our specific errors
const getUser = (id: string) => {
  if (!id.startsWith('user_')) {
    return Effect.fail(new InvalidIdError({ id }));
  }
  if (id === 'user_123') {
    return Effect.succeed({ id, name: 'Paul' });
  }
  return Effect.fail(new UserNotFoundError({ id }));
};

const userRoute = Http.router.get(
  '/users/:userId',
  Effect.flatMap(Http.request.ServerRequest, (req) => getUser(req.params.userId)).pipe(
    Effect.map(Http.response.json)
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(userRoute));

// Centralized error handling logic
const program = Http.server.serve(app).pipe(
  Http.server.serveOptions({
    unhandledErrorResponse: (error) =>
      Match.value(error).pipe(
        Match.tag('UserNotFoundError', (e) =>
          Http.response.text(`User ${e.id} not found`, { status: 404 })
        ),
        Match.tag('InvalidIdError', (e) =>
          Http.response.text(`ID ${e.id} is not a valid format`, { status: 400 })
        ),
        Match.orElse(() => Http.response.empty({ status: 500 }))
      ),
  }),
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

## Anti-Pattern

The anti-pattern is to handle HTTP-specific error logic inside each route handler using functions like `Effect.catchTag`.

```typescript
import { Effect, Data } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{ id: string }> {}
// ... same getUser function and error classes

const userRoute = Http.router.get(
  '/users/:userId',
  Effect.flatMap(Http.request.ServerRequest, (req) => getUser(req.params.userId)).pipe(
    Effect.map(Http.response.json),
    // Manually catching errors inside the route logic
    Effect.catchTag('UserNotFoundError', (e) =>
      Http.response.text(`User ${e.id} not found`, { status: 404 })
    ),
    Effect.catchTag('InvalidIdError', (e) =>
      Http.response.text(`ID ${e.id} is not a valid format`, { status: 400 })
    )
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(userRoute));

// No centralized error handling
const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

This approach is problematic because it pollutes the business logic of the route handler with details about HTTP status codes. It's also highly repetitive; if ten different routes could produce a `UserNotFoundError`, you would need to copy this `catchTag` logic into all ten of them, making the API difficult to maintain.

--- (Pattern Start: handle-errors-with-catch) ---

## Handle Errors with catchTag, catchTags, and catchAll

**Rule:** Handle errors with catchTag, catchTags, and catchAll.

### Full Pattern Content:

# Handle Errors with catchTag, catchTags, and catchAll

## Guideline

To recover from failures, use the `catch*` family of functions.
`Effect.catchTag` for specific tagged errors, `Effect.catchTags` for multiple,
and `Effect.catchAll` for any error.

## Rationale

Effect's structured error handling allows you to build resilient applications.
By using tagged errors and `catchTag`, you can handle different failure
scenarios with different logic in a type-safe way.

## Good Example

```typescript
import { Data, Effect } from "effect";

class FooError extends Data.TaggedError("FooError") {}

const program: Effect.Effect<string, FooError> = Effect.fail(new FooError());

const handled = program.pipe(
  Effect.catchTag("FooError", (error) => Effect.succeed("Caught a Foo!")),
);
```

**Explanation:**  
Use `catchTag` to handle specific error types in a type-safe, composable way.

## Anti-Pattern

Using `try/catch` blocks inside your Effect compositions. It breaks the
declarative flow and bypasses Effect's powerful, type-safe error channels.

--- (Pattern Start: handle-flaky-operations-with-retry-timeout) ---

## Handle Flaky Operations with Retries and Timeouts

**Rule:** Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing effects.

### Full Pattern Content:

## Guideline

To build robust applications that can withstand unreliable external systems, apply two key operators to your effects:
-   **`Effect.retry(policy)`**: To automatically re-run a failing effect according to a schedule.
-   **`Effect.timeout(duration)`**: To interrupt an effect that takes too long to complete.

---

## Rationale

In distributed systems, failure is normal. APIs can fail intermittently, and network latency can spike. Hard-coding your application to try an operation only once makes it brittle.

-   **Retries:** The `Effect.retry` operator, combined with a `Schedule` policy, provides a powerful, declarative way to handle transient failures. Instead of writing complex `try/catch` loops, you can simply define a policy like "retry 3 times, with an exponential backoff delay between attempts."

-   **Timeouts:** An operation might not fail, but instead hang indefinitely. `Effect.timeout` prevents this by racing your effect against a timer. If your effect doesn't complete within the specified duration, it is automatically interrupted, preventing your application from getting stuck.

Combining these two patterns is a best practice for any interaction with an external service.

---

## Good Example

This program attempts to fetch data from a flaky API. It will retry the request up to 3 times with increasing delays if it fails. It will also give up entirely if any single attempt takes longer than 2 seconds.

```typescript
import { Effect, Schedule, Duration } from "effect";

// A flaky API call that might fail or be slow
const flakyApiCall = Effect.tryPromise({
  try: async () => {
    if (Math.random() > 0.3) {
      console.log("API call failed, will retry...");
      throw new Error("API Error");
    }
    await new Promise((res) => setTimeout(res, Math.random() * 3000)); // Slow call
    return { data: "some important data" };
  },
  catch: () => "ApiError" as const,
});

// Define a retry policy: exponential backoff, up to 3 retries
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.compose(Schedule.recurs(3)),
);

const program = flakyApiCall.pipe(
  // Apply the timeout to each individual attempt
  Effect.timeout("2 seconds"),
  // Apply the retry policy to the entire timed-out effect
  Effect.retry(retryPolicy),
);

Effect.runPromise(program).then(console.log).catch(console.error);
```

---

## Anti-Pattern

Writing manual retry and timeout logic. This is verbose, complex, and easy to get wrong. It clutters your business logic with concerns that Effect can handle declaratively.

```typescript
// ❌ WRONG: Manual, complex, and error-prone logic.
async function manualRetryAndTimeout() {
  for (let i = 0; i < 3; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch("...", { signal: controller.signal });
      clearTimeout(timeoutId);

      return await response.json();
    } catch (error) {
      if (i === 2) throw error; // Last attempt, re-throw
      await new Promise((res) => setTimeout(res, 100 * 2 ** i)); // Manual backoff
    }
  }
}
```

--- (Pattern Start: handle-unexpected-errors-with-cause) ---

## Handle Unexpected Errors by Inspecting the Cause

**Rule:** Handle unexpected errors by inspecting the cause.

### Full Pattern Content:

# Handle Unexpected Errors by Inspecting the Cause

## Guideline

To build truly resilient applications, differentiate between known business
errors (`Fail`) and unknown defects (`Die`). Use `Effect.catchAllCause` to
inspect the full `Cause` of a failure.

## Rationale

The `Cause` object explains *why* an effect failed. A `Fail` is an expected
error (e.g., `ValidationError`). A `Die` is an unexpected defect (e.g., a
thrown exception). They should be handled differently.

## Good Example

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

## Anti-Pattern

Using a simple `Effect.catchAll` can dangerously conflate expected errors and
unexpected defects, masking critical bugs as recoverable errors.

--- (Pattern Start: implement-graceful-shutdown) ---

## Implement Graceful Shutdown for Your Application

**Rule:** Use Effect.runFork and OS signal listeners to implement graceful shutdown for long-running applications.

### Full Pattern Content:

## Guideline

To enable graceful shutdown for a long-running application:
1.  Define services with cleanup logic in `scoped` `Layer`s using `Effect.addFinalizer` or `Effect.acquireRelease`.
2.  Launch your main application `Effect` using `Effect.runFork` to get a `Fiber` handle to the running process.
3.  Set up listeners for process signals like `SIGINT` (Ctrl+C) and `SIGTERM`.
4.  In the signal handler, call `Fiber.interrupt` on your application's fiber.

---

## Rationale

When a server process is terminated, you need to ensure that it cleans up properly. This includes closing database connections, finishing in-flight requests, and releasing file handles. Failing to do so can lead to resource leaks or data corruption.

Effect's structured concurrency makes this robust and easy. When a fiber is interrupted, Effect guarantees that it will run all finalizers registered within that fiber's scope, in the reverse order they were acquired.

By launching your app with `runFork`, you get a `Fiber` that represents the entire application. Triggering `Fiber.interrupt` on this top-level fiber initiates a clean, orderly shutdown sequence for all its resources.

---

## Good Example

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

## Anti-Pattern

Letting the Node.js process exit without proper cleanup. If you run a long-running effect with `Effect.runPromise` or don't handle OS signals, pressing Ctrl+C will terminate the process abruptly, and none of your `Effect` finalizers will have a chance to run.

```typescript
import { Effect } from "effect";
import { app } from "./somewhere"; // From previous example

// ❌ WRONG: This will run the server, but Ctrl+C will kill it instantly.
// The database connection finalizer will NOT be called.
Effect.runPromise(app);
```

--- (Pattern Start: leverage-structured-logging) ---

## Leverage Effect's Built-in Structured Logging

**Rule:** Leverage Effect's built-in structured logging.

### Full Pattern Content:

# Leverage Effect's Built-in Structured Logging

## Guideline

Use the built-in `Effect.log*` family of functions for all application logging
instead of using `console.log`.

## Rationale

Effect's logger is structured, context-aware (with trace IDs), configurable
via `Layer`, and testable. It's a first-class citizen, not an unmanaged
side-effect.

## Good Example

```typescript
import { Effect, Layer, Logger } from "effect";

const program = Effect.logDebug("Processing user", { userId: 123 });

// In production, this log might be hidden by default.
// To enable it, provide a Layer.
const DebugLayer = Logger.withMinimumLogLevel(Logger.Level.Debug);
const runnable = Effect.provide(program, DebugLayer);
```

**Explanation:**  
Using Effect's logging system ensures your logs are structured, filterable,
and context-aware.

## Anti-Pattern

Calling `console.log` directly within an Effect composition. This is an
unmanaged side-effect that bypasses all the benefits of Effect's logging system.

--- (Pattern Start: make-http-client-request) ---

## Make an Outgoing HTTP Client Request

**Rule:** Use the Http.client module to make outgoing requests to keep the entire operation within the Effect ecosystem.

### Full Pattern Content:

## Guideline

To call an external API from within your server, use the `Http.client` module. This creates an `Effect` that represents the outgoing request, keeping it fully integrated with the Effect runtime.

---

## Rationale

An API server often needs to communicate with other services. While you could use the native `fetch` API, this breaks out of the Effect ecosystem and forfeits its most powerful features. Using the built-in `Http.client` is superior for several critical reasons:

1.  **Full Integration**: An `Http.client` request is a first-class `Effect`. This means it seamlessly composes with all other effects. You can add timeouts, retry logic (`Schedule`), or race it with other operations using the standard Effect operators you already know.
2.  **Structured Concurrency**: This is a key benefit. If the original incoming request to your server is cancelled or times out, Effect will automatically interrupt the outgoing `Http.client` request. A raw `fetch` call would continue running in the background, wasting resources.
3.  **Typed Errors**: The client provides a rich set of typed errors (e.g., `Http.error.RequestError`, `Http.error.ResponseError`). This allows you to write precise error handling logic to distinguish between a network failure and a non-2xx response from the external API.
4.  **Testability**: The `Http.client` can be provided via a `Layer`, making it trivial to mock in tests. You can test your route's logic without making actual network calls, leading to faster and more reliable tests.

---

## Good Example

This example creates a proxy endpoint. A request to `/proxy/posts/1` on our server will trigger an outgoing request to the JSONPlaceholder API. The response is then parsed and relayed back to the original client.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

const proxyRoute = Http.router.get(
  '/proxy/posts/:id',
  Effect.flatMap(Http.request.ServerRequest, (req) =>
    // 1. Create a GET request to the external API.
    Http.client.request.get(`https://jsonplaceholder.typicode.com/posts/${req.params.id}`).pipe(
      // 2. Execute it with the default client and ensure a 2xx response.
      Http.client.request.filterStatusOk,
      // 3. Parse the response body as JSON.
      Effect.flatMap(Http.client.response.json),
      // 4. Map the successful result to our server's JSON response.
      Effect.map(Http.response.json),
      // 5. If any step fails (network, status, parsing), return a 502 error.
      Effect.catchAll(() =>
        Http.response.text('Error communicating with external service', {
          status: 502, // Bad Gateway
        })
      )
    )
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(proxyRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

## Anti-Pattern

The anti-pattern is to use `fetch` inside a route handler, wrapped in `Effect.tryPromise`. This approach requires manual error handling and loses the benefits of the Effect ecosystem.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

const proxyRoute = Http.router.get(
  '/proxy/posts/:id',
  Effect.flatMap(Http.request.ServerRequest, (req) =>
    // Manually wrap fetch in an Effect
    Effect.tryPromise({
      try: () => fetch(`https://jsonplaceholder.typicode.com/posts/${req.params.id}`),
      catch: () => 'FetchError', // Untyped error
    }).pipe(
      Effect.flatMap((res) =>
        // Manually check status and parse JSON, each with its own error case
        res.ok
          ? Effect.tryPromise({ try: () => res.json(), catch: () => 'JsonError' })
          : Effect.fail('BadStatusError')
      ),
      Effect.map(Http.response.json),
      // A generic catch-all because we can't easily distinguish error types
      Effect.catchAll(() => Http.response.text('An unknown error occurred', { status: 500 }))
    )
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(proxyRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

This manual approach is significantly more complex and less safe. It forces you to reinvent status and parsing logic, uses untyped string-based errors, and most importantly, the `fetch` call will not be automatically interrupted if the parent request is cancelled.

--- (Pattern Start: manage-resource-lifecycles-with-scope) ---

## Manage Resource Lifecycles with Scope

**Rule:** Use Scope for fine-grained, manual control over resource lifecycles and cleanup guarantees.

### Full Pattern Content:

## Guideline

A `Scope` is a context that collects finalizers (cleanup effects). When you need fine-grained control over resource lifecycles, you can work with `Scope` directly. The most common pattern is to create a resource within a scope using `Effect.acquireRelease` and then use it via `Effect.scoped`.

---

## Rationale

`Scope` is the fundamental building block for all resource management in Effect. While higher-level APIs like `Layer.scoped` and `Stream` are often sufficient, understanding `Scope` is key to advanced use cases.

A `Scope` guarantees that any finalizers added to it will be executed when the scope is closed, regardless of whether the associated computation succeeds, fails, or is interrupted. This provides a rock-solid guarantee against resource leaks.

This is especially critical in concurrent applications. When a parent fiber is interrupted, it closes its scope, which in turn automatically interrupts all its child fibers and runs all their finalizers in a structured, predictable order.

---

## Good Example

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

## Anti-Pattern

Manual resource management without the guarantees of `Scope`. This is brittle because if an error occurs after the resource is acquired but before it's released, the release logic is never executed.

```typescript
import { Effect } from "effect";
import { acquireFile, releaseFile } from "./somewhere"; // From previous example

// ❌ WRONG: This will leak the resource if an error happens.
const program = Effect.gen(function* () {
  const file = yield* acquireFile;

  // If this operation fails...
  yield* Effect.fail("Something went wrong!");

  // ...this line will never be reached, and the file will never be closed.
  yield* releaseFile;
});
```

--- (Pattern Start: stream-manage-resources) ---

## Manage Resources Safely in a Pipeline

**Rule:** Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

### Full Pattern Content:

## Guideline

To safely manage a resource that has an open/close lifecycle (like a file handle or database connection) for the duration of a stream, use the `Stream.acquireRelease` constructor.

---

## Rationale

What happens if a pipeline processing a file fails halfway through? In a naive implementation, the file handle might be left open, leading to a resource leak. Over time, these leaks can exhaust system resources and crash your application.

`Stream.acquireRelease` is Effect's robust solution to this problem. It's built on `Scope`, Effect's fundamental resource-management tool.

1.  **Guaranteed Cleanup**: You provide an `acquire` effect to open the resource and a `release` effect to close it. Effect guarantees that the `release` effect will be called when the stream terminates, for *any* reason: successful completion, a processing failure, or even external interruption.
2.  **Declarative and Co-located**: The logic for a resource's entire lifecycle—acquisition, usage (the stream itself), and release—is defined in one place. This makes the code easier to understand and reason about compared to manual `try/finally` blocks.
3.  **Prevents Resource Leaks**: It is the idiomatic way to build truly resilient pipelines that do not leak resources, which is essential for long-running, production-grade applications.
4.  **Composability**: The resulting stream is just a normal `Stream`, which can be composed with any other stream operators.

---

## Good Example

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

## Anti-Pattern

The anti-pattern is to manage resources manually outside the stream's context. This is brittle and almost always leads to resource leaks when errors occur.

```typescript
import { Effect, Stream } from 'effect';
import { NodeFileSystem } from '@effect/platform-node';
import * as path from 'node:path';

const program = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, 'temp-resource-bad.txt');

  // 1. Resource acquired manually before the stream
  yield* fs.writeFileString(filePath, 'data 1\ndata 2');
  const readable = fs.createReadStream(filePath);
  yield* Effect.log('Resource acquired manually.');

  const stream = Stream.fromReadable(() => readable).pipe(
    Stream.decodeText('utf-8'),
    Stream.splitLines,
    // This stream will fail, causing the run to reject.
    Stream.map(() => {
      throw new Error('Something went wrong!');
    })
  );

  // 2. Stream is executed
  yield* Stream.runDrain(stream);

  // 3. This release logic is NEVER reached if the stream fails.
  yield* fs.remove(filePath);
  yield* Effect.log('Resource released manually. (This will not be logged)');
});

Effect.runPromiseExit(program).then((exit) => {
  if (exit._tag === 'Failure') {
    console.log('\nPipeline failed. The temp file was NOT deleted.');
  }
});
```

In this anti-pattern, the `fs.remove` call is unreachable because the `Stream.runDrain` effect fails, causing the `gen` block to terminate immediately. The temporary file is leaked onto the disk. `Stream.acquireRelease` solves this problem entirely.

--- (Pattern Start: manage-shared-state-with-ref) ---

## Manage Shared State Safely with Ref

**Rule:** Use Ref to manage shared, mutable state concurrently, ensuring atomicity.

### Full Pattern Content:

## Guideline

When you need to share mutable state between different concurrent fibers, create a `Ref<A>`. Use `Ref.get` to read the value and `Ref.update` or `Ref.set` to modify it. All operations on a `Ref` are atomic.

---

## Rationale

Directly using a mutable variable (e.g., `let myState = ...`) in a concurrent system is dangerous. Multiple fibers could try to read and write to it at the same time, leading to race conditions and unpredictable results.

`Ref` solves this by wrapping the state in a fiber-safe container. It's like a synchronized, in-memory cell. All operations on a `Ref` are atomic effects, guaranteeing that updates are applied correctly without being interrupted or interleaved with other updates. This eliminates race conditions and ensures data integrity.

---

## Good Example

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

## Anti-Pattern

The anti-pattern is using a standard JavaScript variable for shared state. The following example is not guaranteed to produce the correct result.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This is a classic race condition.
const programWithRaceCondition = Effect.gen(function* () {
  let count = 0; // A plain, mutable variable

  // An effect that reads, increments, and writes the variable
  const increment = Effect.sync(() => {
    const current = count;
    // Another fiber could run between this read and the write below!
    count = current + 1;
  });

  const tasks = Array.from({ length: 1000 }, () => increment);

  yield* Effect.all(tasks, { concurrency: "unbounded" });

  return count;
});

// The result is unpredictable and will likely be less than 1000.
Effect.runPromise(programWithRaceCondition).then(console.log);
```

--- (Pattern Start: mapping-errors-to-fit-your-domain) ---

## Mapping Errors to Fit Your Domain

**Rule:** Use Effect.mapError to transform errors and create clean architectural boundaries between layers.

### Full Pattern Content:

## Guideline

When an inner service can fail with specific errors, use `Effect.mapError` in the outer service to catch those specific errors and transform them into a more general error suitable for its own domain.

---

## Rationale

This pattern is essential for creating clean architectural boundaries and preventing "leaky abstractions." An outer layer of your application (e.g., a `UserService`) should not expose the internal failure details of the layers it depends on (e.g., a `Database` that can fail with `ConnectionError` or `QueryError`).

By using `Effect.mapError`, the outer layer can define its own, more abstract error type (like `RepositoryError`) and map all the specific, low-level errors into it. This decouples the layers. If you later swap your database implementation, you only need to update the mapping logic within the repository layer; none of the code that *uses* the repository needs to change.

---

## Good Example

A `UserRepository` uses a `Database` service. The `Database` can fail with specific errors, but the `UserRepository` maps them to a single, generic `RepositoryError` before they are exposed to the rest of the application.

```typescript
import { Effect, Data } from "effect";

// Low-level, specific errors from the database layer
class ConnectionError extends Data.TaggedError("ConnectionError") {}
class QueryError extends Data.TaggedError("QueryError") {}

// A generic error for the repository layer
class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly cause: unknown;
}> {}

// The inner service
const dbQuery = (): Effect.Effect<
  { name: string },
  ConnectionError | QueryError
> => Effect.fail(new ConnectionError());

// The outer service uses `mapError` to create a clean boundary.
// Its public signature only exposes `RepositoryError`.
const findUser = (): Effect.Effect<{ name: string }, RepositoryError> =>
  dbQuery().pipe(
    Effect.mapError(
      (error) => new RepositoryError({ cause: error }),
    ),
  );
```

---

## Anti-Pattern

Allowing low-level, implementation-specific errors to "leak" out of a service's public API. This creates tight coupling between layers.

```typescript
import { Effect } from "effect";
import { ConnectionError, QueryError } from "./somewhere"; // From previous example

// ❌ WRONG: This function's error channel is "leaky".
// It exposes the internal implementation details of the database.
const findUserUnsafely = (): Effect.Effect<
  { name: string },
  ConnectionError | QueryError // <-- Leaky abstraction
> => {
  // ... logic that calls the database
  return Effect.fail(new ConnectionError());
};

// Now, any code that calls `findUserUnsafely` has to know about and handle
// both `ConnectionError` and `QueryError`. If we change the database,
// all of that calling code might have to change too.
```

--- (Pattern Start: mocking-dependencies-in-tests) ---

## Mocking Dependencies in Tests

**Rule:** Provide mock service implementations via a test-specific Layer to isolate the unit under test.

### Full Pattern Content:

## Guideline

To test a piece of code in isolation, identify its service dependencies and provide mock implementations for them using a test-specific `Layer`. The most common way to create a mock layer is with `Layer.succeed(ServiceTag, mockImplementation)`.

---

## Rationale

The primary goal of a unit test is to verify the logic of a single unit of code, independent of its external dependencies. Effect's dependency injection system is designed to make this easy and type-safe.

By providing a mock `Layer` in your test, you replace a real dependency (like an `HttpClient` that makes network calls) with a fake one that returns predictable data. This provides several key benefits:
-   **Determinism:** Your tests always produce the same result, free from the flakiness of network or database connections.
-   **Speed:** Tests run instantly without waiting for slow I/O operations.
-   **Type Safety:** The TypeScript compiler ensures your mock implementation perfectly matches the real service's interface, preventing your tests from becoming outdated.
-   **Explicitness:** The test setup clearly documents all the dependencies required for the code to run.

---

## Good Example

We want to test a `Notifier` service that uses an `EmailClient` to send emails. In our test, we provide a mock `EmailClient` that doesn't actually send emails but just returns a success value.

```typescript
import { Effect, Layer } from "effect";
import { describe, it, expect } from "vitest";

// --- The Services ---
class EmailClient extends Effect.Tag("EmailClient")<
  EmailClient,
  { readonly send: (address: string, body: string) => Effect.Effect<void, "SendError"> }
>() {}

class Notifier extends Effect.Tag("Notifier")<
  Notifier,
  { readonly notifyUser: (userId: number, message: string) => Effect.Effect<void, "SendError"> }
>() {}

// The "Live" Notifier implementation, which depends on EmailClient
const NotifierLive = Layer.effect(
  Notifier,
  Effect.gen(function* () {
    const emailClient = yield* EmailClient;
    return Notifier.of({
      notifyUser: (userId, message) =>
        emailClient.send(`user-${userId}@example.com`, message),
    });
  }),
);

// --- The Test ---
describe("Notifier", () => {
  it("should call the email client with the correct address", () =>
    Effect.gen(function* () {
      // 1. Get the service we want to test
      const notifier = yield* Notifier;
      // 2. Run its logic
      yield* notifier.notifyUser(123, "Your invoice is ready.");
    }).pipe(
      // 3. Provide a mock implementation for its dependency
      Effect.provide(
        Layer.succeed(
          EmailClient,
          EmailClient.of({
            send: (address, body) =>
              Effect.sync(() => {
                // 4. Make assertions on the mock's behavior
                expect(address).toBe("user-123@example.com");
                expect(body).toBe("Your invoice is ready.");
              }),
          }),
        ),
      ),
      // 5. Provide the layer for the service under test
      Effect.provide(NotifierLive),
      // 6. Run the test
      Effect.runPromise,
    ));
});
```

---

## Anti-Pattern

Testing your business logic using the "live" implementation of its dependencies. This creates an integration test, not a unit test. It will be slow, unreliable, and may have real-world side effects (like actually sending an email).

```typescript
import { Effect } from "effect";
import { NotifierLive } from "./somewhere";
import { EmailClientLive } from "./somewhere"; // The REAL email client

// ❌ WRONG: This test will try to send a real email.
it("sends a real email", () =>
  Effect.gen(function* () {
    const notifier = yield* Notifier;
    yield* notifier.notifyUser(123, "This is a test email!");
  }).pipe(
    Effect.provide(NotifierLive),
    Effect.provide(EmailClientLive), // Using the live layer makes this an integration test
    Effect.runPromise,
  ));
```

--- (Pattern Start: model-dependencies-as-services) ---

## Model Dependencies as Services

**Rule:** Model dependencies as services.

### Full Pattern Content:

# Model Dependencies as Services

## Guideline

Represent any external dependency or distinct capability—from a database client to a simple UUID generator—as a service.

## Rationale

This pattern is the key to testability. It allows you to provide a `Live` implementation in production and a `Test` implementation (returning mock data) in your tests, making your code decoupled and reliable.

## Good Example

```typescript
import { Effect, Layer } from "effect";

class Random extends Effect.Tag("Random")<Random, { readonly next: Effect.Effect<number> }> {}

// For production
const RandomLive = Layer.succeed(Random, { next: Effect.sync(() => Math.random()) });

// For testing
const RandomTest = Layer.succeed(Random, { next: Effect.succeed(0.5) });
```

**Explanation:**  
By modeling dependencies as services, you can easily substitute mocked or deterministic implementations for testing, leading to more reliable and predictable tests.

## Anti-Pattern

Directly calling external APIs like `fetch` or using impure functions like `Math.random()` within your business logic. This tightly couples your logic to a specific implementation and makes it difficult to test.

--- (Pattern Start: model-optional-values-with-option) ---

## Model Optional Values Safely with Option

**Rule:** Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

### Full Pattern Content:

## Guideline

Represent values that may be absent with `Option<A>`. Use `Option.some(value)` to represent a present value and `Option.none()` for an absent one. This creates a container that forces you to handle both possibilities.

---

## Rationale

Functions that can return a value or `null`/`undefined` are a primary source of runtime errors in TypeScript (`Cannot read properties of null`).

The `Option` type solves this by making the possibility of an absent value explicit in the type system. A function that returns `Option<User>` cannot be mistaken for a function that returns `User`. The compiler forces you to handle the `None` case before you can access the value inside a `Some`, eliminating an entire class of bugs.

---

## Good Example

A function that looks for a user in a database is a classic use case. It might find a user, or it might not. Returning an `Option<User>` makes this contract explicit and safe.

```typescript
import { Option } from "effect";

interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: "Paul" },
  { id: 2, name: "Alex" },
];

// This function safely returns an Option, not a User or null.
const findUserById = (id: number): Option.Option<User> => {
  const user = users.find((u) => u.id === id);
  return Option.fromNullable(user); // A useful helper for existing APIs
};

// The caller MUST handle both cases.
const greeting = (id: number): string =>
  findUserById(id).pipe(
    Option.match({
      onNone: () => "User not found.",
      onSome: (user) => `Welcome, ${user.name}!`,
    }),
  );

console.log(greeting(1)); // "Welcome, Paul!"
console.log(greeting(3)); // "User not found."

## Anti-Pattern

The anti-pattern is returning a nullable type (e.g., User | null or User | undefined). This relies on the discipline of every single caller to perform a null check. Forgetting even one check can introduce a runtime error.

```typescript
interface User {
	id: number;
	name: string;
}
const users: User[] = [{ id: 1, name: "Paul" }];
	
	// ❌ WRONG: This function's return type is less safe.
	const findUserUnsafely = (id: number): User | undefined => {
	  return users.find((u) => u.id === id);
	};
	
	const user = findUserUnsafely(3);
	
	// This will throw "TypeError: Cannot read properties of undefined (reading 'name')"
	// because the caller forgot to check if the user exists.
	console.log(`User's name is ${user.name}`)
  ```

--- (Pattern Start: model-validated-domain-types-with-brand) ---

## Model Validated Domain Types with Brand

**Rule:** Model validated domain types with Brand.

### Full Pattern Content:

# Model Validated Domain Types with Brand

## Guideline

For domain primitives that have specific rules (e.g., a valid email), create a
Branded Type. This ensures a value can only be created after passing a
validation check.

## Rationale

This pattern moves validation to the boundaries of your system. Once a value
has been branded, the rest of your application can trust that it is valid,
eliminating repetitive checks.

## Good Example

```typescript
import { Brand, Option } from "effect";

type Email = string & Brand.Brand<"Email">;

const makeEmail = (s: string): Option.Option<Email> =>
  s.includes("@") ? Option.some(s as Email) : Option.none();

// A function can now trust that its input is a valid email.
const sendEmail = (email: Email, body: string) => { /* ... */ };
```

**Explanation:**  
Branding ensures that only validated values are used, reducing bugs and
repetitive checks.

## Anti-Pattern

"Primitive obsession"—using raw primitives (`string`, `number`) and performing
validation inside every function that uses them. This is repetitive and
error-prone.

--- (Pattern Start: organize-layers-into-composable-modules) ---

## Organize Layers into Composable Modules

**Rule:** Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

### Full Pattern Content:

## Guideline

For large applications, avoid a single, flat list of services. Instead, structure your application by creating hierarchical layers:
1.  **`BaseLayer`**: Provides application-wide infrastructure (Logger, Config, Database).
2.  **`FeatureModule` Layers**: Provide the services for a specific business domain (e.g., `UserModule`, `ProductModule`). These depend on the `BaseLayer`.
3.  **`AppLayer`**: The top-level layer that composes the feature modules by providing them with the `BaseLayer`.

---

## Rationale

As an application grows, a flat composition strategy where all services are merged into one giant layer becomes unwieldy and hard to reason about. The Composable Modules pattern solves this by introducing structure.

This approach creates a clean, scalable, and highly testable architecture where complexity is contained within each module. The top-level composition becomes a clear, high-level diagram of your application's architecture, and feature modules can be tested in isolation by providing them with a mocked `BaseLayer`.

---

## Good Example

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

## Anti-Pattern

A flat composition strategy for a large application. While simple at first, it quickly becomes difficult to manage.

```typescript
// ❌ This file becomes huge and hard to navigate in a large project.
const AppLayer = Layer.mergeAll(
  LoggerLive,
  ConfigLive,
  DatabaseLive,
  TracerLive,
  UserServiceLive,
  UserRepositoryLive,
  ProductServiceLive,
  ProductRepositoryLive,
  BillingServiceLive,
  // ...and 50 other services
);
```

--- (Pattern Start: parse-with-schema-decode) ---

## Parse and Validate Data with Schema.decode

**Rule:** Parse and validate data with Schema.decode.

### Full Pattern Content:

# Parse and Validate Data with Schema.decode

## Guideline

When you need to parse or validate data against a `Schema`, use the
`Schema.decode(schema)` function. It takes an `unknown` input and returns an
`Effect`.

## Rationale

Unlike the older `Schema.parse` which throws, `Schema.decode` is fully
integrated into the Effect ecosystem, allowing you to handle validation
failures gracefully with operators like `Effect.catchTag`.

## Good Example

```typescript
import { Effect, Schema } from "effect";

const UserSchema = Schema.Struct({ name: Schema.String });

const processUserInput = (input: unknown) =>
  Schema.decode(UserSchema)(input).pipe(
    Effect.map((user) => `Welcome, ${user.name}!`),
    Effect.catchTag("ParseError", () => Effect.succeed("Invalid user data.")),
  );
```

**Explanation:**  
`Schema.decode` integrates parsing and validation into the Effect workflow,
making error handling composable and type-safe.

## Anti-Pattern

Using `Schema.parse(schema)(input)`, as it throws an exception. This forces
you to use `try/catch` blocks, which breaks the composability of Effect.

--- (Pattern Start: poll-for-status-until-task-completes) ---

## Poll for Status Until a Task Completes

**Rule:** Use Effect.race to run a repeating polling task that is automatically interrupted when a main task completes.

### Full Pattern Content:

## Guideline

To run a periodic task (a "poller") that should only run for the duration of another main task, combine them using `Effect.race`. The main task will "win" the race upon completion, which automatically interrupts and cleans up the repeating polling effect.

---

## Rationale

This pattern elegantly solves the problem of coordinating a long-running job with a status-checking mechanism. Instead of manually managing fibers with `fork` and `interrupt`, you can declare this relationship with `Effect.race`.

The key is that the polling effect is set up to repeat on a schedule that runs indefinitely (or for a very long time). Because it never completes on its own, it can never "win" the race. The main task is the only one that can complete successfully. When it does, it wins the race, and Effect's structured concurrency guarantees that the losing effect (the poller) is safely interrupted.

This creates a self-contained, declarative, and leak-free unit of work.

---

## Good Example

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

## Anti-Pattern

Manually managing the lifecycle of the polling fiber. This is more verbose, imperative, and error-prone. You have to remember to interrupt the polling fiber in all possible exit paths (success, failure, etc.), which `Effect.race` does for you automatically.

```typescript
import { Effect, Fiber } from "effect";
import { longRunningJob, repeatingPoller } from "./somewhere";

// ❌ WRONG: Manual fiber management is complex.
const program = Effect.gen(function* () {
  // Manually fork the poller into the background
  const pollerFiber = yield* Effect.fork(repeatingPoller);

  try {
    // Run the main job
    const result = yield* longRunningJob;
    return result;
  } finally {
    // You MUST remember to interrupt the poller when you're done.
    yield* Fiber.interrupt(pollerFiber);
  }
});
```

--- (Pattern Start: process-collection-in-parallel-with-foreach) ---

## Process a Collection in Parallel with Effect.forEach

**Rule:** Use Effect.forEach with the `concurrency` option to process a collection in parallel with a fixed limit.

### Full Pattern Content:

## Guideline

To process an iterable (like an array) of items concurrently, use `Effect.forEach`. To avoid overwhelming systems, always specify the `{ concurrency: number }` option to limit how many effects run at the same time.

---

## Rationale

Running `Effect.all` on a large array of tasks is dangerous. If you have 1,000 items, it will try to start 1,000 concurrent fibers at once, which can exhaust memory, overwhelm your CPU, or hit API rate limits.

`Effect.forEach` with a concurrency limit solves this problem elegantly. It acts as a concurrent processing pool. It will start processing items up to your specified limit (e.g., 10 at a time). As soon as one task finishes, it will pick up the next available item from the list, ensuring that no more than 10 tasks are ever running simultaneously. This provides massive performance gains over sequential processing while maintaining stability and control.

---

## Good Example

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

## Anti-Pattern

The anti-pattern is using `Effect.all` to process a large or dynamically-sized collection. This can lead to unpredictable and potentially catastrophic resource consumption.

```typescript
import { Effect } from "effect";
import { userIds, fetchUserById } from "./somewhere"; // From previous example

// ❌ DANGEROUS: This will attempt to start 100 concurrent network requests.
// If userIds had 10,000 items, this could crash your application or get you blocked by an API.
const program = Effect.all(userIds.map(fetchUserById));
```

--- (Pattern Start: stream-from-file) ---

## Process a Large File with Constant Memory

**Rule:** Use Stream.fromReadable with a Node.js Readable stream to process files efficiently.

### Full Pattern Content:

## Guideline

To process a large file without consuming excessive memory, create a Node.js `Readable` stream from the file and convert it into an Effect `Stream` using `Stream.fromReadable`.

---

## Rationale

The most significant advantage of a streaming architecture is its ability to handle datasets far larger than available RAM. When you need to process a multi-gigabyte log file or CSV, loading it all into memory is not an option—it will crash your application.

The `Stream.fromReadable` constructor provides a bridge from Node.js's built-in file streaming capabilities to the Effect ecosystem. This approach is superior because:

1.  **Constant Memory Usage**: The file is read in small, manageable chunks. Your application's memory usage remains low and constant, regardless of whether the file is 1 megabyte or 100 gigabytes.
2.  **Composability**: Once the file is represented as an Effect `Stream`, you can apply the full suite of powerful operators to it: `mapEffect` for concurrent processing, `filter` for selectively choosing lines, `grouped` for batching, and `retry` for resilience.
3.  **Resource Safety**: Effect's `Stream` is built on `Scope`, which guarantees that the underlying file handle will be closed automatically when the stream finishes, fails, or is interrupted. This prevents resource leaks, a common problem in manual file handling.

---

## Good Example

This example demonstrates reading a text file, splitting it into individual lines, and processing each line. The combination of `Stream.fromReadable`, `Stream.decodeText`, and `Stream.splitLines` is a powerful and common pattern for handling text-based files.

```typescript
import { Effect, Stream } from 'effect';
import { NodeFileSystem } from '@effect/platform-node';
import * as fs from 'node:fs';
import * as path from 'node:path';

// This program reads a file named 'large-file.txt' line by line.
// First, let's ensure the file exists for the example.
const program = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, 'large-file.txt');

  // Create a dummy file for the example
  yield* fs.writeFileString(filePath, 'line 1\nline 2\nline 3');

  // Create a Node.js readable stream and convert it to an Effect Stream
  const stream = Stream.fromReadable(() => fs.createReadStream(filePath)).pipe(
    // Decode the raw buffer chunks into text
    Stream.decodeText('utf-8'),
    // Split the text stream into a stream of individual lines
    Stream.splitLines,
    // Process each line
    Stream.tap((line) => Effect.log(`Processing: ${line}`))
  );

  // Run the stream for its side effects and ignore the output
  yield* Stream.runDrain(stream);

  // Clean up the dummy file
  yield* fs.remove(filePath);
});

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Processing: line 1"
... level=INFO msg="Processing: line 2"
... level=INFO msg="Processing: line 3"
*/
```

## Anti-Pattern

The anti-pattern is to use synchronous, memory-intensive functions like `fs.readFileSync`. This approach is simple for tiny files but fails catastrophically for large ones.

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';

const filePath = path.join(__dirname, 'large-file.txt');
// Create a dummy file for the example
fs.writeFileSync(filePath, 'line 1\nline 2\nline 3');

try {
  // Anti-pattern: This loads the ENTIRE file into memory as a single buffer.
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  for (const line of lines) {
    console.log(`Processing: ${line}`);
  }
} catch (err) {
  console.error('Failed to read file:', err);
} finally {
  // Clean up the dummy file
  fs.unlinkSync(filePath);
}
```

This is a dangerous anti-pattern because:

1.  **It's a Memory Bomb**: If `large-file.txt` were 2GB and your server had 1GB of RAM, this code would immediately crash the process.
2.  **It Blocks the Event Loop**: `readFileSync` is a synchronous, blocking operation. While it's reading the file from disk, your entire application is frozen and cannot respond to any other requests.
3.  **It's Not Composable**: You get a giant string that must be processed eagerly. You lose all the benefits of lazy processing, concurrency control, and integrated error handling that `Stream` provides.

--- (Pattern Start: process-a-collection-of-data-asynchronously) ---

## Process collections of data asynchronously

**Rule:** Leverage Stream to process collections effectfully with built-in concurrency control and resource safety.

### Full Pattern Content:

## Guideline

For processing collections that involve asynchronous or effectful operations, use `Stream` to ensure resource safety, control concurrency, and maintain composability.

---

## Rationale

`Stream` is a fundamental data type in Effect for handling collections of data, especially in asynchronous contexts. Unlike a simple array, a `Stream` is lazy and pull-based, meaning it only computes or fetches elements as they are needed, making it highly efficient for large or infinite datasets.

The primary benefits of using `Stream` are:

1.  **Concurrency Control**: `Stream` provides powerful and simple operators like `mapEffect` that have built-in concurrency management. This prevents overwhelming downstream services with too many parallel requests.
2.  **Resource Safety**: `Stream` is built on `Scope`, ensuring that any resources opened during the stream's operation (like file handles or network connections) are safely and reliably closed, even in the case of errors or interruption.
3.  **Composability**: Streams are highly composable. They can be filtered, mapped, transformed, and combined with other Effect data types seamlessly, allowing you to build complex data processing pipelines that remain readable and type-safe.
4.  **Resilience**: `Stream` integrates with `Schedule` to provide sophisticated retry and repeat logic, and with Effect's structured concurrency to ensure that failures in one part of a pipeline lead to a clean and predictable shutdown of the entire process.

---

## Good Example

This example processes a list of IDs by fetching user data for each one. `Stream.mapEffect` is used to apply an effectful function (`getUserById`) to each element, with concurrency limited to 2 simultaneous requests.

```typescript
import { Effect, Stream, Chunk } from 'effect';

// A mock function that simulates fetching a user from a database
const getUserById = (id: number): Effect.Effect<{ id: number; name: string }, Error> =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay('100 millis'),
    Effect.tap(() => Effect.log(`Fetched user ${id}`))
  );

// The stream-based program
const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  // Process each item with an Effect, limiting concurrency to 2
  Stream.mapEffect(getUserById, { concurrency: 2 }),
  // Run the stream and collect all results into a Chunk
  Stream.runCollect
);

Effect.runPromise(program).then((users) => {
  console.log('All users fetched:', Chunk.toArray(users));
});
```

## Anti-Pattern

A common but flawed approach is to use `Promise.all` to handle multiple asynchronous operations. This method lacks the safety, control, and composability inherent to Effect's `Stream`.

```typescript
// A mock function that returns a Promise
const getUserByIdAsPromise = (id: number): Promise<{ id: number; name: string }> =>
  new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Fetched user ${id}`);
      resolve({ id, name: `User ${id}` });
    }, 100);
  });

// The Promise-based program
const ids = [1, 2, 3, 4, 5];
const promises = ids.map(getUserByIdAsPromise);

Promise.all(promises).then((users) => {
  console.log('All users fetched:', users);
});
```

This anti-pattern is problematic because it immediately executes all promises in parallel with no concurrency limit, it does not benefit from Effect's structured concurrency for safe interruption, and it breaks out of the Effect context, losing composability with features like logging, retries, and dependency management.

--- (Pattern Start: stream-process-concurrently) ---

## Process Items Concurrently

**Rule:** Use Stream.mapEffect with the `concurrency` option to process stream items in parallel.

### Full Pattern Content:

## Guideline

To process items in a stream concurrently, use `Stream.mapEffect` and provide a value greater than 1 to its `concurrency` option.

---

## Rationale

For many data pipelines, the most time-consuming step is performing an I/O-bound operation for each item, such as calling an API or querying a database. Processing these items one by one (sequentially) is safe but slow, as the entire pipeline waits for each operation to complete before starting the next.

`Stream.mapEffect`'s `concurrency` option is the solution. It provides a simple, declarative way to introduce controlled parallelism into your pipeline.

1.  **Performance Boost**: It allows the stream to work on multiple items at once, drastically reducing the total execution time for I/O-bound tasks.
2.  **Controlled Parallelism**: Unlike `Promise.all` which runs everything at once, you specify the *exact* number of concurrent operations. This is crucial for stability, as it prevents your application from overwhelming downstream services or exhausting its own resources (like file handles or network sockets).
3.  **Automatic Backpressure**: The stream will not pull new items from the source faster than the concurrent slots can process them. This backpressure is handled automatically, preventing memory issues.
4.  **Structured Concurrency**: It's fully integrated with Effect's runtime. If any concurrent operation fails, all other in-flight operations for that stream are immediately and reliably interrupted, preventing wasted work and ensuring clean shutdowns.

---

## Good Example

This example processes four items, each taking one second. By setting `concurrency: 2`, the total runtime is approximately two seconds instead of four, because items are processed in parallel pairs.

```typescript
import { Effect, Stream } from 'effect';

// A mock function that simulates a slow I/O operation
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.log(`Starting item ${id}...`).pipe(
    Effect.delay('1 second'),
    Effect.map(() => `Finished item ${id}`),
    Effect.tap(Effect.log)
  );

const ids = [1, 2, 3, 4];

const program = Stream.fromIterable(ids).pipe(
  // Process up to 2 items concurrently
  Stream.mapEffect(processItem, { concurrency: 2 }),
  Stream.runDrain
);

// Measure the total time taken
const timedProgram = Effect.timed(program);

Effect.runPromise(timedProgram).then(([duration, _]) => {
  console.log(`\nTotal time: ${Math.round(duration.millis / 1000)} seconds`);
});
/*
Output:
... level=INFO msg="Starting item 1..."
... level=INFO msg="Starting item 2..."
... level=INFO msg="Finished item 1"
... level=INFO msg="Starting item 3..."
... level=INFO msg="Finished item 2"
... level=INFO msg="Starting item 4..."
... level=INFO msg="Finished item 3"
... level=INFO msg="Finished item 4"

Total time: 2 seconds
*/
```

## Anti-Pattern

The anti-pattern is to process I/O-bound tasks sequentially. This is the default behavior of `Stream.mapEffect` if you don't specify a concurrency level, and it leads to poor performance.

```typescript
import { Effect, Stream } from 'effect';
// ... same processItem function ...

const ids = [1, 2, 3, 4];

// Processing sequentially (default concurrency is 1)
const program = Stream.fromIterable(ids).pipe(
  Stream.mapEffect(processItem), // No concurrency option
  Stream.runDrain
);

const timedProgram = Effect.timed(program);

Effect.runPromise(timedProgram).then(([duration, _]) => {
  console.log(`\nTotal time: ${Math.round(duration.millis / 1000)} seconds`);
});
/*
Output:
... level=INFO msg="Starting item 1..."
... level=INFO msg="Finished item 1"
... level=INFO msg="Starting item 2..."
... level=INFO msg="Finished item 2"
... etc.

Total time: 4 seconds
*/
```

While sequential processing is sometimes necessary to preserve order or avoid race conditions, it is a performance anti-pattern for independent, I/O-bound tasks. The concurrent approach is almost always preferable in such cases.

--- (Pattern Start: stream-process-in-batches) ---

## Process Items in Batches

**Rule:** Use Stream.grouped(n) to transform a stream of items into a stream of batched chunks.

### Full Pattern Content:

## Guideline

To process items in fixed-size batches for performance, use the `Stream.grouped(batchSize)` operator to transform a stream of individual items into a stream of `Chunk`s.

---

## Rationale

When interacting with external systems like databases or APIs, making one request per item is often incredibly inefficient. The network latency and overhead of each individual call can dominate the total processing time. Most high-performance systems offer bulk or batch endpoints to mitigate this.

`Stream.grouped(n)` provides a simple, declarative way to prepare your data for these bulk operations:

1.  **Performance Optimization**: It dramatically reduces the number of network roundtrips. A single API call with 100 items is far faster than 100 individual API calls.
2.  **Declarative Batching**: It abstracts away the tedious and error-prone manual logic of counting items, managing temporary buffers, and deciding when to send a batch.
3.  **Seamless Composition**: It transforms a `Stream<A>` into a `Stream<Chunk<A>>`. This new stream of chunks can be piped directly into `Stream.mapEffect`, allowing you to process each batch concurrently.
4.  **Handles Leftovers**: The operator automatically handles the final, smaller batch if the total number of items is not perfectly divisible by the batch size.

---

## Good Example

This example processes 10 users. By using `Stream.grouped(5)`, it transforms the stream of 10 individual users into a stream of two chunks (each a batch of 5). The `saveUsersInBulk` function is then called only twice, once for each batch.

```typescript
import { Effect, Stream, Chunk } from 'effect';

// A mock function that simulates a bulk database insert
const saveUsersInBulk = (
  userBatch: Chunk.Chunk<{ id: number }>
): Effect.Effect<void, Error> =>
  Effect.log(
    `Saving batch of ${userBatch.length} users: ${Chunk.toArray(userBatch)
      .map((u) => u.id)
      .join(', ')}`
  );

const userIds = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

const program = Stream.fromIterable(userIds).pipe(
  // Group the stream of users into batches of 5
  Stream.grouped(5),
  // Process each batch with our bulk save function
  Stream.mapEffect(saveUsersInBulk, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Saving batch of 5 users: 1, 2, 3, 4, 5"
... level=INFO msg="Saving batch of 5 users: 6, 7, 8, 9, 10"
*/
```

## Anti-Pattern

The anti-pattern is to process items one by one when a more efficient bulk operation is available. This is a common performance bottleneck.

```typescript
import { Effect, Stream } from 'effect';

// A mock function that saves one user at a time
const saveUser = (user: { id: number }): Effect.Effect<void, Error> =>
  Effect.log(`Saving single user: ${user.id}`);

const userIds = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

const program = Stream.fromIterable(userIds).pipe(
  // Process each user individually, leading to 10 separate "saves"
  Stream.mapEffect(saveUser, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Saving single user: 1"
... level=INFO msg="Saving single user: 2"
... (and so on for all 10 users)
*/
```

This individual processing approach is an anti-pattern because it creates unnecessary overhead. If each `saveUser` call took 50ms of network latency, the total time would be over 500ms. The batched approach might only take 100ms (2 batches * 50ms), resulting in a 5x performance improvement.

--- (Pattern Start: process-streaming-data-with-stream) ---

## Process Streaming Data with Stream

**Rule:** Use Stream to model and process data that arrives over time in a composable, efficient way.

### Full Pattern Content:

## Guideline

When dealing with a sequence of data that arrives asynchronously, model it as a `Stream`. A `Stream<A, E, R>` is like an asynchronous, effectful `Array`. It represents a sequence of values of type `A` that may fail with an error `E` and requires services `R`.

---

## Rationale

Some data sources don't fit the one-shot request/response model of `Effect`. For example:
-   Reading a multi-gigabyte file from disk.
-   Receiving messages from a WebSocket.
-   Fetching results from a paginated API.

Loading all this data into memory at once would be inefficient or impossible. `Stream` solves this by allowing you to process the data in chunks as it arrives. It provides a rich API of composable operators (`map`, `filter`, `run`, etc.) that mirror those on `Effect` and `Array`, but are designed for streaming data. This allows you to build efficient, constant-memory data processing pipelines.

---

## Good Example

This example demonstrates creating a `Stream` from a paginated API. The `Stream` will make API calls as needed, processing one page of users at a time without ever holding the entire user list in memory.

```typescript
import { Effect, Stream } from "effect";

interface User {
  id: number;
  name: string;
}
interface PaginatedResponse {
  users: User[];
  nextPage: number | null;
}

// A mock API call that returns a page of users
const fetchUserPage = (
  page: number,
): Effect.Effect<PaginatedResponse, "ApiError"> =>
  Effect.succeed(
    page < 3
      ? {
          users: [
            { id: page * 2 + 1, name: `User ${page * 2 + 1}` },
            { id: page * 2 + 2, name: `User ${page * 2 + 2}` },
          ],
          nextPage: page + 1,
        }
      : { users: [], nextPage: null },
  ).pipe(Effect.delay("50 millis"));

// Stream.paginateEffect creates a stream from a paginated source
const userStream = Stream.paginateEffect(0, (page) =>
  fetchUserPage(page).pipe(
    Effect.map((response) => [response.users, response.nextPage]),
  ),
).pipe(
  // Flatten the stream of user arrays into a stream of individual users
  Stream.flatten,
);

// We can now process the stream of users.
// Stream.runForEach will pull from the stream until it's exhausted.
const program = Stream.runForEach(userStream, (user) =>
  Effect.log(`Processing user: ${user.name}`),
);

Effect.runPromise(program);
```

---

## Anti-Pattern

Manually managing pagination state with recursive functions. This is complex, stateful, and easy to get wrong. It also requires loading all results into memory, which is inefficient for large datasets.

```typescript
import { Effect } from "effect";
import { fetchUserPage } from "./somewhere"; // From previous example

// ❌ WRONG: Manual, stateful, and inefficient recursion.
const fetchAllUsers = (
  page: number,
  acc: any[],
): Effect.Effect<any[], "ApiError"> =>
  fetchUserPage(page).pipe(
    Effect.flatMap((response) => {
      const allUsers = [...acc, ...response.users];
      if (response.nextPage) {
        return fetchAllUsers(response.nextPage, allUsers);
      }
      return Effect.succeed(allUsers);
    }),
  );

// This holds all users in memory at once.
const program = fetchAllUsers(0, []);
```

--- (Pattern Start: provide-config-layer) ---

## Provide Configuration to Your App via a Layer

**Rule:** Provide configuration to your app via a Layer.

### Full Pattern Content:

# Provide Configuration to Your App via a Layer

## Guideline

Transform your configuration schema into a `Layer` using `Config.layer()` and provide it to your main application `Effect`.

## Rationale

Integrating configuration as a `Layer` plugs it directly into Effect's dependency injection system. This makes your configuration available anywhere in the program and dramatically simplifies testing by allowing you to substitute mock configuration.

## Good Example

```typescript
import { Config, Effect, Layer } from "effect";

const ServerConfig = Config.all({ port: Config.number("PORT") });

const program = Effect.log("Application starting...");

const configLayer = Config.layer(ServerConfig);

const runnable = Effect.provide(program, configLayer);
```

**Explanation:**  
This approach makes configuration available contextually, supporting better testing and modularity.

## Anti-Pattern

Manually reading environment variables deep inside business logic. This tightly couples that logic to the external environment, making it difficult to test and reuse.

--- (Pattern Start: provide-dependencies-to-routes) ---

## Provide Dependencies to Routes

**Rule:** Define dependencies with Effect.Service and provide them to your HTTP server using a Layer.

### Full Pattern Content:

## Guideline

Define your application's services using `class MyService extends Effect.Service("MyService")`, provide a live implementation via a `Layer`, and use `Effect.provide` to make the service available to your entire HTTP application.

---

## Rationale

As applications grow, route handlers need to perform complex tasks like accessing a database, calling other APIs, or logging. Hard-coding this logic or manually passing dependencies leads to tightly coupled, untestable code.

Effect's dependency injection system (`Service` and `Layer`) solves this by decoupling a service's interface from its implementation. This is the cornerstone of building scalable, maintainable applications in Effect.

1.  **Modern and Simple**: `Effect.Service` is the modern, idiomatic way to define services. It combines the service's definition and its access tag into a single, clean class structure, reducing boilerplate.
2.  **Testability**: By depending on a service interface, you can easily provide a mock implementation in your tests (e.g., `Database.Test`) instead of the real one (`Database.Live`), allowing for fast, isolated unit tests of your route logic.
3.  **Decoupling**: Route handlers don't know or care *how* the database connection is created or managed. They simply ask for the `Database` service from the context, and the runtime provides the configured implementation.
4.  **Composability**: `Layer`s are composable. You can build complex dependency graphs (e.g., a `Database` layer that itself requires a `Config` layer) that Effect will automatically construct and wire up for you.

---

## Good Example

This example defines a `Database` service. The route handler for `/users/:userId` requires this service to fetch a user. We then provide a "live" implementation of the `Database` to the entire server using a `Layer`.

```typescript
import { Effect, Data, Layer } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// 1. Define the service interface using Effect.Service
class Database extends Effect.Service('Database')<{
  readonly getUser: (
    id: string
  ) => Effect.Effect<{ name: string }, UserNotFoundError>;
}>() {}

class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{ id: string }> {}

// 2. Create a "live" Layer that provides the real implementation
const DatabaseLive = Layer.succeed(
  Database,
  Database.of({
    getUser: (id: string) =>
      id === '123'
        ? Effect.succeed({ name: 'Paul' })
        : Effect.fail(new UserNotFoundError({ id })),
  })
);

// 3. The route handler now requires the Database service
const getUserRoute = Http.router.get(
  '/users/:userId',
  Effect.flatMap(Http.request.ServerRequest, (req) =>
    // Access the service and call its methods
    Effect.flatMap(Database, (db) => db.getUser(req.params.userId))
  ).pipe(Effect.map(Http.response.json))
);

const app = Http.router.empty.pipe(Http.router.addRoute(getUserRoute));

// 4. Provide the Layer to the entire application
const program = Http.server.serve(app).pipe(
  Effect.provide(DatabaseLive),
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

## Anti-Pattern

The anti-pattern is to manually instantiate and pass dependencies through function arguments. This creates tight coupling and makes testing difficult.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// Manual implementation of a database client
class LiveDatabase {
  getUser(id: string) {
    if (id === '123') {
      return Effect.succeed({ name: 'Paul' });
    }
    return Effect.fail('User not found'); // Untyped error
  }
}

// The dependency must be passed explicitly to the route definition
const createGetUserRoute = (db: LiveDatabase) =>
  Http.router.get(
    '/users/:userId',
    Effect.flatMap(Http.request.ServerRequest, (req) =>
      db.getUser(req.params.userId)
    ).pipe(
      Effect.map(Http.response.json),
      Effect.catchAll(() => Http.response.empty({ status: 404 }))
    )
  );

// Manually instantiate the dependency
const db = new LiveDatabase();
const getUserRoute = createGetUserRoute(db);

const app = Http.router.empty.pipe(Http.router.addRoute(getUserRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

This approach is flawed because the route handler is now aware of the concrete `LiveDatabase` class. Swapping it for a mock in a test would be cumbersome. Furthermore, if a service deep within the call stack needs a dependency, it must be "drilled" down through every intermediate function, which is a significant maintenance burden.

--- (Pattern Start: race-concurrent-effects) ---

## Race Concurrent Effects for the Fastest Result

**Rule:** Use Effect.race to get the result from the first of several effects to succeed, automatically interrupting the losers.

### Full Pattern Content:

## Guideline

When you have multiple effects that can produce the same type of result, and you only care about the one that finishes first, use `Effect.race(effectA, effectB)`.

---

## Rationale

`Effect.race` is a powerful concurrency primitive for performance and resilience. It starts all provided effects in parallel. The moment one of them succeeds, `Effect.race` immediately interrupts all the other "losing" effects and returns the winning result. If one of the effects fails before any have succeeded, the race is not over; the remaining effects continue to run. The entire race only fails if *all* participating effects fail.

This is commonly used for:
-   **Performance:** Querying multiple redundant data sources (e.g., two API replicas) and taking the response from whichever is faster.
-   **Implementing Timeouts:** Racing a primary effect against a delayed `Effect.fail`, effectively creating a timeout mechanism.

---

## Good Example

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

## Anti-Pattern

Don't use `Effect.race` if you need the results of *all* the effects. That is the job of `Effect.all`. Using `race` in this scenario will cause you to lose data, as all but one of the effects will be interrupted and their results discarded.

```typescript
import { Effect } from "effect";

const fetchProfile = Effect.succeed({ name: "Paul" });
const fetchPermissions = Effect.succeed(["admin", "editor"]);

// ❌ WRONG: This will only return either the profile OR the permissions,
// whichever resolves first. You will lose the other piece of data.
const incompleteData = Effect.race(fetchProfile, fetchPermissions);

// ✅ CORRECT: Use Effect.all when you need all the results.
const completeData = Effect.all([fetchProfile, fetchPermissions]);
```

--- (Pattern Start: representing-time-spans-with-duration) ---

## Representing Time Spans with Duration

**Rule:** Use the Duration data type to represent time intervals instead of raw numbers.

### Full Pattern Content:

## Guideline

When you need to represent a span of time (e.g., for a delay, timeout, or schedule), use the `Duration` data type. Create durations with expressive constructors like `Duration.seconds(5)`, `Duration.minutes(10)`, or `Duration.millis(500)`.

---

## Rationale

Using raw numbers to represent time is a common source of bugs and confusion. When you see `setTimeout(fn, 5000)`, it's not immediately clear if the unit is seconds or milliseconds without prior knowledge of the API.

`Duration` solves this by making the unit explicit in the code. It provides a type-safe, immutable, and human-readable way to work with time intervals. This eliminates ambiguity and makes your code easier to read and maintain. Durations are used throughout Effect's time-based operators, such as `Effect.sleep`, `Effect.timeout`, and `Schedule`.

---

## Good Example

This example shows how to create and use `Duration` to make time-based operations clear and unambiguous.

```typescript
import { Effect, Duration } from "effect";

// Create durations with clear, explicit units
const fiveSeconds = Duration.seconds(5);
const oneHundredMillis = Duration.millis(100);

// Use them in Effect operators
const program = Effect.log("Starting...").pipe(
  Effect.delay(oneHundredMillis),
  Effect.flatMap(() => Effect.log("Running after 100ms")),
  Effect.timeout(fiveSeconds), // This whole operation must complete within 5 seconds
);

// Durations can also be compared
const isLonger = Duration.greaterThan(fiveSeconds, oneHundredMillis); // true
```

---

## Anti-Pattern

Using raw numbers for time-based operations. This is ambiguous and error-prone.

```typescript
import { Effect } from "effect";

// ❌ WRONG: What does '2000' mean? Milliseconds? Seconds?
const program = Effect.log("Waiting...").pipe(Effect.delay(2000));

// This is especially dangerous when different parts of an application
// use different conventions (e.g., one service uses seconds, another uses milliseconds).
// Using Duration eliminates this entire class of bugs.
```

--- (Pattern Start: retry-based-on-specific-errors) ---

## Retry Operations Based on Specific Errors

**Rule:** Use predicate-based retry policies to retry an operation only for specific, recoverable errors.

### Full Pattern Content:

## Guideline

To selectively retry an operation, use `Effect.retry` with a `Schedule` that includes a predicate. The most common way is to use `Schedule.whileInput((error) => ...)`, which will continue retrying only as long as the predicate returns `true` for the error that occurred.

---

## Rationale

Not all errors are created equal. Retrying on a permanent error like "permission denied" or "not found" is pointless and can hide underlying issues. You only want to retry on *transient*, recoverable errors, such as network timeouts or "server busy" responses.

By adding a predicate to your retry schedule, you gain fine-grained control over the retry logic. This allows you to build much more intelligent and efficient error handling systems that react appropriately to different failure modes. This is a common requirement for building robust clients for external APIs.

---

## Good Example

This example simulates an API client that can fail with different, specific error types. The retry policy is configured to *only* retry on `ServerBusyError` and give up immediately on `NotFoundError`.

```typescript
import { Effect, Data, Schedule, Duration } from "effect";

// Define specific, tagged errors for our API client
class ServerBusyError extends Data.TaggedError("ServerBusyError") {}
class NotFoundError extends Data.TaggedError("NotFoundError") {}

// A flaky API call that can fail in different ways
const flakyApiCall = Effect.try({
  try: () => {
    const random = Math.random();
    if (random < 0.5) {
      console.log("API call failed: Server is busy. Retrying...");
      throw new ServerBusyError();
    }
    if (random < 0.8) {
      console.log("API call failed: Resource not found. Not retrying.");
      throw new NotFoundError();
    }
    return { data: "success" };
  },
  catch: (e) => e as ServerBusyError | NotFoundError,
});

// A predicate that returns true only for the error we want to retry
const isRetryableError = (e: ServerBusyError | NotFoundError) =>
  e._tag === "ServerBusyError";

// A policy that retries 3 times, but only if the error is retryable
const selectiveRetryPolicy = Schedule.recurs(3).pipe(
  Schedule.whileInput(isRetryableError),
  Schedule.addDelay(() => "100 millis"),
);

const program = flakyApiCall.pipe(Effect.retry(selectiveRetryPolicy));

Effect.runPromise(program);
```

---

## Anti-Pattern

Using a generic `Effect.retry` that retries on all errors. This can lead to wasted resources and obscure permanent issues.

```typescript
import { Effect, Schedule } from "effect";
import { flakyApiCall } from "./somewhere"; // From previous example

// ❌ WRONG: This policy will retry even if the API returns a 404 Not Found.
// This wastes time and network requests on an error that will never succeed.
const blindRetryPolicy = Schedule.recurs(3);

const program = flakyApiCall.pipe(Effect.retry(blindRetryPolicy));
```

--- (Pattern Start: stream-run-for-effects) ---

## Run a Pipeline for its Side Effects

**Rule:** Use Stream.runDrain to execute a stream for its side effects when you don't need the final values.

### Full Pattern Content:

## Guideline

To run a stream purely for its side effects without accumulating the results in memory, use the `Stream.runDrain` sink.

---

## Rationale

Not all pipelines are designed to produce a final list of values. Often, the goal is to perform an action for each item—write it to a database, send it to a message queue, or log it to a file. In these "fire and forget" scenarios, collecting the results is not just unnecessary; it's a performance anti-pattern.

`Stream.runDrain` is the perfect tool for this job:

1.  **Memory Efficiency**: This is its primary advantage. `runDrain` processes each item and then immediately discards it, resulting in constant, minimal memory usage. This makes it the only safe choice for processing extremely large or infinite streams.
2.  **Clarity of Intent**: Using `runDrain` clearly communicates that you are interested in the successful execution of the stream's effects, not in its output values. The final `Effect` it produces resolves to `void`, reinforcing that no value is returned.
3.  **Performance**: By avoiding the overhead of allocating and managing a growing list in memory, `runDrain` can be faster for pipelines with a very large number of small items.

---

## Good Example

This example creates a stream of tasks. For each task, it performs a side effect (logging it as "complete"). `Stream.runDrain` executes the pipeline, ensuring all logs are written, but without collecting the `void` results of each logging operation.

```typescript
import { Effect, Stream } from 'effect';

const tasks = ['task 1', 'task 2', 'task 3'];

// A function that performs a side effect for a task
const completeTask = (task: string): Effect.Effect<void, never> =>
  Effect.log(`Completing ${task}`);

const program = Stream.fromIterable(tasks).pipe(
  // For each task, run the side-effectful operation
  Stream.mapEffect(completeTask, { concurrency: 1 }),
  // Run the stream for its effects, discarding the `void` results
  Stream.runDrain
);

Effect.runPromise(program).then(() => {
  console.log('\nAll tasks have been processed.');
});
/*
Output:
... level=INFO msg="Completing task 1"
... level=INFO msg="Completing task 2"
... level=INFO msg="Completing task 3"

All tasks have been processed.
*/
```

## Anti-Pattern

The anti-pattern is using `Stream.runCollect` when you only care about the side effects. This needlessly consumes memory and can lead to crashes.

```typescript
import { Effect, Stream } from 'effect';
// ... same tasks and completeTask function ...

const program = Stream.fromIterable(tasks).pipe(
  Stream.mapEffect(completeTask, { concurrency: 1 }),
  // Anti-pattern: Collecting results that we are just going to ignore
  Stream.runCollect
);

Effect.runPromise(program).then((results) => {
  // The `results` variable here is a Chunk of `[void, void, void]`.
  // It served no purpose but consumed memory.
  console.log(
    `\nAll tasks processed. Unnecessarily collected ${results.length} empty results.`
  );
});
```

While this works for a small array of three items, it's a dangerous habit. If the `tasks` array contained millions of items, this code would create a `Chunk` with millions of `void` values, consuming a significant amount of memory for no reason and potentially crashing the application. `Stream.runDrain` avoids this problem entirely.

--- (Pattern Start: run-background-tasks-with-fork) ---

## Run Background Tasks with Effect.fork

**Rule:** Use Effect.fork to start a non-blocking background process and manage its lifecycle via its Fiber.

### Full Pattern Content:

## Guideline

To start an `Effect` in the background without blocking the current execution flow, use `Effect.fork`. This immediately returns a `Fiber`, which is a handle to the running computation that you can use to manage its lifecycle (e.g., interrupt it or wait for its result).

---

## Rationale

Unlike `Effect.all` or a direct `yield*`, which wait for the computation to complete, `Effect.fork` is a "fire and forget" operation. It starts the effect on a new, concurrent fiber and immediately returns control to the parent fiber.

This is essential for managing long-running background tasks like:
-   A web server listener.
-   A message queue consumer.
-   A periodic cache cleanup job.

The returned `Fiber` object is your remote control for the background task. You can use `Fiber.interrupt` to safely stop it (ensuring all its finalizers are run) or `Fiber.join` to wait for it to complete at some later point.

---

## Good Example

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

## Anti-Pattern

The anti-pattern is using `Effect.fork` when you immediately need the result of the computation. This is an overly complicated and less readable way of just running the effect directly.

```typescript
import { Effect, Fiber } from "effect";

const someEffect = Effect.succeed(42);

// ❌ WRONG: This is unnecessarily complex.
const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(someEffect);
  // You immediately wait for the result, defeating the purpose of forking.
  const result = yield* Fiber.join(fiber);
  return result;
});

// ✅ CORRECT: Just run the effect directly if you need its result right away.
const simplerProgram = Effect.gen(function* () {
  const result = yield* someEffect;
  return result;
});
```

--- (Pattern Start: run-effects-in-parallel-with-all) ---

## Run Independent Effects in Parallel with Effect.all

**Rule:** Use Effect.all to execute a collection of independent effects concurrently.

### Full Pattern Content:

## Guideline

When you have multiple `Effect`s that do not depend on each other's results, run them concurrently using `Effect.all`. This will execute all effects at the same time and return a new `Effect` that succeeds with a tuple containing all the results.

---

## Rationale

Running tasks sequentially when they could be done in parallel is a common source of performance bottlenecks. `Effect.all` is the solution. It's the direct equivalent of `Promise.all` in the Effect ecosystem.

Instead of waiting for Task A to finish before starting Task B, `Effect.all` starts all tasks simultaneously. The total time to complete is determined by the duration of the *longest* running effect, not the sum of all durations. If any single effect in the collection fails, the entire `Effect.all` will fail immediately.

---

## Good Example

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

## Anti-Pattern

The anti-pattern is running independent tasks sequentially using `Effect.gen`. This is inefficient and unnecessarily slows down your application.

```typescript
import { Effect } from "effect";
import { fetchUser, fetchPosts } from "./somewhere"; // From previous example

// ❌ WRONG: This is inefficient.
const program = Effect.gen(function* () {
  // fetchUser runs and completes...
  const user = yield* fetchUser;
  // ...only then does fetchPosts begin.
  const posts = yield* fetchPosts;
  return [user, posts];
});

// Total execution time will be ~2.5 seconds (1s + 1.5s),
// which is a full second slower than the parallel version.
Effect.runPromise(program).then(console.log);
```

--- (Pattern Start: send-json-response) ---

## Send a JSON Response

**Rule:** Use Http.response.json to automatically serialize data structures into a JSON response.

### Full Pattern Content:

## Guideline

To return a JavaScript object or value as a JSON response, use the `Http.response.json(data)` constructor.

---

## Rationale

APIs predominantly communicate using JSON. The `Http` module provides a dedicated `Http.response.json` helper to make this as simple and robust as possible. Manually constructing a JSON response involves serializing the data and setting the correct HTTP headers, which is tedious and error-prone.

Using `Http.response.json` is superior because:

1.  **Automatic Serialization**: It safely handles the `JSON.stringify` operation for you, including handling potential circular references or other serialization errors.
2.  **Correct Headers**: It automatically sets the `Content-Type: application/json; charset=utf-8` header. This is critical for clients to correctly interpret the response body. Forgetting this header is a common source of bugs in manually constructed APIs.
3.  **Simplicity and Readability**: Your intent is made clear with a single, declarative function call. The code is cleaner and focuses on the data being sent, not the mechanics of HTTP.
4.  **Composability**: It creates a standard `Http.response` object that works seamlessly with all other parts of the Effect `Http` module.

---

## Good Example

This example defines a route that fetches a user object and returns it as a JSON response. The `Http.response.json` function handles all the necessary serialization and header configuration.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// A route that returns a user object.
const getUserRoute = Http.router.get(
  '/users/1',
  Effect.succeed({ id: 1, name: 'Paul', team: 'Effect' }).pipe(
    // Use Http.response.json to create the response.
    Effect.map(Http.response.json)
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(getUserRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);

/*
To run this:
- GET http://localhost:3000/users/1
- Response Body: {"id":1,"name":"Paul","team":"Effect"}
- Response Headers will include: Content-Type: application/json; charset=utf-8
*/
```

## Anti-Pattern

The anti-pattern is to manually serialize the data to a string and set the headers yourself. This is verbose and introduces opportunities for error.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

const getUserRoute = Http.router.get(
  '/users/1',
  Effect.succeed({ id: 1, name: 'Paul', team: 'Effect' }).pipe(
    Effect.flatMap((user) => {
      // Manually serialize the object to a JSON string.
      const jsonString = JSON.stringify(user);
      // Create a text response with the string.
      const response = Http.response.text(jsonString);
      // Manually set the Content-Type header.
      return Effect.succeed(
        Http.response.setHeader(
          response,
          'Content-Type',
          'application/json; charset=utf-8'
        )
      );
    })
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(getUserRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

This manual approach is unnecessarily complex. It forces you to remember to perform both the serialization and the header configuration. If you forget the `setHeader` call, many clients will fail to parse the response correctly. The `Http.response.json` helper eliminates this entire class of potential bugs.

--- (Pattern Start: setup-new-project) ---

## Set Up a New Effect Project

**Rule:** Set up a new Effect project.

### Full Pattern Content:

# Set Up a New Effect Project

## Guideline

To start a new Effect project, initialize a standard Node.js project, add
`effect` and `typescript` as dependencies, and create a `tsconfig.json` file
with strict mode enabled.

## Rationale

A proper setup is crucial for leveraging Effect's powerful type-safety
features. Using TypeScript's `strict` mode is non-negotiable.

## Good Example

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

## Anti-Pattern

Avoid disabling `strict` mode in your `tsconfig.json`. Running with
`"strict": false` will cause you to lose many of the type-safety guarantees
that make Effect so powerful.

--- (Pattern Start: solve-promise-problems-with-effect) ---

## Solve Promise Problems with Effect

**Rule:** Recognize that Effect solves the core limitations of Promises: untyped errors, no dependency injection, and no cancellation.

### Full Pattern Content:

## Guideline

Recognize that `Effect` is not just a "better Promise," but a fundamentally different construct designed to solve the core limitations of native `Promise`s in TypeScript:
1.  **Untyped Errors:** Promises can reject with `any` value, forcing `try/catch` blocks and unsafe type checks.
2.  **No Dependency Injection:** Promises have no built-in way to declare or manage dependencies, leading to tightly coupled code.
3.  **No Cancellation:** Once a `Promise` starts, it cannot be cancelled from the outside.

---

## Rationale

While `async/await` is great for simple cases, building large, robust applications with `Promise`s reveals these critical gaps. Effect addresses each one directly:

-   **Typed Errors:** The `E` channel in `Effect<A, E, R>` forces you to handle specific, known error types, eliminating an entire class of runtime bugs.
-   **Dependency Injection:** The `R` channel provides a powerful, built-in system for declaring and providing dependencies (`Layer`s), making your code modular and testable.
-   **Cancellation (Interruption):** Effect's structured concurrency and `Fiber` model provide robust, built-in cancellation. When an effect is interrupted, Effect guarantees that its cleanup logic (finalizers) will be run.

Understanding that Effect was built specifically to solve these problems is key to appreciating its design and power.

---

## Good Example (The Effect Way)

This code is type-safe, testable, and cancellable. The signature `Effect.Effect<User, DbError, HttpClient>` tells us everything we need to know.

```typescript
import { Effect, Data } from "effect";

class DbError extends Data.TaggedError("DbError") {}
class HttpClient extends Effect.Tag("HttpClient")<HttpClient, any> {}
interface User { name: string; }

const findUser = (id: number): Effect.Effect<User, DbError, HttpClient> =>
  Effect.gen(function* () {
    const client = yield* HttpClient;
    // ... logic using the client
    return { name: "Paul" };
  });
```

---

## Anti-Pattern (The Promise Way)

This `Promise`-based function has several hidden problems that Effect solves:
-   What happens if `db.findUser` rejects? The error is untyped (`any`).
-   Where does `db` come from? It's a hidden dependency, making this function hard to test.
-   If the operation is slow, how do we cancel it? We can't.

```typescript
// ❌ This function has hidden dependencies and untyped errors.
async function findUserUnsafely(id: number): Promise<any> {
  try {
    const user = await db.findUser(id); // `db` is a hidden global or import
    return user;
  } catch (error) {
    // `error` is of type `any`. We don't know what it is.
    // We might log it and re-throw, but we can't handle it safely.
    throw error;
  }
}
```

--- (Pattern Start: supercharge-your-editor-with-the-effect-lsp) ---

## Supercharge Your Editor with the Effect LSP

**Rule:** Install and use the Effect LSP extension for enhanced type information and error checking in your editor.

### Full Pattern Content:

## Guideline

To significantly improve your development experience with Effect, install the official **Effect Language Server (LSP)** extension for your code editor (e.g., the "Effect" extension in VS Code).

---

## Rationale

Effect's type system is incredibly powerful, but TypeScript's default language server doesn't always display the rich information contained within the `A`, `E`, and `R` channels in the most intuitive way.

The Effect LSP is a specialized tool that understands the semantics of Effect. It hooks into your editor to provide a superior experience:
-   **Rich Inline Types:** It displays the full `Effect<A, E, R>` signature directly in your code as you work, so you always know exactly what an effect produces, how it can fail, and what it requires.
-   **Clear Error Messages:** It provides more specific and helpful error messages tailored to Effect's APIs.
-   **Enhanced Autocompletion:** It can offer more context-aware suggestions.

This tool essentially makes the compiler's knowledge visible at a glance, reducing the mental overhead of tracking complex types and allowing you to catch errors before you even save the file.

---

## Good Example

Imagine you have the following code. Without the LSP, hovering over `program` might show a complex, hard-to-read inferred type.

```typescript
import { Effect } from "effect";

const program = Effect.succeed(42).pipe(
  Effect.map((n) => n.toString()),
  Effect.flatMap((s) => Effect.log(s)),
  Effect.provide(Logger.live), // Assuming a Logger service
);
```

With the Effect LSP installed, your editor would display a clear, readable overlay right above the `program` variable, looking something like this:

```
// (LSP Inlay Hint)
// program: Effect<void, never, never>
```

This immediately tells you that the final program returns nothing (`void`), has no expected failures (`never`), and has no remaining requirements (`never`), so it's ready to be run.

---

## Anti-Pattern

Going without the LSP. While your code will still compile and work perfectly fine, you are essentially "flying blind." You miss out on the rich, real-time feedback that the LSP provides, forcing you to rely more heavily on manual type checking, `tsc` runs, and deciphering complex inferred types from your editor's default tooltips. This leads to a slower, less efficient development cycle.

--- (Pattern Start: teach-your-ai-agents-effect-with-the-mcp-server) ---

## Teach your AI Agents Effect with the MCP Server

**Rule:** Use the MCP server to provide live application context to AI coding agents, enabling more accurate assistance.

### Full Pattern Content:

## Guideline

To enable AI coding agents (like Cursor or custom bots) to provide highly accurate, context-aware assistance for your Effect application, run the **Effect MCP (Meta-Circular-Protocol) server**. This tool exposes your application's entire dependency graph and service structure in a machine-readable format.

---

## Rationale

AI coding agents are powerful, but they often lack the deep, structural understanding of a complex Effect application. They might not know which services are available in the context, what a specific `Layer` provides, or how your feature modules are composed.

The MCP server solves this problem. It's a specialized server that runs alongside your application during development. It inspects your `AppLayer` and creates a real-time, queryable model of your entire application architecture.

An AI agent can then connect to this MCP server to ask specific questions before generating code, such as:
-   "What services are available in the current context?"
-   "What is the full API of the `UserService`?"
-   "What errors can `UserRepository.findById` fail with?"

By providing this live, ground-truth context, you transform your AI from a generic coding assistant into a specialized expert on *your* specific codebase, resulting in far more accurate and useful code generation and refactoring.

---

## Good Example

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

## Anti-Pattern

Working with an AI agent without providing it with specific context. The agent will be forced to guess based on open files or generic knowledge. This often leads to it hallucinating method names, getting dependency injection wrong, or failing to handle specific error types, requiring you to manually correct its output and defeating the purpose of using an AI assistant.

--- (Pattern Start: trace-operations-with-spans) ---

## Trace Operations Across Services with Spans

**Rule:** Use Effect.withSpan to create custom tracing spans for important operations.

### Full Pattern Content:

## Guideline

To gain visibility into the performance and flow of your application, wrap logical units of work with `Effect.withSpan("span-name")`. You can add contextual information to these spans using the `attributes` option.

---

## Rationale

While logs tell you *what* happened, traces tell you *why it was slow*. In a complex application, a single user request might trigger calls to multiple services (authentication, database, external APIs). Tracing allows you to visualize this entire chain of events as a single, hierarchical "trace."

Each piece of work in that trace is a `span`. `Effect.withSpan` allows you to create your own custom spans. This is invaluable for answering questions like:
-   "For this API request, did we spend most of our time in the database or calling the external payment gateway?"
-   "Which part of our user creation logic is the bottleneck?"

Effect's tracing is built on OpenTelemetry, the industry standard, so it integrates seamlessly with tools like Jaeger, Zipkin, and Datadog.

---

## Good Example

This example shows a multi-step operation. Each step, and the overall operation, is wrapped in a span. This creates a parent-child hierarchy in the trace that is easy to visualize.

```typescript
import { Effect } from "effect";

const validateInput = (input: unknown) =>
  Effect.succeed({ email: "paul@example.com" }).pipe(
    Effect.delay("10 millis"),
    // This creates a child span
    Effect.withSpan("validateInput"),
  );

const saveToDatabase = (user: { email: string }) =>
  Effect.succeed({ id: 123, ...user }).pipe(
    Effect.delay("50 millis"),
    // This span includes useful attributes
    Effect.withSpan("saveToDatabase", {
      attributes: { "db.system": "postgresql", "db.user.email": user.email },
    }),
  );

const createUser = (input: unknown) =>
  Effect.gen(function* () {
    const validated = yield* validateInput(input);
    const user = yield* saveToDatabase(validated);
    return user;
  }).pipe(
    // This is the parent span for the entire operation
    Effect.withSpan("createUserOperation"),
  );

// When run with a tracing SDK, this will produce a trace with a root span
// "createUserOperation" and two child spans: "validateInput" and "saveToDatabase".
Effect.runPromise(createUser({}));
```

---

## Anti-Pattern

Not adding custom spans to your business logic. 
Without them, your traces will only show high-level information from your framework (e.g., "HTTP POST /users"). 
You will have no visibility into the performance of the individual steps *inside* your request handler, making it very difficult to pinpoint bottlenecks. Your application's logic remains a "black box" in your traces.

--- (Pattern Start: transform-data-with-schema) ---

## Transform Data During Validation with Schema

**Rule:** Use Schema.transform to safely convert data types during the validation and parsing process.

### Full Pattern Content:

## Guideline

To convert data from one type to another as part of the validation process, use `Schema.transform`. This allows you to define a schema that parses an input type (e.g., `string`) and outputs a different, richer domain type (e.g., `Date`).

---

## Rationale

Often, the data you receive from external sources (like an API) isn't in the ideal format for your application's domain model. For example, dates are sent as ISO strings, but you want to work with `Date` objects.

`Schema.transform` integrates this conversion directly into the parsing step. It takes two functions: one to `decode` the input type into the domain type, and one to `encode` it back. This makes your schema the single source of truth for both the shape and the type transformation of your data.

For transformations that can fail (like creating a branded type), you can use `Schema.transformOrFail`, which allows the decoding step to return an `Either`.

---

## Good Example 1: Parsing a Date String

This schema parses a string but produces a `Date` object, making the final data structure much more useful.

```typescript
import { Schema, Effect } from "effect";

// This schema takes a string as input and outputs a Date object.
const DateFromString = Schema.string.pipe(
  Schema.transform(
    Schema.Date,
    (s) => new Date(s), // decode
    (d) => d.toISOString(), // encode
  ),
);

const ApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: DateFromString,
});

const rawInput = { name: "User Login", timestamp: "2025-06-22T20:08:42.000Z" };

const program = Schema.decode(ApiEventSchema)(rawInput);

Effect.runPromise(program).then((event) => {
  // `event.timestamp` is a Date object, not a string!
  console.log(event.timestamp.getFullYear()); // 2025
});
```

## Good Example 2: Creating a Branded Type

`transformOrFail` is perfect for creating branded types, as the validation can fail.

```typescript
import { Schema, Effect, Brand, Either } from "effect";

type Email = string & Brand.Brand<"Email">;
const Email = Schema.string.pipe(
  Schema.transformOrFail(
    Schema.brand<Email>("Email"),
    (s, _, ast) =>
      s.includes("@")
        ? Either.right(s as Email)
        : Either.left(Schema.ParseError.create(ast, "Invalid email format")),
    (email) => Either.right(email),
  ),
);

const result = Schema.decode(Email)("paul@example.com"); // Succeeds
const errorResult = Schema.decode(Email)("invalid-email"); // Fails
```

---

## Anti-Pattern

Performing validation and transformation in two separate steps. This is more verbose, requires creating intermediate types, and separates the validation logic from the transformation logic.

```typescript
import { Schema, Effect } from "effect";

// ❌ WRONG: Requires an intermediate "Raw" type.
const RawApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: Schema.String,
});

const rawInput = { name: "User Login", timestamp: "2025-06-22T20:08:42.000Z" };

// The logic is now split into two distinct, less cohesive steps.
const program = Schema.decode(RawApiEventSchema)(rawInput).pipe(
  Effect.map((rawEvent) => ({
    ...rawEvent,
    timestamp: new Date(rawEvent.timestamp), // Manual transformation after parsing.
  })),
);
```

--- (Pattern Start: transform-effect-values) ---

## Transform Effect Values with map and flatMap

**Rule:** Transform Effect values with map and flatMap.

### Full Pattern Content:

# Transform Effect Values with map and flatMap

## Guideline

To work with the success value of an `Effect`, use `Effect.map` for simple,
synchronous transformations and `Effect.flatMap` for effectful transformations.

## Rationale

`Effect.map` is like `Array.prototype.map`. `Effect.flatMap` is like
`Promise.prototype.then` and is used when your transformation function itself
returns an `Effect`.

## Good Example

```typescript
import { Effect } from "effect";

const getUser = (id: number): Effect.Effect<{ id: number; name: string }> =>
  Effect.succeed({ id, name: "Paul" });

const getPosts = (userId: number): Effect.Effect<{ title: string }[]> =>
  Effect.succeed([{ title: "My First Post" }]);

const userPosts = getUser(123).pipe(
  Effect.flatMap((user) => getPosts(user.id)),
);
```

**Explanation:**  
Use `flatMap` to chain effects that depend on each other, and `map` for
simple value transformations.

## Anti-Pattern

Using `map` when you should be using `flatMap`. This results in a nested
`Effect<Effect<...>>`, which is usually not what you want.

--- (Pattern Start: stream-from-paginated-api) ---

## Turn a Paginated API into a Single Stream

**Rule:** Use Stream.paginateEffect to model a paginated data source as a single, continuous stream.

### Full Pattern Content:

## Guideline

To handle a data source that is split across multiple pages, use `Stream.paginateEffect` to abstract the pagination logic into a single, continuous `Stream`.

---

## Rationale

Calling paginated APIs is a classic programming challenge. It often involves writing complex, stateful, and imperative code with manual loops to fetch one page, check if there's a next page, fetch that page, and so on, all while accumulating the results. This logic is tedious to write and easy to get wrong.

`Stream.paginateEffect` elegantly solves this by declaratively modeling the pagination process:

1.  **Declarative and Stateless**: You provide a function that knows how to fetch a single page, and the `Stream` handles the looping, state management (the current page token/number), and termination logic for you. Your business logic remains clean and stateless.
2.  **Lazy and Efficient**: The stream fetches pages on demand as they are consumed. If a downstream consumer only needs the first 20 items, the stream will only make enough API calls to satisfy that need, rather than wastefully fetching all pages upfront.
3.  **Fully Composable**: The result is a standard `Stream`. This means you can pipe the continuous flow of items directly into other powerful operators like `mapEffect` for concurrent processing or `grouped` for batching, without ever thinking about page boundaries again.

---

## Good Example

This example simulates fetching users from a paginated API. The `fetchUsersPage` function gets one page of data and returns the next page number. `Stream.paginateEffect` uses this function to create a single stream of all users across all pages.

```typescript
import { Effect, Stream, Chunk, Option } from 'effect';

// --- Mock Paginated API ---
interface User {
  id: number;
  name: string;
}

const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

// This function simulates fetching a page of users from an API.
const fetchUsersPage = (
  page: number
): Effect.Effect<[Chunk.Chunk<User>, Option.Option<number>], Error> => {
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  const users = Chunk.fromIterable(allUsers.slice(offset, offset + pageSize));

  const nextPage =
    Chunk.isNonEmpty(users) && allUsers.length > offset + pageSize
      ? Option.some(page + 1)
      : Option.none();

  return Effect.succeed([users, nextPage]).pipe(
    Effect.tap(() => Effect.log(`Fetched page ${page}`))
  );
};

// --- The Pattern ---
// Use paginateEffect, providing an initial state (page 1) and the fetch function.
const userStream = Stream.paginateEffect(1, fetchUsersPage);

const program = userStream.pipe(
  Stream.runCollect,
  Effect.map((users) => users.length)
);

Effect.runPromise(program).then((totalUsers) => {
  console.log(`Total users fetched from all pages: ${totalUsers}`);
});
/*
Output:
... level=INFO msg="Fetched page 1"
... level=INFO msg="Fetched page 2"
... level=INFO msg="Fetched page 3"
Total users fetched from all pages: 25
*/
```

## Anti-Pattern

The anti-pattern is to write manual, imperative logic to handle the pagination loop. This code is stateful, harder to read, and not composable.

```typescript
import { Effect, Chunk, Option } from 'effect';
// ... same mock API setup ...

const fetchAllUsersManually = (): Effect.Effect<Chunk.Chunk<User>, Error> =>
  Effect.gen(function* () {
    // Manual state management for results and current page
    let allFetchedUsers: User[] = [];
    let currentPage: Option.Option<number> = Option.some(1);

    // Manual loop to fetch pages
    while (Option.isSome(currentPage)) {
      const [users, nextPage] = yield* fetchUsersPage(currentPage.value);
      allFetchedUsers = allFetchedUsers.concat(Chunk.toArray(users));
      currentPage = nextPage;
    }

    return Chunk.fromIterable(allFetchedUsers);
  });

const program = fetchAllUsersManually().pipe(
  Effect.map((users) => users.length)
);

Effect.runPromise(program).then((totalUsers) => {
  console.log(`Total users fetched from all pages: ${totalUsers}`);
});
```

This manual approach is inferior because it forces you to manage state explicitly (`allFetchedUsers`, `currentPage`). The logic is contained within a single, monolithic effect that is not lazy and cannot be easily composed with other stream operators without first collecting all results. `Stream.paginateEffect` abstracts away this entire block of boilerplate code.

--- (Pattern Start: understand-fibers-as-lightweight-threads) ---

## Understand Fibers as Lightweight Threads

**Rule:** Understand that a Fiber is a lightweight, virtual thread managed by the Effect runtime for massive concurrency.

### Full Pattern Content:

## Guideline

Think of a `Fiber` as a "virtual thread" or a "green thread." It is the fundamental unit of concurrency in Effect. Every `Effect` you run is executed on a `Fiber`. Unlike OS threads, which are heavy and limited, you can create hundreds of thousands or even millions of fibers without issue.

---

## Rationale

In traditional multi-threaded programming, each thread is managed by the operating system, consumes significant memory (for its stack), and involves expensive context switching. This limits the number of concurrent threads you can realistically create.

Effect's `Fiber`s are different. They are managed entirely by the Effect runtime, not the OS. They are incredibly lightweight data structures that don't have their own OS thread stack. The Effect runtime uses a cooperative scheduling mechanism to run many fibers on a small pool of OS threads (often just one in Node.js).

This model, known as M:N threading (M fibers on N OS threads), allows for a massive level of concurrency that is impossible with traditional threads. It's what makes Effect so powerful for building highly concurrent applications like servers, data pipelines, and real-time systems.

When you use operators like `Effect.fork` or `Effect.all`, you are creating new fibers.

---

## Good Example

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

## Anti-Pattern: Mental Model Mismatch

The anti-pattern is thinking that a `Fiber` is the same as an OS thread. This can lead to incorrect assumptions about performance and behavior.

-   **Don't assume parallelism on CPU-bound tasks:** In a standard Node.js environment, all fibers run on a single OS thread. If you run 10 CPU-intensive tasks on 10 fibers, they will not run in parallel on 10 different CPU cores. They will share time on the single main thread. Fibers provide massive concurrency for I/O-bound tasks (like network requests), not CPU-bound parallelism.
-   **Don't worry about blocking:** A `Fiber` that is "sleeping" or waiting for I/O (like `Effect.sleep` or a `fetch` request) does not block the underlying OS thread. The Effect runtime simply puts it aside and uses the thread to run other ready fibers.

--- (Pattern Start: understand-layers-for-dependency-injection) ---

## Understand Layers for Dependency Injection

**Rule:** Understand that a Layer is a blueprint describing how to construct a service and its dependencies.

### Full Pattern Content:

## Guideline

Think of a `Layer<R, E, A>` as a recipe for building a service. It's a declarative blueprint that specifies:
-   **`A` (Output)**: The service it provides (e.g., `HttpClient`).
-   **`R` (Requirements)**: The other services it needs to be built (e.g., `ConfigService`).
-   **`E` (Error)**: The errors that could occur during its construction (e.g., `ConfigError`).

---

## Rationale

In Effect, you don't create service instances directly. Instead, you define `Layer`s that describe *how* to create them. This separation of declaration from implementation is the core of Effect's powerful dependency injection (DI) system.

This approach has several key benefits:
-   **Composability:** You can combine small, focused layers into a complete application layer (`Layer.merge`, `Layer.provide`).
-   **Declarative Dependencies:** A layer's type signature explicitly documents its own dependencies, making your application's architecture clear and self-documenting.
-   **Testability:** For testing, you can easily swap a "live" layer (e.g., one that connects to a real database) with a "test" layer (one that provides mock data) without changing any of your business logic.

---

## Good Example

Here, we define a `Notifier` service that requires a `Logger` to be built. The `NotifierLive` layer's type signature, `Layer<Logger, never, Notifier>`, clearly documents this dependency.

```typescript
import { Effect, Layer } from "effect";

// Define the services
class Logger extends Effect.Tag("Logger")<Logger, { log: (msg: string) => Effect.Effect<void> }> {}
class Notifier extends Effect.Tag("Notifier")<Notifier, { notify: (msg: string) => Effect.Effect<void> }> {}

// Define a live implementation for the Logger
const LoggerLive = Layer.succeed(Logger, {
  log: (msg) => Effect.sync(() => console.log(`LOG: ${msg}`)),
});

// Define a live implementation for the Notifier.
// It REQUIRES a Logger to be constructed.
const NotifierLive = Layer.effect(
  Notifier,
  Effect.gen(function* () {
    const logger = yield* Logger; // Get the dependency from the context
    return {
      notify: (msg) => logger.log(`Notifying: ${msg}`),
    };
  }),
);

// The type of NotifierLive is Layer<Logger, never, Notifier>
// This tells us it provides a Notifier, but needs a Logger.

// To create a runnable program, we must satisfy all requirements.
const AppLayer = Layer.provide(NotifierLive, LoggerLive);

const program = Notifier.pipe(Effect.flatMap((n) => n.notify("Hello, World!")));

// We provide the fully composed AppLayer to the program.
Effect.runSync(Effect.provide(program, AppLayer));
```

---

## Anti-Pattern

Manually creating and passing service instances around. This is the "poor man's DI" and leads to tightly coupled code that is difficult to test and maintain.

```typescript
// ❌ WRONG: Manual instantiation and prop-drilling.
class LoggerImpl {
  log(msg: string) { console.log(msg); }
}

class NotifierImpl {
  constructor(private logger: LoggerImpl) {}
  notify(msg: string) { this.logger.log(msg); }
}

// Dependencies must be created and passed in manually.
const logger = new LoggerImpl();
const notifier = new NotifierImpl(logger);

// This is not easily testable without creating real instances.
notifier.notify("Hello");
```

--- (Pattern Start: effects-are-lazy) ---

## Understand that Effects are Lazy Blueprints

**Rule:** Understand that effects are lazy blueprints.

### Full Pattern Content:

# Understand that Effects are Lazy Blueprints

## Guideline

An `Effect` is not a value or a `Promise`. It is a lazy, immutable blueprint
that describes a computation. It does nothing on its own until it is passed to
a runtime executor (e.g., `Effect.runPromise` or `Effect.runSync`).

## Rationale

This laziness is a superpower because it makes your code composable,
predictable, and testable. Unlike a `Promise` which executes immediately,
an `Effect` is just a description of work, like a recipe waiting for a chef.

## Good Example

```typescript
import { Effect } from "effect";

console.log("1. Defining the Effect blueprint...");

const program = Effect.sync(() => {
  console.log("3. The blueprint is now being executed!");
  return 42;
});

console.log("2. The blueprint has been defined. No work has been done yet.");

Effect.runSync(program);
```

**Explanation:**  
Defining an `Effect` does not execute any code inside it. Only when you call
`Effect.runSync(program)` does the computation actually happen.

## Anti-Pattern

Assuming an `Effect` behaves like a `Promise`. A `Promise` executes its work
immediately upon creation. Never expect a side effect to occur just from
defining an `Effect`.

--- (Pattern Start: understand-effect-channels) ---

## Understand the Three Effect Channels (A, E, R)

**Rule:** Understand that an Effect&lt;A, E, R&gt; describes a computation with a success type (A), an error type (E), and a requirements type (R).

### Full Pattern Content:

## Guideline

Every `Effect` has three generic type parameters: ``Effect<A, E, R>`` which represent its three "channels":
-   **`A` (Success Channel):** The type of value the `Effect` will produce if it succeeds.
-   **`E` (Error/Failure Channel):** The type of error the `Effect` can fail with. These are expected, recoverable errors.
-   **`R` (Requirement/Context Channel):** The services or dependencies the `Effect` needs to run.

---

## Rationale

This three-channel signature is what makes Effect so expressive and safe. Unlike a ``Promise<A>`` which can only describe its success type, an ``Effect``'s signature tells you everything you need to know about a computation before you run it:
1.  **What it produces (`A`):** The data you get on the "happy path."
2.  **How it can fail (`E`):** The specific, known errors you need to handle. This makes error handling type-safe and explicit, unlike throwing generic `Error`s.
3.  **What it needs (`R`):** The "ingredients" or dependencies required to run the effect. This is the foundation of Effect's powerful dependency injection system. An `Effect` can only be executed when its `R` channel is `never`, meaning all its dependencies have been provided.

This turns the TypeScript compiler into a powerful assistant that ensures you've handled all possible outcomes and provided all necessary dependencies.

---

## Good Example

This function signature is a self-documenting contract. It clearly states that to get a `User`, you must provide a `Database` service, and the operation might fail with a `UserNotFoundError`.

```typescript
import { Effect, Data, Layer } from "effect";

// Define the types for our channels
interface User { readonly name: string; } // The 'A' type
class UserNotFoundError extends Data.TaggedError("UserNotFoundError") {} // The 'E' type
class Database extends Effect.Tag("Database")<Database, { findUser: (id: number) => Effect.Effect<User, UserNotFoundError> }> {} // The 'R' type

// This function's signature clearly shows all three channels
const getUser = (id: number): Effect.Effect<User, UserNotFoundError, Database> =>
  Database.pipe(Effect.flatMap((db) => db.findUser(id)));

// To make the effect runnable, we provide a Layer for the Database.
// This satisfies the `R` requirement, changing it from `Database` to `never`.
const DatabaseLive = Layer.succeed(Database, {
  findUser: (id) =>
    id === 1
      ? Effect.succeed({ name: "Paul" })
      : Effect.fail(new UserNotFoundError()),
});

// The type of this program is now Effect<User, UserNotFoundError, never>
const runnableProgram = getUser(1).pipe(Effect.provide(DatabaseLive));

Effect.runPromise(runnableProgram).then(console.log); // { name: 'Paul' }
```

---

## Anti-Pattern

Ignoring the type system and using generic types. This throws away all the safety and clarity that Effect provides.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This signature is dishonest and unsafe.
// It hides the dependency on a database and the possibility of failure.
function getUserUnsafely(id: number, db: any): Effect.Effect<any> {
  try {
    const user = db.findUser(id);
    if (!user) {
      // This will be an unhandled defect, not a typed error.
      throw new Error("User not found");
    }
    return Effect.succeed(user);
  } catch (e) {
    // This is also an untyped failure.
    return Effect.fail(e);
  }
}
```

--- (Pattern Start: use-pipe-for-composition) ---

## Use .pipe for Composition

**Rule:** Use .pipe for composition.

### Full Pattern Content:

# Use .pipe for Composition

## Guideline

To apply a sequence of transformations or operations to an `Effect`, use the
`.pipe()` method.

## Rationale

Piping makes code readable and avoids deeply nested function calls. It allows
you to see the flow of data transformations in a clear, linear fashion.

## Good Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed(5).pipe(
  Effect.map((n) => n * 2),
  Effect.map((n) => `The result is ${n}`),
  Effect.tap(Effect.log),
);
```

**Explanation:**  
Using `.pipe()` allows you to compose operations in a top-to-bottom style,
improving readability and maintainability.

## Anti-Pattern

Nesting function calls manually. This is hard to read and reorder.
`Effect.tap(Effect.map(Effect.map(Effect.succeed(5), n => n * 2), n => ...))`

--- (Pattern Start: use-chunk-for-high-performance-collections) ---

## Use Chunk for High-Performance Collections

**Rule:** Prefer Chunk over Array for immutable collection operations within data processing pipelines for better performance.

### Full Pattern Content:

## Guideline

For collections that will be heavily transformed with immutable operations (e.g., `map`, `filter`, `append`), use `Chunk<A>`. `Chunk` is Effect's implementation of a persistent and chunked vector that provides better performance than native arrays for these use cases.

---

## Rationale

JavaScript's `Array` is a mutable data structure. Every time you perform an "immutable" operation like `[...arr, newItem]` or `arr.map(...)`, you are creating a brand new array and copying all the elements from the old one. For small arrays, this is fine. For large arrays or in hot code paths, this constant allocation and copying can become a performance bottleneck.

`Chunk` is designed to solve this. It's an immutable data structure that uses structural sharing internally. When you append an item to a `Chunk`, it doesn't re-copy the entire collection. Instead, it creates a new `Chunk` that reuses most of the internal structure of the original, only allocating memory for the new data. This makes immutable appends and updates significantly faster.

---

## Good Example

This example shows how to create and manipulate a `Chunk`. The API is very similar to `Array`, but the underlying performance characteristics for these immutable operations are superior.

```typescript
import { Chunk } from "effect";

// Create a Chunk from an array
let numbers = Chunk.fromIterable([1, 2, 3, 4, 5]);

// Append a new element. This is much faster than [...arr, 6] on large collections.
numbers = Chunk.append(numbers, 6);

// Prepend an element.
numbers = Chunk.prepend(numbers, 0);

// Take the first 3 elements
const firstThree = Chunk.take(numbers, 3);

// Convert back to an array when you need to interface with other libraries
const finalArray = Chunk.toReadonlyArray(firstThree);

console.log(finalArray); // [0, 1, 2]
```

---

## Anti-Pattern

Eagerly converting a large or potentially infinite iterable to a `Chunk` before streaming. This completely negates the memory-safety benefits of using a `Stream`.

```typescript
import { Effect, Stream, Chunk } from "effect";

// A generator that could produce a very large (or infinite) number of items.
function* largeDataSource() {
  let i = 0;
  while (i < 1_000_000) {
    yield i++;
  }
}

// ❌ DANGEROUS: `Chunk.fromIterable` will try to pull all 1,000,000 items
// from the generator and load them into memory at once before the stream
// even starts. This can lead to high memory usage or a crash.
const programWithChunk = Stream.fromChunk(Chunk.fromIterable(largeDataSource())).pipe(
  Stream.map((n) => n * 2),
  Stream.runDrain,
);

// ✅ CORRECT: `Stream.fromIterable` pulls items from the data source lazily,
// one at a time (or in small batches), maintaining constant memory usage.
const programWithIterable = Stream.fromIterable(largeDataSource()).pipe(
  Stream.map((n) => n * 2),
  Stream.runDrain,
);
```

--- (Pattern Start: use-gen-for-business-logic) ---

## Use Effect.gen for Business Logic

**Rule:** Use Effect.gen for business logic.

### Full Pattern Content:

# Use Effect.gen for Business Logic

## Guideline

Use `Effect.gen` to write your core business logic, especially when it involves
multiple sequential steps or conditional branching.

## Rationale

Generators provide a syntax that closely resembles standard synchronous code
(`async/await`), making complex workflows significantly easier to read, write,
and debug.

## Good Example

```typescript
import { Effect } from "effect";

declare const validateUser: (data: any) => Effect.Effect<any>;
declare const hashPassword: (pw: string) => Effect.Effect<string>;
declare const dbCreateUser: (data: any) => Effect.Effect<any>;

const createUser = (userData: any) =>
  Effect.gen(function* () {
    const validated = yield* validateUser(userData);
    const hashed = yield* hashPassword(validated.password);
    return yield* dbCreateUser({ ...validated, password: hashed });
  });
```

**Explanation:**  
`Effect.gen` allows you to express business logic in a clear, sequential style,
improving maintainability.

## Anti-Pattern

Using long chains of `.andThen` or `.flatMap` for multi-step business logic.
This is harder to read and pass state between steps.

--- (Pattern Start: use-default-layer-for-tests) ---

## Use the Auto-Generated .Default Layer in Tests

**Rule:** Use the auto-generated .Default layer in tests.

### Full Pattern Content:

# Use the Auto-Generated .Default Layer in Tests

## Guideline

In your tests, provide service dependencies using the static `.Default` property that `Effect.Service` automatically attaches to your service class.

## Rationale

The `.Default` layer is the canonical way to provide a service in a test environment. It's automatically created, correctly scoped, and handles resolving any transitive dependencies, making tests cleaner and more robust.

## Good Example

```typescript
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MyService } from "../MyService";

describe("MyService", () => {
  it("should perform its operation", () =>
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.doSomething();
      expect(result).toBe("done");
    }).pipe(
      Effect.provide(MyService.Default), // ✅ Correct
      Effect.runPromise,
    ));
});
```

**Explanation:**  
This approach ensures your tests are idiomatic, maintainable, and take full advantage of Effect's dependency injection system.

## Anti-Pattern

Do not create manual layers for your service in tests (`Layer.succeed(...)`) or try to provide the service class directly. This bypasses the intended dependency injection mechanism.

--- (Pattern Start: validate-request-body) ---

## Validate Request Body

**Rule:** Use Http.request.schemaBodyJson with a Schema to automatically parse and validate request bodies.

### Full Pattern Content:

## Guideline

To process an incoming request body, use `Http.request.schemaBodyJson(YourSchema)` to parse the JSON and validate its structure in a single, type-safe step.

---

## Rationale

Accepting user-provided data is one of the most critical and sensitive parts of an API. You must never trust incoming data. The `Http` module's integration with `Schema` provides a robust, declarative solution for this.

Using `Http.request.schemaBodyJson` offers several major advantages:

1.  **Automatic Validation and Error Handling**: If the incoming body does not match the schema, the server automatically rejects the request with a `400 Bad Request` status and a detailed JSON response explaining the validation errors. You don't have to write any of this boilerplate logic.
2.  **Type Safety**: If the validation succeeds, the value produced by the `Effect` is fully typed according to your `Schema`. This eliminates `any` types and brings static analysis benefits to your request handlers.
3.  **Declarative and Clean**: The validation rules are defined once in the `Schema` and then simply applied. This separates the validation logic from your business logic, keeping handlers clean and focused on their core task.
4.  **Security**: It acts as a security gateway, ensuring that malformed or unexpected data structures never reach your application's core logic.

---

## Good Example

This example defines a `POST` route to create a user. It uses a `CreateUser` schema to validate the request body. If validation passes, it returns a success message with the typed data. If it fails, the platform automatically sends a descriptive 400 error.

```typescript
import { Effect, Schema } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// Define the expected structure of the request body using Schema.
const CreateUser = Schema.Struct({
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
});

// Define a POST route.
const createUserRoute = Http.router.post(
  '/users',
  // Use schemaBodyJson to parse and validate.
  // The result is an Effect<CreateUser, ...>
  Http.request.schemaBodyJson(CreateUser).pipe(
    Effect.map((user) =>
      // If we get here, validation succeeded and `user` is fully typed.
      Http.response.text(`Successfully created user: ${user.name}`)
    )
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(createUserRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);

/*
To run this:
- POST http://localhost:3000/users with body {"name": "Paul", "email": "paul@effect.com"}
  -> 200 OK "Successfully created user: Paul"

- POST http://localhost:3000/users with body {"name": "Paul"}
  -> 400 Bad Request with a JSON body explaining the 'email' field is missing.
*/
```

## Anti-Pattern

The anti-pattern is to manually parse the JSON and then write imperative validation checks. This approach is verbose, error-prone, and not type-safe.

```typescript
import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

const createUserRoute = Http.router.post(
  '/users',
  Http.request.json.pipe(
    // Http.request.json returns Effect<unknown, ...>
    Effect.flatMap((body) => {
      // Manually check the type and properties of the body.
      if (
        typeof body === 'object' &&
        body !== null &&
        'name' in body &&
        typeof body.name === 'string' &&
        'email' in body &&
        typeof body.email === 'string'
      ) {
        // The type is still not safely inferred here without casting.
        return Http.response.text(`Successfully created user: ${body.name}`);
      } else {
        // Manually create and return a generic error response.
        return Http.response.text('Invalid request body', { status: 400 });
      }
    })
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(createUserRoute));

const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

NodeRuntime.runMain(program);
```

This manual code is significantly worse. It's hard to read, easy to get wrong, and loses all static type information from the parsed body. Crucially, it forces you to reinvent the wheel for error reporting, which will likely be less detailed and consistent than the automatic responses provided by the platform.

--- (Pattern Start: wrap-asynchronous-computations) ---

## Wrap Asynchronous Computations with tryPromise

**Rule:** Wrap asynchronous computations with tryPromise.

### Full Pattern Content:

# Wrap Asynchronous Computations with tryPromise

## Guideline

To integrate a `Promise`-based function (like `fetch`), use `Effect.tryPromise`.

## Rationale

This is the standard bridge from the Promise-based world to Effect, allowing
you to leverage the massive `async/await` ecosystem safely.

## Good Example

```typescript
import { Effect } from "effect";

class HttpError extends Effect.Tag("HttpError") {}

const getUrl = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new HttpError(),
  });
```

**Explanation:**  
`Effect.tryPromise` wraps a `Promise`-returning function and safely handles
rejections, moving errors into the Effect's error channel.

## Anti-Pattern

Manually handling `.then()` and `.catch()` inside an `Effect.sync`. This is
verbose, error-prone, and defeats the purpose of using Effect's built-in
Promise integration.

--- (Pattern Start: wrap-synchronous-computations) ---

## Wrap Synchronous Computations with sync and try

**Rule:** Wrap synchronous computations with sync and try.

### Full Pattern Content:

# Wrap Synchronous Computations with sync and try

## Guideline

To bring a synchronous side-effect into Effect, wrap it in a thunk (`() => ...`).
Use `Effect.sync` for functions guaranteed not to throw, and `Effect.try` for
functions that might throw.

## Rationale

This is the primary way to safely integrate with synchronous libraries like
`JSON.parse`. `Effect.try` captures any thrown exception and moves it into
the Effect's error channel.

## Good Example

```typescript
import { Effect } from "effect";

const randomNumber = Effect.sync(() => Math.random());

const parseJson = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (error) => new Error(`JSON parsing failed: ${error}`),
  });
```

**Explanation:**  
Use `Effect.sync` for safe synchronous code, and `Effect.try` to safely
handle exceptions from potentially unsafe code.

## Anti-Pattern

Never use `Effect.sync` for an operation that could throw, like `JSON.parse`.
This can lead to unhandled exceptions that crash your application.

--- (Pattern Start: write-sequential-code-with-gen) ---

## Write Sequential Code with Effect.gen

**Rule:** Write sequential code with Effect.gen.

### Full Pattern Content:

# Write Sequential Code with Effect.gen

## Guideline

For sequential operations that depend on each other, use `Effect.gen` to write
your logic in a familiar, imperative style. It's the Effect-native equivalent
of `async/await`.

## Rationale

`Effect.gen` uses generator functions to create a flat, linear, and highly
readable sequence of operations, avoiding the nested "callback hell" of
`flatMap`.

## Good Example

```typescript
import { Effect } from "effect";

const getPostsWithGen = Effect.gen(function* () {
  const response = yield* Effect.tryPromise(() => fetch("..."));
  const user = yield* Effect.tryPromise(() => response.json() as Promise<any>);
  // ... more steps
  return user;
});
```

**Explanation:**  
`Effect.gen` allows you to write top-to-bottom code that is easy to read and
maintain, even when chaining many asynchronous steps.

## Anti-Pattern

Deeply nesting `flatMap` calls. This is much harder to read and maintain than
the equivalent `Effect.gen` block.

--- (Pattern Start: write-tests-that-adapt-to-application-code) ---

## Write Tests That Adapt to Application Code

**Rule:** Write tests that adapt to application code.

### Full Pattern Content:

# Write Tests That Adapt to Application Code

## Guideline

Tests are secondary artifacts that serve to validate the application. The application's code and interfaces are the source of truth. When a test fails, fix the test's logic or setup, not the production code.

## Rationale

Treating application code as immutable during testing prevents the introduction of bugs and false test confidence. The goal of a test is to verify real-world behavior; changing that behavior to suit the test invalidates its purpose.

## Good Example

```typescript
// 1. Read the actual service interface first.
export interface DatabaseServiceApi {
  getUserById: (id: number) => Effect.Effect<User, NotFoundError>;
}

// 2. Write a test that correctly invokes that interface.
it("should return a user", () =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const result = yield* Effect.either(db.getUserById(123));
    // ... assertions
  }).pipe(Effect.provide(DatabaseService.Default), Effect.runPromise));
```

**Explanation:**  
Tests should reflect the real interface and behavior of your code, not force changes to it.

## Anti-Pattern

Any action where the test dictates a change to the application code. Do not modify a service file to add a method just because a test needs it. If a test fails, fix the test.

