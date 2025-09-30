# Making HTTP Requests Patterns

## Add Caching by Wrapping a Layer

Use a wrapping Layer to add cross-cutting concerns like caching to a service without altering its original implementation.

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

---

## Add Custom Metrics to Your Application

Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

### Example

This example creates a counter to track how many times a user is created and a histogram to track the duration of the database operation.

```typescript
import { Effect, Metric, Duration } from "effect";  // We don't need MetricBoundaries anymore

// 1. Define your metrics
const userRegisteredCounter = Metric.counter("users_registered_total", {
  description: "A counter for how many users have been registered.",
});

const dbDurationTimer = Metric.timer(
  "db_operation_duration",
  "A timer for DB operation durations"
);

// 2. Simulated database call
const saveUserToDb = Effect.succeed("user saved").pipe(
  Effect.delay(Duration.millis(Math.random() * 100)),
);

// 3. Instrument the business logic
const createUser = Effect.gen(function* () {
  // Time the operation
  yield* saveUserToDb.pipe(Metric.trackDuration(dbDurationTimer));

  // Increment the counter
  yield* Metric.increment(userRegisteredCounter);

  return { status: "success" };
});

// Run the Effect
const programWithLogging = Effect.gen(function* () {
  const result = yield* createUser;
  yield* Effect.log(`Result: ${JSON.stringify(result)}`);
  return result;
});

Effect.runPromise(programWithLogging);
```

---

---

## Build a Basic HTTP Server

Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

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

---

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

## Create a Testable HTTP Client Service

Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

### Example

### 1. Define the Service

```typescript
import { Effect, Data, Layer } from "effect";

interface HttpErrorType {
  readonly _tag: "HttpError";
  readonly error: unknown;
}

const HttpError = Data.tagged<HttpErrorType>("HttpError");

interface HttpClientType {
  readonly get: <T>(url: string) => Effect.Effect<T, HttpErrorType>;
}

class HttpClient extends Effect.Service<HttpClientType>()("HttpClient", {
  sync: () => ({
    get: <T>(url: string): Effect.Effect<T, HttpErrorType> =>
      Effect.tryPromise<T>(() =>
        fetch(url).then((res) => res.json() as T)
      ).pipe(
        Effect.catchAll((error) => Effect.fail(HttpError({ error })))
      ),
  }),
}) {}

// Test implementation
const TestLayer = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: <T>(_url: string) => Effect.succeed({ title: "Mock Data" } as T),
  })
);

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  yield* Effect.logInfo("Fetching data...");
  const data = yield* client.get<{ title: string }>(
    "https://api.example.com/data"
  );
  yield* Effect.logInfo(`Received data: ${JSON.stringify(data)}`);
});

// Run with test implementation
Effect.runPromise(Effect.provide(program, TestLayer));

```

### 2. Create the Live Implementation

```typescript
import { Effect, Data, Layer } from "effect"

interface HttpErrorType {
  readonly _tag: "HttpError"
  readonly error: unknown
}

const HttpError = Data.tagged<HttpErrorType>("HttpError")

interface HttpClientType {
  readonly get: <T>(url: string) => Effect.Effect<T, HttpErrorType>
}

class HttpClient extends Effect.Service<HttpClientType>()(
  "HttpClient",
  {
    sync: () => ({
      get: <T>(url: string): Effect.Effect<T, HttpErrorType> =>
        Effect.tryPromise({
          try: () => fetch(url).then((res) => res.json()),
          catch: (error) => HttpError({ error })
        })
    })
  }
) {}

// Test implementation
const TestLayer = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: <T>(_url: string) => Effect.succeed({ title: "Mock Data" } as T)
  })
)

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient
  yield* Effect.logInfo("Fetching data...")
  const data = yield* client.get<{ title: string }>("https://api.example.com/data")
  yield* Effect.logInfo(`Received data: ${JSON.stringify(data)}`)
})

// Run with test implementation
Effect.runPromise(
  Effect.provide(program, TestLayer)
)
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

---

## Model Dependencies as Services

Model dependencies as services.

### Example

```typescript
import { Effect } from "effect";

// Define Random service with production implementation as default
export class Random extends Effect.Service<Random>()(
  "Random",
  {
    // Default production implementation
    sync: () => ({
      next: Effect.sync(() => Math.random())
    })
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const random = yield* Random;
  const value = yield* random.next;
  return value;
});

// Run with default implementation
const programWithLogging = Effect.gen(function* () {
  const value = yield* Effect.provide(program, Random.Default);
  yield* Effect.log(`Random value: ${value}`);
  return value;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
By modeling dependencies as services, you can easily substitute mocked or deterministic implementations for testing, leading to more reliable and predictable tests.

---

