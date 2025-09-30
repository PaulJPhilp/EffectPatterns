import { Data, Equal, Effect, HashSet } from "effect";

const arr1 = Data.array([1, 2, 3]);
const arr2 = Data.array([1, 2, 3]);

const areEqual = Equal.equals(arr1, arr2); // true

const set = HashSet.make(arr1);
const hasArr2 = HashSet.has(set, arr2); // true

const doubled = arr1.map((n) => n * 2); // Data.array([2, 4, 6])

const program = Effect.gen(function* () {
  yield* Effect.log(`arr1: [${arr1.join(", ")}]`);
  yield* Effect.log(`arr2: [${arr2.join(", ")}]`);
  yield* Effect.log(`Equal.equals(arr1, arr2): ${areEqual}`);
  yield* Effect.log(`HashSet.has(set, arr2): ${hasArr2}`);
  yield* Effect.log(`arr1.map(n => n * 2): [${doubled.join(", ")}]`);
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
