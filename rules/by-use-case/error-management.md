# error-management Patterns

## Checking Option and Either Cases

Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe conditional logic.

### Example

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

---

## Conditionally Branching Workflows

Use predicate-based operators like Effect.filter and Effect.if to declaratively control workflow branching.

### Example

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
const isActive = (user: User): boolean =>
  user.status === "active";

const isAdmin = (user: User): boolean =>
  user.roles.includes("admin");

const program = (id: number): Effect.Effect<string, UserError> =>
  findUser(id).pipe(
    // Validate user is active using Effect.filterOrFail
    Effect.filterOrFail(
      isActive,
      () => "UserIsInactive" as const
    ),
    // Validate user is admin using Effect.filterOrFail
    Effect.filterOrFail(
      isAdmin,
      () => "UserIsNotAdmin" as const
    ),
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
    onSuccess: (result) => result
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

---

## Control Repetition with Schedule

Use Schedule to create composable policies for controlling the repetition and retrying of effects.

### Example

This example demonstrates composition by creating a common, robust retry policy: exponential backoff with jitter, limited to 5 attempts.

```typescript
import { Effect, Schedule, Duration } from "effect"

// A simple effect that can fail
const flakyEffect = Effect.try({
  try: () => {
    if (Math.random() > 0.2) {
      throw new Error("Transient error")
    }
    return "Operation succeeded!"
  },
  catch: (error: unknown) => {
    Effect.logInfo("Operation failed, retrying...")
    return error
  }
})

// --- Building a Composable Schedule ---

// 1. Start with a base exponential backoff (100ms, 200ms, 400ms...)
const exponentialBackoff = Schedule.exponential("100 millis")

// 2. Add random jitter to avoid thundering herd problems
const withJitter = Schedule.jittered(exponentialBackoff)

// 3. Limit the schedule to a maximum of 5 repetitions
const limitedWithJitter = Schedule.compose(
  withJitter,
  Schedule.recurs(5)
)

// --- Using the Schedule ---
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting operation...")
  const result = yield* Effect.retry(flakyEffect, limitedWithJitter)
  yield* Effect.logInfo(`Final result: ${result}`)
})

// Run the program
Effect.runPromise(program)
```

---

---

## Effectful Pattern Matching with matchEffect

Use matchEffect to pattern match on the result of an Effect, running effectful logic for both success and failure cases.

### Example

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

---

## Handle Errors with catchTag, catchTags, and catchAll

Handle errors with catchTag, catchTags, and catchAll.

### Example

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
}> { }

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> { }

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly id: string;
}> { }

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
}) { }

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

---

## Handle Flaky Operations with Retries and Timeouts

Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing effects.

### Example

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
}> { }

class TimeoutError extends Data.TaggedError("TimeoutError")<{
  readonly duration: string;
  readonly attempt: number;
}> { }

// Define API service
class ApiService extends Effect.Service<ApiService>()(
  "ApiService",
  {
    sync: () => ({
      // Flaky API call that might fail or be slow
      fetchData: (): Effect.Effect<ApiResponse, ApiError | TimeoutError> =>
        Effect.gen(function* () {
          const attempt = Math.floor(Math.random() * 5) + 1;
          yield* Effect.logInfo(`Attempt ${attempt}: Making API call...`);

          if (Math.random() > 0.3) {
            yield* Effect.logWarning(`Attempt ${attempt}: API call failed`);
            return yield* Effect.fail(new ApiError({
              message: "API Error",
              attempt
            }));
          }

          const delay = Math.random() * 3000;
          yield* Effect.logInfo(`Attempt ${attempt}: API call will take ${delay.toFixed(0)}ms`);

          yield* Effect.sleep(Duration.millis(delay));

          const response = { data: "some important data" };
          yield* Effect.logInfo(`Attempt ${attempt}: API call succeeded with data: ${JSON.stringify(response)}`);
          return response;
        })
    })
  }
) { }

// Define retry policy: exponential backoff, up to 3 retries
const retryPolicy = Schedule.exponential(Duration.millis(100)).pipe(
  Schedule.compose(Schedule.recurs(3)),
  Schedule.tapInput((error: ApiError | TimeoutError) =>
    Effect.logWarning(`Retrying after error: ${error._tag} (Attempt ${error.attempt})`)
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
            yield* Effect.logError(`All retries failed: ${error.message} (Last attempt: ${error.attempt})`);
            return { data: "fallback data due to API error" } as ApiResponse;
          }),
        TimeoutError: (error) =>
          Effect.gen(function* () {
            yield* Effect.logError(`All retries timed out after ${error.duration} (Last attempt: ${error.attempt})`);
            return { data: "fallback data due to timeout" } as ApiResponse;
          })
      })
    );

    yield* Effect.logInfo(`Result: ${JSON.stringify(result)}`);
  }

  yield* Effect.logInfo("\n=== API calls complete ===");
});

// Run the program
Effect.runPromise(
  Effect.provide(program, ApiService.Default)
);
```

---

---

## Handle Unexpected Errors by Inspecting the Cause

Handle unexpected errors by inspecting the cause.

### Example

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
      connect: (config: DatabaseConfig): Effect.Effect<DatabaseConnection, DatabaseError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Connecting to database: ${config.url}`);
          
          if (!config.url) {
            const error = new DatabaseError({
              operation: "connect",
              details: "Missing URL"
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
        })
    })
  }
) {}

// Define user service
class UserService extends Effect.Service<UserService>()(
  "UserService",
  {
    sync: () => ({
      // Parse user data with validation
      parseUser: (input: unknown): Effect.Effect<UserData, ValidationError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Parsing user data: ${JSON.stringify(input)}`);
          
          try {
            if (typeof input !== "object" || !input) {
              const error = new ValidationError({
                field: "input",
                message: "Invalid input type"
              });
              yield* Effect.logWarning(`Validation error: ${JSON.stringify(error)}`);
              throw error;
            }
            
            const data = input as Record<string, unknown>;
            
            if (typeof data.id !== "string" || typeof data.name !== "string") {
              const error = new ValidationError({
                field: "input",
                message: "Missing required fields"
              });
              yield* Effect.logWarning(`Validation error: ${JSON.stringify(error)}`);
              throw error;
            }
            
            const user = { id: data.id, name: data.name };
            yield* Effect.logInfo(`Successfully parsed user: ${JSON.stringify(user)}`);
            return user;
          } catch (e) {
            if (e instanceof ValidationError) {
              return yield* Effect.fail(e);
            }
            yield* Effect.logError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
            throw e;
          }
        })
    })
  }
) {}

// Define test service
class TestService extends Effect.Service<TestService>()(
  "TestService",
  {
    sync: () => {
      // Create instance methods
      const printCause = (prefix: string, cause: Cause.Cause<unknown>): Effect.Effect<void, never, never> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`\n=== ${prefix} ===`);
          
          if (Cause.isDie(cause)) {
            const defect = Cause.failureOption(cause);
            if (defect._tag === "Some") {
              const error = defect.value as Error;
              yield* Effect.logError("Defect (unexpected error)");
              yield* Effect.logError(`Message: ${error.message}`);
              yield* Effect.logError(`Stack: ${error.stack?.split('\n')[1]?.trim() ?? 'N/A'}`);
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
          
          type TestError = { readonly _tag: "error"; readonly cause: Cause.Cause<E> };
          
          const result = yield* Effect.catchAllCause(
            program,
            (cause) => Effect.succeed({ _tag: "error" as const, cause } as TestError)
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
        runScenario
      };
    }
  }
) {}

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
        Effect.catchAllCause(cause =>
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
      const result = yield* users.parseUser({ id: "1", name: "John" }).pipe(
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
      const results = yield* Effect.all([
        db.connect({ url: "" }).pipe(
          Effect.timeout(Duration.seconds(1)),
          Effect.catchAll(() => Effect.succeed({ success: true }))
        ),
        users.parseUser({ id: "invalid" }).pipe(
          Effect.timeout(Duration.seconds(1)),
          Effect.catchAll(() => Effect.succeed({ id: "timeout", name: "Timeout" }))
        )
      ], { concurrency: 2 });
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
      Effect.provide(
        program,
        TestService.Default
      ),
      DatabaseService.Default
    ),
    UserService.Default
  )
);
```

**Explanation:**  
By inspecting the `Cause`, you can distinguish between expected and unexpected
failures, logging or escalating as appropriate.

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
const option = Option.none().pipe(
  Option.orElse(() => Option.some("default"))
); // Option<string>

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

## Leverage Effect's Built-in Structured Logging

Leverage Effect's built-in structured logging.

### Example

```typescript
import { Effect } from "effect";

const program = Effect.logDebug("Processing user", { userId: 123 });

// Run the program with debug logging enabled
Effect.runSync(
  program.pipe(
    Effect.tap(() => Effect.log("Debug logging enabled"))
  )
);
```

**Explanation:**  
Using Effect's logging system ensures your logs are structured, filterable,
and context-aware.

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

## Mapping Errors to Fit Your Domain

Use Effect.mapError to transform errors and create clean architectural boundaries between layers.

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
        if (error.cause instanceof ConnectionError || error.cause instanceof QueryError) {
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

---

## Matching on Success and Failure with match

Use match to pattern match on the result of an Effect, Option, or Either, handling both success and failure cases declaratively.

### Example

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

## Retry Operations Based on Specific Errors

Use predicate-based retry policies to retry an operation only for specific, recoverable errors.

### Example

This example simulates an API client that can fail with different, specific error types. The retry policy is configured to *only* retry on `ServerBusyError` and give up immediately on `NotFoundError`.

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

---

## Wrapping Synchronous and Asynchronous Computations

Use try and tryPromise to lift code that may throw or reject into Effect, capturing errors in the failure channel.

### Example

```typescript
import { Effect } from "effect";

// Synchronous: Wrap code that may throw
const effectSync = Effect.try({
  try: () => JSON.parse("{ invalid json }"),
  catch: (error) => `Parse error: ${String(error)}`
}); // Effect<string, never, never>

// Asynchronous: Wrap a promise that may reject
const effectAsync = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then(res => res.json()),
  catch: (error) => `Network error: ${String(error)}`
}); // Effect<string, any, never>
```

**Explanation:**  
- `Effect.try` wraps a synchronous computation that may throw, capturing the error in the failure channel.
- `Effect.tryPromise` wraps an async computation (Promise) that may reject, capturing the rejection as a failure.

---

