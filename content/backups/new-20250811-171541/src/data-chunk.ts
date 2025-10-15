import { Chunk, Effect } from 'effect';

const numbers = Chunk.make(1, 2, 3, 4);
const doubled = Chunk.map(numbers, (n) => n * 2);
const evens = Chunk.filter(numbers, (n) => n % 2 === 0);
const moreNumbers = Chunk.make(5, 6);
const allNumbers = Chunk.appendAll(numbers, moreNumbers);
const arr = Chunk.toArray(allNumbers);

const program = Effect.gen(function* () {
  yield* Effect.log(`numbers: [${Chunk.toArray(numbers).join(', ')}]`);
  yield* Effect.log(`doubled: [${Chunk.toArray(doubled).join(', ')}]`);
  yield* Effect.log(`evens: [${Chunk.toArray(evens).join(', ')}]`);
  yield* Effect.log(`allNumbers: [${arr.join(', ')}]`);
});

Effect.runPromise(program);
