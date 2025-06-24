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

Using ``Effect<Option<A>>`` often leads to clearer and more precise business logic.

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

For collections that will be heavily transformed with immutable operations (e.g., `map`, `filter`, `append`), use ``Chunk<A>``. ``Chunk`` is Effect's implementation of a persistent and chunked vector that provides better performance than native arrays for these use cases.

---

## Rationale

JavaScript's `Array` is a mutable data structure. Every time you perform an "immutable" operation like `[...arr, newItem]` or `arr.map(...)`, you are creating a brand new array and copying all the elements from the old one. For small arrays, this is fine. For large arrays or in hot code paths, this constant allocation and copying can become a performance bottleneck.

`Chunk` is designed to solve this. It's an immutable data structure that uses structural sharing internally. When you append an item to a `Chunk`, it doesn't re-copy the entire collection. Instead, it creates a new `Chunk` that reuses most of the internal structure of the original, only allocating memory for the new data. This makes immutable appends and updates significantly faster.

`Stream` uses `Chunk` internally for this very reason. You should use `Chunk` when you are building data processing pipelines or need to work with collections in a highly performant, immutable way.

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

Using standard JavaScript arrays for heavy, immutable data processing pipelines, especially within a `Stream`. This can lead to unnecessary memory allocation and garbage collection pressure.

```typescript
import { Effect, Stream } from "effect";

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ❌ This works, but can be less performant.
// Inside this stream, each `map` and `filter` creates new intermediate arrays.
const program = Stream.fromIterable(numbers).pipe(
  Stream.map((n) => n * 2),
  Stream.filter((n) => n > 10),
  Stream.runCollect, // This will collect the results into a Chunk anyway
);

// ✅ Better: If you start with a Chunk, the operations can be more efficient.
const programWithChunk = Stream.fromChunk(Chunk.fromIterable(numbers)).pipe(
  Stream.map((n) => n * 2),
  Stream.filter((n) => n > 10),
  Stream.runCollect,
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

