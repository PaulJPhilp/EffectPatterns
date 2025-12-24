# concurrency Patterns

## Add Caching by Wrapping a Layer

Use a wrapping Layer to add cross-cutting concerns like caching to a service without altering its original implementation.

### Example

We have a `WeatherService` that makes slow API calls. We create a `WeatherService.cached` wrapper layer that adds an in-memory cache using a `Ref` and a `Map`.

```typescript
import { Effect, Layer, Ref } from "effect";

// 1. Define the service interface
class WeatherService extends Effect.Service<WeatherService>()(
  "WeatherService",
  {
    sync: () => ({
      getForecast: (city: string) => Effect.succeed(`Sunny in ${city}`),
    }),
  }
) {}

// 2. The "Live" implementation that is slow
const WeatherServiceLive = Layer.succeed(
  WeatherService,
  WeatherService.of({
    _tag: "WeatherService",
    getForecast: (city) =>
      Effect.succeed(`Sunny in ${city}`).pipe(
        Effect.delay("2 seconds"),
        Effect.tap(() => Effect.log(`Fetched live forecast for ${city}`))
      ),
  })
);

// 3. The Caching Wrapper Layer
const WeatherServiceCached = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    // It REQUIRES the original WeatherService
    const underlyingService = yield* WeatherService;
    const cache = yield* Ref.make(new Map<string, string>());

    return WeatherService.of({
      _tag: "WeatherService",
      getForecast: (city) =>
        Ref.get(cache).pipe(
          Effect.flatMap((map) =>
            map.has(city)
              ? Effect.log(`Cache HIT for ${city}`).pipe(
                  Effect.as(map.get(city)!)
                )
              : Effect.log(`Cache MISS for ${city}`).pipe(
                  Effect.flatMap(() => underlyingService.getForecast(city)),
                  Effect.tap((forecast) =>
                    Ref.update(cache, (map) => map.set(city, forecast))
                  )
                )
          )
        ),
    });
  })
);

// 4. Compose the final layer. The wrapper is provided with the live implementation.
const AppLayer = Layer.provide(WeatherServiceCached, WeatherServiceLive);

// 5. The application logic
const program = Effect.gen(function* () {
  const weather = yield* WeatherService;
  yield* weather.getForecast("London"); // First call is slow (MISS)
  yield* weather.getForecast("London"); // Second call is instant (HIT)
});

Effect.runPromise(Effect.provide(program, AppLayer));
```

---

---

## Concurrency Pattern 1: Coordinate Async Operations with Deferred

Use Deferred for one-time async coordination between fibers, enabling multiple consumers to wait for a single producer's result.

### Example

This example demonstrates a service startup pattern where multiple workers wait for initialization to complete before starting processing.

```typescript
import { Effect, Deferred, Fiber } from "effect";

interface ServiceConfig {
  readonly name: string;
  readonly port: number;
}

interface Service {
  readonly name: string;
  readonly isReady: Deferred.Deferred<void>;
}

// Simulate a service that takes time to initialize
const createService = (config: ServiceConfig): Effect.Effect<Service> =>
  Effect.gen(function* () {
    const isReady = yield* Deferred.make<void>();

    return { name: config.name, isReady };
  });

// Initialize the service (runs in background)
const initializeService = (service: Service): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[${service.name}] Starting initialization...`);

    // Simulate initialization work
    yield* Effect.sleep("1 second");

    yield* Effect.log(`[${service.name}] Initialization complete`);

    // Signal that service is ready
    yield* Deferred.succeed(service.isReady, undefined);
  });

// A worker that waits for service to be ready before starting
const createWorker = (
  id: number,
  services: Service[]
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[Worker ${id}] Starting, waiting for services...`);

    // Wait for all services to be ready
    yield* Effect.all(
      services.map((service) =>
        Deferred.await(service.isReady).pipe(
          Effect.tapError((error) =>
            Effect.log(
              `[Worker ${id}] Error waiting for ${service.name}: ${error}`
            )
          )
        )
      )
    );

    yield* Effect.log(`[Worker ${id}] All services ready, starting work`);

    // Simulate worker processing
    for (let i = 0; i < 3; i++) {
      yield* Effect.sleep("500 millis");
      yield* Effect.log(`[Worker ${id}] Processing task ${i + 1}`);
    }

    yield* Effect.log(`[Worker ${id}] Complete`);
  });

// Main program
const program = Effect.gen(function* () {
  // Create services
  const apiService = yield* createService({ name: "API", port: 3000 });
  const dbService = yield* createService({ name: "Database", port: 5432 });
  const cacheService = yield* createService({ name: "Cache", port: 6379 });

  const services = [apiService, dbService, cacheService];

  // Start initializing services in background
  const initFibers = yield* Effect.all(
    services.map((service) => initializeService(service).pipe(Effect.fork))
  );

  // Start workers that wait for services
  const workerFibers = yield* Effect.all(
    [1, 2, 3].map((id) => createWorker(id, services).pipe(Effect.fork))
  );

  // Wait for all workers to complete
  yield* Effect.all(workerFibers.map((fiber) => Fiber.join(fiber)));

  // Cancel initialization fibers (they're done anyway)
  yield* Effect.all(initFibers.map((fiber) => Fiber.interrupt(fiber)));

  yield* Effect.log(`\n[MAIN] All workers completed`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates Deferred instances** for each service's readiness
2. **Starts initialization** in background fibers
3. **Workers wait** for all services via `Deferred.await`
4. **Service signals completion** via `Deferred.succeed`
5. **Workers resume** when all dependencies ready

---

---

## Concurrency Pattern 2: Rate Limit Concurrent Access with Semaphore

Use Semaphore to limit concurrent access to resources, preventing overload and enabling fair resource distribution.

### Example

This example demonstrates limiting concurrent database connections using a Semaphore, preventing connection pool exhaustion.

```typescript
import { Effect, Semaphore, Fiber } from "effect";

interface QueryResult {
  readonly id: number;
  readonly result: string;
  readonly duration: number;
}

// Simulate a database query that holds a connection
const executeQuery = (
  queryId: number,
  connectionId: number,
  durationMs: number
): Effect.Effect<QueryResult> =>
  Effect.gen(function* () {
    const startTime = Date.now();

    yield* Effect.log(
      `[Query ${queryId}] Using connection ${connectionId}, duration: ${durationMs}ms`
    );

    // Simulate query execution
    yield* Effect.sleep(`${durationMs} millis`);

    const duration = Date.now() - startTime;

    return {
      id: queryId,
      result: `Result from query ${queryId}`,
      duration,
    };
  });

// Pool configuration
interface ConnectionPoolConfig {
  readonly maxConnections: number;
  readonly queryTimeout?: number;
}

// Create a rate-limited query executor
const createRateLimitedQueryExecutor = (
  config: ConnectionPoolConfig
): Effect.Effect<
  (queryId: number, durationMs: number) => Effect.Effect<QueryResult>
> =>
  Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(config.maxConnections);
    let connectionCounter = 0;

    return (queryId: number, durationMs: number) =>
      Effect.gen(function* () {
        // Acquire a permit (wait if none available)
        yield* Semaphore.acquire(semaphore);

        const connectionId = ++connectionCounter;

        // Use try-finally to ensure permit is released
        const result = yield* executeQuery(queryId, connectionId, durationMs).pipe(
          Effect.ensuring(
            Semaphore.release(semaphore).pipe(
              Effect.tap(() =>
                Effect.log(`[Query ${queryId}] Released connection ${connectionId}`)
              )
            )
          )
        );

        return result;
      });
  });

// Simulate multiple queries arriving
const program = Effect.gen(function* () {
  const executor = yield* createRateLimitedQueryExecutor({
    maxConnections: 3, // Only 3 concurrent connections
  });

  // Generate 10 queries with varying durations
  const queries = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    duration: 500 + Math.random() * 1500, // 500-2000ms
  }));

  console.log(`\n[POOL] Starting with max 3 concurrent connections\n`);

  // Execute all queries with concurrency limit
  const results = yield* Effect.all(
    queries.map((q) =>
      executor(q.id, Math.round(q.duration)).pipe(Effect.fork)
    )
  ).pipe(
    Effect.andThen((fibers) =>
      Effect.all(fibers.map((fiber) => Fiber.join(fiber)))
    )
  );

  console.log(`\n[POOL] All queries completed\n`);

  // Summary
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;

  console.log(`[SUMMARY]`);
  console.log(`  Total queries: ${results.length}`);
  console.log(`  Avg duration: ${Math.round(avgDuration)}ms`);
  console.log(`  Total time: ${Math.max(...results.map((r) => r.duration))}ms (parallel)`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates a Semaphore** with fixed permit count
2. **Acquires permit** before using connection
3. **Executes operation** while holding permit
4. **Releases permit** in finally block (guaranteed)
5. **Fair queuing** of waiting queries

---

---

## Concurrency Pattern 3: Coordinate Multiple Fibers with Latch

Use Latch to coordinate multiple fibers awaiting a common completion signal, enabling fan-out/fan-in and barrier synchronization patterns.

### Example

This example demonstrates a fan-out/fan-in pattern: spawn 5 worker fibers that process tasks in parallel, and coordinate to know when all are complete.

```typescript
import { Effect, Latch, Fiber, Ref } from "effect";

interface WorkResult {
  readonly workerId: number;
  readonly taskId: number;
  readonly result: string;
  readonly duration: number;
}

// Simulate a long-running task
const processTask = (
  workerId: number,
  taskId: number
): Effect.Effect<WorkResult> =>
  Effect.gen(function* () {
    const startTime = Date.now();
    const duration = 100 + Math.random() * 400; // 100-500ms

    yield* Effect.log(
      `[Worker ${workerId}] Starting task ${taskId} (duration: ${Math.round(duration)}ms)`
    );

    yield* Effect.sleep(`${Math.round(duration)} millis`);

    const elapsed = Date.now() - startTime;

    yield* Effect.log(
      `[Worker ${workerId}] ✓ Completed task ${taskId} in ${elapsed}ms`
    );

    return {
      workerId,
      taskId,
      result: `Result from worker ${workerId} on task ${taskId}`,
      duration: elapsed,
    };
  });

// Fan-out/Fan-in with Latch
const fanOutFanIn = Effect.gen(function* () {
  const numWorkers = 5;
  const tasksPerWorker = 3;

  // Create latch: will countdown from (numWorkers) when all workers complete
  const workersCompleteLatch = yield* Latch.make(numWorkers);

  // Track results from all workers
  const results = yield* Ref.make<WorkResult[]>([]);

  // Worker fiber that processes tasks sequentially
  const createWorker = (workerId: number) =>
    Effect.gen(function* () {
      try {
        yield* Effect.log(`[Worker ${workerId}] ▶ Starting`);

        // Process multiple tasks
        for (let i = 1; i <= tasksPerWorker; i++) {
          const result = yield* processTask(workerId, i);
          yield* Ref.update(results, (rs) => [...rs, result]);
        }

        yield* Effect.log(`[Worker ${workerId}] ✓ All tasks completed`);
      } finally {
        // Signal completion to latch
        yield* Latch.countDown(workersCompleteLatch);
        yield* Effect.log(`[Worker ${workerId}] Signaled latch`);
      }
    });

  // Spawn all workers as background fibers
  console.log(`\n[COORDINATOR] Spawning ${numWorkers} workers...\n`);

  const workerFibers = yield* Effect.all(
    Array.from({ length: numWorkers }, (_, i) =>
      createWorker(i + 1).pipe(Effect.fork)
    )
  );

  // Wait for all workers to complete
  console.log(`\n[COORDINATOR] Waiting for all workers to finish...\n`);

  yield* Latch.await(workersCompleteLatch);

  console.log(`\n[COORDINATOR] All workers completed!\n`);

  // Join all fibers to ensure cleanup
  yield* Effect.all(workerFibers.map((fiber) => Fiber.join(fiber)));

  // Aggregate results
  const allResults = yield* Ref.get(results);

  console.log(`[SUMMARY]`);
  console.log(`  Total workers: ${numWorkers}`);
  console.log(`  Tasks per worker: ${tasksPerWorker}`);
  console.log(`  Total tasks: ${allResults.length}`);
  console.log(
    `  Avg task duration: ${Math.round(
      allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length
    )}ms`
  );
});

Effect.runPromise(fanOutFanIn);
```

This pattern:

1. **Creates Latch** with count = number of workers
2. **Spawns worker fibers** as background tasks
3. **Each worker processes tasks** independently
4. **Signals Latch** when work completes (countDown)
5. **Coordinator awaits** until all workers signal
6. **Aggregates results** from all workers

---

---

## Concurrency Pattern 4: Distribute Work with Queue

Use Queue to distribute work between producers and consumers with built-in backpressure, enabling flexible pipeline coordination.

### Example

This example demonstrates a producer-consumer pipeline with a bounded queue for buffering work items.

```typescript
import { Effect, Queue, Fiber, Ref } from "effect";

interface WorkItem {
  readonly id: number;
  readonly data: string;
  readonly timestamp: number;
}

interface WorkResult {
  readonly itemId: number;
  readonly processed: string;
  readonly duration: number;
}

// Producer: generates work items
const producer = (
  queue: Queue.Enqueue<WorkItem>,
  count: number
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[PRODUCER] Starting, generating ${count} items`);

    for (let i = 1; i <= count; i++) {
      const item: WorkItem = {
        id: i,
        data: `Item ${i}`,
        timestamp: Date.now(),
      };

      const start = Date.now();

      // Enqueue - will block if queue is full (backpressure)
      yield* Queue.offer(queue, item);

      const delay = Date.now() - start;

      if (delay > 0) {
        yield* Effect.log(
          `[PRODUCER] Item ${i} enqueued (waited ${delay}ms due to backpressure)`
        );
      } else {
        yield* Effect.log(`[PRODUCER] Item ${i} enqueued`);
      }

      // Simulate work
      yield* Effect.sleep("50 millis");
    }

    yield* Effect.log(`[PRODUCER] ✓ All items enqueued`);
  });

// Consumer: processes work items
const consumer = (
  queue: Queue.Dequeue<WorkItem>,
  consumerId: number,
  results: Ref.Ref<WorkResult[]>
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[CONSUMER ${consumerId}] Starting`);

    while (true) {
      // Dequeue - will block if queue is empty
      const item = yield* Queue.take(queue).pipe(Effect.either);

      if (item._tag === "Left") {
        yield* Effect.log(`[CONSUMER ${consumerId}] Queue closed, stopping`);
        return;
      }

      const workItem = item.right;
      const startTime = Date.now();

      yield* Effect.log(
        `[CONSUMER ${consumerId}] Processing ${workItem.data}`
      );

      // Simulate processing
      yield* Effect.sleep("150 millis");

      const duration = Date.now() - startTime;
      const result: WorkResult = {
        itemId: workItem.id,
        processed: `${workItem.data} [processed by consumer ${consumerId}]`,
        duration,
      };

      yield* Ref.update(results, (rs) => [...rs, result]);

      yield* Effect.log(
        `[CONSUMER ${consumerId}] ✓ Completed ${workItem.data} in ${duration}ms`
      );
    }
  });

// Main: coordinate producer and consumers
const program = Effect.gen(function* () {
  // Create bounded queue with capacity 3
  const queue = yield* Queue.bounded<WorkItem>(3);
  const results = yield* Ref.make<WorkResult[]>([]);

  console.log(`\n[MAIN] Starting producer-consumer pipeline with queue size 3\n`);

  // Spawn producer
  const producerFiber = yield* producer(queue, 10).pipe(Effect.fork);

  // Spawn 2 consumers
  const consumer1 = yield* consumer(queue, 1, results).pipe(Effect.fork);
  const consumer2 = yield* consumer(queue, 2, results).pipe(Effect.fork);

  // Wait for producer to finish
  yield* Fiber.join(producerFiber);

  // Give consumers time to finish
  yield* Effect.sleep("3 seconds");

  // Close queue and wait for consumers
  yield* Queue.shutdown(queue);
  yield* Fiber.join(consumer1);
  yield* Fiber.join(consumer2);

  // Summary
  const allResults = yield* Ref.get(results);
  const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n[SUMMARY]`);
  console.log(`  Items processed: ${allResults.length}`);
  console.log(
    `  Avg processing time: ${Math.round(totalDuration / allResults.length)}ms`
  );
});

Effect.runPromise(program);
```

This pattern:

1. **Creates bounded queue** with capacity (backpressure point)
2. **Producer enqueues** items (blocks if full)
3. **Consumers dequeue** and process (each at own pace)
4. **Queue coordinates** flow automatically

---

---

## Concurrency Pattern 5: Broadcast Events with PubSub

Use PubSub to broadcast events to multiple subscribers, enabling event-driven architectures where publishers and subscribers are loosely coupled.

### Example

This example demonstrates a multi-subscriber event broadcast system with independent handlers.

```typescript
import { Effect, PubSub, Fiber, Ref } from "effect";

interface StateChangeEvent {
  readonly id: string;
  readonly oldValue: string;
  readonly newValue: string;
  readonly timestamp: number;
}

interface Subscriber {
  readonly name: string;
  readonly events: StateChangeEvent[];
}

// Create subscribers that react to events
const createSubscriber = (
  name: string,
  pubsub: PubSub.PubSub<StateChangeEvent>,
  events: Ref.Ref<StateChangeEvent[]>
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[${name}] ✓ Subscribed`);

    // Get subscriber handle
    const subscription = yield* PubSub.subscribe(pubsub);

    // Listen for events indefinitely
    while (true) {
      const event = yield* subscription.take();

      yield* Effect.log(
        `[${name}] Received event: ${event.oldValue} → ${event.newValue}`
      );

      // Simulate processing
      yield* Effect.sleep("50 millis");

      // Store event (example action)
      yield* Ref.update(events, (es) => [...es, event]);

      yield* Effect.log(`[${name}] ✓ Processed event`);
    }
  });

// Publisher that broadcasts events
const publisher = (
  pubsub: PubSub.PubSub<StateChangeEvent>,
  eventCount: number
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.log(`[PUBLISHER] Starting, publishing ${eventCount} events`);

    for (let i = 1; i <= eventCount; i++) {
      const event: StateChangeEvent = {
        id: `event-${i}`,
        oldValue: `state-${i - 1}`,
        newValue: `state-${i}`,
        timestamp: Date.now(),
      };

      // Publish to all subscribers
      const size = yield* PubSub.publish(pubsub, event);

      yield* Effect.log(
        `[PUBLISHER] Published event to ${size} subscribers`
      );

      // Simulate delay between events
      yield* Effect.sleep("200 millis");
    }

    yield* Effect.log(`[PUBLISHER] ✓ All events published`);
  });

// Main: coordinate publisher and multiple subscribers
const program = Effect.gen(function* () {
  // Create PubSub with bounded capacity
  const pubsub = yield* PubSub.bounded<StateChangeEvent>(5);

  // Create storage for each subscriber's events
  const subscriber1Events = yield* Ref.make<StateChangeEvent[]>([]);
  const subscriber2Events = yield* Ref.make<StateChangeEvent[]>([]);
  const subscriber3Events = yield* Ref.make<StateChangeEvent[]>([]);

  console.log(`\n[MAIN] Starting PubSub event broadcast system\n`);

  // Subscribe 3 independent subscribers
  const sub1Fiber = yield* createSubscriber(
    "SUBSCRIBER-1",
    pubsub,
    subscriber1Events
  ).pipe(Effect.fork);

  const sub2Fiber = yield* createSubscriber(
    "SUBSCRIBER-2",
    pubsub,
    subscriber2Events
  ).pipe(Effect.fork);

  const sub3Fiber = yield* createSubscriber(
    "SUBSCRIBER-3",
    pubsub,
    subscriber3Events
  ).pipe(Effect.fork);

  // Wait for subscriptions to establish
  yield* Effect.sleep("100 millis");

  // Start publisher
  const publisherFiber = yield* publisher(pubsub, 5).pipe(Effect.fork);

  // Wait for publisher to finish
  yield* Fiber.join(publisherFiber);

  // Wait a bit for subscribers to process last events
  yield* Effect.sleep("1 second");

  // Shut down
  yield* PubSub.shutdown(pubsub);
  yield* Fiber.join(sub1Fiber).pipe(Effect.catchAll(() => Effect.void));
  yield* Fiber.join(sub2Fiber).pipe(Effect.catchAll(() => Effect.void));
  yield* Fiber.join(sub3Fiber).pipe(Effect.catchAll(() => Effect.void));

  // Print summary
  const events1 = yield* Ref.get(subscriber1Events);
  const events2 = yield* Ref.get(subscriber2Events);
  const events3 = yield* Ref.get(subscriber3Events);

  console.log(`\n[SUMMARY]`);
  console.log(`  Subscriber 1 received: ${events1.length} events`);
  console.log(`  Subscriber 2 received: ${events2.length} events`);
  console.log(`  Subscriber 3 received: ${events3.length} events`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates PubSub** for event distribution
2. **Multiple subscribers** listen independently
3. **Publisher broadcasts** events to all
4. **Each subscriber** processes at own pace

---

---

## Concurrency Pattern 6: Race and Timeout Competing Effects

Use race to compete effects and timeout to enforce deadlines, enabling cancellation when operations exceed time limits or complete.

### Example

This example demonstrates racing competing effects and handling timeouts.

```typescript
import { Effect, Fiber } from "effect";

interface DataSource {
  readonly name: string;
  readonly latencyMs: number;
}

// Simulate fetching from different sources
const fetchFromSource = (source: DataSource): Effect.Effect<string> =>
  Effect.gen(function* () {
    yield* Effect.log(
      `[${source.name}] Starting fetch (latency: ${source.latencyMs}ms)`
    );

    yield* Effect.sleep(`${source.latencyMs} millis`);

    const result = `Data from ${source.name}`;

    yield* Effect.log(`[${source.name}] ✓ Completed`);

    return result;
  });

// Main: demonstrate race patterns
const program = Effect.gen(function* () {
  console.log(`\n[RACE] Competing effects with race and timeout\n`);

  // Example 1: Simple race (fastest wins)
  console.log(`[1] Racing 3 data sources:\n`);

  const sources: DataSource[] = [
    { name: "Primary DC", latencyMs: 200 },
    { name: "Backup DC", latencyMs: 150 },
    { name: "Cache", latencyMs: 50 },
  ];

  const raceResult = yield* Effect.race(
    fetchFromSource(sources[0]),
    Effect.race(fetchFromSource(sources[1]), fetchFromSource(sources[2]))
  );

  console.log(`\nWinner: ${raceResult}\n`);

  // Example 2: Timeout - succeed within deadline
  console.log(`[2] Timeout with fast operation:\n`);

  const fastOp = fetchFromSource({ name: "Fast Op", latencyMs: 100 }).pipe(
    Effect.timeout("500 millis")
  );

  const fastResult = yield* fastOp;

  console.log(`✓ Completed within timeout: ${fastResult}\n`);

  // Example 3: Timeout - exceed deadline
  console.log(`[3] Timeout with slow operation:\n`);

  const slowOp = fetchFromSource({ name: "Slow Op", latencyMs: 2000 }).pipe(
    Effect.timeout("500 millis"),
    Effect.either
  );

  const timeoutResult = yield* slowOp;

  if (timeoutResult._tag === "Left") {
    console.log(`✗ Operation timed out after 500ms\n`);
  }

  // Example 4: Race with timeout fallback
  console.log(`[4] Race with fallback on timeout:\n`);

  const primary = fetchFromSource({ name: "Primary", latencyMs: 300 });

  const fallback = fetchFromSource({ name: "Fallback", latencyMs: 100 });

  const raceWithFallback = primary.pipe(
    Effect.timeout("150 millis"),
    Effect.catchAll(() => {
      yield* Effect.log(`[PRIMARY] Timed out, using fallback`);

      return fallback;
    })
  );

  const fallbackResult = yield* raceWithFallback;

  console.log(`Result: ${fallbackResult}\n`);

  // Example 5: Race all (collect all winners)
  console.log(`[5] Race all - multiple sources:\n`);

  const raceAllResult = yield* Effect.raceAll(
    sources.map((s) =>
      fetchFromSource(s).pipe(
        Effect.map((data) => ({ source: s.name, data }))
      )
    )
  );

  console.log(`First to complete: ${raceAllResult.source}\n`);
});

Effect.runPromise(program);
```

---

---

## Decouple Fibers with Queues and PubSub

Use Queue for point-to-point work distribution and PubSub for broadcast messaging between fibers.

### Example

A producer fiber adds jobs to a `Queue`, and a worker fiber takes jobs off the queue to process them.

```typescript
import { Effect, Queue, Fiber } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting queue demo...");

  // Create a bounded queue that can hold a maximum of 10 items.
  // This prevents memory issues by applying backpressure when the queue is full.
  // If a producer tries to add to a full queue, it will suspend until space is available.
  const queue = yield* Queue.bounded<string>(10);
  yield* Effect.logInfo("Created bounded queue");

  // Producer Fiber: Add a job to the queue every second.
  // This fiber runs independently and continuously produces work items.
  // The producer-consumer pattern decouples work generation from work processing.
  const producer = yield* Effect.gen(function* () {
    let i = 0;
    while (true) {
      const job = `job-${i++}`;
      yield* Effect.logInfo(`Producing ${job}...`);

      // Queue.offer adds an item to the queue. If the queue is full,
      // this operation will suspend the fiber until space becomes available.
      // This provides natural backpressure control.
      yield* Queue.offer(queue, job);

      // Sleep for 500ms between job creation. This controls the production rate.
      // Producer is faster than consumer (500ms vs 1000ms) to demonstrate queue buffering.
      yield* Effect.sleep("500 millis");
    }
  }).pipe(Effect.fork); // Fork creates a new fiber that runs concurrently

  yield* Effect.logInfo("Started producer fiber");

  // Worker Fiber: Take a job from the queue and process it.
  // This fiber runs independently and processes work items as they become available.
  // Multiple workers could be created to scale processing capacity.
  const worker = yield* Effect.gen(function* () {
    while (true) {
      // Queue.take removes and returns an item from the queue.
      // If the queue is empty, this operation will suspend the fiber
      // until an item becomes available. This prevents busy-waiting.
      const job = yield* Queue.take(queue);
      yield* Effect.logInfo(`Processing ${job}...`);

      // Simulate work by sleeping for 1 second.
      // This makes the worker slower than the producer, causing queue buildup.
      yield* Effect.sleep("1 second");
      yield* Effect.logInfo(`Completed ${job}`);
    }
  }).pipe(Effect.fork); // Fork creates another independent fiber

  yield* Effect.logInfo("Started worker fiber");

  // Let them run for a while...
  // The main fiber sleeps while the producer and worker fibers run concurrently.
  // During this time, you'll see the queue acting as a buffer between
  // the fast producer and slow worker.
  yield* Effect.logInfo("Running for 10 seconds...");
  yield* Effect.sleep("10 seconds");
  yield* Effect.logInfo("Done!");

  // Interrupt both fibers to clean up resources.
  // Fiber.interrupt sends an interruption signal to the fiber,
  // allowing it to perform cleanup operations before terminating.
  // This is safer than forcefully killing fibers.
  yield* Fiber.interrupt(producer);
  yield* Fiber.interrupt(worker);

  // Note: In a real application, you might want to:
  // 1. Drain the queue before interrupting workers
  // 2. Use Fiber.join to wait for graceful shutdown
  // 3. Handle interruption signals in the fiber loops
});

// Run the program
// This demonstrates the producer-consumer pattern with Effect fibers:
// - Fibers are lightweight threads that can be created in large numbers
// - Queues provide safe communication between fibers
// - Backpressure prevents resource exhaustion
// - Interruption allows for graceful shutdown
Effect.runPromise(program);
```


A publisher sends an event, and multiple subscribers react to it independently.

```typescript
import { Effect, PubSub } from "effect";

const program = Effect.gen(function* () {
  const pubsub = yield* PubSub.bounded<string>(10);

  // Subscriber 1: The "Audit" service
  const auditSub = PubSub.subscribe(pubsub).pipe(
    Effect.flatMap((subscription) =>
      Effect.gen(function* () {
        while (true) {
          const event = yield* Queue.take(subscription);
          yield* Effect.log(`AUDIT: Received event: ${event}`);
        }
      })
    ),
    Effect.fork
  );

  // Subscriber 2: The "Notifier" service
  const notifierSub = PubSub.subscribe(pubsub).pipe(
    Effect.flatMap((subscription) =>
      Effect.gen(function* () {
        while (true) {
          const event = yield* Queue.take(subscription);
          yield* Effect.log(`NOTIFIER: Sending notification for: ${event}`);
        }
      })
    ),
    Effect.fork
  );

  // Give subscribers time to start
  yield* Effect.sleep("1 second");

  // Publisher: Publish an event that both subscribers will receive.
  yield* PubSub.publish(pubsub, "user_logged_in");
});
```

---

---

## Execute Long-Running Apps with Effect.runFork

Use Effect.runFork to launch a long-running application as a manageable, detached fiber.

### Example

This example starts a simple "server" that runs forever. We use `runFork` to launch it and then use the returned `Fiber` to shut it down gracefully after 5 seconds.

```typescript
import { Effect, Fiber } from "effect";

// A server that listens for requests forever
const server = Effect.log("Server received a request.").pipe(
  Effect.delay("1 second"),
  Effect.forever
);

Effect.runSync(Effect.log("Starting server..."));

// Launch the server as a detached, top-level fiber
const appFiber = Effect.runFork(server);

// In a real app, you would listen for OS signals.
// Here, we simulate a shutdown signal after 5 seconds.
setTimeout(() => {
  const shutdownProgram = Effect.gen(function* () {
    yield* Effect.log("Shutdown signal received. Interrupting server fiber...");
    // This ensures all cleanup logic within the server effect would run.
    yield* Fiber.interrupt(appFiber);
  });
  Effect.runPromise(shutdownProgram);
}, 5000);
```

---

---

## Implement Graceful Shutdown for Your Application

Use Effect.runFork and OS signal listeners to implement graceful shutdown for long-running applications.

### Example

This example creates a server with a "scoped" database connection. It uses `runFork` to start the server and sets up a `SIGINT` handler to interrupt the server fiber, which in turn guarantees the database finalizer is called.

```typescript
import { Effect, Layer, Fiber, Context, Scope } from "effect";
import * as http from "http";

// 1. A service with a finalizer for cleanup
class Database extends Effect.Service<Database>()("Database", {
  effect: Effect.gen(function* () {
    yield* Effect.log("Acquiring DB connection");
    return {
      query: () => Effect.succeed("data"),
    };
  }),
}) {}

// 2. The main server logic
const server = Effect.gen(function* () {
  const db = yield* Database;

  // Create server with proper error handling
  const httpServer = yield* Effect.sync(() => {
    const server = http.createServer((_req, res) => {
      Effect.runFork(
        Effect.provide(
          db.query().pipe(Effect.map((data) => res.end(data))),
          Database.Default
        )
      );
    });
    return server;
  });

  // Add a finalizer to close the server
  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      httpServer.close();
      yield* Effect.log("Server closed");
    })
  );

  // Start server with error handling
  yield* Effect.async<void, Error>((resume) => {
    httpServer.once("error", (err: Error) => {
      resume(Effect.fail(new Error(`Failed to start server: ${err.message}`)));
    });

    httpServer.listen(3456, () => {
      resume(Effect.succeed(void 0));
    });
  });

  yield* Effect.log("Server started on port 3456. Press Ctrl+C to exit.");

  // For testing purposes, we'll run for a short time instead of forever
  yield* Effect.sleep("2 seconds");
  yield* Effect.log("Shutting down gracefully...");
});

// 3. Provide the layer and launch with runFork
const app = Effect.provide(server.pipe(Effect.scoped), Database.Default);

// 4. Run the app and handle shutdown
Effect.runPromise(app).catch((error) => {
  Effect.runSync(Effect.logError("Application error: " + error));
  process.exit(1);
});
```

---

---

## Manage Resource Lifecycles with Scope

Use Scope for fine-grained, manual control over resource lifecycles and cleanup guarantees.

### Example

This example shows how to acquire a resource (like a file handle), use it, and have `Scope` guarantee its release.

```typescript
import { Effect, Scope } from "effect";

// Simulate acquiring and releasing a resource
const acquireFile = Effect.log("File opened").pipe(
  Effect.as({ write: (data: string) => Effect.log(`Wrote: ${data}`) })
);
const releaseFile = Effect.log("File closed.");

// Create a "scoped" effect. This effect, when used, will acquire the
// resource and register its release action with the current scope.
const scopedFile = Effect.acquireRelease(acquireFile, () => releaseFile);

// The main program that uses the scoped resource
const program = Effect.gen(function* () {
  // Effect.scoped "uses" the resource. It runs the acquire effect,
  // provides the resource to the inner effect, and ensures the
  // release effect is run when this block completes.
  const file = yield* Effect.scoped(scopedFile);

  yield* file.write("hello");
  yield* file.write("world");

  // The file will be automatically closed here.
});

Effect.runPromise(program);
/*
Output:
File opened
Wrote: hello
Wrote: world
File closed
*/
```

---

---

## Manage Shared State Safely with Ref

Use Ref to manage shared, mutable state concurrently, ensuring atomicity.

### Example

This program simulates 1,000 concurrent fibers all trying to increment a shared counter. Because we use `Ref.update`, every single increment is applied atomically, and the final result is always correct.

```typescript
import { Effect, Ref } from "effect";

const program = Effect.gen(function* () {
  // Create a new Ref with an initial value of 0
  const ref = yield* Ref.make(0);

  // Define an effect that increments the counter by 1
  const increment = Ref.update(ref, (n) => n + 1);

  // Create an array of 1,000 increment effects
  const tasks = Array.from({ length: 1000 }, () => increment);

  // Run all 1,000 effects concurrently
  yield* Effect.all(tasks, { concurrency: "unbounded" });

  // Get the final value of the counter
  return yield* Ref.get(ref);
});

// The result will always be 1000
const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Final counter value: ${result}`);
  return result;
});

Effect.runPromise(programWithLogging);
```

---

---

## Poll for Status Until a Task Completes

Use Effect.race to run a repeating polling task that is automatically interrupted when a main task completes.

### Example

This program simulates a long-running data processing job. While it's running, a separate effect polls for its status every 2 seconds. When the main job finishes after 10 seconds, the polling automatically stops.

```typescript
import { Effect, Schedule, Duration } from "effect";

// The main task that takes a long time to complete
const longRunningJob = Effect.log("Data processing complete!").pipe(
  Effect.delay(Duration.seconds(10))
);

// The polling task that checks the status
const pollStatus = Effect.log("Polling for job status: In Progress...");

// A schedule that repeats the polling task every 2 seconds, forever
const pollingSchedule = Schedule.fixed(Duration.seconds(2));

// The complete polling effect that will run indefinitely until interrupted
const repeatingPoller = pollStatus.pipe(Effect.repeat(pollingSchedule));

// Race the main job against the poller.
// The longRunningJob will win after 10 seconds, interrupting the poller.
const program = Effect.race(longRunningJob, repeatingPoller);

Effect.runPromise(program);
/*
Output:
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Polling for job status: In Progress...
Data processing complete!
*/
```

---

---

## Process a Collection in Parallel with Effect.forEach

Use Effect.forEach with the `concurrency` option to process a collection in parallel with a fixed limit.

### Example

Imagine you have a list of 100 user IDs and you need to fetch the data for each one. `Effect.forEach` with a concurrency of 10 will process them in controlled parallel batches.

```typescript
import { Clock, Effect } from "effect";

// Mock function to simulate fetching a user by ID
const fetchUserById = (id: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Fetching user ${id}...`);
    yield* Effect.sleep("1 second"); // Simulate network delay
    return { id, name: `User ${id}`, email: `user${id}@example.com` };
  });

const userIds = Array.from({ length: 10 }, (_, i) => i + 1);

// Process the entire array, but only run 5 fetches at a time.
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting parallel processing...");

  const startTime = yield* Clock.currentTimeMillis;
  const users = yield* Effect.forEach(userIds, fetchUserById, {
    concurrency: 5, // Limit to 5 concurrent operations
  });
  const endTime = yield* Clock.currentTimeMillis;

  yield* Effect.logInfo(
    `Processed ${users.length} users in ${endTime - startTime}ms`
  );
  yield* Effect.logInfo(
    `First few users: ${JSON.stringify(users.slice(0, 3), null, 2)}`
  );

  return users;
});

// The result will be an array of all user objects.
// The total time will be much less than running them sequentially.
Effect.runPromise(program);
```

---

---

## Race Concurrent Effects for the Fastest Result

Use Effect.race to get the result from the first of several effects to succeed, automatically interrupting the losers.

### Example

A classic use case is checking a fast cache before falling back to a slower database. We can race the cache lookup against the database query.

```typescript
import { Effect, Option } from "effect";

type User = { id: number; name: string };

// Simulate a slower cache lookup that might find nothing (None)
const checkCache: Effect.Effect<Option.Option<User>> = Effect.succeed(
  Option.none()
).pipe(
  Effect.delay("200 millis") // Made slower so database wins
);

// Simulate a faster database query that will always find the data
const queryDatabase: Effect.Effect<Option.Option<User>> = Effect.succeed(
  Option.some({ id: 1, name: "Paul" })
).pipe(
  Effect.delay("50 millis") // Made faster so it wins the race
);

// Race them. The database should win and return the user data.
const program = Effect.race(checkCache, queryDatabase).pipe(
  // The result of the race is an Option, so we can handle it.
  Effect.flatMap((result: Option.Option<User>) =>
    Option.match(result, {
      onNone: () => Effect.fail("User not found anywhere."),
      onSome: (user) => Effect.succeed(user),
    })
  )
);

// In this case, the database wins the race.
const programWithResults = Effect.gen(function* () {
  try {
    const user = yield* program;
    yield* Effect.log(`User found: ${JSON.stringify(user)}`);
    return user;
  } catch (error) {
    yield* Effect.logError(`Error: ${error}`);
    throw error;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Handled error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithResults);

// Also demonstrate with logging
const programWithLogging = Effect.gen(function* () {
  yield* Effect.logInfo("Starting race between cache and database...");

  try {
    const user = yield* program;
    yield* Effect.logInfo(
      `Success: Found user ${user.name} with ID ${user.id}`
    );
    return user;
  } catch (error) {
    yield* Effect.logInfo("This won't be reached due to Effect error handling");
    return null;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Handled error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithLogging);
```

---

---

## Run Background Tasks with Effect.fork

Use Effect.fork to start a non-blocking background process and manage its lifecycle via its Fiber.

### Example

This program forks a background process that logs a "tick" every second. The main process does its own work for 5 seconds and then explicitly interrupts the background logger before exiting.

```typescript
import { Effect, Fiber } from "effect";

// A long-running effect that logs a message every second, forever
// Effect.forever creates an infinite loop that repeats the effect
// This simulates a background service like a health check or monitoring task
const tickingClock = Effect.log("tick").pipe(
  Effect.delay("1 second"), // Wait 1 second between ticks
  Effect.forever // Repeat indefinitely - this creates an infinite effect
);

const program = Effect.gen(function* () {
  yield* Effect.log("Forking the ticking clock into the background.");

  // Start the clock, but don't wait for it.
  // Effect.fork creates a new fiber that runs concurrently with the main program
  // The main fiber continues immediately without waiting for the background task
  // This is essential for non-blocking background operations
  const clockFiber = yield* Effect.fork(tickingClock);

  // At this point, we have two fibers running:
  // 1. The main fiber (this program)
  // 2. The background clock fiber (ticking every second)

  yield* Effect.log("Main process is now doing other work for 5 seconds...");

  // Simulate the main application doing work
  // While this sleep happens, the background clock continues ticking
  // This demonstrates true concurrency - both fibers run simultaneously
  yield* Effect.sleep("5 seconds");

  yield* Effect.log("Main process is done. Interrupting the clock fiber.");

  // Stop the background process.
  // Fiber.interrupt sends an interruption signal to the fiber
  // This allows the fiber to perform cleanup operations before terminating
  // Without this, the background task would continue running indefinitely
  yield* Fiber.interrupt(clockFiber);

  // Important: Always clean up background fibers to prevent resource leaks
  // In a real application, you might want to:
  // 1. Use Fiber.join instead of interrupt to wait for graceful completion
  // 2. Handle interruption signals within the background task
  // 3. Implement proper shutdown procedures

  yield* Effect.log("Program finished.");

  // Key concepts demonstrated:
  // 1. Fork creates concurrent fibers without blocking
  // 2. Background tasks run independently of the main program
  // 3. Fiber interruption provides controlled shutdown
  // 4. Multiple fibers can run simultaneously on the same thread pool
});

// This example shows how to:
// - Run background tasks that don't block the main program
// - Manage fiber lifecycles (create, run, interrupt)
// - Coordinate between multiple concurrent operations
// - Properly clean up resources when shutting down
Effect.runPromise(program);
```

---

---

## Run Independent Effects in Parallel with Effect.all

Use Effect.all to execute a collection of independent effects concurrently.

### Example

Imagine fetching a user's profile and their latest posts from two different API endpoints. These are independent operations and can be run in parallel to save time.

```typescript
import { Effect } from "effect";

// Simulate fetching a user, takes 1 second
const fetchUser = Effect.succeed({ id: 1, name: "Paul" }).pipe(
  Effect.delay("1 second")
);

// Simulate fetching posts, takes 1.5 seconds
const fetchPosts = Effect.succeed([{ title: "Effect is great" }]).pipe(
  Effect.delay("1.5 seconds")
);

// Run both effects concurrently - must specify concurrency option!
const program = Effect.all([fetchUser, fetchPosts], {
  concurrency: "unbounded",
});

// The resulting effect will succeed with a tuple: [{id, name}, [{title}]]
// Total execution time will be ~1.5 seconds (the duration of the longest task).
const programWithLogging = Effect.gen(function* () {
  const results = yield* program;
  yield* Effect.log(`Results: ${JSON.stringify(results)}`);
  return results;
});

Effect.runPromise(programWithLogging);
```

---

---

## State Management Pattern 1: Synchronized Reference with SynchronizedRef

Use SynchronizedRef for thread-safe mutable state that must be updated consistently across concurrent operations, with atomic modifications.

### Example

This example demonstrates synchronized reference patterns.

```typescript
import { Effect, Ref, Fiber, Deferred } from "effect";

interface Counter {
  readonly value: number;
  readonly updates: number;
}

interface Account {
  readonly balance: number;
  readonly transactions: string[];
}

const program = Effect.gen(function* () {
  console.log(
    `\n[SYNCHRONIZED REFERENCES] Concurrent state management\n`
  );

  // Example 1: Basic counter with atomic updates
  console.log(`[1] Atomic counter increments:\n`);

  const counter = yield* Ref.make<Counter>({
    value: 0,
    updates: 0,
  });

  // Simulate 5 concurrent increments
  const incrementTasks = Array.from({ length: 5 }, (_, i) =>
    Effect.gen(function* () {
      for (let j = 0; j < 20; j++) {
        yield* Ref.modify(counter, (current) => [
          undefined,
          {
            value: current.value + 1,
            updates: current.updates + 1,
          },
        ]);

        if (j === 0 || j === 19) {
          yield* Effect.log(
            `[FIBER ${i}] Increment ${j === 0 ? "start" : "end"}`
          );
        }
      }
    })
  );

  // Run concurrently
  yield* Effect.all(incrementTasks, { concurrency: "unbounded" });

  const finalCounter = yield* Ref.get(counter);

  yield* Effect.log(
    `[RESULT] Counter: ${finalCounter.value} (expected 100)`
  );
  yield* Effect.log(
    `[RESULT] Updates: ${finalCounter.updates} (expected 100)\n`
  );

  // Example 2: Bank account with transaction isolation
  console.log(`[2] Account with atomic transfers:\n`);

  const account = yield* Ref.make<Account>({
    balance: 1000,
    transactions: [],
  });

  const transfer = (amount: number, description: string) =>
    Ref.modify(account, (current) => {
      if (current.balance < amount) {
        // Insufficient funds, don't modify
        return [
          { success: false, reason: "insufficient-funds" },
          current, // Unchanged
        ];
      }

      // Atomic: deduct + record transaction
      return [
        { success: true, reason: "transferred" },
        {
          balance: current.balance - amount,
          transactions: [
            ...current.transactions,
            `${description}: -$${amount}`,
          ],
        },
      ];
    });

  // Test transfer
  const t1 = yield* transfer(100, "Coffee");

  yield* Effect.log(`[TRANSFER 1] ${t1.success ? "✓" : "✗"} ${t1.reason}`);

  const t2 = yield* transfer(2000, "Electronics");

  yield* Effect.log(`[TRANSFER 2] ${t2.success ? "✓" : "✗"} ${t2.reason}`);

  const t3 = yield* transfer(200, "Groceries");

  yield* Effect.log(`[TRANSFER 3] ${t3.success ? "✓" : "✗"} ${t3.reason}\n`);

  // Example 3: Concurrent reads don't block writes
  console.log(`[3] Concurrent reads and writes:\n`);

  const state = yield* Ref.make({ value: 0, readers: 0 });

  const read = Effect.gen(function* () {
    const snapshot = yield* Ref.get(state);

    yield* Effect.log(
      `[READ] Got value: ${snapshot.value}`
    );

    return snapshot.value;
  });

  const write = (newValue: number) =>
    Ref.set(state, { value: newValue, readers: 0 });

  // Concurrent operations
  const mixed = Effect.all(
    [
      read,
      write(10),
      read,
      write(20),
      read,
    ],
    { concurrency: "unbounded" }
  );

  yield* mixed;

  // Example 4: Compare-and-set pattern (retry on failure)
  console.log(`\n[4] Compare-and-set (optimistic updates):\n`);

  const versionedState = yield* Ref.make({ version: 0, data: "initial" });

  const updateWithVersion = (newData: string) =>
    Effect.gen(function* () {
      let retries = 0;

      while (retries < 3) {
        const current = yield* Ref.get(versionedState);

        // Try to update (check-and-set)
        const result = yield* Ref.modify(versionedState, (s) => {
          if (s.version === current.version) {
            // No concurrent update, proceed
            return [
              { success: true },
              {
                version: s.version + 1,
                data: newData,
              },
            ];
          }

          // Version changed, conflict
          return [{ success: false }, s];
        });

        if (result.success) {
          yield* Effect.log(
            `[CAS] Updated on attempt ${retries + 1}`
          );

          return true;
        }

        retries++;

        yield* Effect.log(
          `[CAS] Conflict detected, retrying (attempt ${retries + 1})`
        );
      }

      return false;
    });

  const casResult = yield* updateWithVersion("updated-data");

  yield* Effect.log(`[CAS] Success: ${casResult}\n`);

  // Example 5: State with subscriptions (notify on change)
  console.log(`[5] State changes with notification:\n`);

  interface Notification {
    oldValue: unknown;
    newValue: unknown;
    timestamp: Date;
  }

  const observedState = yield* Ref.make<{ value: number; lastChange: Date }>({
    value: 0,
    lastChange: new Date(),
  });

  const updateAndNotify = (newValue: number) =>
    Ref.modify(observedState, (current) => {
      const notification: Notification = {
        oldValue: current.value,
        newValue,
        timestamp: new Date(),
      };

      yield* Effect.log(
        `[NOTIFY] ${current.value} → ${newValue} at ${notification.timestamp.toISOString()}`
      );

      return [
        notification,
        {
          value: newValue,
          lastChange: notification.timestamp,
        },
      ];
    });

  // Trigger changes
  for (const val of [5, 10, 15]) {
    yield* updateAndNotify(val);
  }

  // Example 6: Atomic batch updates
  console.log(`\n[6] Batch atomic updates:\n`);

  interface BatchState {
    items: string[];
    locked: boolean;
    version: number;
  }

  const batchState = yield* Ref.make<BatchState>({
    items: [],
    locked: false,
    version: 0,
  });

  const addItems = (newItems: string[]) =>
    Ref.modify(batchState, (current) => {
      // All items added atomically
      return [
        { added: newItems.length },
        {
          items: [...current.items, ...newItems],
          locked: false,
          version: current.version + 1,
        },
      ];
    });

  const batch1 = yield* addItems(["item1", "item2", "item3"]);

  yield* Effect.log(
    `[BATCH 1] Added ${batch1.added} items`
  );

  const batch2 = yield* addItems(["item4", "item5"]);

  yield* Effect.log(
    `[BATCH 2] Added ${batch2.added} items`
  );

  const finalBatch = yield* Ref.get(batchState);

  yield* Effect.log(
    `[RESULT] Total items: ${finalBatch.items.length}, Version: ${finalBatch.version}`
  );
});

Effect.runPromise(program);
```

---

---

## State Management Pattern 2: Observable State with SubscriptionRef

Combine Ref with PubSub to create observable state where changes trigger notifications, enabling reactive state management.

### Example

This example demonstrates observable state patterns.

```typescript
import { Effect, Ref, PubSub, Stream } from "effect";

interface StateChange<T> {
  readonly previous: T;
  readonly current: T;
  readonly timestamp: Date;
  readonly reason: string;
}

interface Observable<T> {
  readonly get: () => Effect.Effect<T>;
  readonly set: (value: T, reason: string) => Effect.Effect<void>;
  readonly subscribe: () => Stream.Stream<StateChange<T>>;
  readonly modify: (f: (current: T) => T, reason: string) => Effect.Effect<void>;
}

const program = Effect.gen(function* () {
  console.log(
    `\n[OBSERVABLE STATE] Reactive state management\n`
  );

  // Create observable
  const createObservable = <T,>(initialValue: T): Effect.Effect<Observable<T>> =>
    Effect.gen(function* () {
      const state = yield* Ref.make(initialValue);
      const changeStream = yield* PubSub.unbounded<StateChange<T>>();

      return {
        get: () => Ref.get(state),

        set: (value: T, reason: string) =>
          Effect.gen(function* () {
            const previous = yield* Ref.get(state);

            if (previous === value) {
              return; // No change
            }

            yield* Ref.set(state, value);

            const change: StateChange<T> = {
              previous,
              current: value,
              timestamp: new Date(),
              reason,
            };

            yield* PubSub.publish(changeStream, change);
          }),

        subscribe: () =>
          PubSub.subscribe(changeStream),

        modify: (f: (current: T) => T, reason: string) =>
          Effect.gen(function* () {
            const previous = yield* Ref.get(state);
            const updated = f(previous);

            if (previous === updated) {
              return; // No change
            }

            yield* Ref.set(state, updated);

            const change: StateChange<T> = {
              previous,
              current: updated,
              timestamp: new Date(),
              reason,
            };

            yield* PubSub.publish(changeStream, change);
          }),
      };
    });

  // Example 1: Basic observable counter
  console.log(`[1] Observable counter:\n`);

  const counter = yield* createObservable(0);

  // Subscribe to changes
  const printChanges = counter.subscribe().pipe(
    Stream.tap((change) =>
      Effect.log(
        `[CHANGE] ${change.previous} → ${change.current} (${change.reason})`
      )
    ),
    Stream.take(5), // Limit to 5 changes for demo
    Stream.runDrain
  );

  // Make changes
  yield* counter.set(1, "increment");
  yield* counter.set(2, "increment");
  yield* counter.set(5, "reset");

  // Wait for changes to be processed
  yield* Effect.sleep("100 millis");

  // Example 2: Derived state (computed values)
  console.log(`\n[2] Derived state (total from items):\n`);

  interface ShoppingCart {
    readonly items: Array<{ id: string; price: number }>;
    readonly discount: number;
  }

  const cart = yield* createObservable<ShoppingCart>({
    items: [],
    discount: 0,
  });

  const computeTotal = (state: ShoppingCart): number => {
    const subtotal = state.items.reduce((sum, item) => sum + item.price, 0);
    return subtotal * (1 - state.discount);
  };

  // Create derived observable
  const total = yield* createObservable(computeTotal(yield* cart.get()));

  // Subscribe to cart changes, update total
  const updateTotalOnCartChange = cart.subscribe().pipe(
    Stream.tap((change) =>
      Effect.gen(function* () {
        const newTotal = computeTotal(change.current);

        yield* total.set(newTotal, "recalculated-from-cart");

        yield* Effect.log(
          `[TOTAL] Recalculated: $${newTotal.toFixed(2)}`
        );
      })
    ),
    Stream.take(10),
    Stream.runDrain
  );

  // Make cart changes
  yield* cart.modify(
    (state) => ({
      ...state,
      items: [
        ...state.items,
        { id: "item1", price: 19.99 },
      ],
    }),
    "add-item"
  );

  yield* cart.modify(
    (state) => ({
      ...state,
      items: [
        ...state.items,
        { id: "item2", price: 29.99 },
      ],
    }),
    "add-item"
  );

  yield* cart.modify(
    (state) => ({
      ...state,
      discount: 0.1,
    }),
    "apply-discount"
  );

  yield* Effect.sleep("200 millis");

  // Example 3: Effect triggering on state change
  console.log(`\n[3] Effects triggered by state changes:\n`);

  type AppStatus = "idle" | "loading" | "ready" | "error";

  const appStatus = yield* createObservable<AppStatus>("idle");

  // Define effects for each status
  const handleStatusChange = appStatus.subscribe().pipe(
    Stream.tap((change) =>
      Effect.gen(function* () {
        yield* Effect.log(
          `[STATUS] ${change.previous} → ${change.current}`
        );

        switch (change.current) {
          case "loading":
            yield* Effect.log(`[EFFECT] Starting loading animation`);
            break;

          case "ready":
            yield* Effect.log(`[EFFECT] Hiding spinner, showing content`);
            break;

          case "error":
            yield* Effect.log(`[EFFECT] Showing error message`);
            yield* Effect.log(`[TELEMETRY] Logging error event`);
            break;

          default:
            yield* Effect.log(`[EFFECT] Resetting UI`);
        }
      })
    ),
    Stream.take(6),
    Stream.runDrain
  );

  // Trigger status changes
  yield* appStatus.set("loading", "user-clicked");
  yield* appStatus.set("ready", "data-loaded");
  yield* appStatus.set("loading", "user-refreshed");
  yield* appStatus.set("error", "api-failed");

  yield* Effect.sleep("200 millis");

  // Example 4: Multi-level state aggregation
  console.log(`\n[4] Aggregated state from multiple sources:\n`);

  interface UserProfile {
    name: string;
    email: string;
    role: string;
  }

  interface AppState {
    user: UserProfile | null;
    notifications: number;
    theme: "light" | "dark";
  }

  const appState = yield* createObservable<AppState>({
    user: null,
    notifications: 0,
    theme: "light",
  });

  // Subscribe to track changes
  const trackChanges = appState.subscribe().pipe(
    Stream.tap((change) => {
      if (change.current.user && !change.previous.user) {
        return Effect.log(`[EVENT] User logged in: ${change.current.user.name}`);
      }

      if (!change.current.user && change.previous.user) {
        return Effect.log(`[EVENT] User logged out`);
      }

      if (change.current.notifications !== change.previous.notifications) {
        return Effect.log(
          `[NOTIFY] ${change.current.notifications} notifications`
        );
      }

      if (change.current.theme !== change.previous.theme) {
        return Effect.log(`[THEME] Switched to ${change.current.theme}`);
      }

      return Effect.succeed(undefined);
    }),
    Stream.take(10),
    Stream.runDrain
  );

  // Make changes
  yield* appState.modify(
    (state) => ({
      ...state,
      user: { name: "Alice", email: "alice@example.com", role: "admin" },
    }),
    "user-login"
  );

  yield* appState.modify(
    (state) => ({
      ...state,
      notifications: 5,
    }),
    "new-notifications"
  );

  yield* appState.modify(
    (state) => ({
      ...state,
      theme: "dark",
    }),
    "user-preference"
  );

  yield* Effect.sleep("200 millis");

  // Example 5: State snapshot and history
  console.log(`\n[5] State history tracking:\n`);

  interface HistoryEntry<T> {
    value: T;
    timestamp: Date;
    reason: string;
  }

  const history = yield* Ref.make<HistoryEntry<number>[]>([]);

  const trackedCounter = yield* createObservable(0);

  const trackHistory = trackedCounter.subscribe().pipe(
    Stream.tap((change) =>
      Effect.gen(function* () {
        yield* Ref.modify(history, (h) => [
          undefined,
          [
            ...h,
            {
              value: change.current,
              timestamp: change.timestamp,
              reason: change.reason,
            },
          ],
        ]);

        yield* Effect.log(
          `[HISTORY] Recorded: ${change.current} (${change.reason})`
        );
      })
    ),
    Stream.take(5),
    Stream.runDrain
  );

  // Make changes
  for (let i = 1; i <= 4; i++) {
    yield* trackedCounter.set(i, `step-${i}`);
  }

  yield* Effect.sleep("200 millis");

  // Print history
  const hist = yield* Ref.get(history);

  yield* Effect.log(`\n[HISTORY] ${hist.length} entries:`);

  for (const entry of hist) {
    yield* Effect.log(
      `  - ${entry.value} (${entry.reason})`
    );
  }
});

Effect.runPromise(program);
```

---

---

## Understand Fibers as Lightweight Threads

Understand that a Fiber is a lightweight, virtual thread managed by the Effect runtime for massive concurrency.

### Example

This program demonstrates the efficiency of fibers by forking 100,000 of them. Each fiber does a small amount of work (sleeping for 1 second). Trying to do this with 100,000 OS threads would instantly crash any system.

```typescript
import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  // Demonstrate the lightweight nature of fibers by creating 100,000 of them
  // This would be impossible with OS threads due to memory and context switching overhead
  const fiberCount = 100_000;
  yield* Effect.log(`Forking ${fiberCount} fibers...`);

  // Create an array of 100,000 simple effects
  // Each effect sleeps for 1 second and then returns its index
  // This simulates lightweight concurrent tasks
  const tasks = Array.from({ length: fiberCount }, (_, i) =>
    Effect.sleep("1 second").pipe(Effect.as(i))
  );

  // Fork all of them into background fibers
  // Effect.fork creates a new fiber for each task without blocking
  // This demonstrates fiber creation scalability - 100k fibers created almost instantly
  // Each fiber is much lighter than an OS thread (typically ~1KB vs ~8MB per thread)
  const fibers = yield* Effect.forEach(tasks, Effect.fork);

  yield* Effect.log(
    "All fibers have been forked. Now waiting for them to complete..."
  );

  // Wait for all fibers to finish their work
  // Fiber.joinAll waits for all fibers to complete and collects their results
  // This demonstrates fiber coordination - managing thousands of concurrent operations
  // The runtime efficiently schedules these fibers using a work-stealing thread pool
  const results = yield* Fiber.joinAll(fibers);

  yield* Effect.log(`All ${results.length} fibers have completed.`);

  // Key insights from this example:
  // 1. Fibers are extremely lightweight - 100k fibers use minimal memory
  // 2. Fiber creation is fast - no expensive OS thread allocation
  // 3. The Effect runtime efficiently schedules fibers across available CPU cores
  // 4. Fibers can be suspended and resumed without blocking OS threads
  // 5. This enables massive concurrency for I/O-bound operations
});

// This program runs successfully, demonstrating the low overhead of fibers.
// Try running this with OS threads - you'd likely hit system limits around 1000-10000 threads
// With fibers, 100k+ concurrent operations are easily achievable
Effect.runPromise(program);
```

---

---

