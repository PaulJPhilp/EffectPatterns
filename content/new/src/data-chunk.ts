import { Chunk } from "effect";

// Create a Chunk from an array
const numbers = Chunk.unsafeFromArray([1, 2, 3, 4]); // Chunk<number>

// Map and filter over a Chunk
const doubled = numbers.pipe(Chunk.map((n: number) => n * 2)); // Chunk<number>
const evens = numbers.pipe(Chunk.filter((n: number) => n % 2 === 0)); // Chunk<number>

// Concatenate Chunks
const moreNumbers = Chunk.unsafeFromArray([5, 6]);
const allNumbers = numbers.pipe(Chunk.appendAll(moreNumbers)); // Chunk<number>

// Convert back to array
const arr = Array.from(allNumbers); // number[]