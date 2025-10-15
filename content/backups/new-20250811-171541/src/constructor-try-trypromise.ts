import { Effect } from 'effect';

const effectSync = Effect.try({
  try: () => JSON.parse('{ invalid json }'),
  catch: (error) => `Parse error: ${String(error)}`,
});

const effectAsync = Effect.tryPromise({
  try: () => fetch('https://api.example.com/data').then((res) => res.json()),
  catch: (error) => `Network error: ${String(error)}`,
});

const program = Effect.gen(function* () {
  yield* Effect.either(effectSync).pipe(
    Effect.tap((res) =>
      Effect.log(
        `Effect.try result: ${
          res._tag === 'Left' ? `Error: ${res.left}` : res.right
        }`
      )
    )
  );
  yield* Effect.either(effectAsync).pipe(
    Effect.tap((res) =>
      Effect.log(
        `Effect.tryPromise result: ${
          res._tag === 'Left' ? `Error: ${res.left}` : res.right
        }`
      )
    )
  );
});

Effect.runPromise(program);
