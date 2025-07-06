import { Cause, Effect, Data } from "effect";

// Define our expected error types
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly operation: string;
  readonly details: string;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Simulate database operations that might fail in unexpected ways
const connectToDatabase = (config: { url: string }): Effect.Effect<{ success: true }, DatabaseError> => {
  if (!config.url) {
    return Effect.fail(new DatabaseError({
      operation: "connect",
      details: "Missing URL"
    }));
  }

  // Simulate unexpected errors (not our DatabaseError type)
  if (config.url === "invalid") {
    return Effect.sync(() => {
      throw new Error("Failed to parse connection string");
    });
  }

  if (config.url === "timeout") {
    return Effect.sync(() => {
      throw new Error("Connection timed out");
    });
  }

  return Effect.succeed({ success: true });
};

// Function that might throw unexpected errors
const parseUserData = (input: unknown): Effect.Effect<{ id: string; name: string }, ValidationError> =>
  Effect.try({
    try: () => {
      if (typeof input !== "object" || !input) {
        throw new ValidationError({
          field: "input",
          message: "Invalid input type"
        });
      }

      const data = input as Record<string, unknown>;
      
      if (typeof data.id !== "string" || typeof data.name !== "string") {
        throw new ValidationError({
          field: "input",
          message: "Missing required fields"
        });
      }

      return { id: data.id, name: data.name };
    },
    catch: (e) => {
      if (e instanceof ValidationError) {
        return e;
      }
      throw e;
    }
  });

// Helper to print cause details
const printCauseDetails = (prefix: string, cause: Cause.Cause<unknown>): Effect.Effect<void> =>
  Effect.sync(() => {
    console.log(`\n${prefix}:`);
    if (Cause.isDie(cause)) {
      const defect = Cause.failureOption(cause);
      if (defect._tag === "Some") {
        const error = defect.value as Error;
        console.log(" - Type: Defect (unexpected error)");
        console.log(` - Message: ${error.message}`);
        console.log(` - Stack: ${error.stack?.split('\n')[1]?.trim() ?? 'N/A'}`);
      }
    } else if (Cause.isFailure(cause)) {
      const error = Cause.failureOption(cause);
      console.log(" - Type: Expected failure");
      console.log(` - Error: ${JSON.stringify(error)}`);
    }
  });

// Define result type for better type safety
type TestError = { readonly _tag: "error"; readonly cause: Cause.Cause<unknown> };
type TestResult<A> = A | TestError;

// Test different scenarios
const testScenario = <E, A extends { [key: string]: any }>(
  name: string,
  program: Effect.Effect<A, E>
): Effect.Effect<void> =>
  Effect.gen(function* (_) {
    console.log(`\n=== Testing: ${name} ===`);
    
    const result = yield* Effect.catchAllCause(
      program,
      (cause): Effect.Effect<TestResult<A>> => Effect.succeed({ _tag: "error" as const, cause })
    );

    if ("cause" in result) {
      yield* printCauseDetails("Error details", result.cause);
    } else {
      console.log("Success:", result);
    }
  });

type TestCase = 
  | { name: string; program: Effect.Effect<{ success: true }, DatabaseError> }
  | { name: string; program: Effect.Effect<{ id: string; name: string }, ValidationError> };

// Run test scenarios
const dbTests = [
  { name: "Expected database error", program: connectToDatabase({ url: "" }) },
  { name: "Unexpected connection error", program: connectToDatabase({ url: "invalid" }) },
  { name: "Timeout error", program: connectToDatabase({ url: "timeout" }) }
] as const;

const userTests = [
  { name: "Valid user data", program: parseUserData({ id: "1", name: "John" }) },
  { name: "Invalid input type", program: parseUserData(null) }
] as const;

const runTests = Effect.all([
  Effect.forEach(dbTests, ({ name, program }) => testScenario(name, program)),
  Effect.forEach(userTests, ({ name, program }) => testScenario(name, program))
]);

// Run all tests
Effect.runPromise(runTests).catch(console.error);