import { Effect, Stream, Chunk } from 'effect';

const program = Stream.range(1, 10).pipe(
  // Find all the even numbers
  Stream.filter((n) => n % 2 === 0),
  // Transform them into strings
  Stream.map((n) => `Even number: ${n}`),
  // Run the stream and collect the results
  Stream.runCollect
);

const programWithLogging = Effect.gen(function* () {
  const results = yield* program;
  yield* Effect.log(`Collected results: ${JSON.stringify(Chunk.toArray(results))}`);
  return results;
});

Effect.runPromise(programWithLogging);
/*
Output:
Collected results: [
  'Even number: 2',
  'Even number: 4',
  'Even number: 6',
  'Even number: 8',
  'Even number: 10'
]
*/