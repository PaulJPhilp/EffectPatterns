# core-concepts Patterns

## Access Configuration from the Context

Access configuration from the Effect context.

### Example

```typescript
import { Config, Effect, Layer } from "effect";

// Define config service
class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  sync: () => ({
    host: "localhost",
    port: 3000,
  }),
}) {}

// Create program that uses config
const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  yield* Effect.log(`Starting server on http://${config.host}:${config.port}`);
});

// Run the program with default config
Effect.runPromise(Effect.provide(program, AppConfig.Default));
```

**Explanation:**  
By yielding the config object, you make your dependency explicit and leverage Effect's context system for testability and modularity.

---

## Accumulate Multiple Errors with Either

Use Either to model computations that may fail, making errors explicit and type-safe.

### Example

```typescript
import { Either } from "effect";

// Create a Right (success) or Left (failure)
const success = Either.right(42); // Either<never, number>
const failure = Either.left("Something went wrong"); // Either<string, never>

// Pattern match on Either
const result = success.pipe(
  Either.match({
    onLeft: (err) => `Error: ${err}`,
    onRight: (value) => `Value: ${value}`,
  })
); // string

// Combine multiple Eithers and accumulate errors
const e1 = Either.right(1);
const e2 = Either.left("fail1");
const e3 = Either.left("fail2");

const all = [e1, e2, e3].filter(Either.isRight).map(Either.getRight); // [1]
const errors = [e1, e2, e3].filter(Either.isLeft).map(Either.getLeft); // ["fail1", "fail2"]
```

**Explanation:**

- `Either.right(value)` represents success.
- `Either.left(error)` represents failure.
- Pattern matching ensures all cases are handled.
- You can accumulate errors or results from multiple Eithers.

---

## Beyond the Date Type - Real World Dates, Times, and Timezones

Use the Clock service for testable time-based logic and immutable primitives for timestamps.

### Example

This example shows a function that creates a timestamped event. It depends on the `Clock` service, making it fully testable.

```typescript
import { Effect, Clock } from "effect";
import type * as Types from "effect/Clock";

interface Event {
  readonly message: string;
  readonly timestamp: number; // Store as a primitive number (UTC millis)
}

// This function is pure and testable because it depends on Clock
const createEvent = (
  message: string
): Effect.Effect<Event, never, Types.Clock> =>
  Effect.gen(function* () {
    const timestamp = yield* Clock.currentTimeMillis;
    return { message, timestamp };
  });

// Create and log some events
const program = Effect.gen(function* () {
  const loginEvent = yield* createEvent("User logged in");
  yield* Effect.log("Login event:", loginEvent);

  const logoutEvent = yield* createEvent("User logged out");
  yield* Effect.log("Logout event:", logoutEvent);
});

// Run the program
const programWithErrorHandling = program.pipe(
  Effect.provideService(Clock.Clock, Clock.make()),
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithErrorHandling);
```

---

---

## Chaining Computations with flatMap

Use flatMap to sequence computations, flattening nested structures and preserving error and context handling.

### Example

```typescript
import { Effect, Stream, Option, Either } from "effect";

// Effect: Chain two effectful computations
const effect = Effect.succeed(2).pipe(
  Effect.flatMap((n) => Effect.succeed(n * 10))
); // Effect<number>

// Option: Chain two optional computations
const option = Option.some(2).pipe(Option.flatMap((n) => Option.some(n * 10))); // Option<number>

// Either: Chain two computations that may fail
const either = Either.right(2).pipe(
  Either.flatMap((n) => Either.right(n * 10))
); // Either<never, number>

// Stream: Chain streams (flattening)
const stream = Stream.fromIterable([1, 2]).pipe(
  Stream.flatMap((n) => Stream.fromIterable([n, n * 10]))
); // Stream<number>
```

**Explanation:**  
`flatMap` lets you build pipelines where each step can depend on the result of the previous one, and the structure is always flattened—no `Option<Option<A>>` or `Effect<Effect<A>>`.

---

## Combining Values with zip

Use zip to run two computations and combine their results into a tuple, preserving error and context handling.

### Example

```typescript
import { Effect, Either, Option, Stream } from "effect";

// Effect: Combine two effects and get both results
const effectA = Effect.succeed(1);
const effectB = Effect.succeed("hello");
const zippedEffect = effectA.pipe(Effect.zip(effectB)); // Effect<[number, string]>

// Option: Combine two options, only Some if both are Some
const optionA = Option.some(1);
const optionB = Option.some("hello");
const zippedOption = Option.all([optionA, optionB]); // Option<[number, string]>

// Either: Combine two eithers, only Right if both are Right
const eitherA = Either.right(1);
const eitherB = Either.right("hello");
const zippedEither = Either.all([eitherA, eitherB]); // Either<never, [number, string]>

// Stream: Pair up values from two streams
const streamA = Stream.fromIterable([1, 2, 3]);
const streamB = Stream.fromIterable(["a", "b", "c"]);
const zippedStream = streamA.pipe(Stream.zip(streamB)); // Stream<[number, string]>
```

**Explanation:**  
`zip` runs both computations and pairs their results.  
If either computation fails (or is None/Left/empty), the result is a failure (or None/Left/empty).

---

## Comparing Data by Value with Data.struct

Use Data.struct to define objects whose equality is based on their contents, enabling safe and predictable comparisons.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal objects
const user1 = Data.struct({ id: 1, name: "Alice" });
const user2 = Data.struct({ id: 1, name: "Alice" });

// Compare by value, not reference
const areEqual = Equal.equals(user1, user2); // true

// Use in a HashSet or as keys in a Map
import { HashSet } from "effect";
const set = HashSet.make(user1);
console.log(HashSet.has(set, user2)); // true
```

**Explanation:**

- `Data.struct` creates immutable objects with value-based equality.
- Use for domain entities, value objects, and when storing objects in sets or as map keys.
- Avoids bugs from reference-based comparison.

---

## Comparing Data by Value with Structural Equality

Use Data.struct or implement the Equal interface for value-based comparison of objects and classes.

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

---

## Conditional Branching with if, when, and cond

Use combinators such as if, when, and cond to branch computations based on runtime conditions, without imperative if statements.

### Example

```typescript
import { Effect, Stream, Option, Either } from "effect";

// Effect: Branch based on a condition
const effect = Effect.if(true, {
  onTrue: () => Effect.succeed("yes"),
  onFalse: () => Effect.succeed("no"),
}); // Effect<string>

// Option: Conditionally create an Option
const option = true ? Option.some("yes") : Option.none(); // Option<string> (Some("yes"))

// Either: Conditionally create an Either
const either = true ? Either.right("yes") : Either.left("error"); // Either<string, string> (Right("yes"))

// Stream: Conditionally emit a stream
const stream = false ? Stream.fromIterable([1, 2]) : Stream.empty; // Stream<number> (empty)
```

**Explanation:**  
These combinators let you branch your computation based on a boolean or predicate, without leaving the world of composable, type-safe code.  
You can also use `when` to run an effect only if a condition is true, or `unless` to run it only if a condition is false.

---

## Control Flow with Conditional Combinators

Use conditional combinators for control flow.

### Example

```typescript
import { Effect } from "effect";

const attemptAdminAction = (user: { isAdmin: boolean }) =>
  Effect.if(user.isAdmin, {
    onTrue: () => Effect.succeed("Admin action completed."),
    onFalse: () => Effect.fail("Permission denied."),
  });

const program = Effect.gen(function* () {
  // Try with admin user
  yield* Effect.logInfo("\nTrying with admin user...");
  const adminResult = yield* Effect.either(
    attemptAdminAction({ isAdmin: true })
  );
  yield* Effect.logInfo(
    `Admin result: ${adminResult._tag === "Right" ? adminResult.right : adminResult.left}`
  );

  // Try with non-admin user
  yield* Effect.logInfo("\nTrying with non-admin user...");
  const userResult = yield* Effect.either(
    attemptAdminAction({ isAdmin: false })
  );
  yield* Effect.logInfo(
    `User result: ${userResult._tag === "Right" ? userResult.right : userResult.left}`
  );
});

Effect.runPromise(program);
```

**Explanation:**  
`Effect.if` and related combinators allow you to branch logic without leaving
the Effect world or breaking the flow of composition.

---

## Converting from Nullable, Option, or Either

Use fromNullable, fromOption, and fromEither to lift nullable values, Option, or Either into Effects or Streams for safe, typeful interop.

### Example

```typescript
import { Effect, Option, Either } from "effect";

// Option: Convert a nullable value to an Option
const nullableValue: string | null = Math.random() > 0.5 ? "hello" : null;
const option = Option.fromNullable(nullableValue); // Option<string>

// Effect: Convert an Option to an Effect that may fail
const someValue = Option.some(42);
const effectFromOption = Option.match(someValue, {
  onNone: () => Effect.fail("No value"),
  onSome: (value) => Effect.succeed(value),
}); // Effect<number, string, never>

// Effect: Convert an Either to an Effect
const either = Either.right("success");
const effectFromEither = Either.match(either, {
  onLeft: (error) => Effect.fail(error),
  onRight: (value) => Effect.succeed(value),
}); // Effect<string, never, never>
```

**Explanation:**

- `Effect.fromNullable` lifts a nullable value into an Effect, failing if the value is `null` or `undefined`.
- `Effect.fromOption` lifts an Option into an Effect, failing if the Option is `none`.
- `Effect.fromEither` lifts an Either into an Effect, failing if the Either is `left`.

---

## Create Pre-resolved Effects with succeed and fail

Create pre-resolved effects with succeed and fail.

### Example

```typescript
import { Effect, Data } from "effect";

// Create a custom error type
class MyError extends Data.TaggedError("MyError") {}

// Create a program that demonstrates pre-resolved effects
const program = Effect.gen(function* () {
  // Success effect
  yield* Effect.logInfo("Running success effect...");
  yield* Effect.gen(function* () {
    const value = yield* Effect.succeed(42);
    yield* Effect.logInfo(`Success value: ${value}`);
  });

  // Failure effect
  yield* Effect.logInfo("\nRunning failure effect...");
  yield* Effect.gen(function* () {
    // Use return yield* for effects that never succeed
    return yield* Effect.fail(new MyError());
  }).pipe(
    Effect.catchTag("MyError", (error) =>
      Effect.logInfo(`Error occurred: ${error._tag}`)
    )
  );
});

// Run the program
Effect.runPromise(program);
```

**Explanation:**  
Use `Effect.succeed` for values you already have, and `Effect.fail` for
immediate, known errors.

---

## Creating from Collections

Use fromIterable and fromArray to lift collections into Streams or Effects for batch or streaming processing.

### Example

```typescript
import { Stream, Effect } from "effect";

// Stream: Create a stream from an array
const numbers = [1, 2, 3, 4];
const numberStream = Stream.fromIterable(numbers); // Stream<number>

// Stream: Create a stream from any iterable
function* gen() {
  yield "a";
  yield "b";
}
const letterStream = Stream.fromIterable(gen()); // Stream<string>

// Effect: Create an effect from an array of effects (batch)
const effects = [Effect.succeed(1), Effect.succeed(2)];
const batchEffect = Effect.all(effects); // Effect<[1, 2]>
```

**Explanation:**

- `Stream.fromIterable` creates a stream from any array or iterable, enabling streaming and batch operations.
- `Effect.all` (covered elsewhere) can be used to process arrays of effects in batch.

---

## Creating from Synchronous and Callback Code

Use sync and async to create Effects from synchronous or callback-based computations, making them composable and type-safe.

### Example

```typescript
import { Effect } from "effect";

// Synchronous: Wrap a computation that is guaranteed not to throw
const effectSync = Effect.sync(() => Math.random()); // Effect<never, number, never>

// Callback-based: Wrap a Node.js-style callback API
function legacyReadFile(
  path: string,
  cb: (err: Error | null, data?: string) => void
) {
  setTimeout(() => cb(null, "file contents"), 10);
}

const effectAsync = Effect.async<string, Error>((resume) => {
  legacyReadFile("file.txt", (err, data) => {
    if (err) resume(Effect.fail(err));
    else resume(Effect.succeed(data!));
  });
}); // Effect<string, Error, never>
```

**Explanation:**

- `Effect.sync` is for synchronous computations that are guaranteed not to throw.
- `Effect.async` is for integrating callback-based APIs, converting them into Effects.

---

## Define a Type-Safe Configuration Schema

Define a type-safe configuration schema.

### Example

```typescript
import { Config, Effect, ConfigProvider, Layer } from "effect";

const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  })
);

// Example program that uses the config
const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.logInfo(`Server config loaded: ${JSON.stringify(config)}`);
});

// Create a config provider with test values
const TestConfig = ConfigProvider.fromMap(
  new Map([
    ["SERVER.HOST", "localhost"],
    ["SERVER.PORT", "3000"],
  ])
);

// Run with test config
Effect.runPromise(Effect.provide(program, Layer.setConfigProvider(TestConfig)));
```

**Explanation:**  
This schema ensures that both `host` and `port` are present and properly typed, and that their source is clearly defined.

---

## Filtering Results with filter

Use filter to declaratively express conditional logic, keeping only values that satisfy a predicate.

### Example

```typescript
import { Effect, Stream, Option, Either } from "effect";

// Effect: Only succeed if the value is even, fail otherwise
const effect = Effect.succeed(4).pipe(
  Effect.filterOrFail(
    (n): n is number => n % 2 === 0,
    () => "Number is not even"
  )
); // Effect<number, string>

// Option: Only keep the value if it is even
const option = Option.some(4).pipe(
  Option.filter((n): n is number => n % 2 === 0)
); // Option<number>

// Either: Use map and flatMap to filter
const either = Either.right(4).pipe(
  Either.flatMap((n) =>
    n % 2 === 0 ? Either.right(n) : Either.left("Number is not even")
  )
); // Either<string, number>

// Stream: Only emit even numbers
const stream = Stream.fromIterable([1, 2, 3, 4]).pipe(
  Stream.filter((n): n is number => n % 2 === 0)
); // Stream<number>
```

**Explanation:**  
`filter` applies a predicate to the value(s) inside the structure. If the predicate fails, the result is a failure (`Effect.fail`, `Either.left`), `Option.none`, or an empty stream.

---

## Handle Unexpected Errors by Inspecting the Cause

Use Cause to inspect, analyze, and handle all possible failure modes of an Effect, including expected errors, defects, and interruptions.

### Example

```typescript
import { Cause, Effect } from "effect";

// An Effect that may fail with an error or defect
const program = Effect.try({
  try: () => {
    throw new Error("Unexpected failure!");
  },
  catch: (err) => err,
});

// Catch all causes and inspect them
const handled = program.pipe(
  Effect.catchAllCause((cause) =>
    Effect.sync(() => {
      if (Cause.isDie(cause)) {
        console.error("Defect (die):", Cause.pretty(cause));
      } else if (Cause.isFailure(cause)) {
        console.error("Expected error:", Cause.pretty(cause));
      } else if (Cause.isInterrupted(cause)) {
        console.error("Interrupted:", Cause.pretty(cause));
      }
      // Handle or rethrow as needed
    })
  )
);
```

**Explanation:**

- `Cause` distinguishes between expected errors (`fail`), defects (`die`), and interruptions.
- Use `Cause.pretty` for human-readable error traces.
- Enables advanced error handling and debugging.

---

## Handling Errors with catchAll, orElse, and match

Use error handling combinators to recover from failures, provide fallback values, or transform errors in a composable way.

### Example

```typescript
import { Effect, Option, Either } from "effect";

// Effect: Recover from any error
const effect = Effect.fail("fail!").pipe(
  Effect.catchAll((err) => Effect.succeed(`Recovered from: ${err}`))
); // Effect<string>

// Option: Provide a fallback if value is None
const option = Option.none().pipe(Option.orElse(() => Option.some("default"))); // Option<string>

// Either: Provide a fallback if value is Left
const either = Either.left("error").pipe(
  Either.orElse(() => Either.right("fallback"))
); // Either<never, string>

// Effect: Pattern match on success or failure
const matchEffect = Effect.fail("fail!").pipe(
  Effect.match({
    onFailure: (err) => `Error: ${err}`,
    onSuccess: (value) => `Success: ${value}`,
  })
); // Effect<string>
```

**Explanation:**  
These combinators let you handle errors, provide defaults, or transform error values in a way that is composable and type-safe.  
You can recover from errors, provide alternative computations, or pattern match on success/failure.

---

## Lifting Errors and Absence with fail, none, and left

Use fail, none, and left to create Effect, Option, or Either that represent failure or absence.

### Example

```typescript
import { Effect, Option, Either } from "effect";

// Effect: Represent a failure with an error value
const effect = Effect.fail("Something went wrong"); // Effect<string, never, never>

// Option: Represent absence of a value
const option = Option.none(); // Option<never>

// Either: Represent a failure with a left value
const either = Either.left("Invalid input"); // Either<string, never>
```

**Explanation:**

- `Effect.fail(error)` creates an effect that always fails with `error`.
- `Option.none()` creates an option that is always absent.
- `Either.left(error)` creates an either that always represents failure.

---

## Lifting Values with succeed, some, and right

Use succeed, some, and right to create Effect, Option, or Either from plain values.

### Example

```typescript
import { Effect, Option, Either } from "effect";

// Effect: Lift a value into an Effect that always succeeds
const effect = Effect.succeed(42); // Effect<never, number, never>

// Option: Lift a value into an Option that is always Some
const option = Option.some("hello"); // Option<string>

// Either: Lift a value into an Either that is always Right
const either = Either.right({ id: 1 }); // Either<never, { id: number }>
```

**Explanation:**

- `Effect.succeed(value)` creates an effect that always succeeds with `value`.
- `Option.some(value)` creates an option that is always present.
- `Either.right(value)` creates an either that always represents success.

---

## Manage Shared State Safely with Ref

Use Ref to safely manage shared, mutable state in concurrent and effectful programs.

### Example

```typescript
import { Effect, Ref } from "effect";

// Create a Ref with an initial value
const makeCounter = Ref.make(0);

// Increment the counter atomically
const increment = makeCounter.pipe(
  Effect.flatMap((counter) => Ref.update(counter, (n) => n + 1))
);

// Read the current value
const getValue = makeCounter.pipe(
  Effect.flatMap((counter) => Ref.get(counter))
);

// Use Ref in a workflow
const program = Effect.gen(function* () {
  const counter = yield* Ref.make(0);
  yield* Ref.update(counter, (n) => n + 1);
  const value = yield* Ref.get(counter);
  yield* Effect.log(`Counter value: ${value}`);
});
```

**Explanation:**

- `Ref` is an atomic, mutable reference for effectful and concurrent code.
- All operations are safe, composable, and free of race conditions.
- Use `Ref` for counters, caches, or any shared mutable state.

---

## Mapping and Chaining over Collections with forEach and all

Use forEach and all to process collections of values with effectful functions, collecting results in a type-safe and composable way.

### Example

```typescript
import { Effect, Either, Option, Stream } from "effect";

// Effect: Apply an effectful function to each item in an array
const numbers = [1, 2, 3];
const effect = Effect.forEach(numbers, (n) => Effect.succeed(n * 2));
// Effect<number[]>

// Effect: Run multiple effects in parallel and collect results
const effects = [Effect.succeed(1), Effect.succeed(2)];
const allEffect = Effect.all(effects, { concurrency: "unbounded" }); // Effect<[1, 2]>

// Option: Map over a collection of options and collect only the Some values
const options = [Option.some(1), Option.none(), Option.some(3)];
const filtered = options.filter(Option.isSome).map((o) => o.value); // [1, 3]

// Either: Collect all Right values from a collection of Eithers
const eithers = [Either.right(1), Either.left("fail"), Either.right(3)];
const rights = eithers.filter(Either.isRight); // [Either.Right(1), Either.Right(3)]

// Stream: Map and flatten a stream of arrays
const stream = Stream.fromIterable([
  [1, 2],
  [3, 4],
]).pipe(Stream.flatMap((arr) => Stream.fromIterable(arr))); // Stream<number>
```

**Explanation:**  
`forEach` and `all` let you process collections in a way that is composable, type-safe, and often parallel.  
They handle errors and context automatically, and can be used for batch jobs, parallel requests, or data transformations.

---

## Model Optional Values Safely with Option

Use Option to model values that may be present or absent, making absence explicit and type-safe.

### Example

```typescript
import { Option } from "effect";

// Create an Option from a value
const someValue = Option.some(42); // Option<number>
const noValue = Option.none(); // Option<never>

// Safely convert a nullable value to Option
const fromNullable = Option.fromNullable(Math.random() > 0.5 ? "hello" : null); // Option<string>

// Pattern match on Option
const result = someValue.pipe(
  Option.match({
    onNone: () => "No value",
    onSome: (n) => `Value: ${n}`,
  })
); // string

// Use Option in a workflow
function findUser(id: number): Option.Option<{ id: number; name: string }> {
  return id === 1 ? Option.some({ id, name: "Alice" }) : Option.none();
}
```

**Explanation:**

- `Option.some(value)` represents a present value.
- `Option.none()` represents absence.
- `Option.fromNullable` safely lifts nullable values into Option.
- Pattern matching ensures all cases are handled.

---

## Modeling Effect Results with Exit

Use Exit to capture the outcome of an Effect, including success, failure, and defects, for robust error handling and coordination.

### Example

```typescript
import { Effect, Exit } from "effect";

// Run an Effect and capture its Exit value
const program = Effect.succeed(42);

const runAndCapture = Effect.runPromiseExit(program); // Promise<Exit<never, number>>

// Pattern match on Exit
runAndCapture.then((exit) => {
  if (Exit.isSuccess(exit)) {
    console.log("Success:", exit.value);
  } else if (Exit.isFailure(exit)) {
    console.error("Failure:", exit.cause);
  }
});
```

**Explanation:**

- `Exit` captures both success (`Exit.success(value)`) and failure (`Exit.failure(cause)`).
- Use `Exit` for robust error handling, supervision, and coordination of concurrent effects.
- Pattern matching on `Exit` lets you handle all possible outcomes.

---

## Modeling Tagged Unions with Data.case

Use Data.case to define tagged unions (ADTs) for modeling domain-specific states and enabling exhaustive pattern matching.

### Example

```typescript
import { Data } from "effect";

// Define a tagged union for a simple state machine
type State = Data.TaggedEnum<{
  Loading: {};
  Success: { data: string };
  Failure: { error: string };
}>;
const { Loading, Success, Failure } = Data.taggedEnum<State>();

// Create instances
const state1: State = Loading();
const state2: State = Success({ data: "Hello" });
const state3: State = Failure({ error: "Oops" });

// Pattern match on the state
function handleState(state: State): string {
  switch (state._tag) {
    case "Loading":
      return "Loading...";
    case "Success":
      return `Data: ${state.data}`;
    case "Failure":
      return `Error: ${state.error}`;
  }
}
```

**Explanation:**

- `Data.case` creates tagged constructors for each state.
- The `_tag` property enables exhaustive pattern matching.
- Use for domain modeling, state machines, and error types.

---

## Process Streaming Data with Stream

Use Stream to model and process data that arrives over time in a composable, efficient way.

### Example

This example demonstrates creating a `Stream` from a paginated API. The `Stream` will make API calls as needed, processing one page of users at a time without ever holding the entire user list in memory.

```typescript
import { Effect, Stream, Option } from "effect";

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
  page: number
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
      : { users: [], nextPage: null }
  ).pipe(Effect.delay("50 millis"));

// Stream.paginateEffect creates a stream from a paginated source
const userStream: Stream.Stream<User, "ApiError"> = Stream.paginateEffect(
  0,
  (page) =>
    fetchUserPage(page).pipe(
      Effect.map(
        (response) =>
          [response.users, Option.fromNullable(response.nextPage)] as const
      )
    )
).pipe(
  // Flatten the stream of user arrays into a stream of individual users
  Stream.flatMap((users) => Stream.fromIterable(users))
);

// We can now process the stream of users.
// Stream.runForEach will pull from the stream until it's exhausted.
const program = Stream.runForEach(userStream, (user: User) =>
  Effect.log(`Processing user: ${user.name}`)
);

const programWithErrorHandling = program.pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Stream processing error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithErrorHandling);
```

---

---

## Provide Configuration to Your App via a Layer

Provide configuration to your app via a Layer.

### Example

```typescript
import { Effect, Layer } from "effect";

class ServerConfig extends Effect.Service<ServerConfig>()("ServerConfig", {
  sync: () => ({
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  }),
}) {}

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Starting application on port ${config.port}...`);
});

const programWithErrorHandling = Effect.provide(
  program,
  ServerConfig.Default
).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithErrorHandling);
```

**Explanation:**  
This approach makes configuration available contextually, supporting better testing and modularity.

---

## Redact and Handle Sensitive Data

Use Redacted to wrap sensitive values, preventing accidental exposure in logs or error messages.

### Example

```typescript
import { Redacted } from "effect";

// Wrap a sensitive value
const secret = Redacted.make("super-secret-password");

// Use the secret in your application logic
function authenticate(user: string, password: Redacted.Redacted<string>) {
  // ... authentication logic
}

// Logging or stringifying a Redacted value
console.log(`Password: ${secret}`); // Output: Password: <redacted>
console.log(String(secret)); // Output: <redacted>
```

**Explanation:**

- `Redacted.make(value)` wraps a sensitive value.
- When logged or stringified, the value is replaced with `<redacted>`.
- Prevents accidental exposure of secrets in logs or error messages.

---

## Representing Time Spans with Duration

Use Duration to model and manipulate time spans, enabling safe and expressive time-based logic.

### Example

```typescript
import { Duration } from "effect";

// Create durations using helpers
const oneSecond = Duration.seconds(1);
const fiveMinutes = Duration.minutes(5);
const twoHours = Duration.hours(2);

// Add, subtract, and compare durations
const total = Duration.sum(oneSecond, fiveMinutes); // 5 min 1 sec
const isLonger = Duration.greaterThan(twoHours, fiveMinutes); // true

// Convert to milliseconds or ISO string
const ms = Duration.toMillis(fiveMinutes); // 300000
const iso = Duration.formatIso(oneSecond); // "PT1S"
```

**Explanation:**

- `Duration` is immutable and type-safe.
- Use helpers for common intervals and arithmetic for composition.
- Prefer `Duration` over raw numbers for all time-based logic.

---

## Representing Time Spans with Duration

Use the Duration data type to represent time intervals instead of raw numbers.

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
  Effect.timeout(fiveSeconds) // This whole operation must complete within 5 seconds
);

// Durations can also be compared
const isLonger = Duration.greaterThan(fiveSeconds, oneHundredMillis); // true

// Demonstrate the duration functionality
const demonstration = Effect.gen(function* () {
  yield* Effect.logInfo("=== Duration Demonstration ===");

  // Show duration values
  yield* Effect.logInfo(`Five seconds: ${Duration.toMillis(fiveSeconds)}ms`);
  yield* Effect.logInfo(
    `One hundred millis: ${Duration.toMillis(oneHundredMillis)}ms`
  );

  // Show comparison
  yield* Effect.logInfo(`Is 5 seconds longer than 100ms? ${isLonger}`);

  // Run the timed program
  yield* Effect.logInfo("Running timed program...");
  yield* program;

  // Show more duration operations
  const combined = Duration.sum(fiveSeconds, oneHundredMillis);
  yield* Effect.logInfo(`Combined duration: ${Duration.toMillis(combined)}ms`);

  // Show different duration units
  const oneMinute = Duration.minutes(1);
  yield* Effect.logInfo(`One minute: ${Duration.toMillis(oneMinute)}ms`);

  const isMinuteLonger = Duration.greaterThan(oneMinute, fiveSeconds);
  yield* Effect.logInfo(`Is 1 minute longer than 5 seconds? ${isMinuteLonger}`);
});

Effect.runPromise(demonstration);
```

---

---

## Sequencing with andThen, tap, and flatten

Use sequencing combinators to run computations in order, perform side effects, or flatten nested structures, while preserving error and context handling.

### Example

```typescript
import { Effect, Stream, Option, Either } from "effect";

// andThen: Run one effect, then another, ignore the first result
const logThenCompute = Effect.log("Starting...").pipe(
  Effect.andThen(Effect.succeed(42))
); // Effect<number>

// tap: Log the result of an effect, but keep the value
const computeAndLog = Effect.succeed(42).pipe(
  Effect.tap((n) => Effect.log(`Result is ${n}`))
); // Effect<number>

// flatten: Remove one level of nesting
const nestedOption = Option.some(Option.some(1));
const flatOption = Option.flatten(nestedOption); // Option<number>

const nestedEffect = Effect.succeed(Effect.succeed(1));
const flatEffect = Effect.flatten(nestedEffect); // Effect<number>

// tapError: Log errors without handling them
const mightFail = Effect.fail("fail!").pipe(
  Effect.tapError((err) => Effect.logError(`Error: ${err}`))
); // Effect<never>

// Stream: tap for side effects on each element
const stream = Stream.fromIterable([1, 2, 3]).pipe(
  Stream.tap((n) => Effect.log(`Saw: ${n}`))
); // Stream<number>
```

**Explanation:**

- `andThen` is for sequencing when you don’t care about the first result.
- `tap` is for running side effects (like logging) without changing the value.
- `flatten` is for removing unnecessary nesting (e.g., `Option<Option<A>>` → `Option<A>`).

---

## Solve Promise Problems with Effect

Recognize that Effect solves the core limitations of Promises: untyped errors, no dependency injection, and no cancellation.

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

---

## Transform Effect Values with map and flatMap

Transform Effect values with map and flatMap.

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
  yield* Effect.log("=== Transform Effect Values Demo ===");

  // 1. Basic transformation with map
  yield* Effect.log("\n1. Transform with map:");
  const userWithUpperName = yield* getUser(123).pipe(
    Effect.map((user) => ({ ...user, name: user.name.toUpperCase() }))
  );
  yield* Effect.log("Transformed user:", userWithUpperName);

  // 2. Chain effects with flatMap
  yield* Effect.log("\n2. Chain effects with flatMap:");
  const posts = yield* userPosts;
  yield* Effect.log("User posts:", posts);

  // 3. Transform and combine multiple effects
  yield* Effect.log("\n3. Transform and combine multiple effects:");
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
  yield* Effect.log("User with posts:", userWithPosts);

  // 4. Transform with tap for side effects
  yield* Effect.log("\n4. Transform with tap for side effects:");
  const result = yield* getUser(789).pipe(
    Effect.tap((user) => Effect.log(`Processing user: ${user.name}`)),
    Effect.map((user) => `Hello, ${user.name}!`)
  );
  yield* Effect.log("Final result:", result);

  yield* Effect.log("\n✅ All transformations completed successfully!");
});

Effect.runPromise(program);
```

**Explanation:**  
Use `flatMap` to chain effects that depend on each other, and `map` for
simple value transformations.

---

## Transforming Values with map

Use map to apply a pure function to the value inside an Effect, Stream, Option, or Either.

### Example

```typescript
import { Effect, Stream, Option, Either } from "effect";

// Effect: Transform the result of an effect
const effect = Effect.succeed(2).pipe(Effect.map((n) => n * 10)); // Effect<number>

// Option: Transform an optional value
const option = Option.some(2).pipe(Option.map((n) => n * 10)); // Option<number>

// Either: Transform a value that may be an error
const either = Either.right(2).pipe(Either.map((n) => n * 10)); // Either<never, number>

// Stream: Transform every value in a stream
const stream = Stream.fromIterable([1, 2, 3]).pipe(Stream.map((n) => n * 10)); // Stream<number>
```

**Explanation:**  
No matter which type you use, `map` lets you apply a function to the value inside, without changing the error or context.

---

## Type Classes for Equality, Ordering, and Hashing with Data.Class

Use Data.Class to define and derive type classes for your data types, supporting composable equality, ordering, and hashing.

### Example

```typescript
import { Data, Equal, HashSet } from "effect";

// Define custom data types with structural equality
const user1 = Data.struct({ id: 1, name: "Alice" });
const user2 = Data.struct({ id: 1, name: "Alice" });
const user3 = Data.struct({ id: 2, name: "Bob" });

// Data.struct provides automatic structural equality
console.log(Equal.equals(user1, user2)); // true (same structure)
console.log(Equal.equals(user1, user3)); // false (different values)

// Use in a HashSet (works because Data.struct implements Equal)
const set = HashSet.make(user1);
console.log(HashSet.has(set, user2)); // true (structural equality)

// Create an array and use structural equality
const users = [user1, user3];
console.log(users.some((u) => Equal.equals(u, user2))); // true
```

**Explanation:**

- `Data.Class.getEqual` derives an equality type class for your data type.
- `Data.Class.getOrder` derives an ordering type class, useful for sorting.
- `Data.Class.getHash` derives a hash function for use in sets and maps.
- These type classes make your types fully compatible with Effect’s collections and algorithms.

---

## Understand Layers for Dependency Injection

Understand that a Layer is a blueprint describing how to construct a service and its dependencies.

### Example

Here, we define a `Notifier` service that requires a `Logger` to be built. The `NotifierLive` layer's type signature, `Layer<Logger, never, Notifier>`, clearly documents this dependency.

```typescript
import { Effect } from "effect";

// Define the Logger service with a default implementation
export class Logger extends Effect.Service<Logger>()("Logger", {
  // Provide a synchronous implementation
  sync: () => ({
    log: (msg: string) => Effect.log(`LOG: ${msg}`),
  }),
}) {}

// Define the Notifier service that depends on Logger
export class Notifier extends Effect.Service<Notifier>()("Notifier", {
  // Provide an implementation that requires Logger
  effect: Effect.gen(function* () {
    const logger = yield* Logger;
    return {
      notify: (msg: string) => logger.log(`Notifying: ${msg}`),
    };
  }),
  // Specify dependencies
  dependencies: [Logger.Default],
}) {}

// Create a program that uses both services
const program = Effect.gen(function* () {
  const notifier = yield* Notifier;
  yield* notifier.notify("Hello, World!");
});

// Run the program with the default implementations
Effect.runPromise(Effect.provide(program, Notifier.Default));
```

---

---

## Understand that Effects are Lazy Blueprints

Understand that effects are lazy blueprints.

### Example

```typescript
import { Effect } from "effect";

Effect.runSync(Effect.log("1. Defining the Effect blueprint..."));

const program = Effect.gen(function* () {
  yield* Effect.log("3. The blueprint is now being executed!");
  return 42;
});

const demonstrationProgram = Effect.gen(function* () {
  yield* Effect.log(
    "2. The blueprint has been defined. No work has been done yet."
  );
  yield* program;
});

Effect.runSync(demonstrationProgram);
```

**Explanation:**  
Defining an `Effect` does not execute any code inside it. Only when you call
`Effect.runSync(program)` does the computation actually happen.

---

## Understand the Three Effect Channels (A, E, R)

Understand that an Effect&lt;A, E, R&gt; describes a computation with a success type (A), an error type (E), and a requirements type (R).

### Example

This function signature is a self-documenting contract. It clearly states that to get a `User`, you must provide a `Database` service, and the operation might fail with a `UserNotFoundError`.

```typescript
import { Effect, Data } from "effect";

// Define the types for our channels
interface User {
  readonly name: string;
} // The 'A' type
class UserNotFoundError extends Data.TaggedError("UserNotFoundError") {} // The 'E' type

// Define the Database service using Effect.Service
export class Database extends Effect.Service<Database>()("Database", {
  // Provide a default implementation
  sync: () => ({
    findUser: (id: number) =>
      id === 1
        ? Effect.succeed({ name: "Paul" })
        : Effect.fail(new UserNotFoundError()),
  }),
}) {}

// This function's signature shows all three channels
const getUser = (
  id: number
): Effect.Effect<User, UserNotFoundError, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.findUser(id);
  });

// The program will use the default implementation
const program = getUser(1);

// Run the program with the default implementation
const programWithLogging = Effect.gen(function* () {
  const result = yield* Effect.provide(program, Database.Default);
  yield* Effect.log(`Result: ${JSON.stringify(result)}`); // { name: 'Paul' }
  return result;
});

Effect.runPromise(programWithLogging);
```

---

---

## Use .pipe for Composition

Use .pipe for composition.

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
  yield* Effect.log("=== Using Pipe for Composition Demo ===");

  // 1. Basic pipe composition
  yield* Effect.log("\n1. Basic pipe composition:");
  yield* program;

  // 2. Complex pipe composition with multiple transformations
  yield* Effect.log("\n2. Complex pipe composition:");
  const complexResult = yield* Effect.succeed(10).pipe(
    Effect.map((n) => n + 5),
    Effect.map((n) => n * 2),
    Effect.tap((n) => Effect.log(`Intermediate result: ${n}`)),
    Effect.map((n) => n.toString()),
    Effect.map((s) => `Final: ${s}`)
  );
  yield* Effect.log("Complex result: " + complexResult);

  // 3. Pipe with flatMap for chaining effects
  yield* Effect.log("\n3. Pipe with flatMap for chaining effects:");
  const chainedResult = yield* Effect.succeed("hello").pipe(
    Effect.map((s) => s.toUpperCase()),
    Effect.flatMap((s) => Effect.succeed(`${s} WORLD`)),
    Effect.flatMap((s) => Effect.succeed(`${s}!`)),
    Effect.tap((s) => Effect.log(`Chained: ${s}`))
  );
  yield* Effect.log("Chained result: " + chainedResult);

  // 4. Pipe with error handling
  yield* Effect.log("\n4. Pipe with error handling:");
  const errorHandledResult = yield* Effect.succeed(-1).pipe(
    Effect.flatMap((n) =>
      n > 0 ? Effect.succeed(n) : Effect.fail(new Error("Negative number"))
    ),
    Effect.catchAll((error) =>
      Effect.succeed("Handled error: " + error.message)
    ),
    Effect.tap((result) => Effect.log(`Error handled: ${result}`))
  );
  yield* Effect.log("Error handled result: " + errorHandledResult);

  // 5. Pipe with multiple operations
  yield* Effect.log("\n5. Pipe with multiple operations:");
  const multiOpResult = yield* Effect.succeed([1, 2, 3, 4, 5]).pipe(
    Effect.map((arr) => arr.filter((n) => n % 2 === 0)),
    Effect.map((arr) => arr.map((n) => n * 2)),
    Effect.map((arr) => arr.reduce((sum, n) => sum + n, 0)),
    Effect.tap((sum) => Effect.log(`Sum of even numbers doubled: ${sum}`))
  );
  yield* Effect.log("Multi-operation result: " + multiOpResult);

  yield* Effect.log("\n✅ Pipe composition demonstration completed!");
});

Effect.runPromise(demo);
```

**Explanation:**  
Using `.pipe()` allows you to compose operations in a top-to-bottom style,
improving readability and maintainability.

---

## Use Chunk for High-Performance Collections

Use Chunk to model immutable, high-performance collections for efficient data processing and transformation.

### Example

```typescript
import { Chunk } from "effect";

// Create a Chunk from an array
const numbers = Chunk.fromIterable([1, 2, 3, 4]); // Chunk<number>

// Map and filter over a Chunk
const doubled = Chunk.map(numbers, (n) => n * 2); // Chunk<number>
const evens = Chunk.filter(numbers, (n) => n % 2 === 0); // Chunk<number>

// Concatenate Chunks
const moreNumbers = Chunk.fromIterable([5, 6]);
const allNumbers = Chunk.appendAll(numbers, moreNumbers); // Chunk<number>

// Convert back to array
const arr = Chunk.toArray(allNumbers); // number[]
```

**Explanation:**

- `Chunk` is immutable and optimized for performance.
- It supports efficient batch operations, concatenation, and transformation.
- Use `Chunk` in data pipelines, streaming, and concurrent scenarios.

---

## Use Chunk for High-Performance Collections

Prefer Chunk over Array for immutable collection operations within data processing pipelines for better performance.

### Example

This example shows how to create and manipulate a `Chunk`. The API is very similar to `Array`, but the underlying performance characteristics for these immutable operations are superior.

```typescript
import { Chunk, Effect } from "effect";

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

Effect.runSync(Effect.log(finalArray)); // [0, 1, 2]
```

---

---

## Work with Arbitrary-Precision Numbers using BigDecimal

Use BigDecimal to represent and compute with decimal numbers that require arbitrary precision, such as in finance or scientific domains.

### Example

```typescript
import { BigDecimal } from "effect";

// Create BigDecimal values
const a = BigDecimal.fromNumber(0.1);
const b = BigDecimal.fromNumber(0.2);

// Add, subtract, multiply, divide
const sum = BigDecimal.sum(a, b); // BigDecimal(0.3)
const product = BigDecimal.multiply(a, b); // BigDecimal(0.02)

// Compare values
const isEqual = BigDecimal.equals(sum, BigDecimal.fromNumber(0.3)); // true

// Convert to string or number
const asString = BigDecimal.format(BigDecimal.normalize(sum)); // "0.3"
const asNumber = BigDecimal.unsafeToNumber(sum); // 0.3
```

**Explanation:**

- `BigDecimal` is immutable and supports precise decimal arithmetic.
- Use it for domains where rounding errors are unacceptable (e.g., finance, billing, scientific data).
- Avoids the pitfalls of floating-point math in JavaScript.

---

## Work with Dates and Times using DateTime

Use DateTime to represent and manipulate dates and times in a type-safe, immutable, and time-zone-aware way.

### Example

```typescript
import { DateTime } from "effect";

// Create a DateTime for the current instant (returns an Effect)
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const now = yield* DateTime.now; // DateTime.Utc

  // Parse from ISO string
  const parsed = DateTime.unsafeMakeZoned("2024-07-19T12:34:56Z"); // DateTime.Zoned

  // Add or subtract durations
  const inOneHour = DateTime.add(now, { hours: 1 });
  const oneHourAgo = DateTime.subtract(now, { hours: 1 });

  // Format as ISO string
  const iso = DateTime.formatIso(now); // e.g., "2024-07-19T23:33:19.000Z"

  // Compare DateTimes
  const isBefore = DateTime.lessThan(oneHourAgo, now); // true

  return { now, inOneHour, oneHourAgo, iso, isBefore };
});
```

**Explanation:**

- `DateTime` is immutable and time-zone-aware.
- Supports parsing, formatting, arithmetic, and comparison.
- Use for all date/time logic to avoid bugs with native `Date`.

---

## Work with Immutable Sets using HashSet

Use HashSet to represent sets of unique values with efficient, immutable operations for membership, union, intersection, and difference.

### Example

```typescript
import { HashSet } from "effect";

// Create a HashSet from an array
const setA = HashSet.fromIterable([1, 2, 3]);
const setB = HashSet.fromIterable([3, 4, 5]);

// Membership check
const hasTwo = HashSet.has(setA, 2); // true

// Union, intersection, difference
const union = HashSet.union(setA, setB); // HashSet {1, 2, 3, 4, 5}
const intersection = HashSet.intersection(setA, setB); // HashSet {3}
const difference = HashSet.difference(setA, setB); // HashSet {1, 2}

// Add and remove elements
const withSix = HashSet.add(setA, 6); // HashSet {1, 2, 3, 6}
const withoutOne = HashSet.remove(setA, 1); // HashSet {2, 3}
```

**Explanation:**

- `HashSet` is immutable and supports efficient set operations.
- Use it for membership checks, set algebra, and modeling unique collections.
- Safe for concurrent and functional workflows.

---

## Working with Immutable Arrays using Data.array

Use Data.array to define arrays whose equality is based on their contents, enabling safe, predictable comparisons and functional operations.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal arrays
const arr1 = Data.array([1, 2, 3]);
const arr2 = Data.array([1, 2, 3]);

// Compare by value, not reference
const areEqual = Equal.equals(arr1, arr2); // true

// Use arrays as keys in a HashSet or Map
import { HashSet } from "effect";
const set = HashSet.make(arr1);
console.log(HashSet.has(set, arr2)); // true

// Functional operations (map, filter, etc.)
const doubled = arr1.map((n) => n * 2); // Data.array([2, 4, 6])
```

**Explanation:**

- `Data.array` creates immutable arrays with value-based equality.
- Useful for modeling ordered collections in a safe, functional way.
- Supports all standard array operations, but with immutability and structural equality.

---

## Working with Tuples using Data.tuple

Use Data.tuple to define tuples whose equality is based on their contents, enabling safe and predictable comparisons and pattern matching.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal tuples
const t1 = Data.tuple(1, "Alice");
const t2 = Data.tuple(1, "Alice");

// Compare by value, not reference
const areEqual = Equal.equals(t1, t2); // true

// Use tuples as keys in a HashSet or Map
import { HashSet } from "effect";
const set = HashSet.make(t1);
console.log(HashSet.has(set, t2)); // true

// Pattern matching on tuples
const [id, name] = t1; // id: number, name: string
```

**Explanation:**

- `Data.tuple` creates immutable tuples with value-based equality.
- Useful for modeling pairs, coordinates, or any fixed-size, heterogeneous data.
- Supports safe pattern matching and collection operations.

---

## Wrap Asynchronous Computations with tryPromise

Wrap asynchronous computations with tryPromise.

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

---

## Wrap Synchronous Computations with sync and try

Wrap synchronous computations with sync and try.

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
  Effect.gen(function* () {
    yield* Effect.log(`Processing string: "${str}"`);
    return str.toUpperCase().split("").reverse().join("");
  });

// Demonstrate wrapping synchronous computations
const program = Effect.gen(function* () {
  yield* Effect.log("=== Wrapping Synchronous Computations Demo ===");

  // Example 1: Basic sync computation
  yield* Effect.log("\n1. Basic sync computation (random number):");
  const random1 = yield* randomNumber;
  const random2 = yield* randomNumber;
  yield* Effect.log(
    `Random numbers: ${random1.toFixed(4)}, ${random2.toFixed(4)}`
  );

  // Example 2: Successful JSON parsing
  yield* Effect.log("\n2. Successful JSON parsing:");
  const validJson = '{"name": "Paul", "age": 30}';
  const parsed = yield* parseJson(validJson);
  yield* Effect.log("Parsed JSON:" + JSON.stringify(parsed));

  // Example 3: Failed JSON parsing with error logging
  yield* Effect.log("\n3. Failed JSON parsing with error logging:");
  const invalidJson = '{"name": "Paul", "age":}';
  yield* parseJson(invalidJson).pipe(
    Effect.tapError((error) => Effect.log(`Parsing failed: ${error.message}`)),
    Effect.catchAll(() => Effect.succeed({ name: "default", age: 0 }))
  );
  yield* Effect.log("Continued after error (with recovery)");

  // Example 4: Division with error logging and recovery
  yield* Effect.log("\n4. Division with error logging and recovery:");
  const division1 = yield* divide(10, 2);
  yield* Effect.log(`10 / 2 = ${division1}`);

  // Use tapError to log, then catchAll to recover
  const division2 = yield* divide(10, 0).pipe(
    Effect.tapError((error) => Effect.log(`Division error: ${error.message}`)),
    Effect.catchAll(() => Effect.succeed(-1))
  );
  yield* Effect.log(`10 / 0 = ${division2} (error handled)`);

  // Example 5: String processing
  yield* Effect.log("\n5. String processing:");
  const processed = yield* processString("Hello Effect");
  yield* Effect.log(`Processed result: "${processed}"`);

  // Example 6: Combining multiple sync operations
  yield* Effect.log("\n6. Combining multiple sync operations:");
  const combined = yield* Effect.gen(function* () {
    const num = yield* randomNumber;
    const multiplied = yield* Effect.sync(() => num * 100);
    const rounded = yield* Effect.sync(() => Math.round(multiplied));
    return rounded;
  });
  yield* Effect.log(`Combined operations result: ${combined}`);

  yield* Effect.log("\n✅ Synchronous computations demonstration completed!");
});

Effect.runPromise(program);
```

**Explanation:**  
Use `Effect.sync` for safe synchronous code, and `Effect.try` to safely
handle exceptions from potentially unsafe code.

---

## Wrapping Synchronous and Asynchronous Computations

Use try and tryPromise to lift code that may throw or reject into Effect, capturing errors in the failure channel.

### Example

```typescript
import { Effect } from "effect";

// Synchronous: Wrap code that may throw
const effectSync = Effect.try({
  try: () => JSON.parse("{ invalid json }"),
  catch: (error) => `Parse error: ${String(error)}`,
}); // Effect<string, never, never>

// Asynchronous: Wrap a promise that may reject
const effectAsync = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then((res) => res.json()),
  catch: (error) => `Network error: ${String(error)}`,
}); // Effect<string, any, never>
```

**Explanation:**

- `Effect.try` wraps a synchronous computation that may throw, capturing the error in the failure channel.
- `Effect.tryPromise` wraps an async computation (Promise) that may reject, capturing the rejection as a failure.

---

## Write Sequential Code with Effect.gen

Write sequential code with Effect.gen.

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

---

