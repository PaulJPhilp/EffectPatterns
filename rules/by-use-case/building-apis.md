## Validate Request Body
**Rule:** Use Http.request.schemaBodyJson with a Schema to automatically parse and validate request bodies.

### Example
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

## Handle a GET Request
**Rule:** Use Http.router.get to associate a URL path with a specific response Effect.

### Example
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

## Provide Dependencies to Routes
**Rule:** Define dependencies with Effect.Service and provide them to your HTTP server using a Layer.

### Example
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

## Send a JSON Response
**Rule:** Use Http.response.json to automatically serialize data structures into a JSON response.

### Example
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

## Handle API Errors
**Rule:** Model application errors as typed classes and use Http.server.serveOptions to map them to specific HTTP responses.

### Example
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

## Extract Path Parameters
**Rule:** Define routes with colon-prefixed parameters (e.g., /users/:id) and access their values within the handler.

### Example
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

## Make an Outgoing HTTP Client Request
**Rule:** Use the Http.client module to make outgoing requests to keep the entire operation within the Effect ecosystem.

### Example
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

## Create a Basic HTTP Server
**Rule:** Use Http.server.serve with a platform-specific layer to run an HTTP application.

### Example
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