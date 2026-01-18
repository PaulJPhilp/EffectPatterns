# Effect-TS Patterns - Coding Rules for Claude

This file contains auto-generated coding rules from Effect-TS patterns, followed by project-specific guidance for working in this repository.

---

# Part 1: Effect-TS Pattern Rules

Generated from 226 published patterns. These rules provide best practices for working with Effect-TS.

## 🟢 Beginner Patterns

### Access Environment Variables

**Rule:** Use Effect to access environment variables with proper error handling.

**Use Cases:** platform-getting-started

**Why:**

Environment variables can be missing or malformed. Effect helps you:

1. **Handle missing vars** - Return `Option` or fail with typed error
2. **Validate values** - Parse and validate with Schema
3. **Provide defaults** - Fallback values when vars are missing
4. **Document requirements** - Types show what's needed

---

**Good Example:**

```typescript
import { Effect, Config, Option } from "effect"

// ============================================
// BASIC: Read required variable
// ============================================

const getApiKey = Config.string("API_KEY")

const program1 = Effect.gen(function* () {
  const apiKey = yield* getApiKey
  yield* Effect.log(`API Key: ${apiKey.slice(0, 4)}...`)
})

// ============================================
// OPTIONAL: With default value
// ============================================

const getPort = Config.number("PORT").pipe(
  Config.withDefault(3000)
)

const program2 = Effect.gen(function* () {
  const port = yield* getPort
  yield* Effect.log(`Server will run on port ${port}`)
})

// ============================================
// OPTIONAL: Return Option instead of failing
// ============================================

const getOptionalFeature = Config.string("FEATURE_FLAG").pipe(
  Config.option
)

const program3 = Effect.gen(function* () {
  const feature = yield* getOptionalFeature
  
  if (Option.isSome(feature)) {
    yield* Effect.log(`Feature enabled: ${feature.value}`)
  } else {
    yield* Effect.log("Feature flag not set")
  }
})

// ============================================
// COMBINED: Multiple variables as config object
// ============================================

const AppConfig = Config.all({
  apiKey: Config.string("API_KEY"),
  apiUrl: Config.string("API_URL"),
  port: Config.number("PORT").pipe(Config.withDefault(3000)),
  debug: Config.boolean("DEBUG").pipe(Config.withDefault(false)),
})

const program4 = Effect.gen(function* () {
  const config = yield* AppConfig
  
  yield* Effect.log(`API URL: ${config.apiUrl}`)
  yield* Effect.log(`Port: ${config.port}`)
  yield* Effect.log(`Debug: ${config.debug}`)
})

// ============================================
// RUN: Will fail if required vars missing
// ============================================

Effect.runPromise(program4).catch((error) => {
  console.error("Missing required environment variables")
  console.error(error)
})
```

---

### Accumulate Multiple Errors with Either

**Rule:** Use Either to model computations that may fail, making errors explicit and type-safe.

**Use Cases:** core-concepts

**Why:**

`Either` is a foundational data type for error handling in functional programming.  
It allows you to accumulate errors, model domain-specific failures, and avoid exceptions and unchecked errors.

**Good Example:**

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

**Anti-Pattern:**

Throwing exceptions or using ad-hoc error codes, which are not type-safe, not composable, and make error handling less predictable.

---

### Chaining Computations with flatMap

**Rule:** Use flatMap to sequence computations, flattening nested structures and preserving error and context handling.

**Use Cases:** core-concepts

**Why:**

`flatMap` is the key to sequencing dependent steps in functional programming.  
It allows you to express workflows where each step may fail, be optional, or produce multiple results, and ensures that errors and context are handled automatically.

**Good Example:**

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

**Anti-Pattern:**

Manually unwrapping the value (e.g., with `.getOrElse`, `.unsafeRunSync`, etc.), then creating a new effect/option/either/stream.  
This breaks composability, loses error/context handling, and leads to deeply nested or unsafe code.

---

### Checking Option and Either Cases

**Rule:** Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe conditional logic.

**Use Cases:** error-management

**Why:**

These predicates provide a concise, type-safe way to check which case you have, without resorting to manual property checks or unsafe type assertions.

**Good Example:**

```typescript
import { Option, Either } from "effect";

// Option: Check if value is Some or None
const option = Option.some(42);

if (Option.isSome(option)) {
  // option.value is available here
  console.log("We have a value:", option.value);
} else if (Option.isNone(option)) {
  console.log("No value present");
}

// Either: Check if value is Right or Left
const either = Either.left("error");

if (Either.isRight(either)) {
  // either.right is available here
  console.log("Success:", either.right);
} else if (Either.isLeft(either)) {
  // either.left is available here
  console.log("Failure:", either.left);
}

// Filtering a collection of Options
const options = [Option.some(1), Option.none(), Option.some(3)];
const presentValues = options.filter(Option.isSome).map((o) => o.value); // [1, 3]
```

**Explanation:**

- `Option.isSome` and `Option.isNone` let you check for presence or absence.
- `Either.isRight` and `Either.isLeft` let you check for success or failure.
- These are especially useful for filtering or quick conditional logic.

**Anti-Pattern:**

Manually checking internal tags or properties (e.g., `option._tag === "Some"`), or using unsafe type assertions, which is less safe and less readable than using the provided predicates.

---

### Collect All Results into a List

**Rule:** Use Stream.runCollect to execute a stream and collect all its emitted values into a Chunk.

**Use Cases:** building-data-pipelines

**Why:**

A "sink" is a terminal operator that consumes a stream and produces a final `Effect`. `Stream.runCollect` is the most fundamental sink. It provides the bridge from the lazy, pull-based world of `Stream` back to the familiar world of a single `Effect` that resolves with a standard data structure.

Using `Stream.runCollect` is essential when:

1.  **You Need the Final Result**: The goal of your pipeline is to produce a complete list of transformed items that you need to use in a subsequent step (e.g., to return as a single JSON array from an API).
2.  **Simplicity is Key**: It's the most straightforward way to "run" a stream and see its output. It declaratively states your intent: "execute this entire pipeline and give me all the results."
3.  **The Dataset is Bounded**: It's designed for streams where the total number of items is known to be finite and small enough to fit comfortably in memory.

The result of `Stream.runCollect` is an `Effect` that, when executed, yields a `Chunk` containing all the items emitted by the stream.

---

**Good Example:**

This example creates a stream of numbers, filters for only the even ones, transforms them into strings, and then uses `runCollect` to gather the final results into a `Chunk`.

```typescript
import { Effect, Stream, Chunk } from "effect";

const program = Stream.range(1, 10).pipe(
  // Find all the even numbers
  Stream.filter((n) => n % 2 === 0),
  // Transform them into strings
  Stream.map((n) => `Even number: ${n}`),
  // Run the stream and collect the results
  Stream.runCollect
);

const programWithLogging = Effect.gen(function* () {
  const results = yield* program;
  yield* Effect.log(
    `Collected results: ${JSON.stringify(Chunk.toArray(results))}`
  );
  return results;
});

Effect.runPromise(programWithLogging);
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

**Anti-Pattern:**

The anti-pattern is using `Stream.runCollect` on a stream that produces an unbounded or extremely large number of items. This will inevitably lead to an out-of-memory error.

```typescript
import { Effect, Stream } from "effect";

// An infinite stream of numbers
const infiniteStream = Stream.range(1, Infinity);

const program = infiniteStream.pipe(
  // This will run forever, attempting to buffer an infinite number of items.
  Stream.runCollect
);

// This program will never finish and will eventually crash the process
// by consuming all available memory.
// Effect.runPromise(program);
console.log(
  "This code is commented out because it would cause an out-of-memory crash."
);
```

This is a critical mistake because `runCollect` must hold every single item emitted by the stream in memory simultaneously. For pipelines that process huge files, infinite data sources, or are designed to run forever, `runCollect` is the wrong tool. In those cases, you should use a sink like `Stream.runDrain`, which processes items without collecting them.

---

### Combining Values with zip

**Rule:** Use zip to run two computations and combine their results into a tuple, preserving error and context handling.

**Use Cases:** core-concepts

**Why:**

`zip` lets you compose computations that are independent but whose results you want to use together.  
It preserves error handling and context, and keeps your code declarative and type-safe.

**Good Example:**

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

**Anti-Pattern:**

Manually running two computations, extracting their results, and pairing them outside the combinator world.  
This breaks composability, loses error/context handling, and can lead to subtle bugs.

---

### Comparing Data by Value with Data.struct

**Rule:** Use Data.struct to define objects whose equality is based on their contents, enabling safe and predictable comparisons.

**Use Cases:** core-concepts

**Why:**

JavaScript objects are compared by reference, which can lead to subtle bugs when modeling value objects.  
`Data.struct` ensures that two objects with the same contents are considered equal, supporting value-based logic and collections.

**Good Example:**

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

**Anti-Pattern:**

Using plain JavaScript objects for value-based logic, which compares by reference and can lead to incorrect equality checks and collection behavior.

---

### Comparing Data by Value with Structural Equality

**Rule:** Use Data.struct or implement the Equal interface for value-based comparison of objects and classes.

**Use Cases:** core-concepts

**Why:**

In JavaScript, comparing two non-primitive values with `===` checks for _referential equality_. It only returns `true` if they are the exact same instance in memory. This means two objects with identical contents are not considered equal, which is a common source of bugs.

```typescript
{ a: 1 } === { a: 1 } // false!
```

Effect solves this with **structural equality**. All of Effect's built-in data structures (`Option`, `Either`, `Chunk`, etc.) can be compared by their structure and values. By using helpers like `Data.struct`, you can easily give your own data structures this same powerful and predictable behavior.

---

**Good Example:**

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

**Anti-Pattern:**

Relying on `===` for object or array comparison. This will lead to bugs when you expect two objects with the same values to be treated as equal, especially when working with data in collections, `Ref`s, or `Effect`'s success values.

```typescript
// ❌ WRONG: This will not behave as expected.
const user1 = { id: 1, name: "Paul" };
const user2 = { id: 1, name: "Paul" };

if (user1 === user2) {
  // This code block will never be reached.
  console.log("Users are the same.");
}

// Another common pitfall
const selectedUsers = [user1];
// This check will fail, even though a user with id 1 is in the array.
if (selectedUsers.includes({ id: 1, name: "Paul" })) {
  // ...
}
```

---

### Conditional Branching with if, when, and cond

**Rule:** Use combinators such as if, when, and cond to branch computations based on runtime conditions, without imperative if statements.

**Use Cases:** core-concepts

**Why:**

Declarative branching keeps your code composable, testable, and easy to reason about.  
It also ensures that error handling and context propagation are preserved, and that your code remains consistent across different Effect types.

**Good Example:**

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

**Anti-Pattern:**

Using imperative `if` statements to decide which effect, option, either, or stream to return, breaking composability and making error/context handling less predictable.

---

### Converting from Nullable, Option, or Either

**Rule:** Use fromNullable, fromOption, and fromEither to lift nullable values, Option, or Either into Effects or Streams for safe, typeful interop.

**Use Cases:** core-concepts

**Why:**

Converting to Effect, Stream, Option, or Either lets you use all the combinators, error handling, and resource safety of the Effect ecosystem, while avoiding the pitfalls of `null` and `undefined`.

**Good Example:**

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

**Anti-Pattern:**

Passing around `null`, `undefined`, or custom option/either types without converting them, which leads to unsafe, non-composable code and harder error handling.

---

### Create a Basic HTTP Server

**Rule:** Use Http.server.serve with a platform-specific layer to run an HTTP application.

**Use Cases:** building-apis

**Why:**

In Effect, an HTTP server is not just a side effect; it's a managed, effectful process. The `@effect/platform` package provides a platform-agnostic API for defining HTTP applications, while packages like `@effect/platform-node` provide the concrete implementation.

The core function `Http.server.serve(app)` takes your application logic and returns an `Effect` that, when run, starts the server. This `Effect` is designed to run indefinitely, only terminating if the server crashes or is gracefully shut down.

This approach provides several key benefits:

1.  **Lifecycle Management**: The server's lifecycle is managed by the Effect runtime. This means structured concurrency applies, ensuring graceful shutdowns and proper resource handling automatically.
2.  **Integration**: The server is a first-class citizen in the Effect ecosystem. It can seamlessly access dependencies provided by `Layer`, use `Config` for configuration, and integrate with `Logger`.
3.  **Platform Agnosticism**: By coding to the `Http.App` interface, your application logic remains portable across different JavaScript runtimes (Node.js, Bun, Deno) by simply swapping out the platform layer.

---

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

---

### Create a Stream from a List

**Rule:** Use Stream.fromIterable to begin a pipeline from an in-memory collection.

**Use Cases:** building-data-pipelines

**Why:**

Every data pipeline needs a source. The simplest and most common source is a pre-existing list of items in memory. `Stream.fromIterable` is the bridge from standard JavaScript data structures to the powerful, composable world of Effect's `Stream`.

This pattern is fundamental for several reasons:

1.  **Entry Point**: It's the "Hello, World!" of data pipelines, providing the easiest way to start experimenting with stream transformations.
2.  **Testing**: In tests, you frequently need to simulate a data source (like a database query or API call). Creating a stream from a mock array of data is the standard way to do this, allowing you to test your pipeline's logic in isolation.
3.  **Composability**: It transforms a static, eager data structure (an array) into a lazy, pull-based stream. This allows you to pipe it into the rest of the Effect ecosystem, enabling asynchronous operations, concurrency, and resource management in subsequent steps.

---

**Good Example:**

This example takes a simple array of numbers, creates a stream from it, performs a transformation on each number, and then runs the stream to collect the results.

```typescript
import { Effect, Stream, Chunk } from "effect";

const numbers = [1, 2, 3, 4, 5];

// Create a stream from the array of numbers.
const program = Stream.fromIterable(numbers).pipe(
  // Perform a simple, synchronous transformation on each item.
  Stream.map((n) => `Item: ${n}`),
  // Run the stream and collect all the transformed items into a Chunk.
  Stream.runCollect
);

const programWithLogging = Effect.gen(function* () {
  const processedItems = yield* program;
  yield* Effect.log(
    `Processed items: ${JSON.stringify(Chunk.toArray(processedItems))}`
  );
  return processedItems;
});

Effect.runPromise(programWithLogging);
/*
Output:
[ 'Item: 1', 'Item: 2', 'Item: 3', 'Item: 4', 'Item: 5' ]
*/
```

**Anti-Pattern:**

The common alternative is to use standard array methods like `.map()` or a `for...of` loop. While perfectly fine for simple, synchronous tasks, this approach is an anti-pattern when building a _pipeline_.

```typescript
const numbers = [1, 2, 3, 4, 5];

// Using Array.prototype.map
const processedItems = numbers.map((n) => `Item: ${n}`);

console.log(processedItems);
```

This is an anti-pattern in the context of building a larger pipeline because:

1.  **It's Not Composable with Effects**: The result is just a new array. If the next step in your pipeline was an asynchronous database call for each item, you couldn't simply `.pipe()` the result into it. You would have to leave the synchronous world of `.map()` and start a new `Effect.forEach`, breaking the unified pipeline structure.
2.  **It's Eager**: The `.map()` operation processes the entire array at once. `Stream` is lazy; it only processes items as they are requested by downstream consumers, which is far more efficient for large collections or complex transformations.

---

### Create Pre-resolved Effects with succeed and fail

**Rule:** Create pre-resolved effects with succeed and fail.

**Use Cases:** core-concepts

**Why:**

These are the simplest effect constructors, essential for returning static
values within functions that must return an `Effect`.

**Good Example:**

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

**Anti-Pattern:**

Do not wrap a static value in `Effect.sync`. While it works, `Effect.succeed`
is more descriptive and direct for values that are already available.

---

### Create Type-Safe Errors

**Rule:** Use Data.TaggedError to create typed, distinguishable errors for your domain.

**Use Cases:** domain-modeling

**Why:**

Plain `Error` or string messages cause problems:

1. **No type safety** - Can't know what errors a function might throw
2. **Hard to handle** - Matching on error messages is fragile
3. **Poor documentation** - Errors aren't part of the function signature

Tagged errors solve this by making errors typed and distinguishable.

---

**Good Example:**

```typescript
import { Effect, Data } from "effect"

// ============================================
// 1. Define tagged errors for your domain
// ============================================

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

class InvalidEmailError extends Data.TaggedError("InvalidEmailError")<{
  readonly email: string
  readonly reason: string
}> {}

class DuplicateUserError extends Data.TaggedError("DuplicateUserError")<{
  readonly email: string
}> {}

// ============================================
// 2. Use in Effect functions
// ============================================

interface User {
  id: string
  email: string
  name: string
}

const validateEmail = (email: string): Effect.Effect<string, InvalidEmailError> => {
  if (!email.includes("@")) {
    return Effect.fail(new InvalidEmailError({
      email,
      reason: "Missing @ symbol"
    }))
  }
  return Effect.succeed(email)
}

const findUser = (id: string): Effect.Effect<User, UserNotFoundError> => {
  // Simulate database lookup
  if (id === "123") {
    return Effect.succeed({ id, email: "alice@example.com", name: "Alice" })
  }
  return Effect.fail(new UserNotFoundError({ userId: id }))
}

const createUser = (
  email: string,
  name: string
): Effect.Effect<User, InvalidEmailError | DuplicateUserError> =>
  Effect.gen(function* () {
    const validEmail = yield* validateEmail(email)

    // Simulate duplicate check
    if (validEmail === "taken@example.com") {
      return yield* Effect.fail(new DuplicateUserError({ email: validEmail }))
    }

    return {
      id: crypto.randomUUID(),
      email: validEmail,
      name,
    }
  })

// ============================================
// 3. Handle errors by tag
// ============================================

const program = createUser("alice@example.com", "Alice").pipe(
  Effect.catchTag("InvalidEmailError", (error) =>
    Effect.succeed({
      id: "fallback",
      email: "default@example.com",
      name: `${error.email} was invalid: ${error.reason}`,
    })
  ),
  Effect.catchTag("DuplicateUserError", (error) =>
    Effect.fail(new Error(`Email ${error.email} already registered`))
  )
)

// ============================================
// 4. Match on all errors
// ============================================

const handleAllErrors = createUser("bad-email", "Bob").pipe(
  Effect.catchTags({
    InvalidEmailError: (e) => Effect.succeed(`Invalid: ${e.reason}`),
    DuplicateUserError: (e) => Effect.succeed(`Duplicate: ${e.email}`),
  })
)

// ============================================
// 5. Run and see results
// ============================================

Effect.runPromise(program)
  .then((user) => console.log("Created:", user))
  .catch((error) => console.error("Failed:", error))
```

---

### Creating from Collections

**Rule:** Use fromIterable and fromArray to lift collections into Streams or Effects for batch or streaming processing.

**Use Cases:** core-concepts

**Why:**

Lifting collections into Streams or Effects allows you to process data in a composable, resource-safe, and potentially concurrent way.  
It also enables you to use all of Effect's combinators for transformation, filtering, and error handling.

**Good Example:**

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

**Anti-Pattern:**

Manually looping over collections and running effects or streams imperatively, which loses composability, error handling, and resource safety.

---

### Creating from Synchronous and Callback Code

**Rule:** Use sync and async to create Effects from synchronous or callback-based computations, making them composable and type-safe.

**Use Cases:** core-concepts

**Why:**

Many APIs are synchronous or use callbacks instead of Promises.  
By lifting them into Effects, you gain access to all of Effect's combinators, error handling, and resource safety.

**Good Example:**

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

**Anti-Pattern:**

Directly calling synchronous or callback-based APIs inside Effects without lifting them, which can break composability and error handling.

---

### Debug Effect Programs

**Rule:** Use Effect.tap and logging to inspect values without changing program flow.

**Use Cases:** observability

**Why:**

Debugging Effect code differs from imperative code:

1. **No breakpoints** - Effects are descriptions, not executions
2. **Lazy evaluation** - Code runs later when you call `runPromise`
3. **Composition** - Effects chain together

`tap` and logging let you see inside without breaking the chain.

---

**Good Example:**

```typescript
import { Effect, pipe } from "effect"

// ============================================
// 1. Using tap to inspect values
// ============================================

const fetchUser = (id: string) =>
  Effect.succeed({ id, name: "Alice", email: "alice@example.com" })

const processUser = (id: string) =>
  fetchUser(id).pipe(
    // tap runs an effect for its side effect, then continues with original value
    Effect.tap((user) => Effect.log(`Fetched user: ${user.name}`)),
    Effect.map((user) => ({ ...user, processed: true })),
    Effect.tap((user) => Effect.log(`Processed: ${JSON.stringify(user)}`))
  )

// ============================================
// 2. Debug a pipeline
// ============================================

const numbers = [1, 2, 3, 4, 5]

const pipeline = Effect.gen(function* () {
  yield* Effect.log("Starting pipeline")

  const step1 = numbers.filter((n) => n % 2 === 0)
  yield* Effect.log(`After filter (even): ${JSON.stringify(step1)}`)

  const step2 = step1.map((n) => n * 10)
  yield* Effect.log(`After map (*10): ${JSON.stringify(step2)}`)

  const step3 = step2.reduce((a, b) => a + b, 0)
  yield* Effect.log(`After reduce (sum): ${step3}`)

  return step3
})

// ============================================
// 3. Debug errors
// ============================================

const riskyOperation = (shouldFail: boolean) =>
  Effect.gen(function* () {
    yield* Effect.log("Starting risky operation")

    if (shouldFail) {
      yield* Effect.log("About to fail...")
      return yield* Effect.fail(new Error("Something went wrong"))
    }

    yield* Effect.log("Success!")
    return "result"
  })

const debugErrors = riskyOperation(true).pipe(
  // Log when operation fails
  Effect.tapError((error) => Effect.log(`Operation failed: ${error.message}`)),

  // Provide a fallback
  Effect.catchAll((error) => {
    return Effect.succeed(`Recovered from: ${error.message}`)
  })
)

// ============================================
// 4. Trace execution flow
// ============================================

const step = (name: string, value: number) =>
  Effect.gen(function* () {
    yield* Effect.log(`[${name}] Input: ${value}`)
    const result = value * 2
    yield* Effect.log(`[${name}] Output: ${result}`)
    return result
  })

const tracedWorkflow = Effect.gen(function* () {
  const a = yield* step("Step 1", 5)
  const b = yield* step("Step 2", a)
  const c = yield* step("Step 3", b)
  yield* Effect.log(`Final result: ${c}`)
  return c
})

// ============================================
// 5. Quick debug with console
// ============================================

// Sometimes you just need console.log
const quickDebug = Effect.gen(function* () {
  const value = yield* Effect.succeed(42)
  
  // Effect.sync wraps side effects
  yield* Effect.sync(() => console.log("Quick debug:", value))
  
  return value
})

// ============================================
// 6. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Tap Example ===")
  yield* processUser("123")

  yield* Effect.log("\n=== Pipeline Debug ===")
  yield* pipeline

  yield* Effect.log("\n=== Error Debug ===")
  yield* debugErrors

  yield* Effect.log("\n=== Traced Workflow ===")
  yield* tracedWorkflow
})

Effect.runPromise(program)
```

---

### Execute Asynchronous Effects with Effect.runPromise

**Rule:** Execute asynchronous effects with Effect.runPromise.

**Use Cases:** project-setup--execution

**Why:**

`Effect.runPromise` is the bridge from the Effect world to the Promise-based
world of Node.js and browsers. If the Effect succeeds, the Promise resolves;
if it fails, the Promise rejects.

**Good Example:**

```typescript
import { Effect } from "effect";

const program = Effect.succeed("Hello, World!").pipe(Effect.delay("1 second"));

const promise = Effect.runPromise(program);

const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(result); // Logs "Hello, World!" after 1 second.
  return result;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
`Effect.runPromise` executes your effect and returns a Promise, making it
easy to integrate with existing JavaScript async workflows.

**Anti-Pattern:**

Never call `runPromise` inside another `Effect` composition. Effects are
meant to be composed together _before_ being run once at the end.

---

### Execute Synchronous Effects with Effect.runSync

**Rule:** Execute synchronous effects with Effect.runSync.

**Use Cases:** project-setup--execution

**Why:**

`Effect.runSync` is an optimized runner for Effects that don't involve any
asynchronous operations. If the Effect contains any async operations,
`runSync` will throw an error.

**Good Example:**

```typescript
import { Effect } from "effect";

// Simple synchronous program
const program1 = Effect.gen(function* () {
  const n = 10;
  const result = n * 2;
  yield* Effect.log(`Simple program result: ${result}`);
  return result;
});

// Run simple program
Effect.runSync(program1);

// Program with logging
const program2 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting calculation...");
  const n = yield* Effect.sync(() => 10);
  yield* Effect.logInfo(`Got number: ${n}`);
  const result = yield* Effect.sync(() => n * 2);
  yield* Effect.logInfo(`Result: ${result}`);
  return result;
});

// Run with logging
Effect.runSync(program2);

// Program with error handling
const program3 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting division...");
  const n = yield* Effect.sync(() => 10);
  const divisor = yield* Effect.sync(() => 0);

  yield* Effect.logInfo(`Attempting to divide ${n} by ${divisor}...`);
  return yield* Effect.try({
    try: () => {
      if (divisor === 0) throw new Error("Cannot divide by zero");
      return n / divisor;
    },
    catch: (error) => {
      if (error instanceof Error) {
        return error;
      }
      return new Error("Unknown error occurred");
    },
  });
}).pipe(
  Effect.catchAll((error) => Effect.logInfo(`Error occurred: ${error.message}`))
);

// Run with error handling
Effect.runSync(program3);
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

**Anti-Pattern:**

Do not use `runSync` on an Effect that contains asynchronous operations like
`Effect.delay` or `Effect.promise`. This will result in a runtime error.

---

### Extract Path Parameters

**Rule:** Define routes with colon-prefixed parameters (e.g., /users/:id) and access their values within the handler.

**Use Cases:** building-apis

**Why:**

APIs often need to operate on specific resources identified by a unique key in the URL, such as `/products/123` or `/orders/abc`. The `Http.router` provides a clean, declarative way to handle these dynamic paths without resorting to manual string parsing.

By defining parameters directly in the path string, you gain several benefits:

1.  **Declarative**: The route's structure is immediately obvious from its definition. The code clearly states, "this route expects a dynamic segment here."
2.  **Safe and Robust**: The router handles the logic of extracting the parameter. This is less error-prone and more robust than manually splitting or using regular expressions on the URL string.
3.  **Clean Handler Logic**: The business logic inside your handler is separated from the concern of URL parsing. The handler simply receives the parameters it needs to do its job.
4.  **Composability**: This pattern composes perfectly with the rest of the `Http` module, allowing you to build complex and well-structured APIs.

---

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

---

### Filtering Results with filter

**Rule:** Use filter to declaratively express conditional logic, keeping only values that satisfy a predicate.

**Use Cases:** core-concepts

**Why:**

`filter` lets you express "only continue if..." logic without resorting to manual checks or imperative branching.  
It keeps your code composable and type-safe, and ensures that failures or empty results are handled consistently.

**Good Example:**

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

**Anti-Pattern:**

Using `map` with a conditional that returns `Option` or `Either`, then manually flattening, instead of using `filter`.  
This leads to unnecessary complexity and less readable code.

---

### Handle a GET Request

**Rule:** Use Http.router.get to associate a URL path with a specific response Effect.

**Use Cases:** building-apis

**Why:**

A real application needs to respond differently to different URLs. The `Http.router` provides a declarative, type-safe, and composable way to manage this routing logic. Instead of a single handler with complex conditional logic, you define many small, focused handlers and assign them to specific paths and HTTP methods.

This approach has several advantages:

1.  **Declarative and Readable**: Your code clearly expresses the mapping between a URL path and its behavior, making the application's structure easy to understand.
2.  **Composability**: Routers are just values that can be created, combined, and passed around. This makes it easy to organize routes into logical groups (e.g., a `userRoutes` router and a `productRoutes` router) and merge them.
3.  **Type Safety**: The router ensures that the handler for a route is only ever called for a matching request, simplifying the logic within the handler itself.
4.  **Integration**: Each route handler is an `Effect`, meaning it has full access to dependency injection, structured concurrency, and integrated error handling, just like any other part of an Effect application.

---

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

---

### Handle Missing Values with Option

**Rule:** Use Option instead of null/undefined to make missing values explicit and type-safe.

**Use Cases:** domain-modeling

**Why:**

`null` and `undefined` cause bugs because:

1. **Silent failures** - Accessing `.property` on null crashes at runtime
2. **Unclear intent** - Is null "not found" or "error"?
3. **Forgotten checks** - Easy to forget `if (x !== null)`

Option fixes this by making absence explicit and type-checked.

---

**Good Example:**

```typescript
import { Option, Effect } from "effect"

// ============================================
// 1. Creating Options
// ============================================

// Some - a value is present
const hasValue = Option.some(42)

// None - no value
const noValue = Option.none<number>()

// From nullable - null/undefined becomes None
const fromNull = Option.fromNullable(null)        // None
const fromValue = Option.fromNullable("hello")    // Some("hello")

// ============================================
// 2. Checking and extracting values
// ============================================

const maybeUser = Option.some({ name: "Alice", age: 30 })

// Check if value exists
if (Option.isSome(maybeUser)) {
  console.log(`User: ${maybeUser.value.name}`)
}

// Get with default
const name = Option.getOrElse(
  Option.map(maybeUser, u => u.name),
  () => "Anonymous"
)

// ============================================
// 3. Transforming Options
// ============================================

const maybeNumber = Option.some(5)

// Map - transform the value if present
const doubled = Option.map(maybeNumber, n => n * 2)  // Some(10)

// FlatMap - chain operations that return Option
const safeDivide = (a: number, b: number): Option.Option<number> =>
  b === 0 ? Option.none() : Option.some(a / b)

const result = Option.flatMap(maybeNumber, n => safeDivide(10, n))  // Some(2)

// ============================================
// 4. Domain modeling example
// ============================================

interface User {
  readonly id: string
  readonly name: string
  readonly email: Option.Option<string>  // Email is optional
  readonly phone: Option.Option<string>  // Phone is optional
}

const createUser = (name: string): User => ({
  id: crypto.randomUUID(),
  name,
  email: Option.none(),
  phone: Option.none(),
})

const addEmail = (user: User, email: string): User => ({
  ...user,
  email: Option.some(email),
})

const getContactInfo = (user: User): string => {
  const email = Option.getOrElse(user.email, () => "no email")
  const phone = Option.getOrElse(user.phone, () => "no phone")
  return `${user.name}: ${email}, ${phone}`
}

// ============================================
// 5. Use in Effects
// ============================================

const findUser = (id: string): Effect.Effect<Option.Option<User>> =>
  Effect.succeed(
    id === "123"
      ? Option.some({ id, name: "Alice", email: Option.none(), phone: Option.none() })
      : Option.none()
  )

const program = Effect.gen(function* () {
  const maybeUser = yield* findUser("123")

  if (Option.isSome(maybeUser)) {
    yield* Effect.log(`Found: ${maybeUser.value.name}`)
  } else {
    yield* Effect.log("User not found")
  }
})

Effect.runPromise(program)
```

---

### Handle Your First Error with Effect.fail and catchAll

**Rule:** Handle errors with Effect.fail and catchAll.

**Use Cases:** getting-started

**Why:**

Real programs fail. Effect makes failures explicit in the type system so you
can't forget to handle them. Unlike try/catch, Effect errors are tracked in
types.

**Good Example:**

```typescript
import { Effect, pipe } from "effect";

class UserNotFound {
  readonly _tag = "UserNotFound";
  constructor(readonly id: string) {}
}

const findUser = (id: string) =>
  id === "123"
    ? Effect.succeed({ id, name: "Alice" })
    : Effect.fail(new UserNotFound(id));

const program = pipe(
  findUser("456"),
  Effect.catchTag("UserNotFound", (e) =>
    Effect.succeed({ id: e.id, name: "Guest" })
  ),
  Effect.map((user) => `Hello, ${user.name}!`)
);

const result = Effect.runSync(program);
console.log(result); // "Hello, Guest!"
```

---

### Hello World: Your First Effect

**Rule:** Create your first Effect program with Effect.succeed.

**Use Cases:** getting-started

**Why:**

Every journey starts with "Hello World". In Effect, you create computations
by describing what you want to happen, then you run them. This separation is
what makes Effect powerful.

**Good Example:**

```typescript
import { Effect } from "effect";

// Step 1: Create an Effect that succeeds with a value
const helloWorld = Effect.succeed("Hello, Effect!");

// Step 2: Run the Effect and get the result
const result = Effect.runSync(helloWorld);

console.log(result); // "Hello, Effect!"
```

---

### Lifting Errors and Absence with fail, none, and left

**Rule:** Use fail, none, and left to create Effect, Option, or Either that represent failure or absence.

**Use Cases:** core-concepts

**Why:**

By lifting errors and absence into these structures, you can handle them declaratively with combinators, rather than relying on exceptions, `null`, or `undefined`.  
This leads to more robust and maintainable code.

**Good Example:**

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

**Anti-Pattern:**

Throwing exceptions, returning `null` or `undefined`, or using error codes outside the Effect, Option, or Either world.  
This makes error handling ad hoc, less type-safe, and harder to compose.

---

### Lifting Values with succeed, some, and right

**Rule:** Use succeed, some, and right to create Effect, Option, or Either from plain values.

**Use Cases:** core-concepts

**Why:**

Lifting values into these structures allows you to compose them with other effects, options, or eithers, and to take advantage of all the combinators and error handling that Effect provides.

**Good Example:**

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

**Anti-Pattern:**

Passing plain values around outside the Effect, Option, or Either world, or using `null`/`undefined` to represent absence or success.  
This leads to less composable, less type-safe code and makes error handling harder.

---

### Matching on Success and Failure with match

**Rule:** Use match to pattern match on the result of an Effect, Option, or Either, handling both success and failure cases declaratively.

**Use Cases:** error-management

**Why:**

Pattern matching with `match` keeps your code clear and type-safe, ensuring you handle all possible outcomes.  
It avoids scattered if/else or switch statements and makes your intent explicit.

**Good Example:**

```typescript
import { Effect, Option, Either } from "effect";

// Effect: Handle both success and failure
const effect = Effect.fail("Oops!").pipe(
  Effect.match({
    onFailure: (err) => `Error: ${err}`,
    onSuccess: (value) => `Success: ${value}`,
  })
); // Effect<string>

// Option: Handle Some and None cases
const option = Option.some(42).pipe(
  Option.match({
    onNone: () => "No value",
    onSome: (n) => `Value: ${n}`,
  })
); // string

// Either: Handle Left and Right cases
const either = Either.left("fail").pipe(
  Either.match({
    onLeft: (err) => `Error: ${err}`,
    onRight: (value) => `Value: ${value}`,
  })
); // string
```

**Explanation:**

- `Effect.match` lets you handle both the error and success channels in one place.
- `Option.match` and `Either.match` let you handle all possible cases for these types, making your code exhaustive and safe.

**Anti-Pattern:**

Using nested if/else or switch statements to check for success/failure, or ignoring possible error/none/left cases, which leads to brittle and less readable code.

---

### Model Optional Values Safely with Option

**Rule:** Use Option to model values that may be present or absent, making absence explicit and type-safe.

**Use Cases:** core-concepts

**Why:**

`Option` makes it impossible to forget to handle the "no value" case.  
It improves code safety, readability, and composability, and is a foundation for robust domain modeling.

**Good Example:**

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

**Anti-Pattern:**

Using `null` or `undefined` to represent absence, or forgetting to handle the "no value" case, which leads to runtime errors and less maintainable code.

---

### Parse JSON Responses Safely

**Rule:** Always validate HTTP responses with Schema to catch API changes at runtime.

**Use Cases:** making-http-requests

**Why:**

APIs can change without warning:

1. **Fields disappear** - Backend removes a field
2. **Types change** - String becomes number
3. **Nulls appear** - Required field becomes optional
4. **New fields** - Extra data you didn't expect

Schema validation catches these issues immediately.

---

**Good Example:**

```typescript
import { Effect, Console } from "effect"
import { Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"

// ============================================
// 1. Define response schemas
// ============================================

const PostSchema = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  body: Schema.String,
  userId: Schema.Number,
})

type Post = Schema.Schema.Type<typeof PostSchema>

const PostArraySchema = Schema.Array(PostSchema)

// ============================================
// 2. Fetch and validate single item
// ============================================

const getPost = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const response = yield* client.get(
      `https://jsonplaceholder.typicode.com/posts/${id}`
    )
    const json = yield* HttpClientResponse.json(response)

    // Validate against schema - fails if data doesn't match
    const post = yield* Schema.decodeUnknown(PostSchema)(json)

    return post
  })

// ============================================
// 3. Fetch and validate array
// ============================================

const getPosts = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts"
  )
  const json = yield* HttpClientResponse.json(response)

  // Validate array of posts
  const posts = yield* Schema.decodeUnknown(PostArraySchema)(json)

  return posts
})

// ============================================
// 4. Handle validation errors
// ============================================

const safeGetPost = (id: number) =>
  getPost(id).pipe(
    Effect.catchTag("ParseError", (error) =>
      Effect.gen(function* () {
        yield* Console.error(`Invalid response format: ${error.message}`)
        // Return a default or fail differently
        return yield* Effect.fail(new Error(`Post ${id} has invalid format`))
      })
    )
  )

// ============================================
// 5. Schema with optional fields
// ============================================

const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
  phone: Schema.optional(Schema.String),        // May not exist
  website: Schema.optional(Schema.String),
  company: Schema.optional(
    Schema.Struct({
      name: Schema.String,
      catchPhrase: Schema.optional(Schema.String),
    })
  ),
})

const getUser = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const response = yield* client.get(
      `https://jsonplaceholder.typicode.com/users/${id}`
    )
    const json = yield* HttpClientResponse.json(response)

    return yield* Schema.decodeUnknown(UserSchema)(json)
  })

// ============================================
// 6. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Console.log("=== Validated Single Post ===")
  const post = yield* getPost(1)
  yield* Console.log(`Title: ${post.title}`)

  yield* Console.log("\n=== Validated Posts Array ===")
  const posts = yield* getPosts
  yield* Console.log(`Fetched ${posts.length} posts`)

  yield* Console.log("\n=== User with Optional Fields ===")
  const user = yield* getUser(1)
  yield* Console.log(`User: ${user.name}`)
  yield* Console.log(`Company: ${user.company?.name ?? "N/A"}`)
})

program.pipe(
  Effect.provide(NodeHttpClient.layer),
  NodeRuntime.runMain
)
```

---

### Pattern Match on Option and Either

**Rule:** Use Option.match() and Either.match() for declarative pattern matching on optional and error-prone values

**Use Cases:** error-management

**Why:**

The `.match()` combinator is superior to manual checks (`isSome()`, `isLeft()`) because:

1. **Declarative**: Expresses intent clearly - "match on these cases"
2. **Type-safe**: TypeScript ensures all cases are handled
3. **Exhaustive**: You can't accidentally miss a case
4. **Composable**: Works naturally with `.pipe()` for chaining operations
5. **Readable**: The structure mirrors the data type itself

Without `.match()`, you'd need imperative conditionals, which are harder to read and easier to get wrong.

**Good Example:**

### Basic Option Matching

```typescript
import { Option } from "effect";

const getUserName = (id: number): Option.Option<string> => {
  return id === 1 ? Option.some("Alice") : Option.none();
};

// Using .match() for declarative pattern matching
const displayUser = (id: number): string =>
  getUserName(id).pipe(
    Option.match({
      onNone: () => "Guest User",
      onSome: (name) => `Hello, ${name}!`,
    })
  );

console.log(displayUser(1));   // "Hello, Alice!"
console.log(displayUser(999)); // "Guest User"
```

### Basic Either Matching

```typescript
import { Either } from "effect";

const validateAge = (age: number): Either.Either<number, string> => {
  return age >= 18
    ? Either.right(age)
    : Either.left("Must be 18 or older");
};

// Using .match() for error handling
const processAge = (age: number): string =>
  validateAge(age).pipe(
    Either.match({
      onLeft: (error) => `Validation failed: ${error}`,
      onRight: (validAge) => `Age ${validAge} is valid`,
    })
  );

console.log(processAge(25)); // "Age 25 is valid"
console.log(processAge(15)); // "Validation failed: Must be 18 or older"
```

### Advanced: Nested Matching

When dealing with nested Option and Either, use nested `.match()` calls:

```typescript
import { Option, Either } from "effect";

interface UserProfile {
  name: string;
  age: number;
}

const getUserProfile = (
  id: number
): Option.Option<Either.Either<string, UserProfile>> => {
  if (id === 0) return Option.none(); // User not found
  if (id === 1) return Option.some(Either.left("Profile incomplete"));
  return Option.some(Either.right({ name: "Bob", age: 25 }));
};

// Nested matching - first on Option, then on Either
const displayProfile = (id: number): string =>
  getUserProfile(id).pipe(
    Option.match({
      onNone: () => "User not found",
      onSome: (result) =>
        result.pipe(
          Either.match({
            onLeft: (error) => `Error: ${error}`,
            onRight: (profile) => `${profile.name} (${profile.age})`,
          })
        ),
    })
  );

console.log(displayProfile(0)); // "User not found"
console.log(displayProfile(1)); // "Error: Profile incomplete"
console.log(displayProfile(2)); // "Bob (25)"
```

**Anti-Pattern:**

Avoid manual conditional checks and nested ternaries:

```typescript
// ❌ ANTI-PATTERN: Imperative checks with isSome/isLeft
const name = getUserName(1);
let result: string;
if (Option.isSome(name)) {
  result = `Hello, ${name.value}!`;
} else {
  result = "Guest User";
}

// ❌ ANTI-PATTERN: Nested ternaries
const ageResult = validateAge(25);
const message = ageResult.pipe(
  Either.match({
    onLeft: () => "Invalid",
    onRight: (age) => age >= 21 ? "Can drink" : "Cannot drink",
  })
);

// ❌ ANTI-PATTERN: Chained if-else instead of match
function processValue(value: Option.Option<number>): string {
  if (Option.isSome(value)) {
    if (value.value > 0) {
      return "Positive";
    } else if (value.value < 0) {
      return "Negative";
    } else {
      return "Zero";
    }
  }
  return "No value";
}
```

Why these are worse:
- **Less readable**: The intent is hidden in imperative logic
- **Error-prone**: Easy to forget cases or introduce bugs
- **Mutable state**: Often requires intermediate variables
- **Less composable**: Harder to pipe and combine operations

---

### Platform Pattern 2: Filesystem Operations

**Rule:** Use FileSystem module for safe, resource-managed file operations with proper error handling and cleanup.

**Use Cases:** platform

**Why:**

Direct file operations without FileSystem create issues:

- **Resource leaks**: Files not closed on errors
- **No error context**: Missing file names in errors
- **Blocking**: No async/await integration
- **Cross-platform**: Path handling differences

FileSystem enables:

- **Resource safety**: Automatic cleanup
- **Error context**: Full error messages
- **Async integration**: Effect-native
- **Cross-platform**: Handles path separators

Real-world example: Process log files
- **Direct**: Open file, read, close, handle exceptions manually
- **With FileSystem**: `FileSystem.read(path).pipe(...)`

---

**Good Example:**

This example demonstrates reading, writing, and manipulating files.

```typescript
import { FileSystem, Effect, Stream } from "@effect/platform";
import * as fs from "fs/promises";

const program = Effect.gen(function* () {
  console.log(`\n[FILESYSTEM] Demonstrating file operations\n`);

  // Example 1: Write a file
  console.log(`[1] Writing file:\n`);

  const content = `Hello, Effect-TS!\nThis is a test file.\nCreated at ${new Date().toISOString()}`;

  yield* FileSystem.writeFileUtf8("test.txt", content);

  yield* Effect.log(`✓ File written: test.txt`);

  // Example 2: Read the file
  console.log(`\n[2] Reading file:\n`);

  const readContent = yield* FileSystem.readFileUtf8("test.txt");

  console.log(readContent);

  // Example 3: Get file stats
  console.log(`\n[3] File stats:\n`);

  const stats = yield* FileSystem.stat("test.txt").pipe(
    Effect.flatMap((stat) =>
      Effect.succeed({
        size: stat.size,
        isFile: stat.isFile(),
        modified: stat.mtimeMs,
      })
    )
  );

  console.log(`  Size: ${stats.size} bytes`);
  console.log(`  Is file: ${stats.isFile}`);
  console.log(`  Modified: ${new Date(stats.modified).toISOString()}`);

  // Example 4: Create directory and write multiple files
  console.log(`\n[4] Creating directory and files:\n`);

  yield* FileSystem.mkdir("test-dir");

  yield* Effect.all(
    Array.from({ length: 3 }, (_, i) =>
      FileSystem.writeFileUtf8(
        `test-dir/file-${i + 1}.txt`,
        `Content of file ${i + 1}`
      )
    )
  );

  yield* Effect.log(`✓ Created directory with 3 files`);

  // Example 5: List directory contents
  console.log(`\n[5] Listing directory:\n`);

  const entries = yield* FileSystem.readDirectory("test-dir");

  entries.forEach((entry) => {
    console.log(`  - ${entry}`);
  });

  // Example 6: Append to file
  console.log(`\n[6] Appending to file:\n`);

  const appendContent = `\nAppended line at ${new Date().toISOString()}`;

  yield* FileSystem.appendFileUtf8("test.txt", appendContent);

  const finalContent = yield* FileSystem.readFileUtf8("test.txt");

  console.log(`File now has ${finalContent.split("\n").length} lines`);

  // Example 7: Clean up
  console.log(`\n[7] Cleaning up:\n`);

  yield* Effect.all(
    Array.from({ length: 3 }, (_, i) =>
      FileSystem.remove(`test-dir/file-${i + 1}.txt`)
    )
  );

  yield* FileSystem.remove("test-dir");
  yield* FileSystem.remove("test.txt");

  yield* Effect.log(`✓ Cleanup complete`);
});

Effect.runPromise(program);
```

---

---

### Platform Pattern 4: Interactive Terminal I/O

**Rule:** Use Terminal for user input/output in CLI applications, providing proper buffering and cross-platform character encoding.

**Use Cases:** platform

**Why:**

Direct stdin/stdout causes issues:

- **No buffering**: Interleaved output in concurrent context
- **Encoding issues**: Special characters corrupted
- **Password echo**: Security vulnerability
- **No type safety**: String manipulation error-prone

Terminal enables:

- **Buffered I/O**: Safe concurrent output
- **Encoding handling**: UTF-8 and special chars
- **Password input**: No echo mode
- **Structured interaction**: Prompts and validation

Real-world example: CLI setup wizard
- **Direct**: console.log mixed with readline, no error handling
- **With Terminal**: Structured input, validation, formatted output

---

**Good Example:**

This example demonstrates building an interactive CLI application.

```typescript
import { Terminal, Effect } from "@effect/platform";

interface UserInput {
  readonly name: string;
  readonly email: string;
  readonly age: number;
}

const program = Effect.gen(function* () {
  console.log(`\n[INTERACTIVE CLI] User Information Form\n`);

  // Example 1: Simple prompts
  yield* Terminal.writeLine(`=== User Setup ===`);
  yield* Terminal.writeLine(``);

  yield* Terminal.write(`What is your name? `);
  const name = yield* Terminal.readLine();

  yield* Terminal.write(`What is your email? `);
  const email = yield* Terminal.readLine();

  yield* Terminal.write(`What is your age? `);
  const ageStr = yield* Terminal.readLine();

  const age = parseInt(ageStr);

  // Example 2: Display collected information
  yield* Terminal.writeLine(``);
  yield* Terminal.writeLine(`=== Summary ===`);
  yield* Terminal.writeLine(`Name: ${name}`);
  yield* Terminal.writeLine(`Email: ${email}`);
  yield* Terminal.writeLine(`Age: ${age}`);

  // Example 3: Confirmation
  yield* Terminal.writeLine(``);
  yield* Terminal.write(`Confirm information? (yes/no) `);
  const confirm = yield* Terminal.readLine();

  if (confirm.toLowerCase() === "yes") {
    yield* Terminal.writeLine(`✓ Information saved`);
  } else {
    yield* Terminal.writeLine(`✗ Cancelled`);
  }
});

Effect.runPromise(program);
```

---

---

### Race Effects and Handle Timeouts

**Rule:** Use Effect.race for fastest-wins, Effect.timeout for time limits.

**Use Cases:** concurrency-getting-started

**Why:**

Racing and timeouts prevent your app from hanging:

1. **Redundant requests** - Race multiple servers, use fastest response
2. **Timeouts** - Fail fast if operation takes too long
3. **Fallbacks** - Try fast path, fall back to slow path

---

**Good Example:**

```typescript
import { Effect, Option } from "effect"

// ============================================
// BASIC RACE: First one wins
// ============================================

const server1 = Effect.gen(function* () {
  yield* Effect.sleep("100 millis")
  return "Response from server 1"
})

const server2 = Effect.gen(function* () {
  yield* Effect.sleep("50 millis")
  return "Response from server 2"
})

const raceServers = Effect.race(server1, server2)

Effect.runPromise(raceServers).then((result) => {
  console.log(result) // "Response from server 2" (faster)
})

// ============================================
// BASIC TIMEOUT: Limit execution time
// ============================================

const slowOperation = Effect.gen(function* () {
  yield* Effect.sleep("5 seconds")
  return "Finally done"
})

// Returns Option.none if timeout
const withTimeout = slowOperation.pipe(
  Effect.timeout("1 second")
)

Effect.runPromise(withTimeout).then((result) => {
  if (Option.isNone(result)) {
    console.log("Operation timed out")
  } else {
    console.log(`Got: ${result.value}`)
  }
})

// ============================================
// TIMEOUT WITH FALLBACK
// ============================================

const withFallback = slowOperation.pipe(
  Effect.timeoutTo({
    duration: "1 second",
    onTimeout: () => Effect.succeed("Using cached value"),
  })
)

Effect.runPromise(withFallback).then((result) => {
  console.log(result) // "Using cached value"
})

// ============================================
// TIMEOUT FAIL: Throw error on timeout
// ============================================

class TimeoutError {
  readonly _tag = "TimeoutError"
}

const failOnTimeout = slowOperation.pipe(
  Effect.timeoutFail({
    duration: "1 second",
    onTimeout: () => new TimeoutError(),
  })
)

// ============================================
// RACE ALL: Multiple competing effects
// ============================================

const fetchFromCache = Effect.gen(function* () {
  yield* Effect.sleep("10 millis")
  return { source: "cache", data: "cached data" }
})

const fetchFromDB = Effect.gen(function* () {
  yield* Effect.sleep("100 millis")
  return { source: "db", data: "fresh data" }
})

const fetchFromAPI = Effect.gen(function* () {
  yield* Effect.sleep("200 millis")
  return { source: "api", data: "api data" }
})

const raceAll = Effect.raceAll([fetchFromCache, fetchFromDB, fetchFromAPI])

Effect.runPromise(raceAll).then((result) => {
  console.log(`Winner: ${result.source}`) // "cache"
})

// ============================================
// PRACTICAL: API with timeout and fallback
// ============================================

const fetchWithResilience = (url: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch(url).then((r) => r.json())
    ).pipe(
      Effect.timeout("3 seconds"),
      Effect.flatMap((opt) =>
        Option.isSome(opt)
          ? Effect.succeed(opt.value)
          : Effect.succeed({ error: "timeout", cached: true })
      )
    )
    
    return response
  })
```

---

### Read Effect Type Errors

**Rule:** Effect errors are verbose but structured - learn to extract the key information.

**Use Cases:** tooling-and-debugging

**Why:**

Effect's type system catches many bugs at compile time, but:

1. **Effect types are complex** - Three type parameters
2. **Errors are nested** - Multiple layers of generics
3. **Messages are verbose** - TypeScript shows everything

Understanding the pattern makes errors manageable.

---

---

### Retry a Failed Operation with Effect.retry

**Rule:** Retry failed operations with Effect.retry.

**Use Cases:** getting-started

**Why:**

Network requests fail. Databases time out. Services go down temporarily.
Instead of failing immediately, you often want to retry a few times.
Effect makes this a one-liner.

**Good Example:**

```typescript
import { Effect, Schedule, pipe } from "effect";

class ApiError {
  readonly _tag = "ApiError";
  constructor(readonly status: number) {}
}

const fetchUserData = (userId: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new ApiError(response.status);
      return response.json();
    },
    catch: (error) => error as ApiError,
  });

// Retry up to 3 times with 500ms between attempts
const fetchWithRetry = (userId: string) =>
  pipe(
    fetchUserData(userId),
    Effect.retry(
      Schedule.recurs(3).pipe(Schedule.addDelay(() => "500 millis"))
    ),
    Effect.catchAll((error) =>
      Effect.succeed({ error: `Failed after retries: ${error._tag}` })
    )
  );
```

---

### Retry Failed Operations

**Rule:** Use Effect.retry with a Schedule to handle transient failures gracefully.

**Use Cases:** scheduling

**Why:**

Many failures are temporary:

1. **Network issues** - Connection drops, timeouts
2. **Rate limits** - Too many requests
3. **Resource contention** - Database locks
4. **Service restarts** - Brief unavailability

Automatic retries handle these without manual intervention.

---

**Good Example:**

```typescript
import { Effect, Schedule, Data } from "effect"

// ============================================
// 1. Define error types
// ============================================

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string
}> {}

class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly retryAfter: number
}> {}

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string
}> {}

// ============================================
// 2. Simulate a flaky API call
// ============================================

let callCount = 0
const fetchData = Effect.gen(function* () {
  callCount++
  yield* Effect.log(`API call attempt ${callCount}`)

  // Simulate intermittent failures
  if (callCount < 3) {
    return yield* Effect.fail(new NetworkError({ message: "Connection timeout" }))
  }

  return { data: "Success!", attempts: callCount }
})

// ============================================
// 3. Basic retry - fixed attempts
// ============================================

const withBasicRetry = fetchData.pipe(
  Effect.retry(Schedule.recurs(5))  // Retry up to 5 times
)

// ============================================
// 4. Retry with delay
// ============================================

const withDelayedRetry = fetchData.pipe(
  Effect.retry(
    Schedule.spaced("500 millis").pipe(
      Schedule.intersect(Schedule.recurs(5))
    )
  )
)

// ============================================
// 5. Retry only specific errors
// ============================================

const fetchWithErrors = (shouldFail: boolean) =>
  Effect.gen(function* () {
    if (shouldFail) {
      // Randomly fail with different errors
      const random = Math.random()
      if (random < 0.5) {
        return yield* Effect.fail(new NetworkError({ message: "Timeout" }))
      } else if (random < 0.8) {
        return yield* Effect.fail(new RateLimitError({ retryAfter: 1000 }))
      } else {
        return yield* Effect.fail(new NotFoundError({ resource: "user:123" }))
      }
    }
    return "Data fetched!"
  })

// Only retry network and rate limit errors, not NotFoundError
const retryTransientOnly = fetchWithErrors(true).pipe(
  Effect.retry({
    schedule: Schedule.recurs(3),
    while: (error) =>
      error._tag === "NetworkError" || error._tag === "RateLimitError",
  })
)

// ============================================
// 6. Retry with exponential backoff
// ============================================

const withExponentialBackoff = fetchData.pipe(
  Effect.retry(
    Schedule.exponential("100 millis", 2).pipe(  // 100ms, 200ms, 400ms...
      Schedule.intersect(Schedule.recurs(5))      // Max 5 retries
    )
  )
)

// ============================================
// 7. Run and observe
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("Starting retry demo...")
  
  // Reset counter
  callCount = 0
  
  const result = yield* withBasicRetry
  yield* Effect.log(`Final result: ${JSON.stringify(result)}`)
})

Effect.runPromise(program)
```

---

### Run a Pipeline for its Side Effects

**Rule:** Use Stream.runDrain to execute a stream for its side effects when you don't need the final values.

**Use Cases:** building-data-pipelines

**Why:**

Not all pipelines are designed to produce a final list of values. Often, the goal is to perform an action for each item—write it to a database, send it to a message queue, or log it to a file. In these "fire and forget" scenarios, collecting the results is not just unnecessary; it's a performance anti-pattern.

`Stream.runDrain` is the perfect tool for this job:

1.  **Memory Efficiency**: This is its primary advantage. `runDrain` processes each item and then immediately discards it, resulting in constant, minimal memory usage. This makes it the only safe choice for processing extremely large or infinite streams.
2.  **Clarity of Intent**: Using `runDrain` clearly communicates that you are interested in the successful execution of the stream's effects, not in its output values. The final `Effect` it produces resolves to `void`, reinforcing that no value is returned.
3.  **Performance**: By avoiding the overhead of allocating and managing a growing list in memory, `runDrain` can be faster for pipelines with a very large number of small items.

---

**Good Example:**

This example creates a stream of tasks. For each task, it performs a side effect (logging it as "complete"). `Stream.runDrain` executes the pipeline, ensuring all logs are written, but without collecting the `void` results of each logging operation.

```typescript
import { Effect, Stream } from "effect";

const tasks = ["task 1", "task 2", "task 3"];

// A function that performs a side effect for a task
const completeTask = (task: string): Effect.Effect<void, never> =>
  Effect.log(`Completing ${task}`);

const program = Stream.fromIterable(tasks).pipe(
  // For each task, run the side-effectful operation
  Stream.mapEffect(completeTask, { concurrency: 1 }),
  // Run the stream for its effects, discarding the `void` results
  Stream.runDrain
);

const programWithLogging = Effect.gen(function* () {
  yield* program;
  yield* Effect.log("\nAll tasks have been processed.");
});

Effect.runPromise(programWithLogging);
/*
Output:
... level=INFO msg="Completing task 1"
... level=INFO msg="Completing task 2"
... level=INFO msg="Completing task 3"

All tasks have been processed.
*/
```

**Anti-Pattern:**

The anti-pattern is using `Stream.runCollect` when you only care about the side effects. This needlessly consumes memory and can lead to crashes.

```typescript
import { Effect, Stream } from "effect";
// ... same tasks and completeTask function ...

const program = Stream.fromIterable(tasks).pipe(
  Stream.mapEffect(completeTask, { concurrency: 1 }),
  // Anti-pattern: Collecting results that we are just going to ignore
  Stream.runCollect
);

Effect.runPromise(program).then((results) => {
  // The `results` variable here is a Chunk of `[void, void, void]`.
  // It served no purpose but consumed memory.
  console.log(
    `\nAll tasks processed. Unnecessarily collected ${results.length} empty results.`
  );
});
```

While this works for a small array of three items, it's a dangerous habit. If the `tasks` array contained millions of items, this code would create a `Chunk` with millions of `void` values, consuming a significant amount of memory for no reason and potentially crashing the application. `Stream.runDrain` avoids this problem entirely.

---

### Run Multiple Effects in Parallel with Effect.all

**Rule:** Run multiple Effects in parallel with Effect.all.

**Use Cases:** getting-started

**Why:**

Real applications often need to do multiple things at once - fetch data from
several APIs, process multiple files, etc. `Effect.all` lets you express
this naturally without callback hell or complex Promise.all patterns.

**Good Example:**

```typescript
import { Effect, pipe } from "effect";

// Simulate fetching data from different sources
const fetchUser = Effect.succeed({ id: 1, name: "Alice" }).pipe(
  Effect.delay("100 millis")
);

const fetchPosts = Effect.succeed([
  { id: 1, title: "Hello World" },
  { id: 2, title: "Effect is awesome" },
]).pipe(Effect.delay("150 millis"));

const fetchSettings = Effect.succeed({ theme: "dark" }).pipe(
  Effect.delay("50 millis")
);

// Fetch all data in parallel
const program = Effect.gen(function* () {
  const [user, posts, settings] = yield* Effect.all(
    [fetchUser, fetchPosts, fetchSettings],
    { concurrency: "unbounded" }
  );

  yield* Effect.log(`Loaded ${user.name} with ${posts.length} posts`);
  return { user, posts, settings };
});

Effect.runPromise(program);
```

---

### Running and Collecting Stream Results

**Rule:** Choose the right Stream.run* method based on what you need from the results.

**Use Cases:** streams-getting-started

**Why:**

Effect provides several ways to consume a stream, each optimized for different use cases:

| Method | Returns | Use When |
|--------|---------|----------|
| **runCollect** | `Chunk<A>` | Need all results in memory |
| **runForEach** | `void` | Process each item for side effects |
| **runDrain** | `void` | Run for side effects, ignore values |
| **runHead** | `Option<A>` | Only need first value |
| **runLast** | `Option<A>` | Only need last value |
| **runFold** | `S` | Accumulate into single result |

---

**Good Example:**

```typescript
import { Effect, Stream, Option } from "effect"

const numbers = Stream.make(1, 2, 3, 4, 5)

// ============================================
// runCollect - Get all results as a Chunk
// ============================================

const collectAll = numbers.pipe(
  Stream.map((n) => n * 10),
  Stream.runCollect
)

Effect.runPromise(collectAll).then((chunk) => {
  console.log([...chunk])  // [10, 20, 30, 40, 50]
})

// ============================================
// runForEach - Process each item
// ============================================

const processEach = numbers.pipe(
  Stream.runForEach((n) =>
    Effect.log(`Processing: ${n}`)
  )
)

Effect.runPromise(processEach)
// Logs: Processing: 1, Processing: 2, etc.

// ============================================
// runDrain - Run for side effects only
// ============================================

const withSideEffects = numbers.pipe(
  Stream.tap((n) => Effect.log(`Saw: ${n}`)),
  Stream.runDrain  // Discard values, just run
)

// ============================================
// runHead - Get first value only
// ============================================

const getFirst = numbers.pipe(
  Stream.runHead
)

Effect.runPromise(getFirst).then((option) => {
  if (Option.isSome(option)) {
    console.log(`First: ${option.value}`)  // First: 1
  }
})

// ============================================
// runLast - Get last value only
// ============================================

const getLast = numbers.pipe(
  Stream.runLast
)

Effect.runPromise(getLast).then((option) => {
  if (Option.isSome(option)) {
    console.log(`Last: ${option.value}`)  // Last: 5
  }
})

// ============================================
// runFold - Accumulate into single result
// ============================================

const sum = numbers.pipe(
  Stream.runFold(0, (acc, n) => acc + n)
)

Effect.runPromise(sum).then((total) => {
  console.log(`Sum: ${total}`)  // Sum: 15
})

// ============================================
// runCount - Count elements
// ============================================

const count = numbers.pipe(Stream.runCount)

Effect.runPromise(count).then((n) => {
  console.log(`Count: ${n}`)  // Count: 5
})
```

---

### Safely Bracket Resource Usage with `acquireRelease`

**Rule:** Bracket the use of a resource between an `acquire` and a `release` effect.

**Use Cases:** resource-management

**Why:**

This pattern is the foundation of resource safety in Effect. It provides a composable and interruption-safe alternative to a standard `try...finally` block. The `release` effect is guaranteed to execute, preventing resource leaks which are common in complex asynchronous applications, especially those involving concurrency where tasks can be cancelled.

**Good Example:**

```typescript
import { Effect, Console } from "effect";

// A mock resource that needs to be managed
const getDbConnection = Effect.sync(() => ({ id: Math.random() })).pipe(
  Effect.tap(() => Effect.log("Connection Acquired"))
);

const closeDbConnection = (conn: {
  id: number;
}): Effect.Effect<void, never, never> =>
  Effect.log(`Connection ${conn.id} Released`);

// The program that uses the resource
const program = Effect.acquireRelease(
  getDbConnection, // 1. acquire
  (connection) => closeDbConnection(connection) // 2. cleanup
).pipe(
  Effect.tap((connection) =>
    Effect.log(`Using connection ${connection.id} to run query...`)
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

**Anti-Pattern:**

Using a standard `try...finally` block with `async/await`. While it handles success and failure cases, it is **not interruption-safe**. If the fiber executing the `Promise` is interrupted by Effect's structured concurrency, the `finally` block is not guaranteed to run, leading to resource leaks.

```typescript
// ANTI-PATTERN: Not interruption-safe
async function getUser() {
  const connection = await getDbConnectionPromise(); // acquire
  try {
    return await useConnectionPromise(connection); // use
  } finally {
    // This block may not run if the fiber is interrupted!
    await closeConnectionPromise(connection); // release
  }
}
```

---

### Send a JSON Response

**Rule:** Use Http.response.json to automatically serialize data structures into a JSON response.

**Use Cases:** building-apis

**Why:**

APIs predominantly communicate using JSON. The `Http` module provides a dedicated `Http.response.json` helper to make this as simple and robust as possible. Manually constructing a JSON response involves serializing the data and setting the correct HTTP headers, which is tedious and error-prone.

Using `Http.response.json` is superior because:

1.  **Automatic Serialization**: It safely handles the `JSON.stringify` operation for you, including handling potential circular references or other serialization errors.
2.  **Correct Headers**: It automatically sets the `Content-Type: application/json; charset=utf-8` header. This is critical for clients to correctly interpret the response body. Forgetting this header is a common source of bugs in manually constructed APIs.
3.  **Simplicity and Readability**: Your intent is made clear with a single, declarative function call. The code is cleaner and focuses on the data being sent, not the mechanics of HTTP.
4.  **Composability**: It creates a standard `Http.response` object that works seamlessly with all other parts of the Effect `Http` module.

---

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

---

### Set Up a New Effect Project

**Rule:** Set up a new Effect project.

**Use Cases:** project-setup--execution

**Why:**

A proper setup is crucial for leveraging Effect's powerful type-safety
features. Using TypeScript's `strict` mode is non-negotiable.

**Good Example:**

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

**Anti-Pattern:**

Avoid disabling `strict` mode in your `tsconfig.json`. Running with
`"strict": false` will cause you to lose many of the type-safety guarantees
that make Effect so powerful.

---

### Set Up Your Effect Development Environment

**Rule:** Install the Effect extension and configure TypeScript for optimal Effect development.

**Use Cases:** tooling-and-debugging

**Why:**

A well-configured environment helps you:

1. **See types clearly** - Effect types can be complex
2. **Get better autocomplete** - Know what methods are available
3. **Catch errors early** - TypeScript finds problems
4. **Navigate easily** - Go to definitions, find references

---

---

### Solve Promise Problems with Effect

**Rule:** Recognize that Effect solves the core limitations of Promises: untyped errors, no dependency injection, and no cancellation.

**Use Cases:** core-concepts

**Why:**

While `async/await` is great for simple cases, building large, robust applications with `Promise`s reveals these critical gaps. Effect addresses each one directly:

- **Typed Errors:** The `E` channel in `Effect<A, E, R>` forces you to handle specific, known error types, eliminating an entire class of runtime bugs.
- **Dependency Injection:** The `R` channel provides a powerful, built-in system for declaring and providing dependencies (`Layer`s), making your code modular and testable.
- **Cancellation (Interruption):** Effect's structured concurrency and `Fiber` model provide robust, built-in cancellation. When an effect is interrupted, Effect guarantees that its cleanup logic (finalizers) will be run.

Understanding that Effect was built specifically to solve these problems is key to appreciating its design and power.

---

**Good Example:**

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

**Anti-Pattern:**

This `Promise`-based function has several hidden problems that Effect solves:

- What happens if `db.findUser` rejects? The error is untyped (`any`).
- Where does `db` come from? It's a hidden dependency, making this function hard to test.
- If the operation is slow, how do we cancel it? We can't.

```typescript
// ❌ This function has hidden dependencies and untyped errors.
async function findUserUnsafely(id: number): Promise<any> {
  try {
    const user = await db.findUser(id); // `db` is a hidden global or import
    return user;
  } catch (error) {
    // `error` is of type `any`. We don't know what it is.
    // We might log it and re-throw, but we can't handle it safely.
    throw error;
  }
}
```

---

### Stream Pattern 1: Transform Streams with Map and Filter

**Rule:** Use map and filter combinators to transform stream elements declaratively, creating pipelines that reshape data without materializing intermediate results.

**Use Cases:** streams

**Why:**

Streaming data transformations without map/filter create problems:

- **Buffering**: Must collect all data before transforming
- **Code verbosity**: Manual loops for each transformation
- **Memory usage**: Large intermediate arrays
- **Composability**: Hard to chain operations

Map/filter enable:

- **Lazy evaluation**: Transform on-demand
- **Composable**: Chain operations naturally
- **Memory efficient**: No intermediate collections
- **Expressive**: Declare intent clearly

Real-world example: Processing logs
- **Without map/filter**: Collect logs, filter by level, map to objects, transform fields
- **With map/filter**: `logStream.pipe(Stream.filter(...), Stream.map(...))`

---

**Good Example:**

This example demonstrates transforming a stream of raw data through multiple stages.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface RawLogEntry {
  readonly timestamp: string;
  readonly level: string;
  readonly message: string;
}

interface ProcessedLog {
  readonly date: Date;
  readonly severity: "low" | "medium" | "high";
  readonly normalizedMessage: string;
}

// Create a stream of raw log entries
const createLogStream = (): Stream.Stream<RawLogEntry> =>
  Stream.fromIterable([
    { timestamp: "2025-12-17T09:00:00Z", level: "DEBUG", message: "App starting" },
    { timestamp: "2025-12-17T09:01:00Z", level: "INFO", message: "Connected to DB" },
    { timestamp: "2025-12-17T09:02:00Z", level: "ERROR", message: "Query timeout" },
    { timestamp: "2025-12-17T09:03:00Z", level: "DEBUG", message: "Retry initiated" },
    { timestamp: "2025-12-17T09:04:00Z", level: "WARN", message: "Connection degraded" },
    { timestamp: "2025-12-17T09:05:00Z", level: "INFO", message: "Recovered" },
  ]);

// Transform: Parse timestamp
const parseTimestamp = (entry: RawLogEntry): RawLogEntry => ({
  ...entry,
  timestamp: entry.timestamp, // Already ISO, but could parse here
});

// Transform: Map log level to severity
const mapSeverity = (level: string): "low" | "medium" | "high" => {
  if (level === "DEBUG" || level === "INFO") return "low";
  if (level === "WARN") return "medium";
  return "high";
};

// Transform: Normalize message
const normalizeMessage = (message: string): string =>
  message.toLowerCase().trim();

// Filter: Keep only important logs
const isImportant = (entry: RawLogEntry): boolean => {
  return entry.level !== "DEBUG";
};

// Main pipeline
const program = Effect.gen(function* () {
  console.log(`\n[STREAM] Processing log stream with map/filter\n`);

  // Create and transform stream
  const transformedStream = createLogStream().pipe(
    // Filter: Keep only non-debug logs
    Stream.filter((entry) => {
      const important = isImportant(entry);
      console.log(
        `[FILTER] ${entry.level} → ${important ? "✓ kept" : "✗ filtered out"}`
      );
      return important;
    }),

    // Map: Extract date
    Stream.map((entry) => {
      const date = new Date(entry.timestamp);
      console.log(`[MAP-1] Parsed date: ${date.toISOString()}`);
      return { ...entry, parsedDate: date };
    }),

    // Map: Normalize and map severity
    Stream.map((entry) => {
      const processed: ProcessedLog = {
        date: entry.parsedDate,
        severity: mapSeverity(entry.level),
        normalizedMessage: normalizeMessage(entry.message),
      };
      console.log(
        `[MAP-2] Transformed: ${entry.level} → ${processed.severity}`
      );
      return processed;
    })
  );

  // Collect all transformed logs
  const results = yield* transformedStream.pipe(
    Stream.runCollect
  );

  console.log(`\n[RESULTS]`);
  console.log(`  Total logs: ${results.length}`);

  Chunk.forEach(results, (log) => {
    console.log(
      `  - [${log.severity.toUpperCase()}] ${log.date.toISOString()}: ${log.normalizedMessage}`
    );
  });
});

Effect.runPromise(program);
```

Output shows lazy evaluation and filtering:
```
[STREAM] Processing log stream with map/filter

[FILTER] DEBUG → ✗ filtered out
[FILTER] INFO → ✓ kept
[MAP-1] Parsed date: 2025-12-17T09:01:00.000Z
[MAP-2] Transformed: INFO → low
[FILTER] ERROR → ✓ kept
[MAP-1] Parsed date: 2025-12-17T09:02:00.000Z
[MAP-2] Transformed: ERROR → high
...

[RESULTS]
  Total logs: 5
  - [LOW] 2025-12-17T09:01:00.000Z: connected to db
  - [HIGH] 2025-12-17T09:02:00.000Z: query timeout
  ...
```

---

---

### Stream vs Effect - When to Use Which

**Rule:** Use Effect for single values, Stream for sequences of values.

**Use Cases:** streams-getting-started

**Why:**

Both Effect and Stream are lazy and composable, but they serve different purposes:

| Aspect | Effect | Stream |
|--------|--------|--------|
| **Produces** | One value | Zero or more values |
| **Memory** | Holds one result | Processes incrementally |
| **Use case** | API call, DB query | File lines, events, batches |

---

**Good Example:**

```typescript
import { Effect, Stream } from "effect"

// ============================================
// EFFECT: Single result operations
// ============================================

// Fetch one user - returns Effect<User>
const fetchUser = (id: string) =>
  Effect.tryPromise(() =>
    fetch(`/api/users/${id}`).then((r) => r.json())
  )

// Read entire config - returns Effect<Config>
const loadConfig = Effect.tryPromise(() =>
  fetch("/config.json").then((r) => r.json())
)

// ============================================
// STREAM: Multiple values operations
// ============================================

// Process file line by line - returns Stream<string>
const fileLines = Stream.fromIterable([
  "line 1",
  "line 2",
  "line 3",
])

// Generate events over time - returns Stream<Event>
const events = Stream.make(
  { type: "click", x: 10 },
  { type: "click", x: 20 },
  { type: "scroll", y: 100 },
)

// ============================================
// CONVERTING BETWEEN THEM
// ============================================

// Effect → Stream (single value becomes 1-element stream)
const effectToStream = Stream.fromEffect(fetchUser("123"))

// Stream → Effect (collect all values into array)
const streamToEffect = Stream.runCollect(fileLines)

// Stream → Effect (process each value for side effects)
const processAll = fileLines.pipe(
  Stream.runForEach((line) => Effect.log(`Processing: ${line}`))
)

// ============================================
// DECISION GUIDE
// ============================================

// Use Effect when:
// - Fetching a single resource
// - Computing a single result
// - Performing one action

// Use Stream when:
// - Reading files line by line
// - Processing paginated API results
// - Handling real-time events
// - Processing large datasets
// - Building data pipelines
```

---

### Take and Drop Stream Elements

**Rule:** Use take/drop to control stream size, takeWhile/dropWhile for conditional limits.

**Use Cases:** streams-getting-started

**Why:**

Streams can be infinite or very large. These operators let you:

1. **Limit processing** - Only take what you need
2. **Skip headers** - Drop first N elements
3. **Conditional limits** - Take/drop based on predicates
4. **Pagination** - Implement skip/limit patterns

---

**Good Example:**

```typescript
import { Effect, Stream } from "effect"

const numbers = Stream.make(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// ============================================
// take - Get first N elements
// ============================================

const firstThree = numbers.pipe(
  Stream.take(3),
  Stream.runCollect
)

Effect.runPromise(firstThree).then((chunk) => {
  console.log([...chunk])  // [1, 2, 3]
})

// ============================================
// drop - Skip first N elements
// ============================================

const skipThree = numbers.pipe(
  Stream.drop(3),
  Stream.runCollect
)

Effect.runPromise(skipThree).then((chunk) => {
  console.log([...chunk])  // [4, 5, 6, 7, 8, 9, 10]
})

// ============================================
// Combine for pagination (skip + limit)
// ============================================

const page2 = numbers.pipe(
  Stream.drop(3),   // Skip first page
  Stream.take(3),   // Take second page
  Stream.runCollect
)

Effect.runPromise(page2).then((chunk) => {
  console.log([...chunk])  // [4, 5, 6]
})

// ============================================
// takeWhile - Take while condition is true
// ============================================

const untilFive = numbers.pipe(
  Stream.takeWhile((n) => n < 5),
  Stream.runCollect
)

Effect.runPromise(untilFive).then((chunk) => {
  console.log([...chunk])  // [1, 2, 3, 4]
})

// ============================================
// dropWhile - Skip while condition is true
// ============================================

const afterFive = numbers.pipe(
  Stream.dropWhile((n) => n < 5),
  Stream.runCollect
)

Effect.runPromise(afterFive).then((chunk) => {
  console.log([...chunk])  // [5, 6, 7, 8, 9, 10]
})

// ============================================
// takeUntil - Take until condition becomes true
// ============================================

const untilSix = numbers.pipe(
  Stream.takeUntil((n) => n === 6),
  Stream.runCollect
)

Effect.runPromise(untilSix).then((chunk) => {
  console.log([...chunk])  // [1, 2, 3, 4, 5, 6]
})

// ============================================
// Practical: Process file with header
// ============================================

const fileLines = Stream.make(
  "# Header",
  "# Comment",
  "data1",
  "data2",
  "data3"
)

const dataOnly = fileLines.pipe(
  Stream.dropWhile((line) => line.startsWith("#")),
  Stream.runCollect
)

Effect.runPromise(dataOnly).then((chunk) => {
  console.log([...chunk])  // ["data1", "data2", "data3"]
})
```

---

### Test Effects with Services

**Rule:** Provide test implementations of services to make Effect programs testable.

**Use Cases:** testing

**Why:**

Effect's service pattern makes testing easy:

1. **Declare dependencies** - Effects specify what they need
2. **Inject test doubles** - Provide fake implementations for tests
3. **No mocking libraries** - Just provide different service implementations
4. **Type-safe** - Compiler ensures you provide all dependencies

---

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Context } from "effect"

// ============================================
// 1. Define a service
// ============================================

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User | null>
    readonly save: (user: User) => Effect.Effect<void>
  }
>() {}

interface User {
  id: string
  name: string
  email: string
}

// ============================================
// 2. Code that uses the service
// ============================================

const getUser = (id: string) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const user = yield* repo.findById(id)
    
    if (!user) {
      return yield* Effect.fail(new Error(`User ${id} not found`))
    }
    
    return user
  })

const createUser = (name: string, email: string) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    
    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
    }
    
    yield* repo.save(user)
    return user
  })

// ============================================
// 3. Create a test implementation
// ============================================

const makeTestUserRepository = (initialUsers: User[] = []) => {
  const users = new Map(initialUsers.map(u => [u.id, u]))
  
  return UserRepository.of({
    findById: (id) => Effect.succeed(users.get(id) ?? null),
    save: (user) => Effect.sync(() => { users.set(user.id, user) }),
  })
}

// ============================================
// 4. Write tests
// ============================================

describe("User Service Tests", () => {
  it("should find an existing user", async () => {
    const testUser: User = {
      id: "123",
      name: "Alice",
      email: "alice@example.com",
    }
    
    const testRepo = makeTestUserRepository([testUser])
    
    const result = await Effect.runPromise(
      getUser("123").pipe(
        Effect.provideService(UserRepository, testRepo)
      )
    )
    
    expect(result).toEqual(testUser)
  })

  it("should fail when user not found", async () => {
    const testRepo = makeTestUserRepository([])
    
    await expect(
      Effect.runPromise(
        getUser("999").pipe(
          Effect.provideService(UserRepository, testRepo)
        )
      )
    ).rejects.toThrow("User 999 not found")
  })

  it("should create and save a user", async () => {
    const savedUsers: User[] = []
    
    const trackingRepo = UserRepository.of({
      findById: () => Effect.succeed(null),
      save: (user) => Effect.sync(() => { savedUsers.push(user) }),
    })
    
    const result = await Effect.runPromise(
      createUser("Bob", "bob@example.com").pipe(
        Effect.provideService(UserRepository, trackingRepo)
      )
    )
    
    expect(result.name).toBe("Bob")
    expect(result.email).toBe("bob@example.com")
    expect(savedUsers).toHaveLength(1)
    expect(savedUsers[0].name).toBe("Bob")
  })
})
```

---

### Transform Effect Values with map and flatMap

**Rule:** Transform Effect values with map and flatMap.

**Use Cases:** core-concepts

**Why:**

`Effect.map` is like `Array.prototype.map`. `Effect.flatMap` is like
`Promise.prototype.then` and is used when your transformation function itself
returns an `Effect`.

**Good Example:**

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

**Anti-Pattern:**

Using `map` when you should be using `flatMap`. This results in a nested
`Effect<Effect<...>>`, which is usually not what you want.

---

### Transform Values with Effect.map

**Rule:** Transform Effect values with map.

**Use Cases:** getting-started

**Why:**

Just like `Array.map` transforms array elements, `Effect.map` transforms
the success value of an Effect. This lets you build pipelines of
transformations without running anything until the end.

**Good Example:**

```typescript
import { Effect } from "effect";

// Start with an Effect that succeeds with a number
const getNumber = Effect.succeed(5);

// Transform it: multiply by 2
const doubled = Effect.map(getNumber, (n) => n * 2);

// Transform again: convert to string
const asString = Effect.map(doubled, (n) => `The result is ${n}`);

// Run to see the result
const result = Effect.runSync(asString);
console.log(result); // "The result is 10"
```

---

### Transforming Values with map

**Rule:** Use map to apply a pure function to the value inside an Effect, Stream, Option, or Either.

**Use Cases:** core-concepts

**Why:**

`map` is the most fundamental combinator in functional programming.  
It allows you to focus on _what_ you want to do with a value, not _how_ to extract it.  
The same mental model applies across all major Effect types.

**Good Example:**

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

**Anti-Pattern:**

Manually extracting the value (e.g., with `.getOrElse`, `.unsafeRunSync`, or similar) just to transform it, then re-wrapping it.  
This breaks composability and loses the benefits of type safety and error handling.

---

### Understand that Effects are Lazy Blueprints

**Rule:** Understand that effects are lazy blueprints.

**Use Cases:** core-concepts

**Why:**

This laziness is a superpower because it makes your code composable,
predictable, and testable. Unlike a `Promise` which executes immediately,
an `Effect` is just a description of work, like a recipe waiting for a chef.

**Good Example:**

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

**Anti-Pattern:**

Assuming an `Effect` behaves like a `Promise`. A `Promise` executes its work
immediately upon creation. Never expect a side effect to occur just from
defining an `Effect`.

---

### Understand the Three Effect Channels (A, E, R)

**Rule:** Understand that an Effect&lt;A, E, R&gt; describes a computation with a success type (A), an error type (E), and a requirements type (R).

**Use Cases:** core-concepts

**Why:**

This three-channel signature is what makes Effect so expressive and safe. Unlike a `Promise<A>` which can only describe its success type, an `Effect`'s signature tells you everything you need to know about a computation before you run it:

1.  **What it produces (`A`):** The data you get on the "happy path."
2.  **How it can fail (`E`):** The specific, known errors you need to handle. This makes error handling type-safe and explicit, unlike throwing generic `Error`s.
3.  **What it needs (`R`):** The "ingredients" or dependencies required to run the effect. This is the foundation of Effect's powerful dependency injection system. An `Effect` can only be executed when its `R` channel is `never`, meaning all its dependencies have been provided.

This turns the TypeScript compiler into a powerful assistant that ensures you've handled all possible outcomes and provided all necessary dependencies.

---

**Good Example:**

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

**Anti-Pattern:**

Ignoring the type system and using generic types. This throws away all the safety and clarity that Effect provides.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This signature is dishonest and unsafe.
// It hides the dependency on a database and the possibility of failure.
function getUserUnsafely(id: number, db: any): Effect.Effect<any> {
  try {
    const user = db.findUser(id);
    if (!user) {
      // This will be an unhandled defect, not a typed error.
      throw new Error("User not found");
    }
    return Effect.succeed(user);
  } catch (e) {
    // This is also an untyped failure.
    return Effect.fail(e);
  }
}
```

---

### Understanding Fibers

**Rule:** Fibers are lightweight threads managed by Effect, enabling efficient concurrency without OS thread overhead.

**Use Cases:** concurrency-getting-started

**Why:**

Unlike OS threads:

1. **Lightweight** - Create thousands without performance issues
2. **Cooperative** - Yield control at effect boundaries
3. **Interruptible** - Can be cancelled cleanly
4. **Structured** - Parent fibers manage children

---

**Good Example:**

```typescript
import { Effect, Fiber } from "effect"

// ============================================
// WHAT IS A FIBER?
// ============================================

// A fiber is a running effect. When you run an effect,
// it executes on a fiber.

const myEffect = Effect.gen(function* () {
  yield* Effect.log("Hello from a fiber!")
  yield* Effect.sleep("100 millis")
  return 42
})

// This runs myEffect on the "main" fiber
Effect.runPromise(myEffect)

// ============================================
// FORKING: Create a new fiber
// ============================================

const withFork = Effect.gen(function* () {
  yield* Effect.log("Main fiber starting")
  
  // Fork creates a new fiber that runs independently
  const fiber = yield* Effect.fork(
    Effect.gen(function* () {
      yield* Effect.log("Child fiber running")
      yield* Effect.sleep("200 millis")
      yield* Effect.log("Child fiber done")
      return "child result"
    })
  )
  
  yield* Effect.log("Main fiber continues immediately")
  yield* Effect.sleep("100 millis")
  yield* Effect.log("Main fiber waiting for child...")
  
  // Wait for the forked fiber to complete
  const result = yield* Fiber.join(fiber)
  yield* Effect.log(`Got result: ${result}`)
})

Effect.runPromise(withFork)
/*
Output:
Main fiber starting
Child fiber running
Main fiber continues immediately
Main fiber waiting for child...
Child fiber done
Got result: child result
*/

// ============================================
// FIBER OPERATIONS
// ============================================

const fiberOps = Effect.gen(function* () {
  const fiber = yield* Effect.fork(
    Effect.gen(function* () {
      yield* Effect.sleep("1 second")
      return "done"
    })
  )
  
  // Check if fiber is done (non-blocking)
  const poll = yield* Fiber.poll(fiber)
  yield* Effect.log(`Poll result: ${poll}`) // None (still running)
  
  // Wait for completion
  const result = yield* Fiber.join(fiber)
  yield* Effect.log(`Join result: ${result}`)
  
  // Or interrupt if taking too long
  // yield* Fiber.interrupt(fiber)
})
```

---

### Use .pipe for Composition

**Rule:** Use .pipe for composition.

**Use Cases:** core-concepts

**Why:**

Piping makes code readable and avoids deeply nested function calls. It allows
you to see the flow of data transformations in a clear, linear fashion.

**Good Example:**

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

**Anti-Pattern:**

Nesting function calls manually. This is hard to read and reorder.
`Effect.tap(Effect.map(Effect.map(Effect.succeed(5), n => n * 2), n => ...))`

---

### Why Effect? Comparing Effect to Promise

**Rule:** Understand why Effect is better than raw Promises.

**Use Cases:** getting-started

---

### Working with Immutable Arrays using Data.array

**Rule:** Use Data.array to define arrays whose equality is based on their contents, enabling safe, predictable comparisons and functional operations.

**Use Cases:** core-concepts

**Why:**

JavaScript arrays are mutable and compared by reference, which can lead to bugs in value-based logic and concurrent code.  
`Data.array` provides immutable arrays with structural equality, making them ideal for functional programming and safe domain modeling.

**Good Example:**

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

**Anti-Pattern:**

Using plain JavaScript arrays for value-based logic, as keys in sets/maps, or in concurrent code, which can lead to bugs due to mutability and reference-based comparison.

---

### Working with Tuples using Data.tuple

**Rule:** Use Data.tuple to define tuples whose equality is based on their contents, enabling safe and predictable comparisons and pattern matching.

**Use Cases:** core-concepts

**Why:**

JavaScript arrays are mutable and compared by reference, which can lead to bugs in value-based logic.  
`Data.tuple` provides immutable tuples with structural equality, making them ideal for domain modeling and functional programming patterns.

**Good Example:**

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

**Anti-Pattern:**

Using plain arrays for value-based logic or as keys in sets/maps, which compares by reference and can lead to incorrect behavior.

---

### Wrap Asynchronous Computations with tryPromise

**Rule:** Wrap asynchronous computations with tryPromise.

**Use Cases:** core-concepts

**Why:**

This is the standard bridge from the Promise-based world to Effect, allowing
you to leverage the massive `async/await` ecosystem safely.

**Good Example:**

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

**Anti-Pattern:**

Manually handling `.then()` and `.catch()` inside an `Effect.sync`. This is
verbose, error-prone, and defeats the purpose of using Effect's built-in
Promise integration.

---

### Wrap Synchronous Computations with sync and try

**Rule:** Wrap synchronous computations with sync and try.

**Use Cases:** core-concepts

**Why:**

This is the primary way to safely integrate with synchronous libraries like
`JSON.parse`. `Effect.try` captures any thrown exception and moves it into
the Effect's error channel.

**Good Example:**

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

**Anti-Pattern:**

Never use `Effect.sync` for an operation that could throw, like `JSON.parse`.
This can lead to unhandled exceptions that crash your application.

---

### Wrapping Synchronous and Asynchronous Computations

**Rule:** Use try and tryPromise to lift code that may throw or reject into Effect, capturing errors in the failure channel.

**Use Cases:** core-concepts

**Why:**

Wrapping potentially unsafe code in `try` or `tryPromise` ensures that all errors are handled in a uniform, declarative way.  
This eliminates the need for try/catch blocks and makes error handling explicit and type-safe.

**Good Example:**

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

**Anti-Pattern:**

Using try/catch for error handling, or relying on untyped Promise rejections, which leads to less composable and less type-safe code.

---

### Write Sequential Code with Effect.gen

**Rule:** Write sequential code with Effect.gen.

**Use Cases:** core-concepts

**Why:**

`Effect.gen` uses generator functions to create a flat, linear, and highly
readable sequence of operations, avoiding the nested "callback hell" of
`flatMap`.

**Good Example:**

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

**Anti-Pattern:**

Deeply nesting `flatMap` calls. This is much harder to read and maintain than
the equivalent `Effect.gen` block.

---

### Your First Domain Model

**Rule:** Start domain modeling by defining clear interfaces for your business entities.

**Use Cases:** domain-modeling

**Why:**

Good domain modeling:

1. **Clarifies intent** - Types document what data means
2. **Prevents errors** - Compiler catches wrong data usage
3. **Enables tooling** - IDE autocompletion and refactoring
4. **Communicates** - Code becomes documentation

---

**Good Example:**

```typescript
import { Effect } from "effect"

// ============================================
// 1. Define domain entities as interfaces
// ============================================

interface User {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly createdAt: Date
}

interface Product {
  readonly sku: string
  readonly name: string
  readonly price: number
  readonly inStock: boolean
}

interface Order {
  readonly id: string
  readonly userId: string
  readonly items: ReadonlyArray<OrderItem>
  readonly total: number
  readonly status: OrderStatus
}

interface OrderItem {
  readonly productSku: string
  readonly quantity: number
  readonly unitPrice: number
}

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered"

// ============================================
// 2. Create domain functions
// ============================================

const createUser = (email: string, name: string): User => ({
  id: crypto.randomUUID(),
  email,
  name,
  createdAt: new Date(),
})

const calculateOrderTotal = (items: ReadonlyArray<OrderItem>): number =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

// ============================================
// 3. Use in Effect programs
// ============================================

const program = Effect.gen(function* () {
  const user = createUser("alice@example.com", "Alice")
  yield* Effect.log(`Created user: ${user.name}`)

  const items: OrderItem[] = [
    { productSku: "WIDGET-001", quantity: 2, unitPrice: 29.99 },
    { productSku: "GADGET-002", quantity: 1, unitPrice: 49.99 },
  ]

  const order: Order = {
    id: crypto.randomUUID(),
    userId: user.id,
    items,
    total: calculateOrderTotal(items),
    status: "pending",
  }

  yield* Effect.log(`Order total: $${order.total.toFixed(2)}`)
  return order
})

Effect.runPromise(program)
```

---

### Your First Effect Test

**Rule:** Use Effect.runPromise in tests to run and assert on Effect results.

**Use Cases:** testing

**Why:**

Testing Effect code is straightforward:

1. **Effects are values** - Build them in tests like any other value
2. **Run to get results** - Use `Effect.runPromise` to execute
3. **Assert normally** - Standard assertions work on the results

---

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect } from "effect"

// ============================================
// Code to test
// ============================================

const add = (a: number, b: number): Effect.Effect<number> =>
  Effect.succeed(a + b)

const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

const fetchUser = (id: string): Effect.Effect<{ id: string; name: string }> =>
  Effect.succeed({ id, name: `User ${id}` })

// ============================================
// Tests
// ============================================

describe("Basic Effect Tests", () => {
  it("should add two numbers", async () => {
    const result = await Effect.runPromise(add(2, 3))
    expect(result).toBe(5)
  })

  it("should divide numbers", async () => {
    const result = await Effect.runPromise(divide(10, 2))
    expect(result).toBe(5)
  })

  it("should fail on divide by zero", async () => {
    await expect(Effect.runPromise(divide(10, 0))).rejects.toThrow(
      "Cannot divide by zero"
    )
  })

  it("should fetch a user", async () => {
    const user = await Effect.runPromise(fetchUser("123"))
    
    expect(user).toEqual({
      id: "123",
      name: "User 123",
    })
  })
})

// ============================================
// Testing Effect.gen programs
// ============================================

const calculateDiscount = (price: number, quantity: number) =>
  Effect.gen(function* () {
    if (price <= 0) {
      return yield* Effect.fail(new Error("Invalid price"))
    }
    
    const subtotal = price * quantity
    const discount = quantity >= 10 ? 0.1 : 0
    const total = subtotal * (1 - discount)
    
    return { subtotal, discount, total }
  })

describe("Effect.gen Tests", () => {
  it("should calculate without discount", async () => {
    const result = await Effect.runPromise(calculateDiscount(10, 5))
    
    expect(result.subtotal).toBe(50)
    expect(result.discount).toBe(0)
    expect(result.total).toBe(50)
  })

  it("should apply bulk discount", async () => {
    const result = await Effect.runPromise(calculateDiscount(10, 10))
    
    expect(result.subtotal).toBe(100)
    expect(result.discount).toBe(0.1)
    expect(result.total).toBe(90)
  })

  it("should fail for invalid price", async () => {
    await expect(
      Effect.runPromise(calculateDiscount(-5, 10))
    ).rejects.toThrow("Invalid price")
  })
})
```

---

### Your First Error Handler

**Rule:** Use catchAll or catchTag to recover from errors and keep your program running.

**Use Cases:** error-management

**Why:**

Effect makes errors explicit in your types:

1. **Errors are typed** - You know exactly what can fail
2. **Handle or propagate** - Can't accidentally ignore errors
3. **Recovery options** - Provide fallbacks, retry, or transform
4. **No try/catch** - Declarative error handling

---

**Good Example:**

```typescript
import { Effect, Data } from "effect"

// ============================================
// 1. Define typed errors
// ============================================

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string
}> {}

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string
}> {}

// ============================================
// 2. Functions that can fail
// ============================================

const fetchData = (url: string): Effect.Effect<string, NetworkError> =>
  url.startsWith("http")
    ? Effect.succeed(`Data from ${url}`)
    : Effect.fail(new NetworkError({ url }))

const findUser = (id: string): Effect.Effect<{ id: string; name: string }, NotFoundError> =>
  id === "123"
    ? Effect.succeed({ id, name: "Alice" })
    : Effect.fail(new NotFoundError({ resource: `user:${id}` }))

// ============================================
// 3. Handle ALL errors with catchAll
// ============================================

const withFallback = fetchData("invalid-url").pipe(
  Effect.catchAll((error) => {
    console.log(`Failed: ${error.url}, using fallback`)
    return Effect.succeed("Fallback data")
  })
)

// Result: "Fallback data"

// ============================================
// 4. Handle SPECIFIC errors with catchTag
// ============================================

const findUserOrDefault = (id: string) =>
  findUser(id).pipe(
    Effect.catchTag("NotFoundError", (error) => {
      console.log(`User not found: ${error.resource}`)
      return Effect.succeed({ id: "guest", name: "Guest User" })
    })
  )

// ============================================
// 5. Handle MULTIPLE error types
// ============================================

const fetchUser = (url: string, id: string) =>
  Effect.gen(function* () {
    yield* fetchData(url)
    return yield* findUser(id)
  })

const robustFetchUser = (url: string, id: string) =>
  fetchUser(url, id).pipe(
    Effect.catchTags({
      NetworkError: (e) => Effect.succeed({ id: "offline", name: `Offline (${e.url})` }),
      NotFoundError: (e) => Effect.succeed({ id: "unknown", name: `Unknown (${e.resource})` }),
    })
  )

// ============================================
// 6. Run the examples
// ============================================

const program = Effect.gen(function* () {
  // catchAll example
  const data = yield* withFallback
  yield* Effect.log(`Got data: ${data}`)

  // catchTag example
  const user = yield* findUserOrDefault("999")
  yield* Effect.log(`Got user: ${user.name}`)

  // Multiple error types
  const result = yield* robustFetchUser("invalid", "999")
  yield* Effect.log(`Robust result: ${result.name}`)
})

Effect.runPromise(program)
```

---

### Your First HTTP Request

**Rule:** Use @effect/platform HttpClient for type-safe HTTP requests with automatic error handling.

**Use Cases:** making-http-requests

**Why:**

Effect's HttpClient is better than `fetch`:

1. **Type-safe errors** - Network failures are typed, not exceptions
2. **Automatic JSON parsing** - No manual `.json()` calls
3. **Composable** - Chain requests, add retries, timeouts
4. **Testable** - Easy to mock in tests

---

**Good Example:**

```typescript
import { Effect, Console } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"

// ============================================
// 1. Simple GET request
// ============================================

const simpleGet = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  
  // Make a GET request
  const response = yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
  
  // Get response as JSON
  const json = yield* HttpClientResponse.json(response)
  
  return json
})

// ============================================
// 2. GET with typed response
// ============================================

interface Post {
  id: number
  title: string
  body: string
  userId: number
}

const getPost = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(
      `https://jsonplaceholder.typicode.com/posts/${id}`
    )
    const post = yield* HttpClientResponse.json(response) as Effect.Effect<Post>
    return post
  })

// ============================================
// 3. POST with body
// ============================================

const createPost = (title: string, body: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    
    const request = HttpClientRequest.post(
      "https://jsonplaceholder.typicode.com/posts"
    ).pipe(
      HttpClientRequest.jsonBody({ title, body, userId: 1 })
    )
    
    const response = yield* client.execute(yield* request)
    const created = yield* HttpClientResponse.json(response)
    
    return created
  })

// ============================================
// 4. Handle errors
// ============================================

const safeGetPost = (id: number) =>
  getPost(id).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.error(`Failed to fetch post ${id}: ${error}`)
        return { id, title: "Unavailable", body: "", userId: 0 }
      })
    )
  )

// ============================================
// 5. Run the program
// ============================================

const program = Effect.gen(function* () {
  yield* Console.log("=== Simple GET ===")
  const data = yield* simpleGet
  yield* Console.log(JSON.stringify(data, null, 2))

  yield* Console.log("\n=== Typed GET ===")
  const post = yield* getPost(1)
  yield* Console.log(`Post: ${post.title}`)

  yield* Console.log("\n=== POST Request ===")
  const created = yield* createPost("My New Post", "This is the body")
  yield* Console.log(`Created: ${JSON.stringify(created)}`)
})

// Provide the HTTP client implementation
program.pipe(
  Effect.provide(NodeHttpClient.layer),
  NodeRuntime.runMain
)
```

---

### Your First Logs

**Rule:** Use Effect.log and related functions for structured, contextual logging.

**Use Cases:** observability

**Why:**

Effect's logging is superior to `console.log`:

1. **Structured** - Logs are data, not just strings
2. **Contextual** - Automatically includes fiber info, timestamps
3. **Configurable** - Change log levels, formats, destinations
4. **Type-safe** - Part of the Effect type system

---

**Good Example:**

```typescript
import { Effect, Logger, LogLevel } from "effect"

// ============================================
// 1. Basic logging
// ============================================

const basicLogging = Effect.gen(function* () {
  // Different log levels
  yield* Effect.logDebug("Debug message - for development")
  yield* Effect.logInfo("Info message - normal operation")
  yield* Effect.log("Default log - same as logInfo")
  yield* Effect.logWarning("Warning - something unusual")
  yield* Effect.logError("Error - something went wrong")
})

// ============================================
// 2. Logging with context
// ============================================

const withContext = Effect.gen(function* () {
  // Add structured data to logs
  yield* Effect.log("User logged in").pipe(
    Effect.annotateLogs({
      userId: "user-123",
      action: "login",
      ipAddress: "192.168.1.1",
    })
  )

  // Add a single annotation
  yield* Effect.log("Processing request").pipe(
    Effect.annotateLogs("requestId", "req-456")
  )
})

// ============================================
// 3. Log spans for timing
// ============================================

const withTiming = Effect.gen(function* () {
  yield* Effect.log("Starting operation")

  // withLogSpan adds timing information
  yield* Effect.sleep("100 millis").pipe(
    Effect.withLogSpan("database-query")
  )

  yield* Effect.log("Operation complete")
})

// ============================================
// 4. Practical example
// ============================================

interface User {
  id: string
  email: string
}

const processOrder = (orderId: string, userId: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Processing order").pipe(
      Effect.annotateLogs({ orderId, userId })
    )

    // Simulate work
    yield* Effect.sleep("50 millis")

    yield* Effect.logInfo("Order processed successfully").pipe(
      Effect.annotateLogs({ orderId, status: "completed" })
    )

    return { orderId, status: "completed" }
  }).pipe(
    Effect.withLogSpan("processOrder")
  )

// ============================================
// 5. Configure log level
// ============================================

const debugProgram = basicLogging.pipe(
  // Show all logs including debug
  Logger.withMinimumLogLevel(LogLevel.Debug)
)

const productionProgram = basicLogging.pipe(
  // Only show warnings and errors
  Logger.withMinimumLogLevel(LogLevel.Warning)
)

// ============================================
// 6. Run
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Basic Logging ===")
  yield* basicLogging

  yield* Effect.log("\n=== With Context ===")
  yield* withContext

  yield* Effect.log("\n=== With Timing ===")
  yield* withTiming

  yield* Effect.log("\n=== Process Order ===")
  yield* processOrder("order-789", "user-123")
})

Effect.runPromise(program)
```

---

### Your First Parallel Operation

**Rule:** Use Effect.all with concurrency option to run independent effects in parallel.

**Use Cases:** concurrency-getting-started

**Why:**

Parallel execution speeds up independent operations:

1. **Fetch multiple APIs** - Get user, products, cart simultaneously
2. **Process files** - Read multiple files at once
3. **Database queries** - Run independent queries in parallel

---

**Good Example:**

```typescript
import { Effect } from "effect"

// Simulate async operations
const fetchUser = Effect.gen(function* () {
  yield* Effect.sleep("100 millis")
  return { id: 1, name: "Alice" }
})

const fetchProducts = Effect.gen(function* () {
  yield* Effect.sleep("150 millis")
  return [{ id: 1, name: "Widget" }, { id: 2, name: "Gadget" }]
})

const fetchCart = Effect.gen(function* () {
  yield* Effect.sleep("80 millis")
  return { items: 3, total: 99.99 }
})

// ============================================
// SEQUENTIAL: One after another (~330ms)
// ============================================

const sequential = Effect.all([fetchUser, fetchProducts, fetchCart])

// ============================================
// PARALLEL: All at once (~150ms)
// ============================================

const parallel = Effect.all(
  [fetchUser, fetchProducts, fetchCart],
  { concurrency: "unbounded" }
)

// ============================================
// PARALLEL WITH LIMIT: Max 2 at a time
// ============================================

const limited = Effect.all(
  [fetchUser, fetchProducts, fetchCart],
  { concurrency: 2 }
)

// ============================================
// DEMO
// ============================================

const demo = Effect.gen(function* () {
  const start = Date.now()
  
  const [user, products, cart] = yield* parallel
  
  const elapsed = Date.now() - start
  yield* Effect.log(`Fetched in ${elapsed}ms`)
  yield* Effect.log(`User: ${user.name}`)
  yield* Effect.log(`Products: ${products.length}`)
  yield* Effect.log(`Cart total: $${cart.total}`)
})

Effect.runPromise(demo)
// Output: Fetched in ~150ms (not ~330ms!)
```

---

### Your First Platform Operation

**Rule:** Use @effect/platform for cross-platform system operations with Effect integration.

**Use Cases:** platform-getting-started

**Why:**

Platform wraps system operations in Effect, giving you:

1. **Type safety** - File operations return `Effect<Content, PlatformError>`
2. **Resource management** - Files are automatically closed
3. **Cross-platform** - Same code works on Node.js, Bun, browser
4. **Composability** - Chain file ops with other effects

---

**Good Example:**

```typescript
import { Effect } from "effect"
import { FileSystem } from "@effect/platform"
import { NodeContext, NodeRuntime } from "@effect/platform-node"

// Read a file - returns Effect<string, PlatformError>
const readConfig = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  
  // Read file as UTF-8 string
  const content = yield* fs.readFileString("./config.json")
  
  return JSON.parse(content)
})

// Write a file
const writeLog = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  
  yield* fs.writeFileString(
    "./app.log",
    `Started at ${new Date().toISOString()}\n`
  )
})

// Combine operations
const program = Effect.gen(function* () {
  const config = yield* readConfig
  yield* Effect.log(`Loaded config: ${config.appName}`)
  
  yield* writeLog
  yield* Effect.log("Log file created")
})

// Run with Node.js platform
program.pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
```

---

### Your First Schedule

**Rule:** Use Schedule to control when and how often effects run.

**Use Cases:** scheduling

**Why:**

Schedules solve common timing problems:

1. **Retries** - Try again after failures
2. **Polling** - Check for updates periodically
3. **Rate limiting** - Control how fast things run
4. **Backoff** - Increase delays between attempts

---

**Good Example:**

```typescript
import { Effect, Schedule } from "effect"

// ============================================
// 1. Retry a failing operation
// ============================================

let attempts = 0
const flakyOperation = Effect.gen(function* () {
  attempts++
  if (attempts < 3) {
    yield* Effect.log(`Attempt ${attempts} failed`)
    return yield* Effect.fail(new Error("Temporary failure"))
  }
  return `Success on attempt ${attempts}`
})

// Retry up to 5 times
const withRetry = flakyOperation.pipe(
  Effect.retry(Schedule.recurs(5))
)

// ============================================
// 2. Repeat a successful operation
// ============================================

const logTime = Effect.gen(function* () {
  const now = new Date().toISOString()
  yield* Effect.log(`Current time: ${now}`)
  return now
})

// Repeat 3 times
const repeated = logTime.pipe(
  Effect.repeat(Schedule.recurs(3))
)

// ============================================
// 3. Add delays between operations
// ============================================

// Repeat every second, 5 times
const polling = logTime.pipe(
  Effect.repeat(
    Schedule.spaced("1 second").pipe(
      Schedule.intersect(Schedule.recurs(5))
    )
  )
)

// ============================================
// 4. Common schedule patterns
// ============================================

// Fixed delay between attempts
const fixedDelay = Schedule.spaced("500 millis")

// Increasing delay (1s, 2s, 4s, 8s...)
const exponentialBackoff = Schedule.exponential("1 second")

// Maximum number of attempts
const limitedAttempts = Schedule.recurs(3)

// Combine: exponential backoff, max 5 attempts
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.intersect(Schedule.recurs(5))
)

// ============================================
// 5. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("--- Retry Example ---")
  const result = yield* withRetry
  yield* Effect.log(`Result: ${result}`)

  yield* Effect.log("\n--- Repeat Example ---")
  yield* repeated
})

Effect.runPromise(program)
```

---

### Your First Stream

**Rule:** Use Stream to process sequences of data lazily and efficiently.

**Use Cases:** streams-getting-started

**Why:**

Streams are Effect's answer to processing sequences of data. Unlike arrays which hold all values in memory at once, streams produce values on demand. This makes them ideal for:

1. **Large datasets** - Process millions of records without loading everything into memory
2. **Async data** - Handle data that arrives over time (files, APIs, events)
3. **Composable pipelines** - Chain transformations that work element by element

---

**Good Example:**

```typescript
import { Effect, Stream } from "effect"

// Create a stream from explicit values
const numbers = Stream.make(1, 2, 3, 4, 5)

// Create a stream from an array
const fromArray = Stream.fromIterable([10, 20, 30])

// Create a single-value stream
const single = Stream.succeed("hello")

// Transform and run the stream
const program = numbers.pipe(
  Stream.map((n) => n * 2),           // Double each number
  Stream.filter((n) => n > 4),        // Keep only > 4
  Stream.runCollect                    // Collect results
)

Effect.runPromise(program).then((chunk) => {
  console.log([...chunk])  // [6, 8, 10]
})
```

**Anti-Pattern:**

Don't use regular arrays when you need lazy processing or async operations:

```typescript
// Anti-pattern: Eager processing, all in memory
const numbers = [1, 2, 3, 4, 5]
const doubled = numbers.map((n) => n * 2)
const filtered = doubled.filter((n) => n > 4)
```

This loads everything into memory immediately. Use Stream when:
- Data is large or potentially infinite
- Data arrives asynchronously
- You need backpressure or resource management

---

## 🟡 Intermediate Patterns

### Access Configuration from the Context

**Rule:** Access configuration from the Effect context.

**Use Cases:** core-concepts

**Why:**

This allows your business logic to declaratively state its dependency on a piece of configuration. The logic is clean, type-safe, and completely decoupled from _how_ the configuration is provided.

**Good Example:**

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

**Anti-Pattern:**

Passing configuration values down through multiple function arguments ("prop-drilling"). This is cumbersome and obscures which components truly need which values.

---

### Accessing the Current Time with Clock

**Rule:** Use the Clock service to get the current time, enabling deterministic testing with TestClock.

**Use Cases:** testing

**Why:**

Directly calling `Date.now()` makes your code impure and tightly coupled to the system clock. This makes testing difficult and unreliable, as the output of your function will change every time it's run.

The `Clock` service is Effect's solution to this problem. It's an abstraction for "the current time."

- In **production**, the default `Live` `Clock` implementation uses the real system time.
- In **tests**, you can provide the `TestClock` layer. This gives you a virtual clock that you can manually control, allowing you to set the time to a specific value or advance it by a specific duration.

This makes any time-dependent logic pure, deterministic, and easy to test with perfect precision.

---

**Good Example:**

This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Duration } from "effect";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (
  token: Token
): Effect.Effect<boolean, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
    Effect.tap((expired) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((currentTime) =>
          Effect.log(
            `Token expired? ${expired} (current time: ${new Date(currentTime).toISOString()})`
          )
        )
      )
    )
  );

// Create a test clock service that advances time
const makeTestClock = (timeMs: number): Clock.Clock => ({
  currentTimeMillis: Effect.succeed(timeMs),
  currentTimeNanos: Effect.succeed(BigInt(timeMs * 1_000_000)),
  sleep: (duration: Duration.Duration) => Effect.succeed(void 0),
  unsafeCurrentTimeMillis: () => timeMs,
  unsafeCurrentTimeNanos: () => BigInt(timeMs * 1_000_000),
  [Clock.ClockTypeId]: Clock.ClockTypeId,
});

// Create a token that expires in 1 second
const token = { value: "abc", expiresAt: Date.now() + 1000 };

// Check token expiry with different clocks
const program = Effect.gen(function* () {
  // Check with current time
  yield* Effect.log("Checking with current time...");
  yield* isTokenExpired(token);

  // Check with past time
  yield* Effect.log("\nChecking with past time (1 minute ago)...");
  const pastClock = makeTestClock(Date.now() - 60_000);
  yield* isTokenExpired(token).pipe(
    Effect.provideService(Clock.Clock, pastClock)
  );

  // Check with future time
  yield* Effect.log("\nChecking with future time (1 hour ahead)...");
  const futureClock = makeTestClock(Date.now() + 3600_000);
  yield* isTokenExpired(token).pipe(
    Effect.provideService(Clock.Clock, futureClock)
  );
});

// Run the program with default clock
Effect.runPromise(
  program.pipe(Effect.provideService(Clock.Clock, makeTestClock(Date.now())))
);
```

---

**Anti-Pattern:**

Directly calling `Date.now()` inside your business logic. This creates an impure function that cannot be tested reliably without manipulating the system clock, which is a bad practice.

```typescript
import { Effect } from "effect";

interface Token {
  readonly expiresAt: number;
}

// ❌ WRONG: This function's behavior changes every millisecond.
const isTokenExpiredUnsafely = (token: Token): Effect.Effect<boolean> =>
  Effect.sync(() => Date.now() > token.expiresAt);

// Testing this function would require complex mocking of global APIs
// or would be non-deterministic.
```

---

### Accumulate Multiple Errors with Either

**Rule:** Use Either to accumulate multiple validation errors instead of failing on the first one.

**Use Cases:** domain-modeling

**Why:**

The `Effect` error channel is designed to short-circuit. The moment an `Effect` fails, the entire computation stops and the error is propagated. This is perfect for handling unrecoverable errors like a lost database connection.

However, for tasks like validating a user's input, this is poor user experience. You want to show the user all of their mistakes at once.

`Either` is the solution. Since it's a pure data structure, you can run multiple checks that each return an `Either`, and then combine the results to accumulate all the `Left` (error) values. The `Effect/Schema` module uses this pattern internally to provide powerful error accumulation.

---

**Good Example:**

Using `Schema.decode` with the `allErrors: true` option demonstrates this pattern perfectly. The underlying mechanism uses `Either` to collect all parsing errors into an array instead of stopping at the first one.

```typescript
import { Effect, Schema, Data, Either } from "effect";

// Define validation error type
class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Define user type
type User = {
  name: string;
  email: string;
};

// Define schema with custom validation
const UserSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(3),
    Schema.filter((name) => /^[A-Za-z\s]+$/.test(name), {
      message: () => "name must contain only letters and spaces",
    })
  ),
  email: Schema.String.pipe(
    Schema.pattern(/@/),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "email must be a valid email address",
    })
  ),
});

// Example inputs
const invalidInputs: User[] = [
  {
    name: "Al", // Too short
    email: "bob-no-at-sign.com", // Invalid pattern
  },
  {
    name: "John123", // Contains numbers
    email: "john@incomplete", // Invalid email
  },
  {
    name: "Alice Smith", // Valid
    email: "alice@example.com", // Valid
  },
];

// Validate a single user
const validateUser = (input: User) =>
  Effect.gen(function* () {
    const result = yield* Schema.decode(UserSchema)(input, { errors: "all" });
    return result;
  });

// Process multiple users and accumulate all errors
const program = Effect.gen(function* () {
  yield* Effect.log("Validating users...\n");

  for (const input of invalidInputs) {
    const result = yield* Effect.either(validateUser(input));

    yield* Effect.log(`Validating user: ${input.name} <${input.email}>`);

    // Handle success and failure cases separately for clarity
    // Using Either.match which is the idiomatic way to handle Either values
    yield* Either.match(result, {
      onLeft: (error) =>
        Effect.gen(function* () {
          yield* Effect.log("❌ Validation failed:");
          yield* Effect.log(error.message);
          yield* Effect.log(""); // Empty line for readability
        }),
      onRight: (user) =>
        Effect.gen(function* () {
          yield* Effect.log(`✅ User is valid: ${JSON.stringify(user)}`);
          yield* Effect.log(""); // Empty line for readability
        }),
    });
  }
});

// Run the program
Effect.runSync(program);
```

---

**Anti-Pattern:**

Using `Effect`'s error channel for validation that requires multiple error messages. The code below will only ever report the first error it finds, because `Effect.fail` short-circuits the entire `Effect.gen` block.

```typescript
import { Effect } from "effect";

const validateWithEffect = (input: { name: string; email: string }) =>
  Effect.gen(function* () {
    if (input.name.length < 3) {
      // The program will fail here and never check the email.
      return yield* Effect.fail("Name is too short.");
    }
    if (!input.email.includes("@")) {
      return yield* Effect.fail("Email is invalid.");
    }
    return yield* Effect.succeed(input);
  });
```

---

### Add Custom Metrics to Your Application

**Rule:** Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

**Use Cases:** observability

**Why:**

While logs are for events and traces are for requests, metrics are for aggregation. They provide a high-level, numerical view of your system's health over time, which is perfect for building dashboards and setting up alerts.

Effect's `Metric` module provides a simple, declarative way to add this instrumentation. By defining your metrics upfront, you can then use operators like `Metric.increment` or `Effect.timed` to update them. This is fully integrated with Effect's context system, allowing you to provide different metric backends (like Prometheus or StatsD) via a `Layer`.

This allows you to answer questions like:

- "What is our user sign-up rate over the last 24 hours?"
- "Are we approaching our maximum number of database connections?"
- "What is the 95th percentile latency for our API requests?"

---

**Good Example:**

This example creates a counter to track how many times a user is created and a histogram to track the duration of the database operation.

```typescript
import { Effect, Metric, Duration } from "effect"; // We don't need MetricBoundaries anymore

// 1. Define your metrics
const userRegisteredCounter = Metric.counter("users_registered_total", {
  description: "A counter for how many users have been registered.",
});

const dbDurationTimer = Metric.timer(
  "db_operation_duration",
  "A timer for DB operation durations"
);

// 2. Simulated database call
const saveUserToDb = Effect.succeed("user saved").pipe(
  Effect.delay(Duration.millis(Math.random() * 100))
);

// 3. Instrument the business logic
const createUser = Effect.gen(function* () {
  // Time the operation
  yield* saveUserToDb.pipe(Metric.trackDuration(dbDurationTimer));

  // Increment the counter
  yield* Metric.increment(userRegisteredCounter);

  return { status: "success" };
});

// Run the Effect
const programWithLogging = Effect.gen(function* () {
  const result = yield* createUser;
  yield* Effect.log(`Result: ${JSON.stringify(result)}`);
  return result;
});

Effect.runPromise(programWithLogging);
```

---

**Anti-Pattern:**

Not adding any metrics to your application. Without metrics, you are flying blind. You have no high-level overview of your application's health, performance, or business KPIs. You can't build dashboards, you can't set up alerts for abnormal behavior (e.g., "error rate is too high"), and you are forced to rely on digging through logs to
understand the state of your system.

---

### Add Custom Metrics to Your Application

**Rule:** Use Effect's Metric module to define and update custom metrics for business and performance monitoring.

**Use Cases:** observability

**Why:**

Metrics provide quantitative insight into your application's behavior and performance.  
By instrumenting your code with metrics, you can monitor key events, detect anomalies, and drive business decisions.

**Good Example:**

```typescript
import { Effect, Metric } from "effect";

// Define a counter metric for processed jobs
const jobsProcessed = Metric.counter("jobs_processed");

// Increment the counter when a job is processed
const processJob = Effect.gen(function* () {
  // ... process the job
  yield* Effect.log("Job processed");
  yield* Metric.increment(jobsProcessed);
});

// Define a gauge for current active users
const activeUsers = Metric.gauge("active_users");

// Update the gauge when users sign in or out
const userSignedIn = Metric.set(activeUsers, 1); // Set to 1 (simplified example)
const userSignedOut = Metric.set(activeUsers, 0); // Set to 0 (simplified example)

// Define a histogram for request durations
const requestDuration = Metric.histogram("request_duration", [
  0.1, 0.5, 1, 2, 5,
] as any); // boundaries in seconds

// Record a request duration
const recordDuration = (duration: number) =>
  Metric.update(requestDuration, duration);
```

**Explanation:**

- `Metric.counter` tracks counts of events.
- `Metric.gauge` tracks a value that can go up or down (e.g., active users).
- `Metric.histogram` tracks distributions (e.g., request durations).
- `Effect.updateMetric` updates the metric in your workflow.

**Anti-Pattern:**

Relying solely on logs for monitoring, or using ad-hoc counters and variables that are not integrated with your observability stack.

---

### Add Rate Limiting to APIs

**Rule:** Use a rate limiter service to enforce request quotas per client.

**Use Cases:** building-apis

**Why:**

Rate limiting protects your API:

1. **Prevent abuse** - Stop malicious flooding
2. **Fair usage** - Share resources among clients
3. **Cost control** - Limit expensive operations
4. **Stability** - Prevent cascading failures

---

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

---

### Add Timeouts to HTTP Requests

**Rule:** Always set timeouts on HTTP requests to ensure your application doesn't hang.

**Use Cases:** making-http-requests

**Why:**

HTTP requests can hang indefinitely:

1. **Server issues** - Unresponsive servers
2. **Network problems** - Packets lost
3. **Slow responses** - Large payloads
4. **Resource leaks** - Connections never closed

Timeouts prevent these from blocking your application.

---

**Good Example:**

```typescript
import { Effect, Duration, Data } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Basic request timeout
// ============================================

const fetchWithTimeout = (url: string, timeout: Duration.DurationInput) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.timeout(timeout)
    )
    // Returns Option<A> - None if timed out
  })

// ============================================
// 2. Timeout with custom error
// ============================================

class RequestTimeoutError extends Data.TaggedError("RequestTimeoutError")<{
  readonly url: string
  readonly timeout: Duration.Duration
}> {}

const fetchWithTimeoutError = (url: string, timeout: Duration.DurationInput) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.timeoutFail({
        duration: timeout,
        onTimeout: () => new RequestTimeoutError({
          url,
          timeout: Duration.decode(timeout),
        }),
      })
    )
  })

// ============================================
// 3. Different timeouts for different phases
// ============================================

const fetchWithPhasedTimeouts = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    // Connection timeout (initial)
    const response = yield* client.get(url).pipe(
      Effect.timeout("5 seconds"),
      Effect.flatten,
      Effect.mapError(() => new Error("Connection timeout"))
    )

    // Read timeout (body)
    const body = yield* HttpClientResponse.text(response).pipe(
      Effect.timeout("30 seconds"),
      Effect.flatten,
      Effect.mapError(() => new Error("Read timeout"))
    )

    return body
  })

// ============================================
// 4. Timeout with fallback
// ============================================

interface ApiResponse {
  data: unknown
  cached: boolean
}

const fetchWithFallback = (url: string): Effect.Effect<ApiResponse> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.map((data) => ({ data, cached: false })),
      Effect.timeout("5 seconds"),
      Effect.flatMap((result) =>
        result._tag === "Some"
          ? Effect.succeed(result.value)
          : Effect.succeed({ data: null, cached: true })  // Fallback
      )
    )
  })

// ============================================
// 5. Timeout with interrupt
// ============================================

const fetchWithInterrupt = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.interruptible,
      Effect.timeout("10 seconds")
    )
    // Fiber is interrupted if timeout, freeing resources
  })

// ============================================
// 6. Configurable timeout wrapper
// ============================================

interface TimeoutConfig {
  readonly connect: Duration.DurationInput
  readonly read: Duration.DurationInput
  readonly total: Duration.DurationInput
}

const defaultTimeouts: TimeoutConfig = {
  connect: "5 seconds",
  read: "30 seconds",
  total: "60 seconds",
}

const createHttpClient = (config: TimeoutConfig = defaultTimeouts) =>
  Effect.gen(function* () {
    const baseClient = yield* HttpClient.HttpClient

    return {
      get: (url: string) =>
        baseClient.get(url).pipe(
          Effect.timeout(config.connect),
          Effect.flatten,
          Effect.flatMap((r) =>
            HttpClientResponse.json(r).pipe(
              Effect.timeout(config.read),
              Effect.flatten
            )
          ),
          Effect.timeout(config.total),
          Effect.flatten
        ),
    }
  })

// ============================================
// 7. Usage
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("Fetching with timeout...")

  const result = yield* fetchWithTimeoutError(
    "https://api.example.com/slow",
    "5 seconds"
  ).pipe(
    Effect.catchTag("RequestTimeoutError", (error) =>
      Effect.gen(function* () {
        yield* Effect.log(`Request to ${error.url} timed out`)
        return { error: "timeout" }
      })
    )
  )

  yield* Effect.log(`Result: ${JSON.stringify(result)}`)
})
```

---

### Automatically Retry Failed Operations

**Rule:** Compose a Stream with the .retry(Schedule) operator to automatically recover from transient failures.

**Use Cases:** building-data-pipelines

**Why:**

Real-world systems are unreliable. Network connections drop, APIs return temporary `503` errors, and databases can experience deadlocks. A naive pipeline will fail completely on the first sign of trouble. A resilient pipeline, however, can absorb these transient errors and heal itself.

The `retry` operator, combined with the `Schedule` module, provides a powerful and declarative way to build this resilience:

1.  **Declarative Resilience**: Instead of writing complex `try/catch` loops with manual delay logic, you declaratively state _how_ the pipeline should retry. For example, "retry 3 times, with an exponential backoff starting at 100ms."
2.  **Separation of Concerns**: Your core pipeline logic remains focused on the "happy path." The retry strategy is a separate, composable concern that you apply to the entire stream.
3.  **Rich Scheduling Policies**: `Schedule` is incredibly powerful. You can create schedules based on a fixed number of retries, exponential backoff, jitter (to avoid thundering herd problems), or even combinations of these.
4.  **Prevents Cascading Failures**: By handling temporary issues at the source, you prevent a small, transient glitch from causing a complete failure of your entire application.

---

**Good Example:**

This example simulates an API that fails the first two times it's called. The stream processes a list of IDs, and the `retry` operator ensures that the failing operation for `id: 2` is automatically retried until it succeeds.

```typescript
import { Effect, Stream, Schedule } from "effect";

// A mock function that simulates a flaky API call
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    yield* Effect.log(`Attempting to process item ${id}...`);

    // Item 2 fails on first attempt but succeeds on retry
    if (id === 2) {
      const random = Math.random();
      if (random < 0.5) {
        // 50% chance of failure for demonstration
        yield* Effect.log(`Item ${id} failed, will retry...`);
        return yield* Effect.fail(new Error("API is temporarily down"));
      }
    }

    yield* Effect.log(`✅ Successfully processed item ${id}`);
    return `Processed item ${id}`;
  });

const ids = [1, 2, 3];

// Define a retry policy: 3 attempts with a fixed 100ms delay
const retryPolicy = Schedule.recurs(3).pipe(
  Schedule.addDelay(() => "100 millis")
);

const program = Effect.gen(function* () {
  yield* Effect.log("=== Stream Retry on Failure Demo ===");
  yield* Effect.log(
    "Processing items with retry policy (3 attempts, 100ms delay)"
  );

  // Process each item individually with retry
  const results = yield* Effect.forEach(
    ids,
    (id) =>
      processItem(id).pipe(
        Effect.retry(retryPolicy),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(
              `❌ Item ${id} failed after all retries: ${error.message}`
            );
            return `Failed: item ${id}`;
          })
        )
      ),
    { concurrency: 1 }
  );

  yield* Effect.log("=== Results ===");
  for (let index = 0; index < results.length; index++) {
    yield* Effect.log(`Item ${ids[index]}: ${results[index]}`);
  }

  yield* Effect.log("✅ Stream processing completed");
});

Effect.runPromise(program).catch((error) => {
  Effect.runSync(Effect.logError("Unexpected error: " + error));
});
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
```

**Anti-Pattern:**

The anti-pattern is to either have no retry logic at all, or to write manual, imperative retry loops inside your processing function.

```typescript
import { Effect, Stream } from "effect";
// ... same mock processItem function ...

const ids = [1, 2, 3];

const program = Stream.fromIterable(ids).pipe(
  // No retry logic. The entire stream will fail when item 2 fails.
  Stream.mapEffect(processItem, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program).catch((error) => {
  console.error("Pipeline failed:", error);
});
/*
Output:
... level=INFO msg="Attempting to process item 1..."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 1."
Pipeline failed: Error: API is temporarily down
*/
```

This "fail-fast" approach is brittle. A single, temporary network blip would cause the entire pipeline to terminate, even if subsequent items could have been processed successfully. While manual retry logic inside `processItem` is possible, it pollutes the core logic with concerns about timing and attempt counting, and is far less composable and reusable than a `Schedule`.

---

### Avoid Long Chains of .andThen; Use Generators Instead

**Rule:** Prefer generators over long chains of .andThen.

**Use Cases:** domain-modeling

**Why:**

`Effect.gen` provides a flat, linear code structure that is easier to read and
debug than deeply nested functional chains.

**Good Example:**

```typescript
import { Effect } from "effect";

// Define our steps with logging
const step1 = (): Effect.Effect<number> =>
  Effect.succeed(42).pipe(Effect.tap((n) => Effect.log(`Step 1: ${n}`)));

const step2 = (a: number): Effect.Effect<string> =>
  Effect.succeed(`Result: ${a * 2}`).pipe(
    Effect.tap((s) => Effect.log(`Step 2: ${s}`))
  );

// Using Effect.gen for better readability
const program = Effect.gen(function* () {
  const a = yield* step1();
  const b = yield* step2(a);
  return b;
});

// Run the program
const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Final result: ${result}`);
  return result;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
Generators keep sequential logic readable and easy to maintain.

**Anti-Pattern:**

```typescript
import { Effect } from "effect";
declare const step1: () => Effect.Effect<any>;
declare const step2: (a: any) => Effect.Effect<any>;

step1().pipe(Effect.flatMap((a) => step2(a))); // Or .andThen
```

Chaining many `.flatMap` or `.andThen` calls leads to deeply nested,
hard-to-read code.

---

### Beyond the Date Type - Real World Dates, Times, and Timezones

**Rule:** Use the Clock service for testable time-based logic and immutable primitives for timestamps.

**Use Cases:** core-concepts

**Why:**

JavaScript's native `Date` object is a common source of bugs. It is mutable, its behavior can be inconsistent across different JavaScript environments (especially with timezones), and its reliance on the system clock makes time-dependent logic difficult to test.

Effect's approach solves these problems:

- The **`Clock` service** abstracts away the concept of "now." In production, the `Live` clock uses the system time. In tests, you can provide a `TestClock` that gives you complete, deterministic control over the passage of time.
- Using **primitive `number` or `string`** for timestamps ensures immutability and makes your data easy to serialize, store, and transfer.

This makes your time-based logic pure, predictable, and easy to test.

---

**Good Example:**

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

**Anti-Pattern:**

Directly using `Date.now()` or `new Date()` inside your effects. This introduces impurity and makes your logic dependent on the actual system clock, rendering it non-deterministic and difficult to test.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This function is impure and not reliably testable.
const createEventUnsafely = (message: string): Effect.Effect<any> =>
  Effect.sync(() => ({
    message,
    timestamp: Date.now(), // Direct call to a system API
  }));

// How would you test that this function assigns the correct timestamp
// without manipulating the system clock or using complex mocks?
```

---

### Cache HTTP Responses

**Rule:** Use an in-memory or persistent cache to store HTTP responses.

**Use Cases:** making-http-requests

**Why:**

Caching provides:

1. **Performance** - Avoid redundant network calls
2. **Cost reduction** - Fewer API calls
3. **Resilience** - Serve stale data when API is down
4. **Rate limit safety** - Stay under quotas

---

**Good Example:**

```typescript
import { Effect, Ref, HashMap, Option, Duration } from "effect"
import { HttpClient, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Simple in-memory cache
// ============================================

interface CacheEntry<T> {
  readonly data: T
  readonly timestamp: number
  readonly ttl: number
}

const makeCache = <T>() =>
  Effect.gen(function* () {
    const store = yield* Ref.make(HashMap.empty<string, CacheEntry<T>>())

    const get = (key: string): Effect.Effect<Option.Option<T>> =>
      Ref.get(store).pipe(
        Effect.map((map) => {
          const entry = HashMap.get(map, key)
          if (entry._tag === "None") return Option.none()

          const now = Date.now()
          if (now > entry.value.timestamp + entry.value.ttl) {
            return Option.none()  // Expired
          }
          return Option.some(entry.value.data)
        })
      )

    const set = (key: string, data: T, ttl: number): Effect.Effect<void> =>
      Ref.update(store, (map) =>
        HashMap.set(map, key, {
          data,
          timestamp: Date.now(),
          ttl,
        })
      )

    const invalidate = (key: string): Effect.Effect<void> =>
      Ref.update(store, (map) => HashMap.remove(map, key))

    const clear = (): Effect.Effect<void> =>
      Ref.set(store, HashMap.empty())

    return { get, set, invalidate, clear }
  })

// ============================================
// 2. Cached HTTP client
// ============================================

interface CachedHttpClient {
  readonly get: <T>(
    url: string,
    options?: { ttl?: Duration.DurationInput }
  ) => Effect.Effect<T, Error>
  readonly invalidate: (url: string) => Effect.Effect<void>
}

const makeCachedHttpClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient
  const cache = yield* makeCache<unknown>()

  const client: CachedHttpClient = {
    get: <T>(url: string, options?: { ttl?: Duration.DurationInput }) => {
      const ttl = options?.ttl ? Duration.toMillis(Duration.decode(options.ttl)) : 60000

      return Effect.gen(function* () {
        // Check cache first
        const cached = yield* cache.get(url)
        if (Option.isSome(cached)) {
          yield* Effect.log(`Cache hit: ${url}`)
          return cached.value as T
        }

        yield* Effect.log(`Cache miss: ${url}`)

        // Fetch from network
        const response = yield* httpClient.get(url)
        const data = yield* HttpClientResponse.json(response) as Effect.Effect<T>

        // Store in cache
        yield* cache.set(url, data, ttl)

        return data
      })
    },

    invalidate: (url) => cache.invalidate(url),
  }

  return client
})

// ============================================
// 3. Stale-while-revalidate pattern
// ============================================

interface SWRCache<T> {
  readonly data: T
  readonly timestamp: number
  readonly staleAfter: number
  readonly expireAfter: number
}

const makeSWRClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient
  const cache = yield* Ref.make(HashMap.empty<string, SWRCache<unknown>>())

  return {
    get: <T>(
      url: string,
      options: {
        staleAfter: Duration.DurationInput
        expireAfter: Duration.DurationInput
      }
    ) =>
      Effect.gen(function* () {
        const now = Date.now()
        const staleMs = Duration.toMillis(Duration.decode(options.staleAfter))
        const expireMs = Duration.toMillis(Duration.decode(options.expireAfter))

        const cached = yield* Ref.get(cache).pipe(
          Effect.map((map) => HashMap.get(map, url))
        )

        if (cached._tag === "Some") {
          const entry = cached.value
          const age = now - entry.timestamp

          if (age < staleMs) {
            // Fresh - return immediately
            return entry.data as T
          }

          if (age < expireMs) {
            // Stale - return cached, revalidate in background
            yield* Effect.fork(
              httpClient.get(url).pipe(
                Effect.flatMap((r) => HttpClientResponse.json(r)),
                Effect.flatMap((data) =>
                  Ref.update(cache, (map) =>
                    HashMap.set(map, url, {
                      data,
                      timestamp: Date.now(),
                      staleAfter: staleMs,
                      expireAfter: expireMs,
                    })
                  )
                ),
                Effect.catchAll(() => Effect.void)  // Ignore errors
              )
            )
            return entry.data as T
          }
        }

        // Expired or missing - fetch fresh
        const response = yield* httpClient.get(url)
        const data = yield* HttpClientResponse.json(response) as Effect.Effect<T>

        yield* Ref.update(cache, (map) =>
          HashMap.set(map, url, {
            data,
            timestamp: now,
            staleAfter: staleMs,
            expireAfter: expireMs,
          })
        )

        return data
      }),
  }
})

// ============================================
// 4. Cache with request deduplication
// ============================================

const makeDeduplicatedClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient
  const inFlight = yield* Ref.make(HashMap.empty<string, Effect.Effect<unknown>>())
  const cache = yield* makeCache<unknown>()

  return {
    get: <T>(url: string, ttl: number = 60000) =>
      Effect.gen(function* () {
        // Check cache
        const cached = yield* cache.get(url)
        if (Option.isSome(cached)) {
          return cached.value as T
        }

        // Check if request already in flight
        const pending = yield* Ref.get(inFlight).pipe(
          Effect.map((map) => HashMap.get(map, url))
        )

        if (pending._tag === "Some") {
          yield* Effect.log(`Deduplicating request: ${url}`)
          return (yield* pending.value) as T
        }

        // Make the request
        const request = httpClient.get(url).pipe(
          Effect.flatMap((r) => HttpClientResponse.json(r)),
          Effect.tap((data) => cache.set(url, data, ttl)),
          Effect.ensuring(
            Ref.update(inFlight, (map) => HashMap.remove(map, url))
          )
        )

        // Store in-flight request
        yield* Ref.update(inFlight, (map) => HashMap.set(map, url, request))

        return (yield* request) as T
      }),
  }
})

// ============================================
// 5. Usage
// ============================================

const program = Effect.gen(function* () {
  const client = yield* makeCachedHttpClient

  // First call - cache miss
  yield* client.get("https://api.example.com/users/1", { ttl: "5 minutes" })

  // Second call - cache hit
  yield* client.get("https://api.example.com/users/1")

  // Invalidate when data changes
  yield* client.invalidate("https://api.example.com/users/1")
})
```

---

### Compose API Middleware

**Rule:** Use Effect composition to build a middleware pipeline that processes requests.

**Use Cases:** building-apis

**Why:**

Middleware provides separation of concerns:

1. **Reusability** - Write once, apply everywhere
2. **Composability** - Stack multiple middlewares
3. **Testability** - Test each middleware in isolation
4. **Clarity** - Handlers focus on business logic

---

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

---

### Compose Resource Lifecycles with `Layer.merge`

**Rule:** Compose multiple scoped layers using `Layer.merge` or by providing one layer to another.

**Use Cases:** resource-management

**Why:**

This pattern is the ultimate payoff for defining services with `Layer`. It allows for true modularity. Each service can be defined in its own file, declaring its own resource requirements in its `Live` layer, completely unaware of other services.

When you assemble the final application layer, Effect analyzes the dependencies:

1.  **Acquisition Order:** It ensures resources are acquired in the correct order. For example, a `Logger` layer might be initialized before a `Database` layer that uses it for logging.
2.  **Release Order:** It guarantees that resources are released in the **exact reverse order** of their acquisition. This is critical for preventing shutdown errors, such as a `UserRepository` trying to log a final message after the `Logger` has already been shut down.

This automates one of the most complex and error-prone parts of application architecture.

**Good Example:**

```typescript
import { Effect, Layer, Console } from "effect";

// --- Service 1: Database ---
interface DatabaseOps {
  query: (sql: string) => Effect.Effect<string, never, never>;
}

class Database extends Effect.Service<DatabaseOps>()("Database", {
  sync: () => ({
    query: (sql: string): Effect.Effect<string, never, never> =>
      Effect.sync(() => `db says: ${sql}`),
  }),
}) {}

// --- Service 2: API Client ---
interface ApiClientOps {
  fetch: (path: string) => Effect.Effect<string, never, never>;
}

class ApiClient extends Effect.Service<ApiClientOps>()("ApiClient", {
  sync: () => ({
    fetch: (path: string): Effect.Effect<string, never, never> =>
      Effect.sync(() => `api says: ${path}`),
  }),
}) {}

// --- Application Layer ---
// We merge the two independent layers into one.
const AppLayer = Layer.merge(Database.Default, ApiClient.Default);

// This program uses both services, unaware of their implementation details.
const program = Effect.gen(function* () {
  const db = yield* Database;
  const api = yield* ApiClient;

  const dbResult = yield* db.query("SELECT *");
  const apiResult = yield* api.fetch("/users");

  yield* Effect.log(dbResult);
  yield* Effect.log(apiResult);
});

// Provide the combined layer to the program.
Effect.runPromise(Effect.provide(program, AppLayer));

/*
Output (note the LIFO release order):
Database pool opened
API client session started
db says: SELECT *
api says: /users
API client session ended
Database pool closed
*/
```

**Explanation:**
We define two completely independent services, `Database` and `ApiClient`, each with its own resource lifecycle. By combining them with `Layer.merge`, we create a single `AppLayer`. When `program` runs, Effect acquires the resources for both layers. When `program` finishes, Effect closes the application's scope, releasing the resources in the reverse order they were acquired (`ApiClient` then `Database`), ensuring a clean and predictable shutdown.

**Anti-Pattern:**

A manual, imperative startup and shutdown script. This approach is brittle and error-prone. The developer is responsible for maintaining the correct order of initialization and, more importantly, the reverse order for shutdown. This becomes unmanageable as an application grows.

```typescript
// ANTI-PATTERN: Manual, brittle, and error-prone
async function main() {
  const db = await initDb(); // acquire 1
  const client = await initApiClient(); // acquire 2

  try {
    await doWork(db, client); // use
  } finally {
    // This order is easy to get wrong!
    await client.close(); // release 2
    await db.close(); // release 1
  }
}
```

---

### Concurrency Pattern 1: Coordinate Async Operations with Deferred

**Rule:** Use Deferred for one-time async coordination between fibers, enabling multiple consumers to wait for a single producer's result.

**Use Cases:** concurrency

**Why:**

Many concurrent systems need to coordinate on events:

- **Service initialization**: Wait for all services to start before accepting requests
- **Data availability**: Wait for initial data load before processing
- **External events**: Wait for webhook, signal, or message
- **Startup gates**: All workers wait for leader to signal start

Without Deferred:

- Polling wastes CPU (check repeatedly)
- Callbacks become complex (multiple consumers)
- No clean semantics for "wait for this one thing"
- Error propagation unclear

With Deferred:

- Non-blocking wait (fiber suspends)
- One fiber produces, many consume
- Clear completion or failure
- Efficient wakeup when ready

---

**Good Example:**

This example demonstrates a service startup pattern where multiple workers wait for initialization to complete before starting processing.

```typescript
import { Effect, Deferred, Fiber } from "effect";

interface ServiceConfig {
  readonly name: string;
  readonly port: number;
}

interface Service {
  readonly name: string;
  readonly isReady: Deferred.Deferred<void>;
}

// Simulate a service that takes time to initialize
const createService = (config: ServiceConfig): Effect.Effect<Service> =>
  Effect.gen(function* () {
    const isReady = yield* Deferred.make<void>();

    return { name: config.name, isReady };
  });

// Initialize the service (runs in background)
const initializeService = (service: Service): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[${service.name}] Starting initialization...`);

    // Simulate initialization work
    yield* Effect.sleep("1 second");

    yield* Effect.log(`[${service.name}] Initialization complete`);

    // Signal that service is ready
    yield* Deferred.succeed(service.isReady, undefined);
  });

// A worker that waits for service to be ready before starting
const createWorker = (
  id: number,
  services: Service[]
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[Worker ${id}] Starting, waiting for services...`);

    // Wait for all services to be ready
    yield* Effect.all(
      services.map((service) =>
        Deferred.await(service.isReady).pipe(
          Effect.tapError((error) =>
            Effect.log(
              `[Worker ${id}] Error waiting for ${service.name}: ${error}`
            )
          )
        )
      )
    );

    yield* Effect.log(`[Worker ${id}] All services ready, starting work`);

    // Simulate worker processing
    for (let i = 0; i < 3; i++) {
      yield* Effect.sleep("500 millis");
      yield* Effect.log(`[Worker ${id}] Processing task ${i + 1}`);
    }

    yield* Effect.log(`[Worker ${id}] Complete`);
  });

// Main program
const program = Effect.gen(function* () {
  // Create services
  const apiService = yield* createService({ name: "API", port: 3000 });
  const dbService = yield* createService({ name: "Database", port: 5432 });
  const cacheService = yield* createService({ name: "Cache", port: 6379 });

  const services = [apiService, dbService, cacheService];

  // Start initializing services in background
  const initFibers = yield* Effect.all(
    services.map((service) => initializeService(service).pipe(Effect.fork))
  );

  // Start workers that wait for services
  const workerFibers = yield* Effect.all(
    [1, 2, 3].map((id) => createWorker(id, services).pipe(Effect.fork))
  );

  // Wait for all workers to complete
  yield* Effect.all(workerFibers.map((fiber) => Fiber.join(fiber)));

  // Cancel initialization fibers (they're done anyway)
  yield* Effect.all(initFibers.map((fiber) => Fiber.interrupt(fiber)));

  yield* Effect.log(`\n[MAIN] All workers completed`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates Deferred instances** for each service's readiness
2. **Starts initialization** in background fibers
3. **Workers wait** for all services via `Deferred.await`
4. **Service signals completion** via `Deferred.succeed`
5. **Workers resume** when all dependencies ready

---

---

### Concurrency Pattern 2: Rate Limit Concurrent Access with Semaphore

**Rule:** Use Semaphore to limit concurrent access to resources, preventing overload and enabling fair resource distribution.

**Use Cases:** concurrency

**Why:**

Resource constraints require limiting concurrency:

- **Connection pools**: Database limited to N connections
- **API rate limits**: Service allows only M requests per second
- **Memory limits**: Large operations can't all run simultaneously
- **CPU constraints**: Too many threads waste cycles on context switching
- **Backpressure**: Prevent downstream from being overwhelmed

Without Semaphore:

- All operations run simultaneously, exhausting resources
- Connection pool overflows, requests fail
- Memory pressure causes garbage collection pauses
- No fair ordering (first-come-first-served)

With Semaphore:

- Fixed concurrency limit
- Fair queuing of waiting operations
- Backpressure naturally flows upstream
- Clear ownership of permits

---

**Good Example:**

This example demonstrates limiting concurrent database connections using a Semaphore, preventing connection pool exhaustion.

```typescript
import { Effect, Semaphore, Fiber } from "effect";

interface QueryResult {
  readonly id: number;
  readonly result: string;
  readonly duration: number;
}

// Simulate a database query that holds a connection
const executeQuery = (
  queryId: number,
  connectionId: number,
  durationMs: number
): Effect.Effect<QueryResult> =>
  Effect.gen(function* () {
    const startTime = Date.now();

    yield* Effect.log(
      `[Query ${queryId}] Using connection ${connectionId}, duration: ${durationMs}ms`
    );

    // Simulate query execution
    yield* Effect.sleep(`${durationMs} millis`);

    const duration = Date.now() - startTime;

    return {
      id: queryId,
      result: `Result from query ${queryId}`,
      duration,
    };
  });

// Pool configuration
interface ConnectionPoolConfig {
  readonly maxConnections: number;
  readonly queryTimeout?: number;
}

// Create a rate-limited query executor
const createRateLimitedQueryExecutor = (
  config: ConnectionPoolConfig
): Effect.Effect<
  (queryId: number, durationMs: number) => Effect.Effect<QueryResult>
> =>
  Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(config.maxConnections);
    let connectionCounter = 0;

    return (queryId: number, durationMs: number) =>
      Effect.gen(function* () {
        // Acquire a permit (wait if none available)
        yield* Semaphore.acquire(semaphore);

        const connectionId = ++connectionCounter;

        // Use try-finally to ensure permit is released
        const result = yield* executeQuery(queryId, connectionId, durationMs).pipe(
          Effect.ensuring(
            Semaphore.release(semaphore).pipe(
              Effect.tap(() =>
                Effect.log(`[Query ${queryId}] Released connection ${connectionId}`)
              )
            )
          )
        );

        return result;
      });
  });

// Simulate multiple queries arriving
const program = Effect.gen(function* () {
  const executor = yield* createRateLimitedQueryExecutor({
    maxConnections: 3, // Only 3 concurrent connections
  });

  // Generate 10 queries with varying durations
  const queries = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    duration: 500 + Math.random() * 1500, // 500-2000ms
  }));

  console.log(`\n[POOL] Starting with max 3 concurrent connections\n`);

  // Execute all queries with concurrency limit
  const results = yield* Effect.all(
    queries.map((q) =>
      executor(q.id, Math.round(q.duration)).pipe(Effect.fork)
    )
  ).pipe(
    Effect.andThen((fibers) =>
      Effect.all(fibers.map((fiber) => Fiber.join(fiber)))
    )
  );

  console.log(`\n[POOL] All queries completed\n`);

  // Summary
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;

  console.log(`[SUMMARY]`);
  console.log(`  Total queries: ${results.length}`);
  console.log(`  Avg duration: ${Math.round(avgDuration)}ms`);
  console.log(`  Total time: ${Math.max(...results.map((r) => r.duration))}ms (parallel)`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates a Semaphore** with fixed permit count
2. **Acquires permit** before using connection
3. **Executes operation** while holding permit
4. **Releases permit** in finally block (guaranteed)
5. **Fair queuing** of waiting queries

---

---

### Concurrency Pattern 3: Coordinate Multiple Fibers with Latch

**Rule:** Use Latch to coordinate multiple fibers awaiting a common completion signal, enabling fan-out/fan-in and barrier synchronization patterns.

**Use Cases:** concurrency

**Why:**

Multi-fiber coordination requires synchronization:

- **Parallel initialization**: Wait for all services to start before proceeding
- **Fan-out/fan-in**: Spawn multiple workers, collect results when all done
- **Barrier synchronization**: All fibers wait at a checkpoint before proceeding
- **Graceful shutdown**: Wait for all active fibers to complete
- **Aggregation patterns**: Process streams in parallel, combine when ready

Unlike `Deferred` (one producer signals once), `Latch`:

- Supports multiple signalers (each `countDown()`)
- Used with known count of participants (countdown from N to 0)
- Enables barrier patterns (all wait for all)
- Fair queuing of waiting fibers

---

**Good Example:**

This example demonstrates a fan-out/fan-in pattern: spawn 5 worker fibers that process tasks in parallel, and coordinate to know when all are complete.

```typescript
import { Effect, Latch, Fiber, Ref } from "effect";

interface WorkResult {
  readonly workerId: number;
  readonly taskId: number;
  readonly result: string;
  readonly duration: number;
}

// Simulate a long-running task
const processTask = (
  workerId: number,
  taskId: number
): Effect.Effect<WorkResult> =>
  Effect.gen(function* () {
    const startTime = Date.now();
    const duration = 100 + Math.random() * 400; // 100-500ms

    yield* Effect.log(
      `[Worker ${workerId}] Starting task ${taskId} (duration: ${Math.round(duration)}ms)`
    );

    yield* Effect.sleep(`${Math.round(duration)} millis`);

    const elapsed = Date.now() - startTime;

    yield* Effect.log(
      `[Worker ${workerId}] ✓ Completed task ${taskId} in ${elapsed}ms`
    );

    return {
      workerId,
      taskId,
      result: `Result from worker ${workerId} on task ${taskId}`,
      duration: elapsed,
    };
  });

// Fan-out/Fan-in with Latch
const fanOutFanIn = Effect.gen(function* () {
  const numWorkers = 5;
  const tasksPerWorker = 3;

  // Create latch: will countdown from (numWorkers) when all workers complete
  const workersCompleteLatch = yield* Latch.make(numWorkers);

  // Track results from all workers
  const results = yield* Ref.make<WorkResult[]>([]);

  // Worker fiber that processes tasks sequentially
  const createWorker = (workerId: number) =>
    Effect.gen(function* () {
      try {
        yield* Effect.log(`[Worker ${workerId}] ▶ Starting`);

        // Process multiple tasks
        for (let i = 1; i <= tasksPerWorker; i++) {
          const result = yield* processTask(workerId, i);
          yield* Ref.update(results, (rs) => [...rs, result]);
        }

        yield* Effect.log(`[Worker ${workerId}] ✓ All tasks completed`);
      } finally {
        // Signal completion to latch
        yield* Latch.countDown(workersCompleteLatch);
        yield* Effect.log(`[Worker ${workerId}] Signaled latch`);
      }
    });

  // Spawn all workers as background fibers
  console.log(`\n[COORDINATOR] Spawning ${numWorkers} workers...\n`);

  const workerFibers = yield* Effect.all(
    Array.from({ length: numWorkers }, (_, i) =>
      createWorker(i + 1).pipe(Effect.fork)
    )
  );

  // Wait for all workers to complete
  console.log(`\n[COORDINATOR] Waiting for all workers to finish...\n`);

  yield* Latch.await(workersCompleteLatch);

  console.log(`\n[COORDINATOR] All workers completed!\n`);

  // Join all fibers to ensure cleanup
  yield* Effect.all(workerFibers.map((fiber) => Fiber.join(fiber)));

  // Aggregate results
  const allResults = yield* Ref.get(results);

  console.log(`[SUMMARY]`);
  console.log(`  Total workers: ${numWorkers}`);
  console.log(`  Tasks per worker: ${tasksPerWorker}`);
  console.log(`  Total tasks: ${allResults.length}`);
  console.log(
    `  Avg task duration: ${Math.round(
      allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length
    )}ms`
  );
});

Effect.runPromise(fanOutFanIn);
```

This pattern:

1. **Creates Latch** with count = number of workers
2. **Spawns worker fibers** as background tasks
3. **Each worker processes tasks** independently
4. **Signals Latch** when work completes (countDown)
5. **Coordinator awaits** until all workers signal
6. **Aggregates results** from all workers

---

---

### Concurrency Pattern 4: Distribute Work with Queue

**Rule:** Use Queue to distribute work between producers and consumers with built-in backpressure, enabling flexible pipeline coordination.

**Use Cases:** concurrency

**Why:**

Direct producer-consumer coordination creates problems:

- **Blocking**: Producer waits for consumer to finish
- **Tight coupling**: Producer depends on consumer speed
- **Memory pressure**: Fast producer floods memory with results
- **No backpressure**: Downstream overload propagates upstream

Queue solves these:

- **Asynchronous**: Producer enqueues and continues
- **Decoupled**: Producer/consumer independent
- **Backpressure**: Producer waits when queue full (natural flow control)
- **Throughput**: Consumer processes at own pace

Real-world example: API request handler + database writer
- **Direct**: Handler waits for DB write (blocking, slow requests)
- **Queue**: Handler enqueues write and returns immediately (responsive)

---

**Good Example:**

This example demonstrates a producer-consumer pipeline with a bounded queue for buffering work items.

```typescript
import { Effect, Queue, Fiber, Ref } from "effect";

interface WorkItem {
  readonly id: number;
  readonly data: string;
  readonly timestamp: number;
}

interface WorkResult {
  readonly itemId: number;
  readonly processed: string;
  readonly duration: number;
}

// Producer: generates work items
const producer = (
  queue: Queue.Enqueue<WorkItem>,
  count: number
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[PRODUCER] Starting, generating ${count} items`);

    for (let i = 1; i <= count; i++) {
      const item: WorkItem = {
        id: i,
        data: `Item ${i}`,
        timestamp: Date.now(),
      };

      const start = Date.now();

      // Enqueue - will block if queue is full (backpressure)
      yield* Queue.offer(queue, item);

      const delay = Date.now() - start;

      if (delay > 0) {
        yield* Effect.log(
          `[PRODUCER] Item ${i} enqueued (waited ${delay}ms due to backpressure)`
        );
      } else {
        yield* Effect.log(`[PRODUCER] Item ${i} enqueued`);
      }

      // Simulate work
      yield* Effect.sleep("50 millis");
    }

    yield* Effect.log(`[PRODUCER] ✓ All items enqueued`);
  });

// Consumer: processes work items
const consumer = (
  queue: Queue.Dequeue<WorkItem>,
  consumerId: number,
  results: Ref.Ref<WorkResult[]>
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[CONSUMER ${consumerId}] Starting`);

    while (true) {
      // Dequeue - will block if queue is empty
      const item = yield* Queue.take(queue).pipe(Effect.either);

      if (item._tag === "Left") {
        yield* Effect.log(`[CONSUMER ${consumerId}] Queue closed, stopping`);
        return;
      }

      const workItem = item.right;
      const startTime = Date.now();

      yield* Effect.log(
        `[CONSUMER ${consumerId}] Processing ${workItem.data}`
      );

      // Simulate processing
      yield* Effect.sleep("150 millis");

      const duration = Date.now() - startTime;
      const result: WorkResult = {
        itemId: workItem.id,
        processed: `${workItem.data} [processed by consumer ${consumerId}]`,
        duration,
      };

      yield* Ref.update(results, (rs) => [...rs, result]);

      yield* Effect.log(
        `[CONSUMER ${consumerId}] ✓ Completed ${workItem.data} in ${duration}ms`
      );
    }
  });

// Main: coordinate producer and consumers
const program = Effect.gen(function* () {
  // Create bounded queue with capacity 3
  const queue = yield* Queue.bounded<WorkItem>(3);
  const results = yield* Ref.make<WorkResult[]>([]);

  console.log(`\n[MAIN] Starting producer-consumer pipeline with queue size 3\n`);

  // Spawn producer
  const producerFiber = yield* producer(queue, 10).pipe(Effect.fork);

  // Spawn 2 consumers
  const consumer1 = yield* consumer(queue, 1, results).pipe(Effect.fork);
  const consumer2 = yield* consumer(queue, 2, results).pipe(Effect.fork);

  // Wait for producer to finish
  yield* Fiber.join(producerFiber);

  // Give consumers time to finish
  yield* Effect.sleep("3 seconds");

  // Close queue and wait for consumers
  yield* Queue.shutdown(queue);
  yield* Fiber.join(consumer1);
  yield* Fiber.join(consumer2);

  // Summary
  const allResults = yield* Ref.get(results);
  const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n[SUMMARY]`);
  console.log(`  Items processed: ${allResults.length}`);
  console.log(
    `  Avg processing time: ${Math.round(totalDuration / allResults.length)}ms`
  );
});

Effect.runPromise(program);
```

This pattern:

1. **Creates bounded queue** with capacity (backpressure point)
2. **Producer enqueues** items (blocks if full)
3. **Consumers dequeue** and process (each at own pace)
4. **Queue coordinates** flow automatically

---

---

### Concurrency Pattern 5: Broadcast Events with PubSub

**Rule:** Use PubSub to broadcast events to multiple subscribers, enabling event-driven architectures where publishers and subscribers are loosely coupled.

**Use Cases:** concurrency

**Why:**

Event distribution without PubSub creates coupling:

- **Direct references**: Publisher calls subscribers directly (tight coupling)
- **Ordering issues**: Publisher blocks on slowest subscriber
- **Scalability**: Adding subscribers slows down publisher
- **Testing**: Hard to mock multiple subscribers

PubSub enables:

- **Loose coupling**: Publishers emit, subscribers listen independently
- **Parallel delivery**: All subscribers notified simultaneously
- **Scalability**: Add subscribers without affecting publisher
- **Testing**: Mock single PubSub rather than all subscribers

Real-world example: System state changes
- **Direct**: StateManager calls UserNotifier, AuditLogger, MetricsCollector (tight coupling)
- **PubSub**: StateManager publishes `StateChanged` event; subscribers listen independently

---

**Good Example:**

This example demonstrates a multi-subscriber event broadcast system with independent handlers.

```typescript
import { Effect, PubSub, Fiber, Ref } from "effect";

interface StateChangeEvent {
  readonly id: string;
  readonly oldValue: string;
  readonly newValue: string;
  readonly timestamp: number;
}

interface Subscriber {
  readonly name: string;
  readonly events: StateChangeEvent[];
}

// Create subscribers that react to events
const createSubscriber = (
  name: string,
  pubsub: PubSub.PubSub<StateChangeEvent>,
  events: Ref.Ref<StateChangeEvent[]>
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[${name}] ✓ Subscribed`);

    // Get subscriber handle
    const subscription = yield* PubSub.subscribe(pubsub);

    // Listen for events indefinitely
    while (true) {
      const event = yield* subscription.take();

      yield* Effect.log(
        `[${name}] Received event: ${event.oldValue} → ${event.newValue}`
      );

      // Simulate processing
      yield* Effect.sleep("50 millis");

      // Store event (example action)
      yield* Ref.update(events, (es) => [...es, event]);

      yield* Effect.log(`[${name}] ✓ Processed event`);
    }
  });

// Publisher that broadcasts events
const publisher = (
  pubsub: PubSub.PubSub<StateChangeEvent>,
  eventCount: number
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[PUBLISHER] Starting, publishing ${eventCount} events`);

    for (let i = 1; i <= eventCount; i++) {
      const event: StateChangeEvent = {
        id: `event-${i}`,
        oldValue: `state-${i - 1}`,
        newValue: `state-${i}`,
        timestamp: Date.now(),
      };

      // Publish to all subscribers
      const size = yield* PubSub.publish(pubsub, event);

      yield* Effect.log(
        `[PUBLISHER] Published event to ${size} subscribers`
      );

      // Simulate delay between events
      yield* Effect.sleep("200 millis");
    }

    yield* Effect.log(`[PUBLISHER] ✓ All events published`);
  });

// Main: coordinate publisher and multiple subscribers
const program = Effect.gen(function* () {
  // Create PubSub with bounded capacity
  const pubsub = yield* PubSub.bounded<StateChangeEvent>(5);

  // Create storage for each subscriber's events
  const subscriber1Events = yield* Ref.make<StateChangeEvent[]>([]);
  const subscriber2Events = yield* Ref.make<StateChangeEvent[]>([]);
  const subscriber3Events = yield* Ref.make<StateChangeEvent[]>([]);

  console.log(`\n[MAIN] Starting PubSub event broadcast system\n`);

  // Subscribe 3 independent subscribers
  const sub1Fiber = yield* createSubscriber(
    "SUBSCRIBER-1",
    pubsub,
    subscriber1Events
  ).pipe(Effect.fork);

  const sub2Fiber = yield* createSubscriber(
    "SUBSCRIBER-2",
    pubsub,
    subscriber2Events
  ).pipe(Effect.fork);

  const sub3Fiber = yield* createSubscriber(
    "SUBSCRIBER-3",
    pubsub,
    subscriber3Events
  ).pipe(Effect.fork);

  // Wait for subscriptions to establish
  yield* Effect.sleep("100 millis");

  // Start publisher
  const publisherFiber = yield* publisher(pubsub, 5).pipe(Effect.fork);

  // Wait for publisher to finish
  yield* Fiber.join(publisherFiber);

  // Wait a bit for subscribers to process last events
  yield* Effect.sleep("1 second");

  // Shut down
  yield* PubSub.shutdown(pubsub);
  yield* Fiber.join(sub1Fiber).pipe(Effect.catchAll(() => Effect.void));
  yield* Fiber.join(sub2Fiber).pipe(Effect.catchAll(() => Effect.void));
  yield* Fiber.join(sub3Fiber).pipe(Effect.catchAll(() => Effect.void));

  // Print summary
  const events1 = yield* Ref.get(subscriber1Events);
  const events2 = yield* Ref.get(subscriber2Events);
  const events3 = yield* Ref.get(subscriber3Events);

  console.log(`\n[SUMMARY]`);
  console.log(`  Subscriber 1 received: ${events1.length} events`);
  console.log(`  Subscriber 2 received: ${events2.length} events`);
  console.log(`  Subscriber 3 received: ${events3.length} events`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates PubSub** for event distribution
2. **Multiple subscribers** listen independently
3. **Publisher broadcasts** events to all
4. **Each subscriber** processes at own pace

---

---

### Concurrency Pattern 6: Race and Timeout Competing Effects

**Rule:** Use race to compete effects and timeout to enforce deadlines, enabling cancellation when operations exceed time limits or complete.

**Use Cases:** concurrency

**Why:**

Without race/timeout, competing effects create issues:

- **Deadlocks**: Waiting for all to complete unnecessarily
- **Hanging requests**: No deadline enforcement
- **Wasted resources**: Slow operations continue indefinitely
- **No fallback**: Can't switch to alternative on timeout

Race/timeout enable:

- **Fastest-wins**: Take first success
- **Deadline enforcement**: Fail after time limit
- **Resource cleanup**: Cancel slower operations
- **Fallback patterns**: Alternative if primary times out

Real-world example: Multi-datacenter request
- **Without race**: Wait for slowest response
- **With race**: Get response from fastest datacenter

---

**Good Example:**

This example demonstrates racing competing effects and handling timeouts.

```typescript
import { Effect, Fiber } from "effect";

interface DataSource {
  readonly name: string;
  readonly latencyMs: number;
}

// Simulate fetching from different sources
const fetchFromSource = (source: DataSource): Effect.Effect<string> =>
  Effect.gen(function* () {
    yield* Effect.log(
      `[${source.name}] Starting fetch (latency: ${source.latencyMs}ms)`
    );

    yield* Effect.sleep(`${source.latencyMs} millis`);

    const result = `Data from ${source.name}`;

    yield* Effect.log(`[${source.name}] ✓ Completed`);

    return result;
  });

// Main: demonstrate race patterns
const program = Effect.gen(function* () {
  console.log(`\n[RACE] Competing effects with race and timeout\n`);

  // Example 1: Simple race (fastest wins)
  console.log(`[1] Racing 3 data sources:\n`);

  const sources: DataSource[] = [
    { name: "Primary DC", latencyMs: 200 },
    { name: "Backup DC", latencyMs: 150 },
    { name: "Cache", latencyMs: 50 },
  ];

  const raceResult = yield* Effect.race(
    fetchFromSource(sources[0]),
    Effect.race(fetchFromSource(sources[1]), fetchFromSource(sources[2]))
  );

  console.log(`\nWinner: ${raceResult}\n`);

  // Example 2: Timeout - succeed within deadline
  console.log(`[2] Timeout with fast operation:\n`);

  const fastOp = fetchFromSource({ name: "Fast Op", latencyMs: 100 }).pipe(
    Effect.timeout("500 millis")
  );

  const fastResult = yield* fastOp;

  console.log(`✓ Completed within timeout: ${fastResult}\n`);

  // Example 3: Timeout - exceed deadline
  console.log(`[3] Timeout with slow operation:\n`);

  const slowOp = fetchFromSource({ name: "Slow Op", latencyMs: 2000 }).pipe(
    Effect.timeout("500 millis"),
    Effect.either
  );

  const timeoutResult = yield* slowOp;

  if (timeoutResult._tag === "Left") {
    console.log(`✗ Operation timed out after 500ms\n`);
  }

  // Example 4: Race with timeout fallback
  console.log(`[4] Race with fallback on timeout:\n`);

  const primary = fetchFromSource({ name: "Primary", latencyMs: 300 });

  const fallback = fetchFromSource({ name: "Fallback", latencyMs: 100 });

  const raceWithFallback = primary.pipe(
    Effect.timeout("150 millis"),
    Effect.catchAll(() => {
      yield* Effect.log(`[PRIMARY] Timed out, using fallback`);

      return fallback;
    })
  );

  const fallbackResult = yield* raceWithFallback;

  console.log(`Result: ${fallbackResult}\n`);

  // Example 5: Race all (collect all winners)
  console.log(`[5] Race all - multiple sources:\n`);

  const raceAllResult = yield* Effect.raceAll(
    sources.map((s) =>
      fetchFromSource(s).pipe(
        Effect.map((data) => ({ source: s.name, data }))
      )
    )
  );

  console.log(`First to complete: ${raceAllResult.source}\n`);
});

Effect.runPromise(program);
```

---

---

### Conditionally Branching Workflows

**Rule:** Use predicate-based operators like Effect.filter and Effect.if to declaratively control workflow branching.

**Use Cases:** error-management

**Why:**

This pattern allows you to embed decision-making logic directly into your composition pipelines, making your code more declarative and readable. It solves two key problems:

1.  **Separation of Concerns:** It cleanly separates the logic of producing a value from the logic of validating or making decisions about that value.
2.  **Reusable Business Logic:** A predicate function (e.g., `const isAdmin = (user: User) => ...`) becomes a named, reusable, and testable piece of business logic, far superior to scattering inline `if` statements throughout your code.

Using these operators turns conditional logic into a composable part of your `Effect`, rather than an imperative statement that breaks the flow.

---

**Good Example:**

Here, we use `Effect.filterOrFail` with named predicates to validate a user before proceeding. The intent is crystal clear, and the business rules (`isActive`, `isAdmin`) are reusable.

```typescript
import { Effect } from "effect";

interface User {
  id: number;
  status: "active" | "inactive";
  roles: string[];
}

type UserError = "DbError" | "UserIsInactive" | "UserIsNotAdmin";

const findUser = (id: number): Effect.Effect<User, "DbError"> =>
  Effect.succeed({ id, status: "active", roles: ["admin"] });

// Reusable, testable predicates that document business rules.
const isActive = (user: User): boolean => user.status === "active";

const isAdmin = (user: User): boolean => user.roles.includes("admin");

const program = (id: number): Effect.Effect<string, UserError> =>
  findUser(id).pipe(
    // Validate user is active using Effect.filterOrFail
    Effect.filterOrFail(isActive, () => "UserIsInactive" as const),
    // Validate user is admin using Effect.filterOrFail
    Effect.filterOrFail(isAdmin, () => "UserIsNotAdmin" as const),
    // Success case
    Effect.map((user) => `Welcome, admin user #${user.id}!`)
  );

// We can then handle the specific failures in a type-safe way.
const handled = program(123).pipe(
  Effect.match({
    onFailure: (error) => {
      switch (error) {
        case "UserIsNotAdmin":
          return "Access denied: requires admin role.";
        case "UserIsInactive":
          return "Access denied: user is not active.";
        case "DbError":
          return "Error: could not find user.";
        default:
          return `Unknown error: ${error}`;
      }
    },
    onSuccess: (result) => result,
  })
);

// Run the program
const programWithLogging = Effect.gen(function* () {
  const result = yield* handled;
  yield* Effect.log(result);
  return result;
});

Effect.runPromise(programWithLogging);
```

---

**Anti-Pattern:**

Using `Effect.flatMap` with a manual `if` statement and forgetting to handle the `else` case. This is a common mistake that leads to an inferred type of `Effect<void, ...>`, which can cause confusing type errors downstream because the success value is lost.

```typescript
import { Effect } from "effect";
import { findUser, isAdmin } from "./somewhere"; // From previous example

// ❌ WRONG: The `else` case is missing.
const program = (id: number) =>
  findUser(id).pipe(
    Effect.flatMap((user) => {
      if (isAdmin(user)) {
        // This returns Effect<User>, but what happens if the user is not an admin?
        return Effect.succeed(user);
      }
      // Because there's no `else` branch, TypeScript infers that this
      // block can also implicitly return `void`.
      // The resulting type is Effect<User | void, "DbError">, which is problematic.
    }),
    // This `map` will now have a type error because `u` could be `void`.
    Effect.map((u) => `Welcome, ${u.name}!`)
  );

// `Effect.filterOrFail` avoids this problem entirely by forcing a failure,
// which keeps the success channel clean and correctly typed.
```

### Why This is Better

- **It's a Real Bug:** This isn't just a style issue; it's a legitimate logical error that leads to incorrect types and broken code.
- **It's a Common Mistake:** Developers new to functional pipelines often forget that every path must return a value.
- **It Reinforces the "Why":** It perfectly demonstrates _why_ `Effect.filterOrFail` is superior: `filterOrFail` guarantees that if the condition fails, the computation fails, preserving the integrity of the success channel.

---

### Configure CORS for APIs

**Rule:** Configure CORS headers to allow legitimate cross-origin requests while blocking unauthorized ones.

**Use Cases:** building-apis

**Why:**

Browsers block cross-origin requests by default:

1. **Security** - Prevents malicious sites from accessing your API
2. **Controlled access** - Allow specific origins only
3. **Credentials** - Control cookie/auth header sharing
4. **Methods** - Limit which HTTP methods are allowed

---

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

---

### Configure Linting for Effect

**Rule:** Use Biome for fast linting with Effect-friendly configuration.

**Use Cases:** tooling-and-debugging

**Why:**

Good linting for Effect:

1. **Catches errors** - Unused variables, missing awaits
2. **Enforces style** - Consistent code across team
3. **Avoids antipatterns** - No implicit any, proper typing
4. **Fast feedback** - Errors in editor immediately

---

**Good Example:**

### 1. Biome Configuration (Recommended)

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "warn",
        "noForEach": "off",  // Effect uses forEach patterns
        "useLiteralKeys": "off"  // Effect uses computed keys
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "noParameterAssign": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noConfusingVoidType": "off"  // Effect uses void
      },
      "nursery": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "lodash": "Use Effect functions instead",
              "ramda": "Use Effect functions instead"
            }
          }
        }
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "semicolons": "asNeeded",
      "quoteStyle": "double",
      "trailingComma": "es5"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "coverage",
      "*.gen.ts"
    ]
  }
}
```

### 2. ESLint Configuration (Alternative)

```javascript
// eslint.config.js
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": "error",

      // Effect-friendly rules
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false }
      ],

      // Style rules
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: ["dist/", "coverage/", "node_modules/"],
  }
)
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "lint:ci": "biome ci .",
    "format": "biome format --write .",
    "format:check": "biome format ."
  }
}
```

### 4. VS Code Integration

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

### 5. Pre-commit Hook

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

```bash
# .husky/pre-commit
bun run lint:ci
bun run typecheck
```

### 6. Effect-Specific Rules to Consider

```typescript
// Custom rules you might want

// ❌ Bad: Using Promise where Effect should be used
const fetchData = async () => { }  // Warn in Effect codebase

// ✅ Good: Using Effect
const fetchData = Effect.gen(function* () { })

// ❌ Bad: Throwing errors
const validate = (x: unknown) => {
  if (!x) throw new Error("Invalid")  // Error
}

// ✅ Good: Returning Effect with error
const validate = (x: unknown) =>
  x ? Effect.succeed(x) : Effect.fail(new ValidationError())

// ❌ Bad: Using null/undefined directly
const maybeValue: string | null = null  // Warn

// ✅ Good: Using Option
const maybeValue: Option.Option<string> = Option.none()
```

---

### Control Flow with Conditional Combinators

**Rule:** Use conditional combinators for control flow.

**Use Cases:** core-concepts

**Why:**

These combinators allow you to embed conditional logic directly into your
`.pipe()` compositions, maintaining a declarative style for simple branching.

**Good Example:**

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

**Anti-Pattern:**

Using `Effect.gen` for a single, simple conditional check can be more verbose
than necessary. For simple branching, `Effect.if` is often more concise.

---

### Control Repetition with Schedule

**Rule:** Use Schedule to create composable policies for controlling the repetition and retrying of effects.

**Use Cases:** error-management

**Why:**

While you could write manual loops or recursive functions, `Schedule` provides a much more powerful, declarative, and composable way to manage repetition. The key benefits are:

- **Declarative:** You separate the _what_ (the effect to run) from the _how_ and _when_ (the schedule it runs on).
- **Composable:** You can build complex schedules from simple, primitive ones. For example, you can create a schedule that runs "up to 5 times, with an exponential backoff, plus some random jitter" by composing `Schedule.recurs`, `Schedule.exponential`, and `Schedule.jittered`.
- **Stateful:** A `Schedule` keeps track of its own state (like the number of repetitions), making it easy to create policies that depend on the execution history.

---

**Good Example:**

This example demonstrates composition by creating a common, robust retry policy: exponential backoff with jitter, limited to 5 attempts.

```typescript
import { Effect, Schedule, Duration } from "effect";

// A simple effect that can fail
const flakyEffect = Effect.try({
  try: () => {
    if (Math.random() > 0.2) {
      throw new Error("Transient error");
    }
    return "Operation succeeded!";
  },
  catch: (error: unknown) => {
    Effect.logInfo("Operation failed, retrying...");
    return error;
  },
});

// --- Building a Composable Schedule ---

// 1. Start with a base exponential backoff (100ms, 200ms, 400ms...)
const exponentialBackoff = Schedule.exponential("100 millis");

// 2. Add random jitter to avoid thundering herd problems
const withJitter = Schedule.jittered(exponentialBackoff);

// 3. Limit the schedule to a maximum of 5 repetitions
const limitedWithJitter = Schedule.compose(withJitter, Schedule.recurs(5));

// --- Using the Schedule ---
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting operation...");
  const result = yield* Effect.retry(flakyEffect, limitedWithJitter);
  yield* Effect.logInfo(`Final result: ${result}`);
});

// Run the program
Effect.runPromise(program);
```

---

**Anti-Pattern:**

Writing manual, imperative retry logic. This is verbose, stateful, hard to reason about, and not easily composable.

```typescript
import { Effect } from "effect";
import { flakyEffect } from "./somewhere";

// ❌ WRONG: Manual, stateful, and complex retry logic.
function manualRetry(
  effect: typeof flakyEffect,
  retriesLeft: number,
  delay: number
): Effect.Effect<string, "ApiError"> {
  return effect.pipe(
    Effect.catchTag("ApiError", () => {
      if (retriesLeft > 0) {
        return Effect.sleep(delay).pipe(
          Effect.flatMap(() => manualRetry(effect, retriesLeft - 1, delay * 2))
        );
      }
      return Effect.fail("ApiError" as const);
    })
  );
}

const program = manualRetry(flakyEffect, 5, 100);
```

---

### Create a Service Layer from a Managed Resource

**Rule:** Provide a managed resource to the application context using `Layer.scoped`.

**Use Cases:** resource-management

**Why:**

This pattern is the key to building robust, testable, and leak-proof applications in Effect. It elevates a managed resource into a first-class service that can be used anywhere in your application. The `Effect.Service` helper simplifies defining the service's interface and context key. This approach decouples your business logic from the concrete implementation, as the logic only depends on the abstract service. The `Layer` declaratively handles the resource's entire lifecycle, ensuring it is acquired lazily, shared safely, and released automatically.

**Good Example:**

```typescript
import { Effect, Console } from "effect";

// 1. Define the service interface
interface DatabaseService {
  readonly query: (sql: string) => Effect.Effect<string[], never, never>;
}

// 2. Define the service implementation with scoped resource management
class Database extends Effect.Service<DatabaseService>()("Database", {
  // The scoped property manages the resource lifecycle
  scoped: Effect.gen(function* () {
    const id = Math.floor(Math.random() * 1000);

    // Acquire the connection
    yield* Effect.log(`[Pool ${id}] Acquired`);

    // Setup cleanup to run when scope closes
    yield* Effect.addFinalizer(() => Effect.log(`[Pool ${id}] Released`));

    // Return the service implementation
    return {
      query: (sql: string) =>
        Effect.sync(() => [`Result for '${sql}' from pool ${id}`]),
    };
  }),
}) {}

// 3. Use the service in your program
const program = Effect.gen(function* () {
  const db = yield* Database;
  const users = yield* db.query("SELECT * FROM users");
  yield* Effect.log(`Query successful: ${users[0]}`);
});

// 4. Run the program with scoped resource management
Effect.runPromise(
  Effect.scoped(program).pipe(Effect.provide(Database.Default))
);

/*
Output:
[Pool 458] Acquired
Query successful: Result for 'SELECT * FROM users' from pool 458
[Pool 458] Released
*/
```

**Explanation:**
The `Effect.Service` helper creates the `Database` class, which acts as both the service definition and its context key (Tag). The `Database.Live` layer connects this service to a concrete, lifecycle-managed implementation. When `program` asks for the `Database` service, the Effect runtime uses the `Live` layer to run the `acquire` effect once, caches the resulting `DbPool`, and injects it. The `release` effect is automatically run when the program completes.

**Anti-Pattern:**

Creating and exporting a global singleton instance of a resource. This tightly couples your application to a specific implementation, makes testing difficult, and offers no guarantees about graceful shutdown.

```typescript
// ANTI-PATTERN: Global singleton
export const dbPool = makeDbPoolSync(); // Eagerly created, hard to test/mock

function someBusinessLogic() {
  // This function has a hidden dependency on the global dbPool
  return dbPool.query("SELECT * FROM products");
}
```

---

### Create a Testable HTTP Client Service

**Rule:** Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

**Use Cases:** making-http-requests

**Why:**

Directly using `fetch` in your business logic makes it nearly impossible to test. Your tests would become slow, flaky (dependent on network conditions), and could have unintended side effects.

By abstracting the HTTP client into a service, you decouple your application's logic from the specific implementation of how HTTP requests are made. Your business logic depends only on the abstract `HttpClient` interface. In production, you provide the `Live` layer. In tests, you provide the `Test` layer. This makes your tests fast, deterministic, and reliable.

---

**Good Example:**

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

**Anti-Pattern:**

Calling `fetch` directly from within your business logic functions. This creates a hard dependency on the global `fetch` API, making the function difficult to test and reuse.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This function is not easily testable.
export const getUserDirectly = (id: number) =>
  Effect.tryPromise({
    try: () =>
      fetch(`https://api.example.com/users/${id}`).then((res) => res.json()),
    catch: () => "ApiError" as const,
  });
```

---

### Define a Type-Safe Configuration Schema

**Rule:** Define a type-safe configuration schema.

**Use Cases:** core-concepts

**Why:**

This creates a single, type-safe source of truth for your configuration, eliminating runtime errors from missing or malformed environment variables and making the required configuration explicit.

**Good Example:**

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

**Anti-Pattern:**

Directly accessing `process.env`. This is not type-safe, scatters configuration access throughout your codebase, and can lead to parsing errors or `undefined` values.

---

### Define Contracts Upfront with Schema

**Rule:** Define contracts upfront with schema.

**Use Cases:** domain-modeling

**Why:**

This "schema-first" approach separates the "what" (the data shape) from the
"how" (the implementation). It provides a single source of truth for both
compile-time static types and runtime validation.

**Good Example:**

```typescript
import { Schema, Effect, Data } from "effect";

// Define User schema and type
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
});

type User = Schema.Schema.Type<typeof UserSchema>;

// Define error type
class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: number;
}> {}

// Create database service implementation
export class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: number) =>
      id === 1
        ? Effect.succeed({ id: 1, name: "John" })
        : Effect.fail(new UserNotFound({ id })),
  }),
}) {}

// Create a program that demonstrates schema and error handling
const program = Effect.gen(function* () {
  const db = yield* Database;

  // Try to get an existing user
  yield* Effect.logInfo("Looking up user 1...");
  const user1 = yield* db.getUser(1);
  yield* Effect.logInfo(`Found user: ${JSON.stringify(user1)}`);

  // Try to get a non-existent user
  yield* Effect.logInfo("\nLooking up user 999...");
  yield* Effect.logInfo("Attempting to get user 999...");
  yield* Effect.gen(function* () {
    const user = yield* db.getUser(999);
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof UserNotFound) {
        return Effect.logInfo(`Error: User with id ${error.id} not found`);
      }
      return Effect.logInfo(`Unexpected error: ${error}`);
    })
  );

  // Try to decode invalid data
  yield* Effect.logInfo("\nTrying to decode invalid user data...");
  const invalidUser = { id: "not-a-number", name: 123 } as any;
  yield* Effect.gen(function* () {
    const user = yield* Schema.decode(UserSchema)(invalidUser);
    yield* Effect.logInfo(`Decoded user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Validation failed:\n${JSON.stringify(error, null, 2)}`)
    )
  );
});

// Run the program
Effect.runPromise(Effect.provide(program, Database.Default));
```

**Explanation:**  
Defining schemas upfront clarifies your contracts and ensures both type safety
and runtime validation.

**Anti-Pattern:**

Defining logic with implicit `any` types first and adding validation later as
an afterthought. This leads to brittle code that lacks a clear contract.

---

### Define Type-Safe Errors with Data.TaggedError

**Rule:** Define type-safe errors with Data.TaggedError.

**Use Cases:** domain-modeling

**Why:**

This gives each error a unique, literal `_tag` that Effect can use for type
discrimination with `Effect.catchTag`, making your error handling fully
type-safe.

**Good Example:**

```typescript
import { Data, Effect } from "effect";

// Define our tagged error type
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

// Function that simulates a database error
const findUser = (
  id: number
): Effect.Effect<{ id: number; name: string }, DatabaseError> =>
  Effect.gen(function* () {
    if (id < 0) {
      return yield* Effect.fail(new DatabaseError({ cause: "Invalid ID" }));
    }
    return { id, name: `User ${id}` };
  });

// Create a program that demonstrates error handling
const program = Effect.gen(function* () {
  // Try to find a valid user
  yield* Effect.logInfo("Looking up user 1...");
  yield* Effect.gen(function* () {
    const user = yield* findUser(1);
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Error finding user: ${error._tag} - ${error.cause}`)
    )
  );

  // Try to find an invalid user
  yield* Effect.logInfo("\nLooking up user -1...");
  yield* Effect.gen(function* () {
    const user = yield* findUser(-1);
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchTag("DatabaseError", (error) =>
      Effect.logInfo(`Database error: ${error._tag} - ${error.cause}`)
    )
  );
});

// Run the program
Effect.runPromise(program);
```

**Explanation:**  
Tagged errors allow you to handle errors in a type-safe, self-documenting way.

**Anti-Pattern:**

Using generic `Error` objects or strings in the error channel. This loses all
type information, forcing consumers to use `catchAll` and perform unsafe
checks.

---

### Distinguish 'Not Found' from Errors

**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

**Use Cases:** domain-modeling

**Why:**

This pattern provides a precise way to handle three distinct outcomes of an operation:

1.  **Success with a value:** `Effect.succeed(Option.some(value))`
2.  **Success with no value:** `Effect.succeed(Option.none())` (e.g., user not found)
3.  **Failure:** `Effect.fail(new DatabaseError())` (e.g., database connection lost)

By using `Option` inside the success channel of an `Effect`, you keep the error channel clean for true, unexpected, or unrecoverable errors. The "not found" case is often an expected and recoverable part of your business logic, and `Option.none()` models this perfectly.

---

**Good Example:**

This function to find a user can fail if the database is down, or it can succeed but find no user. The return type `Effect.Effect<Option.Option<User>, DatabaseError>` makes this contract perfectly clear.

```typescript
import { Effect, Option, Data } from "effect";

interface User {
  id: number;
  name: string;
}
class DatabaseError extends Data.TaggedError("DatabaseError") {}

// This signature is extremely honest about its possible outcomes.
const findUserInDb = (
  id: number
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
    Effect.flatMap((maybeUser) =>
      Option.match(maybeUser, {
        onNone: () =>
          Effect.logInfo(`Result: User with ID ${id} was not found.`),
        onSome: (user) => Effect.logInfo(`Result: Found user ${user.name}.`),
      })
    ),
    Effect.catchAll((error) =>
      Effect.logInfo("Error: Could not connect to the database.")
    )
  );

// Run the program with different IDs
Effect.runPromise(
  Effect.gen(function* () {
    // Try with existing user
    yield* Effect.logInfo("Looking for user with ID 1...");
    yield* program(1);

    // Try with non-existent user
    yield* Effect.logInfo("\nLooking for user with ID 2...");
    yield* program(2);
  })
);
```

**Anti-Pattern:**

A common alternative is to create a specific NotFoundError and put it in the error channel alongside other errors.

```typescript
class NotFoundError extends Data.TaggedError("NotFoundError") {}

// ❌ This signature conflates two different kinds of failure.
const findUserUnsafely = (
  id: number
): Effect.Effect<User, DatabaseError | NotFoundError> => {
  // ...
  return Effect.fail(new NotFoundError());
};
```

While this works, it can be less expressive. It treats a "not found" result—which might be a normal part of your application's flow—the same as a catastrophic DatabaseError.

Using `Effect<Option<A>>` often leads to clearer and more precise business logic.

---

### Effectful Pattern Matching with matchEffect

**Rule:** Use matchEffect to pattern match on the result of an Effect, running effectful logic for both success and failure cases.

**Use Cases:** error-management

**Why:**

Sometimes, handling a success or failure requires running additional Effects (e.g., logging, retries, cleanup).  
`matchEffect` lets you do this declaratively, keeping your code composable and type-safe.

**Good Example:**

```typescript
import { Effect } from "effect";

// Effect: Run different Effects on success or failure
const effect = Effect.fail("Oops!").pipe(
  Effect.matchEffect({
    onFailure: (err) => Effect.logError(`Error: ${err}`),
    onSuccess: (value) => Effect.log(`Success: ${value}`),
  })
); // Effect<void>
```

**Explanation:**

- `matchEffect` allows you to run an Effect for both the success and failure cases.
- This is useful for logging, cleanup, retries, or any effectful side effect that depends on the outcome.

**Anti-Pattern:**

Using `match` to return values and then wrapping them in Effects, or duplicating logic for side effects, instead of using `matchEffect` for direct effectful branching.

---

### Error Handling Pattern 1: Accumulating Multiple Errors

**Rule:** Use error accumulation to report all problems at once rather than failing early, critical for validation and batch operations.

**Use Cases:** error-handling

**Why:**

Failing fast causes problems:

**Problem 1: Form validation**
- User submits form with 10 field errors
- Fail on first error: "Name required"
- User fixes name, submits again
- New error: "Email invalid"
- User submits 10 times before fixing all errors
- Frustration, reduced productivity

**Problem 2: Batch processing**
- Process 1000 records, fail on record 5
- 995 records not processed
- User manually retries
- Repeats for each error type
- Inefficient

**Problem 3: System diagnostics**
- Service health check fails
- Report: "Check 1 failed"
- Fix check 1, service still down
- Hidden problem: checks 2, 3, and 4 also failed
- Time wasted diagnosing

Solutions:

**Error accumulation**:
- Run all validations
- Collect errors
- Report all problems
- User fixes once, not 10 times

**Partial success**:
- Process all records
- Track successes and failures
- Return: "950 succeeded, 50 failed"
- No re-processing

**Comprehensive diagnostics**:
- Run all checks
- Report all failures
- Quick root cause analysis
- Faster resolution

---

**Good Example:**

This example demonstrates error accumulation patterns.

```typescript
import { Effect, Data, Cause } from "effect";

interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

interface ProcessingResult<T> {
  successes: T[];
  errors: ValidationError[];
}

// Example 1: Form validation with error accumulation
const program = Effect.gen(function* () {
  console.log(`\n[ERROR ACCUMULATION] Collecting multiple errors\n`);

  // Form data
  interface FormData {
    name: string;
    email: string;
    age: number;
    phone: string;
  }

  const validateForm = (data: FormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validation 1: Name
    if (!data.name || data.name.trim().length === 0) {
      errors.push({
        field: "name",
        message: "Name is required",
        value: data.name,
      });
    } else if (data.name.length < 2) {
      errors.push({
        field: "name",
        message: "Name must be at least 2 characters",
        value: data.name,
      });
    }

    // Validation 2: Email
    if (!data.email) {
      errors.push({
        field: "email",
        message: "Email is required",
        value: data.email,
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({
        field: "email",
        message: "Email format invalid",
        value: data.email,
      });
    }

    // Validation 3: Age
    if (data.age < 0 || data.age > 150) {
      errors.push({
        field: "age",
        message: "Age must be between 0 and 150",
        value: data.age,
      });
    }

    // Validation 4: Phone
    if (data.phone && !/^\d{3}-\d{3}-\d{4}$/.test(data.phone)) {
      errors.push({
        field: "phone",
        message: "Phone must be in format XXX-XXX-XXXX",
        value: data.phone,
      });
    }

    return errors;
  };

  // Example 1: Form with multiple errors
  console.log(`[1] Form validation with multiple errors:\n`);

  const invalidForm: FormData = {
    name: "",
    email: "not-an-email",
    age: 200,
    phone: "invalid",
  };

  const validationErrors = validateForm(invalidForm);

  yield* Effect.log(`[VALIDATION] Found ${validationErrors.length} errors:\n`);

  for (const error of validationErrors) {
    yield* Effect.log(`  ✗ ${error.field}: ${error.message}`);
  }

  // Example 2: Batch processing with partial success
  console.log(`\n[2] Batch processing (accumulate successes and failures):\n`);

  interface Record {
    id: string;
    data: string;
  }

  const processRecord = (record: Record): Result<string> => {
    if (record.id.length === 0) {
      return { success: false, error: "Missing ID" };
    }

    if (record.data.includes("ERROR")) {
      return { success: false, error: "Invalid data" };
    }

    return { success: true, value: `processed-${record.id}` };
  };

  interface Result<T> {
    success: boolean;
    value?: T;
    error?: string;
  }

  const records: Record[] = [
    { id: "rec1", data: "ok" },
    { id: "", data: "ok" }, // Error: missing ID
    { id: "rec3", data: "ok" },
    { id: "rec4", data: "ERROR" }, // Error: invalid data
    { id: "rec5", data: "ok" },
  ];

  const results: ProcessingResult<string> = {
    successes: [],
    errors: [],
  };

  for (const record of records) {
    const result = processRecord(record);

    if (result.success) {
      results.successes.push(result.value!);
    } else {
      results.errors.push({
        field: record.id || "unknown",
        message: result.error!,
      });
    }
  }

  yield* Effect.log(
    `[BATCH] Processed ${records.length} records`
  );
  yield* Effect.log(`[BATCH] ✓ ${results.successes.length} succeeded`);
  yield* Effect.log(`[BATCH] ✗ ${results.errors.length} failed\n`);

  for (const success of results.successes) {
    yield* Effect.log(`  ✓ ${success}`);
  }

  for (const error of results.errors) {
    yield* Effect.log(`  ✗ [${error.field}] ${error.message}`);
  }

  // Example 3: Multi-step validation with error accumulation
  console.log(`\n[3] Multi-step validation (all checks run):\n`);

  interface ServiceHealth {
    diskSpace: boolean;
    memory: boolean;
    network: boolean;
    database: boolean;
  }

  const diagnostics: ValidationError[] = [];

  // Check 1: Disk space
  const diskFree = 50; // MB

  if (diskFree < 100) {
    diagnostics.push({
      field: "disk-space",
      message: `Only ${diskFree}MB free (need 100MB)`,
      value: diskFree,
    });
  }

  // Check 2: Memory
  const memUsage = 95; // percent

  if (memUsage > 85) {
    diagnostics.push({
      field: "memory",
      message: `Using ${memUsage}% (threshold: 85%)`,
      value: memUsage,
    });
  }

  // Check 3: Network
  const latency = 500; // ms

  if (latency > 200) {
    diagnostics.push({
      field: "network",
      message: `Latency ${latency}ms (threshold: 200ms)`,
      value: latency,
    });
  }

  // Check 4: Database
  const dbConnections = 95;
  const dbMax = 100;

  if (dbConnections > dbMax * 0.8) {
    diagnostics.push({
      field: "database",
      message: `${dbConnections}/${dbMax} connections (80% threshold)`,
      value: dbConnections,
    });
  }

  if (diagnostics.length === 0) {
    yield* Effect.log(`[HEALTH] ✓ All systems normal\n`);
  } else {
    yield* Effect.log(
      `[HEALTH] ✗ ${diagnostics.length} issue(s) detected:\n`
    );

    for (const diag of diagnostics) {
      yield* Effect.log(`  ⚠ ${diag.field}: ${diag.message}`);
    }
  }

  // Example 4: Error collection with retry decisions
  console.log(`\n[4] Error collection for retry strategy:\n`);

  interface ErrorWithContext {
    operation: string;
    error: string;
    retryable: boolean;
    timestamp: Date;
  }

  const operationErrors: ErrorWithContext[] = [];

  const operations = [
    { name: "fetch-config", fail: false },
    { name: "connect-db", fail: true },
    { name: "load-cache", fail: true },
    { name: "start-server", fail: false },
  ];

  for (const op of operations) {
    if (op.fail) {
      operationErrors.push({
        operation: op.name,
        error: "Operation failed",
        retryable: op.name !== "fetch-config",
        timestamp: new Date(),
      });
    }
  }

  yield* Effect.log(`[OPERATIONS] ${operationErrors.length} errors:\n`);

  for (const err of operationErrors) {
    const status = err.retryable ? "🔄 retryable" : "❌ non-retryable";
    yield* Effect.log(`  ${status}: ${err.operation}`);
  }

  if (operationErrors.every((e) => e.retryable)) {
    yield* Effect.log(`\n[DECISION] All errors retryable, will retry\n`);
  } else {
    yield* Effect.log(`\n[DECISION] Some non-retryable errors, manual intervention needed\n`);
  }
});

Effect.runPromise(program);
```

---

---

### Handle API Errors

**Rule:** Model application errors as typed classes and use Http.server.serveOptions to map them to specific HTTP responses.

**Use Cases:** building-apis

**Why:**

By default, any unhandled failure in an Effect route handler results in a generic `500 Internal Server Error`. This is a safe default, but it's not helpful for API clients who need to know _why_ their request failed. Was it a client-side error (like a non-existent resource, `404`) or a true server-side problem (`500`)?

Centralizing error handling at the server level provides a clean separation of concerns:

1.  **Domain-Focused Logic**: Your business logic can fail with specific, descriptive errors (e.g., `UserNotFoundError`) without needing any knowledge of HTTP status codes.
2.  **Centralized Mapping**: You define the mapping from application errors to HTTP responses in a single location. This makes your API's error handling consistent and easy to maintain. If you need to change how an error is reported, you only change it in one place.
3.  **Type Safety**: Using `Data.TaggedClass` for your errors allows you to use `Match` to exhaustively handle all known error cases, preventing you from forgetting to map a specific error type.
4.  **Clear Client Communication**: It produces a predictable and useful API, allowing clients to programmatically react to different failure scenarios.

---

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

---

### Handle Errors with catchTag, catchTags, and catchAll

**Rule:** Handle errors with catchTag, catchTags, and catchAll.

**Use Cases:** error-management

**Why:**

Effect's structured error handling allows you to build resilient applications.
By using tagged errors and `catchTag`, you can handle different failure
scenarios with different logic in a type-safe way.

**Good Example:**

```typescript
import { Data, Effect } from "effect";

// Define domain types
interface User {
  readonly id: string;
  readonly name: string;
}

// Define specific error types
class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
  readonly code: number;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly id: string;
}> {}

// Define UserService
class UserService extends Effect.Service<UserService>()("UserService", {
  sync: () => ({
    // Fetch user data
    fetchUser: (
      id: string
    ): Effect.Effect<User, NetworkError | NotFoundError> =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`Fetching user with id: ${id}`);

        if (id === "invalid") {
          const url = "/api/users/" + id;
          yield* Effect.logWarning(`Network error accessing: ${url}`);
          return yield* Effect.fail(new NetworkError({ url, code: 500 }));
        }

        if (id === "missing") {
          yield* Effect.logWarning(`User not found: ${id}`);
          return yield* Effect.fail(new NotFoundError({ id }));
        }

        const user = { id, name: "John Doe" };
        yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
        return user;
      }),

    // Validate user data
    validateUser: (user: User): Effect.Effect<string, ValidationError> =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`Validating user: ${JSON.stringify(user)}`);

        if (user.name.length < 3) {
          yield* Effect.logWarning(
            `Validation failed: name too short for user ${user.id}`
          );
          return yield* Effect.fail(
            new ValidationError({ field: "name", message: "Name too short" })
          );
        }

        const message = `User ${user.name} is valid`;
        yield* Effect.logInfo(message);
        return message;
      }),
  }),
}) {}

// Compose operations with error handling using catchTags
const processUser = (
  userId: string
): Effect.Effect<string, never, UserService> =>
  Effect.gen(function* () {
    const userService = yield* UserService;

    yield* Effect.logInfo(`=== Processing user ID: ${userId} ===`);

    const result = yield* userService.fetchUser(userId).pipe(
      Effect.flatMap(userService.validateUser),
      // Handle different error types with specific recovery logic
      Effect.catchTags({
        NetworkError: (e) =>
          Effect.gen(function* () {
            const message = `Network error: ${e.code} for ${e.url}`;
            yield* Effect.logError(message);
            return message;
          }),
        NotFoundError: (e) =>
          Effect.gen(function* () {
            const message = `User ${e.id} not found`;
            yield* Effect.logWarning(message);
            return message;
          }),
        ValidationError: (e) =>
          Effect.gen(function* () {
            const message = `Invalid ${e.field}: ${e.message}`;
            yield* Effect.logWarning(message);
            return message;
          }),
      })
    );

    yield* Effect.logInfo(`Result: ${result}`);
    return result;
  });

// Test with different scenarios
const runTests = Effect.gen(function* () {
  yield* Effect.logInfo("=== Starting User Processing Tests ===");

  const testCases = ["valid", "invalid", "missing"];
  const results = yield* Effect.forEach(testCases, (id) => processUser(id));

  yield* Effect.logInfo("=== User Processing Tests Complete ===");
  return results;
});

// Run the program
Effect.runPromise(Effect.provide(runTests, UserService.Default));
```

**Explanation:**  
Use `catchTag` to handle specific error types in a type-safe, composable way.

**Anti-Pattern:**

Using `try/catch` blocks inside your Effect compositions. It breaks the
declarative flow and bypasses Effect's powerful, type-safe error channels.

---

### Handle Flaky Operations with Retries and Timeouts

**Rule:** Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing effects.

**Use Cases:** error-management

**Why:**

In distributed systems, failure is normal. APIs can fail intermittently, and network latency can spike. Hard-coding your application to try an operation only once makes it brittle.

- **Retries:** The `Effect.retry` operator, combined with a `Schedule` policy, provides a powerful, declarative way to handle transient failures. Instead of writing complex `try/catch` loops, you can simply define a policy like "retry 3 times, with an exponential backoff delay between attempts."

- **Timeouts:** An operation might not fail, but instead hang indefinitely. `Effect.timeout` prevents this by racing your effect against a timer. If your effect doesn't complete within the specified duration, it is automatically interrupted, preventing your application from getting stuck.

Combining these two patterns is a best practice for any interaction with an external service.

---

**Good Example:**

This program attempts to fetch data from a flaky API. It will retry the request up to 3 times with increasing delays if it fails. It will also give up entirely if any single attempt takes longer than 2 seconds.

```typescript
import { Data, Duration, Effect, Schedule } from "effect";

// Define domain types
interface ApiResponse {
  readonly data: string;
}

// Define error types
class ApiError extends Data.TaggedError("ApiError")<{
  readonly message: string;
  readonly attempt: number;
}> {}

class TimeoutError extends Data.TaggedError("TimeoutError")<{
  readonly duration: string;
  readonly attempt: number;
}> {}

// Define API service
class ApiService extends Effect.Service<ApiService>()("ApiService", {
  sync: () => ({
    // Flaky API call that might fail or be slow
    fetchData: (): Effect.Effect<ApiResponse, ApiError | TimeoutError> =>
      Effect.gen(function* () {
        const attempt = Math.floor(Math.random() * 5) + 1;
        yield* Effect.logInfo(`Attempt ${attempt}: Making API call...`);

        if (Math.random() > 0.3) {
          yield* Effect.logWarning(`Attempt ${attempt}: API call failed`);
          return yield* Effect.fail(
            new ApiError({
              message: "API Error",
              attempt,
            })
          );
        }

        const delay = Math.random() * 3000;
        yield* Effect.logInfo(
          `Attempt ${attempt}: API call will take ${delay.toFixed(0)}ms`
        );

        yield* Effect.sleep(Duration.millis(delay));

        const response = { data: "some important data" };
        yield* Effect.logInfo(
          `Attempt ${attempt}: API call succeeded with data: ${JSON.stringify(response)}`
        );
        return response;
      }),
  }),
}) {}

// Define retry policy: exponential backoff, up to 3 retries
const retryPolicy = Schedule.exponential(Duration.millis(100)).pipe(
  Schedule.compose(Schedule.recurs(3)),
  Schedule.tapInput((error: ApiError | TimeoutError) =>
    Effect.logWarning(
      `Retrying after error: ${error._tag} (Attempt ${error.attempt})`
    )
  )
);

// Create program with proper error handling
const program = Effect.gen(function* () {
  const api = yield* ApiService;

  yield* Effect.logInfo("=== Starting API calls with retry and timeout ===");

  // Make multiple test calls
  for (let i = 1; i <= 3; i++) {
    yield* Effect.logInfo(`\n--- Test Call ${i} ---`);

    const result = yield* api.fetchData().pipe(
      Effect.timeout(Duration.seconds(2)),
      Effect.catchTag("TimeoutException", () =>
        Effect.fail(new TimeoutError({ duration: "2 seconds", attempt: i }))
      ),
      Effect.retry(retryPolicy),
      Effect.catchTags({
        ApiError: (error) =>
          Effect.gen(function* () {
            yield* Effect.logError(
              `All retries failed: ${error.message} (Last attempt: ${error.attempt})`
            );
            return { data: "fallback data due to API error" } as ApiResponse;
          }),
        TimeoutError: (error) =>
          Effect.gen(function* () {
            yield* Effect.logError(
              `All retries timed out after ${error.duration} (Last attempt: ${error.attempt})`
            );
            return { data: "fallback data due to timeout" } as ApiResponse;
          }),
      })
    );

    yield* Effect.logInfo(`Result: ${JSON.stringify(result)}`);
  }

  yield* Effect.logInfo("\n=== API calls complete ===");
});

// Run the program
Effect.runPromise(Effect.provide(program, ApiService.Default));
```

---

**Anti-Pattern:**

Writing manual retry and timeout logic. This is verbose, complex, and easy to get wrong. It clutters your business logic with concerns that Effect can handle declaratively.

```typescript
// ❌ WRONG: Manual, complex, and error-prone logic.
async function manualRetryAndTimeout() {
  for (let i = 0; i < 3; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch("...", { signal: controller.signal });
      clearTimeout(timeoutId);

      return await response.json();
    } catch (error) {
      if (i === 2) throw error; // Last attempt, re-throw
      await new Promise((res) => setTimeout(res, 100 * 2 ** i)); // Manual backoff
    }
  }
}
```

---

### Handle Rate Limiting Responses

**Rule:** Detect 429 responses and automatically retry after the Retry-After period.

**Use Cases:** making-http-requests

**Why:**

Rate limits protect APIs:

1. **Fair usage** - Share resources among clients
2. **Stability** - Prevent overload
3. **Quotas** - Enforce billing tiers

Respecting limits prevents bans and ensures reliable access.

---

**Good Example:**

```typescript
import { Effect, Schedule, Duration, Data, Ref } from "effect"
import { HttpClient, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Rate limit error type
// ============================================

class RateLimitedError extends Data.TaggedError("RateLimitedError")<{
  readonly retryAfter: number
  readonly limit: number | undefined
  readonly remaining: number | undefined
  readonly reset: number | undefined
}> {}

// ============================================
// 2. Parse rate limit headers
// ============================================

interface RateLimitInfo {
  readonly retryAfter: number
  readonly limit?: number
  readonly remaining?: number
  readonly reset?: number
}

const parseRateLimitHeaders = (headers: Record<string, string>): RateLimitInfo => {
  // Parse Retry-After (seconds or date)
  const retryAfterHeader = headers["retry-after"]
  let retryAfter = 60  // Default 60 seconds

  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10)
    if (!isNaN(parsed)) {
      retryAfter = parsed
    } else {
      // Try parsing as date
      const date = Date.parse(retryAfterHeader)
      if (!isNaN(date)) {
        retryAfter = Math.max(0, Math.ceil((date - Date.now()) / 1000))
      }
    }
  }

  return {
    retryAfter,
    limit: headers["x-ratelimit-limit"] ? parseInt(headers["x-ratelimit-limit"], 10) : undefined,
    remaining: headers["x-ratelimit-remaining"] ? parseInt(headers["x-ratelimit-remaining"], 10) : undefined,
    reset: headers["x-ratelimit-reset"] ? parseInt(headers["x-ratelimit-reset"], 10) : undefined,
  }
}

// ============================================
// 3. HTTP client with rate limit handling
// ============================================

const makeRateLimitAwareClient = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient

  return {
    get: <T>(url: string) =>
      Effect.gen(function* () {
        const response = yield* httpClient.get(url)

        if (response.status === 429) {
          const rateLimitInfo = parseRateLimitHeaders(response.headers)

          yield* Effect.log(
            `Rate limited. Retry after ${rateLimitInfo.retryAfter}s`
          )

          return yield* Effect.fail(new RateLimitedError({
            retryAfter: rateLimitInfo.retryAfter,
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            reset: rateLimitInfo.reset,
          }))
        }

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      }).pipe(
        Effect.retry({
          schedule: Schedule.recurWhile<RateLimitedError>(
            (e) => e._tag === "RateLimitedError"
          ).pipe(
            Schedule.intersect(Schedule.recurs(3)),
            Schedule.delayed((_, error) =>
              Duration.seconds(error.retryAfter + 1)  // Add 1s buffer
            )
          ),
          while: (error) => error._tag === "RateLimitedError",
        })
      ),
  }
})

// ============================================
// 4. Proactive rate limiting (client-side)
// ============================================

interface RateLimiter {
  readonly acquire: () => Effect.Effect<void>
  readonly release: () => Effect.Effect<void>
}

const makeClientRateLimiter = (requestsPerSecond: number) =>
  Effect.gen(function* () {
    const tokens = yield* Ref.make(requestsPerSecond)
    const interval = 1000 / requestsPerSecond

    // Refill tokens periodically
    yield* Effect.fork(
      Effect.forever(
        Effect.gen(function* () {
          yield* Effect.sleep(Duration.millis(interval))
          yield* Ref.update(tokens, (n) => Math.min(n + 1, requestsPerSecond))
        })
      )
    )

    const limiter: RateLimiter = {
      acquire: () =>
        Effect.gen(function* () {
          let acquired = false
          while (!acquired) {
            const current = yield* Ref.get(tokens)
            if (current > 0) {
              yield* Ref.update(tokens, (n) => n - 1)
              acquired = true
            } else {
              yield* Effect.sleep(Duration.millis(interval))
            }
          }
        }),

      release: () => Ref.update(tokens, (n) => Math.min(n + 1, requestsPerSecond)),
    }

    return limiter
  })

// ============================================
// 5. Combined client
// ============================================

const makeRobustHttpClient = (requestsPerSecond: number) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const rateLimiter = yield* makeClientRateLimiter(requestsPerSecond)

    return {
      get: <T>(url: string) =>
        Effect.gen(function* () {
          // Wait for rate limiter token
          yield* rateLimiter.acquire()

          const response = yield* httpClient.get(url)

          if (response.status === 429) {
            const info = parseRateLimitHeaders(response.headers)
            yield* Effect.log(`Server rate limit hit, waiting ${info.retryAfter}s`)
            yield* Effect.sleep(Duration.seconds(info.retryAfter))
            return yield* Effect.fail(new Error("Rate limited"))
          }

          return yield* HttpClientResponse.json(response) as Effect.Effect<T>
        }).pipe(
          Effect.retry(
            Schedule.exponential("1 second").pipe(
              Schedule.intersect(Schedule.recurs(3))
            )
          )
        ),
    }
  })

// ============================================
// 6. Batch requests to stay under limits
// ============================================

const batchRequests = <T>(
  urls: string[],
  requestsPerSecond: number
) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const results: T[] = []
    const interval = 1000 / requestsPerSecond

    for (const url of urls) {
      const response = yield* httpClient.get(url)
      const data = yield* HttpClientResponse.json(response) as Effect.Effect<T>
      results.push(data)

      // Wait between requests
      if (urls.indexOf(url) < urls.length - 1) {
        yield* Effect.sleep(Duration.millis(interval))
      }
    }

    return results
  })

// ============================================
// 7. Usage
// ============================================

const program = Effect.gen(function* () {
  const client = yield* makeRateLimitAwareClient

  yield* Effect.log("Making rate-limited request...")

  const data = yield* client.get("https://api.example.com/data").pipe(
    Effect.catchTag("RateLimitedError", (error) =>
      Effect.gen(function* () {
        yield* Effect.log(`Gave up after rate limiting. Limit: ${error.limit}`)
        return { error: "rate_limited" }
      })
    )
  )

  yield* Effect.log(`Result: ${JSON.stringify(data)}`)
})
```

---

### Handle Resource Timeouts

**Rule:** Always set timeouts on resource acquisition to prevent indefinite waits.

**Use Cases:** resource-management

**Why:**

Resources can become unavailable:

1. **Network partitions** - Can't reach database
2. **Pool exhaustion** - All connections in use
3. **Deadlocks** - Resources held indefinitely
4. **Slow operations** - Query takes too long

Timeouts provide a safety net.

---

**Good Example:**

```typescript
import { Effect, Duration, Scope } from "effect"

// ============================================
// 1. Define a resource with slow acquisition
// ============================================

interface Connection {
  readonly id: string
  readonly query: (sql: string) => Effect.Effect<unknown>
}

const acquireConnection = Effect.gen(function* () {
  yield* Effect.log("Attempting to connect...")
  
  // Simulate slow connection
  yield* Effect.sleep("2 seconds")
  
  const connection: Connection = {
    id: crypto.randomUUID(),
    query: (sql) => Effect.succeed({ rows: [] }),
  }
  
  yield* Effect.log(`Connected: ${connection.id}`)
  return connection
})

const releaseConnection = (conn: Connection) =>
  Effect.log(`Released: ${conn.id}`)

// ============================================
// 2. Timeout on acquisition
// ============================================

const acquireWithTimeout = acquireConnection.pipe(
  Effect.timeout("1 second"),
  Effect.catchTag("TimeoutException", () =>
    Effect.fail(new Error("Connection timeout - database unreachable"))
  )
)

// ============================================
// 3. Timeout on usage
// ============================================

const queryWithTimeout = (conn: Connection, sql: string) =>
  conn.query(sql).pipe(
    Effect.timeout("5 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new Error(`Query timeout: ${sql}`))
    )
  )

// ============================================
// 4. Full resource lifecycle with timeouts
// ============================================

const useConnectionWithTimeouts = Effect.acquireRelease(
  acquireWithTimeout,
  releaseConnection
).pipe(
  Effect.flatMap((conn) =>
    Effect.gen(function* () {
      yield* Effect.log("Running queries...")
      
      // Each query has its own timeout
      const result1 = yield* queryWithTimeout(conn, "SELECT 1")
      const result2 = yield* queryWithTimeout(conn, "SELECT 2")
      
      return [result1, result2]
    })
  ),
  Effect.scoped
)

// ============================================
// 5. Timeout on entire operation
// ============================================

const entireOperationWithTimeout = useConnectionWithTimeouts.pipe(
  Effect.timeout("10 seconds"),
  Effect.catchTag("TimeoutException", () =>
    Effect.fail(new Error("Entire operation timed out"))
  )
)

// ============================================
// 6. Run with different scenarios
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Testing timeouts ===")
  
  const result = yield* entireOperationWithTimeout.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed: ${error.message}`)
        return []
      })
    )
  )
  
  yield* Effect.log(`Result: ${JSON.stringify(result)}`)
})

Effect.runPromise(program)
```

---

### Handling Errors with catchAll, orElse, and match

**Rule:** Use error handling combinators to recover from failures, provide fallback values, or transform errors in a composable way.

**Use Cases:** core-concepts

**Why:**

Error handling is a first-class concern in functional programming.  
By using combinators, you keep error recovery logic close to where errors may occur, and avoid scattering try/catch or null checks throughout your code.

**Good Example:**

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

**Anti-Pattern:**

Using try/catch, null checks, or imperative error handling outside the combinator world.  
This breaks composability, loses type safety, and makes error propagation unpredictable.

---

### Handling Specific Errors with catchTag and catchTags

**Rule:** Use catchTag and catchTags to handle specific tagged error types in the Effect failure channel, providing targeted recovery logic.

**Use Cases:** error-management

**Why:**

Not all errors should be handled the same way.  
By matching on specific error tags, you can provide targeted recovery logic for each error type, while letting unhandled errors propagate as needed.

**Good Example:**

```typescript
import { Effect, Data } from "effect";

// Define tagged error types
class NotFoundError extends Data.TaggedError("NotFoundError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
}> {}

type MyError = NotFoundError | ValidationError;

// Effect: Handle only ValidationError, let others propagate
const effect = Effect.fail(
  new ValidationError({ message: "Invalid input" }) as MyError
).pipe(
  Effect.catchTag("ValidationError", (err) =>
    Effect.succeed(`Recovered from validation error: ${err.message}`)
  )
); // Effect<string>

// Effect: Handle multiple error tags
const effect2 = Effect.fail(new NotFoundError() as MyError).pipe(
  Effect.catchTags({
    NotFoundError: () => Effect.succeed("Handled not found!"),
    ValidationError: (err) =>
      Effect.succeed(`Handled validation: ${err.message}`),
  })
); // Effect<string>
```

**Explanation:**

- `catchTag` lets you recover from a specific tagged error type.
- `catchTags` lets you handle multiple tagged error types in one place.
- Unhandled errors continue to propagate, preserving error safety.

**Anti-Pattern:**

Catching all errors generically (e.g., with `catchAll`) and using manual type checks or property inspection, which is less safe and more error-prone than using tagged error combinators.

---

### Implement API Authentication

**Rule:** Use middleware to validate authentication tokens before handling requests.

**Use Cases:** building-apis

**Why:**

Authentication protects your API:

1. **Identity verification** - Know who's making requests
2. **Access control** - Limit what users can do
3. **Audit trail** - Track who did what
4. **Rate limiting** - Per-user limits

---

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

---

### Instrument and Observe Function Calls with Effect.fn

**Rule:** Use Effect.fn to wrap functions with effectful instrumentation, such as logging, metrics, or tracing, in a composable and type-safe way.

**Use Cases:** observability

**Why:**

Instrumenting function calls is essential for observability, especially in complex or critical code paths.  
`Effect.fn` lets you add effectful logic (logging, metrics, tracing, etc.) before, after, or around any function call, without changing the function’s core logic.

**Good Example:**

```typescript
import { Effect } from "effect";

// A simple function to instrument
function add(a: number, b: number): number {
  return a + b;
}

// Use Effect.fn to instrument the function with observability
const addWithLogging = Effect.fn("add")(add).pipe(
  Effect.withSpan("add", { attributes: { "fn.name": "add" } })
);

// Use the instrumented function in an Effect workflow
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Calling add function");
  const sum = yield* addWithLogging(2, 3);
  yield* Effect.logInfo(`Sum is ${sum}`);
  return sum;
});

// Run the program
Effect.runPromise(program);
```

**Explanation:**

- `Effect.fn("name")(fn)` wraps a function with instrumentation capabilities, enabling observability.
- You can add tracing spans, logging, metrics, and other observability logic to function boundaries.
- Keeps instrumentation separate from business logic and fully composable.
- The wrapped function integrates seamlessly with Effect's observability and tracing infrastructure.

**Anti-Pattern:**

Scattering logging, metrics, or tracing logic directly inside business functions, making code harder to test, maintain, and compose.

---

### Leverage Effect's Built-in Structured Logging

**Rule:** Use Effect.log, Effect.logInfo, and Effect.logError to add structured, context-aware logging to your Effect code.

**Use Cases:** observability

**Why:**

Structured logging makes it easier to search, filter, and analyze logs in production.  
Effect’s logging functions are context-aware, meaning they automatically include relevant metadata and can be configured globally.

**Good Example:**

```typescript
import { Effect } from "effect";

// Log a simple message
const program = Effect.gen(function* () {
  yield* Effect.log("Starting the application");
});

// Log at different levels
const infoProgram = Effect.gen(function* () {
  yield* Effect.logInfo("User signed in");
});

const errorProgram = Effect.gen(function* () {
  yield* Effect.logError("Failed to connect to database");
});

// Log with dynamic values
const userId = 42;
const logUserProgram = Effect.gen(function* () {
  yield* Effect.logInfo(`Processing user: ${userId}`);
});

// Use logging in a workflow
const workflow = Effect.gen(function* () {
  yield* Effect.log("Beginning workflow");
  // ... do some work
  yield* Effect.logInfo("Workflow step completed");
  // ... handle errors
  yield* Effect.logError("Something went wrong");
});
```

**Explanation:**

- `Effect.log` logs a message at the default level.
- `Effect.logInfo` and `Effect.logError` log at specific levels.
- Logging is context-aware and can be used anywhere in your Effect workflows.

**Anti-Pattern:**

Using `console.log` or ad-hoc logging scattered throughout your code, which is not structured, not context-aware, and harder to manage in production.

---

### Leverage Effect's Built-in Structured Logging

**Rule:** Leverage Effect's built-in structured logging.

**Use Cases:** error-management

**Why:**

Effect's logger is structured, context-aware (with trace IDs), configurable
via `Layer`, and testable. It's a first-class citizen, not an unmanaged
side-effect.

**Good Example:**

```typescript
import { Effect } from "effect";

const program = Effect.logDebug("Processing user", { userId: 123 });

// Run the program with debug logging enabled
Effect.runSync(
  program.pipe(Effect.tap(() => Effect.log("Debug logging enabled")))
);
```

**Explanation:**  
Using Effect's logging system ensures your logs are structured, filterable,
and context-aware.

**Anti-Pattern:**

Calling `console.log` directly within an Effect composition. This is an
unmanaged side-effect that bypasses all the benefits of Effect's logging system.

---

### Log HTTP Requests and Responses

**Rule:** Use Effect's logging to trace HTTP requests for debugging and monitoring.

**Use Cases:** making-http-requests

**Why:**

HTTP logging helps with:

1. **Debugging** - See what's being sent/received
2. **Performance** - Track slow requests
3. **Auditing** - Record API usage
4. **Troubleshooting** - Diagnose production issues

---

**Good Example:**

```typescript
import { Effect, Duration } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"

// ============================================
// 1. Simple request/response logging
// ============================================

const withLogging = <A, E>(
  request: Effect.Effect<A, E, HttpClient.HttpClient>
): Effect.Effect<A, E, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const startTime = Date.now()
    yield* Effect.log("→ HTTP Request starting...")

    const result = yield* request

    const duration = Date.now() - startTime
    yield* Effect.log(`← HTTP Response received (${duration}ms)`)

    return result
  })

// ============================================
// 2. Detailed request logging
// ============================================

interface RequestLog {
  method: string
  url: string
  headers: Record<string, string>
  body?: unknown
}

interface ResponseLog {
  status: number
  headers: Record<string, string>
  duration: number
  size?: number
}

const makeLoggingClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient

  const logRequest = (method: string, url: string, headers: Record<string, string>) =>
    Effect.log("HTTP Request").pipe(
      Effect.annotateLogs({
        method,
        url,
        headers: JSON.stringify(headers),
      })
    )

  const logResponse = (status: number, duration: number, headers: Record<string, string>) =>
    Effect.log("HTTP Response").pipe(
      Effect.annotateLogs({
        status: String(status),
        duration: `${duration}ms`,
        headers: JSON.stringify(headers),
      })
    )

  return {
    get: <T>(url: string, options?: { headers?: Record<string, string> }) =>
      Effect.gen(function* () {
        const headers = options?.headers ?? {}
        yield* logRequest("GET", url, headers)
        const startTime = Date.now()

        const response = yield* baseClient.get(url)

        yield* logResponse(
          response.status,
          Date.now() - startTime,
          response.headers
        )

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      }),

    post: <T>(url: string, body: unknown, options?: { headers?: Record<string, string> }) =>
      Effect.gen(function* () {
        const headers = options?.headers ?? {}
        yield* logRequest("POST", url, headers).pipe(
          Effect.annotateLogs("body", JSON.stringify(body).slice(0, 200))
        )
        const startTime = Date.now()

        const request = yield* HttpClientRequest.post(url).pipe(
          HttpClientRequest.jsonBody(body)
        )
        const response = yield* baseClient.execute(request)

        yield* logResponse(
          response.status,
          Date.now() - startTime,
          response.headers
        )

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      }),
  }
})

// ============================================
// 3. Log with span for timing
// ============================================

const fetchWithSpan = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.withLogSpan(`HTTP GET ${url}`)
    )
  })

// ============================================
// 4. Conditional logging (debug mode)
// ============================================

const makeConditionalLoggingClient = (debug: boolean) =>
  Effect.gen(function* () {
    const baseClient = yield* HttpClient.HttpClient

    const maybeLog = (message: string, data?: Record<string, unknown>) =>
      debug
        ? Effect.log(message).pipe(
            data ? Effect.annotateLogs(data) : (e) => e
          )
        : Effect.void

    return {
      get: <T>(url: string) =>
        Effect.gen(function* () {
          yield* maybeLog("HTTP Request", { method: "GET", url })
          const startTime = Date.now()

          const response = yield* baseClient.get(url)

          yield* maybeLog("HTTP Response", {
            status: String(response.status),
            duration: `${Date.now() - startTime}ms`,
          })

          return yield* HttpClientResponse.json(response) as Effect.Effect<T>
        }),
    }
  })

// ============================================
// 5. Request ID tracking
// ============================================

const makeTrackedClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient

  return {
    get: <T>(url: string) =>
      Effect.gen(function* () {
        const requestId = crypto.randomUUID().slice(0, 8)

        yield* Effect.log("HTTP Request").pipe(
          Effect.annotateLogs({
            requestId,
            method: "GET",
            url,
          })
        )

        const startTime = Date.now()
        const response = yield* baseClient.get(url)

        yield* Effect.log("HTTP Response").pipe(
          Effect.annotateLogs({
            requestId,
            status: String(response.status),
            duration: `${Date.now() - startTime}ms`,
          })
        )

        return yield* HttpClientResponse.json(response) as Effect.Effect<T>
      })
  }
})

// ============================================
// 6. Error logging
// ============================================

const fetchWithErrorLogging = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((response) => {
        if (response.status >= 400) {
          return Effect.gen(function* () {
            yield* Effect.logError("HTTP Error").pipe(
              Effect.annotateLogs({
                url,
                status: String(response.status),
              })
            )
            return yield* Effect.fail(new Error(`HTTP ${response.status}`))
          })
        }
        return Effect.succeed(response)
      }),
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.tapError((error) =>
        Effect.logError("Request failed").pipe(
          Effect.annotateLogs({
            url,
            error: String(error),
          })
        )
      )
    )
  })

// ============================================
// 7. Usage
// ============================================

const program = Effect.gen(function* () {
  const client = yield* makeLoggingClient

  yield* Effect.log("Starting HTTP operations...")

  const data = yield* client.get("https://api.example.com/users")

  yield* Effect.log("Operations complete")
})
```

---

### Make an Outgoing HTTP Client Request

**Rule:** Use the Http.client module to make outgoing requests to keep the entire operation within the Effect ecosystem.

**Use Cases:** building-apis

**Why:**

An API server often needs to communicate with other services. While you could use the native `fetch` API, this breaks out of the Effect ecosystem and forfeits its most powerful features. Using the built-in `Http.client` is superior for several critical reasons:

1.  **Full Integration**: An `Http.client` request is a first-class `Effect`. This means it seamlessly composes with all other effects. You can add timeouts, retry logic (`Schedule`), or race it with other operations using the standard Effect operators you already know.
2.  **Structured Concurrency**: This is a key benefit. If the original incoming request to your server is cancelled or times out, Effect will automatically interrupt the outgoing `Http.client` request. A raw `fetch` call would continue running in the background, wasting resources.
3.  **Typed Errors**: The client provides a rich set of typed errors (e.g., `Http.error.RequestError`, `Http.error.ResponseError`). This allows you to write precise error handling logic to distinguish between a network failure and a non-2xx response from the external API.
4.  **Testability**: The `Http.client` can be provided via a `Layer`, making it trivial to mock in tests. You can test your route's logic without making actual network calls, leading to faster and more reliable tests.

---

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

---

### Manage Shared State Safely with Ref

**Rule:** Use Ref to manage shared, mutable state concurrently, ensuring atomicity.

**Use Cases:** concurrency

**Why:**

Directly using a mutable variable (e.g., `let myState = ...`) in a concurrent system is dangerous. Multiple fibers could try to read and write to it at the same time, leading to race conditions and unpredictable results.

`Ref` solves this by wrapping the state in a fiber-safe container. It's like a synchronized, in-memory cell. All operations on a `Ref` are atomic effects, guaranteeing that updates are applied correctly without being interrupted or interleaved with other updates. This eliminates race conditions and ensures data integrity.

---

**Good Example:**

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
const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Final counter value: ${result}`);
  return result;
});

Effect.runPromise(programWithLogging);
```

---

**Anti-Pattern:**

The anti-pattern is using a standard JavaScript variable for shared state. The following example is not guaranteed to produce the correct result.

```typescript
import { Effect } from "effect";

// ❌ WRONG: This is a classic race condition.
const programWithRaceCondition = Effect.gen(function* () {
  let count = 0; // A plain, mutable variable

  // An effect that reads, increments, and writes the variable
  const increment = Effect.sync(() => {
    const current = count;
    // Another fiber could run between this read and the write below!
    count = current + 1;
  });

  const tasks = Array.from({ length: 1000 }, () => increment);

  yield* Effect.all(tasks, { concurrency: "unbounded" });

  return count;
});

// The result is unpredictable and will likely be less than 1000.
Effect.runPromise(programWithRaceCondition).then(console.log);
```

---

### Manage Shared State Safely with Ref

**Rule:** Use Ref to safely manage shared, mutable state in concurrent and effectful programs.

**Use Cases:** core-concepts

**Why:**

Managing shared state with plain variables or objects is unsafe in concurrent or asynchronous code.  
`Ref` ensures all updates are atomic and free of race conditions, making your code robust and predictable.

**Good Example:**

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

**Anti-Pattern:**

Using plain variables or objects for shared state in concurrent or async code, which can lead to race conditions, bugs, and unpredictable behavior.

---

### Mapping and Chaining over Collections with forEach and all

**Rule:** Use forEach and all to process collections of values with effectful functions, collecting results in a type-safe and composable way.

**Use Cases:** core-concepts

**Why:**

Batch and parallel processing are common in real-world applications.  
These combinators let you express "do this for every item" declaratively, without manual loops or imperative control flow, and they preserve error handling and context propagation.

**Good Example:**

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

**Anti-Pattern:**

Using manual loops (`for`, `forEach`, etc.) with side effects, or collecting results imperatively, which breaks composability and loses error/context handling.

---

### Mapping Errors to Fit Your Domain

**Rule:** Use Effect.mapError to transform errors and create clean architectural boundaries between layers.

**Use Cases:** error-management

**Why:**

This pattern is essential for creating clean architectural boundaries and preventing "leaky abstractions." An outer layer of your application (e.g., a `UserService`) should not expose the internal failure details of the layers it depends on (e.g., a `Database` that can fail with `ConnectionError` or `QueryError`).

By using `Effect.mapError`, the outer layer can define its own, more abstract error type (like `RepositoryError`) and map all the specific, low-level errors into it. This decouples the layers. If you later swap your database implementation, you only need to update the mapping logic within the repository layer; none of the code that _uses_ the repository needs to change.

---

**Good Example:**

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
    Effect.mapError((error) => new RepositoryError({ cause: error }))
  );

// Demonstrate the error mapping
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Attempting to find user...");

  try {
    const user = yield* findUser();
    yield* Effect.logInfo(`Found user: ${user.name}`);
  } catch (error) {
    yield* Effect.logInfo("This won't be reached due to Effect error handling");
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      if (error instanceof RepositoryError) {
        yield* Effect.logInfo(`Repository error occurred: ${error._tag}`);
        if (
          error.cause instanceof ConnectionError ||
          error.cause instanceof QueryError
        ) {
          yield* Effect.logInfo(`Original cause: ${error.cause._tag}`);
        }
      } else {
        yield* Effect.logInfo(`Unexpected error: ${error}`);
      }
    })
  )
);

Effect.runPromise(program);
```

---

**Anti-Pattern:**

Allowing low-level, implementation-specific errors to "leak" out of a service's public API. This creates tight coupling between layers.

```typescript
import { Effect } from "effect";
import { ConnectionError, QueryError } from "./somewhere"; // From previous example

// ❌ WRONG: This function's error channel is "leaky".
// It exposes the internal implementation details of the database.
const findUserUnsafely = (): Effect.Effect<
  { name: string },
  ConnectionError | QueryError // <-- Leaky abstraction
> => {
  // ... logic that calls the database
  return Effect.fail(new ConnectionError());
};

// Now, any code that calls `findUserUnsafely` has to know about and handle
// both `ConnectionError` and `QueryError`. If we change the database,
// all of that calling code might have to change too.
```

---

### Matching Tagged Unions with matchTag and matchTags

**Rule:** Use matchTag and matchTags to handle specific cases of tagged unions or custom error types in a declarative, type-safe way.

**Use Cases:** error-management - pattern-matching - tagged-unions - error-handling - branching

**Why:**

Tagged unions (a.k.a. algebraic data types or ADTs) are a powerful way to model domain logic.  
Pattern matching on tags lets you handle each case explicitly, making your code robust, maintainable, and exhaustive.

**Good Example:**

```typescript
import { Data, Effect } from "effect";

// Define a tagged error type
class NotFoundError extends Data.TaggedError("NotFoundError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
}> {}

type MyError = NotFoundError | ValidationError;

// Effect: Match on specific error tags
const effect: Effect.Effect<string, never, never> = Effect.fail(
  new ValidationError({ message: "Invalid input" }) as MyError
).pipe(
  Effect.catchTags({
    NotFoundError: () => Effect.succeed("Not found!"),
    ValidationError: (err) =>
      Effect.succeed(`Validation failed: ${err.message}`),
  })
); // Effect<string>
```

**Explanation:**

- `matchTag` lets you branch on the specific tag of a tagged union or custom error type.
- This is safer and more maintainable than using `instanceof` or manual property checks.

**Anti-Pattern:**

Using `instanceof`, manual property checks, or switch statements to distinguish between cases, which is error-prone and less type-safe than declarative pattern matching.

---

### Merge Multiple Streams

**Rule:** Use merge, concat, or zip to combine multiple streams based on your requirements.

**Use Cases:** building-data-pipelines

**Why:**

Merging streams enables:

1. **Aggregation** - Combine data from multiple sources
2. **Correlation** - Match related data
3. **Multiplexing** - Single consumer for multiple producers
4. **Comparison** - Process streams side by side

---

**Good Example:**

```typescript
import { Effect, Stream, Duration, Chunk } from "effect"

// ============================================
// 1. Merge - interleave as items arrive
// ============================================

const mergeExample = Effect.gen(function* () {
  // Two streams producing at different rates
  const fast = Stream.fromIterable(["A1", "A2", "A3"]).pipe(
    Stream.tap(() => Effect.sleep("100 millis"))
  )

  const slow = Stream.fromIterable(["B1", "B2", "B3"]).pipe(
    Stream.tap(() => Effect.sleep("200 millis"))
  )

  // Merge interleaves based on arrival time
  const merged = Stream.merge(fast, slow)

  yield* merged.pipe(
    Stream.tap((item) => Effect.log(`Received: ${item}`)),
    Stream.runDrain
  )
  // Output order depends on timing: A1, B1, A2, A3, B2, B3 (approximately)
})

// ============================================
// 2. Merge all - combine many streams
// ============================================

const mergeAllExample = Effect.gen(function* () {
  const streams = [
    Stream.fromIterable([1, 2, 3]),
    Stream.fromIterable([10, 20, 30]),
    Stream.fromIterable([100, 200, 300]),
  ]

  const merged = Stream.mergeAll(streams, { concurrency: 3 })

  const results = yield* merged.pipe(Stream.runCollect)
  yield* Effect.log(`Merged: ${Chunk.toReadonlyArray(results)}`)
})

// ============================================
// 3. Concat - sequence streams
// ============================================

const concatExample = Effect.gen(function* () {
  const first = Stream.fromIterable([1, 2, 3])
  const second = Stream.fromIterable([4, 5, 6])
  const third = Stream.fromIterable([7, 8, 9])

  // Concat waits for each stream to complete
  const sequential = Stream.concat(Stream.concat(first, second), third)

  const results = yield* sequential.pipe(Stream.runCollect)
  yield* Effect.log(`Concatenated: ${Chunk.toReadonlyArray(results)}`)
  // Always: [1, 2, 3, 4, 5, 6, 7, 8, 9]
})

// ============================================
// 4. Zip - pair items from streams
// ============================================

const zipExample = Effect.gen(function* () {
  const names = Stream.fromIterable(["Alice", "Bob", "Charlie"])
  const ages = Stream.fromIterable([30, 25, 35])

  // Zip pairs items by position
  const zipped = Stream.zip(names, ages)

  yield* zipped.pipe(
    Stream.tap(([name, age]) => Effect.log(`${name} is ${age} years old`)),
    Stream.runDrain
  )
})

// ============================================
// 5. ZipWith - pair and transform
// ============================================

const zipWithExample = Effect.gen(function* () {
  const prices = Stream.fromIterable([100, 200, 150])
  const quantities = Stream.fromIterable([2, 1, 3])

  // Zip and calculate total
  const totals = Stream.zipWith(prices, quantities, (price, qty) => ({
    price,
    quantity: qty,
    total: price * qty,
  }))

  yield* totals.pipe(
    Stream.tap((item) => Effect.log(`${item.quantity}x @ $${item.price} = $${item.total}`)),
    Stream.runDrain
  )
})

// ============================================
// 6. ZipLatest - combine with latest values
// ============================================

const zipLatestExample = Effect.gen(function* () {
  // Simulate different update rates
  const temperature = Stream.fromIterable([20, 21, 22, 23]).pipe(
    Stream.tap(() => Effect.sleep("100 millis"))
  )

  const humidity = Stream.fromIterable([50, 55, 60]).pipe(
    Stream.tap(() => Effect.sleep("150 millis"))
  )

  // ZipLatest always uses the latest value from each stream
  const combined = Stream.zipLatest(temperature, humidity)

  yield* combined.pipe(
    Stream.tap(([temp, hum]) => Effect.log(`Temp: ${temp}°C, Humidity: ${hum}%`)),
    Stream.runDrain
  )
})

// ============================================
// 7. Practical example: Merge event sources
// ============================================

interface Event {
  source: string
  type: string
  data: unknown
}

const mergeEventSources = Effect.gen(function* () {
  // Simulate multiple event sources
  const mouseEvents = Stream.fromIterable([
    { source: "mouse", type: "click", data: { x: 100, y: 200 } },
    { source: "mouse", type: "move", data: { x: 150, y: 250 } },
  ] as Event[])

  const keyboardEvents = Stream.fromIterable([
    { source: "keyboard", type: "keydown", data: { key: "Enter" } },
    { source: "keyboard", type: "keyup", data: { key: "Enter" } },
  ] as Event[])

  const networkEvents = Stream.fromIterable([
    { source: "network", type: "response", data: { status: 200 } },
  ] as Event[])

  // Merge all event sources
  const allEvents = Stream.mergeAll([mouseEvents, keyboardEvents, networkEvents])

  yield* allEvents.pipe(
    Stream.tap((event) =>
      Effect.log(`[${event.source}] ${event.type}: ${JSON.stringify(event.data)}`)
    ),
    Stream.runDrain
  )
})

// ============================================
// 8. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Merge Example ===")
  yield* mergeExample

  yield* Effect.log("\n=== Concat Example ===")
  yield* concatExample

  yield* Effect.log("\n=== Zip Example ===")
  yield* zipExample
})

Effect.runPromise(program)
```

---

### Mocking Dependencies in Tests

**Rule:** Provide mock service implementations via a test-specific Layer to isolate the unit under test.

**Use Cases:** testing

**Why:**

The primary goal of a unit test is to verify the logic of a single unit of code, independent of its external dependencies. Effect's dependency injection system is designed to make this easy and type-safe.

By providing a mock `Layer` in your test, you replace a real dependency (like an `HttpClient` that makes network calls) with a fake one that returns predictable data. This provides several key benefits:

- **Determinism:** Your tests always produce the same result, free from the flakiness of network or database connections.
- **Speed:** Tests run instantly without waiting for slow I/O operations.
- **Type Safety:** The TypeScript compiler ensures your mock implementation perfectly matches the real service's interface, preventing your tests from becoming outdated.
- **Explicitness:** The test setup clearly documents all the dependencies required for the code to run.

---

**Good Example:**

We want to test a `Notifier` service that uses an `EmailClient` to send emails. In our test, we provide a mock `EmailClient` that doesn't actually send emails but just returns a success value.

```typescript
import { Effect, Layer } from "effect";

// --- The Services ---
interface EmailClientService {
  send: (address: string, body: string) => Effect.Effect<void>;
}

class EmailClient extends Effect.Service<EmailClientService>()("EmailClient", {
  sync: () => ({
    send: (address: string, body: string) =>
      Effect.sync(() => Effect.log(`Sending email to ${address}: ${body}`)),
  }),
}) {}

interface NotifierService {
  notifyUser: (userId: number, message: string) => Effect.Effect<void>;
}

class Notifier extends Effect.Service<NotifierService>()("Notifier", {
  effect: Effect.gen(function* () {
    const emailClient = yield* EmailClient;
    return {
      notifyUser: (userId: number, message: string) =>
        emailClient.send(`user-${userId}@example.com`, message),
    };
  }),
  dependencies: [EmailClient.Default],
}) {}

// Create a program that uses the Notifier service
const program = Effect.gen(function* () {
  yield* Effect.log("Using default EmailClient implementation...");
  const notifier = yield* Notifier;
  yield* notifier.notifyUser(123, "Your invoice is ready.");

  // Create mock EmailClient that logs differently
  yield* Effect.log("\nUsing mock EmailClient implementation...");
  const mockEmailClient = Layer.succeed(EmailClient, {
    send: (address: string, body: string) =>
      // Directly return the Effect.log without nesting it in Effect.sync
      Effect.log(`MOCK: Would send to ${address} with body: ${body}`),
  } as EmailClientService);

  // Run the same notification with mock client
  yield* Effect.gen(function* () {
    const notifier = yield* Notifier;
    yield* notifier.notifyUser(123, "Your invoice is ready.");
  }).pipe(Effect.provide(mockEmailClient));
});

// Run the program
Effect.runPromise(Effect.provide(program, Notifier.Default));
```

---

**Anti-Pattern:**

Testing your business logic using the "live" implementation of its dependencies. This creates an integration test, not a unit test. It will be slow, unreliable, and may have real-world side effects (like actually sending an email).

```typescript
import { Effect } from "effect";
import { NotifierLive } from "./somewhere";
import { EmailClientLive } from "./somewhere"; // The REAL email client

// ❌ WRONG: This test will try to send a real email.
it("sends a real email", () =>
  Effect.gen(function* () {
    const notifier = yield* Notifier;
    yield* notifier.notifyUser(123, "This is a test email!");
  }).pipe(
    Effect.provide(NotifierLive),
    Effect.provide(EmailClientLive), // Using the live layer makes this an integration test
    Effect.runPromise
  ));
```

---

### Model Dependencies as Services

**Rule:** Model dependencies as services.

**Use Cases:** making-http-requests

**Why:**

This pattern is the key to testability. It allows you to provide a `Live` implementation in production and a `Test` implementation (returning mock data) in your tests, making your code decoupled and reliable.

**Good Example:**

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

**Anti-Pattern:**

Directly calling external APIs like `fetch` or using impure functions like `Math.random()` within your business logic. This tightly couples your logic to a specific implementation and makes it difficult to test.

---

### Model Optional Values Safely with Option

**Rule:** Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

**Use Cases:** domain-modeling

**Why:**

Functions that can return a value or `null`/`undefined` are a primary source of runtime errors in TypeScript (`Cannot read properties of null`).

The `Option` type solves this by making the possibility of an absent value explicit in the type system. A function that returns `Option<User>` cannot be mistaken for a function that returns `User`. The compiler forces you to handle the `None` case before you can access the value inside a `Some`, eliminating an entire class of bugs.

---

**Good Example:**

A function that looks for a user in a database is a classic use case. It might find a user, or it might not. Returning an `Option<User>` makes this contract explicit and safe.

```typescript
import { Effect, Option } from "effect";

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
    })
  );

const program = Effect.gen(function* () {
  yield* Effect.log(greeting(1)); // "Welcome, Paul!"
  yield* Effect.log(greeting(3)); // "User not found."
});

Effect.runPromise(program);
```

**Anti-Pattern:**

The anti-pattern is returning a nullable type (e.g., User | null or User | undefined). This relies on the discipline of every single caller to perform a null check. Forgetting even one check can introduce a runtime error.

```typescript
interface User {
  id: number;
  name: string;
}
const users: User[] = [{ id: 1, name: "Paul" }];

// ❌ WRONG: This function's return type is less safe.
const findUserUnsafely = (id: number): User | undefined => {
  return users.find((u) => u.id === id);
};

const user = findUserUnsafely(3);

// This will throw "TypeError: Cannot read properties of undefined (reading 'name')"
// because the caller forgot to check if the user exists.
console.log(`User's name is ${user.name}`);
```

---

### Model Validated Domain Types with Brand

**Rule:** Model validated domain types with Brand.

**Use Cases:** domain-modeling

**Why:**

This pattern moves validation to the boundaries of your system. Once a value
has been branded, the rest of your application can trust that it is valid,
eliminating repetitive checks.

**Good Example:**

```typescript
import { Brand, Option } from "effect";

type Email = string & Brand.Brand<"Email">;

const makeEmail = (s: string): Option.Option<Email> =>
  s.includes("@") ? Option.some(s as Email) : Option.none();

// A function can now trust that its input is a valid email.
const sendEmail = (email: Email, body: string) => {
  /* ... */
};
```

**Explanation:**  
Branding ensures that only validated values are used, reducing bugs and
repetitive checks.

**Anti-Pattern:**

"Primitive obsession"—using raw primitives (`string`, `number`) and performing
validation inside every function that uses them. This is repetitive and
error-prone.

---

### Modeling Effect Results with Exit

**Rule:** Use Exit to capture the outcome of an Effect, including success, failure, and defects, for robust error handling and coordination.

**Use Cases:** core-concepts

**Why:**

When running or supervising effects, you often need to know not just if they succeeded or failed, but _how_ they failed (e.g., error vs. defect).  
`Exit` provides a complete, type-safe summary of an effect's outcome.

**Good Example:**

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

**Anti-Pattern:**

Ignoring the outcome of an effect, or only handling success/failure without distinguishing between error types or defects, which can lead to missed errors and less robust code.

---

### Modeling Tagged Unions with Data.case

**Rule:** Use Data.case to define tagged unions (ADTs) for modeling domain-specific states and enabling exhaustive pattern matching.

**Use Cases:** core-concepts

**Why:**

Modeling domain logic with tagged unions ensures that all cases are handled, prevents illegal states, and enables safe, exhaustive pattern matching.  
`Data.case` provides a concise, type-safe way to define and use ADTs in your application.

**Good Example:**

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

**Anti-Pattern:**

Using plain objects or enums for domain states, which can lead to illegal states, missed cases, and less type-safe pattern matching.

---

### Modeling Validated Domain Types with Brand

**Rule:** Use Brand to define types like Email, UserId, or PositiveInt, ensuring only valid values can be constructed and used.

**Use Cases:** domain-modeling

**Why:**

Branded types add a layer of type safety, ensuring that values like `Email`, `UserId`, or `PositiveInt` are not confused with plain strings or numbers.  
They help you catch bugs at compile time and make your code more self-documenting.

**Good Example:**

```typescript
import { Brand } from "effect";

// Define a branded type for Email
type Email = string & Brand.Brand<"Email">;

// Function that only accepts Email, not any string
function sendWelcome(email: Email) {
  // ...
}

// Constructing an Email value (unsafe, see next pattern for validation)
const email = "user@example.com" as Email;

sendWelcome(email); // OK
// sendWelcome("not-an-email"); // Type error! (commented to allow compilation)
```

**Explanation:**

- `Brand.Branded<T, Name>` creates a new type that is distinct from its base type.
- Only values explicitly branded as `Email` can be used where an `Email` is required.
- This prevents accidental mixing of domain types.

**Anti-Pattern:**

Using plain strings or numbers for domain-specific values (like emails, user IDs, or currency codes), which can lead to accidental misuse and bugs that are hard to catch.

---

### Optional Pattern 1: Handling None and Some Values

**Rule:** Use Option to represent values that may not exist, replacing null/undefined with type-safe Option that forces explicit handling.

**Use Cases:** value-handling

**Why:**

Null/undefined causes widespread bugs:

**Problem 1: Billion-dollar mistake**
- Tony Hoare invented null in ALGOL in 1965
- Created "billion-dollar mistake"
- 90% of security vulnerabilities involve null handling

**Problem 2: Undefined behavior**
- `user.profile.name` - any property could be null
- Runtime error: "Cannot read property 'name' of undefined"
- No compile-time warning
- Production crash

**Problem 3: Silent failures**
- Function returns null on failure
- Caller doesn't check
- Uses null as if it's a value
- Corrupts state downstream

**Problem 4: Conditional hell**
```javascript
if (user !== null && user.profile !== null && user.profile.name !== null) {
  // Do thing
}
```

Solutions:

**Option type**:
- `Some(value)` = value exists
- `None` = value doesn't exist
- Type system forces checking
- No silent null checks possible

**Pattern matching**:
- `Option.match()`
- Handle both cases explicitly
- Compiler warns if you miss one

**Chaining**:
- `option.map().flatMap().match()`
- Pipeline of operations
- Null-safe by design

---

**Good Example:**

This example demonstrates Option handling patterns.

```typescript
import { Effect, Option } from "effect";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Profile {
  bio: string;
  website?: string;
  location?: string;
}

const program = Effect.gen(function* () {
  console.log(
    `\n[OPTION HANDLING] None/Some values and pattern matching\n`
  );

  // Example 1: Creating Options
  console.log(`[1] Creating Option values:\n`);

  const someValue: Option.Option<string> = Option.some("data");
  const noneValue: Option.Option<string> = Option.none();

  const displayOption = <T,>(opt: Option.Option<T>, label: string) =>
    Effect.gen(function* () {
      if (Option.isSome(opt)) {
        yield* Effect.log(`${label}: Some(${opt.value})`);
      } else {
        yield* Effect.log(`${label}: None`);
      }
    });

  yield* displayOption(someValue, "someValue");
  yield* displayOption(noneValue, "noneValue");

  // Example 2: Creating from nullable values
  console.log(`\n[2] Converting nullable to Option:\n`);

  const possiblyNull = (shouldExist: boolean): string | null =>
    shouldExist ? "found" : null;

  const toOption = (value: string | null | undefined): Option.Option<string> =>
    value ? Option.some(value) : Option.none();

  const opt1 = toOption(possiblyNull(true));
  const opt2 = toOption(possiblyNull(false));

  yield* displayOption(opt1, "toOption(found)");
  yield* displayOption(opt2, "toOption(null)");

  // Example 3: Pattern matching on Option
  console.log(`\n[3] Pattern matching with match():\n`);

  const userId: Option.Option<string> = Option.some("user-123");

  const message = Option.match(userId, {
    onSome: (id) => `User ID: ${id}`,
    onNone: () => "No user found",
  });

  yield* Effect.log(`[MATCH] ${message}`);

  const emptyUserId: Option.Option<string> = Option.none();

  const emptyMessage = Option.match(emptyUserId, {
    onSome: (id) => `User ID: ${id}`,
    onNone: () => "No user found",
  });

  yield* Effect.log(`[MATCH] ${emptyMessage}\n`);

  // Example 4: Transforming with map
  console.log(`[4] Transforming values with map():\n`);

  const userCount: Option.Option<number> = Option.some(42);

  const doubled = Option.map(userCount, (count) => count * 2);

  yield* displayOption(doubled, "doubled");

  // Chaining maps
  const email: Option.Option<string> = Option.some("user@example.com");

  const domain = Option.map(email, (e) =>
    e.split("@")[1] ?? "unknown"
  );

  yield* displayOption(domain, "email domain");

  // Example 5: Chaining with flatMap
  console.log(`\n[5] Chaining operations with flatMap():\n`);

  const findUser = (id: string): Option.Option<User> =>
    id === "user-1"
      ? Option.some({ id, name: "Alice", email: "alice@example.com" })
      : Option.none();

  const getProfile = (userId: string): Option.Option<Profile> =>
    userId === "user-1"
      ? Option.some({ bio: "Developer", website: "alice.dev" })
      : Option.none();

  const userId2 = Option.some("user-1");

  // Chained operations: userId -> user -> profile
  const profileChain = Option.flatMap(userId2, (id) =>
    Option.flatMap(findUser(id), (user) =>
      getProfile(user.id)
    )
  );

  const profileResult = Option.match(profileChain, {
    onSome: (profile) => `Bio: ${profile.bio}, Website: ${profile.website}`,
    onNone: () => "No profile found",
  });

  yield* Effect.log(`[CHAIN] ${profileResult}\n`);

  // Example 6: Fallback values with getOrElse
  console.log(`[6] Default values with getOrElse():\n`);

  const optionalStatus: Option.Option<string> = Option.none();

  const status = Option.getOrElse(optionalStatus, () => "unknown");

  yield* Effect.log(`[DEFAULT] Status: ${status}`);

  // Real value
  const knownStatus: Option.Option<string> = Option.some("active");

  const realStatus = Option.getOrElse(knownStatus, () => "unknown");

  yield* Effect.log(`[VALUE] Status: ${realStatus}\n`);

  // Example 7: Filter with predicate
  console.log(`[7] Filtering with conditions:\n`);

  const ageOption: Option.Option<number> = Option.some(25);

  const isAdult = Option.filter(ageOption, (age) => age >= 18);

  yield* displayOption(isAdult, "Adult check (25)");

  const ageOption2: Option.Option<number> = Option.some(15);

  const isAdult2 = Option.filter(ageOption2, (age) => age >= 18);

  yield* displayOption(isAdult2, "Adult check (15)");

  // Example 8: Multiple Options (all present?)
  console.log(`\n[8] Combining multiple Options:\n`);

  const firstName: Option.Option<string> = Option.some("John");
  const lastName: Option.Option<string> = Option.some("Doe");
  const middleName: Option.Option<string> = Option.none();

  // All three present?
  const allPresent = Option.all([firstName, lastName, middleName]);

  yield* displayOption(allPresent, "All present");

  // Just two
  const twoPresent = Option.all([firstName, lastName]);

  yield* displayOption(twoPresent, "Two present");

  // Example 9: Converting Option to Error
  console.log(`\n[9] Converting Option to Result/Error:\n`);

  const optionalConfig: Option.Option<{ apiKey: string }> = Option.none();

  const configOrError = Option.match(optionalConfig, {
    onSome: (config) => config,
    onNone: () => {
      throw new Error("Configuration not found");
    },
  });

  // In real code, would catch error
  const result = Option.match(optionalConfig, {
    onSome: (config) => ({ success: true, value: config }),
    onNone: () => ({ success: false, error: "config-not-found" }),
  });

  yield* Effect.log(`[CONVERT] ${JSON.stringify(result)}\n`);

  // Example 10: Option in business logic
  console.log(`[10] Practical: Optional user settings:\n`);

  const userSettings: Option.Option<{
    theme: string;
    notifications: boolean;
  }> = Option.some({
    theme: "dark",
    notifications: true,
  });

  const getTheme = Option.map(userSettings, (s) => s.theme);
  const theme = Option.getOrElse(getTheme, () => "light"); // Default

  yield* Effect.log(`[SETTING] Theme: ${theme}`);

  // No settings
  const noSettings: Option.Option<{ theme: string; notifications: boolean }> =
    Option.none();

  const noTheme = Option.map(noSettings, (s) => s.theme);
  const defaultTheme = Option.getOrElse(noTheme, () => "light");

  yield* Effect.log(`[DEFAULT] Theme: ${defaultTheme}`);
});

Effect.runPromise(program);
```

---

---

### Parse and Validate Data with Schema.decode

**Rule:** Parse and validate data with Schema.decode.

**Use Cases:** domain-modeling

**Why:**

Unlike the older `Schema.parse` which throws, `Schema.decode` is fully
integrated into the Effect ecosystem, allowing you to handle validation
failures gracefully with operators like `Effect.catchTag`.

**Good Example:**

```typescript
import { Effect, Schema } from "effect";

interface User {
  name: string;
}

const UserSchema = Schema.Struct({
  name: Schema.String,
}) as Schema.Schema<User>;

const processUserInput = (input: unknown) =>
  Effect.gen(function* () {
    const user = yield* Schema.decodeUnknown(UserSchema)(input);
    return `Welcome, ${user.name}!`;
  }).pipe(
    Effect.catchTag("ParseError", () => Effect.succeed("Invalid user data."))
  );

// Demonstrate the schema parsing
const program = Effect.gen(function* () {
  // Test with valid input
  const validInput = { name: "Paul" };
  const validResult = yield* processUserInput(validInput);
  yield* Effect.logInfo(`Valid input result: ${validResult}`);

  // Test with invalid input
  const invalidInput = { age: 25 }; // Missing 'name' field
  const invalidResult = yield* processUserInput(invalidInput);
  yield* Effect.logInfo(`Invalid input result: ${invalidResult}`);

  // Test with completely invalid input
  const badInput = "not an object";
  const badResult = yield* processUserInput(badInput);
  yield* Effect.logInfo(`Bad input result: ${badResult}`);
});

Effect.runPromise(program);
```

**Explanation:**  
`Schema.decode` integrates parsing and validation into the Effect workflow,
making error handling composable and type-safe.

**Anti-Pattern:**

Using `Schema.parse(schema)(input)`, as it throws an exception. This forces
you to use `try/catch` blocks, which breaks the composability of Effect.

---

### Platform Pattern 1: Execute Shell Commands

**Rule:** Use Command to spawn and manage external processes, capturing output and handling exit codes reliably with proper error handling.

**Use Cases:** platform

**Why:**

Shell integration without proper handling causes issues:

- **Unhandled errors**: Non-zero exit codes lost
- **Deadlocks**: Stdout buffer fills if not drained
- **Resource leaks**: Processes left running
- **Output loss**: stderr ignored
- **Race conditions**: Unsafe concurrent execution

Command enables:

- **Type-safe execution**: Success/failure handled in Effect
- **Output capture**: Both stdout and stderr available
- **Resource cleanup**: Automatic process termination
- **Exit code handling**: Explicit error mapping

Real-world example: Build pipeline
- **Direct**: Process spawned, output mixed with app logs, exit code ignored
- **With Command**: Output captured, exit code checked, errors propagated

---

**Good Example:**

This example demonstrates executing commands and handling their output.

```typescript
import { Command, Effect, Chunk } from "@effect/platform";

// Simple command execution
const program = Effect.gen(function* () {
  console.log(`\n[COMMAND] Executing shell commands\n`);

  // Example 1: List files
  console.log(`[1] List files in current directory:\n`);

  const lsResult = yield* Command.make("ls", ["-la"]).pipe(
    Command.string
  );

  console.log(lsResult);

  // Example 2: Get current date
  console.log(`\n[2] Get current date:\n`);

  const dateResult = yield* Command.make("date", ["+%Y-%m-%d %H:%M:%S"]).pipe(
    Command.string
  );

  console.log(`Current date: ${dateResult.trim()}`);

  // Example 3: Capture exit code
  console.log(`\n[3] Check if file exists:\n`);

  const fileCheckCmd = yield* Command.make("test", [
    "-f",
    "/etc/passwd",
  ]).pipe(
    Command.exitCode,
    Effect.either
  );

  if (fileCheckCmd._tag === "Right") {
    console.log(`✓ File exists (exit code: 0)`);
  } else {
    console.log(`✗ File not found (exit code: ${fileCheckCmd.left})`);
  }

  // Example 4: Execute with custom working directory
  console.log(`\n[4] List TypeScript files:\n`);

  const findResult = yield* Command.make("find", [
    ".",
    "-name",
    "*.ts",
    "-type",
    "f",
  ]).pipe(
    Command.lines
  );

  const tsFiles = Chunk.take(findResult, 5); // First 5

  Chunk.forEach(tsFiles, (file) => {
    console.log(`  - ${file}`);
  });

  if (Chunk.size(findResult) > 5) {
    console.log(`  ... and ${Chunk.size(findResult) - 5} more`);
  }

  // Example 5: Handle command failure
  console.log(`\n[5] Handle command failure gracefully:\n`);

  const failResult = yield* Command.make("false").pipe(
    Command.exitCode,
    Effect.catchAll((error) =>
      Effect.succeed(-1) // Return -1 for any error
    )
  );

  console.log(`Exit code: ${failResult}`);
});

Effect.runPromise(program);
```

---

---

### Platform Pattern 3: Persistent Key-Value Storage

**Rule:** Use KeyValueStore for simple persistent storage of key-value pairs, enabling lightweight caching and session management.

**Use Cases:** platform

**Why:**

Without persistent storage, transient data is lost:

- **Session data**: Lost on restart
- **Caches**: Rebuilt from scratch
- **Configuration**: Hardcoded or file-based
- **State**: Scattered across code

KeyValueStore enables:

- **Transparent persistence**: Automatic backend handling
- **Simple API**: Key-value abstraction
- **Pluggable backends**: Memory, filesystem, database
- **Effect integration**: Type-safe, composable

Real-world example: Caching API responses
- **Direct**: Cache in memory Map (lost on restart)
- **With KeyValueStore**: Persistent across restarts

---

**Good Example:**

This example demonstrates storing and retrieving persistent data.

```typescript
import { KeyValueStore, Effect } from "@effect/platform";

interface UserSession {
  readonly userId: string;
  readonly token: string;
  readonly expiresAt: number;
}

const program = Effect.gen(function* () {
  console.log(`\n[KEYVALUESTORE] Persistent storage example\n`);

  const store = yield* KeyValueStore.KeyValueStore;

  // Example 1: Store session data
  console.log(`[1] Storing session:\n`);

  const session: UserSession = {
    userId: "user-123",
    token: "token-abc-def",
    expiresAt: Date.now() + 3600000, // 1 hour
  };

  yield* store.set("session:user-123", JSON.stringify(session));

  yield* Effect.log(`✓ Session stored`);

  // Example 2: Retrieve stored data
  console.log(`\n[2] Retrieving session:\n`);

  const stored = yield* store.get("session:user-123");

  if (stored._tag === "Some") {
    const retrievedSession = JSON.parse(stored.value) as UserSession;

    console.log(`  User ID: ${retrievedSession.userId}`);
    console.log(`  Token: ${retrievedSession.token}`);
    console.log(
      `  Expires: ${new Date(retrievedSession.expiresAt).toISOString()}`
    );
  }

  // Example 3: Check if key exists
  console.log(`\n[3] Checking keys:\n`);

  const hasSession = yield* store.has("session:user-123");
  const hasOther = yield* store.has("session:user-999");

  console.log(`  Has session:user-123: ${hasSession}`);
  console.log(`  Has session:user-999: ${hasOther}`);

  // Example 4: Store multiple cache entries
  console.log(`\n[4] Caching API responses:\n`);

  const apiResponses = [
    { endpoint: "/api/users", data: [{ id: 1, name: "Alice" }] },
    { endpoint: "/api/posts", data: [{ id: 1, title: "First Post" }] },
    { endpoint: "/api/comments", data: [] },
  ];

  yield* Effect.all(
    apiResponses.map((item) =>
      store.set(
        `cache:${item.endpoint}`,
        JSON.stringify(item.data)
      )
    )
  );

  yield* Effect.log(`✓ Cached ${apiResponses.length} endpoints`);

  // Example 5: Retrieve cache with expiration
  console.log(`\n[5] Checking cached data:\n`);

  for (const item of apiResponses) {
    const cached = yield* store.get(`cache:${item.endpoint}`);

    if (cached._tag === "Some") {
      const data = JSON.parse(cached.value);

      console.log(
        `  ${item.endpoint}: ${Array.isArray(data) ? data.length : 1} items`
      );
    }
  }

  // Example 6: Remove specific entry
  console.log(`\n[6] Removing entry:\n`);

  yield* store.remove("cache:/api/comments");

  const removed = yield* store.has("cache:/api/comments");

  console.log(`  Exists after removal: ${removed}`);

  // Example 7: Iterate and count entries
  console.log(`\n[7] Counting entries:\n`);

  const allKeys = yield* store.entries.pipe(
    Effect.map((entries) => entries.length)
  );

  console.log(`  Total entries: ${allKeys}`);
});

Effect.runPromise(program);
```

---

---

### Platform Pattern 5: Cross-Platform Path Manipulation

**Rule:** Use Effect's platform-aware path utilities to handle separators, absolute/relative paths, and environment variables consistently.

**Use Cases:** platform

**Why:**

String-based path handling causes problems:

**Problem 1: Platform inconsistency**
- Write path: `"C:\data\file.txt"` (Windows)
- Ship to Linux, gets interpreted as literal "C:\data\file.txt"
- File not found errors, production outage

**Problem 2: Path traversal attacks**
- User supplies path: `"../../../../etc/passwd"`
- No validation → reads sensitive files
- Security vulnerability

**Problem 3: Environment variable expansion**
- User's config: `"$HOME/myapp/data"`
- Without expansion: literal `$HOME` in path
- Can't find files

**Problem 4: Symlink resolution**
- File at `/etc/ssl/certs/ca-bundle.crt` (symlink)
- Real file at `/usr/share/ca-certificates/ca-bundle.crt`
- Both point to same file, but string equality fails

Solutions:

**Platform-aware API**:
- `path.join()` handles separators
- `path.resolve()` creates absolute paths
- `path.parse()` components
- Auto-handles platform differences

**Variable expansion**:
- `$HOME`, `~` → user home
- `$USER` → username
- `$PWD` → current directory

**Validation**:
- Reject paths with `..`
- Reject absolute paths from untrusted input
- Contain paths within base directory

---

**Good Example:**

This example demonstrates cross-platform path manipulation.

```typescript
import { Effect, FileSystem } from "@effect/platform";
import * as Path from "node:path";
import * as OS from "node:os";

interface PathOperation {
  readonly input: string;
  readonly description: string;
}

// Platform info
const getPlatformInfo = () =>
  Effect.gen(function* () {
    const platform = process.platform;
    const separator = Path.sep;
    const delimiter = Path.delimiter;
    const homeDir = OS.homedir();

    yield* Effect.log(
      `[PLATFORM] OS: ${platform}, Separator: "${separator}", Home: ${homeDir}`
    );

    return { platform, separator, delimiter, homeDir };
  });

const program = Effect.gen(function* () {
  console.log(`\n[PATH MANIPULATION] Cross-platform path operations\n`);

  const platformInfo = yield* getPlatformInfo();

  // Example 1: Path joining (handles separators)
  console.log(`\n[1] Joining paths (handles separators automatically):\n`);

  const segments = ["data", "reports", "2024"];

  const joinedPath = Path.join(...segments);

  yield* Effect.log(`[JOIN] Input: ${segments.join(" + ")}`);
  yield* Effect.log(`[JOIN] Output: ${joinedPath}`);

  // Example 2: Resolving to absolute paths
  console.log(`\n[2] Resolving relative → absolute:\n`);

  const relativePath = "./config/settings.json";

  const absolutePath = Path.resolve(relativePath);

  yield* Effect.log(`[RESOLVE] Relative: ${relativePath}`);
  yield* Effect.log(`[RESOLVE] Absolute: ${absolutePath}`);

  // Example 3: Path parsing
  console.log(`\n[3] Parsing path components:\n`);

  const filePath = "/home/user/documents/report.pdf";

  const parsed = Path.parse(filePath);

  yield* Effect.log(`[PARSE] Input: ${filePath}`);
  yield* Effect.log(`  root: ${parsed.root}`);
  yield* Effect.log(`  dir: ${parsed.dir}`);
  yield* Effect.log(`  base: ${parsed.base}`);
  yield* Effect.log(`  name: ${parsed.name}`);
  yield* Effect.log(`  ext: ${parsed.ext}`);

  // Example 4: Environment variable expansion
  console.log(`\n[4] Environment variable expansion:\n`);

  const expandPath = (pathStr: string): string => {
    let result = pathStr;

    // Expand common variables
    result = result.replace("$HOME", OS.homedir());
    result = result.replace("~", OS.homedir());
    result = result.replace("$USER", process.env.USER || "user");
    result = result.replace("$PWD", process.cwd());

    // Handle Windows-style env vars
    result = result.replace(/%USERPROFILE%/g, OS.homedir());
    result = result.replace(/%USERNAME%/g, process.env.USERNAME || "user");
    result = result.replace(/%TEMP%/g, OS.tmpdir());

    return result;
  };

  const envPaths = [
    "$HOME/myapp/data",
    "~/documents/file.txt",
    "$PWD/config",
    "/var/log/app.log",
  ];

  for (const envPath of envPaths) {
    const expanded = expandPath(envPath);

    yield* Effect.log(
      `[EXPAND] ${envPath} → ${expanded}`
    );
  }

  // Example 5: Path normalization (remove redundant separators)
  console.log(`\n[5] Path normalization:\n`);

  const messyPaths = [
    "/home//user///documents",
    "C:\\Users\\\\documents\\\\file.txt",
    "./config/../config/./settings",
    "../data/../../root",
  ];

  for (const messy of messyPaths) {
    const normalized = Path.normalize(messy);

    yield* Effect.log(
      `[NORMALIZE] ${messy}`
    );
    yield* Effect.log(
      `[NORMALIZE]   → ${normalized}`
    );
  }

  // Example 6: Safe path construction with base directory
  console.log(`\n[6] Safe path construction (path traversal prevention):\n`);

  const baseDir = "/var/app/data";

  const safeJoin = (base: string, userPath: string): Result<string> => {
    // Reject absolute paths from untrusted input
    if (Path.isAbsolute(userPath)) {
      return { success: false, reason: "Absolute paths not allowed" };
    }

    // Reject paths with ..
    if (userPath.includes("..")) {
      return { success: false, reason: "Path traversal attempt detected" };
    }

    // Resolve and verify within base
    const fullPath = Path.resolve(base, userPath);

    if (!fullPath.startsWith(base)) {
      return { success: false, reason: "Path escapes base directory" };
    }

    return { success: true, path: fullPath };
  };

  interface Result<T> {
    success: boolean;
    reason?: string;
    path?: T;
  }

  const testPaths = [
    "reports/2024.json",
    "/etc/passwd",
    "../../../root",
    "data/file.txt",
  ];

  for (const test of testPaths) {
    const result = safeJoin(baseDir, test);

    if (result.success) {
      yield* Effect.log(`[SAFE] ✓ ${test} → ${result.path}`);
    } else {
      yield* Effect.log(`[SAFE] ✗ ${test} (${result.reason})`);
    }
  }

  // Example 7: Relative path calculation
  console.log(`\n[7] Computing relative paths:\n`);

  const fromDir = "/home/user/projects/myapp";
  const toPath = "/home/user/data/config.json";

  const relativePath2 = Path.relative(fromDir, toPath);

  yield* Effect.log(`[RELATIVE] From: ${fromDir}`);
  yield* Effect.log(`[RELATIVE] To: ${toPath}`);
  yield* Effect.log(`[RELATIVE] Relative: ${relativePath2}`);

  // Example 8: Common path patterns
  console.log(`\n[8] Common patterns:\n`);

  // Get file extension
  const fileName = "document.tar.gz";
  const ext = Path.extname(fileName);
  const baseName = Path.basename(fileName);
  const dirName = Path.dirname("/home/user/file.txt");

  yield* Effect.log(`[PATTERNS] File: ${fileName}`);
  yield* Effect.log(`  basename: ${baseName}`);
  yield* Effect.log(`  dirname: ${dirName}`);
  yield* Effect.log(`  extname: ${ext}`);

  // Example 9: Path segments array
  console.log(`\n[9] Path segments:\n`);

  const segmentPath = "/home/user/documents/report.pdf";

  const segments2 = segmentPath.split(Path.sep).filter((s) => s);

  yield* Effect.log(`[SEGMENTS] ${segmentPath}`);
  yield* Effect.log(`[SEGMENTS] → [${segments2.map((s) => `"${s}"`).join(", ")}]`);
});

Effect.runPromise(program);
```

---

---

### Pool Resources for Reuse

**Rule:** Use Pool to manage expensive resources that can be reused across operations.

**Use Cases:** resource-management

**Why:**

Creating resources is expensive:

1. **Database connections** - TCP handshake, authentication
2. **HTTP clients** - Connection setup, TLS negotiation
3. **Worker threads** - Spawn overhead
4. **File handles** - System calls

Pooling amortizes this cost across many operations.

---

**Good Example:**

```typescript
import { Effect, Pool, Scope, Duration } from "effect"

// ============================================
// 1. Define a poolable resource
// ============================================

interface DatabaseConnection {
  readonly id: number
  readonly query: (sql: string) => Effect.Effect<unknown[]>
  readonly close: () => Effect.Effect<void>
}

let connectionId = 0

const createConnection = Effect.gen(function* () {
  const id = ++connectionId
  yield* Effect.log(`Creating connection ${id}`)
  
  // Simulate connection setup time
  yield* Effect.sleep("100 millis")
  
  const connection: DatabaseConnection = {
    id,
    query: (sql) => Effect.gen(function* () {
      yield* Effect.log(`[Conn ${id}] Executing: ${sql}`)
      return [{ result: "data" }]
    }),
    close: () => Effect.gen(function* () {
      yield* Effect.log(`Closing connection ${id}`)
    }),
  }
  
  return connection
})

// ============================================
// 2. Create a pool
// ============================================

const makeConnectionPool = Pool.make({
  acquire: createConnection,
  size: 5,  // Maximum 5 connections
})

// ============================================
// 3. Use the pool
// ============================================

const runQuery = (pool: Pool.Pool<DatabaseConnection>, sql: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      // Get a connection from the pool
      const connection = yield* pool.get
      
      // Use it
      const results = yield* connection.query(sql)
      
      // Connection automatically returned to pool when scope ends
      return results
    })
  )

// ============================================
// 4. Run multiple queries concurrently
// ============================================

const program = Effect.scoped(
  Effect.gen(function* () {
    const pool = yield* makeConnectionPool
    
    yield* Effect.log("Starting concurrent queries...")
    
    // Run 10 queries with only 5 connections
    const queries = Array.from({ length: 10 }, (_, i) =>
      runQuery(pool, `SELECT * FROM users WHERE id = ${i}`)
    )
    
    const results = yield* Effect.all(queries, { concurrency: "unbounded" })
    
    yield* Effect.log(`Completed ${results.length} queries`)
    return results
  })
)

Effect.runPromise(program)
```

---

### Process a Collection in Parallel with Effect.forEach

**Rule:** Use Effect.forEach with the `concurrency` option to process a collection in parallel with a fixed limit.

**Use Cases:** concurrency

**Why:**

Running `Effect.all` on a large array of tasks is dangerous. If you have 1,000 items, it will try to start 1,000 concurrent fibers at once, which can exhaust memory, overwhelm your CPU, or hit API rate limits.

`Effect.forEach` with a concurrency limit solves this problem elegantly. It acts as a concurrent processing pool. It will start processing items up to your specified limit (e.g., 10 at a time). As soon as one task finishes, it will pick up the next available item from the list, ensuring that no more than 10 tasks are ever running simultaneously. This provides massive performance gains over sequential processing while maintaining stability and control.

---

**Good Example:**

Imagine you have a list of 100 user IDs and you need to fetch the data for each one. `Effect.forEach` with a concurrency of 10 will process them in controlled parallel batches.

```typescript
import { Clock, Effect } from "effect";

// Mock function to simulate fetching a user by ID
const fetchUserById = (id: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Fetching user ${id}...`);
    yield* Effect.sleep("1 second"); // Simulate network delay
    return { id, name: `User ${id}`, email: `user${id}@example.com` };
  });

const userIds = Array.from({ length: 10 }, (_, i) => i + 1);

// Process the entire array, but only run 5 fetches at a time.
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting parallel processing...");

  const startTime = yield* Clock.currentTimeMillis;
  const users = yield* Effect.forEach(userIds, fetchUserById, {
    concurrency: 5, // Limit to 5 concurrent operations
  });
  const endTime = yield* Clock.currentTimeMillis;

  yield* Effect.logInfo(
    `Processed ${users.length} users in ${endTime - startTime}ms`
  );
  yield* Effect.logInfo(
    `First few users: ${JSON.stringify(users.slice(0, 3), null, 2)}`
  );

  return users;
});

// The result will be an array of all user objects.
// The total time will be much less than running them sequentially.
Effect.runPromise(program);
```

---

**Anti-Pattern:**

The anti-pattern is using `Effect.all` to process a large or dynamically-sized collection. This can lead to unpredictable and potentially catastrophic resource consumption.

```typescript
import { Effect } from "effect";
import { userIds, fetchUserById } from "./somewhere"; // From previous example

// ❌ DANGEROUS: This will attempt to start 100 concurrent network requests.
// If userIds had 10,000 items, this could crash your application or get you blocked by an API.
const program = Effect.all(userIds.map(fetchUserById));
```

---

### Process a Large File with Constant Memory

**Rule:** Use Stream.fromReadable with a Node.js Readable stream to process files efficiently.

**Use Cases:** building-data-pipelines

**Why:**

The most significant advantage of a streaming architecture is its ability to handle datasets far larger than available RAM. When you need to process a multi-gigabyte log file or CSV, loading it all into memory is not an option—it will crash your application.

The `Stream.fromReadable` constructor provides a bridge from Node.js's built-in file streaming capabilities to the Effect ecosystem. This approach is superior because:

1.  **Constant Memory Usage**: The file is read in small, manageable chunks. Your application's memory usage remains low and constant, regardless of whether the file is 1 megabyte or 100 gigabytes.
2.  **Composability**: Once the file is represented as an Effect `Stream`, you can apply the full suite of powerful operators to it: `mapEffect` for concurrent processing, `filter` for selectively choosing lines, `grouped` for batching, and `retry` for resilience.
3.  **Resource Safety**: Effect's `Stream` is built on `Scope`, which guarantees that the underlying file handle will be closed automatically when the stream finishes, fails, or is interrupted. This prevents resource leaks, a common problem in manual file handling.

---

**Good Example:**

This example demonstrates reading a text file, splitting it into individual lines, and processing each line. The combination of `Stream.fromReadable`, `Stream.decodeText`, and `Stream.splitLines` is a powerful and common pattern for handling text-based files.

```typescript
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Stream } from "effect";
import * as path from "node:path";

const processFile = (
  filePath: string,
  content: string
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Write content to file
    yield* fs.writeFileString(filePath, content);

    // Create a STREAMING pipeline - reads file in chunks, not all at once
    const fileStream = fs.readFile(filePath).pipe(
      // Decode bytes to text
      Stream.decodeText("utf-8"),
      // Split into lines
      Stream.splitLines,
      // Process each line
      Stream.tap((line) => Effect.log(`Processing: ${line}`))
    );

    // Run the stream to completion
    yield* Stream.runDrain(fileStream);

    // Clean up file
    yield* fs.remove(filePath);
  });

const program = Effect.gen(function* () {
  const filePath = path.join(__dirname, "large-file.txt");

  yield* processFile(filePath, "line 1\nline 2\nline 3").pipe(
    Effect.catchAll((error: PlatformError) =>
      Effect.logError(`Error processing file: ${error.message}`)
    )
  );
});

Effect.runPromise(program.pipe(Effect.provide(NodeFileSystem.layer)));

/*
Output:
... level=INFO msg="Processing: line 1"
... level=INFO msg="Processing: line 2"
... level=INFO msg="Processing: line 3"
*/
```

**Anti-Pattern:**

The anti-pattern is to use synchronous, memory-intensive functions like `fs.readFileSync`. This approach is simple for tiny files but fails catastrophically for large ones.

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

const filePath = path.join(__dirname, "large-file.txt");
// Create a dummy file for the example
fs.writeFileSync(filePath, "line 1\nline 2\nline 3");

try {
  // Anti-pattern: This loads the ENTIRE file into memory as a single buffer.
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  for (const line of lines) {
    console.log(`Processing: ${line}`);
  }
} catch (err) {
  console.error("Failed to read file:", err);
} finally {
  // Clean up the dummy file
  fs.unlinkSync(filePath);
}
```

This is a dangerous anti-pattern because:

1.  **It's a Memory Bomb**: If `large-file.txt` were 2GB and your server had 1GB of RAM, this code would immediately crash the process.
2.  **It Blocks the Event Loop**: `readFileSync` is a synchronous, blocking operation. While it's reading the file from disk, your entire application is frozen and cannot respond to any other requests.
3.  **It's Not Composable**: You get a giant string that must be processed eagerly. You lose all the benefits of lazy processing, concurrency control, and integrated error handling that `Stream` provides.

---

### Process collections of data asynchronously

**Rule:** Leverage Stream to process collections effectfully with built-in concurrency control and resource safety.

**Use Cases:** building-data-pipelines

**Why:**

`Stream` is a fundamental data type in Effect for handling collections of data, especially in asynchronous contexts. Unlike a simple array, a `Stream` is lazy and pull-based, meaning it only computes or fetches elements as they are needed, making it highly efficient for large or infinite datasets.

The primary benefits of using `Stream` are:

1.  **Concurrency Control**: `Stream` provides powerful and simple operators like `mapEffect` that have built-in concurrency management. This prevents overwhelming downstream services with too many parallel requests.
2.  **Resource Safety**: `Stream` is built on `Scope`, ensuring that any resources opened during the stream's operation (like file handles or network connections) are safely and reliably closed, even in the case of errors or interruption.
3.  **Composability**: Streams are highly composable. They can be filtered, mapped, transformed, and combined with other Effect data types seamlessly, allowing you to build complex data processing pipelines that remain readable and type-safe.
4.  **Resilience**: `Stream` integrates with `Schedule` to provide sophisticated retry and repeat logic, and with Effect's structured concurrency to ensure that failures in one part of a pipeline lead to a clean and predictable shutdown of the entire process.

---

**Good Example:**

This example processes a list of IDs by fetching user data for each one. `Stream.mapEffect` is used to apply an effectful function (`getUserById`) to each element, with concurrency limited to 2 simultaneous requests.

```typescript
import { Effect, Stream, Chunk } from "effect";

// A mock function that simulates fetching a user from a database
const getUserById = (
  id: number
): Effect.Effect<{ id: number; name: string }, Error> =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay("100 millis"),
    Effect.tap(() => Effect.log(`Fetched user ${id}`))
  );

// The stream-based program
const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  // Process each item with an Effect, limiting concurrency to 2
  Stream.mapEffect(getUserById, { concurrency: 2 }),
  // Run the stream and collect all results into a Chunk
  Stream.runCollect
);

const programWithLogging = Effect.gen(function* () {
  const users = yield* program;
  yield* Effect.log(
    `All users fetched: ${JSON.stringify(Chunk.toArray(users))}`
  );
  return users;
});

Effect.runPromise(programWithLogging);
```

**Anti-Pattern:**

A common but flawed approach is to use `Promise.all` to handle multiple asynchronous operations. This method lacks the safety, control, and composability inherent to Effect's `Stream`.

```typescript
// A mock function that returns a Promise
const getUserByIdAsPromise = (
  id: number
): Promise<{ id: number; name: string }> =>
  new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Fetched user ${id}`);
      resolve({ id, name: `User ${id}` });
    }, 100);
  });

// The Promise-based program
const ids = [1, 2, 3, 4, 5];
const promises = ids.map(getUserByIdAsPromise);

Promise.all(promises).then((users) => {
  console.log("All users fetched:", users);
});
```

This anti-pattern is problematic because it immediately executes all promises in parallel with no concurrency limit, it does not benefit from Effect's structured concurrency for safe interruption, and it breaks out of the Effect context, losing composability with features like logging, retries, and dependency management.

---

### Process Items Concurrently

**Rule:** Use Stream.mapEffect with the `concurrency` option to process stream items in parallel.

**Use Cases:** building-data-pipelines

**Why:**

For many data pipelines, the most time-consuming step is performing an I/O-bound operation for each item, such as calling an API or querying a database. Processing these items one by one (sequentially) is safe but slow, as the entire pipeline waits for each operation to complete before starting the next.

`Stream.mapEffect`'s `concurrency` option is the solution. It provides a simple, declarative way to introduce controlled parallelism into your pipeline.

1.  **Performance Boost**: It allows the stream to work on multiple items at once, drastically reducing the total execution time for I/O-bound tasks.
2.  **Controlled Parallelism**: Unlike `Promise.all` which runs everything at once, you specify the _exact_ number of concurrent operations. This is crucial for stability, as it prevents your application from overwhelming downstream services or exhausting its own resources (like file handles or network sockets).
3.  **Automatic Backpressure**: The stream will not pull new items from the source faster than the concurrent slots can process them. This backpressure is handled automatically, preventing memory issues.
4.  **Structured Concurrency**: It's fully integrated with Effect's runtime. If any concurrent operation fails, all other in-flight operations for that stream are immediately and reliably interrupted, preventing wasted work and ensuring clean shutdowns.

---

**Good Example:**

This example processes four items, each taking one second. By setting `concurrency: 2`, the total runtime is approximately two seconds instead of four, because items are processed in parallel pairs.

```typescript
import { Effect, Stream } from "effect";

// A mock function that simulates a slow I/O operation
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.log(`Starting item ${id}...`).pipe(
    Effect.delay("1 second"),
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

const programWithLogging = Effect.gen(function* () {
  const [duration, _] = yield* timedProgram;
  const durationMs = Number(duration);
  yield* Effect.log(`\nTotal time: ${Math.round(durationMs / 1000)} seconds`);
  return duration;
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithLogging);
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

**Anti-Pattern:**

The anti-pattern is to process I/O-bound tasks sequentially. This is the default behavior of `Stream.mapEffect` if you don't specify a concurrency level, and it leads to poor performance.

```typescript
import { Effect, Stream } from "effect";
// ... same processItem function ...

const ids = [1, 2, 3, 4];

// Processing sequentially (default concurrency is 1)
const program = Stream.fromIterable(ids).pipe(
  Stream.mapEffect(processItem), // No concurrency option
  Stream.runDrain
);

const timedProgram = Effect.timed(program);

Effect.runPromise(timedProgram).then(([duration, _]) => {
  console.log(`\nTotal time: ${Math.round(duration.millis / 1000)} seconds`);
});
/*
Output:
... level=INFO msg="Starting item 1..."
... level=INFO msg="Finished item 1"
... level=INFO msg="Starting item 2..."
... level=INFO msg="Finished item 2"
... etc.

Total time: 4 seconds
*/
```

While sequential processing is sometimes necessary to preserve order or avoid race conditions, it is a performance anti-pattern for independent, I/O-bound tasks. The concurrent approach is almost always preferable in such cases.

---

### Process Items in Batches

**Rule:** Use Stream.grouped(n) to transform a stream of items into a stream of batched chunks.

**Use Cases:** building-data-pipelines

**Why:**

When interacting with external systems like databases or APIs, making one request per item is often incredibly inefficient. The network latency and overhead of each individual call can dominate the total processing time. Most high-performance systems offer bulk or batch endpoints to mitigate this.

`Stream.grouped(n)` provides a simple, declarative way to prepare your data for these bulk operations:

1.  **Performance Optimization**: It dramatically reduces the number of network roundtrips. A single API call with 100 items is far faster than 100 individual API calls.
2.  **Declarative Batching**: It abstracts away the tedious and error-prone manual logic of counting items, managing temporary buffers, and deciding when to send a batch.
3.  **Seamless Composition**: It transforms a `Stream<A>` into a `Stream<Chunk<A>>`. This new stream of chunks can be piped directly into `Stream.mapEffect`, allowing you to process each batch concurrently.
4.  **Handles Leftovers**: The operator automatically handles the final, smaller batch if the total number of items is not perfectly divisible by the batch size.

---

**Good Example:**

This example processes 10 users. By using `Stream.grouped(5)`, it transforms the stream of 10 individual users into a stream of two chunks (each a batch of 5). The `saveUsersInBulk` function is then called only twice, once for each batch.

```typescript
import { Effect, Stream, Chunk } from "effect";

// A mock function that simulates a bulk database insert
const saveUsersInBulk = (
  userBatch: Chunk.Chunk<{ id: number }>
): Effect.Effect<void, Error> =>
  Effect.log(
    `Saving batch of ${userBatch.length} users: ${Chunk.toArray(userBatch)
      .map((u) => u.id)
      .join(", ")}`
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

**Anti-Pattern:**

The anti-pattern is to process items one by one when a more efficient bulk operation is available. This is a common performance bottleneck.

```typescript
import { Effect, Stream } from "effect";

// A mock function that saves one user at a time
const saveUser = (user: { id: number }): Effect.Effect<void, Error> =>
  Effect.log(`Saving single user: ${user.id}`);

const userIds = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

const program = Stream.fromIterable(userIds).pipe(
  // Process each user individually, leading to 10 separate "saves"
  Stream.mapEffect(saveUser, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Saving single user: 1"
... level=INFO msg="Saving single user: 2"
... (and so on for all 10 users)
*/
```

This individual processing approach is an anti-pattern because it creates unnecessary overhead. If each `saveUser` call took 50ms of network latency, the total time would be over 500ms. The batched approach might only take 100ms (2 batches \* 50ms), resulting in a 5x performance improvement.

---

### Process Streaming Data with Stream

**Rule:** Use Stream to model and process data that arrives over time in a composable, efficient way.

**Use Cases:** core-concepts

**Why:**

Some data sources don't fit the one-shot request/response model of `Effect`. For example:

- Reading a multi-gigabyte file from disk.
- Receiving messages from a WebSocket.
- Fetching results from a paginated API.

Loading all this data into memory at once would be inefficient or impossible. `Stream` solves this by allowing you to process the data in chunks as it arrives. It provides a rich API of composable operators (`map`, `filter`, `run`, etc.) that mirror those on `Effect` and `Array`, but are designed for streaming data. This allows you to build efficient, constant-memory data processing pipelines.

---

**Good Example:**

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

**Anti-Pattern:**

Manually managing pagination state with recursive functions. This is complex, stateful, and easy to get wrong. It also requires loading all results into memory, which is inefficient for large datasets.

```typescript
import { Effect } from "effect";
import { fetchUserPage } from "./somewhere"; // From previous example

// ❌ WRONG: Manual, stateful, and inefficient recursion.
const fetchAllUsers = (
  page: number,
  acc: any[]
): Effect.Effect<any[], "ApiError"> =>
  fetchUserPage(page).pipe(
    Effect.flatMap((response) => {
      const allUsers = [...acc, ...response.users];
      if (response.nextPage) {
        return fetchAllUsers(response.nextPage, allUsers);
      }
      return Effect.succeed(allUsers);
    })
  );

// This holds all users in memory at once.
const program = fetchAllUsers(0, []);
```

---

### Provide Configuration to Your App via a Layer

**Rule:** Provide configuration to your app via a Layer.

**Use Cases:** core-concepts

**Why:**

Integrating configuration as a `Layer` plugs it directly into Effect's dependency injection system. This makes your configuration available anywhere in the program and dramatically simplifies testing by allowing you to substitute mock configuration.

**Good Example:**

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

**Anti-Pattern:**

Manually reading environment variables deep inside business logic. This tightly couples that logic to the external environment, making it difficult to test and reuse.

---

### Provide Dependencies to Routes

**Rule:** Define dependencies with Effect.Service and provide them to your HTTP server using a Layer.

**Use Cases:** building-apis

**Why:**

As applications grow, route handlers need to perform complex tasks like accessing a database, calling other APIs, or logging. Hard-coding this logic or manually passing dependencies leads to tightly coupled, untestable code.

Effect's dependency injection system (`Service` and `Layer`) solves this by decoupling a service's interface from its implementation. This is the cornerstone of building scalable, maintainable applications in Effect.

1.  **Modern and Simple**: `Effect.Service` is the modern, idiomatic way to define services. It combines the service's definition and its access tag into a single, clean class structure, reducing boilerplate.
2.  **Testability**: By depending on a service interface, you can easily provide a mock implementation in your tests (e.g., `Database.Test`) instead of the real one (`Database.Live`), allowing for fast, isolated unit tests of your route logic.
3.  **Decoupling**: Route handlers don't know or care _how_ the database connection is created or managed. They simply ask for the `Database` service from the context, and the runtime provides the configured implementation.
4.  **Composability**: `Layer`s are composable. You can build complex dependency graphs (e.g., a `Database` layer that itself requires a `Config` layer) that Effect will automatically construct and wire up for you.

---

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

---

### Race Concurrent Effects for the Fastest Result

**Rule:** Use Effect.race to get the result from the first of several effects to succeed, automatically interrupting the losers.

**Use Cases:** concurrency

**Why:**

`Effect.race` is a powerful concurrency primitive for performance and resilience. It starts all provided effects in parallel. The moment one of them succeeds, `Effect.race` immediately interrupts all the other "losing" effects and returns the winning result. If one of the effects fails before any have succeeded, the race is not over; the remaining effects continue to run. The entire race only fails if _all_ participating effects fail.

This is commonly used for:

- **Performance:** Querying multiple redundant data sources (e.g., two API replicas) and taking the response from whichever is faster.
- **Implementing Timeouts:** Racing a primary effect against a delayed `Effect.fail`, effectively creating a timeout mechanism.

---

**Good Example:**

A classic use case is checking a fast cache before falling back to a slower database. We can race the cache lookup against the database query.

```typescript
import { Effect, Option } from "effect";

type User = { id: number; name: string };

// Simulate a slower cache lookup that might find nothing (None)
const checkCache: Effect.Effect<Option.Option<User>> = Effect.succeed(
  Option.none()
).pipe(
  Effect.delay("200 millis") // Made slower so database wins
);

// Simulate a faster database query that will always find the data
const queryDatabase: Effect.Effect<Option.Option<User>> = Effect.succeed(
  Option.some({ id: 1, name: "Paul" })
).pipe(
  Effect.delay("50 millis") // Made faster so it wins the race
);

// Race them. The database should win and return the user data.
const program = Effect.race(checkCache, queryDatabase).pipe(
  // The result of the race is an Option, so we can handle it.
  Effect.flatMap((result: Option.Option<User>) =>
    Option.match(result, {
      onNone: () => Effect.fail("User not found anywhere."),
      onSome: (user) => Effect.succeed(user),
    })
  )
);

// In this case, the database wins the race.
const programWithResults = Effect.gen(function* () {
  try {
    const user = yield* program;
    yield* Effect.log(`User found: ${JSON.stringify(user)}`);
    return user;
  } catch (error) {
    yield* Effect.logError(`Error: ${error}`);
    throw error;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Handled error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithResults);

// Also demonstrate with logging
const programWithLogging = Effect.gen(function* () {
  yield* Effect.logInfo("Starting race between cache and database...");

  try {
    const user = yield* program;
    yield* Effect.logInfo(
      `Success: Found user ${user.name} with ID ${user.id}`
    );
    return user;
  } catch (error) {
    yield* Effect.logInfo("This won't be reached due to Effect error handling");
    return null;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Handled error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithLogging);
```

---

**Anti-Pattern:**

Don't use `Effect.race` if you need the results of _all_ the effects. That is the job of `Effect.all`. Using `race` in this scenario will cause you to lose data, as all but one of the effects will be interrupted and their results discarded.

```typescript
import { Effect } from "effect";

const fetchProfile = Effect.succeed({ name: "Paul" });
const fetchPermissions = Effect.succeed(["admin", "editor"]);

// ❌ WRONG: This will only return either the profile OR the permissions,
// whichever resolves first. You will lose the other piece of data.
const incompleteData = Effect.race(fetchProfile, fetchPermissions);

// ✅ CORRECT: Use Effect.all when you need all the results.
const completeData = Effect.all([fetchProfile, fetchPermissions]);
```

---

### Redact and Handle Sensitive Data

**Rule:** Use Redacted to wrap sensitive values, preventing accidental exposure in logs or error messages.

**Use Cases:** core-concepts

**Why:**

Sensitive data should never appear in logs, traces, or error messages.  
`Redacted` provides a type-safe way to mark and protect secrets throughout your application.

**Good Example:**

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

**Anti-Pattern:**

Passing sensitive data as plain strings, which can be accidentally logged, serialized, or leaked in error messages.

---

### Representing Time Spans with Duration

**Rule:** Use Duration to model and manipulate time spans, enabling safe and expressive time-based logic.

**Use Cases:** core-concepts

**Why:**

Working with raw numbers for time intervals (e.g., milliseconds) is error-prone and hard to read.  
`Duration` provides a clear, expressive API for modeling time spans, improving code safety and maintainability.

**Good Example:**

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

**Anti-Pattern:**

Using raw numbers (e.g., `5000` for 5 seconds) for time intervals, which is error-prone, hard to read, and less maintainable.

---

### Representing Time Spans with Duration

**Rule:** Use the Duration data type to represent time intervals instead of raw numbers.

**Use Cases:** core-concepts

**Why:**

Using raw numbers to represent time is a common source of bugs and confusion. When you see `setTimeout(fn, 5000)`, it's not immediately clear if the unit is seconds or milliseconds without prior knowledge of the API.

`Duration` solves this by making the unit explicit in the code. It provides a type-safe, immutable, and human-readable way to work with time intervals. This eliminates ambiguity and makes your code easier to read and maintain. Durations are used throughout Effect's time-based operators, such as `Effect.sleep`, `Effect.timeout`, and `Schedule`.

---

**Good Example:**

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

**Anti-Pattern:**

Using raw numbers for time-based operations. This is ambiguous and error-prone.

```typescript
import { Effect } from "effect";

// ❌ WRONG: What does '2000' mean? Milliseconds? Seconds?
const program = Effect.log("Waiting...").pipe(Effect.delay(2000));

// This is especially dangerous when different parts of an application
// use different conventions (e.g., one service uses seconds, another uses milliseconds).
// Using Duration eliminates this entire class of bugs.
```

---

### Retry HTTP Requests with Backoff

**Rule:** Use Schedule to retry failed HTTP requests with configurable backoff strategies.

**Use Cases:** making-http-requests

**Why:**

HTTP requests fail for transient reasons:

1. **Network issues** - Temporary connectivity problems
2. **Server overload** - 503 Service Unavailable
3. **Rate limits** - 429 Too Many Requests
4. **Timeouts** - Slow responses

Proper retry logic handles these gracefully.

---

**Good Example:**

```typescript
import { Effect, Schedule, Duration, Data } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse, HttpClientError } from "@effect/platform"

// ============================================
// 1. Basic retry with exponential backoff
// ============================================

const fetchWithRetry = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((response) => HttpClientResponse.json(response)),
      Effect.retry(
        Schedule.exponential("100 millis", 2).pipe(
          Schedule.intersect(Schedule.recurs(5)),     // Max 5 retries
          Schedule.jittered                            // Add randomness
        )
      )
    )
  })

// ============================================
// 2. Retry only specific status codes
// ============================================

class RetryableHttpError extends Data.TaggedError("RetryableHttpError")<{
  readonly status: number
  readonly message: string
}> {}

class NonRetryableHttpError extends Data.TaggedError("NonRetryableHttpError")<{
  readonly status: number
  readonly message: string
}> {}

const isRetryable = (status: number): boolean =>
  status === 429 ||    // Rate limited
  status === 503 ||    // Service unavailable
  status === 502 ||    // Bad gateway
  status === 504 ||    // Gateway timeout
  status >= 500        // Server errors

const fetchWithSelectiveRetry = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const response = yield* client.get(url).pipe(
      Effect.flatMap((response) => {
        if (response.status >= 400) {
          if (isRetryable(response.status)) {
            return Effect.fail(new RetryableHttpError({
              status: response.status,
              message: `HTTP ${response.status}`,
            }))
          }
          return Effect.fail(new NonRetryableHttpError({
            status: response.status,
            message: `HTTP ${response.status}`,
          }))
        }
        return Effect.succeed(response)
      }),
      Effect.retry({
        schedule: Schedule.exponential("200 millis").pipe(
          Schedule.intersect(Schedule.recurs(3))
        ),
        while: (error) => error._tag === "RetryableHttpError",
      })
    )

    return yield* HttpClientResponse.json(response)
  })

// ============================================
// 3. Retry with logging
// ============================================

const fetchWithRetryLogging = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return yield* client.get(url).pipe(
      Effect.flatMap((r) => HttpClientResponse.json(r)),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(3)),
          Schedule.tapOutput((_, output) =>
            Effect.log(`Retry attempt, waiting ${Duration.toMillis(output)}ms`)
          )
        )
      ),
      Effect.tapError((error) => Effect.log(`Request failed: ${error}`))
    )
  })

// ============================================
// 4. Custom retry policy
// ============================================

const customRetryPolicy = Schedule.exponential("500 millis", 2).pipe(
  Schedule.intersect(Schedule.recurs(5)),
  Schedule.union(Schedule.spaced("30 seconds")),  // Also retry after 30s
  Schedule.whileOutput((duration) => Duration.lessThanOrEqualTo(duration, "2 minutes")),
  Schedule.jittered
)

// ============================================
// 5. Retry respecting Retry-After header
// ============================================

const fetchWithRetryAfter = (url: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const makeRequest = client.get(url).pipe(
      Effect.flatMap((response) => {
        if (response.status === 429) {
          const retryAfter = response.headers["retry-after"]
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000

          return Effect.fail({
            _tag: "RateLimited" as const,
            delay,
          })
        }
        return Effect.succeed(response)
      })
    )

    return yield* makeRequest.pipe(
      Effect.retry(
        Schedule.recurWhile<{ _tag: "RateLimited"; delay: number }>(
          (error) => error._tag === "RateLimited"
        ).pipe(
          Schedule.intersect(Schedule.recurs(3)),
          Schedule.delayed((_, error) => Duration.millis(error.delay))
        )
      ),
      Effect.flatMap((r) => HttpClientResponse.json(r))
    )
  })

// ============================================
// 6. Usage
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("Fetching with retry...")

  const data = yield* fetchWithRetry("https://api.example.com/data").pipe(
    Effect.catchAll((error) => {
      return Effect.succeed({ error: "All retries exhausted" })
    })
  )

  yield* Effect.log(`Result: ${JSON.stringify(data)}`)
})
```

---

### Retry Operations Based on Specific Errors

**Rule:** Use predicate-based retry policies to retry an operation only for specific, recoverable errors.

**Use Cases:** error-management

**Why:**

Not all errors are created equal. Retrying on a permanent error like "permission denied" or "not found" is pointless and can hide underlying issues. You only want to retry on _transient_, recoverable errors, such as network timeouts or "server busy" responses.

By adding a predicate to your retry schedule, you gain fine-grained control over the retry logic. This allows you to build much more intelligent and efficient error handling systems that react appropriately to different failure modes. This is a common requirement for building robust clients for external APIs.

---

**Good Example:**

This example simulates an API client that can fail with different, specific error types. The retry policy is configured to _only_ retry on `ServerBusyError` and give up immediately on `NotFoundError`.

```typescript
import { Data, Effect, Schedule } from "effect";

// Define specific, tagged errors for our API client
class ServerBusyError extends Data.TaggedError("ServerBusyError") {}
class NotFoundError extends Data.TaggedError("NotFoundError") {}

let attemptCount = 0;

// A flaky API call that can fail in different ways
const flakyApiCall = Effect.try({
  try: () => {
    attemptCount++;
    const random = Math.random();

    if (attemptCount <= 2) {
      // First two attempts fail with ServerBusyError (retryable)
      console.log(
        `Attempt ${attemptCount}: API call failed - Server is busy. Retrying...`
      );
      throw new ServerBusyError();
    }

    // Third attempt succeeds
    console.log(`Attempt ${attemptCount}: API call succeeded!`);
    return { data: "success", attempt: attemptCount };
  },
  catch: (e) => e as ServerBusyError | NotFoundError,
});

// A predicate that returns true only for the error we want to retry
const isRetryableError = (e: ServerBusyError | NotFoundError) =>
  e._tag === "ServerBusyError";

// A policy that retries 3 times, but only if the error is retryable
const selectiveRetryPolicy = Schedule.recurs(3).pipe(
  Schedule.whileInput(isRetryableError),
  Schedule.addDelay(() => "100 millis")
);

const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Retry Based on Specific Errors Demo ===");

  try {
    const result = yield* flakyApiCall.pipe(Effect.retry(selectiveRetryPolicy));
    yield* Effect.logInfo(`Success: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    yield* Effect.logInfo("This won't be reached due to Effect error handling");
    return null;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      if (error instanceof NotFoundError) {
        yield* Effect.logInfo("Failed with NotFoundError - not retrying");
      } else if (error instanceof ServerBusyError) {
        yield* Effect.logInfo("Failed with ServerBusyError after all retries");
      } else {
        yield* Effect.logInfo(`Failed with unexpected error: ${error}`);
      }
      return null;
    })
  )
);

// Also demonstrate a case where NotFoundError is not retried
const demonstrateNotFound = Effect.gen(function* () {
  yield* Effect.logInfo("\n=== Demonstrating Non-Retryable Error ===");

  const alwaysNotFound = Effect.fail(new NotFoundError());

  const result = yield* alwaysNotFound.pipe(
    Effect.retry(selectiveRetryPolicy),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`NotFoundError was not retried: ${error._tag}`);
        return null;
      })
    )
  );

  return result;
});

Effect.runPromise(program.pipe(Effect.flatMap(() => demonstrateNotFound)));
```

---

**Anti-Pattern:**

Using a generic `Effect.retry` that retries on all errors. This can lead to wasted resources and obscure permanent issues.

```typescript
import { Effect, Schedule } from "effect";
import { flakyApiCall } from "./somewhere"; // From previous example

// ❌ WRONG: This policy will retry even if the API returns a 404 Not Found.
// This wastes time and network requests on an error that will never succeed.
const blindRetryPolicy = Schedule.recurs(3);

const program = flakyApiCall.pipe(Effect.retry(blindRetryPolicy));
```

---

### Run Independent Effects in Parallel with Effect.all

**Rule:** Use Effect.all to execute a collection of independent effects concurrently.

**Use Cases:** concurrency

**Why:**

Running tasks sequentially when they could be done in parallel is a common source of performance bottlenecks. `Effect.all` is the solution. It's the direct equivalent of `Promise.all` in the Effect ecosystem.

Instead of waiting for Task A to finish before starting Task B, `Effect.all` starts all tasks simultaneously. The total time to complete is determined by the duration of the _longest_ running effect, not the sum of all durations. If any single effect in the collection fails, the entire `Effect.all` will fail immediately.

---

**Good Example:**

Imagine fetching a user's profile and their latest posts from two different API endpoints. These are independent operations and can be run in parallel to save time.

```typescript
import { Effect } from "effect";

// Simulate fetching a user, takes 1 second
const fetchUser = Effect.succeed({ id: 1, name: "Paul" }).pipe(
  Effect.delay("1 second")
);

// Simulate fetching posts, takes 1.5 seconds
const fetchPosts = Effect.succeed([{ title: "Effect is great" }]).pipe(
  Effect.delay("1.5 seconds")
);

// Run both effects concurrently - must specify concurrency option!
const program = Effect.all([fetchUser, fetchPosts], {
  concurrency: "unbounded",
});

// The resulting effect will succeed with a tuple: [{id, name}, [{title}]]
// Total execution time will be ~1.5 seconds (the duration of the longest task).
const programWithLogging = Effect.gen(function* () {
  const results = yield* program;
  yield* Effect.log(`Results: ${JSON.stringify(results)}`);
  return results;
});

Effect.runPromise(programWithLogging);
```

---

**Anti-Pattern:**

The anti-pattern is running independent tasks sequentially using `Effect.gen`. This is inefficient and unnecessarily slows down your application.

```typescript
import { Effect } from "effect";
import { fetchUser, fetchPosts } from "./somewhere"; // From previous example

// ❌ WRONG: This is inefficient.
const program = Effect.gen(function* () {
  // fetchUser runs and completes...
  const user = yield* fetchUser;
  // ...only then does fetchPosts begin.
  const posts = yield* fetchPosts;
  return [user, posts];
});

// Total execution time will be ~2.5 seconds (1s + 1.5s),
// which is a full second slower than the parallel version.
Effect.runPromise(program).then(console.log);
```

---

### Scheduling Pattern 1: Repeat an Effect on a Fixed Interval

**Rule:** Repeat effects at fixed intervals using Schedule.fixed for steady-state operations and background tasks.

**Use Cases:** scheduling

**Why:**

Many production systems need periodic operations:

- **Health checks**: Poll service availability every 30 seconds
- **Cache refresh**: Update cache every 5 minutes
- **Metrics collection**: Gather system metrics every 10 seconds
- **Data sync**: Sync data with remote service periodically
- **Cleanup tasks**: Remove stale data nightly

Without proper scheduling:

- Manual polling with `while` loops wastes CPU (busy-waiting)
- Thread.sleep blocks threads, preventing other work
- No automatic restart on failure
- Difficult to test deterministically

With `Schedule.fixed`:

- Efficient, non-blocking repetition
- Automatic failure handling and retry
- Testable with TestClock
- Clean, declarative syntax

---

**Good Example:**

This example demonstrates a health check service that polls multiple service endpoints every 30 seconds and reports their status.

```typescript
import { Effect, Schedule, Duration } from "effect";

interface ServiceStatus {
  readonly service: string;
  readonly url: string;
  readonly isHealthy: boolean;
  readonly responseTime: number;
  readonly lastChecked: number;
}

// Mock health check that calls an endpoint
const checkServiceHealth = (
  url: string,
  service: string
): Effect.Effect<ServiceStatus> =>
  Effect.gen(function* () {
    const startTime = Date.now();

    // Simulate HTTP call with occasional failures
    const isHealthy = Math.random() > 0.1; // 90% success rate
    const responseTime = Math.random() * 500; // 0-500ms

    yield* Effect.sleep(Duration.millis(Math.round(responseTime)));

    if (!isHealthy) {
      yield* Effect.fail(new Error(`${service} is unhealthy`));
    }

    return {
      service,
      url,
      isHealthy: true,
      responseTime: Math.round(Date.now() - startTime),
      lastChecked: Date.now(),
    };
  });

// Health check for multiple services
interface HealthCheckConfig {
  readonly services: Array<{
    readonly name: string;
    readonly url: string;
  }>;
  readonly intervalSeconds: number;
}

// Keep track of service status
const serviceStatuses = new Map<string, ServiceStatus>();

// Check all services and report status
const checkAllServices = (
  config: HealthCheckConfig
): Effect.Effect<void> =>
  Effect.gen(function* () {
    for (const service of config.services) {
      const status = yield* checkServiceHealth(service.url, service.name).pipe(
        Effect.either
      );

      if (status._tag === "Right") {
        serviceStatuses.set(service.name, status.right);
        console.log(
          `✓ ${service.name}: OK (${status.right.responseTime}ms)`
        );
      } else {
        console.log(`✗ ${service.name}: FAILED`);
        // Keep last known status if available
      }
    }
  });

// Create the repeating health check
const createHealthCheckScheduler = (
  config: HealthCheckConfig
): Effect.Effect<void> =>
  checkAllServices(config).pipe(
    // Schedule with fixed interval (fixed = ignore execution time)
    Effect.repeat(
      Schedule.fixed(Duration.seconds(config.intervalSeconds))
    )
  );

// Report current status
const reportStatus = (): Effect.Effect<void> =>
  Effect.sync(() => {
    if (serviceStatuses.size === 0) {
      console.log("\n[STATUS] No services checked yet");
      return;
    }

    console.log("\n[STATUS REPORT]");
    for (const [service, status] of serviceStatuses) {
      const ago = Math.round((Date.now() - status.lastChecked) / 1000);
      console.log(
        `  ${service}: ${status.isHealthy ? "✓" : "✗"} (checked ${ago}s ago)`
      );
    }
  });

// Run health checker in background and check status periodically
const program = Effect.gen(function* () {
  const config: HealthCheckConfig = {
    services: [
      { name: "API", url: "https://api.example.com/health" },
      { name: "Database", url: "https://db.example.com/health" },
      { name: "Cache", url: "https://cache.example.com/health" },
    ],
    intervalSeconds: 5, // Check every 5 seconds
  };

  // Fork the health checker to run in background
  const checker = yield* createHealthCheckScheduler(config).pipe(
    Effect.fork
  );

  // Check and report status every 15 seconds for 60 seconds
  yield* reportStatus().pipe(
    Effect.repeat(
      Schedule.addDelay(
        Schedule.recurs(3), // 3 repetitions = 4 total (initial + 3)
        () => Duration.seconds(15)
      )
    )
  );

  // Interrupt the background checker
  yield* checker.interrupt();
});

Effect.runPromise(program);
```

This pattern:

1. **Defines service health checks** that may fail
2. **Uses Schedule.fixed** to repeat every 5 seconds
3. **Handles failures gracefully** (keeps last known status)
4. **Runs in background** while main logic continues
5. **Reports current status** at intervals

---

---

### Scheduling Pattern 2: Implement Exponential Backoff for Retries

**Rule:** Use exponential backoff with jitter for retries to prevent overwhelming failing services and improve success likelihood through smart timing.

**Use Cases:** error-handling-resilience

**Why:**

Naive retry strategies fail under load:

**Immediate retry**:
- All failures retry at once
- Fails service under load (recovery takes longer)
- Leads to cascade failure

**Fixed backoff** (e.g., 1 second always):
- No pressure reduction during recovery
- Multiple clients cause thundering herd
- Predictable = synchronized retries

**Exponential backoff**:
- Gives failing service time to recover
- Each retry waits progressively longer
- Without jitter, synchronized retries still hammer service

**Exponential backoff + jitter**:
- Spreads retry attempts over time
- Failures de-correlate across clients
- Service recovery time properly utilized
- Success likelihood increases with each retry

Real-world example: 100 clients fail simultaneously
- **Immediate retry**: 100 requests in milliseconds → failure
- **Fixed backoff**: 100 requests at exactly 1s → failure
- **Exponential**: 100 requests at 100ms, 200ms, 400ms, 800ms → recovery → success

---

**Good Example:**

This example demonstrates exponential backoff with jitter for retrying a flaky API call.

```typescript
import { Effect, Schedule } from "effect";

interface RetryStats {
  readonly attempt: number;
  readonly delay: number;
  readonly lastError?: Error;
}

// Simulate flaky API that fails first 3 times, succeeds on 4th
let attemptCount = 0;

const flakyApiCall = (): Effect.Effect<{ status: string }> =>
  Effect.gen(function* () {
    attemptCount++;
    yield* Effect.log(`[API] Attempt ${attemptCount}`);

    if (attemptCount < 4) {
      yield* Effect.fail(new Error("Service temporarily unavailable (503)"));
    }

    return { status: "ok" };
  });

// Calculate exponential backoff with jitter
interface BackoffConfig {
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly maxRetries: number;
}

const exponentialBackoffWithJitter = (config: BackoffConfig) => {
  let attempt = 0;

  // Calculate delay for this attempt
  const calculateDelay = (): number => {
    const exponential = config.baseDelayMs * Math.pow(2, attempt);
    const withJitter = exponential * (0.5 + Math.random() * 0.5); // ±50% jitter
    const capped = Math.min(withJitter, config.maxDelayMs);

    yield* Effect.log(
      `[BACKOFF] Attempt ${attempt + 1}: ${Math.round(capped)}ms delay`
    );

    return Math.round(capped);
  };

  return Effect.gen(function* () {
    const effect = flakyApiCall();

    let lastError: Error | undefined;

    for (attempt = 0; attempt < config.maxRetries; attempt++) {
      const result = yield* effect.pipe(Effect.either);

      if (result._tag === "Right") {
        yield* Effect.log(`[SUCCESS] Succeeded on attempt ${attempt + 1}`);
        return result.right;
      }

      lastError = result.left;

      if (attempt < config.maxRetries - 1) {
        const delay = calculateDelay();
        yield* Effect.sleep(`${delay} millis`);
      }
    }

    yield* Effect.log(
      `[FAILURE] All ${config.maxRetries} attempts exhausted`
    );
    yield* Effect.fail(lastError);
  });
};

// Run with exponential backoff
const program = exponentialBackoffWithJitter({
  baseDelayMs: 100,
  maxDelayMs: 5000,
  maxRetries: 5,
});

console.log(
  `\n[START] Retrying flaky API with exponential backoff\n`
);

Effect.runPromise(program).then(
  (result) => console.log(`\n[RESULT] ${JSON.stringify(result)}\n`),
  (error) => console.error(`\n[ERROR] ${error.message}\n`)
);
```

Output demonstrates increasing delays with jitter:
```
[START] Retrying flaky API with exponential backoff

[API] Attempt 1
[BACKOFF] Attempt 1: 78ms delay
[API] Attempt 2
[BACKOFF] Attempt 2: 192ms delay
[API] Attempt 3
[BACKOFF] Attempt 3: 356ms delay
[API] Attempt 4
[SUCCESS] Succeeded on attempt 4

[RESULT] {"status":"ok"}
```

---

---

### Scheduling Pattern 3: Schedule Tasks with Cron Expressions

**Rule:** Use cron expressions to schedule periodic tasks at specific calendar times, enabling flexible scheduling beyond simple fixed intervals.

**Use Cases:** scheduling-periodic-tasks

**Why:**

Fixed intervals don't align with business needs:

**Fixed interval** (every 24 hours):
- If task takes 2 hours, next run is 26 hours later
- Drifts over time
- No alignment with calendar
- Fails during daylight saving time changes

**Cron expressions**:
- Specific calendar times (e.g., always 9 AM)
- Independent of execution duration
- Aligns with business hours
- Natural DST handling (clock adjusts, cron resyncs)
- Human-readable vs. milliseconds

Real-world example: Daily report at 9 AM
- **Fixed interval**: Scheduled at 9:00, takes 1 hour → next at 10:00 → drift until 5 PM
- **Cron `0 9 * * *`**: Always runs at 9:00 regardless of duration or previous delays

---

**Good Example:**

This example demonstrates scheduling a daily report generation using cron, with timezone support.

```typescript
import { Effect, Schedule, Console } from "effect";
import { DateTime } from "luxon"; // For timezone handling

interface ReportConfig {
  readonly cronExpression: string;
  readonly timezone?: string;
  readonly jobName: string;
}

interface ScheduledReport {
  readonly timestamp: Date;
  readonly jobName: string;
  readonly result: string;
}

// Simple cron parser (in production, use a library like cron-parser)
const parseCronExpression = (
  expression: string
): {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
} => {
  const parts = expression.split(" ");

  const parseField = (field: string, max: number): number[] => {
    if (field === "*") {
      return Array.from({ length: max + 1 }, (_, i) => i);
    }

    if (field.includes(",")) {
      return field.split(",").flatMap((part) => parseField(part, max));
    }

    if (field.includes("-")) {
      const [start, end] = field.split("-").map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    return [Number(field)];
  };

  return {
    minute: parseField(parts[0], 59),
    hour: parseField(parts[1], 23),
    dayOfMonth: parseField(parts[2], 31),
    month: parseField(parts[3], 12),
    dayOfWeek: parseField(parts[4], 6),
  };
};

// Check if current time matches cron expression
const shouldRunNow = (parsed: ReturnType<typeof parseCronExpression>): boolean => {
  const now = new Date();

  return (
    parsed.minute.includes(now.getUTCMinutes()) &&
    parsed.hour.includes(now.getUTCHours()) &&
    parsed.dayOfMonth.includes(now.getUTCDate()) &&
    parsed.month.includes(now.getUTCMonth() + 1) &&
    parsed.dayOfWeek.includes(now.getUTCDay())
  );
};

// Generate a report
const generateReport = (jobName: string): Effect.Effect<ScheduledReport> =>
  Effect.gen(function* () {
    yield* Console.log(`[REPORT] Generating ${jobName}...`);

    // Simulate report generation
    yield* Effect.sleep("100 millis");

    return {
      timestamp: new Date(),
      jobName,
      result: `Report generated at ${new Date().toISOString()}`,
    };
  });

// Schedule with cron expression
const scheduleWithCron = (config: ReportConfig) =>
  Effect.gen(function* () {
    const parsed = parseCronExpression(config.cronExpression);

    yield* Console.log(
      `[SCHEDULER] Scheduling job: ${config.jobName}`
    );
    yield* Console.log(`[SCHEDULER] Cron: ${config.cronExpression}`);
    yield* Console.log(`[SCHEDULER] Timezone: ${config.timezone || "UTC"}\n`);

    // Create schedule that checks every minute
    const schedule = Schedule.fixed("1 minute").pipe(
      Schedule.untilInputEffect((report: ScheduledReport) =>
        Effect.gen(function* () {
          const isPastTime = shouldRunNow(parsed);

          if (isPastTime) {
            yield* Console.log(
              `[SCHEDULED] ✓ Running at ${report.timestamp.toISOString()}`
            );
            return true; // Stop scheduling
          }

          return false; // Continue scheduling
        })
      )
    );

    // Generate report with cron schedule
    yield* generateReport(config.jobName).pipe(
      Effect.repeat(schedule)
    );
  });

// Demonstrate multiple cron schedules
const program = Effect.gen(function* () {
  console.log(
    `\n[START] Scheduling multiple jobs with cron expressions\n`
  );

  // Schedule examples (note: in real app, these would run at actual times)
  const jobs = [
    {
      cronExpression: "0 9 * * 1-5", // 9 AM weekdays
      jobName: "Daily Standup Report",
      timezone: "America/New_York",
    },
    {
      cronExpression: "0 0 * * *", // Midnight daily
      jobName: "Nightly Backup",
      timezone: "UTC",
    },
    {
      cronExpression: "0 0 1 * *", // Midnight on 1st of month
      jobName: "Monthly Summary",
      timezone: "Europe/London",
    },
  ];

  yield* Console.log("[JOBS] Scheduled:");
  jobs.forEach((job) => {
    console.log(
      `  - ${job.jobName}: ${job.cronExpression} (${job.timezone})`
    );
  });
});

Effect.runPromise(program);
```

---

---

### Scheduling Pattern 4: Debounce and Throttle Execution

**Rule:** Use debounce to wait for silence before executing, and throttle to limit execution frequency, both critical for handling rapid events.

**Use Cases:** scheduling-periodic-tasks

**Why:**

Rapid events without debounce/throttle cause problems:

**Debounce example**: Search input
- User types "hello" character by character
- Without debounce: 5 API calls (one per character)
- With debounce: 1 API call after user stops typing

**Throttle example**: Scroll events
- Scroll fires 100+ times per second
- Without throttle: Updates lag, GC pressure
- With throttle: Update max 60 times per second

Real-world issues:
- **API overload**: Search queries hammer backend
- **Rendering lag**: Too many DOM updates
- **Resource exhaustion**: Event handlers never catch up

Debounce/throttle enable:
- **Efficiency**: Fewer operations
- **Responsiveness**: UI stays smooth
- **Resource safety**: Prevent exhaustion
- **Sanity**: Predictable execution

---

**Good Example:**

This example demonstrates debouncing and throttling for common scenarios.

```typescript
import { Effect, Schedule, Ref } from "effect";

interface SearchQuery {
  readonly query: string;
  readonly timestamp: Date;
}

// Simulate API search
const performSearch = (query: string): Effect.Effect<string[]> =>
  Effect.gen(function* () {
    yield* Effect.log(`[API] Searching for: "${query}"`);

    yield* Effect.sleep("100 millis"); // Simulate API delay

    return [
      `Result 1 for ${query}`,
      `Result 2 for ${query}`,
      `Result 3 for ${query}`,
    ];
  });

// Main: demonstrate debounce and throttle
const program = Effect.gen(function* () {
  console.log(`\n[DEBOUNCE/THROTTLE] Handling rapid events\n`);

  // Example 1: Debounce search input
  console.log(`[1] Debounced search (wait for silence):\n`);

  const searchQueries = ["h", "he", "hel", "hell", "hello"];

  const debouncedSearches = yield* Ref.make<Effect.Effect<string[]>[]>([]);

  for (const query of searchQueries) {
    yield* Effect.log(`[INPUT] User typed: "${query}"`);

    // In real app, this would be debounced
    yield* Effect.sleep("150 millis"); // User typing
  }

  // After user stops, execute search
  yield* Effect.log(`[DEBOUNCE] User silent for 200ms, executing search`);

  const searchResults = yield* performSearch("hello");

  yield* Effect.log(`[RESULTS] ${searchResults.length} results found\n`);

  // Example 2: Throttle scroll events
  console.log(`[2] Throttled scroll handler (max 10/sec):\n`);

  const scrollEventCount = yield* Ref.make(0);
  const updateCount = yield* Ref.make(0);

  // Simulate 100 rapid scroll events
  for (let i = 0; i < 100; i++) {
    yield* Ref.update(scrollEventCount, (c) => c + 1);

    // In real app, scroll handler would be throttled
    if (i % 10 === 0) {
      // Simulate throttled update (max 10 per second)
      yield* Ref.update(updateCount, (c) => c + 1);
    }
  }

  const events = yield* Ref.get(scrollEventCount);
  const updates = yield* Ref.get(updateCount);

  yield* Effect.log(
    `[THROTTLE] ${events} scroll events → ${updates} updates (${(updates / events * 100).toFixed(1)}% update rate)\n`
  );

  // Example 3: Deduplication
  console.log(`[3] Deduplicating rapid events:\n`);

  const userClicks = ["click", "click", "click", "dblclick", "click"];

  const lastClick = yield* Ref.make<string | null>(null);
  const clickCount = yield* Ref.make(0);

  for (const click of userClicks) {
    const prev = yield* Ref.get(lastClick);

    if (click !== prev) {
      yield* Effect.log(`[CLICK] Processing: ${click}`);
      yield* Ref.update(clickCount, (c) => c + 1);
      yield* Ref.set(lastClick, click);
    } else {
      yield* Effect.log(`[CLICK] Duplicate: ${click} (skipped)`);
    }
  }

  const processed = yield* Ref.get(clickCount);

  yield* Effect.log(
    `\n[DEDUPE] ${userClicks.length} clicks → ${processed} processed\n`
  );

  // Example 4: Exponential backoff on repeated errors
  console.log(`[4] Throttled retry on errors:\n`);

  let retryCount = 0;

  const operation = Effect.gen(function* () {
    retryCount++;

    if (retryCount < 3) {
      yield* Effect.fail(new Error("Still failing"));
    }

    yield* Effect.log(`[SUCCESS] Succeeded on attempt ${retryCount}`);

    return "done";
  }).pipe(
    Effect.retry(
      Schedule.exponential("100 millis").pipe(
        Schedule.upTo("1 second"),
        Schedule.recurs(5)
      )
    )
  );

  yield* operation;
});

Effect.runPromise(program);
```

---

---

### Sequencing with andThen, tap, and flatten

**Rule:** Use sequencing combinators to run computations in order, perform side effects, or flatten nested structures, while preserving error and context handling.

**Use Cases:** core-concepts

**Why:**

Sequencing is fundamental for expressing workflows.  
These combinators let you:

- Run computations in order (`andThen`)
- Attach logging, metrics, or other side effects (`tap`)
- Simplify nested structures (`flatten`)

All while preserving composability, error handling, and type safety.

**Good Example:**

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

**Anti-Pattern:**

Using `flatMap` with a function that ignores its argument, or manually unwrapping and re-wrapping nested structures, instead of using the dedicated combinators.

---

### Set Up CI/CD for Effect Projects

**Rule:** Use GitHub Actions with proper caching for fast Effect project CI/CD.

**Use Cases:** tooling-and-debugging

**Why:**

CI/CD for Effect projects ensures:

1. **Type safety** - Catch type errors before merge
2. **Test coverage** - Run tests automatically
3. **Consistent builds** - Same environment every time
4. **Fast feedback** - Know quickly if something broke

---

**Good Example:**

### 1. Basic GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun run test

      - name: Build
        run: bun run build
```

### 2. With Caching

```yaml
# .github/workflows/ci-cached.yml
name: CI (Cached)

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      # Cache Bun dependencies
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install

      # Cache TypeScript build info
      - name: Cache TypeScript
        uses: actions/cache@v4
        with:
          path: |
            .tsbuildinfo
            dist
          key: ${{ runner.os }}-tsc-${{ hashFiles('**/tsconfig.json', 'src/**/*.ts') }}
          restore-keys: |
            ${{ runner.os }}-tsc-

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun run test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "build": "tsc",
    "clean": "rm -rf dist .tsbuildinfo"
  }
}
```

### 4. Multi-Stage Workflow

```yaml
# .github/workflows/ci-full.yml
name: CI Full

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck

  test:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test

  build:
    runs-on: ubuntu-latest
    needs: [test]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
      # Add deployment steps
```

### 5. Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - run: bun install
      - run: bun run build
      - run: bun run test

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
          generate_release_notes: true
```

---

### Sink Pattern 1: Batch Insert Stream Records into Database

**Rule:** Batch stream records before database operations to improve throughput and reduce transaction overhead.

**Use Cases:** streams-sinks

**Why:**

Inserting records one-by-one is inefficient:

- Each insert is a separate database call (network latency, connection overhead)
- Each insert may be a separate transaction (ACID overhead)
- Resource contention and connection pool exhaustion at scale

Batching solves this by:

- Grouping N records into a single bulk insert operation
- Amortizing database overhead across multiple records
- Maintaining throughput even under backpressure
- Enabling efficient transaction semantics for the entire batch

For example, inserting 10,000 records one-by-one might take 100 seconds. Batching in groups of 100 might take just 2-3 seconds.

---

**Good Example:**

This example demonstrates streaming user records from a paginated API and batching them for efficient database insertion.

```typescript
import { Effect, Stream, Sink, Chunk } from "effect";

interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
}

interface PaginatedResponse {
  readonly users: User[];
  readonly nextPage: number | null;
}

// Mock API that returns paginated users
const fetchUserPage = (
  page: number
): Effect.Effect<PaginatedResponse> =>
  Effect.succeed(
    page < 10
      ? {
          users: Array.from({ length: 50 }, (_, i) => ({
            id: page * 50 + i,
            name: `User ${page * 50 + i}`,
            email: `user${page * 50 + i}@example.com`,
          })),
          nextPage: page + 1,
        }
      : { users: [], nextPage: null }
  ).pipe(Effect.delay("10 millis"));

// Mock database insert that takes a batch of users
const insertUserBatch = (
  users: readonly User[]
): Effect.Effect<number> =>
  Effect.sync(() => {
    console.log(`Inserting batch of ${users.length} users`);
    return users.length;
  }).pipe(Effect.delay("50 millis"));

// Create a stream of users from paginated API
const userStream: Stream.Stream<User> = Stream.paginateEffect(
  0,
  (page) =>
    fetchUserPage(page).pipe(
      Effect.map((response) => [
        Chunk.fromIterable(response.users),
        response.nextPage !== null ? Option.some(response.nextPage) : Option.none(),
      ])
    )
);

// Sink that batches users and inserts them
const batchInsertSink: Sink.Sink<number, never, User> = Sink.fold(
  0,
  (count, chunk: Chunk.Chunk<User>) =>
    Effect.gen(function* () {
      const users = Chunk.toArray(chunk);
      const inserted = yield* insertUserBatch(users);
      return count + inserted;
    }),
  (count) => Effect.succeed(count)
).pipe(
  // Batch into groups of 100 users
  Sink.withChunking((chunk) =>
    chunk.pipe(
      Chunk.chunksOf(100),
      Stream.fromIterable,
      Stream.runCollect
    )
  )
);

// Run the stream with batching sink
const program = Effect.gen(function* () {
  const totalInserted = yield* userStream.pipe(
    Stream.run(batchInsertSink)
  );
  console.log(`Total users inserted: ${totalInserted}`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates a stream** of users from a paginated API
2. **Defines a batching sink** that collects users into groups of 100
3. **Inserts each batch** to the database in a single operation
4. **Tracks total count** of inserted records

The batching happens automatically—the sink collects elements until the batch size is reached, then processes the complete batch.

---

---

### Sink Pattern 2: Write Stream Events to Event Log

**Rule:** Append stream events to an event log with metadata to maintain a complete, ordered record of what happened.

**Use Cases:** streams-sinks

**Why:**

Event logs are foundational to many patterns:

- **Event Sourcing**: Instead of storing current state, store the sequence of events that led to it
- **Audit Trails**: Complete, tamper-proof record of who did what and when
- **Temporal Queries**: Reconstruct state at any point in time
- **Consistency**: Single source of truth for what happened
- **Replay**: Rebuild state or test changes by replaying events

Unlike batch inserts which are transactional, event logs are append-only. Each event is immutable once written. This simplicity enables:

- Fast appends (no updates, just sequential writes)
- Natural ordering (events in write order)
- Easy distribution (replicate the log)
- Strong consistency (events are facts that don't change)

---

**Good Example:**

This example demonstrates an event sourcing pattern where a user account stream of events is appended to an event log with metadata.

```typescript
import { Effect, Stream, Sink, DateTime, Data } from "effect";

// Event types
type AccountEvent =
  | AccountCreated
  | MoneyDeposited
  | MoneyWithdrawn
  | AccountClosed;

class AccountCreated extends Data.TaggedError("AccountCreated")<{
  readonly accountId: string;
  readonly owner: string;
  readonly initialBalance: number;
}> {}

class MoneyDeposited extends Data.TaggedError("MoneyDeposited")<{
  readonly accountId: string;
  readonly amount: number;
}> {}

class MoneyWithdrawn extends Data.TaggedError("MoneyWithdrawn")<{
  readonly accountId: string;
  readonly amount: number;
}> {}

class AccountClosed extends Data.TaggedError("AccountClosed")<{
  readonly accountId: string;
}> {}

// Event envelope with metadata
interface StoredEvent {
  readonly eventId: string; // Unique identifier per event
  readonly eventType: string; // Type of event
  readonly aggregateId: string; // What this event is about
  readonly aggregateType: string; // What kind of thing (Account)
  readonly data: any; // Event payload
  readonly metadata: {
    readonly timestamp: number;
    readonly version: number; // Position in log
    readonly causationId?: string; // What caused this
  };
}

// Mock event log that appends events
const eventLog: StoredEvent[] = [];
let eventVersion = 0;

const appendToEventLog = (
  event: AccountEvent,
  aggregateId: string
): Effect.Effect<StoredEvent> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    const storedEvent: StoredEvent = {
      eventId: `evt-${eventVersion}-${Date.now()}`,
      eventType: event._tag,
      aggregateId,
      aggregateType: "Account",
      data: event,
      metadata: {
        timestamp: now.toEpochMillis(),
        version: ++eventVersion,
      },
    };

    // Append to log (simulated)
    eventLog.push(storedEvent);
    console.log(
      `[v${storedEvent.metadata.version}] ${storedEvent.eventType}: ${aggregateId}`
    );

    return storedEvent;
  });

// Simulate a stream of events from various account operations
const accountEvents: Stream.Stream<[string, AccountEvent]> = Stream.fromIterable([
  [
    "acc-1",
    new AccountCreated({
      accountId: "acc-1",
      owner: "Alice",
      initialBalance: 1000,
    }),
  ],
  ["acc-1", new MoneyDeposited({ accountId: "acc-1", amount: 500 })],
  ["acc-1", new MoneyWithdrawn({ accountId: "acc-1", amount: 200 })],
  [
    "acc-2",
    new AccountCreated({
      accountId: "acc-2",
      owner: "Bob",
      initialBalance: 2000,
    }),
  ],
  ["acc-2", new MoneyDeposited({ accountId: "acc-2", amount: 1000 })],
  ["acc-1", new AccountClosed({ accountId: "acc-1" })],
]);

// Sink that appends each event to the log
const eventLogSink: Sink.Sink<number, never, [string, AccountEvent]> = Sink.fold(
  0,
  (count, [aggregateId, event]) =>
    appendToEventLog(event, aggregateId).pipe(
      Effect.map(() => count + 1)
    ),
  (count) => Effect.succeed(count)
);

// Run the stream and append all events
const program = Effect.gen(function* () {
  const totalEvents = yield* accountEvents.pipe(Stream.run(eventLogSink));

  console.log(`\nTotal events appended: ${totalEvents}`);
  console.log(`\nEvent log contents:`);
  eventLog.forEach((event) => {
    console.log(`  [v${event.metadata.version}] ${event.eventType}`);
  });
});

Effect.runPromise(program);
```

This pattern:

1. **Defines event types** using tagged errors (AccountCreated, MoneyDeposited, etc.)
2. **Creates event envelopes** with metadata (timestamp, version, causation)
3. **Streams events** from various sources
4. **Appends to log** with proper versioning and ordering
5. **Maintains history** for reconstruction and audit

---

---

### Sink Pattern 3: Write Stream Lines to File

**Rule:** Write streaming lines to a file efficiently using buffered output and proper resource management.

**Use Cases:** streams-sinks

**Why:**

Writing stream data to files requires:

- **Buffering**: Writing one line at a time is slow. Buffer multiple lines before flushing to disk
- **Efficiency**: Reduce system calls and I/O overhead by batching writes
- **Resource Management**: Ensure file handles are properly closed even on errors
- **Ordering**: Maintain the order of lines as they appear in the stream

This pattern is essential for:

- Log files and audit trails
- CSV/JSON Line export
- Streaming data archival
- Data pipelines with file intermediates

---

**Good Example:**

This example demonstrates streaming log entries and writing them to a file with buffering.

```typescript
import { Effect, Stream, Sink, Chunk, FileSystem } from "effect";

interface LogEntry {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly timestamp: number;
}

// Format a log entry as a line
const formatLogLine = (entry: LogEntry): string => {
  const iso = new Date(entry.timestamp).toISOString();
  return `[${iso}] ${entry.level.toUpperCase()}: ${entry.message}`;
};

// Simulate a stream of log entries
const logStream: Stream.Stream<LogEntry> = Stream.fromIterable([
  { level: "info", message: "Server starting", timestamp: Date.now() },
  { level: "debug", message: "Loading config", timestamp: Date.now() + 100 },
  { level: "info", message: "Connected to database", timestamp: Date.now() + 200 },
  { level: "warn", message: "High memory usage detected", timestamp: Date.now() + 300 },
  { level: "info", message: "Processing request", timestamp: Date.now() + 400 },
  { level: "error", message: "Connection timeout", timestamp: Date.now() + 500 },
  { level: "info", message: "Retrying connection", timestamp: Date.now() + 600 },
  { level: "info", message: "Connection restored", timestamp: Date.now() + 700 },
]);

// Create a file writer sink with buffering
const createFileWriteSink = (
  filePath: string,
  bufferSize: number = 100
): Sink.Sink<number, Error, string> =>
  Effect.scoped(
    Effect.gen(function* () {
      // Open file in append mode
      const fs = yield* FileSystem.FileSystem;
      const handle = yield* fs.open(filePath, "a");

      let buffer: string[] = [];
      let lineCount = 0;

      // Flush buffered lines to disk
      const flush = Effect.gen(function* () {
        if (buffer.length === 0) return;

        const content = buffer.join("\n") + "\n";
        yield* fs.write(handle, content);
        buffer = [];
      });

      // Return the sink
      return Sink.fold(
        0,
        (count, line: string) =>
          Effect.gen(function* () {
            buffer.push(line);
            const newCount = count + 1;

            // Flush when buffer reaches size limit
            if (buffer.length >= bufferSize) {
              yield* flush;
            }

            return newCount;
          }),
        (count) =>
          Effect.gen(function* () {
            // Flush any remaining lines before closing
            yield* flush;
            yield* fs.close(handle);
            return count;
          })
      );
    })
  ).pipe(
    Effect.flatten
  );

// Process the log stream
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const filePath = "/tmp/app.log";

  // Clear the file first
  yield* fs.writeFileString(filePath, "");

  // Stream logs, format them, and write to file
  const written = yield* logStream.pipe(
    Stream.map(formatLogLine),
    Stream.run(createFileWriteSink(filePath, 50)) // Buffer 50 lines before flush
  );

  console.log(`Wrote ${written} log lines to ${filePath}`);

  // Read back the file to verify
  const content = yield* fs.readFileString(filePath);
  console.log("\nFile contents:");
  console.log(content);
});

Effect.runPromise(program);
```

This pattern:

1. **Opens a file** for appending
2. **Buffers log lines** in memory (50 lines before flush)
3. **Flushes periodically** when buffer fills or stream ends
4. **Closes the file** safely using scopes
5. **Tracks line count** for confirmation

---

---

### Sink Pattern 4: Send Stream Records to Message Queue

**Rule:** Stream records to message queues with proper batching and acknowledgment for reliable distributed data flow.

**Use Cases:** streams-sinks

**Why:**

Message queues are the backbone of event-driven architectures:

- **Decoupling**: Producers don't wait for consumers
- **Scalability**: Multiple subscribers can consume independently
- **Durability**: Messages persist even if subscribers are down
- **Ordering**: Maintain event sequence (per partition/topic)
- **Reliability**: Acknowledgments and retries ensure no message loss

Unlike direct writes which block, queue publishing is asynchronous and enables:

- High-throughput publishing (batch multiple records per operation)
- Backpressure handling (queue manages flow)
- Multi-subscriber patterns (fan-out)
- Dead letter queues for error handling

---

**Good Example:**

This example demonstrates streaming sensor readings and publishing them to a message queue with topic-based partitioning.

```typescript
import { Effect, Stream, Sink, Chunk } from "effect";

interface SensorReading {
  readonly sensorId: string;
  readonly location: string;
  readonly temperature: number;
  readonly humidity: number;
  readonly timestamp: number;
}

// Mock message queue publisher
interface QueuePublisher {
  readonly publish: (
    topic: string,
    partition: string,
    messages: readonly SensorReading[]
  ) => Effect.Effect<{ acknowledged: number; messageIds: string[] }>;
}

// Create a mock queue publisher
const createMockPublisher = (): QueuePublisher => {
  const publishedMessages: Record<string, SensorReading[]> = {};

  return {
    publish: (topic, partition, messages) =>
      Effect.gen(function* () {
        const key = `${topic}/${partition}`;
        publishedMessages[key] = [
          ...(publishedMessages[key] ?? []),
          ...messages,
        ];

        const messageIds = Array.from({ length: messages.length }, (_, i) =>
          `msg-${Date.now()}-${i}`
        );

        console.log(
          `Published ${messages.length} messages to ${key} (batch)`
        );

        return { acknowledged: messages.length, messageIds };
      }),
  };
};

// Determine the partition key based on sensor location
const getPartitionKey = (reading: SensorReading): string =>
  reading.location; // Route by location for data locality

// Simulate a stream of sensor readings
const sensorStream: Stream.Stream<SensorReading> = Stream.fromIterable([
  {
    sensorId: "temp-1",
    location: "warehouse-a",
    temperature: 22.5,
    humidity: 45,
    timestamp: Date.now(),
  },
  {
    sensorId: "temp-2",
    location: "warehouse-b",
    temperature: 21.0,
    humidity: 50,
    timestamp: Date.now() + 100,
  },
  {
    sensorId: "temp-3",
    location: "warehouse-a",
    temperature: 22.8,
    humidity: 46,
    timestamp: Date.now() + 200,
  },
  {
    sensorId: "temp-4",
    location: "warehouse-c",
    temperature: 20.5,
    humidity: 55,
    timestamp: Date.now() + 300,
  },
  {
    sensorId: "temp-5",
    location: "warehouse-b",
    temperature: 21.2,
    humidity: 51,
    timestamp: Date.now() + 400,
  },
  {
    sensorId: "temp-6",
    location: "warehouse-a",
    temperature: 23.0,
    humidity: 47,
    timestamp: Date.now() + 500,
  },
]);

// Create a sink that batches and publishes to message queue
const createQueuePublishSink = (
  publisher: QueuePublisher,
  topic: string,
  batchSize: number = 100
): Sink.Sink<number, Error, SensorReading> =>
  Sink.fold(
    { batches: new Map<string, SensorReading[]>(), totalPublished: 0 },
    (state, reading) =>
      Effect.gen(function* () {
        const partition = getPartitionKey(reading);
        const batch = state.batches.get(partition) ?? [];
        const newBatch = [...batch, reading];

        if (newBatch.length >= batchSize) {
          // Batch is full, publish it
          const result = yield* publisher.publish(topic, partition, newBatch);
          const newState = new Map(state.batches);
          newState.delete(partition);

          return {
            ...state,
            batches: newState,
            totalPublished: state.totalPublished + result.acknowledged,
          };
        } else {
          // Add to batch and continue
          const newState = new Map(state.batches);
          newState.set(partition, newBatch);

          return { ...state, batches: newState };
        }
      }),
    (state) =>
      Effect.gen(function* () {
        let finalCount = state.totalPublished;

        // Publish any remaining partial batches
        for (const [partition, batch] of state.batches) {
          if (batch.length > 0) {
            const result = yield* publisher.publish(topic, partition, batch);
            finalCount += result.acknowledged;
          }
        }

        return finalCount;
      })
  );

// Run the stream and publish to queue
const program = Effect.gen(function* () {
  const publisher = createMockPublisher();
  const topic = "sensor-readings";

  const published = yield* sensorStream.pipe(
    Stream.run(createQueuePublishSink(publisher, topic, 50)) // Batch size of 50
  );

  console.log(
    `\nTotal messages published to queue: ${published}`
  );
});

Effect.runPromise(program);
```

This pattern:

1. **Groups readings by partition** (location) for data locality
2. **Batches records** before publishing (50 at a time)
3. **Publishes batches** to the queue with partition key
4. **Flushes partial batches** when stream ends
5. **Tracks acknowledgments** from the queue

---

---

### Sink Pattern 5: Fall Back to Alternative Sink on Failure

**Rule:** Implement fallback sinks to handle failures gracefully and ensure data is persisted even when the primary destination is unavailable.

**Use Cases:** streams-sinks

**Why:**

Production systems need resilience:

- **Primary failures**: Database down, network timeout, quota exceeded
- **Progressive degradation**: Keep the system running, even at reduced capacity
- **No data loss**: Fallback ensures data is persisted somewhere
- **Operational flexibility**: Choose fallback based on failure type
- **Monitoring**: Track when fallbacks are used to alert operators

Without fallback patterns:

- System fails when primary destination fails
- Data is lost if primary is unavailable
- No clear signal that degradation occurred

With fallback sinks:

- Stream continues even when primary fails
- Data is safely persisted to alternative
- Clear audit trail of which sink was used

---

**Good Example:**

This example demonstrates a system that tries to write order records to a fast in-memory cache first, falls back to database if cache fails, and falls back to a dead letter file if database fails.

```typescript
import { Effect, Stream, Sink, Chunk, Either, Data } from "effect";

interface Order {
  readonly orderId: string;
  readonly customerId: string;
  readonly total: number;
  readonly timestamp: number;
}

class CacheSinkError extends Data.TaggedError("CacheSinkError")<{
  readonly reason: string;
}> {}

class DatabaseSinkError extends Data.TaggedError("DatabaseSinkError")<{
  readonly reason: string;
}> {}

// Mock in-memory cache sink (fast but limited)
const createCacheSink = (): Sink.Sink<number, CacheSinkError, Order> => {
  const cache: Order[] = [];
  const MAX_CACHE_SIZE = 1000;

  return Sink.fold(
    0,
    (count, order) =>
      Effect.gen(function* () {
        if (cache.length >= MAX_CACHE_SIZE) {
          yield* Effect.fail(
            new CacheSinkError({
              reason: `Cache full (${cache.length}/${MAX_CACHE_SIZE})`,
            })
          );
        }

        cache.push(order);
        console.log(`[CACHE] Cached order ${order.orderId}`);
        return count + 1;
      }),
    (count) =>
      Effect.gen(function* () {
        console.log(`[CACHE] Final: ${count} orders in cache`);
        return count;
      })
  );
};

// Mock database sink (slower but reliable)
const createDatabaseSink = (): Sink.Sink<number, DatabaseSinkError, Order> => {
  const orders: Order[] = [];

  return Sink.fold(
    0,
    (count, order) =>
      Effect.gen(function* () {
        // Simulate occasional database failures
        if (Math.random() < 0.1) {
          yield* Effect.fail(
            new DatabaseSinkError({
              reason: "Connection timeout",
            })
          );
        }

        orders.push(order);
        console.log(`[DATABASE] Persisted order ${order.orderId}`);
        return count + 1;
      }),
    (count) =>
      Effect.gen(function* () {
        console.log(`[DATABASE] Final: ${count} orders in database`);
        return count;
      })
  );
};

// Mock file sink (always works but slow)
const createDeadLetterSink = (): Sink.Sink<number, never, Order> => {
  const deadLetters: Order[] = [];

  return Sink.fold(
    0,
    (count, order) =>
      Effect.gen(function* () {
        deadLetters.push(order);
        console.log(
          `[DEAD-LETTER] Wrote order ${order.orderId} to dead letter file`
        );
        return count + 1;
      }),
    (count) =>
      Effect.gen(function* () {
        console.log(
          `[DEAD-LETTER] Final: ${count} orders in dead letter file`
        );
        return count;
      })
  );
};

// Create a fallback sink that tries cache -> database -> file
const createFallbackSink = (): Sink.Sink<
  { readonly cached: number; readonly persisted: number; readonly deadLetters: number },
  never,
  Order
> =>
  Sink.fold(
    { cached: 0, persisted: 0, deadLetters: 0 },
    (state, order) =>
      Effect.gen(function* () {
        // Try cache first
        const cacheResult = yield* createCacheSink()
          .pipe(Sink.feed(Chunk.of(order)))
          .pipe(Effect.either);

        if (Either.isRight(cacheResult)) {
          return {
            ...state,
            cached: state.cached + cacheResult.right,
          };
        }

        console.log(
          `[FALLBACK] Cache failed (${cacheResult.left.reason}), trying database`
        );

        // Cache failed, try database
        const dbResult = yield* createDatabaseSink()
          .pipe(Sink.feed(Chunk.of(order)))
          .pipe(Effect.either);

        if (Either.isRight(dbResult)) {
          return {
            ...state,
            persisted: state.persisted + dbResult.right,
          };
        }

        console.log(
          `[FALLBACK] Database failed (${dbResult.left.reason}), falling back to dead letter`
        );

        // Database failed, use dead letter
        const dlResult = yield* createDeadLetterSink()
          .pipe(Sink.feed(Chunk.of(order)));

        return {
          ...state,
          deadLetters: state.deadLetters + dlResult,
        };
      }),
    (state) =>
      Effect.gen(function* () {
        console.log(`\n[SUMMARY]`);
        console.log(`  Cached:      ${state.cached}`);
        console.log(`  Persisted:   ${state.persisted}`);
        console.log(`  Dead Letter: ${state.deadLetters}`);
        return state;
      })
  );

// Simulate a stream of orders
const orderStream: Stream.Stream<Order> = Stream.fromIterable([
  {
    orderId: "order-1",
    customerId: "cust-1",
    total: 99.99,
    timestamp: Date.now(),
  },
  {
    orderId: "order-2",
    customerId: "cust-2",
    total: 149.99,
    timestamp: Date.now() + 100,
  },
  {
    orderId: "order-3",
    customerId: "cust-1",
    total: 49.99,
    timestamp: Date.now() + 200,
  },
  {
    orderId: "order-4",
    customerId: "cust-3",
    total: 199.99,
    timestamp: Date.now() + 300,
  },
  {
    orderId: "order-5",
    customerId: "cust-2",
    total: 89.99,
    timestamp: Date.now() + 400,
  },
]);

// Run the stream with fallback sink
const program = Effect.gen(function* () {
  const result = yield* orderStream.pipe(Stream.run(createFallbackSink()));
  console.log(`\nTotal orders processed: ${result.cached + result.persisted + result.deadLetters}`);
});

Effect.runPromise(program);
```

This pattern:

1. **Tries cache first** (fast, limited capacity)
2. **Falls back to database** if cache is full
3. **Falls back to dead letter** if database fails
4. **Tracks which sink** was used for each record
5. **Reports summary** of where data went

---

---

### Sink Pattern 6: Retry Failed Stream Operations

**Rule:** Implement retry strategies in sinks to handle transient failures and improve resilience without manual intervention.

**Use Cases:** streams-sinks

**Why:**

Transient failures are common in distributed systems:

- **Network timeouts**: Temporary connectivity issues resolve themselves
- **Rate limiting**: Service recovers once rate limit window resets
- **Temporary unavailability**: Services restart or scale up
- **Circuit breaker trips**: Service recovers after backoff period

Without retry logic:

- Every transient failure causes data loss or stream interruption
- Manual intervention required to restart
- System appears less reliable than it actually is

With intelligent retry logic:

- Automatic recovery from transient failures
- Exponential backoff prevents thundering herd
- Clear visibility into which operations failed permanently
- Data flows continuously despite temporary issues

---

**Good Example:**

This example demonstrates retrying database writes with exponential backoff, tracking attempts, and falling back on permanent failures.

```typescript
import { Effect, Stream, Sink, Chunk, Duration, Schedule } from "effect";

interface UserRecord {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
}

class WriteError extends Error {
  readonly isTransient: boolean;

  constructor(message: string, isTransient: boolean = true) {
    super(message);
    this.name = "WriteError";
    this.isTransient = isTransient;
  }
}

// Mock database that occasionally fails
const database = {
  failureRate: 0.3, // 30% transient failure rate
  permanentFailureRate: 0.05, // 5% permanent failure rate

  insertUser: (user: UserRecord): Effect.Effect<void, WriteError> =>
    Effect.gen(function* () {
      const rand = Math.random();

      // Permanent failure (e.g., constraint violation)
      if (rand < database.permanentFailureRate) {
        throw new WriteError(
          `Permanent: User ${user.userId} already exists`,
          false
        );
      }

      // Transient failure (e.g., connection timeout)
      if (rand < database.permanentFailureRate + database.failureRate) {
        throw new WriteError(
          `Transient: Connection timeout writing ${user.userId}`,
          true
        );
      }

      // Success
      console.log(`✓ Wrote user ${user.userId}`);
    }),
};

// Retry configuration
interface RetryConfig {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffFactor: number;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 100, // Start with 100ms
  maxDelayMs: 5000, // Cap at 5 seconds
  backoffFactor: 2, // Double each time
};

// Result tracking
interface OperationResult {
  readonly succeeded: number;
  readonly transientFailures: number;
  readonly permanentFailures: number;
  readonly detailedStats: Array<{
    readonly userId: string;
    readonly attempts: number;
    readonly status: "success" | "transient-failed" | "permanent-failed";
  }>;
}

// Create a sink with retry logic
const createRetrySink = (config: RetryConfig): Sink.Sink<OperationResult, never, UserRecord> =>
  Sink.fold(
    {
      succeeded: 0,
      transientFailures: 0,
      permanentFailures: 0,
      detailedStats: [],
    },
    (state, user) =>
      Effect.gen(function* () {
        let lastError: WriteError | null = null;
        let attempts = 0;

        // Retry loop
        for (attempts = 1; attempts <= config.maxAttempts; attempts++) {
          try {
            yield* database.insertUser(user);

            // Success!
            console.log(
              `[${user.userId}] Success on attempt ${attempts}/${config.maxAttempts}`
            );

            return {
              ...state,
              succeeded: state.succeeded + 1,
              detailedStats: [
                ...state.detailedStats,
                {
                  userId: user.userId,
                  attempts,
                  status: "success",
                },
              ],
            };
          } catch (error) {
            lastError = error as WriteError;

            if (!lastError.isTransient) {
              // Permanent failure, don't retry
              console.log(
                `[${user.userId}] Permanent failure: ${lastError.message}`
              );

              return {
                ...state,
                permanentFailures: state.permanentFailures + 1,
                detailedStats: [
                  ...state.detailedStats,
                  {
                    userId: user.userId,
                    attempts,
                    status: "permanent-failed",
                  },
                ],
              };
            }

            // Transient failure, retry if attempts remain
            if (attempts < config.maxAttempts) {
              // Calculate delay with exponential backoff
              let delayMs = config.initialDelayMs * Math.pow(config.backoffFactor, attempts - 1);
              delayMs = Math.min(delayMs, config.maxDelayMs);

              // Add jitter (±10%)
              const jitter = delayMs * 0.1;
              delayMs = delayMs + (Math.random() - 0.5) * 2 * jitter;

              console.log(
                `[${user.userId}] Transient failure (attempt ${attempts}/${config.maxAttempts}): ${lastError.message}`
              );
              console.log(`  Retrying in ${Math.round(delayMs)}ms...`);

              yield* Effect.sleep(Duration.millis(Math.round(delayMs)));
            }
          }
        }

        // All retries exhausted
        console.log(
          `[${user.userId}] Failed after ${config.maxAttempts} attempts`
        );

        return {
          ...state,
          transientFailures: state.transientFailures + 1,
          detailedStats: [
            ...state.detailedStats,
            {
              userId: user.userId,
              attempts: config.maxAttempts,
              status: "transient-failed",
            },
          ],
        };
      }),
    (state) =>
      Effect.gen(function* () {
        console.log(`\n[SUMMARY]`);
        console.log(`  Succeeded:           ${state.succeeded}`);
        console.log(`  Transient Failures:  ${state.transientFailures}`);
        console.log(`  Permanent Failures:  ${state.permanentFailures}`);
        console.log(`  Total:               ${state.detailedStats.length}`);

        // Show detailed stats
        const failed = state.detailedStats.filter((s) => s.status !== "success");
        if (failed.length > 0) {
          console.log(`\n[FAILURES]`);
          failed.forEach((stat) => {
            console.log(
              `  ${stat.userId}: ${stat.attempts} attempts (${stat.status})`
            );
          });
        }

        return state;
      })
  );

// Simulate a stream of users to insert
const userStream: Stream.Stream<UserRecord> = Stream.fromIterable([
  { userId: "user-1", name: "Alice", email: "alice@example.com" },
  { userId: "user-2", name: "Bob", email: "bob@example.com" },
  { userId: "user-3", name: "Charlie", email: "charlie@example.com" },
  { userId: "user-4", name: "Diana", email: "diana@example.com" },
  { userId: "user-5", name: "Eve", email: "eve@example.com" },
]);

// Run the stream with retry sink
const program = Effect.gen(function* () {
  const result = yield* userStream.pipe(Stream.run(createRetrySink(defaultRetryConfig)));
  console.log(`\nProcessing complete.`);
});

Effect.runPromise(program);
```

This pattern:

1. **Attempts operation** up to max retries
2. **Distinguishes transient vs. permanent failures**
3. **Uses exponential backoff** to space retries
4. **Adds jitter** to prevent thundering herd
5. **Tracks detailed stats** for monitoring
6. **Reports summary** of outcomes

---

---

### Stream Pattern 2: Merge and Combine Multiple Streams

**Rule:** Use merge and concat combinators to combine multiple streams, enabling aggregation of data from multiple independent sources.

**Use Cases:** streams

**Why:**

Multi-source data processing without merge/concat creates issues:

- **Complex coordination**: Manual loop over multiple sources
- **Hard to aggregate**: Collecting from different sources is verbose
- **Ordering confusion**: Sequential vs. parallel unclear
- **Resource management**: Multiple independent consumers

Merge/concat enable:

- **Simple composition**: Combine streams naturally
- **Semantic clarity**: Merge = parallel, concat = sequential
- **Aggregation**: Single consumer for multiple sources
- **Scalability**: Add sources without refactoring

Real-world example: Aggregating user events
- **Without merge**: Poll user service, poll event log, poll notifications separately
- **With merge**: `Stream.merge(userStream, eventStream, notificationStream)`

---

**Good Example:**

This example demonstrates merging multiple event streams into a unified stream.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface Event {
  readonly source: string;
  readonly type: string;
  readonly data: string;
  readonly timestamp: Date;
}

// Create independent event streams from different sources
const createUserEventStream = (): Stream.Stream<Event> =>
  Stream.fromIterable([
    { source: "user-service", type: "login", data: "user-123", timestamp: new Date(Date.now() + 0) },
    { source: "user-service", type: "logout", data: "user-123", timestamp: new Date(Date.now() + 500) },
  ]).pipe(
    Stream.tap(() => Effect.sleep("500 millis"))
  );

const createPaymentEventStream = (): Stream.Stream<Event> =>
  Stream.fromIterable([
    { source: "payment-service", type: "payment-started", data: "order-456", timestamp: new Date(Date.now() + 200) },
    { source: "payment-service", type: "payment-completed", data: "order-456", timestamp: new Date(Date.now() + 800) },
  ]).pipe(
    Stream.tap(() => Effect.sleep("600 millis"))
  );

const createAuditEventStream = (): Stream.Stream<Event> =>
  Stream.fromIterable([
    { source: "audit-log", type: "access-granted", data: "resource-789", timestamp: new Date(Date.now() + 100) },
    { source: "audit-log", type: "access-revoked", data: "resource-789", timestamp: new Date(Date.now() + 900) },
  ]).pipe(
    Stream.tap(() => Effect.sleep("800 millis"))
  );

// Merge streams (interleaved, unordered)
const mergedEventStream = (): Stream.Stream<Event> => {
  const userStream = createUserEventStream();
  const paymentStream = createPaymentEventStream();
  const auditStream = createAuditEventStream();

  return Stream.merge(userStream, paymentStream, auditStream);
};

// Concat streams (sequential, ordered)
const concatenatedEventStream = (): Stream.Stream<Event> => {
  return createUserEventStream().pipe(
    Stream.concat(createPaymentEventStream()),
    Stream.concat(createAuditEventStream())
  );
};

// Main: Compare merge vs concat
const program = Effect.gen(function* () {
  console.log(`\n[MERGE] Interleaved events from multiple sources:\n`);

  // Collect merged stream
  const mergedEvents = yield* mergedEventStream().pipe(
    Stream.runCollect
  );

  Chunk.forEach(mergedEvents, (event, idx) => {
    console.log(
      `  ${idx + 1}. [${event.source}] ${event.type}: ${event.data}`
    );
  });

  console.log(`\n[CONCAT] Sequential events (user → payment → audit):\n`);

  // Collect concatenated stream
  const concatEvents = yield* concatenatedEventStream().pipe(
    Stream.runCollect
  );

  Chunk.forEach(concatEvents, (event, idx) => {
    console.log(
      `  ${idx + 1}. [${event.source}] ${event.type}: ${event.data}`
    );
  });
});

Effect.runPromise(program);
```

Output shows merge interleaving vs concat ordering:
```
[MERGE] Interleaved events from multiple sources:

  1. [audit-log] access-granted: resource-789
  2. [user-service] login: user-123
  3. [payment-service] payment-started: order-456
  4. [user-service] logout: user-123
  5. [payment-service] payment-completed: order-456
  6. [audit-log] access-revoked: resource-789

[CONCAT] Sequential events (user → payment → audit):

  1. [user-service] login: user-123
  2. [user-service] logout: user-123
  3. [payment-service] payment-started: order-456
  4. [payment-service] payment-completed: order-456
  5. [audit-log] access-granted: resource-789
  6. [audit-log] access-revoked: resource-789
```

---

---

### Stream Pattern 3: Control Backpressure in Streams

**Rule:** Use backpressure control to manage flow between fast producers and slow consumers, preventing memory exhaustion and resource overflow.

**Use Cases:** streams

**Why:**

Without backpressure management, mismatched producer/consumer speeds cause:

- **Memory exhaustion**: Producer faster than consumer → queue grows unbounded
- **Garbage collection pauses**: Large buffers cause GC pressure
- **Resource leaks**: Open connections/file handles accumulate
- **Cascade failures**: One slow consumer blocks entire pipeline

Backpressure enable:

- **Memory safety**: Bounded buffers prevent overflow
- **Resource efficiency**: Consumers pace producers naturally
- **Performance**: Tuning buffer sizes improves throughput
- **Observability**: Monitor backpressure as health indicator

Real-world example: Reading large file vs. writing to database
- **No backpressure**: Read entire file into memory, write slowly → memory exhaustion
- **With backpressure**: Read 1000 lines, wait for database, read next batch

---

**Good Example:**

This example demonstrates managing backpressure when consuming events at different rates.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface DataPoint {
  readonly id: number;
  readonly value: number;
}

// Fast producer: generates 100 items per second
const fastProducer = (): Stream.Stream<DataPoint> =>
  Stream.fromIterable(Array.from({ length: 100 }, (_, i) => ({ id: i, value: Math.random() }))).pipe(
    Stream.tap(() => Effect.sleep("10 millis")) // 10ms per item = 100/sec
  );

// Slow consumer: processes 10 items per second
const slowConsumer = (item: DataPoint): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.sleep("100 millis"); // 100ms per item = 10/sec
  });

// Without backpressure (DANGEROUS - queue grows unbounded)
const unbufferedStream = (): Stream.Stream<DataPoint> =>
  fastProducer().pipe(
    Stream.tap((item) =>
      Effect.log(`[UNBUFFERED] Produced item ${item.id}`)
    )
  );

// With bounded buffer (backpressure kicks in)
const bufferedStream = (bufferSize: number): Stream.Stream<DataPoint> =>
  fastProducer().pipe(
    // Buffer at most 10 items; if full, producer waits
    Stream.buffer(bufferSize),
    Stream.tap((item) =>
      Effect.log(`[BUFFERED] Consumed item ${item.id}`)
    )
  );

// With throttling (rate limit emission)
const throttledStream = (): Stream.Stream<DataPoint> =>
  fastProducer().pipe(
    // Emit at most 1 item per 50ms (20/sec)
    Stream.throttle(1, "50 millis"),
    Stream.tap((item) =>
      Effect.log(`[THROTTLED] Item ${item.id}`)
    )
  );

// Main: compare approaches
const program = Effect.gen(function* () {
  console.log(`\n[START] Demonstrating backpressure management\n`);

  // Test buffered approach
  console.log(`[TEST 1] Buffered stream (buffer size 5):\n`);

  const startBuffer = Date.now();

  yield* bufferedStream(5).pipe(
    Stream.take(20), // Take only 20 items
    Stream.runForEach(slowConsumer)
  );

  const bufferTime = Date.now() - startBuffer;
  console.log(`\n[RESULT] Buffered approach took ${bufferTime}ms\n`);

  // Test throttled approach
  console.log(`[TEST 2] Throttled stream (1 item per 50ms):\n`);

  const startThrottle = Date.now();

  yield* throttledStream().pipe(
    Stream.take(20),
    Stream.runForEach(slowConsumer)
  );

  const throttleTime = Date.now() - startThrottle;
  console.log(`\n[RESULT] Throttled approach took ${throttleTime}ms\n`);

  // Summary
  console.log(`[SUMMARY]`);
  console.log(`  Without backpressure control:`);
  console.log(`    - Queue would grow to 100 items (memory risk)`);
  console.log(`    - Producer/consumer operate independently`);
  console.log(`  With buffering:`);
  console.log(`    - Queue bounded to 5 items (safe)`);
  console.log(`    - Producer waits when buffer full`);
  console.log(`  With throttling:`);
  console.log(`    - Production rate limited to 20/sec`);
  console.log(`    - Smooth controlled flow`);
});

Effect.runPromise(program);
```

---

---

### Stream Pattern 4: Stateful Operations with Scan and Fold

**Rule:** Use scan for stateful element-by-element processing and fold for final aggregation, enabling complex stream analytics without buffering entire stream.

**Use Cases:** streams

**Why:**

Processing streams without scan/fold creates issues:

- **Manual state tracking**: Ref or mutable variables outside stream
- **Lost context**: Hard to correlate intermediate values
- **Error-prone**: Easy to forget state updates
- **Testing difficulty**: State spread across code

Scan/fold enable:

- **Declarative state**: State threaded through stream
- **Intermediate values**: Emit state at each step (scan)
- **Type-safe**: Accumulator type guaranteed
- **Composable**: Chain stateful operations

Real-world example: Running average of metrics
- **Without scan**: Track count and sum manually, calculate average, emit
- **With scan**: `stream.pipe(Stream.scan(initialState, updateAverage))`

---

**Good Example:**

This example demonstrates maintaining statistics across a stream of measurements.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface Measurement {
  readonly id: number;
  readonly value: number;
  readonly timestamp: Date;
}

interface RunningStats {
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  readonly average: number;
  readonly variance: number;
  readonly lastValue: number;
}

// Create stream of measurements
const createMeasurementStream = (): Stream.Stream<Measurement> =>
  Stream.fromIterable([
    { id: 1, value: 10, timestamp: new Date() },
    { id: 2, value: 20, timestamp: new Date() },
    { id: 3, value: 15, timestamp: new Date() },
    { id: 4, value: 25, timestamp: new Date() },
    { id: 5, value: 30, timestamp: new Date() },
    { id: 6, value: 22, timestamp: new Date() },
  ]);

// Initial statistics state
const initialStats: RunningStats = {
  count: 0,
  sum: 0,
  min: Infinity,
  max: -Infinity,
  average: 0,
  variance: 0,
  lastValue: 0,
};

// Reducer: update stats for each measurement
const updateStats = (
  stats: RunningStats,
  measurement: Measurement
): RunningStats => {
  const newCount = stats.count + 1;
  const newSum = stats.sum + measurement.value;
  const newAverage = newSum / newCount;

  // Calculate variance incrementally
  const delta = measurement.value - stats.average;
  const delta2 = measurement.value - newAverage;
  const newVariance = stats.variance + delta * delta2;

  return {
    count: newCount,
    sum: newSum,
    min: Math.min(stats.min, measurement.value),
    max: Math.max(stats.max, measurement.value),
    average: newAverage,
    variance: newVariance / newCount,
    lastValue: measurement.value,
  };
};

// Main: demonstrate scan with statistics
const program = Effect.gen(function* () {
  console.log(`\n[SCAN] Running statistics stream:\n`);

  // Use scan to emit intermediate statistics
  const statsStream = createMeasurementStream().pipe(
    Stream.scan(initialStats, (stats, measurement) => {
      const newStats = updateStats(stats, measurement);

      console.log(
        `[MEASUREMENT ${measurement.id}] Value: ${measurement.value}`
      );
      console.log(
        `  Count: ${newStats.count}, Avg: ${newStats.average.toFixed(2)}, ` +
        `Min: ${newStats.min}, Max: ${newStats.max}, ` +
        `Variance: ${newStats.variance.toFixed(2)}`
      );

      return newStats;
    })
  );

  // Collect all intermediate stats
  const allStats = yield* statsStream.pipe(Stream.runCollect);

  // Final statistics
  const finalStats = Chunk.last(allStats);

  if (finalStats._tag === "Some") {
    console.log(`\n[FINAL STATISTICS]`);
    console.log(`  Total measurements: ${finalStats.value.count}`);
    console.log(`  Average: ${finalStats.value.average.toFixed(2)}`);
    console.log(`  Min: ${finalStats.value.min}`);
    console.log(`  Max: ${finalStats.value.max}`);
    console.log(
      `  Std Dev: ${Math.sqrt(finalStats.value.variance).toFixed(2)}`
    );
  }

  // Compare with fold (emit only final result)
  console.log(`\n[FOLD] Final statistics only:\n`);

  const finalResult = yield* createMeasurementStream().pipe(
    Stream.fold(initialStats, updateStats),
    Stream.tap((stats) =>
      Effect.log(`Final: Count=${stats.count}, Avg=${stats.average.toFixed(2)}`)
    )
  );
});

Effect.runPromise(program);
```

---

---

### Supercharge Your Editor with the Effect LSP

**Rule:** Install and use the Effect LSP extension for enhanced type information and error checking in your editor.

**Use Cases:** tooling-and-debugging

**Why:**

Effect's type system is incredibly powerful, but TypeScript's default language server doesn't always display the rich information contained within the `A`, `E`, and `R` channels in the most intuitive way.

The Effect LSP is a specialized tool that understands the semantics of Effect. It hooks into your editor to provide a superior experience:

- **Rich Inline Types:** It displays the full `Effect<A, E, R>` signature directly in your code as you work, so you always know exactly what an effect produces, how it can fail, and what it requires.
- **Clear Error Messages:** It provides more specific and helpful error messages tailored to Effect's APIs.
- **Enhanced Autocompletion:** It can offer more context-aware suggestions.

This tool essentially makes the compiler's knowledge visible at a glance, reducing the mental overhead of tracking complex types and allowing you to catch errors before you even save the file.

---

**Good Example:**

Imagine you have the following code. Without the LSP, hovering over `program` might show a complex, hard-to-read inferred type.

```typescript
import { Effect } from "effect";

// Define Logger service using Effect.Service pattern
class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({
    log: (msg: string) => Effect.log(`LOG: ${msg}`),
  }),
}) {}

const program = Effect.succeed(42).pipe(
  Effect.map((n) => n.toString()),
  Effect.flatMap((s) => Effect.log(s)),
  Effect.provide(Logger.Default)
);

// Run the program
Effect.runPromise(program);
```

With the Effect LSP installed, your editor would display a clear, readable overlay right above the `program` variable, looking something like this:

```
// (LSP Inlay Hint)
// program: Effect<void, never, never>
```

This immediately tells you that the final program returns nothing (`void`), has no expected failures (`never`), and has no remaining requirements (`never`), so it's ready to be run.

---

**Anti-Pattern:**

Going without the LSP. While your code will still compile and work perfectly fine, you are essentially "flying blind." You miss out on the rich, real-time feedback that the LSP provides, forcing you to rely more heavily on manual type checking, `tsc` runs, and deciphering complex inferred types from your editor's default tooltips. This leads to a slower, less efficient development cycle.

---

### Trace Operations Across Services with Spans

**Rule:** Use Effect.withSpan to create and annotate tracing spans for operations, enabling distributed tracing and performance analysis.

**Use Cases:** observability

**Why:**

Tracing spans help you understand the flow and timing of operations, especially in distributed systems or complex workflows.  
They allow you to pinpoint bottlenecks, visualize dependencies, and correlate logs and metrics with specific requests.

**Good Example:**

```typescript
import { Effect } from "effect";

// Trace a database query with a custom span
const fetchUser = Effect.sync(() => {
  // ...fetch user from database
  return { id: 1, name: "Alice" };
}).pipe(Effect.withSpan("db.fetchUser"));

// Trace an HTTP request with additional attributes
const fetchData = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then((res) => res.json()),
  catch: (err) => `Network error: ${String(err)}`,
}).pipe(
  Effect.withSpan("http.fetchData", {
    attributes: { url: "https://api.example.com/data" },
  })
);

// Use spans in a workflow
const program = Effect.gen(function* () {
  yield* Effect.log("Starting workflow").pipe(
    Effect.withSpan("workflow.start")
  );
  const user = yield* fetchUser;
  yield* Effect.log(`Fetched user: ${user.name}`).pipe(
    Effect.withSpan("workflow.end")
  );
});
```

**Explanation:**

- `Effect.withSpan` creates a tracing span around an operation.
- Spans can be named and annotated with attributes for richer context.
- Tracing enables distributed observability and performance analysis.

**Anti-Pattern:**

Relying only on logs or metrics for performance analysis, or lacking visibility into the flow of requests and operations across services.

---

### Trace Operations Across Services with Spans

**Rule:** Use Effect.withSpan to create custom tracing spans for important operations.

**Use Cases:** observability

**Why:**

While logs tell you _what_ happened, traces tell you _why it was slow_. In a complex application, a single user request might trigger calls to multiple services (authentication, database, external APIs). Tracing allows you to visualize this entire chain of events as a single, hierarchical "trace."

Each piece of work in that trace is a `span`. `Effect.withSpan` allows you to create your own custom spans. This is invaluable for answering questions like:

- "For this API request, did we spend most of our time in the database or calling the external payment gateway?"
- "Which part of our user creation logic is the bottleneck?"

Effect's tracing is built on OpenTelemetry, the industry standard, so it integrates seamlessly with tools like Jaeger, Zipkin, and Datadog.

---

**Good Example:**

This example shows a multi-step operation. Each step, and the overall operation, is wrapped in a span. This creates a parent-child hierarchy in the trace that is easy to visualize.

```typescript
import { Effect, Duration } from "effect";

const validateInput = (input: unknown) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Starting input validation...");
    yield* Effect.sleep(Duration.millis(10));
    const result = { email: "paul@example.com" };
    yield* Effect.logInfo(`✅ Input validated: ${result.email}`);
    return result;
  }).pipe(
    // This creates a child span
    Effect.withSpan("validateInput")
  );

const saveToDatabase = (user: { email: string }) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Saving user to database: ${user.email}`);
    yield* Effect.sleep(Duration.millis(50));
    const result = { id: 123, ...user };
    yield* Effect.logInfo(`✅ User saved with ID: ${result.id}`);
    return result;
  }).pipe(
    // This span includes useful attributes
    Effect.withSpan("saveToDatabase", {
      attributes: { "db.system": "postgresql", "db.user.email": user.email },
    })
  );

const createUser = (input: unknown) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("=== Creating User with Tracing ===");
    yield* Effect.logInfo(
      "This demonstrates how spans trace operations through the call stack"
    );

    const validated = yield* validateInput(input);
    const user = yield* saveToDatabase(validated);

    yield* Effect.logInfo(
      `✅ User creation completed: ${JSON.stringify(user)}`
    );
    yield* Effect.logInfo(
      "Note: In production, spans would be sent to a tracing system like Jaeger or Zipkin"
    );

    return user;
  }).pipe(
    // This is the parent span for the entire operation
    Effect.withSpan("createUserOperation")
  );

// Demonstrate the tracing functionality
const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Trace Operations with Spans Demo ===");

  // Create multiple users to show tracing in action
  const user1 = yield* createUser({ email: "user1@example.com" });

  yield* Effect.logInfo("\n--- Creating second user ---");
  const user2 = yield* createUser({ email: "user2@example.com" });

  yield* Effect.logInfo("\n=== Summary ===");
  yield* Effect.logInfo("Created users with tracing spans:");
  yield* Effect.logInfo(`User 1: ID ${user1.id}, Email: ${user1.email}`);
  yield* Effect.logInfo(`User 2: ID ${user2.id}, Email: ${user2.email}`);
});

// When run with a tracing SDK, this will produce traces with root spans
// "createUserOperation" and child spans: "validateInput" and "saveToDatabase".
Effect.runPromise(program);
```

---

**Anti-Pattern:**

Not adding custom spans to your business logic.
Without them, your traces will only show high-level information from your framework (e.g., "HTTP POST /users").
You will have no visibility into the performance of the individual steps _inside_ your request handler, making it very difficult to pinpoint bottlenecks. Your application's logic remains a "black box" in your traces.

---

### Transform Data During Validation with Schema

**Rule:** Use Schema.transform to safely convert data types during the validation and parsing process.

**Use Cases:** domain-modeling

**Why:**

Often, the data you receive from external sources (like an API) isn't in the ideal format for your application's domain model. For example, dates are sent as ISO strings, but you want to work with `Date` objects.

`Schema.transform` integrates this conversion directly into the parsing step. It takes two functions: one to `decode` the input type into the domain type, and one to `encode` it back. This makes your schema the single source of truth for both the shape and the type transformation of your data.

For transformations that can fail (like creating a branded type), you can use `Schema.transformOrFail`, which allows the decoding step to return an `Either`.

---

**Good Example:**

This schema parses a string but produces a `Date` object, making the final data structure much more useful.

```typescript
import { Schema, Effect } from "effect";

// Define types for better type safety
type RawEvent = {
  name: string;
  timestamp: string;
};

type ParsedEvent = {
  name: string;
  timestamp: Date;
};

// Define the schema for our event
const ApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: Schema.String,
});

// Example input
const rawInput: RawEvent = {
  name: "User Login",
  timestamp: "2025-06-22T20:08:42.000Z",
};

// Parse and transform
const program = Effect.gen(function* () {
  const parsed = yield* Schema.decode(ApiEventSchema)(rawInput);
  return {
    name: parsed.name,
    timestamp: new Date(parsed.timestamp),
  } as ParsedEvent;
});

const programWithLogging = Effect.gen(function* () {
  try {
    const event = yield* program;
    yield* Effect.log(`Event year: ${event.timestamp.getFullYear()}`);
    yield* Effect.log(`Full event: ${JSON.stringify(event, null, 2)}`);
    return event;
  } catch (error) {
    yield* Effect.logError(`Failed to parse event: ${error}`);
    throw error;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithLogging);
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
    (email) => Either.right(email)
  )
);

const result = Schema.decode(Email)("paul@example.com"); // Succeeds
const errorResult = Schema.decode(Email)("invalid-email"); // Fails
```

---

**Anti-Pattern:**

Performing validation and transformation in two separate steps. This is more verbose, requires creating intermediate types, and separates the validation logic from the transformation logic.

```typescript
import { Schema, Effect } from "effect";

// ❌ WRONG: Requires an intermediate "Raw" type.
const RawApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: Schema.String,
});

const rawInput = { name: "User Login", timestamp: "2025-06-22T20:08:42.000Z" };

// The logic is now split into two distinct, less cohesive steps.
const program = Schema.decode(RawApiEventSchema)(rawInput).pipe(
  Effect.map((rawEvent) => ({
    ...rawEvent,
    timestamp: new Date(rawEvent.timestamp), // Manual transformation after parsing.
  }))
);
```

---

### Turn a Paginated API into a Single Stream

**Rule:** Use Stream.paginateEffect to model a paginated data source as a single, continuous stream.

**Use Cases:** building-data-pipelines

**Why:**

Calling paginated APIs is a classic programming challenge. It often involves writing complex, stateful, and imperative code with manual loops to fetch one page, check if there's a next page, fetch that page, and so on, all while accumulating the results. This logic is tedious to write and easy to get wrong.

`Stream.paginateEffect` elegantly solves this by declaratively modeling the pagination process:

1.  **Declarative and Stateless**: You provide a function that knows how to fetch a single page, and the `Stream` handles the looping, state management (the current page token/number), and termination logic for you. Your business logic remains clean and stateless.
2.  **Lazy and Efficient**: The stream fetches pages on demand as they are consumed. If a downstream consumer only needs the first 20 items, the stream will only make enough API calls to satisfy that need, rather than wastefully fetching all pages upfront.
3.  **Fully Composable**: The result is a standard `Stream`. This means you can pipe the continuous flow of items directly into other powerful operators like `mapEffect` for concurrent processing or `grouped` for batching, without ever thinking about page boundaries again.

---

**Good Example:**

This example simulates fetching users from a paginated API. The `fetchUsersPage` function gets one page of data and returns the next page number. `Stream.paginateEffect` uses this function to create a single stream of all users across all pages.

```typescript
import { Effect, Stream, Chunk, Option } from "effect";

// --- Mock Paginated API ---
interface User {
  id: number;
  name: string;
}

// Define FetchError as a class with a literal type tag
class FetchError {
  readonly _tag = "FetchError" as const;
  constructor(readonly message: string) {}
}

// Helper to create FetchError instances
const fetchError = (message: string): FetchError => new FetchError(message);

const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

// This function simulates fetching a page of users from an API.
const fetchUsersPage = (
  page: number
): Effect.Effect<[Chunk.Chunk<User>, Option.Option<number>], FetchError> =>
  Effect.gen(function* () {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Simulate potential API errors
    if (page < 1) {
      return yield* Effect.fail(fetchError("Invalid page number"));
    }

    const users = Chunk.fromIterable(allUsers.slice(offset, offset + pageSize));

    const nextPage =
      Chunk.isNonEmpty(users) && allUsers.length > offset + pageSize
        ? Option.some(page + 1)
        : Option.none();

    yield* Effect.log(`Fetched page ${page}`);
    return [users, nextPage];
  });

// --- The Pattern ---
// Use paginateEffect, providing an initial state (page 1) and the fetch function.
const userStream = Stream.paginateEffect(1, fetchUsersPage);

const program = userStream.pipe(
  Stream.runCollect,
  Effect.map((users) => users.length),
  Effect.tap((totalUsers) => Effect.log(`Total users fetched: ${totalUsers}`)),
  Effect.catchTag("FetchError", (error) =>
    Effect.succeed(`Error fetching users: ${error.message}`)
  )
);

// Run the program
const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Program result: ${result}`);
  return result;
});

Effect.runPromise(programWithLogging);

/*
Output:
... level=INFO msg="Fetched page 1"
... level=INFO msg="Fetched page 2"
... level=INFO msg="Fetched page 3"
... level=INFO msg="Total users fetched: 25"
25
*/
```

**Anti-Pattern:**

The anti-pattern is to write manual, imperative logic to handle the pagination loop. This code is stateful, harder to read, and not composable.

```typescript
import { Effect, Chunk, Option } from "effect";
// ... same mock API setup ...

const fetchAllUsersManually = (): Effect.Effect<Chunk.Chunk<User>, Error> =>
  Effect.gen(function* () {
    // Manual state management for results and current page
    let allFetchedUsers: User[] = [];
    let currentPage: Option.Option<number> = Option.some(1);

    // Manual loop to fetch pages
    while (Option.isSome(currentPage)) {
      const [users, nextPage] = yield* fetchUsersPage(currentPage.value);
      allFetchedUsers = allFetchedUsers.concat(Chunk.toArray(users));
      currentPage = nextPage;
    }

    return Chunk.fromIterable(allFetchedUsers);
  });

const program = fetchAllUsersManually().pipe(
  Effect.map((users) => users.length)
);

Effect.runPromise(program).then((totalUsers) => {
  console.log(`Total users fetched from all pages: ${totalUsers}`);
});
```

This manual approach is inferior because it forces you to manage state explicitly (`allFetchedUsers`, `currentPage`). The logic is contained within a single, monolithic effect that is not lazy and cannot be easily composed with other stream operators without first collecting all results. `Stream.paginateEffect` abstracts away this entire block of boilerplate code.

---

### Type Classes for Equality, Ordering, and Hashing with Data.Class

**Rule:** Use Data.Class to define and derive type classes for your data types, supporting composable equality, ordering, and hashing.

**Use Cases:** core-concepts

**Why:**

Type classes like `Equal`, `Order`, and `Hash` provide a principled way to define how your types are compared, ordered, and hashed.  
This is essential for using your types in sets, maps, and for sorting or deduplication.

**Good Example:**

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

**Anti-Pattern:**

Relying on reference equality, ad-hoc comparison functions, or not providing type class instances for your custom types, which can lead to bugs and inconsistent behavior in collections.

---

### Understand Layers for Dependency Injection

**Rule:** Understand that a Layer is a blueprint describing how to construct a service and its dependencies.

**Use Cases:** core-concepts

**Why:**

In Effect, you don't create service instances directly. Instead, you define `Layer`s that describe _how_ to create them. This separation of declaration from implementation is the core of Effect's powerful dependency injection (DI) system.

This approach has several key benefits:

- **Composability:** You can combine small, focused layers into a complete application layer (`Layer.merge`, `Layer.provide`).
- **Declarative Dependencies:** A layer's type signature explicitly documents its own dependencies, making your application's architecture clear and self-documenting.
- **Testability:** For testing, you can easily swap a "live" layer (e.g., one that connects to a real database) with a "test" layer (one that provides mock data) without changing any of your business logic.

---

**Good Example:**

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

**Anti-Pattern:**

Manually creating and passing service instances around. This is the "poor man's DI" and leads to tightly coupled code that is difficult to test and maintain.

```typescript
// ❌ WRONG: Manual instantiation and prop-drilling.
class LoggerImpl {
  log(msg: string) {
    console.log(msg);
  }
}

class NotifierImpl {
  constructor(private logger: LoggerImpl) {}
  notify(msg: string) {
    this.logger.log(msg);
  }
}

// Dependencies must be created and passed in manually.
const logger = new LoggerImpl();
const notifier = new NotifierImpl(logger);

// This is not easily testable without creating real instances.
notifier.notify("Hello");
```

---

### Use Chunk for High-Performance Collections

**Rule:** Use Chunk to model immutable, high-performance collections for efficient data processing and transformation.

**Use Cases:** core-concepts

**Why:**

`Chunk` provides efficient, immutable operations for large or frequently transformed collections.  
It avoids the pitfalls of mutable arrays and is designed for use in concurrent and streaming workflows.

**Good Example:**

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

**Anti-Pattern:**

Using mutable JavaScript arrays for shared or concurrent data, or for large-scale data processing, which can lead to bugs, inefficiency, and unpredictable behavior.

---

### Use Chunk for High-Performance Collections

**Rule:** Prefer Chunk over Array for immutable collection operations within data processing pipelines for better performance.

**Use Cases:** core-concepts

**Why:**

JavaScript's `Array` is a mutable data structure. Every time you perform an "immutable" operation like `[...arr, newItem]` or `arr.map(...)`, you are creating a brand new array and copying all the elements from the old one. For small arrays, this is fine. For large arrays or in hot code paths, this constant allocation and copying can become a performance bottleneck.

`Chunk` is designed to solve this. It's an immutable data structure that uses structural sharing internally. When you append an item to a `Chunk`, it doesn't re-copy the entire collection. Instead, it creates a new `Chunk` that reuses most of the internal structure of the original, only allocating memory for the new data. This makes immutable appends and updates significantly faster.

---

**Good Example:**

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

**Anti-Pattern:**

Eagerly converting a large or potentially infinite iterable to a `Chunk` before streaming. This completely negates the memory-safety benefits of using a `Stream`.

```typescript
import { Effect, Stream, Chunk } from "effect";

// A generator that could produce a very large (or infinite) number of items.
function* largeDataSource() {
  let i = 0;
  while (i < 1_000_000) {
    yield i++;
  }
}

// ❌ DANGEROUS: `Chunk.fromIterable` will try to pull all 1,000,000 items
// from the generator and load them into memory at once before the stream
// even starts. This can lead to high memory usage or a crash.
const programWithChunk = Stream.fromChunk(
  Chunk.fromIterable(largeDataSource())
).pipe(
  Stream.map((n) => n * 2),
  Stream.runDrain
);

// ✅ CORRECT: `Stream.fromIterable` pulls items from the data source lazily,
// one at a time (or in small batches), maintaining constant memory usage.
const programWithIterable = Stream.fromIterable(largeDataSource()).pipe(
  Stream.map((n) => n * 2),
  Stream.runDrain
);
```

---

### Use Effect DevTools

**Rule:** Use Effect's built-in debugging features and logging for development.

**Use Cases:** tooling-and-debugging

**Why:**

Effect DevTools help you:

1. **See fiber state** - What's running, blocked, completed
2. **Trace execution** - Follow the flow of effects
3. **Debug errors** - Understand failure chains
4. **Profile performance** - Find slow operations

---

**Good Example:**

### 1. Enable Debug Mode

```typescript
import { Effect, Logger, LogLevel, FiberRef, Cause } from "effect"

// ============================================
// 1. Verbose logging for development
// ============================================

const debugProgram = Effect.gen(function* () {
  yield* Effect.logDebug("Starting operation")

  const result = yield* someEffect.pipe(
    Effect.tap((value) => Effect.logDebug(`Got value: ${value}`))
  )

  yield* Effect.logDebug("Operation complete")
  return result
})

// Run with debug logging enabled
const runWithDebug = debugProgram.pipe(
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.runPromise
)

// ============================================
// 2. Fiber supervision and introspection
// ============================================

const inspectFibers = Effect.gen(function* () {
  // Fork some fibers
  const fiber1 = yield* Effect.fork(Effect.sleep("1 second"))
  const fiber2 = yield* Effect.fork(Effect.sleep("2 seconds"))

  // Get fiber IDs
  yield* Effect.log(`Fiber 1 ID: ${fiber1.id()}`)
  yield* Effect.log(`Fiber 2 ID: ${fiber2.id()}`)

  // Check fiber status
  const status1 = yield* fiber1.status
  yield* Effect.log(`Fiber 1 status: ${status1._tag}`)
})

// ============================================
// 3. Trace execution with spans
// ============================================

const tracedProgram = Effect.gen(function* () {
  yield* Effect.log("=== Starting traced program ===")

  yield* Effect.gen(function* () {
    yield* Effect.log("Step 1: Initialize")
    yield* Effect.sleep("100 millis")
  }).pipe(Effect.withLogSpan("initialization"))

  yield* Effect.gen(function* () {
    yield* Effect.log("Step 2: Process")
    yield* Effect.sleep("200 millis")
  }).pipe(Effect.withLogSpan("processing"))

  yield* Effect.gen(function* () {
    yield* Effect.log("Step 3: Finalize")
    yield* Effect.sleep("50 millis")
  }).pipe(Effect.withLogSpan("finalization"))

  yield* Effect.log("=== Program complete ===")
})

// ============================================
// 4. Error cause inspection
// ============================================

const debugErrors = Effect.gen(function* () {
  const failingEffect = Effect.gen(function* () {
    yield* Effect.fail(new Error("Inner error"))
  }).pipe(
    Effect.flatMap(() => Effect.fail(new Error("Outer error")))
  )

  yield* failingEffect.pipe(
    Effect.catchAllCause((cause) =>
      Effect.gen(function* () {
        yield* Effect.log("=== Error Cause Analysis ===")
        yield* Effect.log(`Pretty printed:\n${Cause.pretty(cause)}`)
        yield* Effect.log(`Is failure: ${Cause.isFailure(cause)}`)
        yield* Effect.log(`Is interrupted: ${Cause.isInterrupted(cause)}`)

        // Extract all failures
        const failures = Cause.failures(cause)
        yield* Effect.log(`Failures: ${JSON.stringify([...failures])}`)

        return "recovered"
      })
    )
  )
})

// ============================================
// 5. Context inspection
// ============================================

import { Context } from "effect"

class Config extends Context.Tag("Config")<Config, { debug: boolean }>() {}

const inspectContext = Effect.gen(function* () {
  const context = yield* Effect.context<Config>()

  yield* Effect.log("=== Context Contents ===")
  yield* Effect.log(`Has Config: ${Context.getOption(context, Config)._tag}`)
})

// ============================================
// 6. Custom logger for development
// ============================================

const devLogger = Logger.make(({ logLevel, message, date, annotations, spans }) => {
  const timestamp = date.toISOString()
  const level = logLevel.label.padEnd(7)
  const spanInfo = spans.length > 0
    ? ` [${[...spans].map(([name]) => name).join(" > ")}]`
    : ""
  const annotationInfo = Object.keys(annotations).length > 0
    ? ` ${JSON.stringify(Object.fromEntries(annotations))}`
    : ""

  console.log(`${timestamp} ${level}${spanInfo} ${message}${annotationInfo}`)
})

const withDevLogger = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(Logger.replace(Logger.defaultLogger, devLogger))
  )

// ============================================
// 7. Runtime metrics
// ============================================

const showRuntimeMetrics = Effect.gen(function* () {
  const runtime = yield* Effect.runtime()

  yield* Effect.log("=== Runtime Info ===")
  // Access runtime configuration
  const fiberRefs = runtime.fiberRefs

  yield* Effect.log("FiberRefs available")
})

// ============================================
// 8. Putting it all together
// ============================================

const debugSession = Effect.gen(function* () {
  yield* Effect.log("Starting debug session")

  // Run with all debugging enabled
  yield* tracedProgram.pipe(
    withDevLogger,
    Logger.withMinimumLogLevel(LogLevel.Debug)
  )

  yield* debugErrors

  yield* Effect.log("Debug session complete")
})

Effect.runPromise(debugSession)
```

### Debug Output Example

```
2024-01-15T10:30:00.000Z DEBUG   [initialization] Step 1: Initialize
2024-01-15T10:30:00.100Z DEBUG   [processing] Step 2: Process
2024-01-15T10:30:00.300Z DEBUG   [finalization] Step 3: Finalize
2024-01-15T10:30:00.350Z INFO    Program complete
```

---

### Use Effect.gen for Business Logic

**Rule:** Use Effect.gen for business logic.

**Use Cases:** domain-modeling

**Why:**

Generators provide a syntax that closely resembles standard synchronous code
(`async/await`), making complex workflows significantly easier to read, write,
and debug.

**Good Example:**

```typescript
import { Effect } from "effect";

// Concrete implementations for demonstration
const validateUser = (
  data: any
): Effect.Effect<{ email: string; password: string }, Error, never> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Validating user data: ${JSON.stringify(data)}`);

    if (!data.email || !data.password) {
      return yield* Effect.fail(new Error("Email and password are required"));
    }

    if (data.password.length < 6) {
      return yield* Effect.fail(
        new Error("Password must be at least 6 characters")
      );
    }

    yield* Effect.logInfo("✅ User data validated successfully");
    return { email: data.email, password: data.password };
  });

const hashPassword = (pw: string): Effect.Effect<string, never, never> =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Hashing password...");
    // Simulate password hashing
    const timestamp = yield* Effect.sync(() => Date.now());
    const hashed = `hashed_${pw}_${timestamp}`;
    yield* Effect.logInfo("✅ Password hashed successfully");
    return hashed;
  });

const dbCreateUser = (data: {
  email: string;
  password: string;
}): Effect.Effect<{ id: number; email: string }, never, never> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Creating user in database: ${data.email}`);
    // Simulate database operation
    const user = { id: Math.floor(Math.random() * 1000), email: data.email };
    yield* Effect.logInfo(`✅ User created with ID: ${user.id}`);
    return user;
  });

const createUser = (
  userData: any
): Effect.Effect<{ id: number; email: string }, Error, never> =>
  Effect.gen(function* () {
    const validated = yield* validateUser(userData);
    const hashed = yield* hashPassword(validated.password);
    return yield* dbCreateUser({ ...validated, password: hashed });
  });

// Demonstrate using Effect.gen for business logic
const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Using Effect.gen for Business Logic Demo ===");

  // Example 1: Successful user creation
  yield* Effect.logInfo("\n1. Creating a valid user:");
  const validUser = yield* createUser({
    email: "paul@example.com",
    password: "securepassword123",
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed to create user: ${error.message}`);
        return { id: -1, email: "error" };
      })
    )
  );
  yield* Effect.logInfo(`Created user: ${JSON.stringify(validUser)}`);

  // Example 2: Invalid user data
  yield* Effect.logInfo("\n2. Attempting to create user with invalid data:");
  const invalidUser = yield* createUser({
    email: "invalid@example.com",
    password: "123", // Too short
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed to create user: ${error.message}`);
        return { id: -1, email: "error" };
      })
    )
  );
  yield* Effect.logInfo(`Result: ${JSON.stringify(invalidUser)}`);

  yield* Effect.logInfo("\n✅ Business logic demonstration completed!");
});

Effect.runPromise(program);
```

**Explanation:**  
`Effect.gen` allows you to express business logic in a clear, sequential style,
improving maintainability.

**Anti-Pattern:**

Using long chains of `.andThen` or `.flatMap` for multi-step business logic.
This is harder to read and pass state between steps.

---

### Use the Auto-Generated .Default Layer in Tests

**Rule:** Use the auto-generated .Default layer in tests.

**Use Cases:** testing

**Why:**

The `.Default` layer is the canonical way to provide a service in a test environment. It's automatically created, correctly scoped, and handles resolving any transitive dependencies, making tests cleaner and more robust.

**Good Example:**

```typescript
import { Effect } from "effect";

// Define MyService using Effect.Service pattern
class MyService extends Effect.Service<MyService>()("MyService", {
  sync: () => ({
    doSomething: () =>
      Effect.succeed("done").pipe(
        Effect.tap(() => Effect.log("MyService did something!"))
      ),
  }),
}) {}

// Create a program that uses MyService
const program = Effect.gen(function* () {
  yield* Effect.log("Getting MyService...");
  const service = yield* MyService;

  yield* Effect.log("Calling doSomething()...");
  const result = yield* service.doSomething();

  yield* Effect.log(`Result: ${result}`);
});

// Run the program with default service implementation
Effect.runPromise(Effect.provide(program, MyService.Default));
```

**Explanation:**  
This approach ensures your tests are idiomatic, maintainable, and take full advantage of Effect's dependency injection system.

**Anti-Pattern:**

Do not create manual layers for your service in tests (`Layer.succeed(...)`) or try to provide the service class directly. This bypasses the intended dependency injection mechanism.

---

### Validate Request Body

**Rule:** Use Http.request.schemaBodyJson with a Schema to automatically parse and validate request bodies.

**Use Cases:** building-apis

**Why:**

Accepting user-provided data is one of the most critical and sensitive parts of an API. You must never trust incoming data. The `Http` module's integration with `Schema` provides a robust, declarative solution for this.

Using `Http.request.schemaBodyJson` offers several major advantages:

1.  **Automatic Validation and Error Handling**: If the incoming body does not match the schema, the server automatically rejects the request with a `400 Bad Request` status and a detailed JSON response explaining the validation errors. You don't have to write any of this boilerplate logic.
2.  **Type Safety**: If the validation succeeds, the value produced by the `Effect` is fully typed according to your `Schema`. This eliminates `any` types and brings static analysis benefits to your request handlers.
3.  **Declarative and Clean**: The validation rules are defined once in the `Schema` and then simply applied. This separates the validation logic from your business logic, keeping handlers clean and focused on their core task.
4.  **Security**: It acts as a security gateway, ensuring that malformed or unexpected data structures never reach your application's core logic.

---

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

---

### Validating and Parsing Branded Types

**Rule:** Combine Schema and Brand to validate and parse branded types, guaranteeing only valid domain values are created at runtime.

**Use Cases:** domain-modeling

**Why:**

While branding types at the type level prevents accidental misuse, runtime validation is needed to ensure only valid values are constructed from user input, APIs, or external sources.

**Good Example:**

```typescript
import { Brand, Effect, Schema } from "effect";

// Define a branded type for Email
type Email = string & Brand.Brand<"Email">;

// Create a Schema for Email validation
const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/), // Simple email regex
  Schema.brand("Email" as const) // Attach the brand
);

// Parse and validate an email at runtime
const parseEmail = (input: string) =>
  Effect.try({
    try: () => Schema.decodeSync(EmailSchema)(input),
    catch: (err) => `Invalid email: ${String(err)}`,
  });

// Usage
parseEmail("user@example.com").pipe(
  Effect.match({
    onSuccess: (email) => console.log("Valid email:", email),
    onFailure: (err) => console.error(err),
  })
);
```

**Explanation:**

- `Schema` is used to define validation logic for the branded type.
- `Brand.schema<Email>()` attaches the brand to the schema, so only validated values can be constructed as `Email`.
- This pattern ensures both compile-time and runtime safety.

**Anti-Pattern:**

Branding values without runtime validation, or accepting unvalidated user input as branded types, which can lead to invalid domain values and runtime bugs.

---

### Work with Arbitrary-Precision Numbers using BigDecimal

**Rule:** Use BigDecimal to represent and compute with decimal numbers that require arbitrary precision, such as in finance or scientific domains.

**Use Cases:** core-concepts

**Why:**

JavaScript's `number` type is a floating-point double, which can introduce subtle bugs in calculations that require exact decimal representation.  
`BigDecimal` provides precise, immutable arithmetic for critical domains.

**Good Example:**

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

**Anti-Pattern:**

Using JavaScript's native `number` type for financial or scientific calculations, which can lead to rounding errors and loss of precision.

---

### Work with Dates and Times using DateTime

**Rule:** Use DateTime to represent and manipulate dates and times in a type-safe, immutable, and time-zone-aware way.

**Use Cases:** core-concepts

**Why:**

JavaScript's native `Date` is mutable, not time-zone-aware, and can be error-prone.  
`DateTime` provides an immutable, functional alternative with explicit time zone handling and robust APIs for time arithmetic.

**Good Example:**

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

**Anti-Pattern:**

Using JavaScript's mutable `Date` for time calculations, or ignoring time zones, which can lead to subtle and hard-to-debug errors.

---

### Work with Immutable Sets using HashSet

**Rule:** Use HashSet to represent sets of unique values with efficient, immutable operations for membership, union, intersection, and difference.

**Use Cases:** core-concepts

**Why:**

`HashSet` provides high-performance, immutable set operations that are safe for concurrent and functional programming.  
It avoids the pitfalls of mutable JavaScript `Set` and is optimized for use in Effect workflows.

**Good Example:**

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

**Anti-Pattern:**

Using mutable JavaScript `Set` for shared or concurrent data, or for set operations in functional code, which can lead to bugs and unpredictable behavior.

---

### Write Tests That Adapt to Application Code

**Rule:** Write tests that adapt to application code.

**Use Cases:** testing

**Why:**

Treating application code as immutable during testing prevents the introduction of bugs and false test confidence. The goal of a test is to verify real-world behavior; changing that behavior to suit the test invalidates its purpose.

**Good Example:**

```typescript
import { Effect } from "effect";

// Define our types
interface User {
  id: number;
  name: string;
}

class NotFoundError extends Error {
  readonly _tag = "NotFoundError";
  constructor(readonly id: number) {
    super(`User ${id} not found`);
  }
}

// Define database service interface
interface DatabaseServiceApi {
  getUserById: (id: number) => Effect.Effect<User, NotFoundError>;
}

// Implement the service with mock data
class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    sync: () => ({
      getUserById: (id: number) => {
        // Simulate database lookup
        if (id === 404) {
          return Effect.fail(new NotFoundError(id));
        }
        return Effect.succeed({ id, name: `User ${id}` });
      },
    }),
  }
) {}

// Test service implementation for testing
class TestDatabaseService extends Effect.Service<TestDatabaseService>()(
  "TestDatabaseService",
  {
    sync: () => ({
      getUserById: (id: number) => {
        // Test data with predictable responses
        const testUsers = [
          { id: 1, name: "Test User 1" },
          { id: 2, name: "Test User 2" },
          { id: 123, name: "User 123" },
        ];

        const user = testUsers.find((u) => u.id === id);
        if (user) {
          return Effect.succeed(user);
        }
        return Effect.fail(new NotFoundError(id));
      },
    }),
  }
) {}

// Business logic that uses the database service
const getUserWithFallback = (id: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* Effect.gen(function* () {
      const user = yield* db.getUserById(id);
      return user;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          if (error instanceof NotFoundError) {
            yield* Effect.logInfo(`User ${id} not found, using fallback`);
            return { id, name: `Fallback User ${id}` };
          }
          return yield* Effect.fail(error);
        })
      )
    );
  });

// Create a program that demonstrates the service
const program = Effect.gen(function* () {
  yield* Effect.logInfo(
    "=== Writing Tests that Adapt to Application Code Demo ==="
  );

  const db = yield* DatabaseService;

  // Example 1: Successful user lookup
  yield* Effect.logInfo("\n1. Looking up existing user 123...");
  const user = yield* Effect.gen(function* () {
    try {
      return yield* db.getUserById(123);
    } catch (error) {
      yield* Effect.logError(
        `Failed to get user: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return { id: -1, name: "Error" };
    }
  });
  yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);

  // Example 2: Handle non-existent user with proper error handling
  yield* Effect.logInfo("\n2. Looking up non-existent user 404...");
  const notFoundUser = yield* Effect.gen(function* () {
    try {
      return yield* db.getUserById(404);
    } catch (error) {
      if (error instanceof NotFoundError) {
        yield* Effect.logInfo(
          `✅ Properly handled NotFoundError: ${error.message}`
        );
        return { id: 404, name: "Not Found" };
      }
      yield* Effect.logError(
        `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return { id: -1, name: "Error" };
    }
  });
  yield* Effect.logInfo(`Result: ${JSON.stringify(notFoundUser)}`);

  // Example 3: Business logic with fallback
  yield* Effect.logInfo("\n3. Business logic with fallback for missing user:");
  const userWithFallback = yield* getUserWithFallback(999);
  yield* Effect.logInfo(
    `User with fallback: ${JSON.stringify(userWithFallback)}`
  );

  // Example 4: Testing with different service implementation
  yield* Effect.logInfo("\n4. Testing with test service implementation:");
  yield* Effect.provide(
    Effect.gen(function* () {
      const testDb = yield* TestDatabaseService;

      // Test existing user
      const testUser1 = yield* Effect.gen(function* () {
        try {
          return yield* testDb.getUserById(1);
        } catch (error) {
          yield* Effect.logError(
            `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          return { id: -1, name: "Test Error" };
        }
      });
      yield* Effect.logInfo(`Test user 1: ${JSON.stringify(testUser1)}`);

      // Test non-existing user
      const testUser404 = yield* Effect.gen(function* () {
        try {
          return yield* testDb.getUserById(404);
        } catch (error) {
          yield* Effect.logInfo(
            `✅ Test service properly threw NotFoundError: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          return { id: 404, name: "Test Not Found" };
        }
      });
      yield* Effect.logInfo(`Test result: ${JSON.stringify(testUser404)}`);
    }),
    TestDatabaseService.Default
  );

  yield* Effect.logInfo(
    "\n✅ Tests that adapt to application code demonstration completed!"
  );
  yield* Effect.logInfo(
    "The same business logic works with different service implementations!"
  );
});

// Run the program with the default database service
Effect.runPromise(
  Effect.provide(program, DatabaseService.Default) as Effect.Effect<
    void,
    never,
    never
  >
);
```

**Explanation:**  
Tests should reflect the real interface and behavior of your code, not force changes to it.

**Anti-Pattern:**

Any action where the test dictates a change to the application code. Do not modify a service file to add a method just because a test needs it. If a test fails, fix the test.

---

## 🟠 Advanced Patterns

### Add Caching by Wrapping a Layer

**Rule:** Use a wrapping Layer to add cross-cutting concerns like caching to a service without altering its original implementation.

**Use Cases:** concurrency

**Why:**

You often want to add functionality like caching, logging, or metrics to a service without polluting its core business logic. The wrapper layer pattern is a clean way to achieve this.

By creating a layer that _requires_ the original service, you can get an instance of it from the context, and then provide a _new_ implementation of that same service that calls the original.

This approach is powerful because:

- **It's Non-Invasive:** The original service (`DatabaseLive`) remains completely unchanged.
- **It's Composable:** You can apply multiple wrappers. You could wrap a database layer with a caching layer, then wrap that with a metrics layer.
- **It's Explicit:** The composition is clearly defined at the application's top level where you build your final `AppLayer`.

---

**Good Example:**

We have a `WeatherService` that makes slow API calls. We create a `WeatherService.cached` wrapper layer that adds an in-memory cache using a `Ref` and a `Map`.

```typescript
import { Effect, Layer, Ref } from "effect";

// 1. Define the service interface
class WeatherService extends Effect.Service<WeatherService>()(
  "WeatherService",
  {
    sync: () => ({
      getForecast: (city: string) => Effect.succeed(`Sunny in ${city}`),
    }),
  }
) {}

// 2. The "Live" implementation that is slow
const WeatherServiceLive = Layer.succeed(
  WeatherService,
  WeatherService.of({
    _tag: "WeatherService",
    getForecast: (city) =>
      Effect.succeed(`Sunny in ${city}`).pipe(
        Effect.delay("2 seconds"),
        Effect.tap(() => Effect.log(`Fetched live forecast for ${city}`))
      ),
  })
);

// 3. The Caching Wrapper Layer
const WeatherServiceCached = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    // It REQUIRES the original WeatherService
    const underlyingService = yield* WeatherService;
    const cache = yield* Ref.make(new Map<string, string>());

    return WeatherService.of({
      _tag: "WeatherService",
      getForecast: (city) =>
        Ref.get(cache).pipe(
          Effect.flatMap((map) =>
            map.has(city)
              ? Effect.log(`Cache HIT for ${city}`).pipe(
                  Effect.as(map.get(city)!)
                )
              : Effect.log(`Cache MISS for ${city}`).pipe(
                  Effect.flatMap(() => underlyingService.getForecast(city)),
                  Effect.tap((forecast) =>
                    Ref.update(cache, (map) => map.set(city, forecast))
                  )
                )
          )
        ),
    });
  })
);

// 4. Compose the final layer. The wrapper is provided with the live implementation.
const AppLayer = Layer.provide(WeatherServiceCached, WeatherServiceLive);

// 5. The application logic
const program = Effect.gen(function* () {
  const weather = yield* WeatherService;
  yield* weather.getForecast("London"); // First call is slow (MISS)
  yield* weather.getForecast("London"); // Second call is instant (HIT)
});

Effect.runPromise(Effect.provide(program, AppLayer));
```

---

**Anti-Pattern:**

Modifying the original service implementation to include caching logic directly. This violates the Single Responsibility Principle by mixing the core logic of fetching weather with the cross-cutting concern of caching.

```typescript
// ❌ WRONG: The service is now responsible for both its logic and its caching strategy.
const WeatherServiceWithInlineCache = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    const cache = yield* Ref.make(new Map<string, string>());
    return WeatherService.of({
      getForecast: (city) => {
        // ...caching logic mixed directly with fetching logic...
        return Effect.succeed("...");
      },
    });
  })
);
```

---

### Build a Basic HTTP Server

**Rule:** Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

**Use Cases:** making-http-requests

**Why:**

This pattern demonstrates the complete lifecycle of a long-running Effect application.

1.  **Setup Phase:** You define all your application's dependencies (database connections, clients, config) in `Layer`s and compose them into a single `AppLayer`.
2.  **Runtime Creation:** You use `Layer.toRuntime(AppLayer)` to create a highly-optimized `Runtime` object. This is done _once_ when the server starts.
3.  **Request Handling:** For each incoming request, you create an `Effect` that describes the work to be done (e.g., parse request, call services, create response).
4.  **Execution:** You use the `Runtime` you created in the setup phase to execute the request-handling `Effect` using `Runtime.runPromise`.

This architecture ensures that your request handling logic is fully testable, benefits from structured concurrency, and is completely decoupled from the server's setup and infrastructure.

---

**Good Example:**

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

**Anti-Pattern:**

Creating a new runtime or rebuilding layers for every single incoming request. This is extremely inefficient and defeats the purpose of Effect's `Layer` system.

```typescript
import * as http from "http";
import { Effect, Layer } from "effect";
import { GreeterLive } from "./somewhere";

// ❌ WRONG: This rebuilds the GreeterLive layer on every request.
const server = http.createServer((_req, res) => {
  const requestEffect = Effect.succeed("Hello!").pipe(
    Effect.provide(GreeterLive) // Providing the layer here is inefficient
  );
  Effect.runPromise(requestEffect).then((msg) => res.end(msg));
});
```

---

### Create a Managed Runtime for Scoped Resources

**Rule:** Create a managed runtime for scoped resources.

**Use Cases:** resource-management

**Why:**

`Layer.launch` is designed for resource safety. It acquires all resources,
provides them to your effect, and—crucially—guarantees that all registered
finalizers are executed upon completion or interruption.

**Good Example:**

```typescript
import { Effect, Layer } from "effect";

class DatabasePool extends Effect.Service<DatabasePool>()("DbPool", {
  effect: Effect.gen(function* () {
    yield* Effect.log("Acquiring pool");
    return {
      query: () => Effect.succeed("result"),
    };
  }),
}) {}

// Create a program that uses the DatabasePool service
const program = Effect.gen(function* () {
  const db = yield* DatabasePool;
  yield* Effect.log("Using DB");
  yield* db.query();
});

// Run the program with the service implementation
Effect.runPromise(
  program.pipe(Effect.provide(DatabasePool.Default), Effect.scoped)
);
```

**Explanation:**  
`Layer.launch` ensures that resources are acquired and released safely, even
in the event of errors or interruptions.

**Anti-Pattern:**

Do not use `Layer.toRuntime` with layers that contain scoped resources. This
will acquire the resource, but the runtime has no mechanism to release it,
leading to resource leaks.

---

### Create a Reusable Runtime from Layers

**Rule:** Create a reusable runtime from layers.

**Use Cases:** project-setup--execution

**Why:**

Building the dependency graph from layers has a one-time cost. Creating a
`Runtime` once when your application starts is highly efficient for
long-running applications.

**Good Example:**

```typescript
import { Effect, Layer, Runtime } from "effect";

class GreeterService extends Effect.Service<GreeterService>()("Greeter", {
  sync: () => ({
    greet: (name: string) => Effect.sync(() => `Hello ${name}`),
  }),
}) {}

const runtime = Effect.runSync(
  Layer.toRuntime(GreeterService.Default).pipe(Effect.scoped)
);

// In a server, you would reuse `run` for every request.
Runtime.runPromise(runtime)(Effect.log("Hello"));
```

**Explanation:**  
By compiling your layers into a Runtime once, you avoid rebuilding the
dependency graph for every effect execution.

**Anti-Pattern:**

For a long-running application, avoid providing layers and running an effect
in a single operation. This forces Effect to rebuild the dependency graph on
every execution.

---

### Create Observability Dashboards

**Rule:** Create focused dashboards that answer specific questions about system health.

**Use Cases:** observability

**Why:**

Good dashboards provide:

1. **Quick health check** - See problems at a glance
2. **Trend analysis** - Spot gradual degradation
3. **Debugging aid** - Correlate metrics during incidents
4. **Capacity planning** - Forecast resource needs

---

---

### Decouple Fibers with Queues and PubSub

**Rule:** Use Queue for point-to-point work distribution and PubSub for broadcast messaging between fibers.

**Use Cases:** concurrency

**Why:**

Directly calling functions between different logical parts of a concurrent application creates tight coupling, making the system brittle and hard to scale. `Queue` and `PubSub` solve this by acting as asynchronous, fiber-safe message brokers.

This decouples the **producer** of a message from its **consumer(s)**. The producer doesn't need to know who is listening, or how many listeners there are. This allows you to build resilient, scalable systems where you can add or remove workers/listeners without changing the producer's code.

Furthermore, bounded `Queue`s and `PubSub`s provide automatic **back-pressure**. If consumers can't keep up, the producer will automatically pause before adding new items, preventing your system from becoming overloaded.

---

**Good Example:**

A producer fiber adds jobs to a `Queue`, and a worker fiber takes jobs off the queue to process them.

```typescript
import { Effect, Queue, Fiber } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting queue demo...");

  // Create a bounded queue that can hold a maximum of 10 items.
  // This prevents memory issues by applying backpressure when the queue is full.
  // If a producer tries to add to a full queue, it will suspend until space is available.
  const queue = yield* Queue.bounded<string>(10);
  yield* Effect.logInfo("Created bounded queue");

  // Producer Fiber: Add a job to the queue every second.
  // This fiber runs independently and continuously produces work items.
  // The producer-consumer pattern decouples work generation from work processing.
  const producer = yield* Effect.gen(function* () {
    let i = 0;
    while (true) {
      const job = `job-${i++}`;
      yield* Effect.logInfo(`Producing ${job}...`);

      // Queue.offer adds an item to the queue. If the queue is full,
      // this operation will suspend the fiber until space becomes available.
      // This provides natural backpressure control.
      yield* Queue.offer(queue, job);

      // Sleep for 500ms between job creation. This controls the production rate.
      // Producer is faster than consumer (500ms vs 1000ms) to demonstrate queue buffering.
      yield* Effect.sleep("500 millis");
    }
  }).pipe(Effect.fork); // Fork creates a new fiber that runs concurrently

  yield* Effect.logInfo("Started producer fiber");

  // Worker Fiber: Take a job from the queue and process it.
  // This fiber runs independently and processes work items as they become available.
  // Multiple workers could be created to scale processing capacity.
  const worker = yield* Effect.gen(function* () {
    while (true) {
      // Queue.take removes and returns an item from the queue.
      // If the queue is empty, this operation will suspend the fiber
      // until an item becomes available. This prevents busy-waiting.
      const job = yield* Queue.take(queue);
      yield* Effect.logInfo(`Processing ${job}...`);

      // Simulate work by sleeping for 1 second.
      // This makes the worker slower than the producer, causing queue buildup.
      yield* Effect.sleep("1 second");
      yield* Effect.logInfo(`Completed ${job}`);
    }
  }).pipe(Effect.fork); // Fork creates another independent fiber

  yield* Effect.logInfo("Started worker fiber");

  // Let them run for a while...
  // The main fiber sleeps while the producer and worker fibers run concurrently.
  // During this time, you'll see the queue acting as a buffer between
  // the fast producer and slow worker.
  yield* Effect.logInfo("Running for 10 seconds...");
  yield* Effect.sleep("10 seconds");
  yield* Effect.logInfo("Done!");

  // Interrupt both fibers to clean up resources.
  // Fiber.interrupt sends an interruption signal to the fiber,
  // allowing it to perform cleanup operations before terminating.
  // This is safer than forcefully killing fibers.
  yield* Fiber.interrupt(producer);
  yield* Fiber.interrupt(worker);

  // Note: In a real application, you might want to:
  // 1. Drain the queue before interrupting workers
  // 2. Use Fiber.join to wait for graceful shutdown
  // 3. Handle interruption signals in the fiber loops
});

// Run the program
// This demonstrates the producer-consumer pattern with Effect fibers:
// - Fibers are lightweight threads that can be created in large numbers
// - Queues provide safe communication between fibers
// - Backpressure prevents resource exhaustion
// - Interruption allows for graceful shutdown
Effect.runPromise(program);
```


A publisher sends an event, and multiple subscribers react to it independently.

```typescript
import { Effect, PubSub } from "effect";

const program = Effect.gen(function* () {
  const pubsub = yield* PubSub.bounded<string>(10);

  // Subscriber 1: The "Audit" service
  const auditSub = PubSub.subscribe(pubsub).pipe(
    Effect.flatMap((subscription) =>
      Effect.gen(function* () {
        while (true) {
          const event = yield* Queue.take(subscription);
          yield* Effect.log(`AUDIT: Received event: ${event}`);
        }
      })
    ),
    Effect.fork
  );

  // Subscriber 2: The "Notifier" service
  const notifierSub = PubSub.subscribe(pubsub).pipe(
    Effect.flatMap((subscription) =>
      Effect.gen(function* () {
        while (true) {
          const event = yield* Queue.take(subscription);
          yield* Effect.log(`NOTIFIER: Sending notification for: ${event}`);
        }
      })
    ),
    Effect.fork
  );

  // Give subscribers time to start
  yield* Effect.sleep("1 second");

  // Publisher: Publish an event that both subscribers will receive.
  yield* PubSub.publish(pubsub, "user_logged_in");
});
```

---

**Anti-Pattern:**

Simulating a queue with a simple `Ref<A[]>`. This approach is inefficient due to polling and is not safe from race conditions without manual, complex locking mechanisms. It also lacks critical features like back-pressure.

```typescript
import { Effect, Ref } from "effect";

// ❌ WRONG: This is inefficient and prone to race conditions.
const program = Effect.gen(function* () {
  const queueRef = yield* Ref.make<string[]>([]);

  // Producer adds to the array
  const producer = Ref.update(queueRef, (q) => [...q, "new_item"]);

  // Consumer has to constantly poll the array to see if it's empty.
  const consumer = Ref.get(queueRef).pipe(
    Effect.flatMap(
      (q) =>
        q.length > 0
          ? Ref.set(queueRef, q.slice(1)).pipe(Effect.as(q[0]))
          : Effect.sleep("1 second").pipe(Effect.flatMap(() => consumer)) // Inefficient polling
    )
  );
});
```

---

### Error Handling Pattern 2: Error Propagation and Chains

**Rule:** Use error propagation to preserve context through effect chains, enabling debugging and recovery at the right abstraction level.

**Use Cases:** error-handling

**Why:**

Loss of error context causes problems:

**Problem 1: Useless error messages**
- User sees: "Error: null"
- Debugging: Where did it come from? When? Why?
- Wasted hours searching logs

**Problem 2: Wrong recovery layer**
- Network error → recovered at business logic layer (inefficient)
- Should be recovered at network layer → retry, exponential backoff

**Problem 3: Error context loss**
- Database connection failed
- But which database? Which query? With what parameters?
- Logs show "Connection failed" (not actionable)

**Problem 4: Hidden root cause**
- Effect 1 fails → triggers Effect 2 → different error
- Developer sees Effect 2 error
- Doesn't know Effect 1 was root cause
- Fixes wrong thing

Solutions:

**Error context**:
- Include operation name
- Include relevant parameters
- Include timestamps
- Include retry count

**Error cause chains**:
- Keep original error
- Add context at each layer
- `mapError()` to transform
- `tapError()` to log context

**Recovery layers**:
- Low-level: Retry network requests
- Mid-level: Transform domain errors
- High-level: Convert to user-friendly messages

---

**Good Example:**

This example demonstrates error propagation with context.

```typescript
import { Effect, Data, Cause } from "effect";

// Domain-specific errors with context
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  query: string;
  parameters: unknown[];
  cause: Error;
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  endpoint: string;
  method: string;
  statusCode?: number;
  cause: Error;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
  value: unknown;
  reason: string;
}> {}

class BusinessLogicError extends Data.TaggedError("BusinessLogicError")<{
  operation: string;
  context: Record<string, unknown>;
  originalError: Error;
}> {}

const program = Effect.gen(function* () {
  console.log(`\n[ERROR PROPAGATION] Error chains with context\n`);

  // Example 1: Simple error propagation
  console.log(`[1] Error propagation through layers:\n`);

  const lowLevelOperation = Effect.gen(function* () {
    yield* Effect.log(`[LAYER 1] Low-level operation starting`);

    yield* Effect.fail(new Error("File not found"));
  });

  const midLevelOperation = lowLevelOperation.pipe(
    Effect.mapError((error) =>
      new DatabaseError({
        query: "SELECT * FROM users",
        parameters: ["id=123"],
        cause: error instanceof Error ? error : new Error(String(error)),
      })
    )
  );

  const highLevelOperation = midLevelOperation.pipe(
    Effect.catchTag("DatabaseError", (dbError) =>
      Effect.gen(function* () {
        yield* Effect.log(`[LAYER 3] Caught database error`);
        yield* Effect.log(`[LAYER 3]   Query: ${dbError.query}`);
        yield* Effect.log(`[LAYER 3]   Cause: ${dbError.cause.message}`);

        // Recovery decision
        return "fallback-value";
      })
    )
  );

  const result1 = yield* highLevelOperation;

  yield* Effect.log(`[RESULT] Recovered with: ${result1}\n`);

  // Example 2: Error context accumulation
  console.log(`[2] Accumulating context through layers:\n`);

  interface ErrorContext {
    timestamp: Date;
    operation: string;
    userId?: string;
    requestId: string;
  }

  const errorWithContext = (context: ErrorContext) =>
    Effect.fail(
      new BusinessLogicError({
        operation: context.operation,
        context: {
          userId: context.userId,
          timestamp: context.timestamp.toISOString(),
          requestId: context.requestId,
        },
        originalError: new Error("Operation failed"),
      })
    );

  const myContext: ErrorContext = {
    timestamp: new Date(),
    operation: "process-payment",
    userId: "user-123",
    requestId: "req-abc-def",
  };

  const withContextRecovery = errorWithContext(myContext).pipe(
    Effect.mapError((error) => {
      // Log complete context
      return {
        ...error,
        enriched: true,
        additionalInfo: {
          serviceName: "payment-service",
          environment: "production",
          version: "1.2.3",
        },
      };
    }),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[ERROR CAUGHT] ${error.operation}`);
        yield* Effect.log(`[CONTEXT] ${JSON.stringify(error.context, null, 2)}`);
        return "recovered";
      })
    )
  );

  yield* withContextRecovery;

  // Example 3: Network error with retry context
  console.log(`\n[3] Network errors with retry context:\n`);

  interface RetryContext {
    attempt: number;
    maxAttempts: number;
    delay: number;
  }

  let attemptCount = 0;

  const networkCall = Effect.gen(function* () {
    attemptCount++;

    yield* Effect.log(`[ATTEMPT] ${attemptCount}/3`);

    if (attemptCount < 3) {
      yield* Effect.fail(
        new NetworkError({
          endpoint: "https://api.example.com/data",
          method: "GET",
          statusCode: 503,
          cause: new Error("Service Unavailable"),
        })
      );
    }

    return "success";
  });

  const withRetryContext = Effect.gen(function* () {
    let lastError: NetworkError | null = null;

    for (let i = 1; i <= 3; i++) {
      const result = yield* networkCall.pipe(
        Effect.catchTag("NetworkError", (error) => {
          lastError = error;

          yield* Effect.log(
            `[RETRY] Attempt ${i} failed: ${error.statusCode}`
          );

          if (i < 3) {
            yield* Effect.log(`[RETRY] Waiting before retry...`);
          }

          return Effect.fail(error);
        })
      ).pipe(
        Effect.tap(() => Effect.log(`[SUCCESS] Connected on attempt ${i}`))
      ).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      );

      if (result !== null) {
        return result;
      }
    }

    if (lastError) {
      yield* Effect.fail(lastError);
    }

    return null;
  });

  const networkResult = yield* withRetryContext.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[EXHAUSTED] All retries failed`);
        return "fallback";
      })
    )
  );

  yield* Effect.log(`\n`);

  // Example 4: Multi-layer error transformation
  console.log(`[4] Error transformation between layers:\n`);

  const layer1Error = Effect.gen(function* () {
    yield* Effect.fail(new Error("Raw system error"));
  });

  // Layer 2: Convert to domain error
  const layer2 = layer1Error.pipe(
    Effect.mapError((error) =>
      new DatabaseError({
        query: "SELECT ...",
        parameters: [],
        cause: error instanceof Error ? error : new Error(String(error)),
      })
    )
  );

  // Layer 3: Convert to business error
  const layer3 = layer2.pipe(
    Effect.mapError((dbError) =>
      new BusinessLogicError({
        operation: "fetch-user-profile",
        context: {
          dbError: dbError.query,
        },
        originalError: dbError.cause,
      })
    )
  );

  // Layer 4: Return user-friendly error
  const userFacingError = layer3.pipe(
    Effect.mapError((bizError) => ({
      message: "Unable to load profile",
      code: "PROFILE_LOAD_FAILED",
      originalError: bizError.originalError.message,
    })),
    Effect.catchAll((userError) =>
      Effect.gen(function* () {
        yield* Effect.log(`[USER MESSAGE] ${userError.message}`);
        yield* Effect.log(`[CODE] ${userError.code}`);
        yield* Effect.log(`[DEBUG] ${userError.originalError}`);
        return null;
      })
    )
  );

  yield* userFacingError;

  // Example 5: Error aggregation in concurrent operations
  console.log(`\n[5] Error propagation in concurrent operations:\n`);

  const operation = (id: number, shouldFail: boolean) =>
    Effect.gen(function* () {
      if (shouldFail) {
        yield* Effect.fail(
          new Error(`Operation ${id} failed`)
        );
      }

      return `result-${id}`;
    });

  const concurrent = Effect.gen(function* () {
    const results = yield* Effect.all(
      [
        operation(1, false),
        operation(2, true),
        operation(3, false),
      ],
      { concurrency: 3 }
    ).pipe(
      Effect.catchAll((errors) =>
        Effect.gen(function* () {
          yield* Effect.log(`[CONCURRENT] Caught aggregated errors`);

          // In real code, Cause provides error details
          yield* Effect.log(`[ERROR] Errors encountered during concurrent execution`);

          return [];
        })
      )
    );

    return results;
  });

  yield* concurrent;

  yield* Effect.log(`\n[DEMO] Error propagation complete`);
});

Effect.runPromise(program);
```

---

---

### Error Handling Pattern 3: Custom Error Strategies

**Rule:** Use tagged errors and custom error types to enable type-safe error handling and business-logic-aware recovery strategies.

**Use Cases:** error-handling

**Why:**

Generic errors prevent optimal recovery:

**Problem 1: One-size-fits-all retry**
- Network timeout (transient, retry with backoff)
- Invalid API key (permanent, don't retry)
- Both treated same = wrong recovery

**Problem 2: Lost business intent**
- System error: "Connection refused"
- Business meaning: Unclear
- User message: "Something went wrong" (not helpful)

**Problem 3: Wrong recovery layer**
- Should retry at network layer
- Instead retried at application layer
- Wasted compute, poor user experience

**Problem 4: Silent failures**
- Multiple error types possible
- Generic catch ignores distinctions
- Bug: handled Error A as if it were Error B
- Data corruption, hard to debug

Solutions:

**Tagged errors**:
- `NetworkError`, `ValidationError`, `PermissionError`
- Type system ensures handling
- TypeScript compiler catches missed cases
- Clear intent

**Recovery strategies**:
- `NetworkError` → Retry with exponential backoff
- `ValidationError` → Return user message, no retry
- `PermissionError` → Log security event, no retry
- `TemporaryError` → Retry with jitter

**Business semantics**:
- Error type matches domain concept
- Code reads like domain language
- Easier to maintain
- New developers understand quickly

---

**Good Example:**

This example demonstrates custom error strategies.

```typescript
import { Effect, Data, Schedule } from "effect";

// Custom domain errors
class NetworkError extends Data.TaggedError("NetworkError")<{
  endpoint: string;
  statusCode?: number;
  retryable: boolean;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
  reason: string;
}> {}

class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
  reason: "invalid-token" | "expired-token" | "missing-token";
}> {}

class PermissionError extends Data.TaggedError("PermissionError")<{
  resource: string;
  action: string;
}> {}

class RateLimitError extends Data.TaggedError("RateLimitError")<{
  retryAfter: number; // milliseconds
}> {}

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  resource: string;
  id: string;
}> {}

// Recovery strategy selector
const selectRecoveryStrategy = (
  error: Error
): "retry" | "fallback" | "fail" | "user-message" => {
  if (error instanceof NetworkError && error.retryable) {
    return "retry";
  }

  if (error instanceof RateLimitError) {
    return "retry"; // With backoff
  }

  if (error instanceof ValidationError) {
    return "user-message"; // User can fix
  }

  if (error instanceof NotFoundError) {
    return "fallback"; // Use empty result
  }

  if (
    error instanceof AuthenticationError &&
    error.reason === "expired-token"
  ) {
    return "retry"; // Refresh token
  }

  if (error instanceof PermissionError) {
    return "fail"; // Don't retry
  }

  return "fail"; // Default: don't retry
};

const program = Effect.gen(function* () {
  console.log(
    `\n[CUSTOM ERROR STRATEGIES] Domain-aware error handling\n`
  );

  // Example 1: Type-safe error handling
  console.log(`[1] Type-safe error catching:\n`);

  const operation1 = Effect.fail(
    new ValidationError({
      field: "email",
      reason: "Invalid format",
    })
  );

  const handled1 = operation1.pipe(
    Effect.catchTag("ValidationError", (error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[CAUGHT] Validation error`);
        yield* Effect.log(`  Field: ${error.field}`);
        yield* Effect.log(`  Reason: ${error.reason}\n`);

        return "validation-failed";
      })
    )
  );

  yield* handled1;

  // Example 2: Multiple error types with different recovery
  console.log(`[2] Different recovery per error type:\n`);

  interface ApiResponse {
    status: number;
    body?: unknown;
  }

  const callApi = (shouldFail: "network" | "validation" | "ratelimit" | "success") =>
    Effect.gen(function* () {
      switch (shouldFail) {
        case "network":
          yield* Effect.fail(
            new NetworkError({
              endpoint: "https://api.example.com/data",
              statusCode: 503,
              retryable: true,
            })
          );

        case "validation":
          yield* Effect.fail(
            new ValidationError({
              field: "id",
              reason: "Must be numeric",
            })
          );

        case "ratelimit":
          yield* Effect.fail(
            new RateLimitError({
              retryAfter: 5000,
            })
          );

        case "success":
          return { status: 200, body: { id: 123 } };
      }
    });

  // Test each error type
  const testCases = ["network", "validation", "ratelimit", "success"] as const;

  for (const testCase of testCases) {
    const strategy = yield* callApi(testCase).pipe(
      Effect.catchTag("NetworkError", (error) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[NETWORK] Retryable: ${error.retryable}, Status: ${error.statusCode}`
          );

          return "will-retry";
        })
      ),
      Effect.catchTag("ValidationError", (error) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[VALIDATION] ${error.field}: ${error.reason} (no retry)`
          );

          return "user-must-fix";
        })
      ),
      Effect.catchTag("RateLimitError", (error) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[RATE-LIMIT] Retry after ${error.retryAfter}ms`
          );

          return "retry-with-backoff";
        })
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.log(`[SUCCESS] Got response`);

          return "completed";
        })
      )
    );

    yield* Effect.log(`  Strategy: ${strategy}\n`);
  }

  // Example 3: Custom retry strategy based on error
  console.log(`[3] Error-specific retry strategies:\n`);

  let attemptCount = 0;

  const networkOperation = Effect.gen(function* () {
    attemptCount++;

    yield* Effect.log(`[ATTEMPT] ${attemptCount}`);

    if (attemptCount === 1) {
      yield* Effect.fail(
        new NetworkError({
          endpoint: "api.example.com",
          statusCode: 502,
          retryable: true,
        })
      );
    }

    if (attemptCount === 2) {
      yield* Effect.fail(
        new RateLimitError({
          retryAfter: 100,
        })
      );
    }

    return "success";
  });

  // Type-safe retry with error classification
  let result3: string | null = null;

  for (let i = 0; i < 3; i++) {
    result3 = yield* networkOperation.pipe(
      Effect.catchTag("NetworkError", (error) =>
        Effect.gen(function* () {
          if (error.retryable && i < 2) {
            yield* Effect.log(`[RETRY] Network error is retryable`);

            return null; // Signal to retry
          }

          yield* Effect.log(`[FAIL] Network error not retryable`);

          return Effect.fail(error);
        })
      ),
      Effect.catchTag("RateLimitError", (error) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[BACKOFF] Rate limited, waiting ${error.retryAfter}ms`
          );

          yield* Effect.sleep(`${error.retryAfter} millis`);

          return null; // Signal to retry
        })
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.log(`[ERROR] Unhandled: ${error}`);

          return Effect.fail(error);
        })
      )
    ).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    );

    if (result3 !== null) {
      break;
    }
  }

  yield* Effect.log(`\n[RESULT] ${result3}\n`);

  // Example 4: Error-aware business logic
  console.log(`[4] Business logic with error handling:\n`);

  interface User {
    id: string;
    email: string;
  }

  const loadUser = (id: string): Effect.Effect<User, NetworkError | NotFoundError> =>
    Effect.gen(function* () {
      if (id === "invalid") {
        yield* Effect.fail(
          new NotFoundError({
            resource: "user",
            id,
          })
        );
      }

      if (id === "network-error") {
        yield* Effect.fail(
          new NetworkError({
            endpoint: "/api/users",
            retryable: true,
          })
        );
      }

      return { id, email: `user-${id}@example.com` };
    });

  const processUser = (id: string) =>
    loadUser(id).pipe(
      Effect.catchTag("NotFoundError", (error) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[BUSINESS] User not found: ${error.id}`
          );

          // Return default/empty user
          return { id: "", email: "" };
        })
      ),
      Effect.catchTag("NetworkError", (error) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[BUSINESS] Network error, will retry from cache`
          );

          return { id, email: "cached@example.com" };
        })
      )
    );

  yield* processUser("valid-id");

  yield* processUser("invalid");

  yield* processUser("network-error");

  // Example 5: Discriminated union for exhaustiveness
  console.log(`\n[5] Exhaustiveness checking (compile-time safety):\n`);

  const classifyError = (
    error: NetworkError | ValidationError | AuthenticationError | PermissionError
  ): string => {
    switch (error._tag) {
      case "NetworkError":
        return `network: ${error.statusCode}`;

      case "ValidationError":
        return `validation: ${error.field}`;

      case "AuthenticationError":
        return `auth: ${error.reason}`;

      case "PermissionError":
        return `permission: ${error.action}`;

      // TypeScript ensures all cases covered
      default:
        const _exhaustive: never = error;
        return _exhaustive;
    }
  };

  const testError = new ValidationError({
    field: "age",
    reason: "Must be >= 18",
  });

  const classification = classifyError(testError);

  yield* Effect.log(`[CLASSIFY] ${classification}`);

  // Example 6: Recovery strategy chains
  console.log(`\n[6] Chained recovery strategies:\n`);

  const resilientOperation = Effect.gen(function* () {
    yield* Effect.fail(
      new RateLimitError({
        retryAfter: 50,
      })
    );
  });

  const withRecovery = resilientOperation.pipe(
    Effect.catchTag("RateLimitError", (error) =>
      Effect.gen(function* () {
        yield* Effect.log(
          `[STEP 1] Caught rate limit, waiting ${error.retryAfter}ms`
        );

        yield* Effect.sleep(`${error.retryAfter} millis`);

        // Try again
        return yield* Effect.succeed("recovered");
      })
    ),
    Effect.catchTag("NetworkError", (error) =>
      Effect.gen(function* () {
        if (error.retryable) {
          yield* Effect.log(`[STEP 2] Network error, retrying...`);

          return "retry";
        }

        return yield* Effect.fail(error);
      })
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[STEP 3] Final fallback`);

        return "fallback";
      })
    )
  );

  yield* withRecovery;
});

Effect.runPromise(program);
```

---

---

### Execute Long-Running Apps with Effect.runFork

**Rule:** Use Effect.runFork to launch a long-running application as a manageable, detached fiber.

**Use Cases:** concurrency

**Why:**

Unlike `Effect.runPromise`, which waits for the effect to complete, `Effect.runFork` starts the effect and immediately returns a `Fiber`. This is the ideal way to run an application that is meant to run forever, because it gives you a handle to the process.

The most critical use case for this is enabling graceful shutdown. You can start your application with `runFork`, and then set up listeners for OS signals (like `SIGINT` for Ctrl+C). When a shutdown signal is received, you call `Fiber.interrupt` on the application fiber, which guarantees that all finalizers (like closing database connections) are run before the process exits.

---

**Good Example:**

This example starts a simple "server" that runs forever. We use `runFork` to launch it and then use the returned `Fiber` to shut it down gracefully after 5 seconds.

```typescript
import { Effect, Fiber } from "effect";

// A server that listens for requests forever
const server = Effect.log("Server received a request.").pipe(
  Effect.delay("1 second"),
  Effect.forever
);

Effect.runSync(Effect.log("Starting server..."));

// Launch the server as a detached, top-level fiber
const appFiber = Effect.runFork(server);

// In a real app, you would listen for OS signals.
// Here, we simulate a shutdown signal after 5 seconds.
setTimeout(() => {
  const shutdownProgram = Effect.gen(function* () {
    yield* Effect.log("Shutdown signal received. Interrupting server fiber...");
    // This ensures all cleanup logic within the server effect would run.
    yield* Fiber.interrupt(appFiber);
  });
  Effect.runPromise(shutdownProgram);
}, 5000);
```

---

**Anti-Pattern:**

Using `runFork` when you immediately need the result of the effect. If you call `runFork` and then immediately call `Fiber.join` on the result, you have simply implemented a more complex and less direct version of `runPromise`.

```typescript
import { Effect, Fiber } from "effect";

const someEffect = Effect.succeed(42);

// ❌ WRONG: This is just a complicated way to write `Effect.runPromise(someEffect)`
const resultPromise = Effect.runFork(someEffect).pipe(
  Fiber.join,
  Effect.runPromise
);
```

---

### Export Metrics to Prometheus

**Rule:** Use Effect metrics and expose a /metrics endpoint for Prometheus scraping.

**Use Cases:** observability

**Why:**

Prometheus metrics enable:

1. **Real-time monitoring** - See what's happening now
2. **Historical analysis** - Track trends over time
3. **Alerting** - Get notified of issues
4. **Dashboards** - Visualize system health

---

**Good Example:**

```typescript
import { Effect, Metric, MetricLabel, Duration } from "effect"
import { HttpServerResponse } from "@effect/platform"

// ============================================
// 1. Define application metrics
// ============================================

// Counter - counts events
const httpRequestsTotal = Metric.counter("http_requests_total", {
  description: "Total number of HTTP requests",
})

// Counter with labels
const httpRequestsByStatus = Metric.counter("http_requests_by_status", {
  description: "HTTP requests by status code",
})

// Gauge - current value
const activeConnections = Metric.gauge("active_connections", {
  description: "Number of active connections",
})

// Histogram - distribution of values
const requestDuration = Metric.histogram("http_request_duration_seconds", {
  description: "HTTP request duration in seconds",
  boundaries: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
})

// Summary - percentiles
const responseSizeBytes = Metric.summary("http_response_size_bytes", {
  description: "HTTP response size in bytes",
  maxAge: Duration.minutes(5),
  maxSize: 100,
  quantiles: [0.5, 0.9, 0.99],
})

// ============================================
// 2. Instrument code with metrics
// ============================================

const handleRequest = (path: string, status: number) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    // Increment request counter
    yield* Metric.increment(httpRequestsTotal)

    // Increment with labels
    yield* Metric.increment(
      httpRequestsByStatus.pipe(
        Metric.tagged("status", String(status)),
        Metric.tagged("path", path)
      )
    )

    // Track active connections
    yield* Metric.increment(activeConnections)

    // Simulate work
    yield* Effect.sleep("100 millis")

    // Record duration
    const duration = (Date.now() - startTime) / 1000
    yield* Metric.update(requestDuration, duration)

    // Record response size
    yield* Metric.update(responseSizeBytes, 1024)

    // Decrement active connections
    yield* Metric.decrement(activeConnections)
  })

// ============================================
// 3. Prometheus text format exporter
// ============================================

interface MetricSnapshot {
  name: string
  type: "counter" | "gauge" | "histogram" | "summary"
  help: string
  values: Array<{
    labels: Record<string, string>
    value: number
  }>
  // For histograms
  buckets?: Array<{
    le: number
    count: number
    labels?: Record<string, string>
  }>
  sum?: number
  count?: number
}

const formatPrometheusMetrics = (metrics: MetricSnapshot[]): string => {
  const lines: string[] = []

  for (const metric of metrics) {
    // Help line
    lines.push(`# HELP ${metric.name} ${metric.help}`)
    lines.push(`# TYPE ${metric.name} ${metric.type}`)

    // Values
    for (const { labels, value } of metric.values) {
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",")

      if (labelStr) {
        lines.push(`${metric.name}{${labelStr}} ${value}`)
      } else {
        lines.push(`${metric.name} ${value}`)
      }
    }

    // Histogram buckets
    if (metric.buckets) {
      for (const bucket of metric.buckets) {
        const labelStr = Object.entries(bucket.labels || {})
          .map(([k, v]) => `${k}="${v}"`)
          .concat([`le="${bucket.le}"`])
          .join(",")
        lines.push(`${metric.name}_bucket{${labelStr}} ${bucket.count}`)
      }
      lines.push(`${metric.name}_sum ${metric.sum}`)
      lines.push(`${metric.name}_count ${metric.count}`)
    }

    lines.push("")
  }

  return lines.join("\n")
}

// ============================================
// 4. /metrics endpoint handler
// ============================================

const metricsHandler = Effect.gen(function* () {
  // In real implementation, read from Effect's MetricRegistry
  const metrics: MetricSnapshot[] = [
    {
      name: "http_requests_total",
      type: "counter",
      help: "Total number of HTTP requests",
      values: [{ labels: {}, value: 1234 }],
    },
    {
      name: "http_requests_by_status",
      type: "counter",
      help: "HTTP requests by status code",
      values: [
        { labels: { status: "200", path: "/api/users" }, value: 1000 },
        { labels: { status: "404", path: "/api/users" }, value: 50 },
        { labels: { status: "500", path: "/api/users" }, value: 10 },
      ],
    },
    {
      name: "active_connections",
      type: "gauge",
      help: "Number of active connections",
      values: [{ labels: {}, value: 42 }],
    },
    {
      name: "http_request_duration_seconds",
      type: "histogram",
      help: "HTTP request duration in seconds",
      values: [],
      buckets: [
        { le: 0.01, count: 100 },
        { le: 0.05, count: 500 },
        { le: 0.1, count: 800 },
        { le: 0.25, count: 950 },
        { le: 0.5, count: 990 },
        { le: 1, count: 999 },
        { le: Infinity, count: 1000 },
      ],
      sum: 123.456,
      count: 1000,
    },
  ]

  const body = formatPrometheusMetrics(metrics)

  return HttpServerResponse.text(body, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  })
})

// ============================================
// 5. Example output
// ============================================

/*
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total 1234

# HELP http_requests_by_status HTTP requests by status code
# TYPE http_requests_by_status counter
http_requests_by_status{status="200",path="/api/users"} 1000
http_requests_by_status{status="404",path="/api/users"} 50
http_requests_by_status{status="500",path="/api/users"} 10

# HELP active_connections Number of active connections
# TYPE active_connections gauge
active_connections 42

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.01"} 100
http_request_duration_seconds_bucket{le="0.05"} 500
http_request_duration_seconds_bucket{le="0.1"} 800
http_request_duration_seconds_bucket{le="+Inf"} 1000
http_request_duration_seconds_sum 123.456
http_request_duration_seconds_count 1000
*/
```

---

### Fan Out to Multiple Consumers

**Rule:** Use broadcast or partition to send stream data to multiple consumers.

**Use Cases:** building-data-pipelines

**Why:**

Fan-out enables parallel processing:

1. **Throughput** - Multiple consumers process faster
2. **Specialization** - Different consumers handle different data
3. **Redundancy** - Multiple copies for reliability
4. **Decoupling** - Consumers evolve independently

---

**Good Example:**

```typescript
import { Effect, Stream, Queue, Fiber, Chunk } from "effect"

// ============================================
// 1. Broadcast to all consumers
// ============================================

const broadcastExample = Effect.scoped(
  Effect.gen(function* () {
    const source = Stream.fromIterable([1, 2, 3, 4, 5])

    // Broadcast to 3 consumers - each gets all items
    const [stream1, stream2, stream3] = yield* Stream.broadcast(source, 3)

    // Consumer 1: Log items
    const consumer1 = stream1.pipe(
      Stream.tap((n) => Effect.log(`Consumer 1: ${n}`)),
      Stream.runDrain
    )

    // Consumer 2: Sum items
    const consumer2 = stream2.pipe(
      Stream.runFold(0, (acc, n) => acc + n),
      Effect.tap((sum) => Effect.log(`Consumer 2 sum: ${sum}`))
    )

    // Consumer 3: Collect to array
    const consumer3 = stream3.pipe(
      Stream.runCollect,
      Effect.tap((items) => Effect.log(`Consumer 3 collected: ${Chunk.toReadonlyArray(items)}`))
    )

    // Run all consumers in parallel
    yield* Effect.all([consumer1, consumer2, consumer3], { concurrency: 3 })
  })
)

// ============================================
// 2. Partition by predicate
// ============================================

const partitionExample = Effect.gen(function* () {
  const numbers = Stream.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  // Partition into even and odd
  const [evens, odds] = yield* Stream.partition(
    numbers,
    (n) => n % 2 === 0
  )

  const processEvens = evens.pipe(
    Stream.tap((n) => Effect.log(`Even: ${n}`)),
    Stream.runDrain
  )

  const processOdds = odds.pipe(
    Stream.tap((n) => Effect.log(`Odd: ${n}`)),
    Stream.runDrain
  )

  yield* Effect.all([processEvens, processOdds], { concurrency: 2 })
})

// ============================================
// 3. Partition into multiple buckets
// ============================================

interface Event {
  type: "click" | "scroll" | "submit"
  data: unknown
}

const multiPartitionExample = Effect.gen(function* () {
  const events: Event[] = [
    { type: "click", data: { x: 100 } },
    { type: "scroll", data: { y: 200 } },
    { type: "submit", data: { form: "login" } },
    { type: "click", data: { x: 150 } },
    { type: "scroll", data: { y: 300 } },
  ]

  const source = Stream.fromIterable(events)

  // Group by type using groupByKey
  const grouped = source.pipe(
    Stream.groupByKey((event) => event.type, {
      bufferSize: 16,
    })
  )

  // Process each group
  yield* grouped.pipe(
    Stream.flatMap(([key, stream]) =>
      stream.pipe(
        Stream.tap((event) => Effect.log(`[${key}] Processing: ${JSON.stringify(event.data)}`)),
        Stream.runDrain,
        Stream.fromEffect
      )
    ),
    Stream.runDrain
  )
})

// ============================================
// 4. Fan-out with queues (manual control)
// ============================================

const queueFanOut = Effect.gen(function* () {
  const source = Stream.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  // Create queues for each consumer
  const queue1 = yield* Queue.unbounded<number>()
  const queue2 = yield* Queue.unbounded<number>()
  const queue3 = yield* Queue.unbounded<number>()

  // Distribute items round-robin
  const distributor = source.pipe(
    Stream.zipWithIndex,
    Stream.tap(([item, index]) => {
      const queue = index % 3 === 0 ? queue1 : index % 3 === 1 ? queue2 : queue3
      return Queue.offer(queue, item)
    }),
    Stream.runDrain,
    Effect.tap(() => Effect.all([
      Queue.shutdown(queue1),
      Queue.shutdown(queue2),
      Queue.shutdown(queue3),
    ]))
  )

  // Consumers
  const makeConsumer = (name: string, queue: Queue.Queue<number>) =>
    Stream.fromQueue(queue).pipe(
      Stream.tap((n) => Effect.log(`${name}: ${n}`)),
      Stream.runDrain
    )

  yield* Effect.all([
    distributor,
    makeConsumer("Worker 1", queue1),
    makeConsumer("Worker 2", queue2),
    makeConsumer("Worker 3", queue3),
  ], { concurrency: 4 })
})

// ============================================
// 5. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Broadcast Example ===")
  yield* broadcastExample

  yield* Effect.log("\n=== Partition Example ===")
  yield* partitionExample
})

Effect.runPromise(program)
```

---

### Generate OpenAPI Documentation

**Rule:** Use Schema definitions to automatically generate OpenAPI documentation for your API.

**Use Cases:** building-apis

**Why:**

OpenAPI documentation provides:

1. **Discovery** - Clients know what endpoints exist
2. **Contracts** - Clear request/response shapes
3. **Testing** - Swagger UI for manual testing
4. **Code generation** - Generate client SDKs
5. **Validation** - Schema-first development

---

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

---

### Handle Unexpected Errors by Inspecting the Cause

**Rule:** Handle unexpected errors by inspecting the cause.

**Use Cases:** error-management

**Why:**

The `Cause` object explains _why_ an effect failed. A `Fail` is an expected
error (e.g., `ValidationError`). A `Die` is an unexpected defect (e.g., a
thrown exception). They should be handled differently.

**Good Example:**

```typescript
import { Cause, Effect, Data, Schedule, Duration } from "effect";

// Define domain types
interface DatabaseConfig {
  readonly url: string;
}

interface DatabaseConnection {
  readonly success: true;
}

interface UserData {
  readonly id: string;
  readonly name: string;
}

// Define error types
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly operation: string;
  readonly details: string;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Define database service
class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    sync: () => ({
      // Connect to database with proper error handling
      connect: (
        config: DatabaseConfig
      ): Effect.Effect<DatabaseConnection, DatabaseError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Connecting to database: ${config.url}`);

          if (!config.url) {
            const error = new DatabaseError({
              operation: "connect",
              details: "Missing URL",
            });
            yield* Effect.logError(`Database error: ${JSON.stringify(error)}`);
            return yield* Effect.fail(error);
          }

          // Simulate unexpected errors
          if (config.url === "invalid") {
            yield* Effect.logError("Invalid connection string");
            return yield* Effect.sync(() => {
              throw new Error("Failed to parse connection string");
            });
          }

          if (config.url === "timeout") {
            yield* Effect.logError("Connection timeout");
            return yield* Effect.sync(() => {
              throw new Error("Connection timed out");
            });
          }

          yield* Effect.logInfo("Database connection successful");
          return { success: true };
        }),
    }),
  }
) {}

// Define user service
class UserService extends Effect.Service<UserService>()("UserService", {
  sync: () => ({
    // Parse user data with validation
    parseUser: (input: unknown): Effect.Effect<UserData, ValidationError> =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`Parsing user data: ${JSON.stringify(input)}`);

        try {
          if (typeof input !== "object" || !input) {
            const error = new ValidationError({
              field: "input",
              message: "Invalid input type",
            });
            yield* Effect.logWarning(
              `Validation error: ${JSON.stringify(error)}`
            );
            throw error;
          }

          const data = input as Record<string, unknown>;

          if (typeof data.id !== "string" || typeof data.name !== "string") {
            const error = new ValidationError({
              field: "input",
              message: "Missing required fields",
            });
            yield* Effect.logWarning(
              `Validation error: ${JSON.stringify(error)}`
            );
            throw error;
          }

          const user = { id: data.id, name: data.name };
          yield* Effect.logInfo(
            `Successfully parsed user: ${JSON.stringify(user)}`
          );
          return user;
        } catch (e) {
          if (e instanceof ValidationError) {
            return yield* Effect.fail(e);
          }
          yield* Effect.logError(
            `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
          );
          throw e;
        }
      }),
  }),
}) {}

// Define test service
class TestService extends Effect.Service<TestService>()("TestService", {
  sync: () => {
    // Create instance methods
    const printCause = (
      prefix: string,
      cause: Cause.Cause<unknown>
    ): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`\n=== ${prefix} ===`);

        if (Cause.isDie(cause)) {
          const defect = Cause.failureOption(cause);
          if (defect._tag === "Some") {
            const error = defect.value as Error;
            yield* Effect.logError("Defect (unexpected error)");
            yield* Effect.logError(`Message: ${error.message}`);
            yield* Effect.logError(
              `Stack: ${error.stack?.split("\n")[1]?.trim() ?? "N/A"}`
            );
          }
        } else if (Cause.isFailure(cause)) {
          const error = Cause.failureOption(cause);
          yield* Effect.logWarning("Expected failure");
          yield* Effect.logWarning(`Error: ${JSON.stringify(error)}`);
        }

        // Don't return an Effect inside Effect.gen, just return the value directly
        return void 0;
      });

    const runScenario = <E, A extends { [key: string]: any }>(
      name: string,
      program: Effect.Effect<A, E>
    ): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`\n=== Testing: ${name} ===`);

        type TestError = {
          readonly _tag: "error";
          readonly cause: Cause.Cause<E>;
        };

        const result = yield* Effect.catchAllCause(program, (cause) =>
          Effect.succeed({ _tag: "error" as const, cause } as TestError)
        );

        if ("cause" in result) {
          yield* printCause("Error details", result.cause);
        } else {
          yield* Effect.logInfo(`Success: ${JSON.stringify(result)}`);
        }

        // Don't return an Effect inside Effect.gen, just return the value directly
        return void 0;
      });

    // Return bound methods
    return {
      printCause,
      runScenario,
    };
  },
}) {}

// Create program with proper error handling
const program = Effect.gen(function* () {
  const db = yield* DatabaseService;
  const users = yield* UserService;
  const test = yield* TestService;

  yield* Effect.logInfo("=== Starting Error Handling Tests ===");

  // Test expected database errors
  yield* test.runScenario(
    "Expected database error",
    Effect.gen(function* () {
      const result = yield* Effect.retry(
        db.connect({ url: "" }),
        Schedule.exponential(100)
      ).pipe(
        Effect.timeout(Duration.seconds(5)),
        Effect.catchAll(() => Effect.fail("Connection timeout"))
      );
      return result;
    })
  );

  // Test unexpected connection errors
  yield* test.runScenario(
    "Unexpected connection error",
    Effect.gen(function* () {
      const result = yield* Effect.retry(
        db.connect({ url: "invalid" }),
        Schedule.recurs(3)
      ).pipe(
        Effect.catchAllCause((cause) =>
          Effect.gen(function* () {
            yield* Effect.logError("Failed after 3 retries");
            yield* Effect.logError(Cause.pretty(cause));
            return yield* Effect.fail("Max retries exceeded");
          })
        )
      );
      return result;
    })
  );

  // Test user validation with recovery
  yield* test.runScenario(
    "Valid user data",
    Effect.gen(function* () {
      const result = yield* users
        .parseUser({ id: "1", name: "John" })
        .pipe(
          Effect.orElse(() =>
            Effect.succeed({ id: "default", name: "Default User" })
          )
        );
      return result;
    })
  );

  // Test concurrent error handling with timeout
  yield* test.runScenario(
    "Concurrent operations",
    Effect.gen(function* () {
      const results = yield* Effect.all(
        [
          db.connect({ url: "" }).pipe(
            Effect.timeout(Duration.seconds(1)),
            Effect.catchAll(() => Effect.succeed({ success: true }))
          ),
          users.parseUser({ id: "invalid" }).pipe(
            Effect.timeout(Duration.seconds(1)),
            Effect.catchAll(() =>
              Effect.succeed({ id: "timeout", name: "Timeout" })
            )
          ),
        ],
        { concurrency: 2 }
      );
      return results;
    })
  );

  yield* Effect.logInfo("\n=== Error Handling Tests Complete ===");

  // Don't return an Effect inside Effect.gen, just return the value directly
  return void 0;
});

// Run the program with all services
Effect.runPromise(
  Effect.provide(
    Effect.provide(
      Effect.provide(program, TestService.Default),
      DatabaseService.Default
    ),
    UserService.Default
  )
);
```

**Explanation:**  
By inspecting the `Cause`, you can distinguish between expected and unexpected
failures, logging or escalating as appropriate.

**Anti-Pattern:**

Using a simple `Effect.catchAll` can dangerously conflate expected errors and
unexpected defects, masking critical bugs as recoverable errors.

---

### Handle Unexpected Errors by Inspecting the Cause

**Rule:** Use Cause to inspect, analyze, and handle all possible failure modes of an Effect, including expected errors, defects, and interruptions.

**Use Cases:** core-concepts

**Why:**

Traditional error handling often loses information about _why_ a failure occurred.  
`Cause` preserves the full error context, enabling advanced debugging, error reporting, and robust recovery strategies.

**Good Example:**

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

**Anti-Pattern:**

Catching only expected errors and ignoring defects or interruptions, which can lead to silent failures, missed bugs, and harder debugging.

---

### Implement Backpressure in Pipelines

**Rule:** Use buffering and throttling to handle producers faster than consumers.

**Use Cases:** building-data-pipelines

**Why:**

Backpressure prevents system overload:

1. **Memory safety** - Don't buffer unlimited data
2. **Stability** - Slow consumers don't crash
3. **Fairness** - Distribute load appropriately
4. **Predictability** - Consistent performance

---

**Good Example:**

```typescript
import { Effect, Stream, Schedule, Duration, Queue, Chunk } from "effect"

// ============================================
// 1. Stream with natural backpressure
// ============================================

// Streams have built-in backpressure - consumers pull data
const fastProducer = Stream.fromIterable(Array.from({ length: 1000 }, (_, i) => i))

const slowConsumer = fastProducer.pipe(
  Stream.tap((n) =>
    Effect.gen(function* () {
      yield* Effect.sleep("10 millis")  // Slow processing
      yield* Effect.log(`Processed: ${n}`)
    })
  ),
  Stream.runDrain
)

// Producer automatically slows down to match consumer

// ============================================
// 2. Explicit buffer with drop strategy
// ============================================

const bufferedStream = (source: Stream.Stream<number>) =>
  source.pipe(
    // Buffer up to 100 items, drop oldest when full
    Stream.buffer({ capacity: 100, strategy: "dropping" })
  )

// ============================================
// 3. Throttling - limit rate
// ============================================

const throttledStream = (source: Stream.Stream<number>) =>
  source.pipe(
    // Process at most 10 items per second
    Stream.throttle({
      cost: () => 1,
      units: 10,
      duration: "1 second",
      strategy: "enforce",
    })
  )

// ============================================
// 4. Debounce - wait for quiet period
// ============================================

const debouncedStream = (source: Stream.Stream<number>) =>
  source.pipe(
    // Wait 100ms of no new items before emitting
    Stream.debounce("100 millis")
  )

// ============================================
// 5. Bounded queue for producer-consumer
// ============================================

const boundedQueueExample = Effect.gen(function* () {
  // Create bounded queue - blocks producer when full
  const queue = yield* Queue.bounded<number>(10)

  // Fast producer
  const producer = Effect.gen(function* () {
    for (let i = 0; i < 100; i++) {
      yield* Queue.offer(queue, i)
      yield* Effect.log(`Produced: ${i}`)
    }
    yield* Queue.shutdown(queue)
  })

  // Slow consumer
  const consumer = Effect.gen(function* () {
    let count = 0
    while (true) {
      const item = yield* Queue.take(queue).pipe(
        Effect.catchTag("QueueShutdown", () => Effect.fail("done" as const))
      )
      if (item === "done") break
      yield* Effect.sleep("50 millis")  // Slow processing
      yield* Effect.log(`Consumed: ${item}`)
      count++
    }
    return count
  }).pipe(Effect.catchAll(() => Effect.succeed(0)))

  // Run both - producer will block when queue is full
  yield* Effect.all([producer, consumer], { concurrency: 2 })
})

// ============================================
// 6. Sliding window - keep most recent
// ============================================

const slidingWindowStream = (source: Stream.Stream<number>) =>
  source.pipe(
    Stream.sliding(5),  // Keep last 5 items
    Stream.map((window) => ({
      items: window,
      average: Chunk.reduce(window, 0, (a, b) => a + b) / Chunk.size(window),
    }))
  )

// ============================================
// 7. Run example
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Backpressure Demo ===")

  // Throttled stream
  const throttled = Stream.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).pipe(
    Stream.tap((n) => Effect.log(`Emitting: ${n}`)),
    Stream.throttle({
      cost: () => 1,
      units: 2,
      duration: "1 second",
      strategy: "enforce",
    }),
    Stream.tap((n) => Effect.log(`After throttle: ${n}`)),
    Stream.runDrain
  )

  yield* throttled
})

Effect.runPromise(program)
```

---

### Implement Dead Letter Queues

**Rule:** Capture failed items with context for debugging and retry instead of losing them.

**Use Cases:** building-data-pipelines

**Why:**

Dead letter queues provide:

1. **Resilience** - Pipeline continues despite failures
2. **Visibility** - See what's failing and why
3. **Recovery** - Reprocess failed items later
4. **Debugging** - Error context for investigation

---

**Good Example:**

```typescript
import { Effect, Stream, Queue, Chunk, Ref, Data } from "effect"

// ============================================
// 1. Define DLQ types
// ============================================

interface DeadLetterItem<T> {
  readonly item: T
  readonly error: unknown
  readonly timestamp: Date
  readonly attempts: number
  readonly context: Record<string, unknown>
}

interface ProcessingResult<T, R> {
  readonly _tag: "Success" | "Failure"
}

class Success<T, R> implements ProcessingResult<T, R> {
  readonly _tag = "Success"
  constructor(
    readonly item: T,
    readonly result: R
  ) {}
}

class Failure<T> implements ProcessingResult<T, never> {
  readonly _tag = "Failure"
  constructor(
    readonly item: T,
    readonly error: unknown,
    readonly attempts: number
  ) {}
}

// ============================================
// 2. Create a DLQ service
// ============================================

const makeDLQ = <T>() =>
  Effect.gen(function* () {
    const queue = yield* Queue.unbounded<DeadLetterItem<T>>()
    const countRef = yield* Ref.make(0)

    return {
      send: (item: T, error: unknown, attempts: number, context: Record<string, unknown> = {}) =>
        Effect.gen(function* () {
          yield* Queue.offer(queue, {
            item,
            error,
            timestamp: new Date(),
            attempts,
            context,
          })
          yield* Ref.update(countRef, (n) => n + 1)
          yield* Effect.log(`DLQ: Added item (total: ${(yield* Ref.get(countRef))})`)
        }),

      getAll: () =>
        Effect.gen(function* () {
          const items: DeadLetterItem<T>[] = []
          while (!(yield* Queue.isEmpty(queue))) {
            const item = yield* Queue.poll(queue)
            if (item._tag === "Some") {
              items.push(item.value)
            }
          }
          return items
        }),

      count: () => Ref.get(countRef),

      queue,
    }
  })

// ============================================
// 3. Process with DLQ
// ============================================

interface Order {
  id: string
  amount: number
}

const processOrder = (order: Order): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    // Simulate random failures
    if (order.amount < 0) {
      return yield* Effect.fail(new Error("Invalid amount"))
    }
    if (order.id === "fail") {
      return yield* Effect.fail(new Error("Processing failed"))
    }
    yield* Effect.sleep("10 millis")
    return `Processed order ${order.id}: $${order.amount}`
  })

const processWithRetryAndDLQ = (
  orders: Stream.Stream<Order>,
  maxRetries: number = 3
) =>
  Effect.gen(function* () {
    const dlq = yield* makeDLQ<Order>()

    const results = yield* orders.pipe(
      Stream.mapEffect((order) =>
        Effect.gen(function* () {
          let lastError: unknown
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result = yield* processOrder(order).pipe(
              Effect.map((r) => new Success(order, r)),
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.log(`Attempt ${attempt}/${maxRetries} failed for ${order.id}`)
                  lastError = error
                  if (attempt < maxRetries) {
                    yield* Effect.sleep("100 millis")  // Backoff
                  }
                  return new Failure(order, error, attempt) as ProcessingResult<Order, string>
                })
              )
            )

            if (result._tag === "Success") {
              return result
            }
          }

          // All retries exhausted - send to DLQ
          yield* dlq.send(order, lastError, maxRetries, { orderId: order.id })
          return new Failure(order, lastError, maxRetries)
        })
      ),
      Stream.runCollect
    )

    const successful = Chunk.filter(results, (r): r is Success<Order, string> => r._tag === "Success")
    const failed = Chunk.filter(results, (r): r is Failure<Order> => r._tag === "Failure")

    yield* Effect.log(`\nResults: ${Chunk.size(successful)} success, ${Chunk.size(failed)} failed`)

    // Get DLQ contents
    const dlqItems = yield* dlq.getAll()
    if (dlqItems.length > 0) {
      yield* Effect.log("\n=== Dead Letter Queue Contents ===")
      for (const item of dlqItems) {
        yield* Effect.log(
          `- Order ${item.item.id}: ${item.error} (attempts: ${item.attempts})`
        )
      }
    }

    return { successful, failed, dlqItems }
  })

// ============================================
// 4. DLQ reprocessing
// ============================================

const reprocessDLQ = <T>(
  dlqItems: DeadLetterItem<T>[],
  processor: (item: T) => Effect.Effect<void, Error>
) =>
  Effect.gen(function* () {
    yield* Effect.log(`Reprocessing ${dlqItems.length} DLQ items...`)

    for (const dlqItem of dlqItems) {
      const result = yield* processor(dlqItem.item).pipe(
        Effect.map(() => "success" as const),
        Effect.catchAll(() => Effect.succeed("failed" as const))
      )

      yield* Effect.log(
        `Reprocess ${JSON.stringify(dlqItem.item)}: ${result}`
      )
    }
  })

// ============================================
// 5. Run example
// ============================================

const program = Effect.gen(function* () {
  const orders: Order[] = [
    { id: "1", amount: 100 },
    { id: "2", amount: 200 },
    { id: "fail", amount: 50 },    // Will fail all retries
    { id: "3", amount: 300 },
    { id: "4", amount: -10 },       // Invalid amount
    { id: "5", amount: 150 },
  ]

  yield* Effect.log("=== Processing Orders ===\n")
  const { dlqItems } = yield* processWithRetryAndDLQ(Stream.fromIterable(orders), 3)

  if (dlqItems.length > 0) {
    yield* Effect.log("\n=== Attempting DLQ Reprocessing ===")
    yield* reprocessDLQ(dlqItems, (order) =>
      Effect.gen(function* () {
        yield* Effect.log(`Manual fix for order ${order.id}`)
      })
    )
  }
})

Effect.runPromise(program)
```

---

### Implement Distributed Tracing

**Rule:** Propagate trace context across service boundaries to correlate requests.

**Use Cases:** observability

**Why:**

Distributed tracing shows the complete request journey:

1. **End-to-end visibility** - See entire request flow
2. **Latency analysis** - Find slow services
3. **Error correlation** - Link errors across services
4. **Dependency mapping** - Understand service relationships

---

**Good Example:**

```typescript
import { Effect, Context, Layer } from "effect"
import { HttpClient, HttpClientRequest, HttpServerRequest, HttpServerResponse } from "@effect/platform"

// ============================================
// 1. Define trace context
// ============================================

interface TraceContext {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId?: string
  readonly sampled: boolean
}

class CurrentTrace extends Context.Tag("CurrentTrace")<
  CurrentTrace,
  TraceContext
>() {}

// W3C Trace Context header names
const TRACEPARENT_HEADER = "traceparent"
const TRACESTATE_HEADER = "tracestate"

// ============================================
// 2. Generate trace IDs
// ============================================

const generateTraceId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

const generateSpanId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

// ============================================
// 3. Parse and format trace context
// ============================================

const parseTraceparent = (header: string): TraceContext | null => {
  // Format: 00-traceId-spanId-flags
  const parts = header.split("-")
  if (parts.length !== 4) return null

  return {
    traceId: parts[1],
    spanId: generateSpanId(),  // New span for this service
    parentSpanId: parts[2],
    sampled: parts[3] === "01",
  }
}

const formatTraceparent = (ctx: TraceContext): string =>
  `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? "01" : "00"}`

// ============================================
// 4. Extract trace from incoming request
// ============================================

const extractTraceContext = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  const traceparent = request.headers[TRACEPARENT_HEADER]

  if (traceparent) {
    const parsed = parseTraceparent(traceparent)
    if (parsed) {
      yield* Effect.log("Extracted trace context").pipe(
        Effect.annotateLogs({
          traceId: parsed.traceId,
          parentSpanId: parsed.parentSpanId,
        })
      )
      return parsed
    }
  }

  // No incoming trace - start a new one
  const newTrace: TraceContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sampled: Math.random() < 0.1,  // 10% sampling
  }

  yield* Effect.log("Started new trace").pipe(
    Effect.annotateLogs({ traceId: newTrace.traceId })
  )

  return newTrace
})

// ============================================
// 5. Propagate trace to outgoing requests
// ============================================

const makeTracedHttpClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient
  const trace = yield* CurrentTrace

  return {
    get: (url: string) =>
      Effect.gen(function* () {
        // Create child span for outgoing request
        const childSpan: TraceContext = {
          traceId: trace.traceId,
          spanId: generateSpanId(),
          parentSpanId: trace.spanId,
          sampled: trace.sampled,
        }

        yield* Effect.log("Making traced HTTP request").pipe(
          Effect.annotateLogs({
            traceId: childSpan.traceId,
            spanId: childSpan.spanId,
            url,
          })
        )

        const request = HttpClientRequest.get(url).pipe(
          HttpClientRequest.setHeader(
            TRACEPARENT_HEADER,
            formatTraceparent(childSpan)
          )
        )

        return yield* baseClient.execute(request)
      }),
  }
})

// ============================================
// 6. Tracing middleware for HTTP server
// ============================================

const withTracing = <A, E, R>(
  handler: Effect.Effect<A, E, R | CurrentTrace>
): Effect.Effect<A, E, R | HttpServerRequest.HttpServerRequest> =>
  Effect.gen(function* () {
    const traceContext = yield* extractTraceContext

    return yield* handler.pipe(
      Effect.provideService(CurrentTrace, traceContext),
      Effect.withLogSpan(`request-${traceContext.spanId}`),
      Effect.annotateLogs({
        "trace.id": traceContext.traceId,
        "span.id": traceContext.spanId,
        "parent.span.id": traceContext.parentSpanId ?? "none",
      })
    )
  })

// ============================================
// 7. Example: Service A calls Service B
// ============================================

// Service B handler
const serviceBHandler = withTracing(
  Effect.gen(function* () {
    const trace = yield* CurrentTrace
    yield* Effect.log("Service B processing request")

    // Simulate work
    yield* Effect.sleep("50 millis")

    return HttpServerResponse.json({
      message: "Hello from Service B",
      traceId: trace.traceId,
    })
  })
)

// Service A handler (calls Service B)
const serviceAHandler = withTracing(
  Effect.gen(function* () {
    const trace = yield* CurrentTrace
    yield* Effect.log("Service A processing request")

    // Call Service B with trace propagation
    const tracedClient = yield* makeTracedHttpClient
    const response = yield* tracedClient.get("http://service-b/api/data")

    yield* Effect.log("Service A received response from B")

    return HttpServerResponse.json({
      message: "Hello from Service A",
      traceId: trace.traceId,
    })
  })
)

// ============================================
// 8. Run and observe
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Distributed Tracing Demo ===")

  // Simulate incoming request with trace
  const incomingTrace: TraceContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sampled: true,
  }

  yield* Effect.log("Processing traced request").pipe(
    Effect.provideService(CurrentTrace, incomingTrace),
    Effect.annotateLogs({
      "trace.id": incomingTrace.traceId,
      "span.id": incomingTrace.spanId,
    })
  )
})

Effect.runPromise(program)
```

---

### Implement Graceful Shutdown for Your Application

**Rule:** Use Effect.runFork and OS signal listeners to implement graceful shutdown for long-running applications.

**Use Cases:** concurrency

**Why:**

When a server process is terminated, you need to ensure that it cleans up properly. This includes closing database connections, finishing in-flight requests, and releasing file handles. Failing to do so can lead to resource leaks or data corruption.

Effect's structured concurrency makes this robust and easy. When a fiber is interrupted, Effect guarantees that it will run all finalizers registered within that fiber's scope, in the reverse order they were acquired.

By launching your app with `runFork`, you get a `Fiber` that represents the entire application. Triggering `Fiber.interrupt` on this top-level fiber initiates a clean, orderly shutdown sequence for all its resources.

---

**Good Example:**

This example creates a server with a "scoped" database connection. It uses `runFork` to start the server and sets up a `SIGINT` handler to interrupt the server fiber, which in turn guarantees the database finalizer is called.

```typescript
import { Effect, Layer, Fiber, Context, Scope } from "effect";
import * as http from "http";

// 1. A service with a finalizer for cleanup
class Database extends Effect.Service<Database>()("Database", {
  effect: Effect.gen(function* () {
    yield* Effect.log("Acquiring DB connection");
    return {
      query: () => Effect.succeed("data"),
    };
  }),
}) {}

// 2. The main server logic
const server = Effect.gen(function* () {
  const db = yield* Database;

  // Create server with proper error handling
  const httpServer = yield* Effect.sync(() => {
    const server = http.createServer((_req, res) => {
      Effect.runFork(
        Effect.provide(
          db.query().pipe(Effect.map((data) => res.end(data))),
          Database.Default
        )
      );
    });
    return server;
  });

  // Add a finalizer to close the server
  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      httpServer.close();
      yield* Effect.log("Server closed");
    })
  );

  // Start server with error handling
  yield* Effect.async<void, Error>((resume) => {
    httpServer.once("error", (err: Error) => {
      resume(Effect.fail(new Error(`Failed to start server: ${err.message}`)));
    });

    httpServer.listen(3456, () => {
      resume(Effect.succeed(void 0));
    });
  });

  yield* Effect.log("Server started on port 3456. Press Ctrl+C to exit.");

  // For testing purposes, we'll run for a short time instead of forever
  yield* Effect.sleep("2 seconds");
  yield* Effect.log("Shutting down gracefully...");
});

// 3. Provide the layer and launch with runFork
const app = Effect.provide(server.pipe(Effect.scoped), Database.Default);

// 4. Run the app and handle shutdown
Effect.runPromise(app).catch((error) => {
  Effect.runSync(Effect.logError("Application error: " + error));
  process.exit(1);
});
```

---

**Anti-Pattern:**

Letting the Node.js process exit without proper cleanup. If you run a long-running effect with `Effect.runPromise` or don't handle OS signals, pressing Ctrl+C will terminate the process abruptly, and none of your `Effect` finalizers will have a chance to run.

```typescript
import { Effect } from "effect";
import { app } from "./somewhere"; // From previous example

// ❌ WRONG: This will run the server, but Ctrl+C will kill it instantly.
// The database connection finalizer will NOT be called.
Effect.runPromise(app);
```

---

### Integrate Effect Tracing with OpenTelemetry

**Rule:** Integrate Effect.withSpan with OpenTelemetry to export traces and visualize request flows across services.

**Use Cases:** observability

**Why:**

OpenTelemetry is the industry standard for distributed tracing.  
By integrating Effect's spans with OpenTelemetry, you gain deep visibility into request flows, performance bottlenecks, and dependencies—across all your services and infrastructure.

**Good Example:**

```typescript
import { Effect } from "effect";
// Pseudocode: Replace with actual OpenTelemetry integration for your stack
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

// Wrap an Effect.withSpan to export to OpenTelemetry
function withOtelSpan<T>(
  name: string,
  effect: Effect.Effect<unknown, T, unknown>
) {
  return Effect.gen(function* () {
    const otelSpan = trace.getTracer("default").startSpan(name);
    try {
      const result = yield* effect;
      otelSpan.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      otelSpan.end();
    }
  });
}

// Usage
const program = withOtelSpan(
  "fetchUser",
  Effect.sync(() => {
    // ...fetch user logic
    return { id: 1, name: "Alice" };
  })
);
```

**Explanation:**

- Start an OpenTelemetry span when entering an Effectful operation.
- Set status and attributes as needed.
- End the span when the operation completes or fails.
- This enables full distributed tracing and visualization in your observability platform.

**Anti-Pattern:**

Using Effect.withSpan without exporting to OpenTelemetry, or lacking distributed tracing, which limits your ability to diagnose and visualize complex request flows.

---

### Manage Hierarchical Resources

**Rule:** Use nested Scopes to manage resources with parent-child dependencies.

**Use Cases:** resource-management

**Why:**

Resources often have dependencies:

1. **Database → Connections → Transactions** - Transaction needs connection
2. **Server → Routes → Handlers** - Handler needs server context
3. **File → Reader → Parser** - Parser needs reader

Release order matters: children before parents.

---

**Good Example:**

```typescript
import { Effect, Scope, Exit } from "effect"

// ============================================
// 1. Define hierarchical resources
// ============================================

interface Database {
  readonly name: string
  readonly createConnection: () => Effect.Effect<Connection, never, Scope.Scope>
}

interface Connection {
  readonly id: string
  readonly database: string
  readonly beginTransaction: () => Effect.Effect<Transaction, never, Scope.Scope>
}

interface Transaction {
  readonly id: string
  readonly connectionId: string
  readonly execute: (sql: string) => Effect.Effect<void>
}

// ============================================
// 2. Create resources with proper lifecycle
// ============================================

const makeDatabase = (name: string): Effect.Effect<Database, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      yield* Effect.log(`Opening database: ${name}`)
      
      const db: Database = {
        name,
        createConnection: () => makeConnection(name),
      }
      
      return db
    }),
    (db) => Effect.log(`Closing database: ${db.name}`)
  )

const makeConnection = (dbName: string): Effect.Effect<Connection, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const id = `conn-${crypto.randomUUID().slice(0, 8)}`
      yield* Effect.log(`  Opening connection: ${id} to ${dbName}`)
      
      const conn: Connection = {
        id,
        database: dbName,
        beginTransaction: () => makeTransaction(id),
      }
      
      return conn
    }),
    (conn) => Effect.log(`  Closing connection: ${conn.id}`)
  )

const makeTransaction = (connId: string): Effect.Effect<Transaction, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const id = `tx-${crypto.randomUUID().slice(0, 8)}`
      yield* Effect.log(`    Beginning transaction: ${id}`)
      
      const tx: Transaction = {
        id,
        connectionId: connId,
        execute: (sql) => Effect.log(`      [${id}] ${sql}`),
      }
      
      return tx
    }),
    (tx) => Effect.log(`    Committing transaction: ${tx.id}`)
  )

// ============================================
// 3. Use hierarchical resources
// ============================================

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Effect.log("=== Starting hierarchical resource demo ===\n")
    
    // Level 1: Database
    const db = yield* makeDatabase("myapp")
    
    // Level 2: Connection (child of database)
    const conn = yield* db.createConnection()
    
    // Level 3: Transaction (child of connection)
    const tx = yield* conn.beginTransaction()
    
    // Use the transaction
    yield* tx.execute("INSERT INTO users (name) VALUES ('Alice')")
    yield* tx.execute("INSERT INTO users (name) VALUES ('Bob')")
    
    yield* Effect.log("\n=== Work complete, releasing resources ===\n")
    
    // Resources released in reverse order:
    // 1. Transaction committed
    // 2. Connection closed
    // 3. Database closed
  })
)

Effect.runPromise(program)

// ============================================
// 4. Multiple children at same level
// ============================================

const multipleConnections = Effect.scoped(
  Effect.gen(function* () {
    const db = yield* makeDatabase("myapp")
    
    // Create multiple connections
    const conn1 = yield* db.createConnection()
    const conn2 = yield* db.createConnection()
    
    // Each connection can have transactions
    const tx1 = yield* conn1.beginTransaction()
    const tx2 = yield* conn2.beginTransaction()
    
    // Use both transactions
    yield* Effect.all([
      tx1.execute("UPDATE table1 SET x = 1"),
      tx2.execute("UPDATE table2 SET y = 2"),
    ])
    
    // All released in proper order
  })
)
```

---

### Manage Resource Lifecycles with Scope

**Rule:** Use Scope for fine-grained, manual control over resource lifecycles and cleanup guarantees.

**Use Cases:** concurrency

**Why:**

`Scope` is the fundamental building block for all resource management in Effect. While higher-level APIs like `Layer.scoped` and `Stream` are often sufficient, understanding `Scope` is key to advanced use cases.

A `Scope` guarantees that any finalizers added to it will be executed when the scope is closed, regardless of whether the associated computation succeeds, fails, or is interrupted. This provides a rock-solid guarantee against resource leaks.

This is especially critical in concurrent applications. When a parent fiber is interrupted, it closes its scope, which in turn automatically interrupts all its child fibers and runs all their finalizers in a structured, predictable order.

---

**Good Example:**

This example shows how to acquire a resource (like a file handle), use it, and have `Scope` guarantee its release.

```typescript
import { Effect, Scope } from "effect";

// Simulate acquiring and releasing a resource
const acquireFile = Effect.log("File opened").pipe(
  Effect.as({ write: (data: string) => Effect.log(`Wrote: ${data}`) })
);
const releaseFile = Effect.log("File closed.");

// Create a "scoped" effect. This effect, when used, will acquire the
// resource and register its release action with the current scope.
const scopedFile = Effect.acquireRelease(acquireFile, () => releaseFile);

// The main program that uses the scoped resource
const program = Effect.gen(function* () {
  // Effect.scoped "uses" the resource. It runs the acquire effect,
  // provides the resource to the inner effect, and ensures the
  // release effect is run when this block completes.
  const file = yield* Effect.scoped(scopedFile);

  yield* file.write("hello");
  yield* file.write("world");

  // The file will be automatically closed here.
});

Effect.runPromise(program);
/*
Output:
File opened
Wrote: hello
Wrote: world
File closed
*/
```

---

**Anti-Pattern:**

Manual resource management without the guarantees of `Scope`. This is brittle because if an error occurs after the resource is acquired but before it's released, the release logic is never executed.

```typescript
import { Effect } from "effect";
import { acquireFile, releaseFile } from "./somewhere"; // From previous example

// ❌ WRONG: This will leak the resource if an error happens.
const program = Effect.gen(function* () {
  const file = yield* acquireFile;

  // If this operation fails...
  yield* Effect.fail("Something went wrong!");

  // ...this line will never be reached, and the file will never be closed.
  yield* releaseFile;
});
```

---

### Manage Resources Safely in a Pipeline

**Rule:** Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

**Use Cases:** building-data-pipelines

**Why:**

What happens if a pipeline processing a file fails halfway through? In a naive implementation, the file handle might be left open, leading to a resource leak. Over time, these leaks can exhaust system resources and crash your application.

`Stream.acquireRelease` is Effect's robust solution to this problem. It's built on `Scope`, Effect's fundamental resource-management tool.

1.  **Guaranteed Cleanup**: You provide an `acquire` effect to open the resource and a `release` effect to close it. Effect guarantees that the `release` effect will be called when the stream terminates, for _any_ reason: successful completion, a processing failure, or even external interruption.
2.  **Declarative and Co-located**: The logic for a resource's entire lifecycle—acquisition, usage (the stream itself), and release—is defined in one place. This makes the code easier to understand and reason about compared to manual `try/finally` blocks.
3.  **Prevents Resource Leaks**: It is the idiomatic way to build truly resilient pipelines that do not leak resources, which is essential for long-running, production-grade applications.
4.  **Composability**: The resulting stream is just a normal `Stream`, which can be composed with any other stream operators.

---

**Good Example:**

This example creates and writes to a temporary file. `Stream.acquireRelease` is used to acquire a readable stream from that file. The pipeline then processes the file but is designed to fail partway through. The logs demonstrate that the `release` effect (which deletes the file) is still executed, preventing any resource leaks.

```typescript
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { NodeFileSystem } from "@effect/platform-node";
import * as path from "node:path";

interface ProcessError {
  readonly _tag: "ProcessError";
  readonly message: string;
}

const ProcessError = (message: string): ProcessError => ({
  _tag: "ProcessError",
  message,
});

interface FileServiceType {
  readonly createTempFile: () => Effect.Effect<{ filePath: string }, never>;
  readonly cleanup: (filePath: string) => Effect.Effect<void, never>;
  readonly readFile: (filePath: string) => Effect.Effect<string, never>;
}

export class FileService extends Effect.Service<FileService>()("FileService", {
  sync: () => {
    const filePath = path.join(__dirname, "temp-resource.txt");
    return {
      createTempFile: () => Effect.succeed({ filePath }),
      cleanup: (filePath: string) =>
        Effect.log("✅ Resource cleaned up successfully"),
      readFile: (filePath: string) =>
        Effect.succeed("data 1\ndata 2\nFAIL\ndata 4"),
    };
  },
}) {}

// Process a single line
const processLine = (line: string): Effect.Effect<void, ProcessError> =>
  line === "FAIL"
    ? Effect.fail(ProcessError("Failed to process line"))
    : Effect.log(`Processed: ${line}`);

// Create and process the file with proper resource management
const program = Effect.gen(function* () {
  yield* Effect.log("=== Stream Resource Management Demo ===");
  yield* Effect.log(
    "This demonstrates proper resource cleanup even when errors occur"
  );

  const fileService = yield* FileService;
  const { filePath } = yield* fileService.createTempFile();

  // Use scoped to ensure cleanup happens even on failure
  yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.addFinalizer(() => fileService.cleanup(filePath));

      const content = yield* fileService.readFile(filePath);
      const lines = content.split("\n");

      // Process each line, continuing even if some fail
      for (const line of lines) {
        yield* processLine(line).pipe(
          Effect.catchAll((error) =>
            Effect.log(`⚠️  Skipped line due to error: ${error.message}`)
          )
        );
      }

      yield* Effect.log(
        "✅ Processing completed with proper resource management"
      );
    })
  );
});

// Run the program with FileService layer
Effect.runPromise(Effect.provide(program, FileService.Default)).catch(
  (error) => {
    Effect.runSync(Effect.logError("Unexpected error: " + error));
  }
);
```

**Anti-Pattern:**

The anti-pattern is to manage resources manually outside the stream's context. This is brittle and almost always leads to resource leaks when errors occur.

```typescript
import { Effect, Stream } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import * as path from "node:path";

const program = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, "temp-resource-bad.txt");

  // 1. Resource acquired manually before the stream
  yield* fs.writeFileString(filePath, "data 1\ndata 2");
  const readable = fs.createReadStream(filePath);
  yield* Effect.log("Resource acquired manually.");

  const stream = Stream.fromReadable(() => readable).pipe(
    Stream.decodeText("utf-8"),
    Stream.splitLines,
    // This stream will fail, causing the run to reject.
    Stream.map(() => {
      throw new Error("Something went wrong!");
    })
  );

  // 2. Stream is executed
  yield* Stream.runDrain(stream);

  // 3. This release logic is NEVER reached if the stream fails.
  yield* fs.remove(filePath);
  yield* Effect.log("Resource released manually. (This will not be logged)");
});

Effect.runPromiseExit(program).then((exit) => {
  if (exit._tag === "Failure") {
    console.log("\nPipeline failed. The temp file was NOT deleted.");
  }
});
```

In this anti-pattern, the `fs.remove` call is unreachable because the `Stream.runDrain` effect fails, causing the `gen` block to terminate immediately. The temporary file is leaked onto the disk. `Stream.acquireRelease` solves this problem entirely.

---

### Manually Manage Lifecycles with `Scope`

**Rule:** Use `Effect.scope` and `Scope.addFinalizer` for fine-grained control over resource cleanup.

**Use Cases:** resource-management

**Why:**

While `Effect.acquireRelease` and `Layer.scoped` are sufficient for most use cases, sometimes you need more control. This pattern is essential when:

1.  A single logical operation acquires multiple resources that need independent cleanup.
2.  You are building a custom, complex `Layer` that orchestrates several dependent resources.
3.  You need to understand the fundamental mechanism that powers all of Effect's resource management.

By interacting with `Scope` directly, you gain precise, imperative-style control over resource cleanup within Effect's declarative, functional framework. Finalizers added to a scope are guaranteed to run in Last-In-First-Out (LIFO) order when the scope is closed.

**Good Example:**

```typescript
import { Effect, Console } from "effect";

// Mocking a complex file operation
const openFile = (path: string) =>
  Effect.succeed({ path, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Opened ${f.path}`))
  );
const createTempFile = (path: string) =>
  Effect.succeed({ path: `${path}.tmp`, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Created temp file ${f.path}`))
  );
const closeFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Closed ${file.path}`));
const deleteFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Deleted ${file.path}`));

// This program acquires two resources (a file and a temp file)
// and ensures both are cleaned up correctly using acquireRelease.
const program = Effect.gen(function* () {
  const file = yield* Effect.acquireRelease(openFile("data.csv"), (f) =>
    closeFile(f)
  );

  const tempFile = yield* Effect.acquireRelease(
    createTempFile("data.csv"),
    (f) => deleteFile(f)
  );

  yield* Effect.log("...writing data from temp file to main file...");
});

// Run the program with a scope
Effect.runPromise(Effect.scoped(program));

/*
Output (note the LIFO cleanup order):
Opened data.csv
Created temp file data.csv.tmp
...writing data from temp file to main file...
Deleted data.csv.tmp
Closed data.csv
*/
```

**Explanation:**
`Effect.scope` creates a new `Scope` and provides it to the `program`. Inside `program`, we access this `Scope` and use `addFinalizer` to register cleanup actions immediately after acquiring each resource. When `Effect.scope` finishes executing `program`, it closes the scope, which in turn executes all registered finalizers in the reverse order of their addition.

**Anti-Pattern:**

Attempting to manage multiple, interdependent resource cleanups using nested `try...finally` blocks. This leads to a "pyramid of doom," is difficult to read, and remains unsafe in the face of interruptions.

```typescript
// ANTI-PATTERN: Nested, unsafe, and hard to read
async function complexOperation() {
  const file = await openFilePromise(); // acquire 1
  try {
    const tempFile = await createTempFilePromise(); // acquire 2
    try {
      await doWorkPromise(file, tempFile); // use
    } finally {
      // This block may not run on interruption!
      await deleteFilePromise(tempFile); // release 2
    }
  } finally {
    // This block may also not run on interruption!
    await closeFilePromise(file); // release 1
  }
}
```

---

### Optional Pattern 2: Optional Chaining and Composition

**Rule:** Use Option combinators (map, flatMap, ap) to compose operations that may fail, creating readable and maintainable pipelines.

**Use Cases:** value-handling

**Why:**

Nested option handling becomes complex:

**Problem 1: Pyramid of doom**
```typescript
if (user !== null) {
  if (user.profile !== null) {
    if (user.profile.preferences !== null) {
      if (user.profile.preferences.theme !== null) {
        // Finally do thing
      }
    }
  }
}
```

**Problem 2: Repeated null checks**
- Every step needs its own check
- Code duplicates
- Hard to refactor
- Bugs easy to introduce

**Problem 3: Logic scattered**
- Transformation logic mixed with null checks
- Hard to understand intent
- Error-prone

Solutions:

**Option chaining**:
- `None` flows through automatically
- Transform only if `Some`
- No intermediate checks needed

**Composition**:
- Combine functions cleanly
- Separate concerns
- Reusable pieces

**Fallbacks**:
- `orElse()` for recovery
- Chain multiple alternatives
- Graceful degradation

---

**Good Example:**

This example demonstrates optional chaining patterns.

```typescript
import { Effect, Option, pipe } from "effect";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Profile {
  bio: string;
  website?: string;
  avatar?: string;
}

interface Settings {
  theme: "light" | "dark";
  notifications: boolean;
  language: string;
}

const program = Effect.gen(function* () {
  console.log(`\n[OPTIONAL CHAINING] Composing Option operations\n`);

  // Example 1: Simple chain with map
  console.log(`[1] Chaining transformations with map():\n`);

  const userId: Option.Option<string> = Option.some("user-42");

  const userDisplayId = Option.map(userId, (id) => `User#${id}`);

  const idMessage = Option.match(userDisplayId, {
    onSome: (display) => display,
    onNone: () => "No user ID",
  });

  yield* Effect.log(`[CHAIN 1] ${idMessage}`);

  // Chained maps
  const email: Option.Option<string> = Option.some("alice@example.com");

  const emailParts = pipe(
    email,
    Option.map((e) => e.toLowerCase()),
    Option.map((e) => e.split("@")),
    Option.map((parts) => parts[0]) // username
  );

  const username = Option.getOrElse(emailParts, () => "unknown");

  yield* Effect.log(`[USERNAME] ${username}\n`);

  // Example 2: FlatMap for chaining operations that return Option
  console.log(`[2] Chaining operations with flatMap():\n`);

  const findUser = (id: string): Option.Option<User> =>
    id === "user-42"
      ? Option.some({
          id,
          name: "Alice",
          email: "alice@example.com",
        })
      : Option.none();

  const getProfile = (userId: string): Option.Option<Profile> =>
    userId === "user-42"
      ? Option.some({
          bio: "Software engineer",
          website: "alice.dev",
          avatar: "https://example.com/avatar.jpg",
        })
      : Option.none();

  const userProfile = pipe(
    Option.some("user-42"),
    Option.flatMap((id) => findUser(id)),
    Option.flatMap((user) => getProfile(user.id))
  );

  const profileInfo = Option.match(userProfile, {
    onSome: (profile) => `Bio: ${profile.bio}, Website: ${profile.website}`,
    onNone: () => "Profile not found",
  });

  yield* Effect.log(`[PROFILE] ${profileInfo}\n`);

  // Example 3: Complex pipeline
  console.log(`[3] Complex pipeline (user → profile → settings → theme):\n`);

  const getSettings = (userId: string): Option.Option<Settings> =>
    userId === "user-42"
      ? Option.some({
          theme: "dark",
          notifications: true,
          language: "en",
        })
      : Option.none();

  const userTheme = pipe(
    Option.some("user-42"),
    Option.flatMap((id) => findUser(id)),
    Option.flatMap((user) => getSettings(user.id)),
    Option.map((settings) => settings.theme)
  );

  const theme = Option.getOrElse(userTheme, () => "light");

  yield* Effect.log(`[THEME] ${theme}`);

  // Even if any step is None, result is None
  const invalidUserTheme = pipe(
    Option.some("invalid-user"),
    Option.flatMap((id) => findUser(id)),
    Option.flatMap((user) => getSettings(user.id)),
    Option.map((settings) => settings.theme)
  );

  const invalidTheme = Option.getOrElse(invalidUserTheme, () => "light");

  yield* Effect.log(`[DEFAULT THEME] ${invalidTheme}\n`);

  // Example 4: Apply (ap) for combining independent Options
  console.log(`[4] Combining values with ap():\n`);

  const firstName: Option.Option<string> = Option.some("John");
  const lastName: Option.Option<string> = Option.some("Doe");

  // Create a function wrapped in Option
  const combineNames = (first: string) => (last: string) =>
    `${first} ${last}`;

  const fullName = pipe(
    Option.some(combineNames),
    Option.ap(firstName),
    Option.ap(lastName)
  );

  const name = Option.getOrElse(fullName, () => "Unknown");

  yield* Effect.log(`[COMBINED] ${name}`);

  // If any is None
  const noLastName: Option.Option<string> = Option.none();

  const incompleteName = pipe(
    Option.some(combineNames),
    Option.ap(firstName),
    Option.ap(noLastName)
  );

  const incompleteFull = Option.getOrElse(incompleteName, () => "Incomplete");

  yield* Effect.log(`[INCOMPLETE] ${incompleteFull}\n`);

  // Example 5: Traverse for mapping over collections
  console.log(`[5] Working with collections (traverse):\n`);

  const userIds: string[] = ["user-42", "user-99", "user-1"];

  // Try to load all users
  const allUsers = Option.all(
    userIds.map((id) => findUser(id))
  );

  const usersMessage = Option.match(allUsers, {
    onSome: (users) => `Loaded ${users.length} users`,
    onNone: () => "Some users not found",
  });

  yield* Effect.log(`[TRAVERSE] ${usersMessage}\n`);

  // Example 6: Or/recovery with multiple options
  console.log(`[6] Fallback chains with orElse():\n`);

  const getPrimaryEmail = (): Option.Option<string> => Option.none();
  const getSecondaryEmail = (): Option.Option<string> =>
    Option.some("backup@example.com");
  const getTertiaryEmail = (): Option.Option<string> =>
    Option.some("tertiary@example.com");

  const email1 = pipe(
    getPrimaryEmail(),
    Option.orElse(() => getSecondaryEmail()),
    Option.orElse(() => getTertiaryEmail())
  );

  const contactEmail = Option.getOrElse(email1, () => "no-email@example.com");

  yield* Effect.log(`[FALLBACK] Using email: ${contactEmail}\n`);

  // Example 7: Filtering options
  console.log(`[7] Filtering with predicates:\n`);

  const age: Option.Option<number> = Option.some(25);

  const canVote = pipe(
    age,
    Option.filter((a) => a >= 18)
  );

  const voteStatus = Option.match(canVote, {
    onSome: () => "Can vote",
    onNone: () => "Too young to vote",
  });

  yield* Effect.log(`[FILTER] ${voteStatus}`);

  // Multiple filters in chain
  const score: Option.Option<number> = Option.some(85);

  const isAGrade = pipe(
    score,
    Option.filter((s) => s >= 80),
    Option.filter((s) => s < 90)
  );

  const grade = Option.match(isAGrade, {
    onSome: () => "Grade A",
    onNone: () => "Not in A range",
  });

  yield* Effect.log(`[GRADES] ${grade}\n`);

  // Example 8: Practical: Database query chain
  console.log(`[8] Real-world: Database record chain:\n`);

  const getRecord = (id: string): Option.Option<{ data: string; nested: { value: number } }> =>
    id === "rec-1"
      ? Option.some({
          data: "content",
          nested: { value: 42 },
        })
      : Option.none();

  const recordValue = pipe(
    Option.some("rec-1"),
    Option.flatMap((id) => getRecord(id)),
    Option.map((rec) => rec.nested),
    Option.map((nested) => nested.value),
    Option.map((value) => value * 2)
  );

  const finalValue = Option.getOrElse(recordValue, () => 0);

  yield* Effect.log(`[VALUE] ${finalValue}`);

  // Missing record
  const missingValue = pipe(
    Option.some("rec-999"),
    Option.flatMap((id) => getRecord(id)),
    Option.map((rec) => rec.nested),
    Option.map((nested) => nested.value),
    Option.map((value) => value * 2)
  );

  const defaultValue = Option.getOrElse(missingValue, () => 0);

  yield* Effect.log(`[DEFAULT] ${defaultValue}\n`);

  // Example 9: Conditional chaining
  console.log(`[9] Conditional paths:\n`);

  const loadUserWithFallback = (id: string) =>
    pipe(
      findUser(id),
      Option.flatMap((user) =>
        // Only get premium features if user exists
        user.name.includes("Alice")
          ? Option.some({ ...user, isPremium: true })
          : Option.none()
      ),
      Option.orElse(() =>
        // Fallback: return basic user
        findUser(id)
      )
    );

  const result1 = loadUserWithFallback("user-42");
  const result2 = loadUserWithFallback("user-99");

  yield* Effect.log(
    `[CONDITIONAL 1] ${Option.match(result1, { onSome: (u) => `${u.name}`, onNone: () => "Not found" })}`
  );

  yield* Effect.log(
    `[CONDITIONAL 2] ${Option.match(result2, { onSome: (u) => `${u.name}`, onNone: () => "Not found" })}`
  );
});

Effect.runPromise(program);
```

---

---

### Organize Layers into Composable Modules

**Rule:** Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

**Use Cases:** testing

**Why:**

As an application grows, a flat composition strategy where all services are merged into one giant layer becomes unwieldy and hard to reason about. The Composable Modules pattern solves this by introducing structure.

This approach creates a clean, scalable, and highly testable architecture where complexity is contained within each module. The top-level composition becomes a clear, high-level diagram of your application's architecture, and feature modules can be tested in isolation by providing them with a mocked `BaseLayer`.

---

**Good Example:**

This example shows a `BaseLayer` with a `Logger`, a `UserModule` that uses the `Logger`, and a final `AppLayer` that wires them together.

### 1. The Base Infrastructure Layer

```typescript
// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()("App/Core/Logger", {
  sync: () => ({
    log: (msg: string) => Effect.log(`[LOG] ${msg}`),
  }),
}) {}

// src/features/User/UserRepository.ts
export class UserRepository extends Effect.Service<UserRepository>()(
  "App/User/UserRepository",
  {
    // Define implementation that uses Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding user ${id}`);
            return { id, name: `User ${id}` };
          }),
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default],
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(Effect.provide(program, UserRepository.Default));

const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Program result: ${JSON.stringify(result)}`);
  return result;
});

Effect.runPromise(Effect.provide(programWithLogging, UserRepository.Default));
```

### 2. The Feature Module Layer

```typescript
// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()("App/Core/Logger", {
  sync: () => ({
    log: (msg: string) => Effect.sync(() => console.log(`[LOG] ${msg}`)),
  }),
}) {}

// src/features/User/UserRepository.ts
export class UserRepository extends Effect.Service<UserRepository>()(
  "App/User/UserRepository",
  {
    // Define implementation that uses Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding user ${id}`);
            return { id, name: `User ${id}` };
          }),
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default],
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(Effect.provide(program, UserRepository.Default)).then(
  console.log
);
```

### 3. The Final Application Composition

```typescript
// src/layers.ts
import { Layer } from "effect";
import { BaseLayer } from "./core";
import { UserModuleLive } from "./features/User";
// import { ProductModuleLive } from "./features/Product";

const AllModules = Layer.mergeAll(UserModuleLive /*, ProductModuleLive */);

// Provide the BaseLayer to all modules at once, creating a self-contained AppLayer.
export const AppLayer = Layer.provide(AllModules, BaseLayer);
```

---

**Anti-Pattern:**

A flat composition strategy for a large application. While simple at first, it quickly becomes difficult to manage.

```typescript
// ❌ This file becomes huge and hard to navigate in a large project.
const AppLayer = Layer.mergeAll(
  LoggerLive,
  ConfigLive,
  DatabaseLive,
  TracerLive,
  UserServiceLive,
  UserRepositoryLive,
  ProductServiceLive,
  ProductRepositoryLive,
  BillingServiceLive
  // ...and 50 other services
);
```

---

### Platform Pattern 6: Advanced FileSystem Operations

**Rule:** Use advanced file system patterns to implement efficient, reliable file operations with proper error handling and resource cleanup.

**Use Cases:** platform

**Why:**

Simple file operations cause problems at scale:

**Problem 1: Corrupted files**
- Write config file
- Server crashes mid-write
- File is partial/corrupted
- Application fails to start
- Production outage

**Problem 2: Large file handling**
- Load 10GB file into memory
- Server runs out of memory
- Everything crashes
- Now handling outages instead of serving

**Problem 3: Directory synchronization**
- Copy directory tree
- Process interrupted
- Some files copied, some not
- Directory in inconsistent state
- Hard to recover

**Problem 4: Inefficient updates**
- Update 10,000 files one by one
- Each file system call is slow
- Takes hours
- Meanwhile, users can't access data

**Problem 5: File locking**
- Process A reads file
- Process B writes file
- Process A gets partially written file
- Data corruption

Solutions:

**Atomic writes**:
- Write to temporary file
- Fsync (guarantee on disk)
- Atomic rename
- No corruption even on crash

**Streaming**:
- Process large files in chunks
- Keep memory constant
- Efficient for any file size

**Bulk operations**:
- Batch multiple operations
- Reduce system calls
- Faster overall completion

**File watching**:
- React to changes
- Avoid polling
- Real-time responsiveness

---

**Good Example:**

This example demonstrates advanced file system patterns.

```typescript
import { Effect, Stream, Ref, FileSystem } from "@effect/platform";
import * as Path from "node:path";
import * as FS from "node:fs";
import * as PromiseFS from "node:fs/promises";

const program = Effect.gen(function* () {
  console.log(`\n[ADVANCED FILESYSTEM] Complex file operations\n`);

  // Example 1: Atomic file write with temporary file
  console.log(`[1] Atomic write (crash-safe):\n`);

  const atomicWrite = (
    filePath: string,
    content: string
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const tempPath = `${filePath}.tmp`;

      try {
        // Step 1: Write to temporary file
        yield* Effect.promise(() =>
          PromiseFS.writeFile(tempPath, content, "utf-8")
        );

        yield* Effect.log(`[WRITE] Wrote to temporary file`);

        // Step 2: Ensure on disk (fsync)
        yield* Effect.promise(() =>
          PromiseFS.writeFile(tempPath, content, "utf-8")
        );

        yield* Effect.log(`[FSYNC] Data on disk`);

        // Step 3: Atomic rename
        yield* Effect.promise(() =>
          PromiseFS.rename(tempPath, filePath)
        );

        yield* Effect.log(`[RENAME] Atomic rename complete`);
      } catch (error) {
        // Cleanup on failure
        try {
          yield* Effect.promise(() => PromiseFS.unlink(tempPath));
        } catch {
          // Ignore cleanup errors
        }

        yield* Effect.fail(error);
      }
    });

  // Test atomic write
  const testFile = "./test-file.txt";

  yield* atomicWrite(testFile, "Important configuration\n");

  // Verify file
  const content = yield* Effect.promise(() =>
    PromiseFS.readFile(testFile, "utf-8")
  );

  yield* Effect.log(`[READ] Got: "${content.trim()}"\n`);

  // Example 2: Streaming read (memory efficient)
  console.log(`[2] Streaming read (handle large files):\n`);

  const streamingRead = (filePath: string) =>
    Effect.gen(function* () {
      let byteCount = 0;
      let lineCount = 0;

      const readStream = FS.createReadStream(filePath, {
        encoding: "utf-8",
        highWaterMark: 64 * 1024, // 64KB chunks
      });

      yield* Effect.log(`[STREAM] Starting read with 64KB chunks`);

      const processLine = (line: string) =>
        Effect.gen(function* () {
          byteCount += line.length;
          lineCount++;

          if (lineCount <= 2 || lineCount % 1000 === 0) {
            yield* Effect.log(
              `[LINE ${lineCount}] Length: ${line.length} bytes`
            );
          }
        });

      // In real code, process all lines
      yield* processLine("line 1");
      yield* processLine("line 2");

      yield* Effect.log(
        `[TOTAL] Read ${lineCount} lines, ${byteCount} bytes`
      );
    });

  yield* streamingRead(testFile);

  // Example 3: Recursive directory listing
  console.log(`\n[3] Recursive directory traversal:\n`);

  const recursiveList = (
    dir: string,
    maxDepth: number = 3
  ): Effect.Effect<Array<{ path: string; type: "file" | "dir" }>> =>
    Effect.gen(function* () {
      const results: Array<{ path: string; type: "file" | "dir" }> = [];

      const traverse = (currentDir: string, depth: number) =>
        Effect.gen(function* () {
          if (depth > maxDepth) {
            return;
          }

          const entries = yield* Effect.promise(() =>
            PromiseFS.readdir(currentDir, { withFileTypes: true })
          );

          for (const entry of entries) {
            const fullPath = Path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
              results.push({ path: fullPath, type: "dir" });

              yield* traverse(fullPath, depth + 1);
            } else {
              results.push({ path: fullPath, type: "file" });
            }
          }
        });

      yield* traverse(dir, 0);

      return results;
    });

  // List files in current directory
  const entries = yield* recursiveList(".", 1);

  yield* Effect.log(
    `[ENTRIES] Found ${entries.length} items:`
  );

  for (const entry of entries.slice(0, 5)) {
    const type = entry.type === "file" ? "📄" : "📁";

    yield* Effect.log(`  ${type} ${entry.path}`);
  }

  // Example 4: Bulk file operations
  console.log(`\n[4] Bulk operations (efficient batching):\n`);

  const bulkCreate = (files: Array<{ name: string; content: string }>) =>
    Effect.gen(function* () {
      yield* Effect.log(`[BULK] Creating ${files.length} files...`);

      for (const file of files) {
        yield* atomicWrite(`./${file.name}`, file.content);
      }

      yield* Effect.log(`[BULK] Created ${files.length} files`);
    });

  const testFiles = [
    { name: "config1.txt", content: "Config 1" },
    { name: "config2.txt", content: "Config 2" },
    { name: "config3.txt", content: "Config 3" },
  ];

  yield* bulkCreate(testFiles);

  // Example 5: File watching (detect changes)
  console.log(`\n[5] File watching (react to changes):\n`);

  const watchFile = (filePath: string) =>
    Effect.gen(function* () {
      yield* Effect.log(`[WATCH] Starting to watch: ${filePath}`);

      let changeCount = 0;

      // Simulate file watcher
      const checkForChanges = () =>
        Effect.gen(function* () {
          for (let i = 0; i < 3; i++) {
            yield* Effect.sleep("100 millis");

            // Check file modification time
            const stat = yield* Effect.promise(() =>
              PromiseFS.stat(filePath)
            );

            // In real implementation, compare previous mtime
            if (i === 1) {
              changeCount++;

              yield* Effect.log(
                `[CHANGE] File modified (${stat.size} bytes)`
              );
            }
          }
        });

      yield* checkForChanges();

      yield* Effect.log(`[WATCH] Detected ${changeCount} changes`);
    });

  yield* watchFile(testFile);

  // Example 6: Safe concurrent file operations
  console.log(`\n[6] Concurrent file operations with safety:\n`);

  const lockFile = (filePath: string) =>
    Effect.gen(function* () {
      const lockPath = `${filePath}.lock`;

      // Acquire lock
      yield* atomicWrite(lockPath, "locked");

      yield* Effect.log(`[LOCK] Acquired: ${lockPath}`);

      try {
        // Critical section
        yield* Effect.sleep("50 millis");

        yield* Effect.log(`[CRITICAL] Operating on locked file`);
      } finally {
        // Release lock
        yield* Effect.promise(() =>
          PromiseFS.unlink(lockPath)
        );

        yield* Effect.log(`[UNLOCK] Released: ${lockPath}`);
      }
    });

  yield* lockFile(testFile);

  // Example 7: Efficient file copying
  console.log(`\n[7] Efficient file copying:\n`);

  const efficientCopy = (
    source: string,
    destination: string
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const stat = yield* Effect.promise(() =>
        PromiseFS.stat(source)
      );

      yield* Effect.log(
        `[COPY] Reading ${(stat.size / 1024).toFixed(2)}KB`
      );

      const content = yield* Effect.promise(() =>
        PromiseFS.readFile(source)
      );

      yield* atomicWrite(destination, content.toString());

      yield* Effect.log(`[COPY] Complete: ${destination}`);
    });

  yield* efficientCopy(testFile, "./test-file-copy.txt");

  // Cleanup
  yield* Effect.log(`\n[CLEANUP] Removing test files`);

  for (const name of [testFile, "test-file-copy.txt", ...testFiles.map((f) => `./${f.name}`)]) {
    try {
      yield* Effect.promise(() =>
        PromiseFS.unlink(name)
      );

      yield* Effect.log(`[REMOVED] ${name}`);
    } catch {
      // File doesn't exist, that's ok
    }
  }
});

Effect.runPromise(program);
```

---

---

### Poll for Status Until a Task Completes

**Rule:** Use Effect.race to run a repeating polling task that is automatically interrupted when a main task completes.

**Use Cases:** concurrency

**Why:**

This pattern elegantly solves the problem of coordinating a long-running job with a status-checking mechanism. Instead of manually managing fibers with `fork` and `interrupt`, you can declare this relationship with `Effect.race`.

The key is that the polling effect is set up to repeat on a schedule that runs indefinitely (or for a very long time). Because it never completes on its own, it can never "win" the race. The main task is the only one that can complete successfully. When it does, it wins the race, and Effect's structured concurrency guarantees that the losing effect (the poller) is safely interrupted.

This creates a self-contained, declarative, and leak-free unit of work.

---

**Good Example:**

This program simulates a long-running data processing job. While it's running, a separate effect polls for its status every 2 seconds. When the main job finishes after 10 seconds, the polling automatically stops.

```typescript
import { Effect, Schedule, Duration } from "effect";

// The main task that takes a long time to complete
const longRunningJob = Effect.log("Data processing complete!").pipe(
  Effect.delay(Duration.seconds(10))
);

// The polling task that checks the status
const pollStatus = Effect.log("Polling for job status: In Progress...");

// A schedule that repeats the polling task every 2 seconds, forever
const pollingSchedule = Schedule.fixed(Duration.seconds(2));

// The complete polling effect that will run indefinitely until interrupted
const repeatingPoller = pollStatus.pipe(Effect.repeat(pollingSchedule));

// Race the main job against the poller.
// The longRunningJob will win after 10 seconds, interrupting the poller.
const program = Effect.race(longRunningJob, repeatingPoller);

Effect.runPromise(program);
/*
Output:
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Data processing complete!
*/
```

---

**Anti-Pattern:**

Manually managing the lifecycle of the polling fiber. This is more verbose, imperative, and error-prone. You have to remember to interrupt the polling fiber in all possible exit paths (success, failure, etc.), which `Effect.race` does for you automatically.

```typescript
import { Effect, Fiber } from "effect";
import { longRunningJob, repeatingPoller } from "./somewhere";

// ❌ WRONG: Manual fiber management is complex.
const program = Effect.gen(function* () {
  // Manually fork the poller into the background
  const pollerFiber = yield* Effect.fork(repeatingPoller);

  try {
    // Run the main job
    const result = yield* longRunningJob;
    return result;
  } finally {
    // You MUST remember to interrupt the poller when you're done.
    yield* Fiber.interrupt(pollerFiber);
  }
});
```

---

### Profile Effect Applications

**Rule:** Use Effect's timing features and Node.js profilers to find performance bottlenecks.

**Use Cases:** tooling-and-debugging

**Why:**

Profiling helps you:

1. **Find bottlenecks** - What's slow?
2. **Optimize hot paths** - Focus effort where it matters
3. **Track regressions** - Catch slowdowns early
4. **Right-size resources** - Don't over-provision

---

**Good Example:**

### 1. Basic Timing with Spans

```typescript
import { Effect, Duration } from "effect"

// ============================================
// 1. Time individual operations
// ============================================

const timeOperation = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    const result = yield* effect

    const duration = Date.now() - startTime
    yield* Effect.log(`${name}: ${duration}ms`)

    return result
  })

// Usage
const program = Effect.gen(function* () {
  yield* timeOperation("database-query", queryDatabase())
  yield* timeOperation("api-call", callExternalApi())
  yield* timeOperation("processing", processData())
})

// ============================================
// 2. Use withLogSpan for nested timing
// ============================================

const timedProgram = Effect.gen(function* () {
  yield* Effect.log("Starting")

  yield* fetchUsers().pipe(Effect.withLogSpan("fetchUsers"))

  yield* processUsers().pipe(Effect.withLogSpan("processUsers"))

  yield* saveResults().pipe(Effect.withLogSpan("saveResults"))

  yield* Effect.log("Complete")
}).pipe(Effect.withLogSpan("total"))

// ============================================
// 3. Collect timing metrics
// ============================================

import { Metric } from "effect"

const operationDuration = Metric.histogram("operation_duration_ms", {
  description: "Operation duration in milliseconds",
  boundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
})

const profiledEffect = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    const result = yield* effect

    const duration = Date.now() - startTime
    yield* Metric.update(
      operationDuration.pipe(Metric.tagged("operation", name)),
      duration
    )

    return result
  })

// ============================================
// 4. Memory profiling
// ============================================

const logMemoryUsage = Effect.sync(() => {
  const usage = process.memoryUsage()
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
  }
})

const withMemoryLogging = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const before = yield* logMemoryUsage
    yield* Effect.log(`Memory before: ${JSON.stringify(before)}MB`)

    const result = yield* effect

    const after = yield* logMemoryUsage
    yield* Effect.log(`Memory after: ${JSON.stringify(after)}MB`)
    yield* Effect.log(`Memory delta: ${after.heapUsed - before.heapUsed}MB`)

    return result
  })

// ============================================
// 5. CPU profiling with Node.js inspector
// ============================================

const withCpuProfile = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    // Start CPU profiler (requires --inspect flag)
    const inspector = yield* Effect.try(() => {
      const { Session } = require("inspector")
      const session = new Session()
      session.connect()
      return session
    })

    yield* Effect.try(() => {
      inspector.post("Profiler.enable")
      inspector.post("Profiler.start")
    })

    const result = yield* effect

    // Stop and save profile
    yield* Effect.async<void>((resume) => {
      inspector.post("Profiler.stop", (err: Error, { profile }: any) => {
        if (err) {
          resume(Effect.fail(err))
        } else {
          const fs = require("fs")
          fs.writeFileSync(
            `${name}-${Date.now()}.cpuprofile`,
            JSON.stringify(profile)
          )
          resume(Effect.void)
        }
      })
    })

    return result
  })

// ============================================
// 6. Benchmark specific operations
// ============================================

const benchmark = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>,
  iterations: number = 100
) =>
  Effect.gen(function* () {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      yield* effect
      times.push(performance.now() - start)
    }

    const sorted = times.sort((a, b) => a - b)
    const stats = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      mean: times.reduce((a, b) => a + b, 0) / times.length,
    }

    yield* Effect.log(`Benchmark "${name}" (${iterations} iterations):`)
    yield* Effect.log(`  Min:    ${stats.min.toFixed(2)}ms`)
    yield* Effect.log(`  Max:    ${stats.max.toFixed(2)}ms`)
    yield* Effect.log(`  Mean:   ${stats.mean.toFixed(2)}ms`)
    yield* Effect.log(`  Median: ${stats.median.toFixed(2)}ms`)
    yield* Effect.log(`  P95:    ${stats.p95.toFixed(2)}ms`)
    yield* Effect.log(`  P99:    ${stats.p99.toFixed(2)}ms`)

    return stats
  })

// ============================================
// 7. Profile concurrent operations
// ============================================

const profileConcurrency = Effect.gen(function* () {
  const items = Array.from({ length: 100 }, (_, i) => i)

  // Sequential
  yield* benchmark(
    "sequential",
    Effect.forEach(items, (i) => Effect.succeed(i * 2), { concurrency: 1 }),
    10
  )

  // Parallel unbounded
  yield* benchmark(
    "parallel-unbounded",
    Effect.forEach(items, (i) => Effect.succeed(i * 2), {
      concurrency: "unbounded",
    }),
    10
  )

  // Parallel limited
  yield* benchmark(
    "parallel-10",
    Effect.forEach(items, (i) => Effect.succeed(i * 2), { concurrency: 10 }),
    10
  )
})

// ============================================
// 8. Run profiling
// ============================================

const profilingSession = Effect.gen(function* () {
  yield* Effect.log("=== Profiling Session ===")

  yield* withMemoryLogging(
    benchmark("my-operation", someEffect, 50)
  )

  yield* profileConcurrency
})

Effect.runPromise(profilingSession)
```

---

### Property-Based Testing with Effect

**Rule:** Use property-based testing to find edge cases your example-based tests miss.

**Use Cases:** testing

**Why:**

Property-based testing finds bugs that example tests miss:

1. **Edge cases** - Empty arrays, negative numbers, unicode
2. **Invariants** - Properties that should always hold
3. **Shrinking** - Minimal failing examples
4. **Coverage** - Many inputs from one test

---

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Option, Either, Schema } from "effect"
import * as fc from "fast-check"

describe("Property-Based Testing with Effect", () => {
  // ============================================
  // 1. Test pure function properties
  // ============================================

  it("should satisfy array reverse properties", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        // Reversing twice returns original
        const reversed = arr.slice().reverse()
        const doubleReversed = reversed.slice().reverse()

        return JSON.stringify(arr) === JSON.stringify(doubleReversed)
      })
    )
  })

  it("should satisfy sort idempotence", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = arr.slice().sort((a, b) => a - b)
        const sortedTwice = sorted.slice().sort((a, b) => a - b)

        return JSON.stringify(sorted) === JSON.stringify(sortedTwice)
      })
    )
  })

  // ============================================
  // 2. Test Effect operations
  // ============================================

  it("should map then flatMap equals flatMap with mapping", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer(), async (n) => {
        const f = (x: number) => x * 2
        const g = (x: number) => Effect.succeed(x + 1)

        // map then flatMap
        const result1 = await Effect.runPromise(
          Effect.succeed(n).pipe(
            Effect.map(f),
            Effect.flatMap(g)
          )
        )

        // flatMap with mapping inside
        const result2 = await Effect.runPromise(
          Effect.succeed(n).pipe(
            Effect.flatMap((x) => g(f(x)))
          )
        )

        return result1 === result2
      })
    )
  })

  // ============================================
  // 3. Test Option properties
  // ============================================

  it("should satisfy Option map identity", () => {
    fc.assert(
      fc.property(fc.option(fc.integer(), { nil: undefined }), (maybeN) => {
        const option = maybeN === undefined ? Option.none() : Option.some(maybeN)

        // Mapping identity function returns same Option
        const mapped = Option.map(option, (x) => x)

        return Option.getOrElse(option, () => -1) ===
               Option.getOrElse(mapped, () => -1)
      })
    )
  })

  // ============================================
  // 4. Test Schema encode/decode roundtrip
  // ============================================

  it("should roundtrip through Schema", async () => {
    const UserSchema = Schema.Struct({
      name: Schema.String,
      age: Schema.Number.pipe(Schema.int(), Schema.positive()),
    })

    const userArbitrary = fc.record({
      name: fc.string({ minLength: 1 }),
      age: fc.integer({ min: 1, max: 120 }),
    })

    await fc.assert(
      fc.asyncProperty(userArbitrary, async (user) => {
        const encode = Schema.encode(UserSchema)
        const decode = Schema.decode(UserSchema)

        // Encode then decode should return equivalent value
        const encoded = await Effect.runPromise(encode(user))
        const decoded = await Effect.runPromise(decode(encoded))

        return decoded.name === user.name && decoded.age === user.age
      })
    )
  })

  // ============================================
  // 5. Test error handling properties
  // ============================================

  it("should recover from any error", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        async (errorMsg, fallback) => {
          const failing = Effect.fail(new Error(errorMsg))

          const result = await Effect.runPromise(
            failing.pipe(
              Effect.catchAll(() => Effect.succeed(fallback))
            )
          )

          return result === fallback
        }
      )
    )
  })

  // ============================================
  // 6. Custom generators for domain types
  // ============================================

  interface Email {
    readonly _tag: "Email"
    readonly value: string
  }

  const emailArbitrary = fc.emailAddress().map((value): Email => ({
    _tag: "Email",
    value,
  }))

  interface UserId {
    readonly _tag: "UserId"
    readonly value: string
  }

  const userIdArbitrary = fc.uuid().map((value): UserId => ({
    _tag: "UserId",
    value,
  }))

  it("should handle domain types correctly", () => {
    fc.assert(
      fc.property(emailArbitrary, userIdArbitrary, (email, userId) => {
        // Test your domain functions with generated domain types
        return email.value.includes("@") && userId.value.length > 0
      })
    )
  })

  // ============================================
  // 7. Test algebraic properties
  // ============================================

  it("should satisfy monoid properties for string concat", () => {
    const empty = ""
    const concat = (a: string, b: string) => a + b

    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        // Identity: empty + a = a = a + empty
        const leftIdentity = concat(empty, a) === a
        const rightIdentity = concat(a, empty) === a

        // Associativity: (a + b) + c = a + (b + c)
        const associative = concat(concat(a, b), c) === concat(a, concat(b, c))

        return leftIdentity && rightIdentity && associative
      })
    )
  })

  // ============================================
  // 8. Test with constraints
  // ============================================

  it("should handle positive numbers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        (a, b) => {
          // Division of positives is positive
          const result = a / b
          return result > 0
        }
      )
    )
  })
})
```

---

### Run Background Tasks with Effect.fork

**Rule:** Use Effect.fork to start a non-blocking background process and manage its lifecycle via its Fiber.

**Use Cases:** concurrency

**Why:**

Unlike `Effect.all` or a direct `yield*`, which wait for the computation to complete, `Effect.fork` is a "fire and forget" operation. It starts the effect on a new, concurrent fiber and immediately returns control to the parent fiber.

This is essential for managing long-running background tasks like:

- A web server listener.
- A message queue consumer.
- A periodic cache cleanup job.

The returned `Fiber` object is your remote control for the background task. You can use `Fiber.interrupt` to safely stop it (ensuring all its finalizers are run) or `Fiber.join` to wait for it to complete at some later point.

---

**Good Example:**

This program forks a background process that logs a "tick" every second. The main process does its own work for 5 seconds and then explicitly interrupts the background logger before exiting.

```typescript
import { Effect, Fiber } from "effect";

// A long-running effect that logs a message every second, forever
// Effect.forever creates an infinite loop that repeats the effect
// This simulates a background service like a health check or monitoring task
const tickingClock = Effect.log("tick").pipe(
  Effect.delay("1 second"), // Wait 1 second between ticks
  Effect.forever // Repeat indefinitely - this creates an infinite effect
);

const program = Effect.gen(function* () {
  yield* Effect.log("Forking the ticking clock into the background.");

  // Start the clock, but don't wait for it.
  // Effect.fork creates a new fiber that runs concurrently with the main program
  // The main fiber continues immediately without waiting for the background task
  // This is essential for non-blocking background operations
  const clockFiber = yield* Effect.fork(tickingClock);

  // At this point, we have two fibers running:
  // 1. The main fiber (this program)
  // 2. The background clock fiber (ticking every second)

  yield* Effect.log("Main process is now doing other work for 5 seconds...");

  // Simulate the main application doing work
  // While this sleep happens, the background clock continues ticking
  // This demonstrates true concurrency - both fibers run simultaneously
  yield* Effect.sleep("5 seconds");

  yield* Effect.log("Main process is done. Interrupting the clock fiber.");

  // Stop the background process.
  // Fiber.interrupt sends an interruption signal to the fiber
  // This allows the fiber to perform cleanup operations before terminating
  // Without this, the background task would continue running indefinitely
  yield* Fiber.interrupt(clockFiber);

  // Important: Always clean up background fibers to prevent resource leaks
  // In a real application, you might want to:
  // 1. Use Fiber.join instead of interrupt to wait for graceful completion
  // 2. Handle interruption signals within the background task
  // 3. Implement proper shutdown procedures

  yield* Effect.log("Program finished.");

  // Key concepts demonstrated:
  // 1. Fork creates concurrent fibers without blocking
  // 2. Background tasks run independently of the main program
  // 3. Fiber interruption provides controlled shutdown
  // 4. Multiple fibers can run simultaneously on the same thread pool
});

// This example shows how to:
// - Run background tasks that don't block the main program
// - Manage fiber lifecycles (create, run, interrupt)
// - Coordinate between multiple concurrent operations
// - Properly clean up resources when shutting down
Effect.runPromise(program);
```

---

**Anti-Pattern:**

The anti-pattern is using `Effect.fork` when you immediately need the result of the computation. This is an overly complicated and less readable way of just running the effect directly.

```typescript
import { Effect, Fiber } from "effect";

const someEffect = Effect.succeed(42);

// ❌ WRONG: This is unnecessarily complex.
const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(someEffect);
  // You immediately wait for the result, defeating the purpose of forking.
  const result = yield* Fiber.join(fiber);
  return result;
});

// ✅ CORRECT: Just run the effect directly if you need its result right away.
const simplerProgram = Effect.gen(function* () {
  const result = yield* someEffect;
  return result;
});
```

---

### Scheduling Pattern 5: Advanced Retry Chains and Circuit Breakers

**Rule:** Use retry chains with circuit breakers to handle complex failure scenarios, detect cascade failures early, and prevent resource exhaustion.

**Use Cases:** scheduling-periodic-tasks

**Why:**

Simple retry fails in production:

**Scenario 1: Cascade Failure**
- Service A calls Service B (down)
- Retries pile up, consuming resources
- A gets overloaded trying to recover B
- System collapses

**Scenario 2: Mixed Failures**
- 404 (not found) - retrying won't help
- 500 (server error) - retrying might help
- Network timeout - retrying might help
- Same retry strategy for all = inefficient

**Scenario 3: Thundering Herd**
- 10,000 clients all retrying at once
- Server recovers, gets hammered again
- Needs coordinated backoff + jitter

Solutions:

**Circuit breaker**:
- Monitor error rate
- Stop requests when high
- Resume gradually
- Prevent cascade failures

**Fallback chain**:
- Try primary endpoint
- Try secondary endpoint
- Use cache
- Return degraded result

**Adaptive retry**:
- Classify error type
- Use appropriate strategy
- Skip unretryable errors
- Adjust backoff dynamically

---

**Good Example:**

This example demonstrates circuit breaker and fallback chain patterns.

```typescript
import { Effect, Schedule, Ref, Data } from "effect";

// Error classification
class RetryableError extends Data.TaggedError("RetryableError")<{
  message: string;
  code: string;
}> {}

class NonRetryableError extends Data.TaggedError("NonRetryableError")<{
  message: string;
  code: string;
}> {}

class CircuitBreakerOpenError extends Data.TaggedError("CircuitBreakerOpenError")<{
  message: string;
}> {}

// Circuit breaker state
interface CircuitBreakerState {
  status: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime: Date | null;
  successCount: number;
}

// Create circuit breaker
const createCircuitBreaker = (config: {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}) =>
  Effect.gen(function* () {
    const state = yield* Ref.make<CircuitBreakerState>({
      status: "closed",
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
    });

    const recordSuccess = Effect.gen(function* () {
      yield* Ref.modify(state, (s) => {
        if (s.status === "half-open") {
          return [
            undefined,
            {
              ...s,
              successCount: s.successCount + 1,
              status: s.successCount + 1 >= config.halfOpenRequests
                ? "closed"
                : "half-open",
              failureCount: 0,
            },
          ];
        }
        return [undefined, s];
      });
    });

    const recordFailure = Effect.gen(function* () {
      yield* Ref.modify(state, (s) => {
        const newFailureCount = s.failureCount + 1;
        const newStatus = newFailureCount >= config.failureThreshold
          ? "open"
          : s.status;

        return [
          undefined,
          {
            ...s,
            failureCount: newFailureCount,
            lastFailureTime: new Date(),
            status: newStatus,
          },
        ];
      });
    });

    const canExecute = Effect.gen(function* () {
      const current = yield* Ref.get(state);

      if (current.status === "closed") {
        return true;
      }

      if (current.status === "open") {
        const timeSinceFailure = Date.now() - (current.lastFailureTime?.getTime() ?? 0);

        if (timeSinceFailure > config.resetTimeoutMs) {
          yield* Ref.modify(state, (s) => [
            undefined,
            {
              ...s,
              status: "half-open",
              failureCount: 0,
              successCount: 0,
            },
          ]);
          return true;
        }

        return false;
      }

      // half-open: allow limited requests
      return true;
    });

    return { recordSuccess, recordFailure, canExecute, state };
  });

// Main example
const program = Effect.gen(function* () {
  console.log(`\n[ADVANCED RETRY] Circuit breaker and fallback chains\n`);

  // Create circuit breaker
  const cb = yield* createCircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 1000,
    halfOpenRequests: 2,
  });

  // Example 1: Circuit breaker in action
  console.log(`[1] Circuit breaker state transitions:\n`);

  let requestCount = 0;

  const callWithCircuitBreaker = (shouldFail: boolean) =>
    Effect.gen(function* () {
      const canExecute = yield* cb.canExecute;

      if (!canExecute) {
        yield* Effect.fail(
          new CircuitBreakerOpenError({
            message: "Circuit breaker is open",
          })
        );
      }

      requestCount++;

      if (shouldFail) {
        yield* cb.recordFailure;
        yield* Effect.log(
          `[REQUEST ${requestCount}] FAILED (Circuit: ${(yield* Ref.get(cb.state)).status})`
        );
        yield* Effect.fail(
          new RetryableError({
            message: "Service error",
            code: "500",
          })
        );
      } else {
        yield* cb.recordSuccess;
        yield* Effect.log(
          `[REQUEST ${requestCount}] SUCCESS (Circuit: ${(yield* Ref.get(cb.state)).status})`
        );
        return "success";
      }
    });

  // Simulate failures then recovery
  const failSequence = [true, true, true, false, false, false];

  for (const shouldFail of failSequence) {
    yield* callWithCircuitBreaker(shouldFail).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          if (error._tag === "CircuitBreakerOpenError") {
            yield* Effect.log(
              `[REQUEST ${requestCount + 1}] REJECTED (Circuit open)`
            );
          } else {
            yield* Effect.log(
              `[REQUEST ${requestCount + 1}] ERROR caught`
            );
          }
        })
      )
    );

    // Add delay between requests
    yield* Effect.sleep("100 millis");
  }

  // Example 2: Fallback chain
  console.log(`\n[2] Fallback chain (primary → secondary → cache):\n`);

  const endpoints = {
    primary: "https://api.primary.com/data",
    secondary: "https://api.secondary.com/data",
    cache: "cached-data",
  };

  const callEndpoint = (name: string, shouldFail: boolean) =>
    Effect.gen(function* () {
      yield* Effect.log(`[CALL] Trying ${name}`);

      if (shouldFail) {
        yield* Effect.sleep("50 millis");
        yield* Effect.fail(
          new RetryableError({
            message: `${name} failed`,
            code: "500",
          })
        );
      }

      yield* Effect.sleep("50 millis");
      return `data-from-${name}`;
    });

  const fallbackChain = callEndpoint("primary", true).pipe(
    Effect.orElse(() => callEndpoint("secondary", false)),
    Effect.orElse(() => {
      yield* Effect.log(`[FALLBACK] Using cached data`);
      return Effect.succeed(endpoints.cache);
    })
  );

  const result = yield* fallbackChain;

  yield* Effect.log(`[RESULT] Got: ${result}\n`);

  // Example 3: Error-specific retry strategy
  console.log(`[3] Error classification and adaptive retry:\n`);

  const classifyError = (code: string) => {
    if (["502", "503", "504"].includes(code)) {
      return "retryable-service-error";
    }
    if (["408", "429"].includes(code)) {
      return "retryable-rate-limit";
    }
    if (["404", "401", "403"].includes(code)) {
      return "non-retryable";
    }
    if (code === "timeout") {
      return "retryable-network";
    }
    return "unknown";
  };

  const errorCodes = ["500", "404", "429", "503", "timeout"];

  for (const code of errorCodes) {
    const classification = classifyError(code);
    const shouldRetry = !classification.startsWith("non-retryable");

    yield* Effect.log(
      `[ERROR ${code}] → ${classification} (Retry: ${shouldRetry})`
    );
  }

  // Example 4: Bulkhead pattern
  console.log(`\n[4] Bulkhead isolation (limit concurrency per endpoint):\n`);

  const bulkheads = {
    "primary-api": { maxConcurrent: 5, currentCount: 0 },
    "secondary-api": { maxConcurrent: 3, currentCount: 0 },
  };

  const acquirePermit = (endpoint: string) =>
    Effect.gen(function* () {
      const bulkhead = bulkheads[endpoint as keyof typeof bulkheads];

      if (!bulkhead) {
        return false;
      }

      if (bulkhead.currentCount < bulkhead.maxConcurrent) {
        bulkhead.currentCount++;
        return true;
      }

      yield* Effect.log(
        `[BULKHEAD] ${endpoint} at capacity (${bulkhead.currentCount}/${bulkhead.maxConcurrent})`
      );

      return false;
    });

  // Simulate requests
  for (let i = 0; i < 10; i++) {
    const endpoint = i < 6 ? "primary-api" : "secondary-api";
    const acquired = yield* acquirePermit(endpoint);

    if (acquired) {
      yield* Effect.log(
        `[REQUEST] Acquired permit for ${endpoint}`
      );
    }
  }
});

Effect.runPromise(program);
```

---

---

### Set Up Alerting

**Rule:** Create alerts based on SLOs and symptoms, not causes.

**Use Cases:** observability

**Why:**

Good alerting:

1. **Catches real problems** - Alerts when users are affected
2. **Reduces noise** - Fewer false positives
3. **Enables response** - Actionable information
4. **Supports SLOs** - Tracks service level objectives

---

**Good Example:**

```typescript
import { Effect, Metric, Schedule, Duration, Ref } from "effect"

// ============================================
// 1. Define alertable conditions
// ============================================

interface Alert {
  readonly name: string
  readonly severity: "critical" | "warning" | "info"
  readonly message: string
  readonly timestamp: Date
  readonly labels: Record<string, string>
}

interface AlertRule {
  readonly name: string
  readonly condition: Effect.Effect<boolean>
  readonly severity: "critical" | "warning" | "info"
  readonly message: string
  readonly labels: Record<string, string>
  readonly forDuration: Duration.DurationInput
}

// ============================================
// 2. Define alert rules
// ============================================

const createAlertRules = (metrics: {
  errorRate: () => Effect.Effect<number>
  latencyP99: () => Effect.Effect<number>
  availability: () => Effect.Effect<number>
}): AlertRule[] => [
  {
    name: "HighErrorRate",
    condition: metrics.errorRate().pipe(Effect.map((rate) => rate > 0.01)),
    severity: "critical",
    message: "Error rate exceeds 1%",
    labels: { team: "backend", service: "api" },
    forDuration: "5 minutes",
  },
  {
    name: "HighLatency",
    condition: metrics.latencyP99().pipe(Effect.map((p99) => p99 > 2)),
    severity: "warning",
    message: "P99 latency exceeds 2 seconds",
    labels: { team: "backend", service: "api" },
    forDuration: "10 minutes",
  },
  {
    name: "LowAvailability",
    condition: metrics.availability().pipe(Effect.map((avail) => avail < 99.9)),
    severity: "critical",
    message: "Availability below 99.9% SLO",
    labels: { team: "backend", service: "api" },
    forDuration: "5 minutes",
  },
  {
    name: "ErrorBudgetLow",
    condition: Effect.succeed(false), // Implement based on error budget calc
    severity: "warning",
    message: "Error budget below 25%",
    labels: { team: "backend", service: "api" },
    forDuration: "0 seconds",
  },
]

// ============================================
// 3. Alert manager
// ============================================

interface AlertState {
  readonly firing: Map<string, { since: Date; alert: Alert }>
  readonly resolved: Alert[]
}

const makeAlertManager = Effect.gen(function* () {
  const state = yield* Ref.make<AlertState>({
    firing: new Map(),
    resolved: [],
  })

  const checkRule = (rule: AlertRule) =>
    Effect.gen(function* () {
      const isTriggered = yield* rule.condition

      yield* Ref.modify(state, (s) => {
        const firing = new Map(s.firing)
        const resolved = [...s.resolved]
        const key = rule.name

        if (isTriggered) {
          if (!firing.has(key)) {
            // New alert
            firing.set(key, {
              since: new Date(),
              alert: {
                name: rule.name,
                severity: rule.severity,
                message: rule.message,
                timestamp: new Date(),
                labels: rule.labels,
              },
            })
          }
        } else {
          if (firing.has(key)) {
            // Alert resolved
            const prev = firing.get(key)!
            resolved.push({
              ...prev.alert,
              message: `[RESOLVED] ${prev.alert.message}`,
              timestamp: new Date(),
            })
            firing.delete(key)
          }
        }

        return [undefined, { firing, resolved }]
      })
    })

  const getActiveAlerts = () =>
    Ref.get(state).pipe(
      Effect.map((s) => Array.from(s.firing.values()).map((f) => f.alert))
    )

  const getRecentResolved = () =>
    Ref.get(state).pipe(Effect.map((s) => s.resolved.slice(-10)))

  return {
    checkRule,
    getActiveAlerts,
    getRecentResolved,
  }
})

// ============================================
// 4. Alert notification
// ============================================

interface NotificationChannel {
  readonly send: (alert: Alert) => Effect.Effect<void>
}

const slackChannel: NotificationChannel = {
  send: (alert) =>
    Effect.gen(function* () {
      const emoji =
        alert.severity === "critical"
          ? "🔴"
          : alert.severity === "warning"
            ? "🟡"
            : "🔵"

      yield* Effect.log(`${emoji} [${alert.severity.toUpperCase()}] ${alert.name}`).pipe(
        Effect.annotateLogs({
          message: alert.message,
          labels: JSON.stringify(alert.labels),
        })
      )

      // In real implementation: call Slack API
    }),
}

const pagerDutyChannel: NotificationChannel = {
  send: (alert) =>
    Effect.gen(function* () {
      if (alert.severity === "critical") {
        yield* Effect.log("PagerDuty: Creating incident").pipe(
          Effect.annotateLogs({ alert: alert.name })
        )
        // In real implementation: call PagerDuty API
      }
    }),
}

// ============================================
// 5. Alert evaluation loop
// ============================================

const runAlertEvaluation = (
  rules: AlertRule[],
  channels: NotificationChannel[],
  interval: Duration.DurationInput
) =>
  Effect.gen(function* () {
    const alertManager = yield* makeAlertManager
    const previousAlerts = yield* Ref.make(new Set<string>())

    yield* Effect.forever(
      Effect.gen(function* () {
        // Check all rules
        for (const rule of rules) {
          yield* alertManager.checkRule(rule)
        }

        // Get current active alerts
        const active = yield* alertManager.getActiveAlerts()
        const current = new Set(active.map((a) => a.name))
        const previous = yield* Ref.get(previousAlerts)

        // Find newly firing alerts
        for (const alert of active) {
          if (!previous.has(alert.name)) {
            // New alert - send notifications
            for (const channel of channels) {
              yield* channel.send(alert)
            }
          }
        }

        yield* Ref.set(previousAlerts, current)
        yield* Effect.sleep(interval)
      })
    )
  })

// ============================================
// 6. Prometheus alerting rules (YAML)
// ============================================

const prometheusAlertRules = `
groups:
  - name: effect-app-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_errors_total[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High P99 latency"
          description: "P99 latency is {{ $value }}s"

      - alert: SLOViolation
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[30m]))
          /
          sum(rate(http_requests_total[30m]))
          < 0.999
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SLO violation"
          description: "Availability is {{ $value | humanizePercentage }}"
`
```

---

### State Management Pattern 1: Synchronized Reference with SynchronizedRef

**Rule:** Use SynchronizedRef for thread-safe mutable state that must be updated consistently across concurrent operations, with atomic modifications.

**Use Cases:** concurrency

**Why:**

Shared mutable state without synchronization causes problems:

**Problem 1: Data races**
- Fiber A reads counter (value: 5)
- Fiber B reads counter (value: 5)
- Fiber A writes counter + 1 (value: 6)
- Fiber B writes counter + 1 (value: 6)
- Expected: 7, Got: 6 (lost update)

**Problem 2: Inconsistent snapshots**
- Transaction reads user.balance (100)
- User spent money elsewhere
- Transaction reads user.balance again (90)
- Now inconsistent within same transaction

**Problem 3: Race conditions**
- Check inventory (10 items)
- Check passes
- Before purchase, inventory goes to 0 (race)
- Purchase fails, user frustrated

**Problem 4: Deadlocks**
- Fiber A locks state, tries to acquire another
- Fiber B holds that state, tries to acquire first
- Both stuck forever

Solutions:

**Atomic operations**:
- Read and modify as single operation
- No intermediate states visible
- No race window
- Guaranteed consistency

**Compare-and-set**:
- "If value is X, change to Y" (atomic)
- Fails if another fiber changed it
- Retry automatically
- No locks needed

**Snapshot isolation**:
- Read complete snapshot
- All operations see consistent view
- Modifications build on snapshot
- Merge changes safely

---

**Good Example:**

This example demonstrates synchronized reference patterns.

```typescript
import { Effect, Ref, Fiber, Deferred } from "effect";

interface Counter {
  readonly value: number;
  readonly updates: number;
}

interface Account {
  readonly balance: number;
  readonly transactions: string[];
}

const program = Effect.gen(function* () {
  console.log(
    `\n[SYNCHRONIZED REFERENCES] Concurrent state management\n`
  );

  // Example 1: Basic counter with atomic updates
  console.log(`[1] Atomic counter increments:\n`);

  const counter = yield* Ref.make<Counter>({
    value: 0,
    updates: 0,
  });

  // Simulate 5 concurrent increments
  const incrementTasks = Array.from({ length: 5 }, (_, i) =>
    Effect.gen(function* () {
      for (let j = 0; j < 20; j++) {
        yield* Ref.modify(counter, (current) => [
          undefined,
          {
            value: current.value + 1,
            updates: current.updates + 1,
          },
        ]);

        if (j === 0 || j === 19) {
          yield* Effect.log(
            `[FIBER ${i}] Increment ${j === 0 ? "start" : "end"}`
          );
        }
      }
    })
  );

  // Run concurrently
  yield* Effect.all(incrementTasks, { concurrency: "unbounded" });

  const finalCounter = yield* Ref.get(counter);

  yield* Effect.log(
    `[RESULT] Counter: ${finalCounter.value} (expected 100)`
  );
  yield* Effect.log(
    `[RESULT] Updates: ${finalCounter.updates} (expected 100)\n`
  );

  // Example 2: Bank account with transaction isolation
  console.log(`[2] Account with atomic transfers:\n`);

  const account = yield* Ref.make<Account>({
    balance: 1000,
    transactions: [],
  });

  const transfer = (amount: number, description: string) =>
    Ref.modify(account, (current) => {
      if (current.balance < amount) {
        // Insufficient funds, don't modify
        return [
          { success: false, reason: "insufficient-funds" },
          current, // Unchanged
        ];
      }

      // Atomic: deduct + record transaction
      return [
        { success: true, reason: "transferred" },
        {
          balance: current.balance - amount,
          transactions: [
            ...current.transactions,
            `${description}: -$${amount}`,
          ],
        },
      ];
    });

  // Test transfer
  const t1 = yield* transfer(100, "Coffee");

  yield* Effect.log(`[TRANSFER 1] ${t1.success ? "✓" : "✗"} ${t1.reason}`);

  const t2 = yield* transfer(2000, "Electronics");

  yield* Effect.log(`[TRANSFER 2] ${t2.success ? "✓" : "✗"} ${t2.reason}`);

  const t3 = yield* transfer(200, "Groceries");

  yield* Effect.log(`[TRANSFER 3] ${t3.success ? "✓" : "✗"} ${t3.reason}\n`);

  // Example 3: Concurrent reads don't block writes
  console.log(`[3] Concurrent reads and writes:\n`);

  const state = yield* Ref.make({ value: 0, readers: 0 });

  const read = Effect.gen(function* () {
    const snapshot = yield* Ref.get(state);

    yield* Effect.log(
      `[READ] Got value: ${snapshot.value}`
    );

    return snapshot.value;
  });

  const write = (newValue: number) =>
    Ref.set(state, { value: newValue, readers: 0 });

  // Concurrent operations
  const mixed = Effect.all(
    [
      read,
      write(10),
      read,
      write(20),
      read,
    ],
    { concurrency: "unbounded" }
  );

  yield* mixed;

  // Example 4: Compare-and-set pattern (retry on failure)
  console.log(`\n[4] Compare-and-set (optimistic updates):\n`);

  const versionedState = yield* Ref.make({ version: 0, data: "initial" });

  const updateWithVersion = (newData: string) =>
    Effect.gen(function* () {
      let retries = 0;

      while (retries < 3) {
        const current = yield* Ref.get(versionedState);

        // Try to update (check-and-set)
        const result = yield* Ref.modify(versionedState, (s) => {
          if (s.version === current.version) {
            // No concurrent update, proceed
            return [
              { success: true },
              {
                version: s.version + 1,
                data: newData,
              },
            ];
          }

          // Version changed, conflict
          return [{ success: false }, s];
        });

        if (result.success) {
          yield* Effect.log(
            `[CAS] Updated on attempt ${retries + 1}`
          );

          return true;
        }

        retries++;

        yield* Effect.log(
          `[CAS] Conflict detected, retrying (attempt ${retries + 1})`
        );
      }

      return false;
    });

  const casResult = yield* updateWithVersion("updated-data");

  yield* Effect.log(`[CAS] Success: ${casResult}\n`);

  // Example 5: State with subscriptions (notify on change)
  console.log(`[5] State changes with notification:\n`);

  interface Notification {
    oldValue: unknown;
    newValue: unknown;
    timestamp: Date;
  }

  const observedState = yield* Ref.make<{ value: number; lastChange: Date }>({
    value: 0,
    lastChange: new Date(),
  });

  const updateAndNotify = (newValue: number) =>
    Ref.modify(observedState, (current) => {
      const notification: Notification = {
        oldValue: current.value,
        newValue,
        timestamp: new Date(),
      };

      yield* Effect.log(
        `[NOTIFY] ${current.value} → ${newValue} at ${notification.timestamp.toISOString()}`
      );

      return [
        notification,
        {
          value: newValue,
          lastChange: notification.timestamp,
        },
      ];
    });

  // Trigger changes
  for (const val of [5, 10, 15]) {
    yield* updateAndNotify(val);
  }

  // Example 6: Atomic batch updates
  console.log(`\n[6] Batch atomic updates:\n`);

  interface BatchState {
    items: string[];
    locked: boolean;
    version: number;
  }

  const batchState = yield* Ref.make<BatchState>({
    items: [],
    locked: false,
    version: 0,
  });

  const addItems = (newItems: string[]) =>
    Ref.modify(batchState, (current) => {
      // All items added atomically
      return [
        { added: newItems.length },
        {
          items: [...current.items, ...newItems],
          locked: false,
          version: current.version + 1,
        },
      ];
    });

  const batch1 = yield* addItems(["item1", "item2", "item3"]);

  yield* Effect.log(
    `[BATCH 1] Added ${batch1.added} items`
  );

  const batch2 = yield* addItems(["item4", "item5"]);

  yield* Effect.log(
    `[BATCH 2] Added ${batch2.added} items`
  );

  const finalBatch = yield* Ref.get(batchState);

  yield* Effect.log(
    `[RESULT] Total items: ${finalBatch.items.length}, Version: ${finalBatch.version}`
  );
});

Effect.runPromise(program);
```

---

---

### State Management Pattern 2: Observable State with SubscriptionRef

**Rule:** Combine Ref with PubSub to create observable state where changes trigger notifications, enabling reactive state management.

**Use Cases:** concurrency

**Why:**

Passive state causes problems:

**Problem 1: Stale UI**
- State changes in backend
- UI doesn't know
- User sees old data
- Manual refresh required

**Problem 2: Cascading updates**
- User changes form field
- Need to update 5 other fields
- Manual imperative code
- Fragile, easy to miss one

**Problem 3: Derived state**
- Total = sum of items
- Manual update on each item change
- Duplicate code everywhere
- Bug: total not updated when items change

**Problem 4: Side effects**
- User enables feature
- Multiple things must happen
- Analytics, notifications, API calls
- All imperative, hard to maintain

Solutions:

**Observable state**:
- State change = event
- Subscribers notified
- UI binds directly
- Auto-updates

**Reactive flows**:
- Define how state flows
- `newTotal = items.sum()`
- Automatic recalculation
- No manual updates

**Side effect chaining**:
- When state changes to "complete"
- Send notification
- Log event
- Trigger cleanup
- All declaratively

---

**Good Example:**

This example demonstrates observable state patterns.

```typescript
import { Effect, Ref, PubSub, Stream } from "effect";

interface StateChange<T> {
  readonly previous: T;
  readonly current: T;
  readonly timestamp: Date;
  readonly reason: string;
}

interface Observable<T> {
  readonly get: () => Effect.Effect<T>;
  readonly set: (value: T, reason: string) => Effect.Effect<void>;
  readonly subscribe: () => Stream.Stream<StateChange<T>>;
  readonly modify: (f: (current: T) => T, reason: string) => Effect.Effect<void>;
}

const program = Effect.gen(function* () {
  console.log(
    `\n[OBSERVABLE STATE] Reactive state management\n`
  );

  // Create observable
  const createObservable = <T,>(initialValue: T): Effect.Effect<Observable<T>> =>
    Effect.gen(function* () {
      const state = yield* Ref.make(initialValue);
      const changeStream = yield* PubSub.unbounded<StateChange<T>>();

      return {
        get: () => Ref.get(state),

        set: (value: T, reason: string) =>
          Effect.gen(function* () {
            const previous = yield* Ref.get(state);

            if (previous === value) {
              return; // No change
            }

            yield* Ref.set(state, value);

            const change: StateChange<T> = {
              previous,
              current: value,
              timestamp: new Date(),
              reason,
            };

            yield* PubSub.publish(changeStream, change);
          }),

        subscribe: () =>
          PubSub.subscribe(changeStream),

        modify: (f: (current: T) => T, reason: string) =>
          Effect.gen(function* () {
            const previous = yield* Ref.get(state);
            const updated = f(previous);

            if (previous === updated) {
              return; // No change
            }

            yield* Ref.set(state, updated);

            const change: StateChange<T> = {
              previous,
              current: updated,
              timestamp: new Date(),
              reason,
            };

            yield* PubSub.publish(changeStream, change);
          }),
      };
    });

  // Example 1: Basic observable counter
  console.log(`[1] Observable counter:\n`);

  const counter = yield* createObservable(0);

  // Subscribe to changes
  const printChanges = counter.subscribe().pipe(
    Stream.tap((change) =>
      Effect.log(
        `[CHANGE] ${change.previous} → ${change.current} (${change.reason})`
      )
    ),
    Stream.take(5), // Limit to 5 changes for demo
    Stream.runDrain
  );

  // Make changes
  yield* counter.set(1, "increment");
  yield* counter.set(2, "increment");
  yield* counter.set(5, "reset");

  // Wait for changes to be processed
  yield* Effect.sleep("100 millis");

  // Example 2: Derived state (computed values)
  console.log(`\n[2] Derived state (total from items):\n`);

  interface ShoppingCart {
    readonly items: Array<{ id: string; price: number }>;
    readonly discount: number;
  }

  const cart = yield* createObservable<ShoppingCart>({
    items: [],
    discount: 0,
  });

  const computeTotal = (state: ShoppingCart): number => {
    const subtotal = state.items.reduce((sum, item) => sum + item.price, 0);
    return subtotal * (1 - state.discount);
  };

  // Create derived observable
  const total = yield* createObservable(computeTotal(yield* cart.get()));

  // Subscribe to cart changes, update total
  const updateTotalOnCartChange = cart.subscribe().pipe(
    Stream.tap((change) =>
      Effect.gen(function* () {
        const newTotal = computeTotal(change.current);

        yield* total.set(newTotal, "recalculated-from-cart");

        yield* Effect.log(
          `[TOTAL] Recalculated: $${newTotal.toFixed(2)}`
        );
      })
    ),
    Stream.take(10),
    Stream.runDrain
  );

  // Make cart changes
  yield* cart.modify(
    (state) => ({
      ...state,
      items: [
        ...state.items,
        { id: "item1", price: 19.99 },
      ],
    }),
    "add-item"
  );

  yield* cart.modify(
    (state) => ({
      ...state,
      items: [
        ...state.items,
        { id: "item2", price: 29.99 },
      ],
    }),
    "add-item"
  );

  yield* cart.modify(
    (state) => ({
      ...state,
      discount: 0.1,
    }),
    "apply-discount"
  );

  yield* Effect.sleep("200 millis");

  // Example 3: Effect triggering on state change
  console.log(`\n[3] Effects triggered by state changes:\n`);

  type AppStatus = "idle" | "loading" | "ready" | "error";

  const appStatus = yield* createObservable<AppStatus>("idle");

  // Define effects for each status
  const handleStatusChange = appStatus.subscribe().pipe(
    Stream.tap((change) =>
      Effect.gen(function* () {
        yield* Effect.log(
          `[STATUS] ${change.previous} → ${change.current}`
        );

        switch (change.current) {
          case "loading":
            yield* Effect.log(`[EFFECT] Starting loading animation`);
            break;

          case "ready":
            yield* Effect.log(`[EFFECT] Hiding spinner, showing content`);
            break;

          case "error":
            yield* Effect.log(`[EFFECT] Showing error message`);
            yield* Effect.log(`[TELEMETRY] Logging error event`);
            break;

          default:
            yield* Effect.log(`[EFFECT] Resetting UI`);
        }
      })
    ),
    Stream.take(6),
    Stream.runDrain
  );

  // Trigger status changes
  yield* appStatus.set("loading", "user-clicked");
  yield* appStatus.set("ready", "data-loaded");
  yield* appStatus.set("loading", "user-refreshed");
  yield* appStatus.set("error", "api-failed");

  yield* Effect.sleep("200 millis");

  // Example 4: Multi-level state aggregation
  console.log(`\n[4] Aggregated state from multiple sources:\n`);

  interface UserProfile {
    name: string;
    email: string;
    role: string;
  }

  interface AppState {
    user: UserProfile | null;
    notifications: number;
    theme: "light" | "dark";
  }

  const appState = yield* createObservable<AppState>({
    user: null,
    notifications: 0,
    theme: "light",
  });

  // Subscribe to track changes
  const trackChanges = appState.subscribe().pipe(
    Stream.tap((change) => {
      if (change.current.user && !change.previous.user) {
        return Effect.log(`[EVENT] User logged in: ${change.current.user.name}`);
      }

      if (!change.current.user && change.previous.user) {
        return Effect.log(`[EVENT] User logged out`);
      }

      if (change.current.notifications !== change.previous.notifications) {
        return Effect.log(
          `[NOTIFY] ${change.current.notifications} notifications`
        );
      }

      if (change.current.theme !== change.previous.theme) {
        return Effect.log(`[THEME] Switched to ${change.current.theme}`);
      }

      return Effect.succeed(undefined);
    }),
    Stream.take(10),
    Stream.runDrain
  );

  // Make changes
  yield* appState.modify(
    (state) => ({
      ...state,
      user: { name: "Alice", email: "alice@example.com", role: "admin" },
    }),
    "user-login"
  );

  yield* appState.modify(
    (state) => ({
      ...state,
      notifications: 5,
    }),
    "new-notifications"
  );

  yield* appState.modify(
    (state) => ({
      ...state,
      theme: "dark",
    }),
    "user-preference"
  );

  yield* Effect.sleep("200 millis");

  // Example 5: State snapshot and history
  console.log(`\n[5] State history tracking:\n`);

  interface HistoryEntry<T> {
    value: T;
    timestamp: Date;
    reason: string;
  }

  const history = yield* Ref.make<HistoryEntry<number>[]>([]);

  const trackedCounter = yield* createObservable(0);

  const trackHistory = trackedCounter.subscribe().pipe(
    Stream.tap((change) =>
      Effect.gen(function* () {
        yield* Ref.modify(history, (h) => [
          undefined,
          [
            ...h,
            {
              value: change.current,
              timestamp: change.timestamp,
              reason: change.reason,
            },
          ],
        ]);

        yield* Effect.log(
          `[HISTORY] Recorded: ${change.current} (${change.reason})`
        );
      })
    ),
    Stream.take(5),
    Stream.runDrain
  );

  // Make changes
  for (let i = 1; i <= 4; i++) {
    yield* trackedCounter.set(i, `step-${i}`);
  }

  yield* Effect.sleep("200 millis");

  // Print history
  const hist = yield* Ref.get(history);

  yield* Effect.log(`\n[HISTORY] ${hist.length} entries:`);

  for (const entry of hist) {
    yield* Effect.log(
      `  - ${entry.value} (${entry.reason})`
    );
  }
});

Effect.runPromise(program);
```

---

---

### Stream Pattern 5: Grouping and Windowing Streams

**Rule:** Use groupBy to partition streams by key and tumbling/sliding windows to aggregate streams over time windows.

**Use Cases:** streams

**Why:**

Unbounded streams need boundaries:

**Problem 1: Memory exhaustion**
- Processing 1M events with no boundary = keep all in memory
- Cumulative memory grows unbounded
- Eventually OOM error

**Problem 2: Late aggregation**
- Can't sum all events until stream ends (never)
- Need to decide: "sum events in this 1-second window"

**Problem 3: Grouping complexity**
- Stream of user events: need per-user aggregation
- Without groupBy: manual state tracking (error-prone)

**Problem 4: Temporal patterns**
- "Top 10 searches in last 5 minutes" requires windowing
- "Average response time per endpoint per minute" requires grouping + windowing

Solutions:

**Tumbling window**:
- Divide stream into 1-sec, 5-sec, or 1-min chunks
- Process each chunk independently
- Clear memory between windows
- Natural for: metrics, batching, reports

**Sliding window**:
- Keep last 5 minutes of data at all times
- Emit updated aggregation every second
- Detect patterns over overlapping periods
- Natural for: anomaly detection, trends

**Group by**:
- Separate streams by key
- Each key has independent state
- Emit grouped results
- Natural for: per-user, per-endpoint, per-tenant

---

**Good Example:**

This example demonstrates windowing and grouping patterns.

```typescript
import { Effect, Stream, Ref, Duration, Schedule } from "effect";

interface Event {
  readonly timestamp: Date;
  readonly userId: string;
  readonly action: string;
  readonly duration: number; // milliseconds
}

// Simulate event stream
const generateEvents = (): Event[] => [
  { timestamp: new Date(Date.now() - 5000), userId: "user1", action: "click", duration: 100 },
  { timestamp: new Date(Date.now() - 4500), userId: "user2", action: "view", duration: 250 },
  { timestamp: new Date(Date.now() - 4000), userId: "user1", action: "scroll", duration: 150 },
  { timestamp: new Date(Date.now() - 3500), userId: "user3", action: "click", duration: 120 },
  { timestamp: new Date(Date.now() - 3000), userId: "user2", action: "click", duration: 180 },
  { timestamp: new Date(Date.now() - 2500), userId: "user1", action: "view", duration: 200 },
  { timestamp: new Date(Date.now() - 2000), userId: "user3", action: "view", duration: 300 },
  { timestamp: new Date(Date.now() - 1500), userId: "user1", action: "submit", duration: 500 },
  { timestamp: new Date(Date.now() - 1000), userId: "user2", action: "scroll", duration: 100 },
];

// Main: windowing and grouping examples
const program = Effect.gen(function* () {
  console.log(`\n[WINDOWING & GROUPING] Stream organization patterns\n`);

  const events = generateEvents();

  // Example 1: Tumbling window (fixed-size batches)
  console.log(`[1] Tumbling window (2-event batches):\n`);

  const windowSize = 2;
  let batchNumber = 1;

  for (let i = 0; i < events.length; i += windowSize) {
    const batch = events.slice(i, i + windowSize);

    yield* Effect.log(`[WINDOW ${batchNumber}] (${batch.length} events)`);

    let totalDuration = 0;

    for (const event of batch) {
      yield* Effect.log(
        `  - ${event.userId}: ${event.action} (${event.duration}ms)`
      );

      totalDuration += event.duration;
    }

    yield* Effect.log(`[WINDOW ${batchNumber}] Total duration: ${totalDuration}ms\n`);

    batchNumber++;
  }

  // Example 2: Sliding window (overlapping)
  console.log(`[2] Sliding window (last 3 events, slide by 1):\n`);

  const windowSizeSlide = 3;
  const slideBy = 1;

  for (let i = 0; i <= events.length - windowSizeSlide; i += slideBy) {
    const window = events.slice(i, i + windowSizeSlide);

    const avgDuration =
      window.reduce((sum, e) => sum + e.duration, 0) / window.length;

    yield* Effect.log(
      `[SLIDE ${i / slideBy}] ${window.length} events, avg duration: ${avgDuration.toFixed(0)}ms`
    );
  }

  // Example 3: Group by key
  console.log(`\n[3] Group by user:\n`);

  const byUser = new Map<string, Event[]>();

  for (const event of events) {
    if (!byUser.has(event.userId)) {
      byUser.set(event.userId, []);
    }

    byUser.get(event.userId)!.push(event);
  }

  for (const [userId, userEvents] of byUser) {
    const totalActions = userEvents.length;
    const totalTime = userEvents.reduce((sum, e) => sum + e.duration, 0);
    const avgTime = totalTime / totalActions;

    yield* Effect.log(
      `[USER ${userId}] ${totalActions} actions, ${totalTime}ms total, ${avgTime.toFixed(0)}ms avg`
    );
  }

  // Example 4: Group + Window combination
  console.log(`\n[4] Group by user, window by action type:\n`);

  for (const [userId, userEvents] of byUser) {
    const byAction = new Map<string, Event[]>();

    for (const event of userEvents) {
      if (!byAction.has(event.action)) {
        byAction.set(event.action, []);
      }

      byAction.get(event.action)!.push(event);
    }

    yield* Effect.log(`[USER ${userId}] Action breakdown:`);

    for (const [action, actionEvents] of byAction) {
      const count = actionEvents.length;
      const total = actionEvents.reduce((sum, e) => sum + e.duration, 0);

      yield* Effect.log(`  ${action}: ${count}x (${total}ms total)`);
    }
  }

  // Example 5: Session window (based on inactivity timeout)
  console.log(`\n[5] Session window (gap > 1000ms = new session):\n`);

  const sessionGapMs = 1000;
  const sessions: Event[][] = [];
  let currentSession: Event[] = [];
  let lastTimestamp = events[0]?.timestamp.getTime() ?? 0;

  for (const event of events) {
    const currentTime = event.timestamp.getTime();
    const timeSinceLastEvent = currentTime - lastTimestamp;

    if (timeSinceLastEvent > sessionGapMs && currentSession.length > 0) {
      sessions.push(currentSession);
      yield* Effect.log(
        `[SESSION] Closed (${currentSession.length} events, gap: ${timeSinceLastEvent}ms)`
      );

      currentSession = [];
    }

    currentSession.push(event);
    lastTimestamp = currentTime;
  }

  if (currentSession.length > 0) {
    sessions.push(currentSession);
    yield* Effect.log(`[SESSION] Final (${currentSession.length} events)`);
  }

  // Example 6: Top-K aggregation in window
  console.log(`\n[6] Top 2 actions in last window:\n`);

  const lastWindow = events.slice(-3);

  const actionCounts = new Map<string, number>();

  for (const event of lastWindow) {
    actionCounts.set(
      event.action,
      (actionCounts.get(event.action) ?? 0) + 1
    );
  }

  const topActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  yield* Effect.log(`[TOP-K] In last window of 3 events:`);

  for (const [action, count] of topActions) {
    yield* Effect.log(`  ${action}: ${count}x`);
  }
});

Effect.runPromise(program);
```

---

---

### Stream Pattern 6: Resource Management in Streams

**Rule:** Use Stream.bracket or effect scoping to guarantee resource cleanup, preventing leaks even when streams fail or are interrupted.

**Use Cases:** streams

**Why:**

Streams without resource management cause problems:

**Problem 1: Resource exhaustion**
- Open file streams without closing → file descriptor limit exceeded
- Get connections from pool, never return → connection starvation
- System becomes unresponsive

**Problem 2: Memory leaks**
- Stream emits large objects → memory grows
- Without cleanup → garbage persists
- GC can't reclaim

**Problem 3: Data corruption**
- Write to file without flush → partial writes on crash
- Read from connection while another thread writes → data race
- Results are unpredictable

**Problem 4: Silent failures**
- Resource cleanup fails → error lost
- Application proceeds as if successful
- Hidden bug becomes hard-to-trace crash later

Solutions:

**Bracket pattern**:
- Acquire resource
- Use resource (even if error)
- Always release resource
- Track errors separately

**Resource scopes**:
- Nested resource management
- Parent cleanup waits for children
- Hierarchical resource graphs
- Type-safe guarantees

**Connection pooling**:
- Reuse connections
- Track available/in-use
- Prevent exhaustion
- Support graceful shutdown

---

**Good Example:**

This example demonstrates resource acquisition, use, and guaranteed cleanup.

```typescript
import { Effect, Stream, Resource, Scope, Ref } from "effect";

interface FileHandle {
  readonly path: string;
  readonly fd: number;
}

interface Connection {
  readonly id: string;
  readonly isOpen: boolean;
}

// Simulate resource management
const program = Effect.gen(function* () {
  console.log(`\n[RESOURCE MANAGEMENT] Stream resource lifecycle\n`);

  // Example 1: Bracket pattern for file streams
  console.log(`[1] Bracket pattern (acquire → use → release):\n`);

  let openHandles = 0;
  let closedHandles = 0;

  const openFile = (path: string) =>
    Effect.gen(function* () {
      openHandles++;
      yield* Effect.log(`[OPEN] File "${path}" (total open: ${openHandles})`);

      return { path, fd: 1000 + openHandles };
    });

  const closeFile = (handle: FileHandle) =>
    Effect.gen(function* () {
      closedHandles++;
      yield* Effect.log(`[CLOSE] File "${handle.path}" (total closed: ${closedHandles})`);
    });

  const readFileWithBracket = (path: string) =>
    Effect.gen(function* () {
      let handle: FileHandle | null = null;

      try {
        handle = yield* openFile(path);

        yield* Effect.log(
          `[USE] Reading from fd ${handle.fd} ("${handle.path}")`
        );

        // Simulate reading
        return "file contents";
      } finally {
        // Guaranteed to run even if error occurs above
        if (handle) {
          yield* closeFile(handle);
        }
      }
    });

  // Test with success
  yield* Effect.log(`[TEST] Success case:`);

  const content = yield* readFileWithBracket("/data/file.txt");

  yield* Effect.log(`[RESULT] Got: "${content}"\n`);

  // Test with failure (simulated)
  yield* Effect.log(`[TEST] Error case:`);

  const failCase = Effect.gen(function* () {
    let handle: FileHandle | null = null;

    try {
      handle = yield* openFile("/data/missing.txt");

      // Simulate error mid-operation
      yield* Effect.fail(new Error("Read failed"));
    } finally {
      if (handle) {
        yield* closeFile(handle);
      }
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[ERROR] Caught: ${error.message}`);
        yield* Effect.log(`[CHECK] Closed handles: ${closedHandles} (verifying cleanup)\n`);
      })
    )
  );

  yield* failCase;

  // Example 2: Connection pool management
  console.log(`[2] Connection pooling:\n`);

  interface ConnectionPool {
    acquire: () => Effect.Effect<Connection>;
    release: (conn: Connection) => Effect.Effect<void>;
  }

  const createConnectionPool = (maxSize: number): Effect.Effect<ConnectionPool> =>
    Effect.gen(function* () {
      const available = yield* Ref.make<Connection[]>([]);
      const inUse = yield* Ref.make<Set<string>>(new Set());
      let idCounter = 0;

      return {
        acquire: Effect.gen(function* () {
          const avail = yield* Ref.get(available);

          if (avail.length > 0) {
            yield* Effect.log(`[POOL] Reusing connection from pool`);

            const conn = avail.pop()!;

            yield* Ref.modify(inUse, (set) => [
              undefined,
              new Set(set).add(conn.id),
            ]);

            return conn;
          }

          const inUseCount = (yield* Ref.get(inUse)).size;

          if (inUseCount >= maxSize) {
            yield* Effect.fail(new Error("Pool exhausted"));
          }

          const connId = `conn-${++idCounter}`;

          yield* Effect.log(`[POOL] Creating new connection: ${connId}`);

          const conn = { id: connId, isOpen: true };

          yield* Ref.modify(inUse, (set) => [
            undefined,
            new Set(set).add(connId),
          ]);

          return conn;
        }),

        release: (conn: Connection) =>
          Effect.gen(function* () {
            yield* Ref.modify(inUse, (set) => {
              const updated = new Set(set);
              updated.delete(conn.id);
              return [undefined, updated];
            });

            yield* Ref.modify(available, (avail) => [
              undefined,
              [...avail, conn],
            ]);

            yield* Effect.log(`[POOL] Returned connection: ${conn.id}`);
          }),
      };
    });

  const pool = yield* createConnectionPool(3);

  // Acquire and release connections
  const conn1 = yield* pool.acquire();
  const conn2 = yield* pool.acquire();

  yield* pool.release(conn1);

  const conn3 = yield* pool.acquire(); // Reuses conn1

  yield* Effect.log(`\n`);

  // Example 3: Scope-based resource safety
  console.log(`[3] Scoped resources (hierarchical cleanup):\n`);

  let scopedCount = 0;

  const withScoped = <R,>(create: () => Effect.Effect<R>) =>
    Effect.gen(function* () {
      scopedCount++;
      const id = scopedCount;

      yield* Effect.log(`[SCOPE] Enter scope ${id}`);

      const resource = yield* create();

      yield* Effect.log(`[SCOPE] Using resource in scope ${id}`);

      yield* Effect.sync(() => {
        // Cleanup happens here when scope exits
        yield* Effect.log(`[SCOPE] Exit scope ${id}`);
      }).pipe(
        Effect.ensuring(
          Effect.log(`[SCOPE] Cleanup guaranteed for scope ${id}`)
        )
      );

      return resource;
    });

  // Nested scopes
  const result = yield* withScoped(() =>
    Effect.succeed({
      level: 1,
      data: yield* withScoped(() => Effect.succeed("inner data")),
    })
  ).pipe(
    Effect.catchAll(() => Effect.succeed({ level: 0, data: null }))
  );

  yield* Effect.log(`[SCOPES] Cleanup order: inner → outer\n`);

  // Example 4: Stream resource management
  console.log(`[4] Stream with resource cleanup:\n`);

  let streamResourceCount = 0;

  // Simulate stream that acquires resources
  const streamWithResources = Stream.empty.pipe(
    Stream.tap(() =>
      Effect.gen(function* () {
        streamResourceCount++;
        yield* Effect.log(`[STREAM-RES] Acquired resource ${streamResourceCount}`);
      })
    ),
    // Cleanup when stream ends
    Stream.ensuring(
      Effect.log(`[STREAM-RES] Cleaning up all ${streamResourceCount} resources`)
    )
  );

  yield* Stream.runDrain(streamWithResources);

  // Example 5: Error propagation with cleanup
  console.log(`\n[5] Error safety with cleanup:\n`);

  const safeRead = (retryCount: number) =>
    Effect.gen(function* () {
      let handle: FileHandle | null = null;

      try {
        handle = yield* openFile(`/data/file-${retryCount}.txt`);

        if (retryCount < 2) {
          yield* Effect.log(`[READ] Attempt ${retryCount}: failing intentionally`);
          yield* Effect.fail(new Error(`Attempt ${retryCount} failed`));
        }

        yield* Effect.log(`[READ] Success on attempt ${retryCount}`);

        return "success";
      } finally {
        if (handle) {
          yield* closeFile(handle);
        }
      }
    });

  // Retry with guaranteed cleanup
  const result2 = yield* safeRead(1).pipe(
    Effect.retry(
      Schedule.recurs(2).pipe(
        Schedule.compose(Schedule.fixed("10 millis"))
      )
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[FINAL] All retries failed: ${error.message}`);
        return "fallback";
      })
    )
  );

  yield* Effect.log(`\n[FINAL] Result: ${result2}`);
});

Effect.runPromise(program);
```

---

---

### Stream Pattern 7: Error Handling in Streams

**Rule:** Use Stream error handlers to recover from failures, retry operations, and maintain stream integrity even when individual elements fail.

**Use Cases:** streams

**Why:**

Errors in streams cause cascading failures:

**Problem 1: Stream death**
- Process 10,000 records
- Record #5000 has bad data
- Stream crashes
- 9,000 records not processed
- Manual re-run needed

**Problem 2: Silent data loss**
- Stream encounters error
- Stops processing
- Caller doesn't notice
- Missing data goes undetected
- Reports wrong numbers

**Problem 3: No recovery visibility**
- Error happens
- Is it retried? How many times?
- Did it recover?
- Silent guessing required

**Problem 4: Downstream effects**
- Stream error affects all subscribers
- Cascading failure
- System becomes unavailable
- All downstream blocked

Solutions:

**Continue on error**:
- Skip failed element
- Process rest of stream
- Collect error for later
- Partial success acceptable

**Retry with backoff**:
- Transient error? Retry
- Exponential backoff
- Eventually give up
- Move to next element

**Error aggregation**:
- Collect all errors
- Collect all successes
- Report both
- Analytics/debugging

**Graceful termination**:
- Signal end of stream on error
- Allow cleanup
- Prevent resource leak
- Controlled shutdown

---

**Good Example:**

This example demonstrates stream error handling patterns.

```typescript
import { Effect, Stream, Ref } from "effect";

interface DataRecord {
  id: string;
  value: number;
}

interface ProcessingResult {
  successful: DataRecord[];
  failed: Array<{ id: string; error: string }>;
  retried: number;
}

const program = Effect.gen(function* () {
  console.log(`\n[STREAM ERROR HANDLING] Resilient stream processing\n`);

  // Example 1: Continue on error (skip failed, process rest)
  console.log(`[1] Continue processing despite errors:\n`);

  const processElement = (record: DataRecord): Effect.Effect<string> =>
    Effect.gen(function* () {
      if (record.value < 0) {
        yield* Effect.fail(new Error(`Invalid value: ${record.value}`));
      }

      return `processed-${record.id}`;
    });

  const records = [
    { id: "rec1", value: 10 },
    { id: "rec2", value: -5 }, // Will fail
    { id: "rec3", value: 20 },
    { id: "rec4", value: -1 }, // Will fail
    { id: "rec5", value: 30 },
  ];

  const successfulProcessing = yield* Stream.fromIterable(records).pipe(
    Stream.mapEffect((record) =>
      processElement(record).pipe(
        Effect.map((result) => ({ success: true, result })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[ERROR] Record ${record.id} failed`);

            return { success: false, error };
          })
        )
      )
    ),
    Stream.runCollect
  );

  yield* Effect.log(
    `[RESULTS] ${successfulProcessing.filter((r) => r.success).length}/${records.length} succeeded\n`
  );

  // Example 2: Recover with fallback value
  console.log(`[2] Providing fallback on error:\n`);

  const getData = (id: string): Effect.Effect<number> =>
    id.includes("fail") ? Effect.fail(new Error("Data error")) : Effect.succeed(42);

  const recovered = yield* Stream.fromIterable(["ok1", "fail1", "ok2"]).pipe(
    Stream.mapEffect((id) =>
      getData(id).pipe(
        Effect.catchAll(() =>
          Effect.gen(function* () {
            yield* Effect.log(`[FALLBACK] Using default for ${id}`);

            return -1; // Fallback value
          })
        )
      )
    ),
    Stream.runCollect
  );

  yield* Effect.log(`[VALUES] ${recovered.join(", ")}\n`);

  // Example 3: Collect errors alongside successes
  console.log(`[3] Collecting errors and successes:\n`);

  const results = yield* Ref.make<ProcessingResult>({
    successful: [],
    failed: [],
    retried: 0,
  });

  yield* Stream.fromIterable(records).pipe(
    Stream.mapEffect((record) =>
      processElement(record).pipe(
        Effect.tap((result) =>
          Ref.modify(results, (r) => [
            undefined,
            {
              ...r,
              successful: [...r.successful, record],
            },
          ])
        ),
        Effect.catchAll((error) =>
          Ref.modify(results, (r) => [
            undefined,
            {
              ...r,
              failed: [
                ...r.failed,
                { id: record.id, error: error.message },
              ],
            },
          ])
        )
      )
    ),
    Stream.runDrain
  );

  const finalResults = yield* Ref.get(results);

  yield* Effect.log(
    `[AGGREGATE] ${finalResults.successful.length} succeeded, ${finalResults.failed.length} failed`
  );

  for (const failure of finalResults.failed) {
    yield* Effect.log(`  - ${failure.id}: ${failure.error}`);
  }

  // Example 4: Retry on error with backoff
  console.log(`\n[4] Retry with exponential backoff:\n`);

  let attemptCount = 0;

  const unreliableOperation = (id: string): Effect.Effect<string> =>
    Effect.gen(function* () {
      attemptCount++;

      if (attemptCount <= 2) {
        yield* Effect.log(`[ATTEMPT ${attemptCount}] Failing for ${id}`);

        yield* Effect.fail(new Error("Temporary failure"));
      }

      yield* Effect.log(`[SUCCESS] Succeeded on attempt ${attemptCount}`);

      return `result-${id}`;
    });

  const retried = unreliableOperation("test").pipe(
    Effect.retry(
      Schedule.exponential("10 millis").pipe(
        Schedule.upTo("100 millis"),
        Schedule.recurs(3)
      )
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[EXHAUSTED] All retries failed`);

        return "fallback";
      })
    )
  );

  yield* retried;

  // Example 5: Error context in streams
  console.log(`\n[5] Propagating error context:\n`);

  interface StreamContext {
    batchId: string;
    timestamp: Date;
  }

  const processWithContext = (context: StreamContext) =>
    Stream.fromIterable([1, 2, -3, 4]).pipe(
      Stream.mapEffect((value) =>
        Effect.gen(function* () {
          if (value < 0) {
            yield* Effect.fail(
              new Error(
                `Negative value in batch ${context.batchId} at ${context.timestamp.toISOString()}`
              )
            );
          }

          return value * 2;
        })
      ),
      Stream.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.log(`[CONTEXT ERROR] ${error.message}`);

          return Stream.empty;
        })
      )
    );

  const context: StreamContext = {
    batchId: "batch-001",
    timestamp: new Date(),
  };

  yield* processWithContext(context).pipe(Stream.runDrain);

  // Example 6: Partial recovery (keep good data, log bad)
  console.log(`\n[6] Partial recovery strategy:\n`);

  const mixedQuality = [
    { id: "1", data: "good" },
    { id: "2", data: "bad" },
    { id: "3", data: "good" },
    { id: "4", data: "bad" },
    { id: "5", data: "good" },
  ];

  const processQuality = (record: { id: string; data: string }) =>
    record.data === "good"
      ? Effect.succeed(`valid-${record.id}`)
      : Effect.fail(new Error(`Invalid data for ${record.id}`));

  const partialResults = yield* Stream.fromIterable(mixedQuality).pipe(
    Stream.mapEffect((record) =>
      processQuality(record).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[LOG] ${error.message}`);

            return null; // Skip this record
          })
        )
      )
    ),
    Stream.filter((result) => result !== null),
    Stream.runCollect
  );

  yield* Effect.log(
    `[PARTIAL] Kept ${partialResults.length}/${mixedQuality.length} valid records\n`
  );

  // Example 7: Timeout handling in streams
  console.log(`[7] Timeout handling per element:\n`);

  const slowOperation = (id: string): Effect.Effect<string> =>
    Effect.gen(function* () {
      // Simulate slow operations
      if (id === "slow") {
        yield* Effect.sleep("200 millis");
      } else {
        yield* Effect.sleep("50 millis");
      }

      return `done-${id}`;
    });

  const withTimeout = yield* Stream.fromIterable(["fast1", "slow", "fast2"]).pipe(
    Stream.mapEffect((id) =>
      slowOperation(id).pipe(
        Effect.timeout("100 millis"),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[TIMEOUT] Operation ${id} timed out`);

            return "timeout-fallback";
          })
        )
      )
    ),
    Stream.runCollect
  );

  yield* Effect.log(`[RESULTS] ${withTimeout.join(", ")}\n`);

  // Example 8: Stream termination on critical error
  console.log(`[8] Terminating stream on critical error:\n`);

  const isCritical = (error: Error): boolean =>
    error.message.includes("CRITICAL");

  const terminateOnCritical = Stream.fromIterable([1, 2, 3]).pipe(
    Stream.mapEffect((value) =>
      value === 2
        ? Effect.fail(new Error("CRITICAL: System failure"))
        : Effect.succeed(value)
    ),
    Stream.catchAll((error) =>
      Effect.gen(function* () {
        if (isCritical(error)) {
          yield* Effect.log(`[CRITICAL] Terminating stream`);

          return Stream.fail(error);
        }

        yield* Effect.log(`[WARNING] Continuing despite error`);

        return Stream.empty;
      })
    )
  );

  yield* terminateOnCritical.pipe(
    Stream.runCollect,
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[STOPPED] Stream stopped: ${error.message}`);

        return [];
      })
    )
  );
});

Effect.runPromise(program);
```

---

---

### Stream Pattern 8: Advanced Stream Transformations

**Rule:** Use advanced stream operators to build sophisticated data pipelines that compose elegantly and maintain performance at scale.

**Use Cases:** streams

**Why:**

Simple transformations don't scale:

**Problem 1: Performance degradation**
- Each layer creates intermediate collection
- 10 transformations = 10 allocations
- Process 1M items = 10M allocations
- GC pressure, memory exhaustion

**Problem 2: Complex logic scattered**
- Validation here, enrichment there, filtering elsewhere
- Hard to maintain
- Changes break other parts
- No clear data flow

**Problem 3: Effect handling**
- Transformations need side effects
- Network calls, database queries
- Naive approach: load all, transform sequentially
- Slow, inefficient

**Problem 4: Reusability**
- Custom transformation used once
- Next time, rewrite from scratch
- Code duplication
- Bugs replicated

Solutions:

**Custom operators**:
- Encapsulate transformation logic
- Reusable across projects
- Testable in isolation
- Composable

**Lazy evaluation**:
- Compute as elements flow
- No intermediate collections
- Constant memory
- Only compute what's used

**Fusion**:
- Combine multiple maps/filters
- Single pass through data
- No intermediate collections
- Compiler/library optimizes

**Effect composition**:
- Chain effects naturally
- Error propagation automatic
- Resource cleanup guaranteed
- Readable code

---

**Good Example:**

This example demonstrates advanced stream transformations.

```typescript
import { Effect, Stream, Ref, Chunk } from "effect";

interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
}

interface Metric {
  name: string;
  value: number;
  tags: Record<string, string>;
}

const program = Effect.gen(function* () {
  console.log(`\n[ADVANCED STREAM TRANSFORMATIONS] Complex data flows\n`);

  // Example 1: Custom filter operator
  console.log(`[1] Custom filter with effect-based logic:\n`);

  const filterByEffect = <A,>(
    predicate: (a: A) => Effect.Effect<boolean>
  ) =>
    (stream: Stream.Stream<A>) =>
      stream.pipe(
        Stream.mapEffect((value) =>
          predicate(value).pipe(
            Effect.map((keep) => (keep ? value : null))
          )
        ),
        Stream.filter((value) => value !== null)
      );

  const isValid = (num: number): Effect.Effect<boolean> =>
    Effect.gen(function* () {
      // Simulate validation effect (e.g., API call)
      return num > 0 && num < 100;
    });

  const numbers = [50, 150, 25, -10, 75];

  const validNumbers = yield* Stream.fromIterable(numbers).pipe(
    filterByEffect(isValid),
    Stream.runCollect
  );

  yield* Effect.log(`[VALID] ${validNumbers.join(", ")}\n`);

  // Example 2: Enrichment transformation
  console.log(`[2] Enriching records with additional data:\n`);

  interface RawRecord {
    id: string;
    value: number;
  }

  interface EnrichedRecord {
    id: string;
    value: number;
    validated: boolean;
    processed: Date;
    metadata: Record<string, unknown>;
  }

  const enrich = (record: RawRecord): Effect.Effect<EnrichedRecord> =>
    Effect.gen(function* () {
      // Simulate lookup/validation
      const validated = record.value > 0;

      return {
        id: record.id,
        value: record.value,
        validated,
        processed: new Date(),
        metadata: { source: "stream" },
      };
    });

  const rawData = [
    { id: "r1", value: 10 },
    { id: "r2", value: -5 },
    { id: "r3", value: 20 },
  ];

  const enriched = yield* Stream.fromIterable(rawData).pipe(
    Stream.mapEffect((record) => enrich(record)),
    Stream.runCollect
  );

  yield* Effect.log(`[ENRICHED] ${enriched.length} records enriched\n`);

  // Example 3: Demultiplexing (split one stream into multiple)
  console.log(`[3] Demultiplexing by category:\n`);

  interface Event {
    id: string;
    type: "click" | "view" | "purchase";
    data: unknown;
  }

  const events: Event[] = [
    { id: "e1", type: "click", data: { x: 100, y: 200 } },
    { id: "e2", type: "view", data: { url: "/" } },
    { id: "e3", type: "purchase", data: { amount: 99.99 } },
    { id: "e4", type: "click", data: { x: 50, y: 100 } },
  ];

  const clicks = yield* Stream.fromIterable(events).pipe(
    Stream.filter((e) => e.type === "click"),
    Stream.runCollect
  );

  const views = yield* Stream.fromIterable(events).pipe(
    Stream.filter((e) => e.type === "view"),
    Stream.runCollect
  );

  const purchases = yield* Stream.fromIterable(events).pipe(
    Stream.filter((e) => e.type === "purchase"),
    Stream.runCollect
  );

  yield* Effect.log(
    `[DEMUX] Clicks: ${clicks.length}, Views: ${views.length}, Purchases: ${purchases.length}\n`
  );

  // Example 4: Chunked processing (batch transformation)
  console.log(`[4] Chunked processing (batches of N):\n`);

  const processChunk = (chunk: Array<{ id: string; value: number }>) =>
    Effect.gen(function* () {
      const sum = chunk.reduce((s, r) => s + r.value, 0);
      const avg = sum / chunk.length;

      yield* Effect.log(
        `[CHUNK] ${chunk.length} items, avg: ${avg.toFixed(2)}`
      );

      return { size: chunk.length, sum, avg };
    });

  const data = Array.from({ length: 10 }, (_, i) => ({
    id: `d${i}`,
    value: i + 1,
  }));

  const chunkSize = 3;
  const chunks = [];

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);

    chunks.push(chunk);
  }

  const chunkResults = yield* Effect.all(
    chunks.map((chunk) => processChunk(chunk))
  );

  yield* Effect.log(
    `[CHUNKS] Processed ${chunkResults.length} batches\n`
  );

  // Example 5: Multi-stage transformation pipeline
  console.log(`[5] Multi-stage pipeline (parse → validate → transform):\n`);

  const rawStrings = ["10", "twenty", "30", "-5", "50"];

  // Stage 1: Parse
  const parsed = yield* Stream.fromIterable(rawStrings).pipe(
    Stream.mapEffect((s) =>
      Effect.gen(function* () {
        try {
          return parseInt(s);
        } catch (error) {
          yield* Effect.fail(
            new Error(`Failed to parse: ${s}`)
          );
        }
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[PARSE ERROR] ${error.message}`);

            return null;
          })
        )
      )
    ),
    Stream.filter((n) => n !== null),
    Stream.runCollect
  );

  yield* Effect.log(`[STAGE 1] Parsed: ${parsed.join(", ")}`);

  // Stage 2: Validate
  const validated = parsed.filter((n) => n > 0);

  yield* Effect.log(`[STAGE 2] Validated: ${validated.join(", ")}`);

  // Stage 3: Transform
  const transformed = validated.map((n) => n * 2);

  yield* Effect.log(`[STAGE 3] Transformed: ${transformed.join(", ")}\n`);

  // Example 6: Composition of custom operators
  console.log(`[6] Composable transformation pipeline:\n`);

  // Define custom operator
  const withLogging = <A,>(label: string) =>
    (stream: Stream.Stream<A>) =>
      stream.pipe(
        Stream.tap((value) =>
          Effect.log(`[${label}] Processing: ${JSON.stringify(value)}`)
        )
      );

  const filterPositive = (stream: Stream.Stream<number>) =>
    stream.pipe(
      Stream.filter((n) => n > 0),
      Stream.tap(() => Effect.log(`[FILTER] Kept positive`))
    );

  const scaleUp = (factor: number) =>
    (stream: Stream.Stream<number>) =>
      stream.pipe(
        Stream.map((n) => n * factor),
        Stream.tap((n) =>
          Effect.log(`[SCALE] Scaled to ${n}`)
        )
      );

  const testData = [10, -5, 20, -3, 30];

  const pipeline = yield* Stream.fromIterable(testData).pipe(
    withLogging("INPUT"),
    filterPositive,
    scaleUp(10),
    Stream.runCollect
  );

  yield* Effect.log(`[RESULT] Final: ${pipeline.join(", ")}\n`);

  // Example 7: Stateful transformation
  console.log(`[7] Stateful transformation (running total):\n`);

  const runningTotal = yield* Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
    Stream.scan(0, (acc, value) => acc + value),
    Stream.runCollect
  );

  yield* Effect.log(`[TOTALS] ${runningTotal.join(", ")}\n`);

  // Example 8: Conditional transformation
  console.log(`[8] Conditional transformation (different paths):\n`);

  interface Item {
    id: string;
    priority: "high" | "normal" | "low";
  }

  const transformByPriority = (item: Item): Effect.Effect<{
    id: string;
    processed: string;
  }> =>
    Effect.gen(function* () {
      switch (item.priority) {
        case "high":
          yield* Effect.log(`[HIGH] Priority processing for ${item.id}`);

          return { id: item.id, processed: "urgent" };

        case "normal":
          yield* Effect.log(
            `[NORMAL] Standard processing for ${item.id}`
          );

          return { id: item.id, processed: "standard" };

        case "low":
          yield* Effect.log(`[LOW] Deferred processing for ${item.id}`);

          return { id: item.id, processed: "deferred" };
      }
    });

  const items: Item[] = [
    { id: "i1", priority: "normal" },
    { id: "i2", priority: "high" },
    { id: "i3", priority: "low" },
  ];

  const processed = yield* Stream.fromIterable(items).pipe(
    Stream.mapEffect((item) => transformByPriority(item)),
    Stream.runCollect
  );

  yield* Effect.log(
    `[CONDITIONAL] Processed ${processed.length} items\n`
  );

  // Example 9: Performance-optimized transformation
  console.log(`[9] Optimized for performance:\n`);

  const largeDataset = Array.from({ length: 1000 }, (_, i) => i);

  const startTime = Date.now();

  // Use efficient operators
  const result = yield* Stream.fromIterable(largeDataset).pipe(
    Stream.filter((n) => n % 2 === 0), // Keep even
    Stream.take(100), // Limit to first 100
    Stream.map((n) => n * 2), // Transform
    Stream.runCollect
  );

  const elapsed = Date.now() - startTime;

  yield* Effect.log(
    `[PERF] Processed 1000 items in ${elapsed}ms, kept ${result.length} items`
  );
});

Effect.runPromise(program);
```

---

---

### Teach your AI Agents Effect with the MCP Server

**Rule:** Use the MCP server to provide live application context to AI coding agents, enabling more accurate assistance.

**Use Cases:** tooling-and-debugging

**Why:**

AI coding agents are powerful, but they often lack the deep, structural understanding of a complex Effect application. They might not know which services are available in the context, what a specific `Layer` provides, or how your feature modules are composed.

The MCP server solves this problem. It's a specialized server that runs alongside your application during development. It inspects your `AppLayer` and creates a real-time, queryable model of your entire application architecture.

An AI agent can then connect to this MCP server to ask specific questions before generating code, such as:

- "What services are available in the current context?"
- "What is the full API of the `UserService`?"
- "What errors can `UserRepository.findById` fail with?"

By providing this live, ground-truth context, you transform your AI from a generic coding assistant into a specialized expert on _your_ specific codebase, resulting in far more accurate and useful code generation and refactoring.

---

**Good Example:**

The "Good Example" is the workflow this pattern enables.

1.  **You run the MCP server** in your terminal, pointing it at your main `AppLayer`.

    ```bash
    npx @effect/mcp-server --layer src/layers.ts:AppLayer
    ```

2.  **You configure your AI agent** (e.g., Cursor) to use the MCP server's endpoint (`http://localhost:3333`).

3.  **You ask the AI a question** that requires deep context about your app:

    > "Refactor this code to use the `UserService` to fetch a user by ID and log the result with the `Logger`."

4.  **The AI, in the background, queries the MCP server:**

    - It discovers that `UserService` and `Logger` are available in the `AppLayer`.
    - It retrieves the exact method signature for `UserService.getUser` and `Logger.log`.

5.  **The AI generates correct, context-aware code** because it's not guessing; it's using the live architectural information provided by the MCP server.

```typescript
// The AI generates this correct code:
import { Effect } from "effect";
import { UserService } from "./features/User/UserService.js";
const program = Effect.gen(function* () {
  const userService = yield* UserService;

  const user = yield* userService.getUser("123");
  yield* Effect.log(`Found user: ${user.name}`);
});
```

---

**Anti-Pattern:**

Working with an AI agent without providing it with specific context. The agent will be forced to guess based on open files or generic knowledge. This often leads to it hallucinating method names, getting dependency injection wrong, or failing to handle specific error types, requiring you to manually correct its output and defeating the purpose of using an AI assistant.

---

### Test Concurrent Code

**Rule:** Use TestClock and controlled concurrency to make concurrent tests deterministic.

**Use Cases:** testing

**Why:**

Concurrent code is hard to test:

1. **Non-determinism** - Different runs, different results
2. **Race conditions** - Timing-dependent bugs
3. **Deadlocks** - Hard to reproduce
4. **Flaky tests** - Pass sometimes, fail others

Effect's test utilities provide control over timing and concurrency.

---

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Fiber, Ref, TestClock, Duration, Deferred } from "effect"

describe("Concurrent Code Testing", () => {
  // ============================================
  // 1. Test parallel execution
  // ============================================

  it("should run effects in parallel", async () => {
    const executionOrder: string[] = []

    const task1 = Effect.gen(function* () {
      yield* Effect.sleep("100 millis")
      executionOrder.push("task1")
      return 1
    })

    const task2 = Effect.gen(function* () {
      yield* Effect.sleep("50 millis")
      executionOrder.push("task2")
      return 2
    })

    const program = Effect.all([task1, task2], { concurrency: 2 })

    // Use TestClock to control time
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.fork(program)

        // Advance time to trigger both tasks
        yield* TestClock.adjust("100 millis")

        return yield* Fiber.join(fiber)
      }).pipe(Effect.provide(TestClock.live))
    )

    expect(result).toEqual([1, 2])
    // With real time, task2 would complete first
    expect(executionOrder).toContain("task1")
    expect(executionOrder).toContain("task2")
  })

  // ============================================
  // 2. Test race conditions
  // ============================================

  it("should handle race condition correctly", async () => {
    const counter = await Effect.runPromise(
      Effect.gen(function* () {
        const ref = yield* Ref.make(0)

        // Simulate concurrent increments
        const increment = Ref.update(ref, (n) => n + 1)

        // Run 100 concurrent increments
        yield* Effect.all(
          Array.from({ length: 100 }, () => increment),
          { concurrency: "unbounded" }
        )

        return yield* Ref.get(ref)
      })
    )

    // Ref is atomic, so all increments should be counted
    expect(counter).toBe(100)
  })

  // ============================================
  // 3. Test with controlled fiber execution
  // ============================================

  it("should test fiber lifecycle", async () => {
    const events: string[] = []

    const program = Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        Effect.gen(function* () {
          events.push("started")
          yield* Effect.sleep("1 second")
          events.push("completed")
          return "result"
        })
      )

      events.push("forked")

      // Interrupt the fiber
      yield* Fiber.interrupt(fiber)
      events.push("interrupted")

      const exit = yield* Fiber.await(fiber)
      return exit
    })

    await Effect.runPromise(program)

    expect(events).toEqual(["forked", "started", "interrupted"])
    expect(events).not.toContain("completed")
  })

  // ============================================
  // 4. Test timeout behavior
  // ============================================

  it("should timeout slow operations", async () => {
    const slowOperation = Effect.gen(function* () {
      yield* Effect.sleep("10 seconds")
      return "completed"
    })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.fork(
          slowOperation.pipe(Effect.timeout("1 second"))
        )

        // Advance past the timeout
        yield* TestClock.adjust("2 seconds")

        return yield* Fiber.join(fiber)
      }).pipe(Effect.provide(TestClock.live))
    )

    // Result is Option.None due to timeout
    expect(result._tag).toBe("None")
  })

  // ============================================
  // 5. Test with Deferred for synchronization
  // ============================================

  it("should synchronize fibers correctly", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const deferred = yield* Deferred.make<string>()
        const results: string[] = []

        // Consumer waits for producer
        const consumer = Effect.fork(
          Effect.gen(function* () {
            const value = yield* Deferred.await(deferred)
            results.push(`consumed: ${value}`)
          })
        )

        // Producer completes the deferred
        const producer = Effect.gen(function* () {
          results.push("producing")
          yield* Deferred.succeed(deferred, "data")
          results.push("produced")
        })

        yield* consumer
        yield* producer

        // Wait for consumer to process
        yield* Effect.sleep("10 millis")

        return results
      })
    )

    expect(result).toContain("producing")
    expect(result).toContain("produced")
    expect(result).toContain("consumed: data")
  })

  // ============================================
  // 6. Test for absence of deadlocks
  // ============================================

  it("should not deadlock with proper resource ordering", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const ref1 = yield* Ref.make(0)
        const ref2 = yield* Ref.make(0)

        // Two fibers accessing refs in same order (no deadlock)
        const fiber1 = yield* Effect.fork(
          Effect.gen(function* () {
            yield* Ref.update(ref1, (n) => n + 1)
            yield* Ref.update(ref2, (n) => n + 1)
          })
        )

        const fiber2 = yield* Effect.fork(
          Effect.gen(function* () {
            yield* Ref.update(ref1, (n) => n + 1)
            yield* Ref.update(ref2, (n) => n + 1)
          })
        )

        yield* Fiber.join(fiber1)
        yield* Fiber.join(fiber2)

        return [yield* Ref.get(ref1), yield* Ref.get(ref2)]
      }).pipe(Effect.timeout("1 second"))
    )

    expect(result._tag).toBe("Some")
    expect(result.value).toEqual([2, 2])
  })
})
```

---

### Test Streaming Effects

**Rule:** Use Stream.runCollect and assertions to verify stream behavior.

**Use Cases:** testing

**Why:**

Stream tests verify:

1. **Transformations** - map, filter, flatMap work correctly
2. **Error handling** - Failures are caught and handled
3. **Resource safety** - Resources are released
4. **Backpressure** - Data flow is controlled

---

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Stream, Chunk, Ref } from "effect"

describe("Stream Testing", () => {
  // ============================================
  // 1. Test basic stream operations
  // ============================================

  it("should transform stream elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.map((n) => n * 2),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([2, 4, 6, 8, 10])
  })

  it("should filter stream elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5, 6]).pipe(
        Stream.filter((n) => n % 2 === 0),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([2, 4, 6])
  })

  // ============================================
  // 2. Test stream aggregation
  // ============================================

  it("should fold stream to single value", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.runFold(0, (acc, n) => acc + n)
      )
    )

    expect(result).toBe(15)
  })

  it("should count stream elements", async () => {
    const count = await Effect.runPromise(
      Stream.fromIterable(["a", "b", "c", "d"]).pipe(
        Stream.runCount
      )
    )

    expect(count).toBe(4)
  })

  // ============================================
  // 3. Test error handling in streams
  // ============================================

  it("should catch errors in stream", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3]).pipe(
        Stream.mapEffect((n) =>
          n === 2
            ? Effect.fail(new Error("Failed on 2"))
            : Effect.succeed(n * 10)
        ),
        Stream.catchAll((error) =>
          Stream.succeed(-1)  // Replace error with sentinel
        ),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([10, -1])
  })

  it("should handle errors and continue with orElse", async () => {
    const failingStream = Stream.fail(new Error("Primary failed"))
    const fallbackStream = Stream.fromIterable([1, 2, 3])

    const result = await Effect.runPromise(
      failingStream.pipe(
        Stream.orElse(() => fallbackStream),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([1, 2, 3])
  })

  // ============================================
  // 4. Test stream chunking
  // ============================================

  it("should chunk stream elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.grouped(2),
        Stream.runCollect
      )
    )

    const chunks = Chunk.toReadonlyArray(result).map(Chunk.toReadonlyArray)
    expect(chunks).toEqual([[1, 2], [3, 4], [5]])
  })

  // ============================================
  // 5. Test stream with effects
  // ============================================

  it("should run effects for each element", async () => {
    const processed: number[] = []

    await Effect.runPromise(
      Stream.fromIterable([1, 2, 3]).pipe(
        Stream.tap((n) =>
          Effect.sync(() => {
            processed.push(n)
          })
        ),
        Stream.runDrain
      )
    )

    expect(processed).toEqual([1, 2, 3])
  })

  // ============================================
  // 6. Test stream resource management
  // ============================================

  it("should release resources on completion", async () => {
    const acquired: string[] = []
    const released: string[] = []

    const managedStream = Stream.acquireRelease(
      Effect.gen(function* () {
        acquired.push("resource")
        return "resource"
      }),
      () =>
        Effect.sync(() => {
          released.push("resource")
        })
    ).pipe(
      Stream.flatMap(() => Stream.fromIterable([1, 2, 3]))
    )

    await Effect.runPromise(Stream.runDrain(managedStream))

    expect(acquired).toEqual(["resource"])
    expect(released).toEqual(["resource"])
  })

  it("should release resources on error", async () => {
    const released: string[] = []

    const managedStream = Stream.acquireRelease(
      Effect.succeed("resource"),
      () => Effect.sync(() => { released.push("released") })
    ).pipe(
      Stream.flatMap(() =>
        Stream.fromEffect(Effect.fail(new Error("Oops")))
      )
    )

    await Effect.runPromise(
      Stream.runDrain(managedStream).pipe(
        Effect.catchAll(() => Effect.void)
      )
    )

    expect(released).toEqual(["released"])
  })

  // ============================================
  // 7. Test stream timing with take/drop
  // ============================================

  it("should take first N elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.take(3),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([1, 2, 3])
  })

  it("should drop first N elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.drop(2),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([3, 4, 5])
  })

  // ============================================
  // 8. Test stream merging
  // ============================================

  it("should merge streams", async () => {
    const stream1 = Stream.fromIterable([1, 3, 5])
    const stream2 = Stream.fromIterable([2, 4, 6])

    const result = await Effect.runPromise(
      Stream.merge(stream1, stream2).pipe(
        Stream.runCollect
      )
    )

    const array = Chunk.toReadonlyArray(result)
    expect(array).toHaveLength(6)
    expect(array).toContain(1)
    expect(array).toContain(6)
  })
})
```

---

### Understand Fibers as Lightweight Threads

**Rule:** Understand that a Fiber is a lightweight, virtual thread managed by the Effect runtime for massive concurrency.

**Use Cases:** concurrency

**Why:**

In traditional multi-threaded programming, each thread is managed by the operating system, consumes significant memory (for its stack), and involves expensive context switching. This limits the number of concurrent threads you can realistically create.

Effect's `Fiber`s are different. They are managed entirely by the Effect runtime, not the OS. They are incredibly lightweight data structures that don't have their own OS thread stack. The Effect runtime uses a cooperative scheduling mechanism to run many fibers on a small pool of OS threads (often just one in Node.js).

This model, known as M:N threading (M fibers on N OS threads), allows for a massive level of concurrency that is impossible with traditional threads. It's what makes Effect so powerful for building highly concurrent applications like servers, data pipelines, and real-time systems.

When you use operators like `Effect.fork` or `Effect.all`, you are creating new fibers.

---

**Good Example:**

This program demonstrates the efficiency of fibers by forking 100,000 of them. Each fiber does a small amount of work (sleeping for 1 second). Trying to do this with 100,000 OS threads would instantly crash any system.

```typescript
import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  // Demonstrate the lightweight nature of fibers by creating 100,000 of them
  // This would be impossible with OS threads due to memory and context switching overhead
  const fiberCount = 100_000;
  yield* Effect.log(`Forking ${fiberCount} fibers...`);

  // Create an array of 100,000 simple effects
  // Each effect sleeps for 1 second and then returns its index
  // This simulates lightweight concurrent tasks
  const tasks = Array.from({ length: fiberCount }, (_, i) =>
    Effect.sleep("1 second").pipe(Effect.as(i))
  );

  // Fork all of them into background fibers
  // Effect.fork creates a new fiber for each task without blocking
  // This demonstrates fiber creation scalability - 100k fibers created almost instantly
  // Each fiber is much lighter than an OS thread (typically ~1KB vs ~8MB per thread)
  const fibers = yield* Effect.forEach(tasks, Effect.fork);

  yield* Effect.log(
    "All fibers have been forked. Now waiting for them to complete..."
  );

  // Wait for all fibers to finish their work
  // Fiber.joinAll waits for all fibers to complete and collects their results
  // This demonstrates fiber coordination - managing thousands of concurrent operations
  // The runtime efficiently schedules these fibers using a work-stealing thread pool
  const results = yield* Fiber.joinAll(fibers);

  yield* Effect.log(`All ${results.length} fibers have completed.`);

  // Key insights from this example:
  // 1. Fibers are extremely lightweight - 100k fibers use minimal memory
  // 2. Fiber creation is fast - no expensive OS thread allocation
  // 3. The Effect runtime efficiently schedules fibers across available CPU cores
  // 4. Fibers can be suspended and resumed without blocking OS threads
  // 5. This enables massive concurrency for I/O-bound operations
});

// This program runs successfully, demonstrating the low overhead of fibers.
// Try running this with OS threads - you'd likely hit system limits around 1000-10000 threads
// With fibers, 100k+ concurrent operations are easily achievable
Effect.runPromise(program);
```

---

**Anti-Pattern:**

The anti-pattern is thinking that a `Fiber` is the same as an OS thread. This can lead to incorrect assumptions about performance and behavior.

- **Don't assume parallelism on CPU-bound tasks:** In a standard Node.js environment, all fibers run on a single OS thread. If you run 10 CPU-intensive tasks on 10 fibers, they will not run in parallel on 10 different CPU cores. They will share time on the single main thread. Fibers provide massive concurrency for I/O-bound tasks (like network requests), not CPU-bound parallelism.
- **Don't worry about blocking:** A `Fiber` that is "sleeping" or waiting for I/O (like `Effect.sleep` or a `fetch` request) does not block the underlying OS thread. The Effect runtime simply puts it aside and uses the thread to run other ready fibers.

---



---

# Part 2: Repository-Specific Guidance

No repository-specific guidance available (CLAUDE.md not found).