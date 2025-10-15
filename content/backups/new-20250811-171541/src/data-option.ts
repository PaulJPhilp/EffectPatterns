import { Effect, Option } from 'effect';

const someValue = Option.some(42);
const noValue = Option.none();
const fromNullable = Option.fromNullable(Math.random() > 0.5 ? 'hello' : null);

const result = someValue.pipe(
  Option.match({
    onNone: () => 'No value',
    onSome: (n) => `Value: ${n}`,
  })
);

function findUser(id: number): Option.Option<{ id: number; name: string }> {
  return id === 1 ? Option.some({ id, name: 'Alice' }) : Option.none();
}

const program = Effect.gen(function* () {
  yield* Effect.log(`Option.some(42) match: ${result}`);
  yield* Effect.log(
    `Option.none() match: ${noValue.pipe(
      Option.match({ onNone: () => 'No value', onSome: (n) => `Value: ${n}` })
    )}`
  );
  yield* Effect.log(
    `Option.fromNullable result: ${fromNullable.pipe(
      Option.match({ onNone: () => 'No value', onSome: (v) => `Value: ${v}` })
    )}`
  );
  const user = findUser(1);
  yield* Effect.log(
    `findUser(1): ${user.pipe(
      Option.match({
        onNone: () => 'User not found',
        onSome: (u) => `User: ${u.name}`,
      })
    )}`
  );
  const user2 = findUser(2);
  yield* Effect.log(
    `findUser(2): ${user2.pipe(
      Option.match({
        onNone: () => 'User not found',
        onSome: (u) => `User: ${u.name}`,
      })
    )}`
  );
});

Effect.runPromise(program);
