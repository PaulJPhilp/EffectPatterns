## Comparing Data by Value with Structural Equality
**Rule:** Use Data.struct or implement the Equal interface for value-based comparison of objects and classes.

### Example
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

## Create a Stream from a List
**Rule:** Use Stream.fromIterable to begin a pipeline from an in-memory collection.

### Example
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

## Execute Synchronous Effects with Effect.runSync
**Rule:** Execute synchronous effects with Effect.runSync.

### Example
```typescript
import { Effect } from "effect";

const program = Effect.succeed(10).pipe(Effect.map((n) => n * 2));

const result = Effect.runSync(program); // result is 20
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

## Execute Asynchronous Effects with Effect.runPromise
**Rule:** Execute asynchronous effects with Effect.runPromise.

### Example
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

## Understand that Effects are Lazy Blueprints
**Rule:** Understand that effects are lazy blueprints.

### Example
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

## Run a Pipeline for its Side Effects
**Rule:** Use Stream.runDrain to execute a stream for its side effects when you don't need the final values.

### Example
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

## Wrap Asynchronous Computations with tryPromise
**Rule:** Wrap asynchronous computations with tryPromise.

### Example
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

## Collect All Results into a List
**Rule:** Use Stream.runCollect to execute a stream and collect all its emitted values into a Chunk.

### Example
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

## Write Sequential Code with Effect.gen
**Rule:** Write sequential code with Effect.gen.

### Example
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

## Transform Effect Values with map and flatMap
**Rule:** Transform Effect values with map and flatMap.

### Example
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

## Create Pre-resolved Effects with succeed and fail
**Rule:** Create pre-resolved effects with succeed and fail.

### Example
```typescript
import { Effect, Data } from "effect";

const successEffect = Effect.succeed(42);

class MyError extends Data.TaggedError("MyError") {}
const failureEffect = Effect.fail(new MyError());
```

**Explanation:**  
Use `Effect.succeed` for values you already have, and `Effect.fail` for
immediate, known errors.

## Set Up a New Effect Project
**Rule:** Set up a new Effect project.

### Example
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

## Solve Promise Problems with Effect
**Rule:** Recognize that Effect solves the core limitations of Promises: untyped errors, no dependency injection, and no cancellation.

### Example
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

## Wrap Synchronous Computations with sync and try
**Rule:** Wrap synchronous computations with sync and try.

### Example
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

## Use .pipe for Composition
**Rule:** Use .pipe for composition.

### Example
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

## Understand the Three Effect Channels (A, E, R)
**Rule:** Understand that an Effect&lt;A, E, R&gt; describes a computation with a success type (A), an error type (E), and a requirements type (R).

### Example
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