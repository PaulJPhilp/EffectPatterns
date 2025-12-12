import { Effect, Option, Either } from "effect";

// Effect: Lift a value into an Effect that always succeeds
const effect = Effect.succeed(42); // Effect<never, number, never>

// Option: Lift a value into an Option that is always Some
const option = Option.some("hello"); // Option<string>

// Either: Lift a value into an Either that is always Right
const either = Either.right({ id: 1 }); // Either<never, { id: number }>