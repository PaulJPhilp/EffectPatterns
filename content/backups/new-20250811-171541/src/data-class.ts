import { Data, Effect, Equal, Hash, HashSet } from 'effect';

const User = Data.struct({ id: 1, name: 'Alice' });

const isEqual = Equal.equals(User, Data.struct({ id: 1, name: 'Alice' }));
const userHash = Hash.hash(User);

const set = HashSet.make(User);
const hasUser = HashSet.has(set, Data.struct({ id: 1, name: 'Alice' }));

const users = [Data.struct({ id: 2, name: 'Bob' }), User];
const sorted = users.sort((a, b) => a.id - b.id);

const program = Effect.gen(function* () {
  yield* Effect.log(`User: ${JSON.stringify(User)}`);
  yield* Effect.log(`Equal.equals(User, {id:1,name:'Alice'}): ${isEqual}`);
  yield* Effect.log(`Hash.hash(User): ${userHash}`);
  yield* Effect.log(`HashSet.has(set, {id:1,name:'Alice'}): ${hasUser}`);
  yield* Effect.log(
    `Sorted users by id: [${sorted.map((u) => u.name).join(', ')}]`
  );
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
