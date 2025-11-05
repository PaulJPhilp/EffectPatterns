# Beginner Level Rules

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

## Comparing Data by Value with Structural Equality
**Rule:** Use Data.struct or implement the Equal interface for value-based comparison of objects and classes.

### Example
We define two points using `Data.struct`. Even though `p1` and `p2` are different instances in memory, `Equal.equals` correctly reports them as equal because their contents match.

```typescript
import { Data, Equal, Effect } from "effect";

// Define a Point type with structural equality
interface Point {
  readonly _tag: "Point";
  readonly x: number;
  readonly y: number;
}

const Point = Data.tagged<Point>("Point");

// Create a program to demonstrate structural equality
const program = Effect.gen(function* () {
  const p1 = Point({ x: 1, y: 2 });
  const p2 = Point({ x: 1, y: 2 });
  const p3 = Point({ x: 3, y: 4 });

  // Standard reference equality fails
  yield* Effect.log("Comparing points with reference equality (===):");
  yield* Effect.log(`p1 === p2: ${p1 === p2}`);

  // Structural equality works as expected
  yield* Effect.log("\nComparing points with structural equality:");
  yield* Effect.log(`p1 equals p2: ${Equal.equals(p1, p2)}`);
  yield* Effect.log(`p1 equals p3: ${Equal.equals(p1, p3)}`);

  // Show the actual points
  yield* Effect.log("\nPoint values:");
  yield* Effect.log(`p1: ${JSON.stringify(p1)}`);
  yield* Effect.log(`p2: ${JSON.stringify(p2)}`);
  yield* Effect.log(`p3: ${JSON.stringify(p3)}`);
});

// Run the program
Effect.runPromise(program);
```

---

## Create a Basic HTTP Server
**Rule:** Use Http.server.serve with a platform-specific layer to run an HTTP application.

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

// Run the server
Effect.runPromise(Effect.provide(program, HttpServer.Default)).catch(
  (error) => {
    console.error("Program failed:", error);
    process.exit(1);
  }
);

/*
To test:
1. Server will timeout after 5 seconds if it can't start
2. Server runs on port 3456 to avoid conflicts
3. Proper cleanup on shutdown
4. Demonstrates server lifecycle: start -> run -> shutdown
*/

```

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

## Create Pre-resolved Effects with succeed and fail
**Rule:** Create pre-resolved effects with succeed and fail.

### Example
```typescript
import { Effect, Data } from "effect"

// Create a custom error type
class MyError extends Data.TaggedError("MyError") {}

// Create a program that demonstrates pre-resolved effects
const program = Effect.gen(function* () {
  // Success effect
  yield* Effect.logInfo("Running success effect...")
  yield* Effect.gen(function* () {
    const value = yield* Effect.succeed(42)
    yield* Effect.logInfo(`Success value: ${value}`)
  })

  // Failure effect
  yield* Effect.logInfo("\nRunning failure effect...")
  yield* Effect.gen(function* () {
    yield* Effect.fail(new MyError())
  }).pipe(
    Effect.catchTag("MyError", (error) =>
      Effect.logInfo(`Error occurred: ${error._tag}`)
    )
  )
})

// Run the program
Effect.runPromise(program)
```

**Explanation:**  
Use `Effect.succeed` for values you already have, and `Effect.fail` for
immediate, known errors.

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

## Execute Synchronous Effects with Effect.runSync
**Rule:** Execute synchronous effects with Effect.runSync.

### Example
```typescript
import { Effect } from "effect"

// Simple synchronous program
const program1 = Effect.sync(() => {
  const n = 10
  const result = n * 2
  console.log(`Simple program result: ${result}`)
  return result
})

// Run simple program
Effect.runSync(program1)

// Program with logging
const program2 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting calculation...")
  const n = yield* Effect.sync(() => 10)
  yield* Effect.logInfo(`Got number: ${n}`)
  const result = yield* Effect.sync(() => n * 2)
  yield* Effect.logInfo(`Result: ${result}`)
  return result
})

// Run with logging
Effect.runSync(program2)

// Program with error handling
const program3 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting division...")
  const n = yield* Effect.sync(() => 10)
  const divisor = yield* Effect.sync(() => 0)
  
  yield* Effect.logInfo(`Attempting to divide ${n} by ${divisor}...`)
  return yield* Effect.try({
    try: () => {
      if (divisor === 0) throw new Error("Cannot divide by zero")
      return n / divisor
    },
    catch: (error) => {
      if (error instanceof Error) {
        return error
      }
      return new Error("Unknown error occurred")
    }
  })
}).pipe(
  Effect.catchAll((error) =>
    Effect.logInfo(`Error occurred: ${error.message}`)
  )
)

// Run with error handling
Effect.runSync(program3)
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

## Extract Path Parameters
**Rule:** Define routes with colon-prefixed parameters (e.g., /users/:id) and access their values within the handler.

### Example
This example defines a route that captures a `userId`. The handler for this route accesses the parsed parameters and uses the `userId` to construct a personalized greeting. The router automatically makes the parameters available to the handler.

```typescript
import { Data, Effect } from 'effect'

// Define tagged error for invalid paths
interface InvalidPathErrorSchema {
  readonly _tag: "InvalidPathError"
  readonly path: string
}

const makeInvalidPathError = (path: string): InvalidPathErrorSchema => ({
  _tag: "InvalidPathError",
  path
})

// Define service interface
interface PathOps {
  readonly extractUserId: (path: string) => Effect.Effect<string, InvalidPathErrorSchema>
  readonly greetUser: (userId: string) => Effect.Effect<string>
}

// Create service
class PathService extends Effect.Service<PathService>()(
  "PathService",
  {
    sync: () => ({
      extractUserId: (path: string) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Attempting to extract user ID from path: ${path}`)
          
          const match = path.match(/\/users\/([^/]+)/);
          if (!match) {
            yield* Effect.logInfo(`No user ID found in path: ${path}`)
            return yield* Effect.fail(makeInvalidPathError(path))
          }
          
          const userId = match[1];
          yield* Effect.logInfo(`Successfully extracted user ID: ${userId}`)
          return userId
        }),

      greetUser: (userId: string) =>
        Effect.gen(function* () {
          const greeting = `Hello, user ${userId}!`
          yield* Effect.logInfo(greeting)
          return greeting
        })
    })
  }
) {}

// Compose the functions with proper error handling
const processPath = (path: string): Effect.Effect<string, InvalidPathErrorSchema, PathService> =>
  Effect.gen(function* () {
    const pathService = yield* PathService
    yield* Effect.logInfo(`Processing path: ${path}`)
    const userId = yield* pathService.extractUserId(path)
    return yield* pathService.greetUser(userId)
  })

// Run examples with proper error handling
const program = Effect.gen(function* () {
  // Test valid paths
  yield* Effect.logInfo("=== Testing valid paths ===")
  const result1 = yield* processPath('/users/123')
  yield* Effect.logInfo(`Result 1: ${result1}`)
  
  const result2 = yield* processPath('/users/abc')
  yield* Effect.logInfo(`Result 2: ${result2}`)
  
  // Test invalid path
  yield* Effect.logInfo("\n=== Testing invalid path ===")
  const result3 = yield* processPath('/invalid/path').pipe(
    Effect.catchTag("InvalidPathError", (error) =>
      Effect.succeed(`Error: Invalid path ${error.path}`)
    )
  )
  yield* Effect.logInfo(result3)
})

Effect.runPromise(
  Effect.provide(program, PathService.Default)
)
```

## Handle a GET Request
**Rule:** Use Http.router.get to associate a URL path with a specific response Effect.

### Example
This example defines two separate GET routes, one for the root path (`/`) and one for `/hello`. We create an empty router and add each route to it. The resulting `app` is then served. The router automatically handles sending a `404 Not Found` response for any path that doesn't match.

```typescript
import { Data, Effect } from 'effect'

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
class RouteService extends Effect.Service<RouteService>()(
  "RouteService",
  {
    sync: () => {
      // Create instance methods
      const handleRoute = (path: string): Effect.Effect<RouteResponse, RouteNotFoundError | RouteHandlerError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Processing request for path: ${path}`);
          
          try {
            switch (path) {
              case '/':
                const home = 'Welcome to the home page!';
                yield* Effect.logInfo(`Serving home page`);
                return { status: 200, body: home };

              case '/hello':
                const hello = 'Hello, Effect!';
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
        simulateGet: (path: string): Effect.Effect<RouteResponse, RouteNotFoundError | RouteHandlerError> =>
          Effect.gen(function* () {
            yield* Effect.logInfo(`GET ${path}`);
            const response = yield* handleRoute(path);
            yield* Effect.logInfo(`Response: ${JSON.stringify(response)}`);
            return response;
          })
      };
    }
  }
) {}

// Create program with proper error handling
const program = Effect.gen(function* () {
  const router = yield* RouteService;
  
  yield* Effect.logInfo("=== Starting Route Tests ===");
  
  // Test different routes
  for (const path of ['/', '/hello', '/other', '/error']) {
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
            const response = { status: 500, body: `Internal Error: ${error.error}` };
            yield* Effect.logError(`${response.status} ${response.body}`);
            return response;
          })
      })
    );
    
    yield* Effect.logInfo(`Final Response: ${JSON.stringify(result)}`);
  }
  
  yield* Effect.logInfo("\n=== Route Tests Complete ===");
});

// Run the program
Effect.runPromise(
  Effect.provide(program, RouteService.Default)
);
```

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

## Safely Bracket Resource Usage with `acquireRelease`
**Rule:** Bracket the use of a resource between an `acquire` and a `release` effect.

### Example
```typescript
import { Effect, Console } from "effect";

// A mock resource that needs to be managed
const getDbConnection = Effect.sync(() => ({ id: Math.random() })).pipe(
  Effect.tap(() => Console.log("Connection Acquired")),
);

const closeDbConnection = (conn: { id: number }): Effect.Effect<void, never, never> =>
  Effect.sync(() => console.log(`Connection ${conn.id} Released`));

// The program that uses the resource
const program = Effect.acquireRelease(
  getDbConnection, // 1. acquire
  (connection) => closeDbConnection(connection) // 2. cleanup
).pipe(
  Effect.tap((connection) =>
    Console.log(`Using connection ${connection.id} to run query...`)
  )
);

Effect.runPromise(Effect.scoped(program));

/*
Output:
Connection Acquired
Using connection 0.12345... to run query...
Connection 0.12345... Released
*/
```

**Explanation:**
By using `Effect.acquireRelease`, the `closeDbConnection` logic is guaranteed to run after the main logic completes. This creates a self-contained, leak-proof unit of work that can be safely composed into larger programs.

## Send a JSON Response
**Rule:** Use Http.response.json to automatically serialize data structures into a JSON response.

### Example
This example defines a route that fetches a user object and returns it as a JSON response. The `Http.response.json` function handles all the necessary serialization and header configuration.

```typescript
import { Effect, Duration } from "effect";
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
    Effect.runPromise(jsonServer.handleRequest()).then(
      (response) => {
        res.writeHead(response.status, response.headers);
        res.end(response.body);
        // Log the response for demonstration
        Effect.runPromise(
          Effect.logInfo(`Sent JSON response: ${response.body}`)
        );
      },
      (error) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
        Effect.runPromise(Effect.logError(`Request error: ${error.message}`));
      }
    );
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
  Effect.provide(JsonServer.Default),
  Effect.provide(NodeContext.layer)
);

// Run the program
Effect.runPromise(program);

```

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

interface DbErrorType {
  readonly _tag: "DbError";
  readonly message: string;
}

const DbError = Data.tagged<DbErrorType>("DbError");

interface User {
  name: string;
}

class HttpClient extends Effect.Service<HttpClient>()("HttpClient", {
  sync: () => ({
    findById: (id: number): Effect.Effect<User, DbErrorType> =>
      Effect.try({
        try: () => ({ name: `User ${id}` }),
        catch: () => DbError({ message: "Failed to find user" }),
      }),
  }),
}) {}

const findUser = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient;
    return yield* client.findById(id);
  });

// Demonstrate how Effect solves promise problems
const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Solving Promise Problems with Effect ===");

  // Problem 1: Proper error handling (no more try/catch hell)
  yield* Effect.logInfo("1. Demonstrating type-safe error handling:");

  const result1 = yield* findUser(123).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`Handled error: ${error.message}`);
        return { name: "Default User" };
      })
    )
  );
  yield* Effect.logInfo(`Found user: ${result1.name}`);

  // Problem 2: Easy composition and chaining
  yield* Effect.logInfo("\n2. Demonstrating easy composition:");

  const composedOperation = Effect.gen(function* () {
    const user1 = yield* findUser(1);
    const user2 = yield* findUser(2);
    yield* Effect.logInfo(`Composed result: ${user1.name} and ${user2.name}`);
    return [user1, user2];
  });

  yield* composedOperation;

  // Problem 3: Resource management and cleanup
  yield* Effect.logInfo("\n3. Demonstrating resource management:");

  const resourceOperation = Effect.gen(function* () {
    yield* Effect.logInfo("Acquiring resource...");
    const resource = "database-connection";

    yield* Effect.addFinalizer(() => Effect.logInfo("Cleaning up resource..."));

    const user = yield* findUser(456);
    yield* Effect.logInfo(`Used resource to get: ${user.name}`);

    return user;
  }).pipe(Effect.scoped);

  yield* resourceOperation;

  yield* Effect.logInfo("\n✅ All operations completed successfully!");
});

Effect.runPromise(Effect.provide(program, HttpClient.Default));

```

---

## Transform Effect Values with map and flatMap
**Rule:** Transform Effect values with map and flatMap.

### Example
```typescript
import { Effect } from "effect";

const getUser = (id: number): Effect.Effect<{ id: number; name: string }> =>
  Effect.succeed({ id, name: "Paul" });

const getPosts = (userId: number): Effect.Effect<{ title: string }[]> =>
  Effect.succeed([{ title: "My First Post" }, { title: "Second Post" }]);

const userPosts = getUser(123).pipe(
  Effect.flatMap((user) => getPosts(user.id))
);

// Demonstrate transforming Effect values
const program = Effect.gen(function* () {
  console.log("=== Transform Effect Values Demo ===");

  // 1. Basic transformation with map
  console.log("\n1. Transform with map:");
  const userWithUpperName = yield* getUser(123).pipe(
    Effect.map((user) => ({ ...user, name: user.name.toUpperCase() }))
  );
  console.log("Transformed user:", userWithUpperName);

  // 2. Chain effects with flatMap
  console.log("\n2. Chain effects with flatMap:");
  const posts = yield* userPosts;
  console.log("User posts:", posts);

  // 3. Transform and combine multiple effects
  console.log("\n3. Transform and combine multiple effects:");
  const userWithPosts = yield* getUser(456).pipe(
    Effect.flatMap((user) =>
      getPosts(user.id).pipe(
        Effect.map((posts) => ({
          user: user.name,
          postCount: posts.length,
          titles: posts.map((p) => p.title),
        }))
      )
    )
  );
  console.log("User with posts:", userWithPosts);

  // 4. Transform with tap for side effects
  console.log("\n4. Transform with tap for side effects:");
  const result = yield* getUser(789).pipe(
    Effect.tap((user) =>
      Effect.sync(() => console.log(`Processing user: ${user.name}`))
    ),
    Effect.map((user) => `Hello, ${user.name}!`)
  );
  console.log("Final result:", result);

  console.log("\n✅ All transformations completed successfully!");
});

Effect.runPromise(program);

```

**Explanation:**  
Use `flatMap` to chain effects that depend on each other, and `map` for
simple value transformations.

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

## Understand the Three Effect Channels (A, E, R)
**Rule:** Understand that an Effect&lt;A, E, R&gt; describes a computation with a success type (A), an error type (E), and a requirements type (R).

### Example
This function signature is a self-documenting contract. It clearly states that to get a `User`, you must provide a `Database` service, and the operation might fail with a `UserNotFoundError`.

```typescript
import { Effect, Data } from "effect";

// Define the types for our channels
interface User { readonly name: string; } // The 'A' type
class UserNotFoundError extends Data.TaggedError("UserNotFoundError") {} // The 'E' type

// Define the Database service using Effect.Service
export class Database extends Effect.Service<Database>()(
  "Database",
  {
    // Provide a default implementation
    sync: () => ({
      findUser: (id: number) =>
        id === 1
          ? Effect.succeed({ name: "Paul" })
          : Effect.fail(new UserNotFoundError())
    })
  }
) {}

// This function's signature shows all three channels
const getUser = (id: number): Effect.Effect<User, UserNotFoundError, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.findUser(id);
  });

// The program will use the default implementation
const program = getUser(1);

// Run the program with the default implementation
Effect.runPromise(
  Effect.provide(
    program,
    Database.Default
  )
).then(console.log); // { name: 'Paul' }
```

---

## Use .pipe for Composition
**Rule:** Use .pipe for composition.

### Example
```typescript
import { Effect } from "effect";

const program = Effect.succeed(5).pipe(
  Effect.map((n) => n * 2),
  Effect.map((n) => `The result is ${n}`),
  Effect.tap(Effect.log)
);

// Demonstrate various pipe composition patterns
const demo = Effect.gen(function* () {
  console.log("=== Using Pipe for Composition Demo ===");

  // 1. Basic pipe composition
  console.log("\n1. Basic pipe composition:");
  yield* program;

  // 2. Complex pipe composition with multiple transformations
  console.log("\n2. Complex pipe composition:");
  const complexResult = yield* Effect.succeed(10).pipe(
    Effect.map((n) => n + 5),
    Effect.map((n) => n * 2),
    Effect.tap((n) =>
      Effect.sync(() => console.log(`Intermediate result: ${n}`))
    ),
    Effect.map((n) => n.toString()),
    Effect.map((s) => `Final: ${s}`)
  );
  console.log("Complex result:", complexResult);

  // 3. Pipe with flatMap for chaining effects
  console.log("\n3. Pipe with flatMap for chaining effects:");
  const chainedResult = yield* Effect.succeed("hello").pipe(
    Effect.map((s) => s.toUpperCase()),
    Effect.flatMap((s) => Effect.succeed(`${s} WORLD`)),
    Effect.flatMap((s) => Effect.succeed(`${s}!`)),
    Effect.tap((s) => Effect.sync(() => console.log(`Chained: ${s}`)))
  );
  console.log("Chained result:", chainedResult);

  // 4. Pipe with error handling
  console.log("\n4. Pipe with error handling:");
  const errorHandledResult = yield* Effect.succeed(-1).pipe(
    Effect.flatMap((n) =>
      n > 0 ? Effect.succeed(n) : Effect.fail(new Error("Negative number"))
    ),
    Effect.catchAll((error) =>
      Effect.succeed("Handled error: " + error.message)
    ),
    Effect.tap((result) =>
      Effect.sync(() => console.log(`Error handled: ${result}`))
    )
  );
  console.log("Error handled result:", errorHandledResult);

  // 5. Pipe with multiple operations
  console.log("\n5. Pipe with multiple operations:");
  const multiOpResult = yield* Effect.succeed([1, 2, 3, 4, 5]).pipe(
    Effect.map((arr) => arr.filter((n) => n % 2 === 0)),
    Effect.map((arr) => arr.map((n) => n * 2)),
    Effect.map((arr) => arr.reduce((sum, n) => sum + n, 0)),
    Effect.tap((sum) =>
      Effect.sync(() => console.log(`Sum of even numbers doubled: ${sum}`))
    )
  );
  console.log("Multi-operation result:", multiOpResult);

  console.log("\n✅ Pipe composition demonstration completed!");
});

Effect.runPromise(demo);

```

**Explanation:**  
Using `.pipe()` allows you to compose operations in a top-to-bottom style,
improving readability and maintainability.

## Wrap Asynchronous Computations with tryPromise
**Rule:** Wrap asynchronous computations with tryPromise.

### Example
```typescript
import { Effect, Data } from "effect";

// Define error type using Data.TaggedError
class HttpError extends Data.TaggedError("HttpError")<{
  readonly message: string;
}> {}

// Define HTTP client service
export class HttpClient extends Effect.Service<HttpClient>()("HttpClient", {
  // Provide default implementation
  sync: () => ({
    getUrl: (url: string) =>
      Effect.tryPromise({
        try: () => fetch(url),
        catch: (error) =>
          new HttpError({ message: `Failed to fetch ${url}: ${error}` }),
      }),
  }),
}) {}

// Mock HTTP client for demonstration
export class MockHttpClient extends Effect.Service<MockHttpClient>()(
  "MockHttpClient",
  {
    sync: () => ({
      getUrl: (url: string) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Fetching URL: ${url}`);

          // Simulate different responses based on URL
          if (url.includes("success")) {
            yield* Effect.logInfo("✅ Request successful");
            return new Response(JSON.stringify({ data: "success" }), {
              status: 200,
            });
          } else if (url.includes("error")) {
            yield* Effect.logInfo("❌ Request failed");
            return yield* Effect.fail(
              new HttpError({ message: "Server returned 500" })
            );
          } else {
            yield* Effect.logInfo("✅ Request completed");
            return new Response(JSON.stringify({ data: "mock response" }), {
              status: 200,
            });
          }
        }),
    }),
  }
) {}

// Demonstrate wrapping asynchronous computations
const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Wrapping Asynchronous Computations Demo ===");

  const client = yield* MockHttpClient;

  // Example 1: Successful request
  yield* Effect.logInfo("\n1. Successful request:");
  const response1 = yield* client
    .getUrl("https://api.example.com/success")
    .pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError(`Request failed: ${error.message}`);
          return new Response("Error response", { status: 500 });
        })
      )
    );
  yield* Effect.logInfo(`Response status: ${response1.status}`);

  // Example 2: Failed request with error handling
  yield* Effect.logInfo("\n2. Failed request with error handling:");
  const response2 = yield* client.getUrl("https://api.example.com/error").pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Request failed: ${error.message}`);
        return new Response("Fallback response", { status: 200 });
      })
    )
  );
  yield* Effect.logInfo(`Fallback response status: ${response2.status}`);

  // Example 3: Multiple async operations
  yield* Effect.logInfo("\n3. Multiple async operations:");
  const results = yield* Effect.all(
    [
      client.getUrl("https://api.example.com/endpoint1"),
      client.getUrl("https://api.example.com/endpoint2"),
      client.getUrl("https://api.example.com/endpoint3"),
    ],
    { concurrency: 2 }
  ).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`One or more requests failed: ${error.message}`);
        return [];
      })
    )
  );
  yield* Effect.logInfo(`Completed ${results.length} requests`);

  yield* Effect.logInfo(
    "\n✅ Asynchronous computations demonstration completed!"
  );
});

// Run with mock implementation
Effect.runPromise(Effect.provide(program, MockHttpClient.Default));

```

**Explanation:**  
`Effect.tryPromise` wraps a `Promise`-returning function and safely handles
rejections, moving errors into the Effect's error channel.

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

// More examples of wrapping synchronous computations
const divide = (a: number, b: number) =>
  Effect.try({
    try: () => {
      if (b === 0) throw new Error("Division by zero");
      return a / b;
    },
    catch: (error) => new Error(`Division failed: ${error}`),
  });

const processString = (str: string) =>
  Effect.sync(() => {
    console.log(`Processing string: "${str}"`);
    return str.toUpperCase().split("").reverse().join("");
  });

// Demonstrate wrapping synchronous computations
const program = Effect.gen(function* () {
  console.log("=== Wrapping Synchronous Computations Demo ===");

  // Example 1: Basic sync computation
  console.log("\n1. Basic sync computation (random number):");
  const random1 = yield* randomNumber;
  const random2 = yield* randomNumber;
  console.log(`Random numbers: ${random1.toFixed(4)}, ${random2.toFixed(4)}`);

  // Example 2: Successful JSON parsing
  console.log("\n2. Successful JSON parsing:");
  const validJson = '{"name": "Paul", "age": 30}';
  const parsed = yield* parseJson(validJson).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Parsing failed: ${error.message}`);
        return { error: "Failed to parse" };
      })
    )
  );
  console.log("Parsed JSON:", parsed);

  // Example 3: Failed JSON parsing with error handling
  console.log("\n3. Failed JSON parsing with error handling:");
  const invalidJson = '{"name": "Paul", "age":}';
  const parsedWithError = yield* parseJson(invalidJson).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Parsing failed: ${error.message}`);
        return { error: "Invalid JSON", input: invalidJson };
      })
    )
  );
  console.log("Error result:", parsedWithError);

  // Example 4: Division with error handling
  console.log("\n4. Division with error handling:");
  const division1 = yield* divide(10, 2).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Division error: ${error.message}`);
        return -1;
      })
    )
  );
  console.log(`10 / 2 = ${division1}`);

  const division2 = yield* divide(10, 0).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Division error: ${error.message}`);
        return -1;
      })
    )
  );
  console.log(`10 / 0 = ${division2} (error handled)`);

  // Example 5: String processing
  console.log("\n5. String processing:");
  const processed = yield* processString("Hello Effect");
  console.log(`Processed result: "${processed}"`);

  // Example 6: Combining multiple sync operations
  console.log("\n6. Combining multiple sync operations:");
  const combined = yield* Effect.gen(function* () {
    const num = yield* randomNumber;
    const multiplied = yield* Effect.sync(() => num * 100);
    const rounded = yield* Effect.sync(() => Math.round(multiplied));
    return rounded;
  });
  console.log(`Combined operations result: ${combined}`);

  console.log("\n✅ Synchronous computations demonstration completed!");
});

Effect.runPromise(program);

```

**Explanation:**  
Use `Effect.sync` for safe synchronous code, and `Effect.try` to safely
handle exceptions from potentially unsafe code.

## Write Sequential Code with Effect.gen
**Rule:** Write sequential code with Effect.gen.

### Example
```typescript
import { Effect } from "effect";

// Mock API functions for demonstration
const fetchUser = (id: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Fetching user ${id}...`);
    // Simulate API call
    yield* Effect.sleep("100 millis");
    return { id, name: `User ${id}`, email: `user${id}@example.com` };
  });

const fetchUserPosts = (userId: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Fetching posts for user ${userId}...`);
    // Simulate API call
    yield* Effect.sleep("150 millis");
    return [
      { id: 1, title: "First Post", userId },
      { id: 2, title: "Second Post", userId },
    ];
  });

const fetchPostComments = (postId: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Fetching comments for post ${postId}...`);
    // Simulate API call
    yield* Effect.sleep("75 millis");
    return [
      { id: 1, text: "Great post!", postId },
      { id: 2, text: "Thanks for sharing", postId },
    ];
  });

// Example of sequential code with Effect.gen
const getUserDataWithGen = (userId: number) =>
  Effect.gen(function* () {
    // Step 1: Fetch user
    const user = yield* fetchUser(userId);
    yield* Effect.logInfo(`✅ Got user: ${user.name}`);

    // Step 2: Fetch user's posts (depends on user data)
    const posts = yield* fetchUserPosts(user.id);
    yield* Effect.logInfo(`✅ Got ${posts.length} posts`);

    // Step 3: Fetch comments for first post (depends on posts data)
    const firstPost = posts[0];
    const comments = yield* fetchPostComments(firstPost.id);
    yield* Effect.logInfo(
      `✅ Got ${comments.length} comments for "${firstPost.title}"`
    );

    // Step 4: Combine all data
    const result = {
      user,
      posts,
      featuredPost: {
        ...firstPost,
        comments,
      },
    };

    yield* Effect.logInfo("✅ Successfully combined all user data");
    return result;
  });

// Example without Effect.gen (more complex)
const getUserDataWithoutGen = (userId: number) =>
  fetchUser(userId).pipe(
    Effect.flatMap((user) =>
      fetchUserPosts(user.id).pipe(
        Effect.flatMap((posts) =>
          fetchPostComments(posts[0].id).pipe(
            Effect.map((comments) => ({
              user,
              posts,
              featuredPost: {
                ...posts[0],
                comments,
              },
            }))
          )
        )
      )
    )
  );

// Demonstrate writing sequential code with gen
const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Writing Sequential Code with Effect.gen Demo ===");

  // Example 1: Sequential operations with Effect.gen
  yield* Effect.logInfo("\n1. Sequential operations with Effect.gen:");
  const userData = yield* getUserDataWithGen(123).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed to get user data: ${error}`);
        return null;
      })
    )
  );

  if (userData) {
    yield* Effect.logInfo(
      `Final result: User "${userData.user.name}" has ${userData.posts.length} posts`
    );
    yield* Effect.logInfo(
      `Featured post: "${userData.featuredPost.title}" with ${userData.featuredPost.comments.length} comments`
    );
  }

  // Example 2: Compare with traditional promise-like chaining
  yield* Effect.logInfo("\n2. Same logic without Effect.gen (for comparison):");
  const userData2 = yield* getUserDataWithoutGen(456).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed to get user data: ${error}`);
        return null;
      })
    )
  );

  if (userData2) {
    yield* Effect.logInfo(
      `Result from traditional approach: User "${userData2.user.name}"`
    );
  }

  // Example 3: Error handling in sequential code
  yield* Effect.logInfo("\n3. Error handling in sequential operations:");
  const errorHandling = yield* Effect.gen(function* () {
    try {
      const user = yield* fetchUser(999);
      const posts = yield* fetchUserPosts(user.id);
      return { user, posts };
    } catch (error) {
      yield* Effect.logError(`Error in sequential operations: ${error}`);
      return null;
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Caught error: ${error}`);
        return { user: null, posts: [] };
      })
    )
  );

  yield* Effect.logInfo(
    `Error handling result: ${errorHandling ? "Success" : "Handled error"}`
  );

  yield* Effect.logInfo("\n✅ Sequential code demonstration completed!");
  yield* Effect.logInfo(
    "Effect.gen makes sequential async code look like synchronous code!"
  );
});

Effect.runPromise(program);

```

**Explanation:**  
`Effect.gen` allows you to write top-to-bottom code that is easy to read and
maintain, even when chaining many asynchronous steps.