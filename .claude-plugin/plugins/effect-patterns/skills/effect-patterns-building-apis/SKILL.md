---
name: effect-patterns-building-apis
description: Effect-TS patterns for Building Apis. Use when working with building apis in Effect-TS applications.
---
# Effect-TS Patterns: Building Apis
This skill provides 13 curated Effect-TS patterns for building apis.
Use this skill when working on tasks related to:
- building apis
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Handle a GET Request

**Rule:** Use Http.router.get to associate a URL path with a specific response Effect.

**Good Example:**

This example defines two separate GET routes, one for the root path (`/`) and one for `/hello`. We create an empty router and add each route to it. The resulting `app` is then served. The router automatically handles sending a `404 Not Found` response for any path that doesn't match.

```typescript
import { Data, Effect } from "effect";

// Define response types
interface RouteResponse {
  readonly status: number;
  readonly body: string;
}

// Define error types
class RouteNotFoundError extends Data.TaggedError("RouteNotFoundError")<{
  readonly path: string;
}> {}

class RouteHandlerError extends Data.TaggedError("RouteHandlerError")<{
  readonly path: string;
  readonly error: string;
}> {}

// Define route service
class RouteService extends Effect.Service<RouteService>()("RouteService", {
  sync: () => {
    // Create instance methods
    const handleRoute = (
      path: string
    ): Effect.Effect<RouteResponse, RouteNotFoundError | RouteHandlerError> =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`Processing request for path: ${path}`);

        try {
          switch (path) {
            case "/":
              const home = "Welcome to the home page!";
              yield* Effect.logInfo(`Serving home page`);
              return { status: 200, body: home };

            case "/hello":
              const hello = "Hello, Effect!";
              yield* Effect.logInfo(`Serving hello page`);
              return { status: 200, body: hello };

            default:
              yield* Effect.logWarning(`Route not found: ${path}`);
              return yield* Effect.fail(new RouteNotFoundError({ path }));
          }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          yield* Effect.logError(`Error handling route ${path}: ${error}`);
          return yield* Effect.fail(new RouteHandlerError({ path, error }));
        }
      });

    // Return service implementation
    return {
      handleRoute,
      // Simulate GET request
      simulateGet: (
        path: string
      ): Effect.Effect<RouteResponse, RouteNotFoundError | RouteHandlerError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`GET ${path}`);
          const response = yield* handleRoute(path);
          yield* Effect.logInfo(`Response: ${JSON.stringify(response)}`);
          return response;
        }),
    };
  },
}) {}

// Create program with proper error handling
const program = Effect.gen(function* () {
  const router = yield* RouteService;

  yield* Effect.logInfo("=== Starting Route Tests ===");

  // Test different routes
  for (const path of ["/", "/hello", "/other", "/error"]) {
    yield* Effect.logInfo(`\n--- Testing ${path} ---`);

    const result = yield* router.simulateGet(path).pipe(
      Effect.catchTags({
        RouteNotFoundError: (error) =>
          Effect.gen(function* () {
            const response = { status: 404, body: `Not Found: ${error.path}` };
            yield* Effect.logWarning(`${response.status} ${response.body}`);
            return response;
          }),
        RouteHandlerError: (error) =>
          Effect.gen(function* () {
            const response = {
              status: 500,
              body: `Internal Error: ${error.error}`,
            };
            yield* Effect.logError(`${response.status} ${response.body}`);
            return response;
          }),
      })
    );

    yield* Effect.logInfo(`Final Response: ${JSON.stringify(result)}`);
  }

  yield* Effect.logInfo("\n=== Route Tests Complete ===");
});

// Run the program
Effect.runPromise(Effect.provide(program, RouteService.Default));
```

**Anti-Pattern:**

The anti-pattern is to create a single, monolithic handler that uses conditional logic to inspect the request URL. This imperative approach is difficult to maintain and scale.

```typescript
import { Effect } from "effect";
import { Http, NodeHttpServer, NodeRuntime } from "@effect/platform-node";

// A single app that manually checks the URL
const app = Http.request.ServerRequest.pipe(
  Effect.flatMap((req) => {
    if (req.url === "/") {
      return Effect.succeed(Http.response.text("Welcome to the home page!"));
    } else if (req.url === "/hello") {
      return Effect.succeed(Http.response.text("Hello, Effect!"));
    } else {
      return Effect.succeed(Http.response.empty({ status: 404 }));
    }
  })
);

const program = Http.server
  .serve(app)
  .pipe(Effect.provide(NodeHttpServer.layer({ port: 3000 })));

NodeRuntime.runMain(program);
```

This manual routing logic is verbose, error-prone (a typo in a string breaks the route), and mixes the "what" (the response) with the "where" (the routing). It doesn't scale to handle different HTTP methods, path parameters, or middleware gracefully. The `Http.router` is designed to solve all of these problems elegantly.

**Rationale:**

To handle specific URL paths, create individual routes using `Http.router` functions (like `Http.router.get`) and combine them into a single `Http.App`.

---


A real application needs to respond differently to different URLs. The `Http.router` provides a declarative, type-safe, and composable way to manage this routing logic. Instead of a single handler with complex conditional logic, you define many small, focused handlers and assign them to specific paths and HTTP methods.

This approach has several advantages:

1.  **Declarative and Readable**: Your code clearly expresses the mapping between a URL path and its behavior, making the application's structure easy to understand.
2.  **Composability**: Routers are just values that can be created, combined, and passed around. This makes it easy to organize routes into logical groups (e.g., a `userRoutes` router and a `productRoutes` router) and merge them.
3.  **Type Safety**: The router ensures that the handler for a route is only ever called for a matching request, simplifying the logic within the handler itself.
4.  **Integration**: Each route handler is an `Effect`, meaning it has full access to dependency injection, structured concurrency, and integrated error handling, just like any other part of an Effect application.

---

---

### Send a JSON Response

**Rule:** Use Http.response.json to automatically serialize data structures into a JSON response.

**Good Example:**

This example defines a route that fetches a user object and returns it as a JSON response. The `Http.response.json` function handles all the necessary serialization and header configuration.

```typescript
import { Effect, Context, Duration, Layer } from "effect";
import { NodeContext, NodeHttpServer } from "@effect/platform-node";
import { createServer } from "node:http";

const PORT = 3459; // Changed port to avoid conflicts

// Define HTTP Server service
class JsonServer extends Effect.Service<JsonServer>()("JsonServer", {
  sync: () => ({
    handleRequest: () =>
      Effect.succeed({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Hello, JSON!",
          timestamp: new Date().toISOString(),
        }),
      }),
  }),
}) {}

// Create and run the server
const program = Effect.gen(function* () {
  const jsonServer = yield* JsonServer;

  // Create and start HTTP server
  const server = createServer((req, res) => {
    const requestHandler = Effect.gen(function* () {
      try {
        const response = yield* jsonServer.handleRequest();
        res.writeHead(response.status, response.headers);
        res.end(response.body);
        // Log the response for demonstration
        yield* Effect.logInfo(`Sent JSON response: ${response.body}`);
      } catch (error: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
        yield* Effect.logError(`Request error: ${error.message}`);
      }
    });

    Effect.runPromise(requestHandler);
  });

  // Start server with error handling
  yield* Effect.async<void, Error>((resume) => {
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        resume(Effect.fail(new Error(`Port ${PORT} is already in use`)));
      } else {
        resume(Effect.fail(error));
      }
    });

    server.listen(PORT, () => {
      resume(Effect.succeed(void 0));
    });
  });

  yield* Effect.logInfo(`Server running at http://localhost:${PORT}`);
  yield* Effect.logInfo("Try: curl http://localhost:3459");

  // Run for a short time to demonstrate
  yield* Effect.sleep(Duration.seconds(3));

  // Shutdown gracefully
  yield* Effect.sync(() => server.close());
  yield* Effect.logInfo("Server shutdown complete");
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Server error: ${error.message}`);
      return error;
    })
  ),
  // Merge layers and provide them in a single call to ensure proper lifecycle management
  Effect.provide(Layer.merge(JsonServer.Default, NodeContext.layer))
);

// Run the program
// Use Effect.runFork for server applications that shouldn't resolve the promise
Effect.runPromise(
  program.pipe(
    // Ensure the Effect has no remaining context requirements for runPromise
    Effect.map(() => undefined)
  )
);
```

**Anti-Pattern:**

The anti-pattern is to manually serialize the data to a string and set the headers yourself. This is verbose and introduces opportunities for error.

```typescript
import { Effect } from "effect";
import { Http, NodeHttpServer, NodeRuntime } from "@effect/platform-node";

const getUserRoute = Http.router.get(
  "/users/1",
  Effect.succeed({ id: 1, name: "Paul", team: "Effect" }).pipe(
    Effect.flatMap((user) => {
      // Manually serialize the object to a JSON string.
      const jsonString = JSON.stringify(user);
      // Create a text response with the string.
      const response = Http.response.text(jsonString);
      // Manually set the Content-Type header.
      return Effect.succeed(
        Http.response.setHeader(
          response,
          "Content-Type",
          "application/json; charset=utf-8"
        )
      );
    })
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(getUserRoute));

const program = Http.server
  .serve(app)
  .pipe(Effect.provide(NodeHttpServer.layer({ port: 3000 })));

NodeRuntime.runMain(program);
```

This manual approach is unnecessarily complex. It forces you to remember to perform both the serialization and the header configuration. If you forget the `setHeader` call, many clients will fail to parse the response correctly. The `Http.response.json` helper eliminates this entire class of potential bugs.

**Rationale:**

To return a JavaScript object or value as a JSON response, use the `Http.response.json(data)` constructor.

---


APIs predominantly communicate using JSON. The `Http` module provides a dedicated `Http.response.json` helper to make this as simple and robust as possible. Manually constructing a JSON response involves serializing the data and setting the correct HTTP headers, which is tedious and error-prone.

Using `Http.response.json` is superior because:

1.  **Automatic Serialization**: It safely handles the `JSON.stringify` operation for you, including handling potential circular references or other serialization errors.
2.  **Correct Headers**: It automatically sets the `Content-Type: application/json; charset=utf-8` header. This is critical for clients to correctly interpret the response body. Forgetting this header is a common source of bugs in manually constructed APIs.
3.  **Simplicity and Readability**: Your intent is made clear with a single, declarative function call. The code is cleaner and focuses on the data being sent, not the mechanics of HTTP.
4.  **Composability**: It creates a standard `Http.response` object that works seamlessly with all other parts of the Effect `Http` module.

---

---

### Extract Path Parameters

**Rule:** Define routes with colon-prefixed parameters (e.g., /users/:id) and access their values within the handler.

**Good Example:**

This example defines a route that captures a `userId`. The handler for this route accesses the parsed parameters and uses the `userId` to construct a personalized greeting. The router automatically makes the parameters available to the handler.

```typescript
import { Data, Effect } from "effect";

// Define tagged error for invalid paths
interface InvalidPathErrorSchema {
  readonly _tag: "InvalidPathError";
  readonly path: string;
}

const makeInvalidPathError = (path: string): InvalidPathErrorSchema => ({
  _tag: "InvalidPathError",
  path,
});

// Define service interface
interface PathOps {
  readonly extractUserId: (
    path: string
  ) => Effect.Effect<string, InvalidPathErrorSchema>;
  readonly greetUser: (userId: string) => Effect.Effect<string>;
}

// Create service
class PathService extends Effect.Service<PathService>()("PathService", {
  sync: () => ({
    extractUserId: (path: string) =>
      Effect.gen(function* () {
        yield* Effect.logInfo(
          `Attempting to extract user ID from path: ${path}`
        );

        const match = path.match(/\/users\/([^/]+)/);
        if (!match) {
          yield* Effect.logInfo(`No user ID found in path: ${path}`);
          return yield* Effect.fail(makeInvalidPathError(path));
        }

        const userId = match[1];
        yield* Effect.logInfo(`Successfully extracted user ID: ${userId}`);
        return userId;
      }),

    greetUser: (userId: string) =>
      Effect.gen(function* () {
        const greeting = `Hello, user ${userId}!`;
        yield* Effect.logInfo(greeting);
        return greeting;
      }),
  }),
}) {}

// Compose the functions with proper error handling
const processPath = (
  path: string
): Effect.Effect<string, InvalidPathErrorSchema, PathService> =>
  Effect.gen(function* () {
    const pathService = yield* PathService;
    yield* Effect.logInfo(`Processing path: ${path}`);
    const userId = yield* pathService.extractUserId(path);
    return yield* pathService.greetUser(userId);
  });

// Run examples with proper error handling
const program = Effect.gen(function* () {
  // Test valid paths
  yield* Effect.logInfo("=== Testing valid paths ===");
  const result1 = yield* processPath("/users/123");
  yield* Effect.logInfo(`Result 1: ${result1}`);

  const result2 = yield* processPath("/users/abc");
  yield* Effect.logInfo(`Result 2: ${result2}`);

  // Test invalid path
  yield* Effect.logInfo("\n=== Testing invalid path ===");
  const result3 = yield* processPath("/invalid/path").pipe(
    Effect.catchTag("InvalidPathError", (error) =>
      Effect.succeed(`Error: Invalid path ${error.path}`)
    )
  );
  yield* Effect.logInfo(result3);
});

Effect.runPromise(Effect.provide(program, PathService.Default));
```

**Anti-Pattern:**

The anti-pattern is to manually parse the URL string inside the handler. This approach is brittle, imperative, and mixes concerns.

```typescript
import { Effect } from "effect";
import { Http, NodeHttpServer, NodeRuntime } from "@effect/platform-node";

// This route matches any sub-path of /users/, forcing manual parsing.
const app = Http.router.get(
  "/users/*", // Using a wildcard
  Http.request.ServerRequest.pipe(
    Effect.flatMap((req) => {
      // Manually split the URL to find the ID.
      const parts = req.url.split("/"); // e.g., ['', 'users', '123']
      if (parts.length === 3 && parts[2]) {
        const userId = parts[2];
        return Http.response.text(`Hello, user ${userId}!`);
      }
      // Manual handling for missing ID.
      return Http.response.empty({ status: 404 });
    })
  )
);

const program = Http.server
  .serve(app)
  .pipe(Effect.provide(NodeHttpServer.layer({ port: 3000 })));

NodeRuntime.runMain(program);
```

This manual method is highly discouraged. It's fragile—a change in the base path or an extra slash could break the logic (`parts[2]`). It's also not declarative; the intent is hidden inside imperative code. The router's built-in parameter handling is safer, clearer, and the correct approach.

**Rationale:**

To capture dynamic parts of a URL, define your route path with a colon-prefixed placeholder (e.g., `/users/:userId`) and access the parsed parameters within your handler `Effect`.

---


APIs often need to operate on specific resources identified by a unique key in the URL, such as `/products/123` or `/orders/abc`. The `Http.router` provides a clean, declarative way to handle these dynamic paths without resorting to manual string parsing.

By defining parameters directly in the path string, you gain several benefits:

1.  **Declarative**: The route's structure is immediately obvious from its definition. The code clearly states, "this route expects a dynamic segment here."
2.  **Safe and Robust**: The router handles the logic of extracting the parameter. This is less error-prone and more robust than manually splitting or using regular expressions on the URL string.
3.  **Clean Handler Logic**: The business logic inside your handler is separated from the concern of URL parsing. The handler simply receives the parameters it needs to do its job.
4.  **Composability**: This pattern composes perfectly with the rest of the `Http` module, allowing you to build complex and well-structured APIs.

---

---

### Create a Basic HTTP Server

**Rule:** Use Http.server.serve with a platform-specific layer to run an HTTP application.

**Good Example:**

This example creates a minimal server that responds to all requests with "Hello, World!". The application logic is a simple `Effect` that returns an `Http.response`. We use `NodeRuntime.runMain` to execute the server effect, which is the standard way to launch a long-running application.

```typescript
import { Effect, Duration } from "effect";
import * as http from "http";

// Create HTTP server service
class HttpServer extends Effect.Service<HttpServer>()("HttpServer", {
  sync: () => ({
    start: () =>
      Effect.gen(function* () {
        const server = http.createServer(
          (req: http.IncomingMessage, res: http.ServerResponse) => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Hello, World!");
          }
        );

        // Add cleanup finalizer
        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            yield* Effect.sync(() => server.close());
            yield* Effect.logInfo("Server shut down");
          })
        );

        // Start server with timeout
        yield* Effect.async<void, Error>((resume) => {
          server.on("error", (error) => resume(Effect.fail(error)));
          server.listen(3456, "localhost", () => {
            resume(Effect.succeed(void 0));
          });
        }).pipe(
          Effect.timeout(Duration.seconds(5)),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError(`Failed to start server: ${error}`);
              return yield* Effect.fail(error);
            })
          )
        );

        yield* Effect.logInfo("Server running at http://localhost:3456/");

        // Run for a short duration to demonstrate the server is working
        yield* Effect.sleep(Duration.seconds(3));
        yield* Effect.logInfo("Server demonstration complete");
      }),
  }),
}) {}

// Create program with proper error handling
const program = Effect.gen(function* () {
  const server = yield* HttpServer;

  yield* Effect.logInfo("Starting HTTP server...");

  yield* server.start();
}).pipe(
  Effect.scoped // Ensure server is cleaned up properly
);

// Run the server with proper error handling
const programWithErrorHandling = Effect.provide(
  program,
  HttpServer.Default
).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program failed: ${error}`);
      return yield* Effect.fail(error);
    })
  )
);

Effect.runPromise(programWithErrorHandling).catch(() => {
  process.exit(1);
});

/*
To test:
1. Server will timeout after 5 seconds if it can't start
2. Server runs on port 3456 to avoid conflicts
3. Proper cleanup on shutdown
4. Demonstrates server lifecycle: start -> run -> shutdown
*/
```

**Anti-Pattern:**

The common anti-pattern is to use the raw Node.js `http` module directly, outside of the Effect runtime. This approach creates a disconnect between your application logic and the server's lifecycle.

```typescript
import * as http from "http";

// Manually create a server using the Node.js built-in module.
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello, World!");
});

// Manually start the server and log the port.
const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
```

This imperative approach is discouraged when building an Effect application because it forfeits all the benefits of the ecosystem. It runs outside of Effect's structured concurrency, cannot be managed by its resource-safe `Scope`, does not integrate with `Layer` for dependency injection, and requires manual error handling, making it less robust and much harder to compose with other effectful logic.

**Rationale:**

To create and run a web server, define your application as an `Http.App` and execute it using `Http.server.serve`, providing a platform-specific layer like `NodeHttpServer.layer`.

---


In Effect, an HTTP server is not just a side effect; it's a managed, effectful process. The `@effect/platform` package provides a platform-agnostic API for defining HTTP applications, while packages like `@effect/platform-node` provide the concrete implementation.

The core function `Http.server.serve(app)` takes your application logic and returns an `Effect` that, when run, starts the server. This `Effect` is designed to run indefinitely, only terminating if the server crashes or is gracefully shut down.

This approach provides several key benefits:

1.  **Lifecycle Management**: The server's lifecycle is managed by the Effect runtime. This means structured concurrency applies, ensuring graceful shutdowns and proper resource handling automatically.
2.  **Integration**: The server is a first-class citizen in the Effect ecosystem. It can seamlessly access dependencies provided by `Layer`, use `Config` for configuration, and integrate with `Logger`.
3.  **Platform Agnosticism**: By coding to the `Http.App` interface, your application logic remains portable across different JavaScript runtimes (Node.js, Bun, Deno) by simply swapping out the platform layer.

---

---


## 🟡 Intermediate Patterns

### Add Rate Limiting to APIs

**Rule:** Use a rate limiter service to enforce request quotas per client.

**Good Example:**

```typescript
import { Effect, Context, Layer, Ref, HashMap, Data, Duration } from "effect"
import { HttpServerRequest, HttpServerResponse } from "@effect/platform"

// ============================================
// 1. Define rate limit types
// ============================================

interface RateLimitConfig {
  readonly maxRequests: number
  readonly windowMs: number
}

interface RateLimitState {
  readonly count: number
  readonly resetAt: number
}

class RateLimitExceededError extends Data.TaggedError("RateLimitExceededError")<{
  readonly retryAfter: number
  readonly limit: number
}> {}

// ============================================
// 2. Rate limiter service
// ============================================

interface RateLimiter {
  readonly check: (key: string) => Effect.Effect<void, RateLimitExceededError>
  readonly getStatus: (key: string) => Effect.Effect<{
    remaining: number
    resetAt: number
  }>
}

class RateLimiterService extends Context.Tag("RateLimiter")<
  RateLimiterService,
  RateLimiter
>() {}

// ============================================
// 3. In-memory rate limiter implementation
// ============================================

const makeRateLimiter = (config: RateLimitConfig) =>
  Effect.gen(function* () {
    const state = yield* Ref.make(HashMap.empty<string, RateLimitState>())

    const getOrCreateState = (key: string, now: number) =>
      Ref.modify(state, (map) => {
        const existing = HashMap.get(map, key)

        if (existing._tag === "Some") {
          // Check if window expired
          if (now >= existing.value.resetAt) {
            // Start new window
            const newState: RateLimitState = {
              count: 0,
              resetAt: now + config.windowMs,
            }
            return [newState, HashMap.set(map, key, newState)]
          }
          return [existing.value, map]
        }

        // Create new entry
        const newState: RateLimitState = {
          count: 0,
          resetAt: now + config.windowMs,
        }
        return [newState, HashMap.set(map, key, newState)]
      })

    const incrementCount = (key: string) =>
      Ref.modify(state, (map) => {
        const existing = HashMap.get(map, key)
        if (existing._tag === "Some") {
          const updated = { ...existing.value, count: existing.value.count + 1 }
          return [updated.count, HashMap.set(map, key, updated)]
        }
        return [1, map]
      })

    const limiter: RateLimiter = {
      check: (key) =>
        Effect.gen(function* () {
          const now = Date.now()
          const currentState = yield* getOrCreateState(key, now)

          if (currentState.count >= config.maxRequests) {
            const retryAfter = Math.ceil((currentState.resetAt - now) / 1000)
            return yield* Effect.fail(
              new RateLimitExceededError({
                retryAfter,
                limit: config.maxRequests,
              })
            )
          }

          yield* incrementCount(key)
        }),

      getStatus: (key) =>
        Effect.gen(function* () {
          const now = Date.now()
          const currentState = yield* getOrCreateState(key, now)
          return {
            remaining: Math.max(0, config.maxRequests - currentState.count),
            resetAt: currentState.resetAt,
          }
        }),
    }

    return limiter
  })

// ============================================
// 4. Rate limit middleware
// ============================================

const withRateLimit = <A, E, R>(
  handler: Effect.Effect<A, E, R>
): Effect.Effect<
  A | HttpServerResponse.HttpServerResponse,
  E,
  R | RateLimiterService | HttpServerRequest.HttpServerRequest
> =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const rateLimiter = yield* RateLimiterService

    // Use IP address as key (in production, might use user ID or API key)
    const clientKey = request.headers["x-forwarded-for"] || "unknown"

    const result = yield* rateLimiter.check(clientKey).pipe(
      Effect.matchEffect({
        onFailure: (error) =>
          Effect.succeed(
            HttpServerResponse.json(
              {
                error: "Rate limit exceeded",
                retryAfter: error.retryAfter,
              },
              {
                status: 429,
                headers: {
                  "Retry-After": String(error.retryAfter),
                  "X-RateLimit-Limit": String(error.limit),
                  "X-RateLimit-Remaining": "0",
                },
              }
            )
          ),
        onSuccess: () => handler,
      })
    )

    return result
  })

// ============================================
// 5. Usage example
// ============================================

const RateLimiterLive = Layer.effect(
  RateLimiterService,
  makeRateLimiter({
    maxRequests: 100,      // 100 requests
    windowMs: 60 * 1000,   // per minute
  })
)

const apiEndpoint = withRateLimit(
  Effect.gen(function* () {
    // Your actual handler logic
    return HttpServerResponse.json({ data: "Success!" })
  })
)
```

**Rationale:**

Implement rate limiting as a service that tracks request counts and enforces limits per client (IP, API key, or user).

---


Rate limiting protects your API:

1. **Prevent abuse** - Stop malicious flooding
2. **Fair usage** - Share resources among clients
3. **Cost control** - Limit expensive operations
4. **Stability** - Prevent cascading failures

---

---

### Validate Request Body

**Rule:** Use Http.request.schemaBodyJson with a Schema to automatically parse and validate request bodies.

**Good Example:**

This example defines a `POST` route to create a user. It uses a `CreateUser` schema to validate the request body. If validation passes, it returns a success message with the typed data. If it fails, the platform automatically sends a descriptive 400 error.

```typescript
import { Duration, Effect } from "effect";
import * as S from "effect/Schema";
import { createServer, IncomingMessage, ServerResponse } from "http";

// Define user schema
const UserSchema = S.Struct({
  name: S.String,
  email: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
});
type User = S.Schema.Type<typeof UserSchema>;

// Define user service interface
interface UserServiceInterface {
  readonly validateUser: (data: unknown) => Effect.Effect<User, Error, never>;
}

// Define user service
class UserService extends Effect.Service<UserService>()("UserService", {
  sync: () => ({
    validateUser: (data: unknown) => S.decodeUnknown(UserSchema)(data),
  }),
}) {}

// Define HTTP server service interface
interface HttpServerInterface {
  readonly handleRequest: (
    request: IncomingMessage,
    response: ServerResponse
  ) => Effect.Effect<void, Error, never>;
  readonly start: () => Effect.Effect<void, Error, never>;
}

// Define HTTP server service
class HttpServer extends Effect.Service<HttpServer>()("HttpServer", {
  // Define effect-based implementation that uses dependencies
  effect: Effect.gen(function* () {
    const userService = yield* UserService;

    return {
      handleRequest: (request: IncomingMessage, response: ServerResponse) =>
        Effect.gen(function* () {
          // Only handle POST /users
          if (request.method !== "POST" || request.url !== "/users") {
            response.writeHead(404, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "Not Found" }));
            return;
          }

          try {
            // Read request body
            const body = yield* Effect.async<unknown, Error>((resume) => {
              let data = "";
              request.on("data", (chunk) => {
                data += chunk;
              });
              request.on("end", () => {
                try {
                  resume(Effect.succeed(JSON.parse(data)));
                } catch (e) {
                  resume(
                    Effect.fail(e instanceof Error ? e : new Error(String(e)))
                  );
                }
              });
              request.on("error", (e) =>
                resume(
                  Effect.fail(e instanceof Error ? e : new Error(String(e)))
                )
              );
            });

            // Validate body against schema
            const user = yield* userService.validateUser(body);

            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(
              JSON.stringify({
                message: `Successfully created user: ${user.name}`,
              })
            );
          } catch (error) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: String(error) }));
          }
        }),

      start: function (this: HttpServer) {
        const self = this;
        return Effect.gen(function* () {
          // Create HTTP server
          const server = createServer((req, res) =>
            Effect.runFork(self.handleRequest(req, res))
          );

          // Add cleanup finalizer
          yield* Effect.addFinalizer(() =>
            Effect.gen(function* () {
              yield* Effect.sync(() => server.close());
              yield* Effect.logInfo("Server shut down");
            })
          );

          // Start server
          yield* Effect.async<void, Error>((resume) => {
            server.on("error", (error) => resume(Effect.fail(error)));
            server.listen(3456, () => {
              Effect.runFork(
                Effect.logInfo("Server running at http://localhost:3456/")
              );
              resume(Effect.succeed(void 0));
            });
          });

          // Run for demonstration period
          yield* Effect.sleep(Duration.seconds(3));
          yield* Effect.logInfo("Demo completed - shutting down server");
        });
      },
    };
  }),
  // Specify dependencies
  dependencies: [UserService.Default],
}) {}

// Create program with proper error handling
const program = Effect.gen(function* () {
  const server = yield* HttpServer;

  yield* Effect.logInfo("Starting HTTP server...");

  yield* server.start().pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Server error: ${error}`);
        return yield* Effect.fail(error);
      })
    )
  );
}).pipe(
  Effect.scoped // Ensure server is cleaned up
);

// Run the server
Effect.runFork(Effect.provide(program, HttpServer.Default));

/*
To test:
- POST http://localhost:3456/users with body {"name": "Paul", "email": "paul@effect.com"}
  -> Returns 200 OK with message "Successfully created user: Paul"

- POST http://localhost:3456/users with body {"name": "Paul"}
  -> Returns 400 Bad Request with error message about missing email field
*/
```

**Anti-Pattern:**

The anti-pattern is to manually parse the JSON and then write imperative validation checks. This approach is verbose, error-prone, and not type-safe.

```typescript
import { Effect } from "effect";
import { Http, NodeHttpServer, NodeRuntime } from "@effect/platform-node";

const createUserRoute = Http.router.post(
  "/users",
  Http.request.json.pipe(
    // Http.request.json returns Effect<unknown, ...>
    Effect.flatMap((body) => {
      // Manually check the type and properties of the body.
      if (
        typeof body === "object" &&
        body !== null &&
        "name" in body &&
        typeof body.name === "string" &&
        "email" in body &&
        typeof body.email === "string"
      ) {
        // The type is still not safely inferred here without casting.
        return Http.response.text(`Successfully created user: ${body.name}`);
      } else {
        // Manually create and return a generic error response.
        return Http.response.text("Invalid request body", { status: 400 });
      }
    })
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(createUserRoute));

const program = Http.server
  .serve(app)
  .pipe(Effect.provide(NodeHttpServer.layer({ port: 3000 })));

NodeRuntime.runMain(program);
```

This manual code is significantly worse. It's hard to read, easy to get wrong, and loses all static type information from the parsed body. Crucially, it forces you to reinvent the wheel for error reporting, which will likely be less detailed and consistent than the automatic responses provided by the platform.

**Rationale:**

To process an incoming request body, use `Http.request.schemaBodyJson(YourSchema)` to parse the JSON and validate its structure in a single, type-safe step.

---


Accepting user-provided data is one of the most critical and sensitive parts of an API. You must never trust incoming data. The `Http` module's integration with `Schema` provides a robust, declarative solution for this.

Using `Http.request.schemaBodyJson` offers several major advantages:

1.  **Automatic Validation and Error Handling**: If the incoming body does not match the schema, the server automatically rejects the request with a `400 Bad Request` status and a detailed JSON response explaining the validation errors. You don't have to write any of this boilerplate logic.
2.  **Type Safety**: If the validation succeeds, the value produced by the `Effect` is fully typed according to your `Schema`. This eliminates `any` types and brings static analysis benefits to your request handlers.
3.  **Declarative and Clean**: The validation rules are defined once in the `Schema` and then simply applied. This separates the validation logic from your business logic, keeping handlers clean and focused on their core task.
4.  **Security**: It acts as a security gateway, ensuring that malformed or unexpected data structures never reach your application's core logic.

---

---

### Provide Dependencies to Routes

**Rule:** Define dependencies with Effect.Service and provide them to your HTTP server using a Layer.

**Good Example:**

This example defines a `Database` service. The route handler for `/users/:userId` requires this service to fetch a user. We then provide a "live" implementation of the `Database` to the entire server using a `Layer`.

```typescript
import * as HttpRouter from "@effect/platform/HttpRouter";
import * as HttpResponse from "@effect/platform/HttpServerResponse";
import * as HttpServer from "@effect/platform/HttpServer";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, Duration, Fiber } from "effect/index";
import { Data } from "effect";

// 1. Define the service interface using Effect.Service
export class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: string) =>
      id === "123"
        ? Effect.succeed({ name: "Paul" })
        : Effect.fail(new UserNotFoundError({ id })),
  }),
}) {}

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  id: string;
}> {}

// handler producing a `HttpServerResponse`
const userHandler = Effect.flatMap(HttpRouter.params, (p) =>
  Effect.flatMap(Database, (db) => db.getUser(p["userId"] ?? "")).pipe(
    Effect.flatMap(HttpResponse.json)
  )
);

// assemble router & server
const app = HttpRouter.empty.pipe(
  HttpRouter.get("/users/:userId", userHandler)
);

// Create the server effect with all dependencies
const serverEffect = HttpServer.serveEffect(app).pipe(
  Effect.provide(Database.Default),
  Effect.provide(
    NodeHttpServer.layer(() => require("node:http").createServer(), {
      port: 3458,
    })
  )
);

// Create program that manages server lifecycle
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting server on port 3458...");

  const serverFiber = yield* Effect.scoped(serverEffect).pipe(Effect.fork);

  yield* Effect.logInfo("Server started successfully on http://localhost:3458");
  yield* Effect.logInfo("Try: curl http://localhost:3458/users/123");
  yield* Effect.logInfo("Try: curl http://localhost:3458/users/456");

  // Run for a short time to demonstrate
  yield* Effect.sleep(Duration.seconds(3));

  yield* Effect.logInfo("Shutting down server...");
  yield* Fiber.interrupt(serverFiber);
  yield* Effect.logInfo("Server shutdown complete");
});

// Run the program
NodeRuntime.runMain(program);
```

**Anti-Pattern:**

The anti-pattern is to manually instantiate and pass dependencies through function arguments. This creates tight coupling and makes testing difficult.

```typescript
import { Effect } from "effect";
import { Http, NodeHttpServer, NodeRuntime } from "@effect/platform-node";

// Manual implementation of a database client
class LiveDatabase {
  getUser(id: string) {
    if (id === "123") {
      return Effect.succeed({ name: "Paul" });
    }
    return Effect.fail("User not found"); // Untyped error
  }
}

// The dependency must be passed explicitly to the route definition
const createGetUserRoute = (db: LiveDatabase) =>
  Http.router.get(
    "/users/:userId",
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

const program = Http.server
  .serve(app)
  .pipe(Effect.provide(NodeHttpServer.layer({ port: 3000 })));

NodeRuntime.runMain(program);
```

This approach is flawed because the route handler is now aware of the concrete `LiveDatabase` class. Swapping it for a mock in a test would be cumbersome. Furthermore, if a service deep within the call stack needs a dependency, it must be "drilled" down through every intermediate function, which is a significant maintenance burden.

**Rationale:**

Define your application's services using `class MyService extends Effect.Service("MyService")`, provide a live implementation via a `Layer`, and use `Effect.provide` to make the service available to your entire HTTP application.

---


As applications grow, route handlers need to perform complex tasks like accessing a database, calling other APIs, or logging. Hard-coding this logic or manually passing dependencies leads to tightly coupled, untestable code.

Effect's dependency injection system (`Service` and `Layer`) solves this by decoupling a service's interface from its implementation. This is the cornerstone of building scalable, maintainable applications in Effect.

1.  **Modern and Simple**: `Effect.Service` is the modern, idiomatic way to define services. It combines the service's definition and its access tag into a single, clean class structure, reducing boilerplate.
2.  **Testability**: By depending on a service interface, you can easily provide a mock implementation in your tests (e.g., `Database.Test`) instead of the real one (`Database.Live`), allowing for fast, isolated unit tests of your route logic.
3.  **Decoupling**: Route handlers don't know or care _how_ the database connection is created or managed. They simply ask for the `Database` service from the context, and the runtime provides the configured implementation.
4.  **Composability**: `Layer`s are composable. You can build complex dependency graphs (e.g., a `Database` layer that itself requires a `Config` layer) that Effect will automatically construct and wire up for you.

---

---

### Handle API Errors

**Rule:** Model application errors as typed classes and use Http.server.serveOptions to map them to specific HTTP responses.

**Good Example:**

This example defines two custom error types, `UserNotFoundError` and `InvalidIdError`. The route logic can fail with either. The `unhandledErrorResponse` function inspects the error and returns a `404` or `400` response accordingly, with a generic `500` for any other unexpected errors.

```typescript
import { Cause, Data, Effect } from "effect";

// Define our domain types
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: "admin" | "user";
}

// Define specific, typed errors for our domain
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly id: string;
}> {}

export class InvalidIdError extends Data.TaggedError("InvalidIdError")<{
  readonly id: string;
  readonly reason: string;
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly action: string;
  readonly role: string;
}> {}

// Define error handler service
export class ErrorHandlerService extends Effect.Service<ErrorHandlerService>()(
  "ErrorHandlerService",
  {
    sync: () => ({
      // Handle API errors with proper logging
      handleApiError: <E>(error: E): Effect.Effect<ApiResponse, never, never> =>
        Effect.gen(function* () {
          yield* Effect.logError(`API Error: ${JSON.stringify(error)}`);

          if (error instanceof UserNotFoundError) {
            return {
              error: "Not Found",
              message: `User ${error.id} not found`,
            };
          }
          if (error instanceof InvalidIdError) {
            return { error: "Bad Request", message: error.reason };
          }
          if (error instanceof UnauthorizedError) {
            return {
              error: "Unauthorized",
              message: `${error.role} cannot ${error.action}`,
            };
          }

          return {
            error: "Internal Server Error",
            message: "An unexpected error occurred",
          };
        }),

      // Handle unexpected errors
      handleUnexpectedError: (
        cause: Cause.Cause<unknown>
      ): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          yield* Effect.logError("Unexpected error occurred");

          if (Cause.isDie(cause)) {
            const defect = Cause.failureOption(cause);
            if (defect._tag === "Some") {
              const error = defect.value as Error;
              yield* Effect.logError(`Defect: ${error.message}`);
              yield* Effect.logError(
                `Stack: ${error.stack?.split("\n")[1]?.trim() ?? "N/A"}`
              );
            }
          }

          return Effect.succeed(void 0);
        }),
    }),
  }
) {}

// Define UserRepository service
export class UserRepository extends Effect.Service<UserRepository>()(
  "UserRepository",
  {
    sync: () => {
      const users = new Map<string, User>([
        [
          "user_123",
          {
            id: "user_123",
            name: "Paul",
            email: "paul@example.com",
            role: "admin",
          },
        ],
        [
          "user_456",
          {
            id: "user_456",
            name: "Alice",
            email: "alice@example.com",
            role: "user",
          },
        ],
      ]);

      return {
        // Get user by ID with proper error handling
        getUser: (
          id: string
        ): Effect.Effect<User, UserNotFoundError | InvalidIdError> =>
          Effect.gen(function* () {
            yield* Effect.logInfo(`Attempting to get user with id: ${id}`);

            // Validate ID format
            if (!id.match(/^user_\d+$/)) {
              yield* Effect.logWarning(`Invalid user ID format: ${id}`);
              return yield* Effect.fail(
                new InvalidIdError({
                  id,
                  reason: "ID must be in format user_<number>",
                })
              );
            }

            const user = users.get(id);
            if (user === undefined) {
              yield* Effect.logWarning(`User not found with id: ${id}`);
              return yield* Effect.fail(new UserNotFoundError({ id }));
            }

            yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
            return user;
          }),

        // Check if user has required role
        checkRole: (
          user: User,
          requiredRole: "admin" | "user"
        ): Effect.Effect<void, UnauthorizedError> =>
          Effect.gen(function* () {
            yield* Effect.logInfo(
              `Checking if user ${user.id} has role: ${requiredRole}`
            );

            if (user.role !== requiredRole && user.role !== "admin") {
              yield* Effect.logWarning(
                `User ${user.id} with role ${user.role} cannot access ${requiredRole} resources`
              );
              return yield* Effect.fail(
                new UnauthorizedError({
                  action: "access_user",
                  role: user.role,
                })
              );
            }

            yield* Effect.logInfo(
              `User ${user.id} has required role: ${user.role}`
            );
            return Effect.succeed(void 0);
          }),
      };
    },
  }
) {}

interface ApiResponse {
  readonly error?: string;
  readonly message?: string;
  readonly data?: User;
}

// Create routes with proper error handling
const createRoutes = () =>
  Effect.gen(function* () {
    const repo = yield* UserRepository;
    const errorHandler = yield* ErrorHandlerService;

    yield* Effect.logInfo("=== Processing API request ===");

    // Test different scenarios
    for (const userId of ["user_123", "user_456", "invalid_id", "user_789"]) {
      yield* Effect.logInfo(`\n--- Testing user ID: ${userId} ---`);

      const response = yield* repo.getUser(userId).pipe(
        Effect.map((user) => ({
          data: {
            ...user,
            email: user.role === "admin" ? user.email : "[hidden]",
          },
        })),
        Effect.catchAll((error) => errorHandler.handleApiError(error))
      );

      yield* Effect.logInfo(`Response: ${JSON.stringify(response)}`);
    }

    // Test role checking
    const adminUser = yield* repo.getUser("user_123");
    const regularUser = yield* repo.getUser("user_456");

    yield* Effect.logInfo("\n=== Testing role checks ===");

    yield* repo.checkRole(adminUser, "admin").pipe(
      Effect.tap(() => Effect.logInfo("Admin access successful")),
      Effect.catchAll((error) => errorHandler.handleApiError(error))
    );

    yield* repo.checkRole(regularUser, "admin").pipe(
      Effect.tap(() => Effect.logInfo("User admin access successful")),
      Effect.catchAll((error) => errorHandler.handleApiError(error))
    );

    return { message: "Tests completed successfully" };
  });

// Run the program with all services
Effect.runPromise(
  Effect.provide(
    Effect.provide(createRoutes(), ErrorHandlerService.Default),
    UserRepository.Default
  )
);
```

**Anti-Pattern:**

The anti-pattern is to handle HTTP-specific error logic inside each route handler using functions like `Effect.catchTag`.

```typescript
import { Effect, Data } from "effect";
import { Http, NodeHttpServer, NodeRuntime } from "@effect/platform-node";

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  id: string;
}> {}
// ... same getUser function and error classes

const userRoute = Http.router.get(
  "/users/:userId",
  Effect.flatMap(Http.request.ServerRequest, (req) =>
    getUser(req.params.userId)
  ).pipe(
    Effect.map(Http.response.json),
    // Manually catching errors inside the route logic
    Effect.catchTag("UserNotFoundError", (e) =>
      Http.response.text(`User ${e.id} not found`, { status: 404 })
    ),
    Effect.catchTag("InvalidIdError", (e) =>
      Http.response.text(`ID ${e.id} is not a valid format`, { status: 400 })
    )
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(userRoute));

// No centralized error handling
const program = Http.server
  .serve(app)
  .pipe(Effect.provide(NodeHttpServer.layer({ port: 3000 })));

NodeRuntime.runMain(program);
```

This approach is problematic because it pollutes the business logic of the route handler with details about HTTP status codes. It's also highly repetitive; if ten different routes could produce a `UserNotFoundError`, you would need to copy this `catchTag` logic into all ten of them, making the API difficult to maintain.

**Rationale:**

Define specific error types for your application logic and use `Http.server.serveOptions` with a custom `unhandledErrorResponse` function to map those errors to appropriate HTTP status codes and responses.

---


By default, any unhandled failure in an Effect route handler results in a generic `500 Internal Server Error`. This is a safe default, but it's not helpful for API clients who need to know _why_ their request failed. Was it a client-side error (like a non-existent resource, `404`) or a true server-side problem (`500`)?

Centralizing error handling at the server level provides a clean separation of concerns:

1.  **Domain-Focused Logic**: Your business logic can fail with specific, descriptive errors (e.g., `UserNotFoundError`) without needing any knowledge of HTTP status codes.
2.  **Centralized Mapping**: You define the mapping from application errors to HTTP responses in a single location. This makes your API's error handling consistent and easy to maintain. If you need to change how an error is reported, you only change it in one place.
3.  **Type Safety**: Using `Data.TaggedClass` for your errors allows you to use `Match` to exhaustively handle all known error cases, preventing you from forgetting to map a specific error type.
4.  **Clear Client Communication**: It produces a predictable and useful API, allowing clients to programmatically react to different failure scenarios.

---

---

### Compose API Middleware

**Rule:** Use Effect composition to build a middleware pipeline that processes requests.

**Good Example:**

```typescript
import { Effect, Context, Layer, Duration } from "effect"
import { HttpServerRequest, HttpServerResponse } from "@effect/platform"

// ============================================
// 1. Define middleware type
// ============================================

type Handler<E, R> = Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>

type Middleware<E1, R1, E2 = E1, R2 = R1> = <E extends E1, R extends R1>(
  handler: Handler<E, R>
) => Handler<E | E2, R | R2>

// ============================================
// 2. Logging middleware
// ============================================

const withLogging: Middleware<never, HttpServerRequest.HttpServerRequest> =
  (handler) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const startTime = Date.now()

      yield* Effect.log(`→ ${request.method} ${request.url}`)

      const response = yield* handler

      const duration = Date.now() - startTime
      yield* Effect.log(`← ${response.status} (${duration}ms)`)

      return response
    })

// ============================================
// 3. Timing middleware (adds header)
// ============================================

const withTiming: Middleware<never, never> = (handler) =>
  Effect.gen(function* () {
    const startTime = Date.now()
    const response = yield* handler
    const duration = Date.now() - startTime

    return HttpServerResponse.setHeader(
      response,
      "X-Response-Time",
      `${duration}ms`
    )
  })

// ============================================
// 4. Error handling middleware
// ============================================

const withErrorHandling: Middleware<unknown, never, never> = (handler) =>
  handler.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Unhandled error: ${error}`)

        return HttpServerResponse.json(
          { error: "Internal Server Error" },
          { status: 500 }
        )
      })
    )
  )

// ============================================
// 5. Request ID middleware
// ============================================

class RequestId extends Context.Tag("RequestId")<RequestId, string>() {}

const withRequestId: Middleware<never, never, never, RequestId> = (handler) =>
  Effect.gen(function* () {
    const requestId = crypto.randomUUID()

    const response = yield* handler.pipe(
      Effect.provideService(RequestId, requestId)
    )

    return HttpServerResponse.setHeader(response, "X-Request-Id", requestId)
  })

// ============================================
// 6. Timeout middleware
// ============================================

const withTimeout = (duration: Duration.DurationInput): Middleware<never, never> =>
  (handler) =>
    handler.pipe(
      Effect.timeout(duration),
      Effect.catchTag("TimeoutException", () =>
        Effect.succeed(
          HttpServerResponse.json(
            { error: "Request timeout" },
            { status: 504 }
          )
        )
      )
    )

// ============================================
// 7. CORS middleware (see separate pattern)
// ============================================

const withCORS = (origin: string): Middleware<never, never> => (handler) =>
  Effect.gen(function* () {
    const response = yield* handler

    return response.pipe(
      HttpServerResponse.setHeader("Access-Control-Allow-Origin", origin),
      HttpServerResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"),
      HttpServerResponse.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    )
  })

// ============================================
// 8. Compose middleware
// ============================================

const applyMiddleware = <E, R>(handler: Handler<E, R>) =>
  handler.pipe(
    withLogging,
    withTiming,
    withRequestId,
    withTimeout("30 seconds"),
    withCORS("*"),
    withErrorHandling
  )

// ============================================
// 9. Usage
// ============================================

const myHandler = Effect.gen(function* () {
  const requestId = yield* RequestId
  yield* Effect.log(`Processing request ${requestId}`)

  return HttpServerResponse.json({ message: "Hello!" })
})

const protectedHandler = applyMiddleware(myHandler)
```

**Rationale:**

Build middleware as composable Effect functions that wrap handlers, adding cross-cutting concerns like logging, authentication, and error handling.

---


Middleware provides separation of concerns:

1. **Reusability** - Write once, apply everywhere
2. **Composability** - Stack multiple middlewares
3. **Testability** - Test each middleware in isolation
4. **Clarity** - Handlers focus on business logic

---

---

### Configure CORS for APIs

**Rule:** Configure CORS headers to allow legitimate cross-origin requests while blocking unauthorized ones.

**Good Example:**

```typescript
import { Effect } from "effect"
import { HttpServerRequest, HttpServerResponse } from "@effect/platform"

// ============================================
// 1. CORS configuration
// ============================================

interface CorsConfig {
  readonly allowedOrigins: ReadonlyArray<string> | "*"
  readonly allowedMethods: ReadonlyArray<string>
  readonly allowedHeaders: ReadonlyArray<string>
  readonly exposedHeaders?: ReadonlyArray<string>
  readonly credentials?: boolean
  readonly maxAge?: number
}

const defaultCorsConfig: CorsConfig = {
  allowedOrigins: "*",
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id", "X-Response-Time"],
  credentials: false,
  maxAge: 86400, // 24 hours
}

// ============================================
// 2. Check if origin is allowed
// ============================================

const isOriginAllowed = (
  origin: string | undefined,
  allowedOrigins: ReadonlyArray<string> | "*"
): boolean => {
  if (!origin) return false
  if (allowedOrigins === "*") return true
  return allowedOrigins.includes(origin)
}

// ============================================
// 3. Add CORS headers to response
// ============================================

const addCorsHeaders = (
  response: HttpServerResponse.HttpServerResponse,
  origin: string | undefined,
  config: CorsConfig
): HttpServerResponse.HttpServerResponse => {
  let result = response

  // Set allowed origin
  if (config.allowedOrigins === "*") {
    result = HttpServerResponse.setHeader(result, "Access-Control-Allow-Origin", "*")
  } else if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    result = HttpServerResponse.setHeader(result, "Access-Control-Allow-Origin", origin)
    result = HttpServerResponse.setHeader(result, "Vary", "Origin")
  }

  // Set allowed methods
  result = HttpServerResponse.setHeader(
    result,
    "Access-Control-Allow-Methods",
    config.allowedMethods.join(", ")
  )

  // Set allowed headers
  result = HttpServerResponse.setHeader(
    result,
    "Access-Control-Allow-Headers",
    config.allowedHeaders.join(", ")
  )

  // Set exposed headers
  if (config.exposedHeaders?.length) {
    result = HttpServerResponse.setHeader(
      result,
      "Access-Control-Expose-Headers",
      config.exposedHeaders.join(", ")
    )
  }

  // Set credentials
  if (config.credentials) {
    result = HttpServerResponse.setHeader(
      result,
      "Access-Control-Allow-Credentials",
      "true"
    )
  }

  // Set max age for preflight cache
  if (config.maxAge) {
    result = HttpServerResponse.setHeader(
      result,
      "Access-Control-Max-Age",
      String(config.maxAge)
    )
  }

  return result
}

// ============================================
// 4. CORS middleware
// ============================================

const withCors = (config: CorsConfig = defaultCorsConfig) =>
  <E, R>(
    handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    E,
    R | HttpServerRequest.HttpServerRequest
  > =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const origin = request.headers["origin"]

      // Handle preflight OPTIONS request
      if (request.method === "OPTIONS") {
        const preflightResponse = HttpServerResponse.empty({ status: 204 })
        return addCorsHeaders(preflightResponse, origin, config)
      }

      // Check if origin is allowed
      if (
        origin &&
        config.allowedOrigins !== "*" &&
        !isOriginAllowed(origin, config.allowedOrigins)
      ) {
        return HttpServerResponse.json(
          { error: "CORS: Origin not allowed" },
          { status: 403 }
        )
      }

      // Process request and add CORS headers to response
      const response = yield* handler
      return addCorsHeaders(response, origin, config)
    })

// ============================================
// 5. Usage examples
// ============================================

// Allow all origins (development)
const devCors = withCors({
  ...defaultCorsConfig,
  allowedOrigins: "*",
})

// Specific origins (production)
const prodCors = withCors({
  allowedOrigins: [
    "https://myapp.com",
    "https://admin.myapp.com",
  ],
  allowedMethods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 3600,
})

// Apply to handlers
const myHandler = Effect.succeed(
  HttpServerResponse.json({ message: "Hello!" })
)

const corsEnabledHandler = devCors(myHandler)
```

**Rationale:**

Implement CORS as middleware that adds appropriate headers and handles preflight OPTIONS requests.

---


Browsers block cross-origin requests by default:

1. **Security** - Prevents malicious sites from accessing your API
2. **Controlled access** - Allow specific origins only
3. **Credentials** - Control cookie/auth header sharing
4. **Methods** - Limit which HTTP methods are allowed

---

---

### Implement API Authentication

**Rule:** Use middleware to validate authentication tokens before handling requests.

**Good Example:**

```typescript
import { Effect, Context, Layer, Data } from "effect"
import { HttpServer, HttpServerRequest, HttpServerResponse } from "@effect/platform"

// ============================================
// 1. Define authentication types
// ============================================

interface User {
  readonly id: string
  readonly email: string
  readonly roles: ReadonlyArray<string>
}

class AuthenticatedUser extends Context.Tag("AuthenticatedUser")<
  AuthenticatedUser,
  User
>() {}

class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly reason: string
}> {}

class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly requiredRole: string
}> {}

// ============================================
// 2. JWT validation service
// ============================================

interface JwtService {
  readonly verify: (token: string) => Effect.Effect<User, UnauthorizedError>
}

class Jwt extends Context.Tag("Jwt")<Jwt, JwtService>() {}

const JwtLive = Layer.succeed(Jwt, {
  verify: (token) =>
    Effect.gen(function* () {
      // In production: use a real JWT library
      if (!token || token === "invalid") {
        return yield* Effect.fail(new UnauthorizedError({ 
          reason: "Invalid or expired token" 
        }))
      }

      // Decode token (simplified)
      if (token.startsWith("user-")) {
        return {
          id: token.replace("user-", ""),
          email: "user@example.com",
          roles: ["user"],
        }
      }

      if (token.startsWith("admin-")) {
        return {
          id: token.replace("admin-", ""),
          email: "admin@example.com",
          roles: ["user", "admin"],
        }
      }

      return yield* Effect.fail(new UnauthorizedError({ 
        reason: "Malformed token" 
      }))
    }),
})

// ============================================
// 3. Authentication middleware
// ============================================

const extractBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) return null
  return header.slice(7)
}

const authenticate = <A, E, R>(
  handler: Effect.Effect<A, E, R | AuthenticatedUser>
): Effect.Effect<A, E | UnauthorizedError, R | Jwt | HttpServerRequest.HttpServerRequest> =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const jwt = yield* Jwt

    const authHeader = request.headers["authorization"]
    const token = extractBearerToken(authHeader)

    if (!token) {
      return yield* Effect.fail(new UnauthorizedError({ 
        reason: "Missing Authorization header" 
      }))
    }

    const user = yield* jwt.verify(token)

    return yield* handler.pipe(
      Effect.provideService(AuthenticatedUser, user)
    )
  })

// ============================================
// 4. Role-based authorization
// ============================================

const requireRole = (role: string) =>
  <A, E, R>(handler: Effect.Effect<A, E, R | AuthenticatedUser>) =>
    Effect.gen(function* () {
      const user = yield* AuthenticatedUser

      if (!user.roles.includes(role)) {
        return yield* Effect.fail(new ForbiddenError({ requiredRole: role }))
      }

      return yield* handler
    })

// ============================================
// 5. Protected routes
// ============================================

const getProfile = authenticate(
  Effect.gen(function* () {
    const user = yield* AuthenticatedUser
    return HttpServerResponse.json({
      id: user.id,
      email: user.email,
      roles: user.roles,
    })
  })
)

const adminOnly = authenticate(
  requireRole("admin")(
    Effect.gen(function* () {
      const user = yield* AuthenticatedUser
      return HttpServerResponse.json({
        message: `Welcome admin ${user.email}`,
        users: ["user1", "user2", "user3"],
      })
    })
  )
)

// ============================================
// 6. Error handling
// ============================================

const handleAuthErrors = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catchTag("UnauthorizedError", (e) =>
      Effect.succeed(
        HttpServerResponse.json({ error: e.reason }, { status: 401 })
      )
    ),
    Effect.catchTag("ForbiddenError", (e) =>
      Effect.succeed(
        HttpServerResponse.json(
          { error: `Requires role: ${e.requiredRole}` },
          { status: 403 }
        )
      )
    )
  )
```

**Rationale:**

Implement authentication as middleware that validates tokens and provides user context to route handlers.

---


Authentication protects your API:

1. **Identity verification** - Know who's making requests
2. **Access control** - Limit what users can do
3. **Audit trail** - Track who did what
4. **Rate limiting** - Per-user limits

---

---

### Make an Outgoing HTTP Client Request

**Rule:** Use the Http.client module to make outgoing requests to keep the entire operation within the Effect ecosystem.

**Good Example:**

This example creates a proxy endpoint. A request to `/proxy/posts/1` on our server will trigger an outgoing request to the JSONPlaceholder API. The response is then parsed and relayed back to the original client.

```typescript
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import * as HttpRouter from "@effect/platform/HttpRouter";
import * as HttpServer from "@effect/platform/HttpServer";
import * as HttpResponse from "@effect/platform/HttpServerResponse";
import { Console, Data, Duration, Effect, Fiber, Layer } from "effect";

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  id: string;
}> {}

export class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: string) =>
      id === "123"
        ? Effect.succeed({ name: "Paul" })
        : Effect.fail(new UserNotFoundError({ id })),
  }),
}) {}

const userHandler = Effect.flatMap(HttpRouter.params, (p) =>
  Effect.flatMap(Database, (db) => db.getUser(p["userId"] ?? "")).pipe(
    Effect.flatMap(HttpResponse.json)
  )
);

const app = HttpRouter.empty.pipe(
  HttpRouter.get("/users/:userId", userHandler)
);

const server = NodeHttpServer.layer(() => require("node:http").createServer(), {
  port: 3457,
});

const serverLayer = HttpServer.serve(app);

const mainLayer = Layer.merge(Database.Default, server);

const program = Effect.gen(function* () {
  yield* Effect.log("Server started on http://localhost:3457");
  const layer = Layer.provide(serverLayer, mainLayer);

  // Launch server and run for a short duration to demonstrate
  const serverFiber = yield* Layer.launch(layer).pipe(Effect.fork);

  // Wait a moment for server to start
  yield* Effect.sleep(Duration.seconds(1));

  // Simulate some server activity
  yield* Effect.log("Server is running and ready to handle requests");
  yield* Effect.sleep(Duration.seconds(2));

  // Shutdown gracefully
  yield* Fiber.interrupt(serverFiber);
  yield* Effect.log("Server shutdown complete");
});

NodeRuntime.runMain(
  Effect.provide(
    program,
    Layer.provide(serverLayer, Layer.merge(Database.Default, server))
  ) as Effect.Effect<void, unknown, never>
);
```

**Anti-Pattern:**

The anti-pattern is to use `fetch` inside a route handler, wrapped in `Effect.tryPromise`. This approach requires manual error handling and loses the benefits of the Effect ecosystem.

```typescript
import { Effect } from "effect";
import { Http, NodeHttpServer, NodeRuntime } from "@effect/platform-node";

const proxyRoute = Http.router.get(
  "/proxy/posts/:id",
  Effect.flatMap(Http.request.ServerRequest, (req) =>
    // Manually wrap fetch in an Effect
    Effect.tryPromise({
      try: () =>
        fetch(`https://jsonplaceholder.typicode.com/posts/${req.params.id}`),
      catch: () => "FetchError", // Untyped error
    }).pipe(
      Effect.flatMap((res) =>
        // Manually check status and parse JSON, each with its own error case
        res.ok
          ? Effect.tryPromise({
              try: () => res.json(),
              catch: () => "JsonError",
            })
          : Effect.fail("BadStatusError")
      ),
      Effect.map(Http.response.json),
      // A generic catch-all because we can't easily distinguish error types
      Effect.catchAll(() =>
        Http.response.text("An unknown error occurred", { status: 500 })
      )
    )
  )
);

const app = Http.router.empty.pipe(Http.router.addRoute(proxyRoute));

const program = Http.server
  .serve(app)
  .pipe(Effect.provide(NodeHttpServer.layer({ port: 3000 })));

NodeRuntime.runMain(program);
```

This manual approach is significantly more complex and less safe. It forces you to reinvent status and parsing logic, uses untyped string-based errors, and most importantly, the `fetch` call will not be automatically interrupted if the parent request is cancelled.

**Rationale:**

To call an external API from within your server, use the `Http.client` module. This creates an `Effect` that represents the outgoing request, keeping it fully integrated with the Effect runtime.

---


An API server often needs to communicate with other services. While you could use the native `fetch` API, this breaks out of the Effect ecosystem and forfeits its most powerful features. Using the built-in `Http.client` is superior for several critical reasons:

1.  **Full Integration**: An `Http.client` request is a first-class `Effect`. This means it seamlessly composes with all other effects. You can add timeouts, retry logic (`Schedule`), or race it with other operations using the standard Effect operators you already know.
2.  **Structured Concurrency**: This is a key benefit. If the original incoming request to your server is cancelled or times out, Effect will automatically interrupt the outgoing `Http.client` request. A raw `fetch` call would continue running in the background, wasting resources.
3.  **Typed Errors**: The client provides a rich set of typed errors (e.g., `Http.error.RequestError`, `Http.error.ResponseError`). This allows you to write precise error handling logic to distinguish between a network failure and a non-2xx response from the external API.
4.  **Testability**: The `Http.client` can be provided via a `Layer`, making it trivial to mock in tests. You can test your route's logic without making actual network calls, leading to faster and more reliable tests.

---

---


## 🟠 Advanced Patterns

### Generate OpenAPI Documentation

**Rule:** Use Schema definitions to automatically generate OpenAPI documentation for your API.

**Good Example:**

```typescript
import { Effect, Schema } from "effect"
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSwagger,
  OpenApi,
} from "@effect/platform"

// ============================================
// 1. Define schemas for request/response
// ============================================

const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/@/)),
  name: Schema.String,
  createdAt: Schema.DateFromString,
})

const CreateUserSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/@/)),
  name: Schema.String,
})

const UserListSchema = Schema.Array(UserSchema)

const ErrorSchema = Schema.Struct({
  error: Schema.String,
  code: Schema.String,
})

// ============================================
// 2. Define API endpoints with schemas
// ============================================

const usersApi = HttpApiGroup.make("users")
  .pipe(
    HttpApiGroup.add(
      HttpApiEndpoint.get("getUsers", "/users")
        .pipe(
          HttpApiEndpoint.setSuccess(UserListSchema),
          HttpApiEndpoint.addError(ErrorSchema, { status: 500 })
        )
    ),
    HttpApiGroup.add(
      HttpApiEndpoint.get("getUser", "/users/:id")
        .pipe(
          HttpApiEndpoint.setPath(Schema.Struct({
            id: Schema.String,
          })),
          HttpApiEndpoint.setSuccess(UserSchema),
          HttpApiEndpoint.addError(ErrorSchema, { status: 404 }),
          HttpApiEndpoint.addError(ErrorSchema, { status: 500 })
        )
    ),
    HttpApiGroup.add(
      HttpApiEndpoint.post("createUser", "/users")
        .pipe(
          HttpApiEndpoint.setPayload(CreateUserSchema),
          HttpApiEndpoint.setSuccess(UserSchema, { status: 201 }),
          HttpApiEndpoint.addError(ErrorSchema, { status: 400 }),
          HttpApiEndpoint.addError(ErrorSchema, { status: 500 })
        )
    ),
    HttpApiGroup.add(
      HttpApiEndpoint.del("deleteUser", "/users/:id")
        .pipe(
          HttpApiEndpoint.setPath(Schema.Struct({
            id: Schema.String,
          })),
          HttpApiEndpoint.setSuccess(Schema.Void, { status: 204 }),
          HttpApiEndpoint.addError(ErrorSchema, { status: 404 }),
          HttpApiEndpoint.addError(ErrorSchema, { status: 500 })
        )
    )
  )

// ============================================
// 3. Create the API definition
// ============================================

const api = HttpApi.make("My API")
  .pipe(
    HttpApi.addGroup(usersApi),
    OpenApi.annotate({
      title: "My Effect API",
      version: "1.0.0",
      description: "A sample API built with Effect",
    })
  )

// ============================================
// 4. Implement the handlers
// ============================================

const usersHandlers = HttpApiBuilder.group(api, "users", (handlers) =>
  handlers
    .pipe(
      HttpApiBuilder.handle("getUsers", () =>
        Effect.succeed([
          {
            id: "1",
            email: "alice@example.com",
            name: "Alice",
            createdAt: new Date(),
          },
        ])
      ),
      HttpApiBuilder.handle("getUser", ({ path }) =>
        Effect.gen(function* () {
          if (path.id === "not-found") {
            return yield* Effect.fail({ error: "User not found", code: "NOT_FOUND" })
          }
          return {
            id: path.id,
            email: "user@example.com",
            name: "User",
            createdAt: new Date(),
          }
        })
      ),
      HttpApiBuilder.handle("createUser", ({ payload }) =>
        Effect.succeed({
          id: crypto.randomUUID(),
          email: payload.email,
          name: payload.name,
          createdAt: new Date(),
        })
      ),
      HttpApiBuilder.handle("deleteUser", ({ path }) =>
        Effect.gen(function* () {
          if (path.id === "not-found") {
            return yield* Effect.fail({ error: "User not found", code: "NOT_FOUND" })
          }
          yield* Effect.log(`Deleted user ${path.id}`)
        })
      )
    )
)

// ============================================
// 5. Build the server with Swagger UI
// ============================================

const MyApiLive = HttpApiBuilder.api(api).pipe(
  Layer.provide(usersHandlers)
)

const ServerLive = HttpApiBuilder.serve().pipe(
  // Add Swagger UI at /docs
  Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
  Layer.provide(MyApiLive),
  Layer.provide(NodeHttpServer.layer({ port: 3000 }))
)

// ============================================
// 6. Export OpenAPI spec as JSON
// ============================================

const openApiSpec = OpenApi.fromApi(api)

// Save to file for external tools
import { NodeFileSystem } from "@effect/platform-node"

const saveSpec = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  yield* fs.writeFileString(
    "openapi.json",
    JSON.stringify(openApiSpec, null, 2)
  )
  yield* Effect.log("OpenAPI spec saved to openapi.json")
})
```

**Rationale:**

Define your API using Effect Schema and HttpApi to automatically generate OpenAPI documentation that stays in sync with your implementation.

---


OpenAPI documentation provides:

1. **Discovery** - Clients know what endpoints exist
2. **Contracts** - Clear request/response shapes
3. **Testing** - Swagger UI for manual testing
4. **Code generation** - Generate client SDKs
5. **Validation** - Schema-first development

---

---


