import { Effect, Option, Either } from "effect";

const effect = Effect.fail("Something went wrong");
const option = Option.none();
const either = Either.left("Invalid input");

const program = Effect.gen(function* () {
  yield* Effect.either(effect).pipe(
    Effect.tap((res) =>
      Effect.log(
        `Effect.fail result: ${
          res._tag === "Left" ? `Error: ${res.left}` : res.right
        }`
      )
    )
  );
  yield* Effect.log(
    `Option.none result: ${Option.isNone(option) ? "None" : option.value}`
  );
  yield* Effect.log(
    `Either.left result: ${
      Either.isLeft(either) ? `Left: ${either.left}` : either.right
    }`
  );
});

Effect.runPromise(program);
