import { Either, Effect } from "effect";

const success = Either.right(42);
const failure = Either.left("Something went wrong");

const result = success.pipe(
  Either.match({
    onLeft: (err) => `Error: ${err}`,
    onRight: (value) => `Value: ${value}`,
  })
);

const e1 = Either.right(1);
const e2 = Either.left("fail1");
const e3 = Either.left("fail2");

const all = [e1, e2, e3]
  .map(Either.getRight)
  .map((o) => (o._tag === "Some" ? o.value : undefined))
  .filter((v): v is number => v !== undefined);
const errors = [e1, e2, e3]
  .map(Either.getLeft)
  .map((o) => (o._tag === "Some" ? o.value : undefined))
  .filter((v): v is string => v !== undefined);

const program = Effect.gen(function* () {
  yield* Effect.log(`Either.right(42) match: ${result}`);
  yield* Effect.log(
    `Either.left('Something went wrong') match: ${failure.pipe(
      Either.match({
        onLeft: (err) => `Error: ${err}`,
        onRight: (value) => `Value: ${value}`,
      })
    )}`
  );
  yield* Effect.log(`Accumulated Right values: [${all.join(", ")}]`);
  yield* Effect.log(`Accumulated Left errors: [${errors.join(", ")}]`);
});

Effect.runPromise(program);
