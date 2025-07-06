import { Effect, Stream, Schedule } from 'effect';

let attempts = 0;
// A mock function that simulates a flaky API call
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    yield* Effect.log(`Attempting to process item ${id}...`);
    if (id === 2 && attempts < 2) {
      attempts++;
      yield* Effect.log(`Item ${id} failed, attempt ${attempts}.`);
      return yield* Effect.fail(new Error('API is temporarily down'));
    }
    return `Successfully processed item ${id}`;
  });

const ids = [1, 2, 3];

// Define a retry policy: 3 attempts with a fixed 100ms delay
const retryPolicy = Schedule.recurs(3).pipe(Schedule.addDelay('100 millis'));

const program = Stream.fromIterable(ids).pipe(
  // Apply the processing function to each item
  Stream.mapEffect(processItem, { concurrency: 1 }),
  // Apply the retry policy to the entire stream
  Stream.retry(retryPolicy),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Attempting to process item 1..."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 1."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 2."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Attempting to process item 3..."
*/