## Handle Errors with catchTag, catchTags, and catchAll
**Rule:** Handle errors with catchTag, catchTags, and catchAll.

### Example
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

## Mapping Errors to Fit Your Domain
**Rule:** Use Effect.mapError to transform errors and create clean architectural boundaries between layers.

### Example
A `UserRepository` uses a `Database` service. The `Database` can fail with specific errors, but the `UserRepository` maps them to a single, generic `RepositoryError` before they are exposed to the rest of the application.

```typescript
import { Effect, Data } from "effect";

// Low-level, specific errors from the database layer
class ConnectionError extends Data.TaggedError("ConnectionError") {}
class QueryError extends Data.TaggedError("QueryError") {}

// A generic error for the repository layer
class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly cause: unknown;
}> {}

// The inner service
const dbQuery = (): Effect.Effect<
  { name: string },
  ConnectionError | QueryError
> => Effect.fail(new ConnectionError());

// The outer service uses `mapError` to create a clean boundary.
// Its public signature only exposes `RepositoryError`.
const findUser = (): Effect.Effect<{ name: string }, RepositoryError> =>
  dbQuery().pipe(
    Effect.mapError(
      (error) => new RepositoryError({ cause: error }),
    ),
  );
```

---

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

## Control Repetition with Schedule
**Rule:** Use Schedule to create composable policies for controlling the repetition and retrying of effects.

### Example
This example demonstrates composition by creating a common, robust retry policy: exponential backoff with jitter, limited to 5 attempts.

```typescript
import { Effect, Schedule, Duration } from "effect";

// A simple effect that can fail
const flakyEffect = Effect.try({
  try: () => {
    if (Math.random() > 0.2) {
      console.log("Operation failed, retrying...");
      throw new Error("Transient error");
    }
    return "Operation succeeded!";
  },
  catch: () => "ApiError" as const,
});

// --- Building a Composable Schedule ---

// 1. Start with a base exponential backoff (100ms, 200ms, 400ms...)
const exponentialBackoff = Schedule.exponential(Duration.millis(100));

// 2. Add random jitter to avoid thundering herd problems
const withJitter = exponentialBackoff.pipe(Schedule.jittered);

// 3. Limit the schedule to a maximum of 5 repetitions
const limitedWithJitter = withJitter.pipe(Schedule.andThen(Schedule.recurs(5)));

// --- Using the Schedule ---
const program = flakyEffect.pipe(Effect.retry(limitedWithJitter));

Effect.runPromise(program).then(console.log);
```

---

## Supercharge Your Editor with the Effect LSP
**Rule:** Install and use the Effect LSP extension for enhanced type information and error checking in your editor.

### Example
Imagine you have the following code. Without the LSP, hovering over `program` might show a complex, hard-to-read inferred type.

```typescript
import { Effect } from "effect";

const program = Effect.succeed(42).pipe(
  Effect.map((n) => n.toString()),
  Effect.flatMap((s) => Effect.log(s)),
  Effect.provide(Logger.live), // Assuming a Logger service
);
```

With the Effect LSP installed, your editor would display a clear, readable overlay right above the `program` variable, looking something like this:

```
// (LSP Inlay Hint)
// program: Effect<void, never, never>
```

This immediately tells you that the final program returns nothing (`void`), has no expected failures (`never`), and has no remaining requirements (`never`), so it's ready to be run.

---

## Model Optional Values Safely with Option
**Rule:** Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

### Example
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

## Race Concurrent Effects for the Fastest Result
**Rule:** Use Effect.race to get the result from the first of several effects to succeed, automatically interrupting the losers.

### Example
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

## Use Effect.gen for Business Logic
**Rule:** Use Effect.gen for business logic.

### Example
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

## Transform Data During Validation with Schema
**Rule:** Use Schema.transform to safely convert data types during the validation and parsing process.

### Example
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

## Turn a Paginated API into a Single Stream
**Rule:** Use Stream.paginateEffect to model a paginated data source as a single, continuous stream.

### Example
This example simulates fetching users from a paginated API. The `fetchUsersPage` function gets one page of data and returns the next page number. `Stream.paginateEffect` uses this function to create a single stream of all users across all pages.

```typescript
import { Effect, Stream, Chunk, Option } from 'effect';

// --- Mock Paginated API ---
interface User {
  id: number;
  name: string;
}

const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

// This function simulates fetching a page of users from an API.
const fetchUsersPage = (
  page: number
): Effect.Effect<[Chunk.Chunk<User>, Option.Option<number>], Error> => {
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  const users = Chunk.fromIterable(allUsers.slice(offset, offset + pageSize));

  const nextPage =
    Chunk.isNonEmpty(users) && allUsers.length > offset + pageSize
      ? Option.some(page + 1)
      : Option.none();

  return Effect.succeed([users, nextPage]).pipe(
    Effect.tap(() => Effect.log(`Fetched page ${page}`))
  );
};

// --- The Pattern ---
// Use paginateEffect, providing an initial state (page 1) and the fetch function.
const userStream = Stream.paginateEffect(1, fetchUsersPage);

const program = userStream.pipe(
  Stream.runCollect,
  Effect.map((users) => users.length)
);

Effect.runPromise(program).then((totalUsers) => {
  console.log(`Total users fetched from all pages: ${totalUsers}`);
});
/*
Output:
... level=INFO msg="Fetched page 1"
... level=INFO msg="Fetched page 2"
... level=INFO msg="Fetched page 3"
Total users fetched from all pages: 25
*/
```

## Access Configuration from the Context
**Rule:** Access configuration from the Effect context.

### Example
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

## Define Type-Safe Errors with Data.TaggedError
**Rule:** Define type-safe errors with Data.TaggedError.

### Example
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

## Process Items Concurrently
**Rule:** Use Stream.mapEffect with the `concurrency` option to process stream items in parallel.

### Example
This example processes four items, each taking one second. By setting `concurrency: 2`, the total runtime is approximately two seconds instead of four, because items are processed in parallel pairs.

```typescript
import { Effect, Stream } from 'effect';

// A mock function that simulates a slow I/O operation
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.log(`Starting item ${id}...`).pipe(
    Effect.delay('1 second'),
    Effect.map(() => `Finished item ${id}`),
    Effect.tap(Effect.log)
  );

const ids = [1, 2, 3, 4];

const program = Stream.fromIterable(ids).pipe(
  // Process up to 2 items concurrently
  Stream.mapEffect(processItem, { concurrency: 2 }),
  Stream.runDrain
);

// Measure the total time taken
const timedProgram = Effect.timed(program);

Effect.runPromise(timedProgram).then(([duration, _]) => {
  console.log(`\nTotal time: ${Math.round(duration.millis / 1000)} seconds`);
});
/*
Output:
... level=INFO msg="Starting item 1..."
... level=INFO msg="Starting item 2..."
... level=INFO msg="Finished item 1"
... level=INFO msg="Starting item 3..."
... level=INFO msg="Finished item 2"
... level=INFO msg="Starting item 4..."
... level=INFO msg="Finished item 3"
... level=INFO msg="Finished item 4"

Total time: 2 seconds
*/
```

## Accessing the Current Time with Clock
**Rule:** Use the Clock service to get the current time, enabling deterministic testing with TestClock.

### Example
This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Layer } from "effect";
import { TestClock } from "effect/TestClock";
import { describe, it, expect } from "vitest";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (token: Token): Effect.Effect<boolean, never, Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
  );

// --- Testing the function ---
describe("isTokenExpired", () => {
  const token = { value: "abc", expiresAt: 1000 };

  it("should return false when the clock is before the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(false);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));

  it("should return true when the clock is after the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(1500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(true);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));
});
```

---

## Process Items in Batches
**Rule:** Use Stream.grouped(n) to transform a stream of items into a stream of batched chunks.

### Example
This example processes 10 users. By using `Stream.grouped(5)`, it transforms the stream of 10 individual users into a stream of two chunks (each a batch of 5). The `saveUsersInBulk` function is then called only twice, once for each batch.

```typescript
import { Effect, Stream, Chunk } from 'effect';

// A mock function that simulates a bulk database insert
const saveUsersInBulk = (
  userBatch: Chunk.Chunk<{ id: number }>
): Effect.Effect<void, Error> =>
  Effect.log(
    `Saving batch of ${userBatch.length} users: ${Chunk.toArray(userBatch)
      .map((u) => u.id)
      .join(', ')}`
  );

const userIds = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

const program = Stream.fromIterable(userIds).pipe(
  // Group the stream of users into batches of 5
  Stream.grouped(5),
  // Process each batch with our bulk save function
  Stream.mapEffect(saveUsersInBulk, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Saving batch of 5 users: 1, 2, 3, 4, 5"
... level=INFO msg="Saving batch of 5 users: 6, 7, 8, 9, 10"
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

## Leverage Effect's Built-in Structured Logging
**Rule:** Leverage Effect's built-in structured logging.

### Example
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

## Representing Time Spans with Duration
**Rule:** Use the Duration data type to represent time intervals instead of raw numbers.

### Example
This example shows how to create and use `Duration` to make time-based operations clear and unambiguous.

```typescript
import { Effect, Duration } from "effect";

// Create durations with clear, explicit units
const fiveSeconds = Duration.seconds(5);
const oneHundredMillis = Duration.millis(100);

// Use them in Effect operators
const program = Effect.log("Starting...").pipe(
  Effect.delay(oneHundredMillis),
  Effect.flatMap(() => Effect.log("Running after 100ms")),
  Effect.timeout(fiveSeconds), // This whole operation must complete within 5 seconds
);

// Durations can also be compared
const isLonger = Duration.greaterThan(fiveSeconds, oneHundredMillis); // true
```

---

## Define Contracts Upfront with Schema
**Rule:** Define contracts upfront with schema.

### Example
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

## Conditionally Branching Workflows
**Rule:** Use predicate-based operators like Effect.filter and Effect.if to declaratively control workflow branching.

### Example
Here, we use `Effect.filter` with named predicates to validate a user before proceeding. The intent is crystal clear, and the business rules (`isActive`, `isAdmin`) are reusable.

```typescript
import { Effect } from "effect";

interface User {
  id: number;
  status: "active" | "inactive";
  roles: string[];
}

const findUser = (id: number): Effect.Effect<User, "DbError"> =>
  Effect.succeed({ id, status: "active", roles: ["admin"] });

// Reusable, testable predicates that document business rules.
const isActive = (user: User) => user.status === "active";
const isAdmin = (user: User) => user.roles.includes("admin");

const program = (id: number) =>
  findUser(id).pipe(
    // If this predicate is false, the effect fails.
    Effect.filter(isActive, () => "UserIsInactive" as const),
    // If this one is false, the effect fails.
    Effect.filter(isAdmin, () => "UserIsNotAdmin" as const),
    // This part only runs if both filters pass.
    Effect.map((user) => `Welcome, admin user #${user.id}!`),
  );

// We can then handle the specific failures in a type-safe way.
const handled = program(123).pipe(
  Effect.catchTag("UserIsNotAdmin", () =>
    Effect.succeed("Access denied: requires admin role."),
  ),
);
```

---

## Control Flow with Conditional Combinators
**Rule:** Use conditional combinators for control flow.

### Example
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

## Process Streaming Data with Stream
**Rule:** Use Stream to model and process data that arrives over time in a composable, efficient way.

### Example
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

## Manage Shared State Safely with Ref
**Rule:** Use Ref to manage shared, mutable state concurrently, ensuring atomicity.

### Example
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

## Write Tests That Adapt to Application Code
**Rule:** Write tests that adapt to application code.

### Example
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

## Process collections of data asynchronously
**Rule:** Leverage Stream to process collections effectfully with built-in concurrency control and resource safety.

### Example
This example processes a list of IDs by fetching user data for each one. `Stream.mapEffect` is used to apply an effectful function (`getUserById`) to each element, with concurrency limited to 2 simultaneous requests.

```typescript
import { Effect, Stream, Chunk } from 'effect';

// A mock function that simulates fetching a user from a database
const getUserById = (id: number): Effect.Effect<{ id: number; name: string }, Error> =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay('100 millis'),
    Effect.tap(() => Effect.log(`Fetched user ${id}`))
  );

// The stream-based program
const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  // Process each item with an Effect, limiting concurrency to 2
  Stream.mapEffect(getUserById, { concurrency: 2 }),
  // Run the stream and collect all results into a Chunk
  Stream.runCollect
);

Effect.runPromise(program).then((users) => {
  console.log('All users fetched:', Chunk.toArray(users));
});
```

## Run Independent Effects in Parallel with Effect.all
**Rule:** Use Effect.all to execute a collection of independent effects concurrently.

### Example
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

## Use the Auto-Generated .Default Layer in Tests
**Rule:** Use the auto-generated .Default layer in tests.

### Example
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

## Process a Large File with Constant Memory
**Rule:** Use Stream.fromReadable with a Node.js Readable stream to process files efficiently.

### Example
This example demonstrates reading a text file, splitting it into individual lines, and processing each line. The combination of `Stream.fromReadable`, `Stream.decodeText`, and `Stream.splitLines` is a powerful and common pattern for handling text-based files.

```typescript
import { Effect, Stream } from 'effect';
import { NodeFileSystem } from '@effect/platform-node';
import * as fs from 'node:fs';
import * as path from 'node:path';

// This program reads a file named 'large-file.txt' line by line.
// First, let's ensure the file exists for the example.
const program = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, 'large-file.txt');

  // Create a dummy file for the example
  yield* fs.writeFileString(filePath, 'line 1\nline 2\nline 3');

  // Create a Node.js readable stream and convert it to an Effect Stream
  const stream = Stream.fromReadable(() => fs.createReadStream(filePath)).pipe(
    // Decode the raw buffer chunks into text
    Stream.decodeText('utf-8'),
    // Split the text stream into a stream of individual lines
    Stream.splitLines,
    // Process each line
    Stream.tap((line) => Effect.log(`Processing: ${line}`))
  );

  // Run the stream for its side effects and ignore the output
  yield* Stream.runDrain(stream);

  // Clean up the dummy file
  yield* fs.remove(filePath);
});

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Processing: line 1"
... level=INFO msg="Processing: line 2"
... level=INFO msg="Processing: line 3"
*/
```

## Parse and Validate Data with Schema.decode
**Rule:** Parse and validate data with Schema.decode.

### Example
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

## Understand Layers for Dependency Injection
**Rule:** Understand that a Layer is a blueprint describing how to construct a service and its dependencies.

### Example
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

## Retry Operations Based on Specific Errors
**Rule:** Use predicate-based retry policies to retry an operation only for specific, recoverable errors.

### Example
This example simulates an API client that can fail with different, specific error types. The retry policy is configured to *only* retry on `ServerBusyError` and give up immediately on `NotFoundError`.

```typescript
import { Effect, Data, Schedule, Duration } from "effect";

// Define specific, tagged errors for our API client
class ServerBusyError extends Data.TaggedError("ServerBusyError") {}
class NotFoundError extends Data.TaggedError("NotFoundError") {}

// A flaky API call that can fail in different ways
const flakyApiCall = Effect.try({
  try: () => {
    const random = Math.random();
    if (random < 0.5) {
      console.log("API call failed: Server is busy. Retrying...");
      throw new ServerBusyError();
    }
    if (random < 0.8) {
      console.log("API call failed: Resource not found. Not retrying.");
      throw new NotFoundError();
    }
    return { data: "success" };
  },
  catch: (e) => e as ServerBusyError | NotFoundError,
});

// A predicate that returns true only for the error we want to retry
const isRetryableError = (e: ServerBusyError | NotFoundError) =>
  e._tag === "ServerBusyError";

// A policy that retries 3 times, but only if the error is retryable
const selectiveRetryPolicy = Schedule.recurs(3).pipe(
  Schedule.whileInput(isRetryableError),
  Schedule.addDelay(() => "100 millis"),
);

const program = flakyApiCall.pipe(Effect.retry(selectiveRetryPolicy));

Effect.runPromise(program);
```

---

## Trace Operations Across Services with Spans
**Rule:** Use Effect.withSpan to create custom tracing spans for important operations.

### Example
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

## Avoid Long Chains of .andThen; Use Generators Instead
**Rule:** Prefer generators over long chains of .andThen.

### Example
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

## Handle Flaky Operations with Retries and Timeouts
**Rule:** Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing effects.

### Example
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

## Distinguish 'Not Found' from Errors
**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

### Example
This function to find a user can fail if the database is down, or it can succeed but find no user. The return type ``Effect.Effect<Option.Option<User>, DatabaseError>`` makes this contract perfectly clear.

````typescript
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
````

## Process a Collection in Parallel with Effect.forEach
**Rule:** Use Effect.forEach with the `concurrency` option to process a collection in parallel with a fixed limit.

### Example
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

## Model Validated Domain Types with Brand
**Rule:** Model validated domain types with Brand.

### Example
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

## Mocking Dependencies in Tests
**Rule:** Provide mock service implementations via a test-specific Layer to isolate the unit under test.

### Example
We want to test a `Notifier` service that uses an `EmailClient` to send emails. In our test, we provide a mock `EmailClient` that doesn't actually send emails but just returns a success value.

```typescript
import { Effect, Layer } from "effect";
import { describe, it, expect } from "vitest";

// --- The Services ---
class EmailClient extends Effect.Tag("EmailClient")<
  EmailClient,
  { readonly send: (address: string, body: string) => Effect.Effect<void, "SendError"> }
>() {}

class Notifier extends Effect.Tag("Notifier")<
  Notifier,
  { readonly notifyUser: (userId: number, message: string) => Effect.Effect<void, "SendError"> }
>() {}

// The "Live" Notifier implementation, which depends on EmailClient
const NotifierLive = Layer.effect(
  Notifier,
  Effect.gen(function* () {
    const emailClient = yield* EmailClient;
    return Notifier.of({
      notifyUser: (userId, message) =>
        emailClient.send(`user-${userId}@example.com`, message),
    });
  }),
);

// --- The Test ---
describe("Notifier", () => {
  it("should call the email client with the correct address", () =>
    Effect.gen(function* () {
      // 1. Get the service we want to test
      const notifier = yield* Notifier;
      // 2. Run its logic
      yield* notifier.notifyUser(123, "Your invoice is ready.");
    }).pipe(
      // 3. Provide a mock implementation for its dependency
      Effect.provide(
        Layer.succeed(
          EmailClient,
          EmailClient.of({
            send: (address, body) =>
              Effect.sync(() => {
                // 4. Make assertions on the mock's behavior
                expect(address).toBe("user-123@example.com");
                expect(body).toBe("Your invoice is ready.");
              }),
          }),
        ),
      ),
      // 5. Provide the layer for the service under test
      Effect.provide(NotifierLive),
      // 6. Run the test
      Effect.runPromise,
    ));
});
```

---

## Define a Type-Safe Configuration Schema
**Rule:** Define a type-safe configuration schema.

### Example
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

## Use Chunk for High-Performance Collections
**Rule:** Prefer Chunk over Array for immutable collection operations within data processing pipelines for better performance.

### Example
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

## Beyond the Date Type - Real World Dates, Times, and Timezones
**Rule:** Use the Clock service for testable time-based logic and immutable primitives for timestamps.

### Example
This example shows a function that creates a timestamped event. It depends on the `Clock` service, making it fully testable.

```typescript
import { Effect, Clock, Layer } from "effect";
import { TestClock } from "effect/TestClock";
import { describe, it, expect } from "vitest";

interface Event {
  readonly message: string;
  readonly timestamp: number; // Store as a primitive number (UTC millis)
}

// This function is pure and testable because it depends on Clock
const createEvent = (message: string): Effect.Effect<Event, never, Clock> =>
  Effect.gen(function* () {
    const timestamp = yield* Clock.currentTimeMillis;
    return { message, timestamp };
  });

// --- Testing the function ---
describe("createEvent", () => {
  it("should use the time from the TestClock", () =>
    Effect.gen(function* () {
      // Manually set the virtual time
      yield* TestClock.setTime(1672531200000); // Jan 1, 2023 UTC
      const event = yield* createEvent("User logged in");

      // The timestamp is predictable and testable
      expect(event.timestamp).toBe(1672531200000);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));
});
```

---

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

## Accumulate Multiple Errors with Either
**Rule:** Use Either to accumulate multiple validation errors instead of failing on the first one.

### Example
Using `Schema.decode` with the `allErrors: true` option demonstrates this pattern perfectly. The underlying mechanism uses `Either` to collect all parsing errors into an array instead of stopping at the first one.

````typescript
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
````

---

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

## Automatically Retry Failed Operations
**Rule:** Compose a Stream with the .retry(Schedule) operator to automatically recover from transient failures.

### Example
This example simulates an API that fails the first two times it's called. The stream processes a list of IDs, and the `retry` operator ensures that the failing operation for `id: 2` is automatically retried until it succeeds.

````typescript
import { Effect, Stream, Schedule } from 'effect';

let attempts = 0;
// A mock function that simulates a flaky API call
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    yield* Effect.log(`Attempting to process item ${id}...`);
    if (id === 2 && attempts < 2) {
      attempts++;
      yield* Effect.log(`Item ${id} failed, attempt ${attempts}.`);
      return yield* Effect.fail(new Error('API is temporarily down'));
    }
    return `Successfully processed item ${id}`;
  });

const ids = [1, 2, 3];

// Define a retry policy: 3 attempts with a fixed 100ms delay
const retryPolicy = Schedule.recurs(3).pipe(Schedule.addDelay('100 millis'));

const program = Stream.fromIterable(ids).pipe(
  // Apply the processing function to each item
  Stream.mapEffect(processItem, { concurrency: 1 }),
  // Apply the retry policy to the entire stream
  Stream.retry(retryPolicy),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Attempting to process item 1..."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 1."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 2."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Attempting to process item 3..."
*/
````

## Provide Configuration to Your App via a Layer
**Rule:** Provide configuration to your app via a Layer.

### Example
````typescript
import { Config, Effect, Layer } from "effect";

const ServerConfig = Config.all({ port: Config.number("PORT") });

const program = Effect.log("Application starting...");

const configLayer = Config.layer(ServerConfig);

const runnable = Effect.provide(program, configLayer);
````

**Explanation:**  
This approach makes configuration available contextually, supporting better testing and modularity.