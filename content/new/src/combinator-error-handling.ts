import { Effect, Option, Either } from "effect";

// Effect: Recover from any error
const effect = Effect.fail("fail!").pipe(
  Effect.catchAll((err) => Effect.succeed(`Recovered from: ${err}`))
); // Effect<string>

// Option: Provide a fallback if value is None
const option = Option.none().pipe(Option.orElse(() => Option.some("default"))); // Option<string>

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