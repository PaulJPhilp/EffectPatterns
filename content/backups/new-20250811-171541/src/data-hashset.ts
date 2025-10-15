import { Effect, HashSet } from 'effect';

const setA = HashSet.fromIterable([1, 2, 3]);
const setB = HashSet.fromIterable([3, 4, 5]);
const hasTwo = HashSet.has(setA, 2);
const union = HashSet.union(setA, setB);
const intersection = HashSet.intersection(setA, setB);
const difference = HashSet.difference(setA, setB);
const withSix = HashSet.add(setA, 6);
const withoutOne = HashSet.remove(setA, 1);

const program = Effect.gen(function* () {
  yield* Effect.log(`setA: [${Array.from(setA).join(', ')}]`);
  yield* Effect.log(`setB: [${Array.from(setB).join(', ')}]`);
  yield* Effect.log(`setA has 2: ${hasTwo}`);
  yield* Effect.log(`union: [${Array.from(union).join(', ')}]`);
  yield* Effect.log(`intersection: [${Array.from(intersection).join(', ')}]`);
  yield* Effect.log(
    `difference (setA - setB): [${Array.from(difference).join(', ')}]`
  );
  yield* Effect.log(`withSix: [${Array.from(withSix).join(', ')}]`);
  yield* Effect.log(`withoutOne: [${Array.from(withoutOne).join(', ')}]`);
});

Effect.runPromise(program);
