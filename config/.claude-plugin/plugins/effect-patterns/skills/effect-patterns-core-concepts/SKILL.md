---
name: effect-patterns-core-concepts
description: Effect-TS patterns for Core Concepts. Use when working with core concepts in Effect-TS applications.
---
# Effect-TS Patterns: Core Concepts
This skill provides 49 curated Effect-TS patterns for core concepts.
Use this skill when working on tasks related to:
- core concepts
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Combining Values with zip

**Rule:** Use zip to run two computations and combine their results into a tuple, preserving error and context handling.

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

**Rationale:**

Use the `zip` combinator to combine two computations, pairing their results together.  
This works for `Effect`, `Stream`, `Option`, and `Either`, and is useful when you want to run two computations and work with both results.


`zip` lets you compose computations that are independent but whose results you want to use together.  
It preserves error handling and context, and keeps your code declarative and type-safe.

---

### Creating from Synchronous and Callback Code

**Rule:** Use sync and async to create Effects from synchronous or callback-based computations, making them composable and type-safe.

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

**Rationale:**

Use the `sync` and `async` constructors to lift synchronous or callback-based computations into the Effect world.  
This enables safe, composable interop with legacy or third-party code that doesn't use Promises or Effects.


Many APIs are synchronous or use callbacks instead of Promises.  
By lifting them into Effects, you gain access to all of Effect's combinators, error handling, and resource safety.

---

### Model Optional Values Safely with Option

**Rule:** Use Option to model values that may be present or absent, making absence explicit and type-safe.

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

**Rationale:**

Use the `Option<A>` data type to represent values that may or may not exist.  
This eliminates the need for `null` or `undefined`, making absence explicit and type-safe.


`Option` makes it impossible to forget to handle the "no value" case.  
It improves code safety, readability, and composability, and is a foundation for robust domain modeling.

---

### Comparing Data by Value with Structural Equality

**Rule:** Use Data.struct or implement the Equal interface for value-based comparison of objects and classes.

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

**Rationale:**

To compare objects or classes by their contents rather than by their memory reference, use one of two methods:

1.  **For plain data objects:** Define them with `Data.struct`.
2.  **For classes:** Extend `Data.Class` or implement the `Equal.Equal` interface.

Then, compare instances using the `Equal.equals(a, b)` function.

---


In JavaScript, comparing two non-primitive values with `===` checks for _referential equality_. It only returns `true` if they are the exact same instance in memory. This means two objects with identical contents are not considered equal, which is a common source of bugs.

```typescript
{ a: 1 } === { a: 1 } // false!
```

Effect solves this with **structural equality**. All of Effect's built-in data structures (`Option`, `Either`, `Chunk`, etc.) can be compared by their structure and values. By using helpers like `Data.struct`, you can easily give your own data structures this same powerful and predictable behavior.

---

---

### Accumulate Multiple Errors with Either

**Rule:** Use Either to model computations that may fail, making errors explicit and type-safe.

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

**Rationale:**

Use the `Either<E, A>` data type to represent computations that can fail (`Left<E>`) or succeed (`Right<A>`).  
This makes error handling explicit, type-safe, and composable.


`Either` is a foundational data type for error handling in functional programming.  
It allows you to accumulate errors, model domain-specific failures, and avoid exceptions and unchecked errors.

---

### Lifting Values with succeed, some, and right

**Rule:** Use succeed, some, and right to create Effect, Option, or Either from plain values.

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

**Rationale:**

Use the `succeed`, `some`, and `right` constructors to lift plain values into the Effect, Option, or Either world.  
This is the foundation for building composable, type-safe programs.


Lifting values into these structures allows you to compose them with other effects, options, or eithers, and to take advantage of all the combinators and error handling that Effect provides.

---

### Understand that Effects are Lazy Blueprints

**Rule:** Understand that effects are lazy blueprints.

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

**Rationale:**

An `Effect` is not a value or a `Promise`. It is a lazy, immutable blueprint
that describes a computation. It does nothing on its own until it is passed to
a runtime executor (e.g., `Effect.runPromise` or `Effect.runSync`).


This laziness is a superpower because it makes your code composable,
predictable, and testable. Unlike a `Promise` which executes immediately,
an `Effect` is just a description of work, like a recipe waiting for a chef.

---

### Conditional Branching with if, when, and cond

**Rule:** Use combinators such as if, when, and cond to branch computations based on runtime conditions, without imperative if statements.

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

**Rationale:**

Use combinators like `if`, `when`, and `cond` to express conditional logic in a declarative, composable way.  
These combinators allow you to branch computations based on runtime conditions, without resorting to imperative `if` statements.


Declarative branching keeps your code composable, testable, and easy to reason about.  
It also ensures that error handling and context propagation are preserved, and that your code remains consistent across different Effect types.

---

### Transforming Values with map

**Rule:** Use map to apply a pure function to the value inside an Effect, Stream, Option, or Either.

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

**Rationale:**

Use the `map` combinator to apply a pure function to the value inside an `Effect`, `Stream`, `Option`, or `Either`.  
This lets you transform results without changing the structure or error-handling behavior of the original type.


`map` is the most fundamental combinator in functional programming.  
It allows you to focus on _what_ you want to do with a value, not _how_ to extract it.  
The same mental model applies across all major Effect types.

---

### Chaining Computations with flatMap

**Rule:** Use flatMap to sequence computations, flattening nested structures and preserving error and context handling.

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

**Rationale:**

Use the `flatMap` combinator to chain together computations where each step may itself return an `Effect`, `Stream`, `Option`, or `Either`.  
`flatMap` ensures that the result is always "flattened"—you never get nested types.


`flatMap` is the key to sequencing dependent steps in functional programming.  
It allows you to express workflows where each step may fail, be optional, or produce multiple results, and ensures that errors and context are handled automatically.

---

### Filtering Results with filter

**Rule:** Use filter to declaratively express conditional logic, keeping only values that satisfy a predicate.

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

**Rationale:**

Use the `filter` combinator to keep only those values that satisfy a predicate.  
This works for `Effect`, `Stream`, `Option`, and `Either`, allowing you to express conditional logic declaratively and safely.


`filter` lets you express "only continue if..." logic without resorting to manual checks or imperative branching.  
It keeps your code composable and type-safe, and ensures that failures or empty results are handled consistently.

---

### Comparing Data by Value with Data.struct

**Rule:** Use Data.struct to define objects whose equality is based on their contents, enabling safe and predictable comparisons.

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

**Rationale:**

Use `Data.struct` to create immutable, structurally-typed objects whose equality is based on their contents, not their reference.  
This enables safe, predictable comparisons and is ideal for domain modeling.


JavaScript objects are compared by reference, which can lead to subtle bugs when modeling value objects.  
`Data.struct` ensures that two objects with the same contents are considered equal, supporting value-based logic and collections.

---

### Wrap Asynchronous Computations with tryPromise

**Rule:** Wrap asynchronous computations with tryPromise.

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

**Rationale:**

To integrate a `Promise`-based function (like `fetch`), use `Effect.tryPromise`.


This is the standard bridge from the Promise-based world to Effect, allowing
you to leverage the massive `async/await` ecosystem safely.

---

### Write Sequential Code with Effect.gen

**Rule:** Write sequential code with Effect.gen.

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

**Rationale:**

For sequential operations that depend on each other, use `Effect.gen` to write
your logic in a familiar, imperative style. It's the Effect-native equivalent
of `async/await`.


`Effect.gen` uses generator functions to create a flat, linear, and highly
readable sequence of operations, avoiding the nested "callback hell" of
`flatMap`.

---

### Transform Effect Values with map and flatMap

**Rule:** Transform Effect values with map and flatMap.

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

**Rationale:**

To work with the success value of an `Effect`, use `Effect.map` for simple,
synchronous transformations and `Effect.flatMap` for effectful transformations.


`Effect.map` is like `Array.prototype.map`. `Effect.flatMap` is like
`Promise.prototype.then` and is used when your transformation function itself
returns an `Effect`.

---

### Converting from Nullable, Option, or Either

**Rule:** Use fromNullable, fromOption, and fromEither to lift nullable values, Option, or Either into Effects or Streams for safe, typeful interop.

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

**Rationale:**

Use the `fromNullable`, `fromOption`, and `fromEither` constructors to convert nullable values, `Option`, or `Either` into Effects or Streams.  
This enables safe, typeful interop with legacy code, APIs, or libraries that use `null`, `undefined`, or their own option/either types.


Converting to Effect, Stream, Option, or Either lets you use all the combinators, error handling, and resource safety of the Effect ecosystem, while avoiding the pitfalls of `null` and `undefined`.

---

### Create Pre-resolved Effects with succeed and fail

**Rule:** Create pre-resolved effects with succeed and fail.

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

**Rationale:**

To lift a pure, already-known value into an `Effect`, use `Effect.succeed()`.
To represent an immediate and known failure, use `Effect.fail()`.


These are the simplest effect constructors, essential for returning static
values within functions that must return an `Effect`.

---

### Wrapping Synchronous and Asynchronous Computations

**Rule:** Use try and tryPromise to lift code that may throw or reject into Effect, capturing errors in the failure channel.

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

**Rationale:**

Use the `try` and `tryPromise` constructors to safely wrap synchronous or asynchronous computations that may throw exceptions or reject promises.  
This captures errors in the Effect failure channel, making them type-safe and composable.


Wrapping potentially unsafe code in `try` or `tryPromise` ensures that all errors are handled in a uniform, declarative way.  
This eliminates the need for try/catch blocks and makes error handling explicit and type-safe.

---

### Solve Promise Problems with Effect

**Rule:** Recognize that Effect solves the core limitations of Promises: untyped errors, no dependency injection, and no cancellation.

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

**Rationale:**

Recognize that `Effect` is not just a "better Promise," but a fundamentally different construct designed to solve the core limitations of native `Promise`s in TypeScript:

1.  **Untyped Errors:** Promises can reject with `any` value, forcing `try/catch` blocks and unsafe type checks.
2.  **No Dependency Injection:** Promises have no built-in way to declare or manage dependencies, leading to tightly coupled code.
3.  **No Cancellation:** Once a `Promise` starts, it cannot be cancelled from the outside.

---


While `async/await` is great for simple cases, building large, robust applications with `Promise`s reveals these critical gaps. Effect addresses each one directly:

- **Typed Errors:** The `E` channel in `Effect<A, E, R>` forces you to handle specific, known error types, eliminating an entire class of runtime bugs.
- **Dependency Injection:** The `R` channel provides a powerful, built-in system for declaring and providing dependencies (`Layer`s), making your code modular and testable.
- **Cancellation (Interruption):** Effect's structured concurrency and `Fiber` model provide robust, built-in cancellation. When an effect is interrupted, Effect guarantees that its cleanup logic (finalizers) will be run.

Understanding that Effect was built specifically to solve these problems is key to appreciating its design and power.

---

---

### Creating from Collections

**Rule:** Use fromIterable and fromArray to lift collections into Streams or Effects for batch or streaming processing.

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

**Rationale:**

Use the `fromIterable` and `fromArray` constructors to create Streams or Effects from arrays, iterables, or other collections.  
This is the foundation for batch processing, streaming, and working with large or dynamic data sources.


Lifting collections into Streams or Effects allows you to process data in a composable, resource-safe, and potentially concurrent way.  
It also enables you to use all of Effect's combinators for transformation, filtering, and error handling.

---

### Working with Tuples using Data.tuple

**Rule:** Use Data.tuple to define tuples whose equality is based on their contents, enabling safe and predictable comparisons and pattern matching.

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

**Rationale:**

Use `Data.tuple` to create immutable, type-safe tuples that support value-based equality and pattern matching.  
This is useful for modeling fixed-size, heterogeneous collections of values in a safe and expressive way.


JavaScript arrays are mutable and compared by reference, which can lead to bugs in value-based logic.  
`Data.tuple` provides immutable tuples with structural equality, making them ideal for domain modeling and functional programming patterns.

---

### Lifting Errors and Absence with fail, none, and left

**Rule:** Use fail, none, and left to create Effect, Option, or Either that represent failure or absence.

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

**Rationale:**

Use the `fail`, `none`, and `left` constructors to represent errors or absence in the Effect, Option, or Either world.  
This makes failures explicit, type-safe, and composable.


By lifting errors and absence into these structures, you can handle them declaratively with combinators, rather than relying on exceptions, `null`, or `undefined`.  
This leads to more robust and maintainable code.

---

### Wrap Synchronous Computations with sync and try

**Rule:** Wrap synchronous computations with sync and try.

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

**Rationale:**

To bring a synchronous side-effect into Effect, wrap it in a thunk (`() => ...`).
Use `Effect.sync` for functions guaranteed not to throw, and `Effect.try` for
functions that might throw.


This is the primary way to safely integrate with synchronous libraries like
`JSON.parse`. `Effect.try` captures any thrown exception and moves it into
the Effect's error channel.

---

### Use .pipe for Composition

**Rule:** Use .pipe for composition.

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

**Rationale:**

To apply a sequence of transformations or operations to an `Effect`, use the
`.pipe()` method.


Piping makes code readable and avoids deeply nested function calls. It allows
you to see the flow of data transformations in a clear, linear fashion.

---

### Understand the Three Effect Channels (A, E, R)

**Rule:** Understand that an Effect<A, E, R> describes a computation with a success type (A), an error type (E), and a requirements type (R).

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

**Rationale:**

Every `Effect` has three generic type parameters: `Effect<A, E, R>` which represent its three "channels":

- **`A` (Success Channel):** The type of value the `Effect` will produce if it succeeds.
- **`E` (Error/Failure Channel):** The type of error the `Effect` can fail with. These are expected, recoverable errors.
- **`R` (Requirement/Context Channel):** The services or dependencies the `Effect` needs to run.

---


This three-channel signature is what makes Effect so expressive and safe. Unlike a `Promise<A>` which can only describe its success type, an `Effect`'s signature tells you everything you need to know about a computation before you run it:

1.  **What it produces (`A`):** The data you get on the "happy path."
2.  **How it can fail (`E`):** The specific, known errors you need to handle. This makes error handling type-safe and explicit, unlike throwing generic `Error`s.
3.  **What it needs (`R`):** The "ingredients" or dependencies required to run the effect. This is the foundation of Effect's powerful dependency injection system. An `Effect` can only be executed when its `R` channel is `never`, meaning all its dependencies have been provided.

This turns the TypeScript compiler into a powerful assistant that ensures you've handled all possible outcomes and provided all necessary dependencies.

---

---

### Working with Immutable Arrays using Data.array

**Rule:** Use Data.array to define arrays whose equality is based on their contents, enabling safe, predictable comparisons and functional operations.

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

**Rationale:**

Use `Data.array` to create immutable, type-safe arrays that support value-based equality and safe functional operations.  
This is useful for modeling ordered collections where immutability and structural equality are important.


JavaScript arrays are mutable and compared by reference, which can lead to bugs in value-based logic and concurrent code.  
`Data.array` provides immutable arrays with structural equality, making them ideal for functional programming and safe domain modeling.

---


## 🟡 Intermediate Patterns

### Representing Time Spans with Duration

**Rule:** Use Duration to model and manipulate time spans, enabling safe and expressive time-based logic.

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

**Rationale:**

Use the `Duration` data type to represent and manipulate time intervals in a type-safe, human-readable, and composable way.  
This enables robust time-based logic for scheduling, retries, timeouts, and more.


Working with raw numbers for time intervals (e.g., milliseconds) is error-prone and hard to read.  
`Duration` provides a clear, expressive API for modeling time spans, improving code safety and maintainability.

---

### Use Chunk for High-Performance Collections

**Rule:** Use Chunk to model immutable, high-performance collections for efficient data processing and transformation.

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

**Rationale:**

Use the `Chunk<A>` data type as an immutable, high-performance alternative to JavaScript's `Array`.  
`Chunk` is optimized for functional programming, batch processing, and streaming scenarios.


`Chunk` provides efficient, immutable operations for large or frequently transformed collections.  
It avoids the pitfalls of mutable arrays and is designed for use in concurrent and streaming workflows.

---

### Work with Immutable Sets using HashSet

**Rule:** Use HashSet to represent sets of unique values with efficient, immutable operations for membership, union, intersection, and difference.

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

**Rationale:**

Use the `HashSet<A>` data type to represent sets of unique values with efficient, immutable operations.  
`HashSet` is ideal for membership checks, set algebra, and modeling collections where uniqueness matters.


`HashSet` provides high-performance, immutable set operations that are safe for concurrent and functional programming.  
It avoids the pitfalls of mutable JavaScript `Set` and is optimized for use in Effect workflows.

---

### Sequencing with andThen, tap, and flatten

**Rule:** Use sequencing combinators to run computations in order, perform side effects, or flatten nested structures, while preserving error and context handling.

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

**Rationale:**

Use sequencing combinators to run computations in order, perform side effects, or flatten nested structures.

- `andThen` runs one computation after another, ignoring the first result.
- `tap` runs a side-effecting computation with the result, without changing the value.
- `flatten` removes one level of nesting from nested structures.

These work for `Effect`, `Stream`, `Option`, and `Either`.


Sequencing is fundamental for expressing workflows.  
These combinators let you:

- Run computations in order (`andThen`)
- Attach logging, metrics, or other side effects (`tap`)
- Simplify nested structures (`flatten`)

All while preserving composability, error handling, and type safety.

---

### Handling Errors with catchAll, orElse, and match

**Rule:** Use error handling combinators to recover from failures, provide fallback values, or transform errors in a composable way.

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

**Rationale:**

Use combinators like `catchAll`, `orElse`, and `match` to handle errors declaratively.  
These allow you to recover from failures, provide fallback values, or transform errors, all while preserving composability and type safety.


Error handling is a first-class concern in functional programming.  
By using combinators, you keep error recovery logic close to where errors may occur, and avoid scattering try/catch or null checks throughout your code.

---

### Access Configuration from the Context

**Rule:** Access configuration from the Effect context.

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

**Rationale:**

Inside an `Effect.gen` block, use `yield*` on your `Config` object to access the resolved, type-safe configuration values from the context.


This allows your business logic to declaratively state its dependency on a piece of configuration. The logic is clean, type-safe, and completely decoupled from _how_ the configuration is provided.

---

### Redact and Handle Sensitive Data

**Rule:** Use Redacted to wrap sensitive values, preventing accidental exposure in logs or error messages.

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

**Rationale:**

Use the `Redacted` data type to securely handle sensitive data such as passwords, API keys, or tokens.  
`Redacted` ensures that secrets are not accidentally logged, serialized, or exposed in error messages.


Sensitive data should never appear in logs, traces, or error messages.  
`Redacted` provides a type-safe way to mark and protect secrets throughout your application.

---

### Modeling Effect Results with Exit

**Rule:** Use Exit to capture the outcome of an Effect, including success, failure, and defects, for robust error handling and coordination.

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

**Rationale:**

Use the `Exit<E, A>` data type to represent the result of running an `Effect`, capturing both success and failure (including defects) in a type-safe way.  
`Exit` is especially useful for coordinating concurrent workflows and robust error handling.


When running or supervising effects, you often need to know not just if they succeeded or failed, but _how_ they failed (e.g., error vs. defect).  
`Exit` provides a complete, type-safe summary of an effect's outcome.

---

### Work with Arbitrary-Precision Numbers using BigDecimal

**Rule:** Use BigDecimal to represent and compute with decimal numbers that require arbitrary precision, such as in finance or scientific domains.

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

**Rationale:**

Use the `BigDecimal` data type for decimal numbers that require arbitrary precision, such as financial or scientific calculations.  
This avoids rounding errors and loss of precision that can occur with JavaScript's native `number` type.


JavaScript's `number` type is a floating-point double, which can introduce subtle bugs in calculations that require exact decimal representation.  
`BigDecimal` provides precise, immutable arithmetic for critical domains.

---

### Representing Time Spans with Duration

**Rule:** Use the Duration data type to represent time intervals instead of raw numbers.

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

**Rationale:**

When you need to represent a span of time (e.g., for a delay, timeout, or schedule), use the `Duration` data type. Create durations with expressive constructors like `Duration.seconds(5)`, `Duration.minutes(10)`, or `Duration.millis(500)`.

---


Using raw numbers to represent time is a common source of bugs and confusion. When you see `setTimeout(fn, 5000)`, it's not immediately clear if the unit is seconds or milliseconds without prior knowledge of the API.

`Duration` solves this by making the unit explicit in the code. It provides a type-safe, immutable, and human-readable way to work with time intervals. This eliminates ambiguity and makes your code easier to read and maintain. Durations are used throughout Effect's time-based operators, such as `Effect.sleep`, `Effect.timeout`, and `Schedule`.

---

---

### Control Flow with Conditional Combinators

**Rule:** Use conditional combinators for control flow.

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

**Rationale:**

Use declarative combinators like `Effect.if`, `Effect.when`, and
`Effect.unless` to execute effects based on runtime conditions.


These combinators allow you to embed conditional logic directly into your
`.pipe()` compositions, maintaining a declarative style for simple branching.

---

### Process Streaming Data with Stream

**Rule:** Use Stream to model and process data that arrives over time in a composable, efficient way.

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

**Rationale:**

When dealing with a sequence of data that arrives asynchronously, model it as a `Stream`. A `Stream<A, E, R>` is like an asynchronous, effectful `Array`. It represents a sequence of values of type `A` that may fail with an error `E` and requires services `R`.

---


Some data sources don't fit the one-shot request/response model of `Effect`. For example:

- Reading a multi-gigabyte file from disk.
- Receiving messages from a WebSocket.
- Fetching results from a paginated API.

Loading all this data into memory at once would be inefficient or impossible. `Stream` solves this by allowing you to process the data in chunks as it arrives. It provides a rich API of composable operators (`map`, `filter`, `run`, etc.) that mirror those on `Effect` and `Array`, but are designed for streaming data. This allows you to build efficient, constant-memory data processing pipelines.

---

---

### Understand Layers for Dependency Injection

**Rule:** Understand that a Layer is a blueprint describing how to construct a service and its dependencies.

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

**Rationale:**

Think of a `Layer<R, E, A>` as a recipe for building a service. It's a declarative blueprint that specifies:

- **`A` (Output)**: The service it provides (e.g., `HttpClient`).
- **`R` (Requirements)**: The other services it needs to be built (e.g., `ConfigService`).
- **`E` (Error)**: The errors that could occur during its construction (e.g., `ConfigError`).

---


In Effect, you don't create service instances directly. Instead, you define `Layer`s that describe _how_ to create them. This separation of declaration from implementation is the core of Effect's powerful dependency injection (DI) system.

This approach has several key benefits:

- **Composability:** You can combine small, focused layers into a complete application layer (`Layer.merge`, `Layer.provide`).
- **Declarative Dependencies:** A layer's type signature explicitly documents its own dependencies, making your application's architecture clear and self-documenting.
- **Testability:** For testing, you can easily swap a "live" layer (e.g., one that connects to a real database) with a "test" layer (one that provides mock data) without changing any of your business logic.

---

---

### Type Classes for Equality, Ordering, and Hashing with Data.Class

**Rule:** Use Data.Class to define and derive type classes for your data types, supporting composable equality, ordering, and hashing.

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

**Rationale:**

Use `Data.Class` to derive or implement type classes for equality, ordering, and hashing for your custom data types.  
This enables composable, type-safe abstractions and allows your types to work seamlessly with Effect’s collections and algorithms.


Type classes like `Equal`, `Order`, and `Hash` provide a principled way to define how your types are compared, ordered, and hashed.  
This is essential for using your types in sets, maps, and for sorting or deduplication.

---

### Define a Type-Safe Configuration Schema

**Rule:** Define a type-safe configuration schema.

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

**Rationale:**

Define all external configuration values your application needs using the schema-building functions from `Effect.Config`, such as `Config.string` and `Config.number`.


This creates a single, type-safe source of truth for your configuration, eliminating runtime errors from missing or malformed environment variables and making the required configuration explicit.

---

### Use Chunk for High-Performance Collections

**Rule:** Prefer Chunk over Array for immutable collection operations within data processing pipelines for better performance.

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

**Rationale:**

For collections that will be heavily transformed with immutable operations (e.g., `map`, `filter`, `append`), use `Chunk<A>`. `Chunk` is Effect's implementation of a persistent and chunked vector that provides better performance than native arrays for these use cases.

---


JavaScript's `Array` is a mutable data structure. Every time you perform an "immutable" operation like `[...arr, newItem]` or `arr.map(...)`, you are creating a brand new array and copying all the elements from the old one. For small arrays, this is fine. For large arrays or in hot code paths, this constant allocation and copying can become a performance bottleneck.

`Chunk` is designed to solve this. It's an immutable data structure that uses structural sharing internally. When you append an item to a `Chunk`, it doesn't re-copy the entire collection. Instead, it creates a new `Chunk` that reuses most of the internal structure of the original, only allocating memory for the new data. This makes immutable appends and updates significantly faster.

---

---

### Modeling Tagged Unions with Data.case

**Rule:** Use Data.case to define tagged unions (ADTs) for modeling domain-specific states and enabling exhaustive pattern matching.

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

**Rationale:**

Use `Data.case` to create tagged unions (algebraic data types, or ADTs) for robust, type-safe domain modeling.  
Tagged unions make it easy to represent and exhaustively handle all possible states of your domain entities.


Modeling domain logic with tagged unions ensures that all cases are handled, prevents illegal states, and enables safe, exhaustive pattern matching.  
`Data.case` provides a concise, type-safe way to define and use ADTs in your application.

---

### Beyond the Date Type - Real World Dates, Times, and Timezones

**Rule:** Use the Clock service for testable time-based logic and immutable primitives for timestamps.

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

**Rationale:**

To handle specific points in time robustly in Effect, follow these principles:

1.  **Access "now" via the `Clock` service** (`Clock.currentTimeMillis`) instead of `Date.now()`.
2.  **Store and pass timestamps** as immutable primitives: `number` for UTC milliseconds or `string` for ISO 8601 format.
3.  **Perform calculations locally:** When you need to perform date-specific calculations (e.g., "get the day of the week"), create a `new Date(timestamp)` instance inside a pure computation, use it, and then discard it. Never hold onto mutable `Date` objects in your application state.

---


JavaScript's native `Date` object is a common source of bugs. It is mutable, its behavior can be inconsistent across different JavaScript environments (especially with timezones), and its reliance on the system clock makes time-dependent logic difficult to test.

Effect's approach solves these problems:

- The **`Clock` service** abstracts away the concept of "now." In production, the `Live` clock uses the system time. In tests, you can provide a `TestClock` that gives you complete, deterministic control over the passage of time.
- Using **primitive `number` or `string`** for timestamps ensures immutability and makes your data easy to serialize, store, and transfer.

This makes your time-based logic pure, predictable, and easy to test.

---

---

### Mapping and Chaining over Collections with forEach and all

**Rule:** Use forEach and all to process collections of values with effectful functions, collecting results in a type-safe and composable way.

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

**Rationale:**

Use the `forEach` and `all` combinators to apply an effectful function to every item in a collection and combine the results.  
This enables you to process lists, arrays, or other collections in a type-safe, composable, and often parallel way.


Batch and parallel processing are common in real-world applications.  
These combinators let you express "do this for every item" declaratively, without manual loops or imperative control flow, and they preserve error handling and context propagation.

---

### Provide Configuration to Your App via a Layer

**Rule:** Provide configuration to your app via a Layer.

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

**Rationale:**

Transform your configuration schema into a `Layer` using `Config.layer()` and provide it to your main application `Effect`.


Integrating configuration as a `Layer` plugs it directly into Effect's dependency injection system. This makes your configuration available anywhere in the program and dramatically simplifies testing by allowing you to substitute mock configuration.

---

### Work with Dates and Times using DateTime

**Rule:** Use DateTime to represent and manipulate dates and times in a type-safe, immutable, and time-zone-aware way.

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

**Rationale:**

Use the `DateTime` data type to represent and manipulate dates and times in a type-safe, immutable, and time-zone-aware way.  
This enables safe, precise, and reliable time calculations in your applications.


JavaScript's native `Date` is mutable, not time-zone-aware, and can be error-prone.  
`DateTime` provides an immutable, functional alternative with explicit time zone handling and robust APIs for time arithmetic.

---

### Manage Shared State Safely with Ref

**Rule:** Use Ref to safely manage shared, mutable state in concurrent and effectful programs.

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

**Rationale:**

Use the `Ref<A>` data type to model shared, mutable state in a concurrent environment.  
`Ref` provides atomic, thread-safe operations for reading and updating state in effectful programs.


Managing shared state with plain variables or objects is unsafe in concurrent or asynchronous code.  
`Ref` ensures all updates are atomic and free of race conditions, making your code robust and predictable.

---


## 🟠 Advanced Patterns

### Handle Unexpected Errors by Inspecting the Cause

**Rule:** Use Cause to inspect, analyze, and handle all possible failure modes of an Effect, including expected errors, defects, and interruptions.

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

**Rationale:**

Use the `Cause<E>` data type to get rich, structured information about errors and failures in your Effects.  
`Cause` captures not just expected errors, but also defects (unhandled exceptions), interruptions, and error traces.


Traditional error handling often loses information about _why_ a failure occurred.  
`Cause` preserves the full error context, enabling advanced debugging, error reporting, and robust recovery strategies.

---


