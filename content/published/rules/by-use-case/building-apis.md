# building-apis Patterns

## Add Rate Limiting to APIs

Use a rate limiter service to enforce request quotas per client.

### Example

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

---

## Compose API Middleware

Use Effect composition to build a middleware pipeline that processes requests.

### Example

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

---

## Configure CORS for APIs

Configure CORS headers to allow legitimate cross-origin requests while blocking unauthorized ones.

### Example

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

---

## Create a Basic HTTP Server

Use Http.server.serve with a platform-specific layer to run an HTTP application.

### Example

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

---

## Extract Path Parameters

Define routes with colon-prefixed parameters (e.g., /users/:id) and access their values within the handler.

### Example

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

---

## Generate OpenAPI Documentation

Use Schema definitions to automatically generate OpenAPI documentation for your API.

### Example

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

---

## Handle a GET Request

Use Http.router.get to associate a URL path with a specific response Effect.

### Example

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

---

## Handle API Errors

Model application errors as typed classes and use Http.server.serveOptions to map them to specific HTTP responses.

### Example

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

---

## Implement API Authentication

Use middleware to validate authentication tokens before handling requests.

### Example

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

---

## Make an Outgoing HTTP Client Request

Use the Http.client module to make outgoing requests to keep the entire operation within the Effect ecosystem.

### Example

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

---

## Provide Dependencies to Routes

Define dependencies with Effect.Service and provide them to your HTTP server using a Layer.

### Example

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

---

## Send a JSON Response

Use Http.response.json to automatically serialize data structures into a JSON response.

### Example

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

---

## Validate Request Body

Use Http.request.schemaBodyJson with a Schema to automatically parse and validate request bodies.

### Example

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

---

