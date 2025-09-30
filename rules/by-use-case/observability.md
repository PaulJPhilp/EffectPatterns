# Observability Patterns

## Add Custom Metrics to Your Application

Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

### Example

This example creates a counter to track how many times a user is created and a histogram to track the duration of the database operation.

```typescript
import { Effect, Metric, Duration } from "effect";  // We don't need MetricBoundaries anymore

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
  Effect.delay(Duration.millis(Math.random() * 100)),
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

---

## Trace Operations Across Services with Spans

Use Effect.withSpan to create custom tracing spans for important operations.

### Example

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

---

