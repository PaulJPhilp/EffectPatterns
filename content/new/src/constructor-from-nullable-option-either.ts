import { Effect, Option, Either } from "effect";

// Effect: Convert a nullable value to an Effect that may fail
const nullableValue: string | null = Math.random() > 0.5 ? "hello" : null;
const effect = Effect.fromNullable(nullableValue, () => "Value was null"); // Effect<string, string, never>

// Effect: Convert an Option to an Effect that may fail
const option = Option.some(42);
const effectFromOption = Option.match(option, {
  onNone: () => Effect.fail("No value"),
  onSome: (val) => Effect.succeed(val),
}); // Effect<string, number, never>

// Effect: Convert an Either to an Effect
const either = Either.right("success");
const effectFromEither = Either.match(either, {
  onLeft: (err) => Effect.fail(err),
  onRight: (val) => Effect.succeed(val),
}); // Effect<string, string, never>