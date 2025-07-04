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

## Add Custom Metrics to Your Application
**Rule:** Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

### Example
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

## Model Dependencies as Services
**Rule:** Model dependencies as services.

### Example
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

## Create a Testable HTTP Client Service
**Rule:** Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

### Example
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