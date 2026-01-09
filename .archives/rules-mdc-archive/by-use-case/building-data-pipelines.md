# building-data-pipelines Patterns

## Automatically Retry Failed Operations

Compose a Stream with the .retry(Schedule) operator to automatically recover from transient failures.

### Example

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

---

## Collect All Results into a List

Use Stream.runCollect to execute a stream and collect all its emitted values into a Chunk.

### Example

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

---

## Create a Stream from a List

Use Stream.fromIterable to begin a pipeline from an in-memory collection.

### Example

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

---

## Fan Out to Multiple Consumers

Use broadcast or partition to send stream data to multiple consumers.

### Example

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

---

## Implement Backpressure in Pipelines

Use buffering and throttling to handle producers faster than consumers.

### Example

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

---

## Implement Dead Letter Queues

Capture failed items with context for debugging and retry instead of losing them.

### Example

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

---

## Manage Resources Safely in a Pipeline

Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

### Example

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

---

## Merge Multiple Streams

Use merge, concat, or zip to combine multiple streams based on your requirements.

### Example

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

---

## Process a Large File with Constant Memory

Use Stream.fromReadable with a Node.js Readable stream to process files efficiently.

### Example

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

---

## Process collections of data asynchronously

Leverage Stream to process collections effectfully with built-in concurrency control and resource safety.

### Example

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

---

## Process Items Concurrently

Use Stream.mapEffect with the `concurrency` option to process stream items in parallel.

### Example

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

---

## Process Items in Batches

Use Stream.grouped(n) to transform a stream of items into a stream of batched chunks.

### Example

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

---

## Run a Pipeline for its Side Effects

Use Stream.runDrain to execute a stream for its side effects when you don't need the final values.

### Example

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

---

## Turn a Paginated API into a Single Stream

Use Stream.paginateEffect to model a paginated data source as a single, continuous stream.

### Example

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

---

