import { Effect } from "effect";

const validateInput = (input: unknown) =>
  Effect.succeed({ email: "paul@example.com" }).pipe(
    Effect.delay("10 millis"),
    // This creates a child span
    Effect.withSpan("validateInput"),
  );

const saveToDatabase = (user: { email: string }) =>
  Effect.succeed({ id: 123, ...user }).pipe(
    Effect.delay("50 millis"),
    // This span includes useful attributes
    Effect.withSpan("saveToDatabase", {
      attributes: { "db.system": "postgresql", "db.user.email": user.email },
    }),
  );

const createUser = (input: unknown) =>
  Effect.gen(function* () {
    const validated = yield* validateInput(input);
    const user = yield* saveToDatabase(validated);
    return user;
  }).pipe(
    // This is the parent span for the entire operation
    Effect.withSpan("createUserOperation"),
  );

// When run with a tracing SDK, this will produce a trace with a root span
// "createUserOperation" and two child spans: "validateInput" and "saveToDatabase".
Effect.runPromise(createUser({}));