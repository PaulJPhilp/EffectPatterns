import { Data, Effect } from "effect";

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

// Simulate fetching user data
const fetchUser = (id: string): Effect.Effect<{ id: string; name: string }, NetworkError | NotFoundError> =>
  id === "invalid"
    ? Effect.fail(new NetworkError({ url: "/api/users/" + id, code: 500 }))
    : id === "missing"
    ? Effect.fail(new NotFoundError({ id }))
    : Effect.succeed({ id, name: "John Doe" });

// Validate user data
const validateUser = (user: { id: string; name: string }): Effect.Effect<string, ValidationError> =>
  user.name.length < 3
    ? Effect.fail(new ValidationError({ field: "name", message: "Name too short" }))
    : Effect.succeed(`User ${user.name} is valid`);

// Compose operations with error handling using catchTags
const program = (userId: string) =>
  fetchUser(userId)
    .pipe(
      Effect.flatMap(validateUser),
      Effect.catchTags({
        NetworkError: (e) => Effect.succeed(`Network error: ${e.code} for ${e.url}`),
        NotFoundError: (e) => Effect.succeed(`User ${e.id} not found`),
        ValidationError: (e) => Effect.succeed(`Invalid ${e.field}: ${e.message}`)
      })
    );

// Test with different scenarios
const testCases = ["valid", "invalid", "missing"];

const runTests = Effect.gen(function* (_) {
  const results = yield* Effect.forEach(
    testCases,
    id => Effect.gen(function* (_) {
      console.log(`\nTesting user ID: ${id}`);
      const result = yield* program(id);
      console.log(`Result: ${result}`);
      return result;
    })
  );
  return results;
});

// Run the program
Effect.runPromise(runTests).catch(console.error);