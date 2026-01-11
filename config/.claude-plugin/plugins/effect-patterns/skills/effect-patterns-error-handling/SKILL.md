---
name: effect-patterns-error-handling
description: Effect-TS patterns for Error Handling. Use when working with error handling in Effect-TS applications.
---
# Effect-TS Patterns: Error Handling
This skill provides 3 curated Effect-TS patterns for error handling.
Use this skill when working on tasks related to:
- error handling
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟡 Intermediate Patterns

### Error Handling Pattern 1: Accumulating Multiple Errors

**Rule:** Use error accumulation to report all problems at once rather than failing early, critical for validation and batch operations.

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

**Rationale:**

Error accumulation strategies:

- **Collect errors**: Gather all failures before reporting
- **Fail late**: Continue processing despite errors
- **Contextual errors**: Keep error location/operation info
- **Error summary**: Aggregate for reporting
- **Partial success**: Return valid results + errors

Pattern: Use `Cause` aggregation, `Result` types, or custom error structures

---


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

---


## 🟠 Advanced Patterns

### Error Handling Pattern 2: Error Propagation and Chains

**Rule:** Use error propagation to preserve context through effect chains, enabling debugging and recovery at the right abstraction level.

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

**Rationale:**

Error propagation preserves context:

- **Cause chain**: Keep original error + context
- **Stack trace**: Preserve execution history
- **Error context**: Add operation name, parameters
- **Error mapping**: Transform errors between layers
- **Recovery points**: Decide where to handle errors

Pattern: Use `mapError()`, `tapError()`, `catchAll()`, `Cause.prettyPrint()`

---


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

---

### Error Handling Pattern 3: Custom Error Strategies

**Rule:** Use tagged errors and custom error types to enable type-safe error handling and business-logic-aware recovery strategies.

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

**Rationale:**

Custom error strategies enable business logic:

- **Tagged errors**: Effect.Data for type-safe errors
- **Error classification**: Retryable, transient, permanent
- **Domain semantics**: Business-meaning errors
- **Recovery strategies**: Different per error type
- **Error context**: Includes recovery hints

Pattern: Use `Data.TaggedError`, error discriminators, `catchTag()`

---


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

---


