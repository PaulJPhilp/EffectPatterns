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

## Understand Fibers as Lightweight Threads
**Rule:** Understand that a Fiber is a lightweight, virtual thread managed by the Effect runtime for massive concurrency.

### Example
This program demonstrates the efficiency of fibers by forking 100,000 of them. Each fiber does a small amount of work (sleeping for 1 second). Trying to do this with 100,000 OS threads would instantly crash any system.

```typescript
import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  const fiberCount = 100_000;
  yield* Effect.log(`Forking ${fiberCount} fibers...`);

  // Create an array of 100,000 simple effects
  const tasks = Array.from({ length: fiberCount }, (_, i) =>
    Effect.sleep("1 second").pipe(Effect.as(i)),
  );

  // Fork all of them into background fibers
  const fibers = yield* Effect.forEach(tasks, Effect.fork);

  yield* Effect.log("All fibers have been forked. Now waiting for them to complete...");

  // Wait for all fibers to finish their work
  const results = yield* Fiber.joinAll(fibers);

  yield* Effect.log(`All ${results.length} fibers have completed.`);
});

// This program runs successfully, demonstrating the low overhead of fibers.
Effect.runPromise(program);
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
  Effect.tap(Effect.log),
);
```

**Explanation:**  
Using `.pipe()` allows you to compose operations in a top-to-bottom style,
improving readability and maintainability.

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