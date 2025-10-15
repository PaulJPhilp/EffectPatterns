import { Effect } from 'effect';

function add(a: number, b: number): number {
  return a + b;
}

const addWithLogging = Effect.fn((a: number, b: number) =>
  Effect.gen(function* () {
    yield* Effect.log(`Calling add with ${a} and ${b}`);
    const result = add(a, b);
    yield* Effect.log(`Result: ${result}`);
    return result;
  })
);

const program = Effect.gen(function* () {
  const sum = yield* addWithLogging(2, 3);
  yield* Effect.log(`Sum is ${sum}`);
});

Effect.runPromise(program);
