---
title: "Provide Dependencies to Routes"
id: "provide-dependencies-to-routes"
skillLevel: "intermediate"
useCase:
  - "Building APIs"
  - "Dependency Injection"
  - "Application Architecture"
summary: "Inject services like database connections into HTTP route handlers using Layer and Effect.Service."
tags:
  - "http"
  - "server"
  - "dependency-injection"
  - "layer"
  - "service"
  - "context"
rule:
  description: "Define dependencies with Effect.Service and provide them to your HTTP server using a Layer."
author: "PaulJPhilp"
related:
  - "launch-http-server"
  - "handle-api-errors"
  - "layer-succeed"
---

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