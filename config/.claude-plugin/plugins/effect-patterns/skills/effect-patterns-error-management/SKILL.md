---
name: effect-patterns-error-management
description: Effect-TS patterns for Error Management. Use when working with error management in Effect-TS applications.
---
# Effect-TS Patterns: Error Management
This skill provides 15 curated Effect-TS patterns for error management.
Use this skill when working on tasks related to:
- error management
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Pattern Match on Option and Either

**Rule:** Use Option.match() and Either.match() for declarative pattern matching on optional and error-prone values

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

**Rationale:**

When you need to handle `Option` or `Either` values, use the `.match()` combinator instead of imperative checks. The `.match()` method provides a declarative, exhaustive way to handle all cases (Some/None for Option, Right/Left for Either) in a single expression.

Use `.match()` when:
- You need to handle both success and failure cases
- You want type-safe pattern matching
- You prefer declarative over imperative code
- You need to transform values based on their case


The `.match()` combinator is superior to manual checks (`isSome()`, `isLeft()`) because:

1. **Declarative**: Expresses intent clearly - "match on these cases"
2. **Type-safe**: TypeScript ensures all cases are handled
3. **Exhaustive**: You can't accidentally miss a case
4. **Composable**: Works naturally with `.pipe()` for chaining operations
5. **Readable**: The structure mirrors the data type itself

Without `.match()`, you'd need imperative conditionals, which are harder to read and easier to get wrong.

---

### Your First Error Handler

**Rule:** Use catchAll or catchTag to recover from errors and keep your program running.

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

**Rationale:**

Handle errors in Effect using `catchAll` to catch any error, or `catchTag` to handle specific error types.

---


Effect makes errors explicit in your types:

1. **Errors are typed** - You know exactly what can fail
2. **Handle or propagate** - Can't accidentally ignore errors
3. **Recovery options** - Provide fallbacks, retry, or transform
4. **No try/catch** - Declarative error handling

---

---

### Matching on Success and Failure with match

**Rule:** Use match to pattern match on the result of an Effect, Option, or Either, handling both success and failure cases declaratively.

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

**Rationale:**

Use the `match` combinator to handle both success and failure cases in a single, declarative place.  
This works for `Effect`, `Option`, and `Either`, and is the foundation for robust, readable error handling and branching.


Pattern matching with `match` keeps your code clear and type-safe, ensuring you handle all possible outcomes.  
It avoids scattered if/else or switch statements and makes your intent explicit.

---

### Checking Option and Either Cases

**Rule:** Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe conditional logic.

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

**Rationale:**

Use the `isSome`, `isNone`, `isLeft`, and `isRight` predicates to check the case of an `Option` or `Either` for simple, type-safe branching.  
These are useful when you need to perform quick checks or filter collections based on presence or success.


These predicates provide a concise, type-safe way to check which case you have, without resorting to manual property checks or unsafe type assertions.

---


## 🟡 Intermediate Patterns

### Handle Errors with catchTag, catchTags, and catchAll

**Rule:** Handle errors with catchTag, catchTags, and catchAll.

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

**Rationale:**

To recover from failures, use the `catch*` family of functions.
`Effect.catchTag` for specific tagged errors, `Effect.catchTags` for multiple,
and `Effect.catchAll` for any error.


Effect's structured error handling allows you to build resilient applications.
By using tagged errors and `catchTag`, you can handle different failure
scenarios with different logic in a type-safe way.

---

### Mapping Errors to Fit Your Domain

**Rule:** Use Effect.mapError to transform errors and create clean architectural boundaries between layers.

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

**Rationale:**

When an inner service can fail with specific errors, use `Effect.mapError` in the outer service to catch those specific errors and transform them into a more general error suitable for its own domain.

---


This pattern is essential for creating clean architectural boundaries and preventing "leaky abstractions." An outer layer of your application (e.g., a `UserService`) should not expose the internal failure details of the layers it depends on (e.g., a `Database` that can fail with `ConnectionError` or `QueryError`).

By using `Effect.mapError`, the outer layer can define its own, more abstract error type (like `RepositoryError`) and map all the specific, low-level errors into it. This decouples the layers. If you later swap your database implementation, you only need to update the mapping logic within the repository layer; none of the code that _uses_ the repository needs to change.

---

---

### Control Repetition with Schedule

**Rule:** Use Schedule to create composable policies for controlling the repetition and retrying of effects.

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

**Rationale:**

A `Schedule<In, Out>` is a highly-composable blueprint that defines a recurring schedule. It takes an input of type `In` (e.g., the error from a failed effect) and produces an output of type `Out` (e.g., the decision to continue). Use `Schedule` with operators like `Effect.repeat` and `Effect.retry` to control complex repeating logic.

---


While you could write manual loops or recursive functions, `Schedule` provides a much more powerful, declarative, and composable way to manage repetition. The key benefits are:

- **Declarative:** You separate the _what_ (the effect to run) from the _how_ and _when_ (the schedule it runs on).
- **Composable:** You can build complex schedules from simple, primitive ones. For example, you can create a schedule that runs "up to 5 times, with an exponential backoff, plus some random jitter" by composing `Schedule.recurs`, `Schedule.exponential`, and `Schedule.jittered`.
- **Stateful:** A `Schedule` keeps track of its own state (like the number of repetitions), making it easy to create policies that depend on the execution history.

---

---

### Leverage Effect's Built-in Structured Logging

**Rule:** Leverage Effect's built-in structured logging.

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

**Rationale:**

Use the built-in `Effect.log*` family of functions for all application logging
instead of using `console.log`.


Effect's logger is structured, context-aware (with trace IDs), configurable
via `Layer`, and testable. It's a first-class citizen, not an unmanaged
side-effect.

---

### Matching Tagged Unions with matchTag and matchTags

**Rule:** Use matchTag and matchTags to handle specific cases of tagged unions or custom error types in a declarative, type-safe way.

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

**Rationale:**

Use the `matchTag` and `matchTags` combinators to pattern match on specific cases of tagged unions or custom error types.  
This enables precise, type-safe branching and is especially useful for handling domain-specific errors or ADTs.


Tagged unions (a.k.a. algebraic data types or ADTs) are a powerful way to model domain logic.  
Pattern matching on tags lets you handle each case explicitly, making your code robust, maintainable, and exhaustive.

---

### Conditionally Branching Workflows

**Rule:** Use predicate-based operators like Effect.filter and Effect.if to declaratively control workflow branching.

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

**Rationale:**

To make decisions based on a successful value within an `Effect` pipeline, use predicate-based operators:

- **To Validate and Fail:** Use `Effect.filterOrFail(predicate, onFailure)` to stop the workflow if a condition is not met.
- **To Choose a Path:** Use `Effect.if(condition, { onTrue, onFalse })` or `Effect.gen` to execute different effects based on a condition.

---


This pattern allows you to embed decision-making logic directly into your composition pipelines, making your code more declarative and readable. It solves two key problems:

1.  **Separation of Concerns:** It cleanly separates the logic of producing a value from the logic of validating or making decisions about that value.
2.  **Reusable Business Logic:** A predicate function (e.g., `const isAdmin = (user: User) => ...`) becomes a named, reusable, and testable piece of business logic, far superior to scattering inline `if` statements throughout your code.

Using these operators turns conditional logic into a composable part of your `Effect`, rather than an imperative statement that breaks the flow.

---

---

### Effectful Pattern Matching with matchEffect

**Rule:** Use matchEffect to pattern match on the result of an Effect, running effectful logic for both success and failure cases.

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

**Rationale:**

Use the `matchEffect` combinator to perform effectful branching based on whether an Effect succeeds or fails.  
This allows you to run different Effects for each case, enabling rich, composable workflows.


Sometimes, handling a success or failure requires running additional Effects (e.g., logging, retries, cleanup).  
`matchEffect` lets you do this declaratively, keeping your code composable and type-safe.

---

### Retry Operations Based on Specific Errors

**Rule:** Use predicate-based retry policies to retry an operation only for specific, recoverable errors.

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

**Rationale:**

To selectively retry an operation, use `Effect.retry` with a `Schedule` that includes a predicate. The most common way is to use `Schedule.whileInput((error) => ...)`, which will continue retrying only as long as the predicate returns `true` for the error that occurred.

---


Not all errors are created equal. Retrying on a permanent error like "permission denied" or "not found" is pointless and can hide underlying issues. You only want to retry on _transient_, recoverable errors, such as network timeouts or "server busy" responses.

By adding a predicate to your retry schedule, you gain fine-grained control over the retry logic. This allows you to build much more intelligent and efficient error handling systems that react appropriately to different failure modes. This is a common requirement for building robust clients for external APIs.

---

---

### Handling Specific Errors with catchTag and catchTags

**Rule:** Use catchTag and catchTags to handle specific tagged error types in the Effect failure channel, providing targeted recovery logic.

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

**Rationale:**

Use the `catchTag` and `catchTags` combinators to recover from or handle specific tagged error types in the Effect failure channel.  
This enables precise, type-safe error recovery and is especially useful for domain-specific error handling.


Not all errors should be handled the same way.  
By matching on specific error tags, you can provide targeted recovery logic for each error type, while letting unhandled errors propagate as needed.

---

### Handle Flaky Operations with Retries and Timeouts

**Rule:** Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing effects.

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

**Rationale:**

To build robust applications that can withstand unreliable external systems, apply two key operators to your effects:

- **`Effect.retry(policy)`**: To automatically re-run a failing effect according to a schedule.
- **`Effect.timeout(duration)`**: To interrupt an effect that takes too long to complete.

---


In distributed systems, failure is normal. APIs can fail intermittently, and network latency can spike. Hard-coding your application to try an operation only once makes it brittle.

- **Retries:** The `Effect.retry` operator, combined with a `Schedule` policy, provides a powerful, declarative way to handle transient failures. Instead of writing complex `try/catch` loops, you can simply define a policy like "retry 3 times, with an exponential backoff delay between attempts."

- **Timeouts:** An operation might not fail, but instead hang indefinitely. `Effect.timeout` prevents this by racing your effect against a timer. If your effect doesn't complete within the specified duration, it is automatically interrupted, preventing your application from getting stuck.

Combining these two patterns is a best practice for any interaction with an external service.

---

---


## 🟠 Advanced Patterns

### Handle Unexpected Errors by Inspecting the Cause

**Rule:** Handle unexpected errors by inspecting the cause.

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

**Rationale:**

To build truly resilient applications, differentiate between known business
errors (`Fail`) and unknown defects (`Die`). Use `Effect.catchAllCause` to
inspect the full `Cause` of a failure.


The `Cause` object explains _why_ an effect failed. A `Fail` is an expected
error (e.g., `ValidationError`). A `Die` is an unexpected defect (e.g., a
thrown exception). They should be handled differently.

---


