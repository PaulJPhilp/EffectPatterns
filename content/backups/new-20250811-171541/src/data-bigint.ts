import { Effect } from "effect";

const a: bigint = 9007199254740991n; // Number.MAX_SAFE_INTEGER
const b: bigint = 123456789012345678901234567890n;

const sum = a + b;
const product = a * b;

const program = Effect.gen(function* () {
  yield* Effect.log(`a: ${a}`);
  yield* Effect.log(`b: ${b}`);
  yield* Effect.log(`sum: ${sum}`);
  yield* Effect.log(`product: ${product}`);
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
