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

## Handle Unexpected Errors by Inspecting the Cause
**Rule:** Handle unexpected errors by inspecting the cause.

### Example
```typescript
import { Cause, Effect } from "effect";

const programThatDies = Effect.sync(() => { throw new Error("bug!") });

const handled = programThatDies.pipe(
  Effect.catchAllCause((cause) => {
    if (Cause.isDie(cause)) {
      return Effect.logFatal("Caught a defect!", cause);
    }
    return Effect.failCause(cause);
  }),
);
```

**Explanation:**  
By inspecting the `Cause`, you can distinguish between expected and unexpected
failures, logging or escalating as appropriate.

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