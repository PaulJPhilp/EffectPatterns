# Collections Patterns

## Creating from Collections

Use fromIterable and fromArray to lift collections into Streams or Effects for batch or streaming processing.

### Example

```typescript
import { Stream, Effect } from "effect";

// Stream: Create a stream from an array
const numbers = [1, 2, 3, 4];
const numberStream = Stream.fromIterable(numbers); // Stream<number>

// Stream: Create a stream from any iterable
function* gen() {
  yield "a";
  yield "b";
}
const letterStream = Stream.fromIterable(gen()); // Stream<string>

// Effect: Create an effect from an array of effects (batch)
const effects = [Effect.succeed(1), Effect.succeed(2)];
const batchEffect = Effect.all(effects); // Effect<[1, 2]>
```

**Explanation:**  
- `Stream.fromIterable` creates a stream from any array or iterable, enabling streaming and batch operations.
- `Effect.all` (covered elsewhere) can be used to process arrays of effects in batch.

---

## Mapping and Chaining over Collections with forEach and all

Use forEach and all to process collections of values with effectful functions, collecting results in a type-safe and composable way.

### Example

```typescript
import { Effect, Either, Option, Stream } from "effect";

// Effect: Apply an effectful function to each item in an array
const numbers = [1, 2, 3];
const effect = Effect.forEach(numbers, (n) => Effect.succeed(n * 2));
// Effect<number[]>

// Effect: Run multiple effects in parallel and collect results
const effects = [Effect.succeed(1), Effect.succeed(2)];
const allEffect = Effect.all(effects, { concurrency: "unbounded" }); // Effect<[1, 2]>

// Option: Map over a collection of options and collect only the Some values
const options = [Option.some(1), Option.none(), Option.some(3)];
const filtered = options.filter(Option.isSome).map((o) => o.value); // [1, 3]

// Either: Collect all Right values from a collection of Eithers
const eithers = [Either.right(1), Either.left("fail"), Either.right(3)];
const rights = eithers.filter(Either.isRight); // [Either.Right(1), Either.Right(3)]

// Stream: Map and flatten a stream of arrays
const stream = Stream.fromIterable([
  [1, 2],
  [3, 4],
]).pipe(Stream.flatMap((arr) => Stream.fromIterable(arr))); // Stream<number>

```

**Explanation:**  
`forEach` and `all` let you process collections in a way that is composable, type-safe, and often parallel.  
They handle errors and context automatically, and can be used for batch jobs, parallel requests, or data transformations.

---

## Use Chunk for High-Performance Collections

Use Chunk to model immutable, high-performance collections for efficient data processing and transformation.

### Example

```typescript
import { Chunk } from "effect";

// Create a Chunk from an array
const numbers = Chunk.fromIterable([1, 2, 3, 4]); // Chunk<number>

// Map and filter over a Chunk
const doubled = numbers.pipe(Chunk.map((n) => n * 2)); // Chunk<number>
const evens = numbers.pipe(Chunk.filter((n) => n % 2 === 0)); // Chunk<number>

// Concatenate Chunks
const moreNumbers = Chunk.fromIterable([5, 6]);
const allNumbers = Chunk.appendAll(numbers, moreNumbers); // Chunk<number>

// Convert back to array
const arr = Chunk.toReadonlyArray(allNumbers); // readonly number[]
```

**Explanation:**  
- `Chunk` is immutable and optimized for performance.
- It supports efficient batch operations, concatenation, and transformation.
- Use `Chunk` in data pipelines, streaming, and concurrent scenarios.

---

## Work with Immutable Sets using HashSet

Use HashSet to represent sets of unique values with efficient, immutable operations for membership, union, intersection, and difference.

### Example

```typescript
import { HashSet } from "effect";

// Create a HashSet from an array
const setA = HashSet.fromIterable([1, 2, 3]);
const setB = HashSet.fromIterable([3, 4, 5]);

// Membership check
const hasTwo = HashSet.has(setA, 2); // true

// Union, intersection, difference
const union = HashSet.union(setA, setB);         // HashSet {1, 2, 3, 4, 5}
const intersection = HashSet.intersection(setA, setB); // HashSet {3}
const difference = HashSet.difference(setA, setB);     // HashSet {1, 2}

// Add and remove elements
const withSix = HashSet.add(setA, 6);    // HashSet {1, 2, 3, 6}
const withoutOne = HashSet.remove(setA, 1); // HashSet {2, 3}
```

**Explanation:**  
- `HashSet` is immutable and supports efficient set operations.
- Use it for membership checks, set algebra, and modeling unique collections.
- Safe for concurrent and functional workflows.

---

## Working with Immutable Arrays using Data.array

Use Data.array to define arrays whose equality is based on their contents, enabling safe, predictable comparisons and functional operations.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal arrays
const arr1 = Data.array([1, 2, 3]);
const arr2 = Data.array([1, 2, 3]);

// Compare by value, not reference
const areEqual = Equal.equals(arr1, arr2); // true

// Use arrays as keys in a HashSet or Map
import { HashSet } from "effect";
const set = HashSet.make(arr1);
console.log(HashSet.has(set, arr2)); // true

// Functional operations (map, filter, etc.)
const doubled = arr1.map((n) => n * 2); // Data.array([2, 4, 6])
```

**Explanation:**  
- `Data.array` creates immutable arrays with value-based equality.
- Useful for modeling ordered collections in a safe, functional way.
- Supports all standard array operations, but with immutability and structural equality.

---

