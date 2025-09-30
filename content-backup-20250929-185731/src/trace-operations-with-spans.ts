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
