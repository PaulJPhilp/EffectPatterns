---
name: effect-patterns-building-data-pipelines
description: Effect-TS patterns for Building Data Pipelines. Use when working with building data pipelines in Effect-TS applications.
---
# Effect-TS Patterns: Building Data Pipelines
This skill provides 14 curated Effect-TS patterns for building data pipelines.
Use this skill when working on tasks related to:
- building data pipelines
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Create a Stream from a List

**Rule:** Use Stream.fromIterable to begin a pipeline from an in-memory collection.

**Good Example:**

This example takes a simple array of numbers, creates a stream from it, performs a transformation on each number, and then runs the stream to collect the results.

```typescript
import { Effect, Stream, Chunk } from "effect";

const numbers = [1, 2, 3, 4, 5];

// Create a stream from the array of numbers.
const program = Stream.fromIterable(numbers).pipe(
  // Perform a simple, synchronous transformation on each item.
  Stream.map((n) => `Item: ${n}`),
  // Run the stream and collect all the transformed items into a Chunk.
  Stream.runCollect
);

const programWithLogging = Effect.gen(function* () {
  const processedItems = yield* program;
  yield* Effect.log(
    `Processed items: ${JSON.stringify(Chunk.toArray(processedItems))}`
  );
  return processedItems;
});

Effect.runPromise(programWithLogging);
/*
Output:
[ 'Item: 1', 'Item: 2', 'Item: 3', 'Item: 4', 'Item: 5' ]
*/
```

**Anti-Pattern:**

The common alternative is to use standard array methods like `.map()` or a `for...of` loop. While perfectly fine for simple, synchronous tasks, this approach is an anti-pattern when building a _pipeline_.

```typescript
const numbers = [1, 2, 3, 4, 5];

// Using Array.prototype.map
const processedItems = numbers.map((n) => `Item: ${n}`);

console.log(processedItems);
```

This is an anti-pattern in the context of building a larger pipeline because:

1.  **It's Not Composable with Effects**: The result is just a new array. If the next step in your pipeline was an asynchronous database call for each item, you couldn't simply `.pipe()` the result into it. You would have to leave the synchronous world of `.map()` and start a new `Effect.forEach`, breaking the unified pipeline structure.
2.  **It's Eager**: The `.map()` operation processes the entire array at once. `Stream` is lazy; it only processes items as they are requested by downstream consumers, which is far more efficient for large collections or complex transformations.

**Rationale:**

To start a data pipeline from an existing in-memory collection like an array, use `Stream.fromIterable`.

---


Every data pipeline needs a source. The simplest and most common source is a pre-existing list of items in memory. `Stream.fromIterable` is the bridge from standard JavaScript data structures to the powerful, composable world of Effect's `Stream`.

This pattern is fundamental for several reasons:

1.  **Entry Point**: It's the "Hello, World!" of data pipelines, providing the easiest way to start experimenting with stream transformations.
2.  **Testing**: In tests, you frequently need to simulate a data source (like a database query or API call). Creating a stream from a mock array of data is the standard way to do this, allowing you to test your pipeline's logic in isolation.
3.  **Composability**: It transforms a static, eager data structure (an array) into a lazy, pull-based stream. This allows you to pipe it into the rest of the Effect ecosystem, enabling asynchronous operations, concurrency, and resource management in subsequent steps.

---

---

### Run a Pipeline for its Side Effects

**Rule:** Use Stream.runDrain to execute a stream for its side effects when you don't need the final values.

**Good Example:**

This example creates a stream of tasks. For each task, it performs a side effect (logging it as "complete"). `Stream.runDrain` executes the pipeline, ensuring all logs are written, but without collecting the `void` results of each logging operation.

```typescript
import { Effect, Stream } from "effect";

const tasks = ["task 1", "task 2", "task 3"];

// A function that performs a side effect for a task
const completeTask = (task: string): Effect.Effect<void, never> =>
  Effect.log(`Completing ${task}`);

const program = Stream.fromIterable(tasks).pipe(
  // For each task, run the side-effectful operation
  Stream.mapEffect(completeTask, { concurrency: 1 }),
  // Run the stream for its effects, discarding the `void` results
  Stream.runDrain
);

const programWithLogging = Effect.gen(function* () {
  yield* program;
  yield* Effect.log("\nAll tasks have been processed.");
});

Effect.runPromise(programWithLogging);
/*
Output:
... level=INFO msg="Completing task 1"
... level=INFO msg="Completing task 2"
... level=INFO msg="Completing task 3"

All tasks have been processed.
*/
```

**Anti-Pattern:**

The anti-pattern is using `Stream.runCollect` when you only care about the side effects. This needlessly consumes memory and can lead to crashes.

```typescript
import { Effect, Stream } from "effect";
// ... same tasks and completeTask function ...

const program = Stream.fromIterable(tasks).pipe(
  Stream.mapEffect(completeTask, { concurrency: 1 }),
  // Anti-pattern: Collecting results that we are just going to ignore
  Stream.runCollect
);

Effect.runPromise(program).then((results) => {
  // The `results` variable here is a Chunk of `[void, void, void]`.
  // It served no purpose but consumed memory.
  console.log(
    `\nAll tasks processed. Unnecessarily collected ${results.length} empty results.`
  );
});
```

While this works for a small array of three items, it's a dangerous habit. If the `tasks` array contained millions of items, this code would create a `Chunk` with millions of `void` values, consuming a significant amount of memory for no reason and potentially crashing the application. `Stream.runDrain` avoids this problem entirely.

**Rationale:**

To run a stream purely for its side effects without accumulating the results in memory, use the `Stream.runDrain` sink.

---


Not all pipelines are designed to produce a final list of values. Often, the goal is to perform an action for each item—write it to a database, send it to a message queue, or log it to a file. In these "fire and forget" scenarios, collecting the results is not just unnecessary; it's a performance anti-pattern.

`Stream.runDrain` is the perfect tool for this job:

1.  **Memory Efficiency**: This is its primary advantage. `runDrain` processes each item and then immediately discards it, resulting in constant, minimal memory usage. This makes it the only safe choice for processing extremely large or infinite streams.
2.  **Clarity of Intent**: Using `runDrain` clearly communicates that you are interested in the successful execution of the stream's effects, not in its output values. The final `Effect` it produces resolves to `void`, reinforcing that no value is returned.
3.  **Performance**: By avoiding the overhead of allocating and managing a growing list in memory, `runDrain` can be faster for pipelines with a very large number of small items.

---

---

### Collect All Results into a List

**Rule:** Use Stream.runCollect to execute a stream and collect all its emitted values into a Chunk.

**Good Example:**

This example creates a stream of numbers, filters for only the even ones, transforms them into strings, and then uses `runCollect` to gather the final results into a `Chunk`.

```typescript
import { Effect, Stream, Chunk } from "effect";

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
  yield* Effect.log(
    `Collected results: ${JSON.stringify(Chunk.toArray(results))}`
  );
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
```

**Anti-Pattern:**

The anti-pattern is using `Stream.runCollect` on a stream that produces an unbounded or extremely large number of items. This will inevitably lead to an out-of-memory error.

```typescript
import { Effect, Stream } from "effect";

// An infinite stream of numbers
const infiniteStream = Stream.range(1, Infinity);

const program = infiniteStream.pipe(
  // This will run forever, attempting to buffer an infinite number of items.
  Stream.runCollect
);

// This program will never finish and will eventually crash the process
// by consuming all available memory.
// Effect.runPromise(program);
console.log(
  "This code is commented out because it would cause an out-of-memory crash."
);
```

This is a critical mistake because `runCollect` must hold every single item emitted by the stream in memory simultaneously. For pipelines that process huge files, infinite data sources, or are designed to run forever, `runCollect` is the wrong tool. In those cases, you should use a sink like `Stream.runDrain`, which processes items without collecting them.

**Rationale:**

To execute a stream and collect all of its emitted values into a single, in-memory list, use the `Stream.runCollect` sink.

---


A "sink" is a terminal operator that consumes a stream and produces a final `Effect`. `Stream.runCollect` is the most fundamental sink. It provides the bridge from the lazy, pull-based world of `Stream` back to the familiar world of a single `Effect` that resolves with a standard data structure.

Using `Stream.runCollect` is essential when:

1.  **You Need the Final Result**: The goal of your pipeline is to produce a complete list of transformed items that you need to use in a subsequent step (e.g., to return as a single JSON array from an API).
2.  **Simplicity is Key**: It's the most straightforward way to "run" a stream and see its output. It declaratively states your intent: "execute this entire pipeline and give me all the results."
3.  **The Dataset is Bounded**: It's designed for streams where the total number of items is known to be finite and small enough to fit comfortably in memory.

The result of `Stream.runCollect` is an `Effect` that, when executed, yields a `Chunk` containing all the items emitted by the stream.

---

---


## 🟡 Intermediate Patterns

### Turn a Paginated API into a Single Stream

**Rule:** Use Stream.paginateEffect to model a paginated data source as a single, continuous stream.

**Good Example:**

This example simulates fetching users from a paginated API. The `fetchUsersPage` function gets one page of data and returns the next page number. `Stream.paginateEffect` uses this function to create a single stream of all users across all pages.

```typescript
import { Effect, Stream, Chunk, Option } from "effect";

// --- Mock Paginated API ---
interface User {
  id: number;
  name: string;
}

// Define FetchError as a class with a literal type tag
class FetchError {
  readonly _tag = "FetchError" as const;
  constructor(readonly message: string) {}
}

// Helper to create FetchError instances
const fetchError = (message: string): FetchError => new FetchError(message);

const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

// This function simulates fetching a page of users from an API.
const fetchUsersPage = (
  page: number
): Effect.Effect<[Chunk.Chunk<User>, Option.Option<number>], FetchError> =>
  Effect.gen(function* () {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Simulate potential API errors
    if (page < 1) {
      return yield* Effect.fail(fetchError("Invalid page number"));
    }

    const users = Chunk.fromIterable(allUsers.slice(offset, offset + pageSize));

    const nextPage =
      Chunk.isNonEmpty(users) && allUsers.length > offset + pageSize
        ? Option.some(page + 1)
        : Option.none();

    yield* Effect.log(`Fetched page ${page}`);
    return [users, nextPage];
  });

// --- The Pattern ---
// Use paginateEffect, providing an initial state (page 1) and the fetch function.
const userStream = Stream.paginateEffect(1, fetchUsersPage);

const program = userStream.pipe(
  Stream.runCollect,
  Effect.map((users) => users.length),
  Effect.tap((totalUsers) => Effect.log(`Total users fetched: ${totalUsers}`)),
  Effect.catchTag("FetchError", (error) =>
    Effect.succeed(`Error fetching users: ${error.message}`)
  )
);

// Run the program
const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Program result: ${result}`);
  return result;
});

Effect.runPromise(programWithLogging);

/*
Output:
... level=INFO msg="Fetched page 1"
... level=INFO msg="Fetched page 2"
... level=INFO msg="Fetched page 3"
... level=INFO msg="Total users fetched: 25"
25
*/
```

**Anti-Pattern:**

The anti-pattern is to write manual, imperative logic to handle the pagination loop. This code is stateful, harder to read, and not composable.

```typescript
import { Effect, Chunk, Option } from "effect";
// ... same mock API setup ...

const fetchAllUsersManually = (): Effect.Effect<Chunk.Chunk<User>, Error> =>
  Effect.gen(function* () {
    // Manual state management for results and current page
    let allFetchedUsers: User[] = [];
    let currentPage: Option.Option<number> = Option.some(1);

    // Manual loop to fetch pages
    while (Option.isSome(currentPage)) {
      const [users, nextPage] = yield* fetchUsersPage(currentPage.value);
      allFetchedUsers = allFetchedUsers.concat(Chunk.toArray(users));
      currentPage = nextPage;
    }

    return Chunk.fromIterable(allFetchedUsers);
  });

const program = fetchAllUsersManually().pipe(
  Effect.map((users) => users.length)
);

Effect.runPromise(program).then((totalUsers) => {
  console.log(`Total users fetched from all pages: ${totalUsers}`);
});
```

This manual approach is inferior because it forces you to manage state explicitly (`allFetchedUsers`, `currentPage`). The logic is contained within a single, monolithic effect that is not lazy and cannot be easily composed with other stream operators without first collecting all results. `Stream.paginateEffect` abstracts away this entire block of boilerplate code.

**Rationale:**

To handle a data source that is split across multiple pages, use `Stream.paginateEffect` to abstract the pagination logic into a single, continuous `Stream`.

---


Calling paginated APIs is a classic programming challenge. It often involves writing complex, stateful, and imperative code with manual loops to fetch one page, check if there's a next page, fetch that page, and so on, all while accumulating the results. This logic is tedious to write and easy to get wrong.

`Stream.paginateEffect` elegantly solves this by declaratively modeling the pagination process:

1.  **Declarative and Stateless**: You provide a function that knows how to fetch a single page, and the `Stream` handles the looping, state management (the current page token/number), and termination logic for you. Your business logic remains clean and stateless.
2.  **Lazy and Efficient**: The stream fetches pages on demand as they are consumed. If a downstream consumer only needs the first 20 items, the stream will only make enough API calls to satisfy that need, rather than wastefully fetching all pages upfront.
3.  **Fully Composable**: The result is a standard `Stream`. This means you can pipe the continuous flow of items directly into other powerful operators like `mapEffect` for concurrent processing or `grouped` for batching, without ever thinking about page boundaries again.

---

---

### Process Items Concurrently

**Rule:** Use Stream.mapEffect with the `concurrency` option to process stream items in parallel.

**Good Example:**

This example processes four items, each taking one second. By setting `concurrency: 2`, the total runtime is approximately two seconds instead of four, because items are processed in parallel pairs.

```typescript
import { Effect, Stream } from "effect";

// A mock function that simulates a slow I/O operation
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.log(`Starting item ${id}...`).pipe(
    Effect.delay("1 second"),
    Effect.map(() => `Finished item ${id}`),
    Effect.tap(Effect.log)
  );

const ids = [1, 2, 3, 4];

const program = Stream.fromIterable(ids).pipe(
  // Process up to 2 items concurrently
  Stream.mapEffect(processItem, { concurrency: 2 }),
  Stream.runDrain
);

// Measure the total time taken
const timedProgram = Effect.timed(program);

const programWithLogging = Effect.gen(function* () {
  const [duration, _] = yield* timedProgram;
  const durationMs = Number(duration);
  yield* Effect.log(`\nTotal time: ${Math.round(durationMs / 1000)} seconds`);
  return duration;
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithLogging);
/*
Output:
... level=INFO msg="Starting item 1..."
... level=INFO msg="Starting item 2..."
... level=INFO msg="Finished item 1"
... level=INFO msg="Starting item 3..."
... level=INFO msg="Finished item 2"
... level=INFO msg="Starting item 4..."
... level=INFO msg="Finished item 3"
... level=INFO msg="Finished item 4"

Total time: 2 seconds
*/
```

**Anti-Pattern:**

The anti-pattern is to process I/O-bound tasks sequentially. This is the default behavior of `Stream.mapEffect` if you don't specify a concurrency level, and it leads to poor performance.

```typescript
import { Effect, Stream } from "effect";
// ... same processItem function ...

const ids = [1, 2, 3, 4];

// Processing sequentially (default concurrency is 1)
const program = Stream.fromIterable(ids).pipe(
  Stream.mapEffect(processItem), // No concurrency option
  Stream.runDrain
);

const timedProgram = Effect.timed(program);

Effect.runPromise(timedProgram).then(([duration, _]) => {
  console.log(`\nTotal time: ${Math.round(duration.millis / 1000)} seconds`);
});
/*
Output:
... level=INFO msg="Starting item 1..."
... level=INFO msg="Finished item 1"
... level=INFO msg="Starting item 2..."
... level=INFO msg="Finished item 2"
... etc.

Total time: 4 seconds
*/
```

While sequential processing is sometimes necessary to preserve order or avoid race conditions, it is a performance anti-pattern for independent, I/O-bound tasks. The concurrent approach is almost always preferable in such cases.

**Rationale:**

To process items in a stream concurrently, use `Stream.mapEffect` and provide a value greater than 1 to its `concurrency` option.

---


For many data pipelines, the most time-consuming step is performing an I/O-bound operation for each item, such as calling an API or querying a database. Processing these items one by one (sequentially) is safe but slow, as the entire pipeline waits for each operation to complete before starting the next.

`Stream.mapEffect`'s `concurrency` option is the solution. It provides a simple, declarative way to introduce controlled parallelism into your pipeline.

1.  **Performance Boost**: It allows the stream to work on multiple items at once, drastically reducing the total execution time for I/O-bound tasks.
2.  **Controlled Parallelism**: Unlike `Promise.all` which runs everything at once, you specify the _exact_ number of concurrent operations. This is crucial for stability, as it prevents your application from overwhelming downstream services or exhausting its own resources (like file handles or network sockets).
3.  **Automatic Backpressure**: The stream will not pull new items from the source faster than the concurrent slots can process them. This backpressure is handled automatically, preventing memory issues.
4.  **Structured Concurrency**: It's fully integrated with Effect's runtime. If any concurrent operation fails, all other in-flight operations for that stream are immediately and reliably interrupted, preventing wasted work and ensuring clean shutdowns.

---

---

### Process Items in Batches

**Rule:** Use Stream.grouped(n) to transform a stream of items into a stream of batched chunks.

**Good Example:**

This example processes 10 users. By using `Stream.grouped(5)`, it transforms the stream of 10 individual users into a stream of two chunks (each a batch of 5). The `saveUsersInBulk` function is then called only twice, once for each batch.

```typescript
import { Effect, Stream, Chunk } from "effect";

// A mock function that simulates a bulk database insert
const saveUsersInBulk = (
  userBatch: Chunk.Chunk<{ id: number }>
): Effect.Effect<void, Error> =>
  Effect.log(
    `Saving batch of ${userBatch.length} users: ${Chunk.toArray(userBatch)
      .map((u) => u.id)
      .join(", ")}`
  );

const userIds = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

const program = Stream.fromIterable(userIds).pipe(
  // Group the stream of users into batches of 5
  Stream.grouped(5),
  // Process each batch with our bulk save function
  Stream.mapEffect(saveUsersInBulk, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Saving batch of 5 users: 1, 2, 3, 4, 5"
... level=INFO msg="Saving batch of 5 users: 6, 7, 8, 9, 10"
*/
```

**Anti-Pattern:**

The anti-pattern is to process items one by one when a more efficient bulk operation is available. This is a common performance bottleneck.

```typescript
import { Effect, Stream } from "effect";

// A mock function that saves one user at a time
const saveUser = (user: { id: number }): Effect.Effect<void, Error> =>
  Effect.log(`Saving single user: ${user.id}`);

const userIds = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

const program = Stream.fromIterable(userIds).pipe(
  // Process each user individually, leading to 10 separate "saves"
  Stream.mapEffect(saveUser, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Saving single user: 1"
... level=INFO msg="Saving single user: 2"
... (and so on for all 10 users)
*/
```

This individual processing approach is an anti-pattern because it creates unnecessary overhead. If each `saveUser` call took 50ms of network latency, the total time would be over 500ms. The batched approach might only take 100ms (2 batches \* 50ms), resulting in a 5x performance improvement.

**Rationale:**

To process items in fixed-size batches for performance, use the `Stream.grouped(batchSize)` operator to transform a stream of individual items into a stream of `Chunk`s.

---


When interacting with external systems like databases or APIs, making one request per item is often incredibly inefficient. The network latency and overhead of each individual call can dominate the total processing time. Most high-performance systems offer bulk or batch endpoints to mitigate this.

`Stream.grouped(n)` provides a simple, declarative way to prepare your data for these bulk operations:

1.  **Performance Optimization**: It dramatically reduces the number of network roundtrips. A single API call with 100 items is far faster than 100 individual API calls.
2.  **Declarative Batching**: It abstracts away the tedious and error-prone manual logic of counting items, managing temporary buffers, and deciding when to send a batch.
3.  **Seamless Composition**: It transforms a `Stream<A>` into a `Stream<Chunk<A>>`. This new stream of chunks can be piped directly into `Stream.mapEffect`, allowing you to process each batch concurrently.
4.  **Handles Leftovers**: The operator automatically handles the final, smaller batch if the total number of items is not perfectly divisible by the batch size.

---

---

### Merge Multiple Streams

**Rule:** Use merge, concat, or zip to combine multiple streams based on your requirements.

**Good Example:**

```typescript
import { Effect, Stream, Duration, Chunk } from "effect"

// ============================================
// 1. Merge - interleave as items arrive
// ============================================

const mergeExample = Effect.gen(function* () {
  // Two streams producing at different rates
  const fast = Stream.fromIterable(["A1", "A2", "A3"]).pipe(
    Stream.tap(() => Effect.sleep("100 millis"))
  )

  const slow = Stream.fromIterable(["B1", "B2", "B3"]).pipe(
    Stream.tap(() => Effect.sleep("200 millis"))
  )

  // Merge interleaves based on arrival time
  const merged = Stream.merge(fast, slow)

  yield* merged.pipe(
    Stream.tap((item) => Effect.log(`Received: ${item}`)),
    Stream.runDrain
  )
  // Output order depends on timing: A1, B1, A2, A3, B2, B3 (approximately)
})

// ============================================
// 2. Merge all - combine many streams
// ============================================

const mergeAllExample = Effect.gen(function* () {
  const streams = [
    Stream.fromIterable([1, 2, 3]),
    Stream.fromIterable([10, 20, 30]),
    Stream.fromIterable([100, 200, 300]),
  ]

  const merged = Stream.mergeAll(streams, { concurrency: 3 })

  const results = yield* merged.pipe(Stream.runCollect)
  yield* Effect.log(`Merged: ${Chunk.toReadonlyArray(results)}`)
})

// ============================================
// 3. Concat - sequence streams
// ============================================

const concatExample = Effect.gen(function* () {
  const first = Stream.fromIterable([1, 2, 3])
  const second = Stream.fromIterable([4, 5, 6])
  const third = Stream.fromIterable([7, 8, 9])

  // Concat waits for each stream to complete
  const sequential = Stream.concat(Stream.concat(first, second), third)

  const results = yield* sequential.pipe(Stream.runCollect)
  yield* Effect.log(`Concatenated: ${Chunk.toReadonlyArray(results)}`)
  // Always: [1, 2, 3, 4, 5, 6, 7, 8, 9]
})

// ============================================
// 4. Zip - pair items from streams
// ============================================

const zipExample = Effect.gen(function* () {
  const names = Stream.fromIterable(["Alice", "Bob", "Charlie"])
  const ages = Stream.fromIterable([30, 25, 35])

  // Zip pairs items by position
  const zipped = Stream.zip(names, ages)

  yield* zipped.pipe(
    Stream.tap(([name, age]) => Effect.log(`${name} is ${age} years old`)),
    Stream.runDrain
  )
})

// ============================================
// 5. ZipWith - pair and transform
// ============================================

const zipWithExample = Effect.gen(function* () {
  const prices = Stream.fromIterable([100, 200, 150])
  const quantities = Stream.fromIterable([2, 1, 3])

  // Zip and calculate total
  const totals = Stream.zipWith(prices, quantities, (price, qty) => ({
    price,
    quantity: qty,
    total: price * qty,
  }))

  yield* totals.pipe(
    Stream.tap((item) => Effect.log(`${item.quantity}x @ $${item.price} = $${item.total}`)),
    Stream.runDrain
  )
})

// ============================================
// 6. ZipLatest - combine with latest values
// ============================================

const zipLatestExample = Effect.gen(function* () {
  // Simulate different update rates
  const temperature = Stream.fromIterable([20, 21, 22, 23]).pipe(
    Stream.tap(() => Effect.sleep("100 millis"))
  )

  const humidity = Stream.fromIterable([50, 55, 60]).pipe(
    Stream.tap(() => Effect.sleep("150 millis"))
  )

  // ZipLatest always uses the latest value from each stream
  const combined = Stream.zipLatest(temperature, humidity)

  yield* combined.pipe(
    Stream.tap(([temp, hum]) => Effect.log(`Temp: ${temp}°C, Humidity: ${hum}%`)),
    Stream.runDrain
  )
})

// ============================================
// 7. Practical example: Merge event sources
// ============================================

interface Event {
  source: string
  type: string
  data: unknown
}

const mergeEventSources = Effect.gen(function* () {
  // Simulate multiple event sources
  const mouseEvents = Stream.fromIterable([
    { source: "mouse", type: "click", data: { x: 100, y: 200 } },
    { source: "mouse", type: "move", data: { x: 150, y: 250 } },
  ] as Event[])

  const keyboardEvents = Stream.fromIterable([
    { source: "keyboard", type: "keydown", data: { key: "Enter" } },
    { source: "keyboard", type: "keyup", data: { key: "Enter" } },
  ] as Event[])

  const networkEvents = Stream.fromIterable([
    { source: "network", type: "response", data: { status: 200 } },
  ] as Event[])

  // Merge all event sources
  const allEvents = Stream.mergeAll([mouseEvents, keyboardEvents, networkEvents])

  yield* allEvents.pipe(
    Stream.tap((event) =>
      Effect.log(`[${event.source}] ${event.type}: ${JSON.stringify(event.data)}`)
    ),
    Stream.runDrain
  )
})

// ============================================
// 8. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Merge Example ===")
  yield* mergeExample

  yield* Effect.log("\n=== Concat Example ===")
  yield* concatExample

  yield* Effect.log("\n=== Zip Example ===")
  yield* zipExample
})

Effect.runPromise(program)
```

**Rationale:**

Choose the right combination strategy: merge for interleaving, concat for sequencing, or zip for pairing items.

---


Merging streams enables:

1. **Aggregation** - Combine data from multiple sources
2. **Correlation** - Match related data
3. **Multiplexing** - Single consumer for multiple producers
4. **Comparison** - Process streams side by side

---

---

### Process collections of data asynchronously

**Rule:** Leverage Stream to process collections effectfully with built-in concurrency control and resource safety.

**Good Example:**

This example processes a list of IDs by fetching user data for each one. `Stream.mapEffect` is used to apply an effectful function (`getUserById`) to each element, with concurrency limited to 2 simultaneous requests.

```typescript
import { Effect, Stream, Chunk } from "effect";

// A mock function that simulates fetching a user from a database
const getUserById = (
  id: number
): Effect.Effect<{ id: number; name: string }, Error> =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay("100 millis"),
    Effect.tap(() => Effect.log(`Fetched user ${id}`))
  );

// The stream-based program
const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  // Process each item with an Effect, limiting concurrency to 2
  Stream.mapEffect(getUserById, { concurrency: 2 }),
  // Run the stream and collect all results into a Chunk
  Stream.runCollect
);

const programWithLogging = Effect.gen(function* () {
  const users = yield* program;
  yield* Effect.log(
    `All users fetched: ${JSON.stringify(Chunk.toArray(users))}`
  );
  return users;
});

Effect.runPromise(programWithLogging);
```

**Anti-Pattern:**

A common but flawed approach is to use `Promise.all` to handle multiple asynchronous operations. This method lacks the safety, control, and composability inherent to Effect's `Stream`.

```typescript
// A mock function that returns a Promise
const getUserByIdAsPromise = (
  id: number
): Promise<{ id: number; name: string }> =>
  new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Fetched user ${id}`);
      resolve({ id, name: `User ${id}` });
    }, 100);
  });

// The Promise-based program
const ids = [1, 2, 3, 4, 5];
const promises = ids.map(getUserByIdAsPromise);

Promise.all(promises).then((users) => {
  console.log("All users fetched:", users);
});
```

This anti-pattern is problematic because it immediately executes all promises in parallel with no concurrency limit, it does not benefit from Effect's structured concurrency for safe interruption, and it breaks out of the Effect context, losing composability with features like logging, retries, and dependency management.

**Rationale:**

For processing collections that involve asynchronous or effectful operations, use `Stream` to ensure resource safety, control concurrency, and maintain composability.

---


`Stream` is a fundamental data type in Effect for handling collections of data, especially in asynchronous contexts. Unlike a simple array, a `Stream` is lazy and pull-based, meaning it only computes or fetches elements as they are needed, making it highly efficient for large or infinite datasets.

The primary benefits of using `Stream` are:

1.  **Concurrency Control**: `Stream` provides powerful and simple operators like `mapEffect` that have built-in concurrency management. This prevents overwhelming downstream services with too many parallel requests.
2.  **Resource Safety**: `Stream` is built on `Scope`, ensuring that any resources opened during the stream's operation (like file handles or network connections) are safely and reliably closed, even in the case of errors or interruption.
3.  **Composability**: Streams are highly composable. They can be filtered, mapped, transformed, and combined with other Effect data types seamlessly, allowing you to build complex data processing pipelines that remain readable and type-safe.
4.  **Resilience**: `Stream` integrates with `Schedule` to provide sophisticated retry and repeat logic, and with Effect's structured concurrency to ensure that failures in one part of a pipeline lead to a clean and predictable shutdown of the entire process.

---

---

### Process a Large File with Constant Memory

**Rule:** Use Stream.fromReadable with a Node.js Readable stream to process files efficiently.

**Good Example:**

This example demonstrates reading a text file, splitting it into individual lines, and processing each line. The combination of `Stream.fromReadable`, `Stream.decodeText`, and `Stream.splitLines` is a powerful and common pattern for handling text-based files.

```typescript
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Stream } from "effect";
import * as path from "node:path";

const processFile = (
  filePath: string,
  content: string
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Write content to file
    yield* fs.writeFileString(filePath, content);

    // Create a STREAMING pipeline - reads file in chunks, not all at once
    const fileStream = fs.readFile(filePath).pipe(
      // Decode bytes to text
      Stream.decodeText("utf-8"),
      // Split into lines
      Stream.splitLines,
      // Process each line
      Stream.tap((line) => Effect.log(`Processing: ${line}`))
    );

    // Run the stream to completion
    yield* Stream.runDrain(fileStream);

    // Clean up file
    yield* fs.remove(filePath);
  });

const program = Effect.gen(function* () {
  const filePath = path.join(__dirname, "large-file.txt");

  yield* processFile(filePath, "line 1\nline 2\nline 3").pipe(
    Effect.catchAll((error: PlatformError) =>
      Effect.logError(`Error processing file: ${error.message}`)
    )
  );
});

Effect.runPromise(program.pipe(Effect.provide(NodeFileSystem.layer)));

/*
Output:
... level=INFO msg="Processing: line 1"
... level=INFO msg="Processing: line 2"
... level=INFO msg="Processing: line 3"
*/
```

**Anti-Pattern:**

The anti-pattern is to use synchronous, memory-intensive functions like `fs.readFileSync`. This approach is simple for tiny files but fails catastrophically for large ones.

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

const filePath = path.join(__dirname, "large-file.txt");
// Create a dummy file for the example
fs.writeFileSync(filePath, "line 1\nline 2\nline 3");

try {
  // Anti-pattern: This loads the ENTIRE file into memory as a single buffer.
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  for (const line of lines) {
    console.log(`Processing: ${line}`);
  }
} catch (err) {
  console.error("Failed to read file:", err);
} finally {
  // Clean up the dummy file
  fs.unlinkSync(filePath);
}
```

This is a dangerous anti-pattern because:

1.  **It's a Memory Bomb**: If `large-file.txt` were 2GB and your server had 1GB of RAM, this code would immediately crash the process.
2.  **It Blocks the Event Loop**: `readFileSync` is a synchronous, blocking operation. While it's reading the file from disk, your entire application is frozen and cannot respond to any other requests.
3.  **It's Not Composable**: You get a giant string that must be processed eagerly. You lose all the benefits of lazy processing, concurrency control, and integrated error handling that `Stream` provides.

**Rationale:**

To process a large file without consuming excessive memory, create a Node.js `Readable` stream from the file and convert it into an Effect `Stream` using `Stream.fromReadable`.

---


The most significant advantage of a streaming architecture is its ability to handle datasets far larger than available RAM. When you need to process a multi-gigabyte log file or CSV, loading it all into memory is not an option—it will crash your application.

The `Stream.fromReadable` constructor provides a bridge from Node.js's built-in file streaming capabilities to the Effect ecosystem. This approach is superior because:

1.  **Constant Memory Usage**: The file is read in small, manageable chunks. Your application's memory usage remains low and constant, regardless of whether the file is 1 megabyte or 100 gigabytes.
2.  **Composability**: Once the file is represented as an Effect `Stream`, you can apply the full suite of powerful operators to it: `mapEffect` for concurrent processing, `filter` for selectively choosing lines, `grouped` for batching, and `retry` for resilience.
3.  **Resource Safety**: Effect's `Stream` is built on `Scope`, which guarantees that the underlying file handle will be closed automatically when the stream finishes, fails, or is interrupted. This prevents resource leaks, a common problem in manual file handling.

---

---

### Automatically Retry Failed Operations

**Rule:** Compose a Stream with the .retry(Schedule) operator to automatically recover from transient failures.

**Good Example:**

This example simulates an API that fails the first two times it's called. The stream processes a list of IDs, and the `retry` operator ensures that the failing operation for `id: 2` is automatically retried until it succeeds.

```typescript
import { Effect, Stream, Schedule } from "effect";

// A mock function that simulates a flaky API call
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    yield* Effect.log(`Attempting to process item ${id}...`);

    // Item 2 fails on first attempt but succeeds on retry
    if (id === 2) {
      const random = Math.random();
      if (random < 0.5) {
        // 50% chance of failure for demonstration
        yield* Effect.log(`Item ${id} failed, will retry...`);
        return yield* Effect.fail(new Error("API is temporarily down"));
      }
    }

    yield* Effect.log(`✅ Successfully processed item ${id}`);
    return `Processed item ${id}`;
  });

const ids = [1, 2, 3];

// Define a retry policy: 3 attempts with a fixed 100ms delay
const retryPolicy = Schedule.recurs(3).pipe(
  Schedule.addDelay(() => "100 millis")
);

const program = Effect.gen(function* () {
  yield* Effect.log("=== Stream Retry on Failure Demo ===");
  yield* Effect.log(
    "Processing items with retry policy (3 attempts, 100ms delay)"
  );

  // Process each item individually with retry
  const results = yield* Effect.forEach(
    ids,
    (id) =>
      processItem(id).pipe(
        Effect.retry(retryPolicy),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(
              `❌ Item ${id} failed after all retries: ${error.message}`
            );
            return `Failed: item ${id}`;
          })
        )
      ),
    { concurrency: 1 }
  );

  yield* Effect.log("=== Results ===");
  for (let index = 0; index < results.length; index++) {
    yield* Effect.log(`Item ${ids[index]}: ${results[index]}`);
  }

  yield* Effect.log("✅ Stream processing completed");
});

Effect.runPromise(program).catch((error) => {
  Effect.runSync(Effect.logError("Unexpected error: " + error));
});
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
```

**Anti-Pattern:**

The anti-pattern is to either have no retry logic at all, or to write manual, imperative retry loops inside your processing function.

```typescript
import { Effect, Stream } from "effect";
// ... same mock processItem function ...

const ids = [1, 2, 3];

const program = Stream.fromIterable(ids).pipe(
  // No retry logic. The entire stream will fail when item 2 fails.
  Stream.mapEffect(processItem, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program).catch((error) => {
  console.error("Pipeline failed:", error);
});
/*
Output:
... level=INFO msg="Attempting to process item 1..."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 1."
Pipeline failed: Error: API is temporarily down
*/
```

This "fail-fast" approach is brittle. A single, temporary network blip would cause the entire pipeline to terminate, even if subsequent items could have been processed successfully. While manual retry logic inside `processItem` is possible, it pollutes the core logic with concerns about timing and attempt counting, and is far less composable and reusable than a `Schedule`.

**Rationale:**

To make a data pipeline resilient to transient failures, apply the `.retry(Schedule)` operator to the `Stream`.

---


Real-world systems are unreliable. Network connections drop, APIs return temporary `503` errors, and databases can experience deadlocks. A naive pipeline will fail completely on the first sign of trouble. A resilient pipeline, however, can absorb these transient errors and heal itself.

The `retry` operator, combined with the `Schedule` module, provides a powerful and declarative way to build this resilience:

1.  **Declarative Resilience**: Instead of writing complex `try/catch` loops with manual delay logic, you declaratively state _how_ the pipeline should retry. For example, "retry 3 times, with an exponential backoff starting at 100ms."
2.  **Separation of Concerns**: Your core pipeline logic remains focused on the "happy path." The retry strategy is a separate, composable concern that you apply to the entire stream.
3.  **Rich Scheduling Policies**: `Schedule` is incredibly powerful. You can create schedules based on a fixed number of retries, exponential backoff, jitter (to avoid thundering herd problems), or even combinations of these.
4.  **Prevents Cascading Failures**: By handling temporary issues at the source, you prevent a small, transient glitch from causing a complete failure of your entire application.

---

---


## 🟠 Advanced Patterns

### Fan Out to Multiple Consumers

**Rule:** Use broadcast or partition to send stream data to multiple consumers.

**Good Example:**

```typescript
import { Effect, Stream, Queue, Fiber, Chunk } from "effect"

// ============================================
// 1. Broadcast to all consumers
// ============================================

const broadcastExample = Effect.scoped(
  Effect.gen(function* () {
    const source = Stream.fromIterable([1, 2, 3, 4, 5])

    // Broadcast to 3 consumers - each gets all items
    const [stream1, stream2, stream3] = yield* Stream.broadcast(source, 3)

    // Consumer 1: Log items
    const consumer1 = stream1.pipe(
      Stream.tap((n) => Effect.log(`Consumer 1: ${n}`)),
      Stream.runDrain
    )

    // Consumer 2: Sum items
    const consumer2 = stream2.pipe(
      Stream.runFold(0, (acc, n) => acc + n),
      Effect.tap((sum) => Effect.log(`Consumer 2 sum: ${sum}`))
    )

    // Consumer 3: Collect to array
    const consumer3 = stream3.pipe(
      Stream.runCollect,
      Effect.tap((items) => Effect.log(`Consumer 3 collected: ${Chunk.toReadonlyArray(items)}`))
    )

    // Run all consumers in parallel
    yield* Effect.all([consumer1, consumer2, consumer3], { concurrency: 3 })
  })
)

// ============================================
// 2. Partition by predicate
// ============================================

const partitionExample = Effect.gen(function* () {
  const numbers = Stream.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  // Partition into even and odd
  const [evens, odds] = yield* Stream.partition(
    numbers,
    (n) => n % 2 === 0
  )

  const processEvens = evens.pipe(
    Stream.tap((n) => Effect.log(`Even: ${n}`)),
    Stream.runDrain
  )

  const processOdds = odds.pipe(
    Stream.tap((n) => Effect.log(`Odd: ${n}`)),
    Stream.runDrain
  )

  yield* Effect.all([processEvens, processOdds], { concurrency: 2 })
})

// ============================================
// 3. Partition into multiple buckets
// ============================================

interface Event {
  type: "click" | "scroll" | "submit"
  data: unknown
}

const multiPartitionExample = Effect.gen(function* () {
  const events: Event[] = [
    { type: "click", data: { x: 100 } },
    { type: "scroll", data: { y: 200 } },
    { type: "submit", data: { form: "login" } },
    { type: "click", data: { x: 150 } },
    { type: "scroll", data: { y: 300 } },
  ]

  const source = Stream.fromIterable(events)

  // Group by type using groupByKey
  const grouped = source.pipe(
    Stream.groupByKey((event) => event.type, {
      bufferSize: 16,
    })
  )

  // Process each group
  yield* grouped.pipe(
    Stream.flatMap(([key, stream]) =>
      stream.pipe(
        Stream.tap((event) => Effect.log(`[${key}] Processing: ${JSON.stringify(event.data)}`)),
        Stream.runDrain,
        Stream.fromEffect
      )
    ),
    Stream.runDrain
  )
})

// ============================================
// 4. Fan-out with queues (manual control)
// ============================================

const queueFanOut = Effect.gen(function* () {
  const source = Stream.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  // Create queues for each consumer
  const queue1 = yield* Queue.unbounded<number>()
  const queue2 = yield* Queue.unbounded<number>()
  const queue3 = yield* Queue.unbounded<number>()

  // Distribute items round-robin
  const distributor = source.pipe(
    Stream.zipWithIndex,
    Stream.tap(([item, index]) => {
      const queue = index % 3 === 0 ? queue1 : index % 3 === 1 ? queue2 : queue3
      return Queue.offer(queue, item)
    }),
    Stream.runDrain,
    Effect.tap(() => Effect.all([
      Queue.shutdown(queue1),
      Queue.shutdown(queue2),
      Queue.shutdown(queue3),
    ]))
  )

  // Consumers
  const makeConsumer = (name: string, queue: Queue.Queue<number>) =>
    Stream.fromQueue(queue).pipe(
      Stream.tap((n) => Effect.log(`${name}: ${n}`)),
      Stream.runDrain
    )

  yield* Effect.all([
    distributor,
    makeConsumer("Worker 1", queue1),
    makeConsumer("Worker 2", queue2),
    makeConsumer("Worker 3", queue3),
  ], { concurrency: 4 })
})

// ============================================
// 5. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Broadcast Example ===")
  yield* broadcastExample

  yield* Effect.log("\n=== Partition Example ===")
  yield* partitionExample
})

Effect.runPromise(program)
```

**Rationale:**

Use `Stream.broadcast` to send every item to all consumers, or partition streams to distribute items based on criteria.

---


Fan-out enables parallel processing:

1. **Throughput** - Multiple consumers process faster
2. **Specialization** - Different consumers handle different data
3. **Redundancy** - Multiple copies for reliability
4. **Decoupling** - Consumers evolve independently

---

---

### Manage Resources Safely in a Pipeline

**Rule:** Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

**Good Example:**

This example creates and writes to a temporary file. `Stream.acquireRelease` is used to acquire a readable stream from that file. The pipeline then processes the file but is designed to fail partway through. The logs demonstrate that the `release` effect (which deletes the file) is still executed, preventing any resource leaks.

```typescript
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { NodeFileSystem } from "@effect/platform-node";
import * as path from "node:path";

interface ProcessError {
  readonly _tag: "ProcessError";
  readonly message: string;
}

const ProcessError = (message: string): ProcessError => ({
  _tag: "ProcessError",
  message,
});

interface FileServiceType {
  readonly createTempFile: () => Effect.Effect<{ filePath: string }, never>;
  readonly cleanup: (filePath: string) => Effect.Effect<void, never>;
  readonly readFile: (filePath: string) => Effect.Effect<string, never>;
}

export class FileService extends Effect.Service<FileService>()("FileService", {
  sync: () => {
    const filePath = path.join(__dirname, "temp-resource.txt");
    return {
      createTempFile: () => Effect.succeed({ filePath }),
      cleanup: (filePath: string) =>
        Effect.log("✅ Resource cleaned up successfully"),
      readFile: (filePath: string) =>
        Effect.succeed("data 1\ndata 2\nFAIL\ndata 4"),
    };
  },
}) {}

// Process a single line
const processLine = (line: string): Effect.Effect<void, ProcessError> =>
  line === "FAIL"
    ? Effect.fail(ProcessError("Failed to process line"))
    : Effect.log(`Processed: ${line}`);

// Create and process the file with proper resource management
const program = Effect.gen(function* () {
  yield* Effect.log("=== Stream Resource Management Demo ===");
  yield* Effect.log(
    "This demonstrates proper resource cleanup even when errors occur"
  );

  const fileService = yield* FileService;
  const { filePath } = yield* fileService.createTempFile();

  // Use scoped to ensure cleanup happens even on failure
  yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.addFinalizer(() => fileService.cleanup(filePath));

      const content = yield* fileService.readFile(filePath);
      const lines = content.split("\n");

      // Process each line, continuing even if some fail
      for (const line of lines) {
        yield* processLine(line).pipe(
          Effect.catchAll((error) =>
            Effect.log(`⚠️  Skipped line due to error: ${error.message}`)
          )
        );
      }

      yield* Effect.log(
        "✅ Processing completed with proper resource management"
      );
    })
  );
});

// Run the program with FileService layer
Effect.runPromise(Effect.provide(program, FileService.Default)).catch(
  (error) => {
    Effect.runSync(Effect.logError("Unexpected error: " + error));
  }
);
```

**Anti-Pattern:**

The anti-pattern is to manage resources manually outside the stream's context. This is brittle and almost always leads to resource leaks when errors occur.

```typescript
import { Effect, Stream } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import * as path from "node:path";

const program = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, "temp-resource-bad.txt");

  // 1. Resource acquired manually before the stream
  yield* fs.writeFileString(filePath, "data 1\ndata 2");
  const readable = fs.createReadStream(filePath);
  yield* Effect.log("Resource acquired manually.");

  const stream = Stream.fromReadable(() => readable).pipe(
    Stream.decodeText("utf-8"),
    Stream.splitLines,
    // This stream will fail, causing the run to reject.
    Stream.map(() => {
      throw new Error("Something went wrong!");
    })
  );

  // 2. Stream is executed
  yield* Stream.runDrain(stream);

  // 3. This release logic is NEVER reached if the stream fails.
  yield* fs.remove(filePath);
  yield* Effect.log("Resource released manually. (This will not be logged)");
});

Effect.runPromiseExit(program).then((exit) => {
  if (exit._tag === "Failure") {
    console.log("\nPipeline failed. The temp file was NOT deleted.");
  }
});
```

In this anti-pattern, the `fs.remove` call is unreachable because the `Stream.runDrain` effect fails, causing the `gen` block to terminate immediately. The temporary file is leaked onto the disk. `Stream.acquireRelease` solves this problem entirely.

**Rationale:**

To safely manage a resource that has an open/close lifecycle (like a file handle or database connection) for the duration of a stream, use the `Stream.acquireRelease` constructor.

---


What happens if a pipeline processing a file fails halfway through? In a naive implementation, the file handle might be left open, leading to a resource leak. Over time, these leaks can exhaust system resources and crash your application.

`Stream.acquireRelease` is Effect's robust solution to this problem. It's built on `Scope`, Effect's fundamental resource-management tool.

1.  **Guaranteed Cleanup**: You provide an `acquire` effect to open the resource and a `release` effect to close it. Effect guarantees that the `release` effect will be called when the stream terminates, for _any_ reason: successful completion, a processing failure, or even external interruption.
2.  **Declarative and Co-located**: The logic for a resource's entire lifecycle—acquisition, usage (the stream itself), and release—is defined in one place. This makes the code easier to understand and reason about compared to manual `try/finally` blocks.
3.  **Prevents Resource Leaks**: It is the idiomatic way to build truly resilient pipelines that do not leak resources, which is essential for long-running, production-grade applications.
4.  **Composability**: The resulting stream is just a normal `Stream`, which can be composed with any other stream operators.

---

---

### Implement Backpressure in Pipelines

**Rule:** Use buffering and throttling to handle producers faster than consumers.

**Good Example:**

```typescript
import { Effect, Stream, Schedule, Duration, Queue, Chunk } from "effect"

// ============================================
// 1. Stream with natural backpressure
// ============================================

// Streams have built-in backpressure - consumers pull data
const fastProducer = Stream.fromIterable(Array.from({ length: 1000 }, (_, i) => i))

const slowConsumer = fastProducer.pipe(
  Stream.tap((n) =>
    Effect.gen(function* () {
      yield* Effect.sleep("10 millis")  // Slow processing
      yield* Effect.log(`Processed: ${n}`)
    })
  ),
  Stream.runDrain
)

// Producer automatically slows down to match consumer

// ============================================
// 2. Explicit buffer with drop strategy
// ============================================

const bufferedStream = (source: Stream.Stream<number>) =>
  source.pipe(
    // Buffer up to 100 items, drop oldest when full
    Stream.buffer({ capacity: 100, strategy: "dropping" })
  )

// ============================================
// 3. Throttling - limit rate
// ============================================

const throttledStream = (source: Stream.Stream<number>) =>
  source.pipe(
    // Process at most 10 items per second
    Stream.throttle({
      cost: () => 1,
      units: 10,
      duration: "1 second",
      strategy: "enforce",
    })
  )

// ============================================
// 4. Debounce - wait for quiet period
// ============================================

const debouncedStream = (source: Stream.Stream<number>) =>
  source.pipe(
    // Wait 100ms of no new items before emitting
    Stream.debounce("100 millis")
  )

// ============================================
// 5. Bounded queue for producer-consumer
// ============================================

const boundedQueueExample = Effect.gen(function* () {
  // Create bounded queue - blocks producer when full
  const queue = yield* Queue.bounded<number>(10)

  // Fast producer
  const producer = Effect.gen(function* () {
    for (let i = 0; i < 100; i++) {
      yield* Queue.offer(queue, i)
      yield* Effect.log(`Produced: ${i}`)
    }
    yield* Queue.shutdown(queue)
  })

  // Slow consumer
  const consumer = Effect.gen(function* () {
    let count = 0
    while (true) {
      const item = yield* Queue.take(queue).pipe(
        Effect.catchTag("QueueShutdown", () => Effect.fail("done" as const))
      )
      if (item === "done") break
      yield* Effect.sleep("50 millis")  // Slow processing
      yield* Effect.log(`Consumed: ${item}`)
      count++
    }
    return count
  }).pipe(Effect.catchAll(() => Effect.succeed(0)))

  // Run both - producer will block when queue is full
  yield* Effect.all([producer, consumer], { concurrency: 2 })
})

// ============================================
// 6. Sliding window - keep most recent
// ============================================

const slidingWindowStream = (source: Stream.Stream<number>) =>
  source.pipe(
    Stream.sliding(5),  // Keep last 5 items
    Stream.map((window) => ({
      items: window,
      average: Chunk.reduce(window, 0, (a, b) => a + b) / Chunk.size(window),
    }))
  )

// ============================================
// 7. Run example
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Backpressure Demo ===")

  // Throttled stream
  const throttled = Stream.fromIterable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).pipe(
    Stream.tap((n) => Effect.log(`Emitting: ${n}`)),
    Stream.throttle({
      cost: () => 1,
      units: 2,
      duration: "1 second",
      strategy: "enforce",
    }),
    Stream.tap((n) => Effect.log(`After throttle: ${n}`)),
    Stream.runDrain
  )

  yield* throttled
})

Effect.runPromise(program)
```

**Rationale:**

Use Stream's built-in backpressure mechanisms and explicit buffering to handle situations where data producers are faster than consumers.

---


Backpressure prevents system overload:

1. **Memory safety** - Don't buffer unlimited data
2. **Stability** - Slow consumers don't crash
3. **Fairness** - Distribute load appropriately
4. **Predictability** - Consistent performance

---

---

### Implement Dead Letter Queues

**Rule:** Capture failed items with context for debugging and retry instead of losing them.

**Good Example:**

```typescript
import { Effect, Stream, Queue, Chunk, Ref, Data } from "effect"

// ============================================
// 1. Define DLQ types
// ============================================

interface DeadLetterItem<T> {
  readonly item: T
  readonly error: unknown
  readonly timestamp: Date
  readonly attempts: number
  readonly context: Record<string, unknown>
}

interface ProcessingResult<T, R> {
  readonly _tag: "Success" | "Failure"
}

class Success<T, R> implements ProcessingResult<T, R> {
  readonly _tag = "Success"
  constructor(
    readonly item: T,
    readonly result: R
  ) {}
}

class Failure<T> implements ProcessingResult<T, never> {
  readonly _tag = "Failure"
  constructor(
    readonly item: T,
    readonly error: unknown,
    readonly attempts: number
  ) {}
}

// ============================================
// 2. Create a DLQ service
// ============================================

const makeDLQ = <T>() =>
  Effect.gen(function* () {
    const queue = yield* Queue.unbounded<DeadLetterItem<T>>()
    const countRef = yield* Ref.make(0)

    return {
      send: (item: T, error: unknown, attempts: number, context: Record<string, unknown> = {}) =>
        Effect.gen(function* () {
          yield* Queue.offer(queue, {
            item,
            error,
            timestamp: new Date(),
            attempts,
            context,
          })
          yield* Ref.update(countRef, (n) => n + 1)
          yield* Effect.log(`DLQ: Added item (total: ${(yield* Ref.get(countRef))})`)
        }),

      getAll: () =>
        Effect.gen(function* () {
          const items: DeadLetterItem<T>[] = []
          while (!(yield* Queue.isEmpty(queue))) {
            const item = yield* Queue.poll(queue)
            if (item._tag === "Some") {
              items.push(item.value)
            }
          }
          return items
        }),

      count: () => Ref.get(countRef),

      queue,
    }
  })

// ============================================
// 3. Process with DLQ
// ============================================

interface Order {
  id: string
  amount: number
}

const processOrder = (order: Order): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    // Simulate random failures
    if (order.amount < 0) {
      return yield* Effect.fail(new Error("Invalid amount"))
    }
    if (order.id === "fail") {
      return yield* Effect.fail(new Error("Processing failed"))
    }
    yield* Effect.sleep("10 millis")
    return `Processed order ${order.id}: $${order.amount}`
  })

const processWithRetryAndDLQ = (
  orders: Stream.Stream<Order>,
  maxRetries: number = 3
) =>
  Effect.gen(function* () {
    const dlq = yield* makeDLQ<Order>()

    const results = yield* orders.pipe(
      Stream.mapEffect((order) =>
        Effect.gen(function* () {
          let lastError: unknown
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result = yield* processOrder(order).pipe(
              Effect.map((r) => new Success(order, r)),
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.log(`Attempt ${attempt}/${maxRetries} failed for ${order.id}`)
                  lastError = error
                  if (attempt < maxRetries) {
                    yield* Effect.sleep("100 millis")  // Backoff
                  }
                  return new Failure(order, error, attempt) as ProcessingResult<Order, string>
                })
              )
            )

            if (result._tag === "Success") {
              return result
            }
          }

          // All retries exhausted - send to DLQ
          yield* dlq.send(order, lastError, maxRetries, { orderId: order.id })
          return new Failure(order, lastError, maxRetries)
        })
      ),
      Stream.runCollect
    )

    const successful = Chunk.filter(results, (r): r is Success<Order, string> => r._tag === "Success")
    const failed = Chunk.filter(results, (r): r is Failure<Order> => r._tag === "Failure")

    yield* Effect.log(`\nResults: ${Chunk.size(successful)} success, ${Chunk.size(failed)} failed`)

    // Get DLQ contents
    const dlqItems = yield* dlq.getAll()
    if (dlqItems.length > 0) {
      yield* Effect.log("\n=== Dead Letter Queue Contents ===")
      for (const item of dlqItems) {
        yield* Effect.log(
          `- Order ${item.item.id}: ${item.error} (attempts: ${item.attempts})`
        )
      }
    }

    return { successful, failed, dlqItems }
  })

// ============================================
// 4. DLQ reprocessing
// ============================================

const reprocessDLQ = <T>(
  dlqItems: DeadLetterItem<T>[],
  processor: (item: T) => Effect.Effect<void, Error>
) =>
  Effect.gen(function* () {
    yield* Effect.log(`Reprocessing ${dlqItems.length} DLQ items...`)

    for (const dlqItem of dlqItems) {
      const result = yield* processor(dlqItem.item).pipe(
        Effect.map(() => "success" as const),
        Effect.catchAll(() => Effect.succeed("failed" as const))
      )

      yield* Effect.log(
        `Reprocess ${JSON.stringify(dlqItem.item)}: ${result}`
      )
    }
  })

// ============================================
// 5. Run example
// ============================================

const program = Effect.gen(function* () {
  const orders: Order[] = [
    { id: "1", amount: 100 },
    { id: "2", amount: 200 },
    { id: "fail", amount: 50 },    // Will fail all retries
    { id: "3", amount: 300 },
    { id: "4", amount: -10 },       // Invalid amount
    { id: "5", amount: 150 },
  ]

  yield* Effect.log("=== Processing Orders ===\n")
  const { dlqItems } = yield* processWithRetryAndDLQ(Stream.fromIterable(orders), 3)

  if (dlqItems.length > 0) {
    yield* Effect.log("\n=== Attempting DLQ Reprocessing ===")
    yield* reprocessDLQ(dlqItems, (order) =>
      Effect.gen(function* () {
        yield* Effect.log(`Manual fix for order ${order.id}`)
      })
    )
  }
})

Effect.runPromise(program)
```

**Rationale:**

Route items that fail processing to a dead letter queue (DLQ) with error context, allowing the main pipeline to continue while preserving failed items for investigation.

---


Dead letter queues provide:

1. **Resilience** - Pipeline continues despite failures
2. **Visibility** - See what's failing and why
3. **Recovery** - Reprocess failed items later
4. **Debugging** - Error context for investigation

---

---


