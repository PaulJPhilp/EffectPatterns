import { Data, Effect, Equal, HashSet } from 'effect';

const user1 = Data.struct({ id: 1, name: 'Alice' });
const user2 = Data.struct({ id: 1, name: 'Alice' });
const areEqual = Equal.equals(user1, user2);
const set = HashSet.make(user1);
const hasUser2 = HashSet.has(set, user2);

const program = Effect.gen(function* () {
  yield* Effect.log(`user1: ${JSON.stringify(user1)}`);
  yield* Effect.log(`user2: ${JSON.stringify(user2)}`);
  yield* Effect.log(`Equal.equals(user1, user2): ${areEqual}`);
  yield* Effect.log(`HashSet.has(set, user2): ${hasUser2}`);
});

Effect.runPromise(program);
