import { Data, Effect, Equal, HashSet } from 'effect';

const t1 = Data.tuple(1, 'Alice');
const t2 = Data.tuple(1, 'Alice');
const areEqual = Equal.equals(t1, t2);
const set = HashSet.make(t1);
const hasT2 = HashSet.has(set, t2);
const [id, name] = t1;

const program = Effect.gen(function* () {
  yield* Effect.log(`t1: [${t1[0]}, ${t1[1]}]`);
  yield* Effect.log(`t2: [${t2[0]}, ${t2[1]}]`);
  yield* Effect.log(`Equal.equals(t1, t2): ${areEqual}`);
  yield* Effect.log(`HashSet.has(set, t2): ${hasT2}`);
  yield* Effect.log(`Pattern matched tuple: id=${id}, name=${name}`);
});

Effect.runPromise(program);
