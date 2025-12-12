import { Effect, Data } from "effect";

// Define a tagged error type
class NotFoundError extends Data.TaggedError("NotFoundError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
}> {}

type MyError = NotFoundError | ValidationError;

// Effect: Catch specific error tags
const effect = Effect.fail(
  new ValidationError({ message: "Invalid input" }) as MyError
).pipe(
  Effect.catchTags({
    NotFoundError: () => Effect.succeed("Not found!"),
    ValidationError: (err) => Effect.succeed(`Validation failed: ${err.message}`),
  })
); // Effect<string>