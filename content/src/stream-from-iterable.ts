import { Effect, Stream, Chunk } from 'effect';

const numbers = [1, 2, 3, 4, 5];

// Create a stream from the array of numbers.
const program = Stream.fromIterable(numbers).pipe(
  // Perform a simple, synchronous transformation on each item.
  Stream.map((n) => `Item: ${n}`),
  // Run the stream and collect all the transformed items into a Chunk.
  Stream.runCollect
);

Effect.runPromise(program).then((processedItems) => {
  console.log(Chunk.toArray(processedItems));
});
/*
Output:
[ 'Item: 1', 'Item: 2', 'Item: 3', 'Item: 4', 'Item: 5' ]
*/