# making-http-requests Patterns

## Build a Basic HTTP Server

Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

### Example

This example creates a simple server with a `Greeter` service. The server starts, creates a runtime containing the `Greeter`, and then uses that runtime to handle requests.

```typescript
import { HttpServer, HttpServerResponse } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Duration, Effect, Fiber, Layer } from "effect";
import { createServer } from "node:http";

// Create a server layer using Node's built-in HTTP server
const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3001 });

// Define your HTTP app (here responding "Hello World" to every request)
const app = Effect.gen(function* () {
  yield* Effect.logInfo("Received HTTP request");
  return yield* HttpServerResponse.text("Hello World");
});

const serverLayer = HttpServer.serve(app).pipe(Layer.provide(ServerLive));

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Server starting on http://localhost:3001");
  const fiber = yield* Layer.launch(serverLayer).pipe(Effect.fork);
  yield* Effect.sleep(Duration.seconds(2));
  yield* Fiber.interrupt(fiber);
  yield* Effect.logInfo("Server shutdown complete");
});

Effect.runPromise(program as unknown as Effect.Effect<void, unknown, never>);
```

---

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
      ).pipe(Effect.catchAll((error) => Effect.fail(HttpError({ error })))),
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
      Effect.tryPromise({
        try: () => fetch(url).then((res) => res.json()),
        catch: (error) => HttpError({ error }),
      }),
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

### 3. Create the Test Implementation

```typescript
// src/services/HttpClientTest.ts
import { Effect, Layer } from "effect";
import { HttpClient } from "./HttpClient";

export const HttpClientTest = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: (url) => Effect.succeed({ mock: "data", url }),
  })
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
export class Random extends Effect.Service<Random>()("Random", {
  // Default production implementation
  sync: () => ({
    next: Effect.sync(() => Math.random()),
  }),
}) {}

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
