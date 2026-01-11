---
name: effect-patterns-streams-sinks
description: Effect-TS patterns for Streams Sinks. Use when working with streams sinks in Effect-TS applications.
---
# Effect-TS Patterns: Streams Sinks
This skill provides 6 curated Effect-TS patterns for streams sinks.
Use this skill when working on tasks related to:
- streams sinks
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟡 Intermediate Patterns

### Sink Pattern 1: Batch Insert Stream Records into Database

**Rule:** Batch stream records before database operations to improve throughput and reduce transaction overhead.

**Good Example:**

This example demonstrates streaming user records from a paginated API and batching them for efficient database insertion.

```typescript
import { Effect, Stream, Sink, Chunk } from "effect";

interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
}

interface PaginatedResponse {
  readonly users: User[];
  readonly nextPage: number | null;
}

// Mock API that returns paginated users
const fetchUserPage = (
  page: number
): Effect.Effect<PaginatedResponse> =>
  Effect.succeed(
    page < 10
      ? {
          users: Array.from({ length: 50 }, (_, i) => ({
            id: page * 50 + i,
            name: `User ${page * 50 + i}`,
            email: `user${page * 50 + i}@example.com`,
          })),
          nextPage: page + 1,
        }
      : { users: [], nextPage: null }
  ).pipe(Effect.delay("10 millis"));

// Mock database insert that takes a batch of users
const insertUserBatch = (
  users: readonly User[]
): Effect.Effect<number> =>
  Effect.sync(() => {
    console.log(`Inserting batch of ${users.length} users`);
    return users.length;
  }).pipe(Effect.delay("50 millis"));

// Create a stream of users from paginated API
const userStream: Stream.Stream<User> = Stream.paginateEffect(
  0,
  (page) =>
    fetchUserPage(page).pipe(
      Effect.map((response) => [
        Chunk.fromIterable(response.users),
        response.nextPage !== null ? Option.some(response.nextPage) : Option.none(),
      ])
    )
);

// Sink that batches users and inserts them
const batchInsertSink: Sink.Sink<number, never, User> = Sink.fold(
  0,
  (count, chunk: Chunk.Chunk<User>) =>
    Effect.gen(function* () {
      const users = Chunk.toArray(chunk);
      const inserted = yield* insertUserBatch(users);
      return count + inserted;
    }),
  (count) => Effect.succeed(count)
).pipe(
  // Batch into groups of 100 users
  Sink.withChunking((chunk) =>
    chunk.pipe(
      Chunk.chunksOf(100),
      Stream.fromIterable,
      Stream.runCollect
    )
  )
);

// Run the stream with batching sink
const program = Effect.gen(function* () {
  const totalInserted = yield* userStream.pipe(
    Stream.run(batchInsertSink)
  );
  console.log(`Total users inserted: ${totalInserted}`);
});

Effect.runPromise(program);
```

This pattern:

1. **Creates a stream** of users from a paginated API
2. **Defines a batching sink** that collects users into groups of 100
3. **Inserts each batch** to the database in a single operation
4. **Tracks total count** of inserted records

The batching happens automatically—the sink collects elements until the batch size is reached, then processes the complete batch.

---

**Rationale:**

When consuming a stream of records to persist in a database, collect them into batches using `Sink` before inserting. This reduces the number of database round-trips and transaction overhead, improving overall throughput significantly.

---


Inserting records one-by-one is inefficient:

- Each insert is a separate database call (network latency, connection overhead)
- Each insert may be a separate transaction (ACID overhead)
- Resource contention and connection pool exhaustion at scale

Batching solves this by:

- Grouping N records into a single bulk insert operation
- Amortizing database overhead across multiple records
- Maintaining throughput even under backpressure
- Enabling efficient transaction semantics for the entire batch

For example, inserting 10,000 records one-by-one might take 100 seconds. Batching in groups of 100 might take just 2-3 seconds.

---

---

### Sink Pattern 2: Write Stream Events to Event Log

**Rule:** Append stream events to an event log with metadata to maintain a complete, ordered record of what happened.

**Good Example:**

This example demonstrates an event sourcing pattern where a user account stream of events is appended to an event log with metadata.

```typescript
import { Effect, Stream, Sink, DateTime, Data } from "effect";

// Event types
type AccountEvent =
  | AccountCreated
  | MoneyDeposited
  | MoneyWithdrawn
  | AccountClosed;

class AccountCreated extends Data.TaggedError("AccountCreated")<{
  readonly accountId: string;
  readonly owner: string;
  readonly initialBalance: number;
}> {}

class MoneyDeposited extends Data.TaggedError("MoneyDeposited")<{
  readonly accountId: string;
  readonly amount: number;
}> {}

class MoneyWithdrawn extends Data.TaggedError("MoneyWithdrawn")<{
  readonly accountId: string;
  readonly amount: number;
}> {}

class AccountClosed extends Data.TaggedError("AccountClosed")<{
  readonly accountId: string;
}> {}

// Event envelope with metadata
interface StoredEvent {
  readonly eventId: string; // Unique identifier per event
  readonly eventType: string; // Type of event
  readonly aggregateId: string; // What this event is about
  readonly aggregateType: string; // What kind of thing (Account)
  readonly data: any; // Event payload
  readonly metadata: {
    readonly timestamp: number;
    readonly version: number; // Position in log
    readonly causationId?: string; // What caused this
  };
}

// Mock event log that appends events
const eventLog: StoredEvent[] = [];
let eventVersion = 0;

const appendToEventLog = (
  event: AccountEvent,
  aggregateId: string
): Effect.Effect<StoredEvent> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    const storedEvent: StoredEvent = {
      eventId: `evt-${eventVersion}-${Date.now()}`,
      eventType: event._tag,
      aggregateId,
      aggregateType: "Account",
      data: event,
      metadata: {
        timestamp: now.toEpochMillis(),
        version: ++eventVersion,
      },
    };

    // Append to log (simulated)
    eventLog.push(storedEvent);
    console.log(
      `[v${storedEvent.metadata.version}] ${storedEvent.eventType}: ${aggregateId}`
    );

    return storedEvent;
  });

// Simulate a stream of events from various account operations
const accountEvents: Stream.Stream<[string, AccountEvent]> = Stream.fromIterable([
  [
    "acc-1",
    new AccountCreated({
      accountId: "acc-1",
      owner: "Alice",
      initialBalance: 1000,
    }),
  ],
  ["acc-1", new MoneyDeposited({ accountId: "acc-1", amount: 500 })],
  ["acc-1", new MoneyWithdrawn({ accountId: "acc-1", amount: 200 })],
  [
    "acc-2",
    new AccountCreated({
      accountId: "acc-2",
      owner: "Bob",
      initialBalance: 2000,
    }),
  ],
  ["acc-2", new MoneyDeposited({ accountId: "acc-2", amount: 1000 })],
  ["acc-1", new AccountClosed({ accountId: "acc-1" })],
]);

// Sink that appends each event to the log
const eventLogSink: Sink.Sink<number, never, [string, AccountEvent]> = Sink.fold(
  0,
  (count, [aggregateId, event]) =>
    appendToEventLog(event, aggregateId).pipe(
      Effect.map(() => count + 1)
    ),
  (count) => Effect.succeed(count)
);

// Run the stream and append all events
const program = Effect.gen(function* () {
  const totalEvents = yield* accountEvents.pipe(Stream.run(eventLogSink));

  console.log(`\nTotal events appended: ${totalEvents}`);
  console.log(`\nEvent log contents:`);
  eventLog.forEach((event) => {
    console.log(`  [v${event.metadata.version}] ${event.eventType}`);
  });
});

Effect.runPromise(program);
```

This pattern:

1. **Defines event types** using tagged errors (AccountCreated, MoneyDeposited, etc.)
2. **Creates event envelopes** with metadata (timestamp, version, causation)
3. **Streams events** from various sources
4. **Appends to log** with proper versioning and ordering
5. **Maintains history** for reconstruction and audit

---

**Rationale:**

When consuming a stream of events that represent changes in your system, append each event to an event log using `Sink`. Event logs provide immutable, ordered records that enable event sourcing, audit trails, and temporal queries.

---


Event logs are foundational to many patterns:

- **Event Sourcing**: Instead of storing current state, store the sequence of events that led to it
- **Audit Trails**: Complete, tamper-proof record of who did what and when
- **Temporal Queries**: Reconstruct state at any point in time
- **Consistency**: Single source of truth for what happened
- **Replay**: Rebuild state or test changes by replaying events

Unlike batch inserts which are transactional, event logs are append-only. Each event is immutable once written. This simplicity enables:

- Fast appends (no updates, just sequential writes)
- Natural ordering (events in write order)
- Easy distribution (replicate the log)
- Strong consistency (events are facts that don't change)

---

---

### Sink Pattern 4: Send Stream Records to Message Queue

**Rule:** Stream records to message queues with proper batching and acknowledgment for reliable distributed data flow.

**Good Example:**

This example demonstrates streaming sensor readings and publishing them to a message queue with topic-based partitioning.

```typescript
import { Effect, Stream, Sink, Chunk } from "effect";

interface SensorReading {
  readonly sensorId: string;
  readonly location: string;
  readonly temperature: number;
  readonly humidity: number;
  readonly timestamp: number;
}

// Mock message queue publisher
interface QueuePublisher {
  readonly publish: (
    topic: string,
    partition: string,
    messages: readonly SensorReading[]
  ) => Effect.Effect<{ acknowledged: number; messageIds: string[] }>;
}

// Create a mock queue publisher
const createMockPublisher = (): QueuePublisher => {
  const publishedMessages: Record<string, SensorReading[]> = {};

  return {
    publish: (topic, partition, messages) =>
      Effect.gen(function* () {
        const key = `${topic}/${partition}`;
        publishedMessages[key] = [
          ...(publishedMessages[key] ?? []),
          ...messages,
        ];

        const messageIds = Array.from({ length: messages.length }, (_, i) =>
          `msg-${Date.now()}-${i}`
        );

        console.log(
          `Published ${messages.length} messages to ${key} (batch)`
        );

        return { acknowledged: messages.length, messageIds };
      }),
  };
};

// Determine the partition key based on sensor location
const getPartitionKey = (reading: SensorReading): string =>
  reading.location; // Route by location for data locality

// Simulate a stream of sensor readings
const sensorStream: Stream.Stream<SensorReading> = Stream.fromIterable([
  {
    sensorId: "temp-1",
    location: "warehouse-a",
    temperature: 22.5,
    humidity: 45,
    timestamp: Date.now(),
  },
  {
    sensorId: "temp-2",
    location: "warehouse-b",
    temperature: 21.0,
    humidity: 50,
    timestamp: Date.now() + 100,
  },
  {
    sensorId: "temp-3",
    location: "warehouse-a",
    temperature: 22.8,
    humidity: 46,
    timestamp: Date.now() + 200,
  },
  {
    sensorId: "temp-4",
    location: "warehouse-c",
    temperature: 20.5,
    humidity: 55,
    timestamp: Date.now() + 300,
  },
  {
    sensorId: "temp-5",
    location: "warehouse-b",
    temperature: 21.2,
    humidity: 51,
    timestamp: Date.now() + 400,
  },
  {
    sensorId: "temp-6",
    location: "warehouse-a",
    temperature: 23.0,
    humidity: 47,
    timestamp: Date.now() + 500,
  },
]);

// Create a sink that batches and publishes to message queue
const createQueuePublishSink = (
  publisher: QueuePublisher,
  topic: string,
  batchSize: number = 100
): Sink.Sink<number, Error, SensorReading> =>
  Sink.fold(
    { batches: new Map<string, SensorReading[]>(), totalPublished: 0 },
    (state, reading) =>
      Effect.gen(function* () {
        const partition = getPartitionKey(reading);
        const batch = state.batches.get(partition) ?? [];
        const newBatch = [...batch, reading];

        if (newBatch.length >= batchSize) {
          // Batch is full, publish it
          const result = yield* publisher.publish(topic, partition, newBatch);
          const newState = new Map(state.batches);
          newState.delete(partition);

          return {
            ...state,
            batches: newState,
            totalPublished: state.totalPublished + result.acknowledged,
          };
        } else {
          // Add to batch and continue
          const newState = new Map(state.batches);
          newState.set(partition, newBatch);

          return { ...state, batches: newState };
        }
      }),
    (state) =>
      Effect.gen(function* () {
        let finalCount = state.totalPublished;

        // Publish any remaining partial batches
        for (const [partition, batch] of state.batches) {
          if (batch.length > 0) {
            const result = yield* publisher.publish(topic, partition, batch);
            finalCount += result.acknowledged;
          }
        }

        return finalCount;
      })
  );

// Run the stream and publish to queue
const program = Effect.gen(function* () {
  const publisher = createMockPublisher();
  const topic = "sensor-readings";

  const published = yield* sensorStream.pipe(
    Stream.run(createQueuePublishSink(publisher, topic, 50)) // Batch size of 50
  );

  console.log(
    `\nTotal messages published to queue: ${published}`
  );
});

Effect.runPromise(program);
```

This pattern:

1. **Groups readings by partition** (location) for data locality
2. **Batches records** before publishing (50 at a time)
3. **Publishes batches** to the queue with partition key
4. **Flushes partial batches** when stream ends
5. **Tracks acknowledgments** from the queue

---

**Rationale:**

When consuming a stream of events that need to be distributed to other systems, use `Sink` to publish them to a message queue. Message queues provide reliable, scalable distribution with guarantees like ordering and exactly-once semantics.

---


Message queues are the backbone of event-driven architectures:

- **Decoupling**: Producers don't wait for consumers
- **Scalability**: Multiple subscribers can consume independently
- **Durability**: Messages persist even if subscribers are down
- **Ordering**: Maintain event sequence (per partition/topic)
- **Reliability**: Acknowledgments and retries ensure no message loss

Unlike direct writes which block, queue publishing is asynchronous and enables:

- High-throughput publishing (batch multiple records per operation)
- Backpressure handling (queue manages flow)
- Multi-subscriber patterns (fan-out)
- Dead letter queues for error handling

---

---

### Sink Pattern 5: Fall Back to Alternative Sink on Failure

**Rule:** Implement fallback sinks to handle failures gracefully and ensure data is persisted even when the primary destination is unavailable.

**Good Example:**

This example demonstrates a system that tries to write order records to a fast in-memory cache first, falls back to database if cache fails, and falls back to a dead letter file if database fails.

```typescript
import { Effect, Stream, Sink, Chunk, Either, Data } from "effect";

interface Order {
  readonly orderId: string;
  readonly customerId: string;
  readonly total: number;
  readonly timestamp: number;
}

class CacheSinkError extends Data.TaggedError("CacheSinkError")<{
  readonly reason: string;
}> {}

class DatabaseSinkError extends Data.TaggedError("DatabaseSinkError")<{
  readonly reason: string;
}> {}

// Mock in-memory cache sink (fast but limited)
const createCacheSink = (): Sink.Sink<number, CacheSinkError, Order> => {
  const cache: Order[] = [];
  const MAX_CACHE_SIZE = 1000;

  return Sink.fold(
    0,
    (count, order) =>
      Effect.gen(function* () {
        if (cache.length >= MAX_CACHE_SIZE) {
          yield* Effect.fail(
            new CacheSinkError({
              reason: `Cache full (${cache.length}/${MAX_CACHE_SIZE})`,
            })
          );
        }

        cache.push(order);
        console.log(`[CACHE] Cached order ${order.orderId}`);
        return count + 1;
      }),
    (count) =>
      Effect.gen(function* () {
        console.log(`[CACHE] Final: ${count} orders in cache`);
        return count;
      })
  );
};

// Mock database sink (slower but reliable)
const createDatabaseSink = (): Sink.Sink<number, DatabaseSinkError, Order> => {
  const orders: Order[] = [];

  return Sink.fold(
    0,
    (count, order) =>
      Effect.gen(function* () {
        // Simulate occasional database failures
        if (Math.random() < 0.1) {
          yield* Effect.fail(
            new DatabaseSinkError({
              reason: "Connection timeout",
            })
          );
        }

        orders.push(order);
        console.log(`[DATABASE] Persisted order ${order.orderId}`);
        return count + 1;
      }),
    (count) =>
      Effect.gen(function* () {
        console.log(`[DATABASE] Final: ${count} orders in database`);
        return count;
      })
  );
};

// Mock file sink (always works but slow)
const createDeadLetterSink = (): Sink.Sink<number, never, Order> => {
  const deadLetters: Order[] = [];

  return Sink.fold(
    0,
    (count, order) =>
      Effect.gen(function* () {
        deadLetters.push(order);
        console.log(
          `[DEAD-LETTER] Wrote order ${order.orderId} to dead letter file`
        );
        return count + 1;
      }),
    (count) =>
      Effect.gen(function* () {
        console.log(
          `[DEAD-LETTER] Final: ${count} orders in dead letter file`
        );
        return count;
      })
  );
};

// Create a fallback sink that tries cache -> database -> file
const createFallbackSink = (): Sink.Sink<
  { readonly cached: number; readonly persisted: number; readonly deadLetters: number },
  never,
  Order
> =>
  Sink.fold(
    { cached: 0, persisted: 0, deadLetters: 0 },
    (state, order) =>
      Effect.gen(function* () {
        // Try cache first
        const cacheResult = yield* createCacheSink()
          .pipe(Sink.feed(Chunk.of(order)))
          .pipe(Effect.either);

        if (Either.isRight(cacheResult)) {
          return {
            ...state,
            cached: state.cached + cacheResult.right,
          };
        }

        console.log(
          `[FALLBACK] Cache failed (${cacheResult.left.reason}), trying database`
        );

        // Cache failed, try database
        const dbResult = yield* createDatabaseSink()
          .pipe(Sink.feed(Chunk.of(order)))
          .pipe(Effect.either);

        if (Either.isRight(dbResult)) {
          return {
            ...state,
            persisted: state.persisted + dbResult.right,
          };
        }

        console.log(
          `[FALLBACK] Database failed (${dbResult.left.reason}), falling back to dead letter`
        );

        // Database failed, use dead letter
        const dlResult = yield* createDeadLetterSink()
          .pipe(Sink.feed(Chunk.of(order)));

        return {
          ...state,
          deadLetters: state.deadLetters + dlResult,
        };
      }),
    (state) =>
      Effect.gen(function* () {
        console.log(`\n[SUMMARY]`);
        console.log(`  Cached:      ${state.cached}`);
        console.log(`  Persisted:   ${state.persisted}`);
        console.log(`  Dead Letter: ${state.deadLetters}`);
        return state;
      })
  );

// Simulate a stream of orders
const orderStream: Stream.Stream<Order> = Stream.fromIterable([
  {
    orderId: "order-1",
    customerId: "cust-1",
    total: 99.99,
    timestamp: Date.now(),
  },
  {
    orderId: "order-2",
    customerId: "cust-2",
    total: 149.99,
    timestamp: Date.now() + 100,
  },
  {
    orderId: "order-3",
    customerId: "cust-1",
    total: 49.99,
    timestamp: Date.now() + 200,
  },
  {
    orderId: "order-4",
    customerId: "cust-3",
    total: 199.99,
    timestamp: Date.now() + 300,
  },
  {
    orderId: "order-5",
    customerId: "cust-2",
    total: 89.99,
    timestamp: Date.now() + 400,
  },
]);

// Run the stream with fallback sink
const program = Effect.gen(function* () {
  const result = yield* orderStream.pipe(Stream.run(createFallbackSink()));
  console.log(`\nTotal orders processed: ${result.cached + result.persisted + result.deadLetters}`);
});

Effect.runPromise(program);
```

This pattern:

1. **Tries cache first** (fast, limited capacity)
2. **Falls back to database** if cache is full
3. **Falls back to dead letter** if database fails
4. **Tracks which sink** was used for each record
5. **Reports summary** of where data went

---

**Rationale:**

When consuming a stream to a primary destination that might fail, wrap it in a fallback pattern. If the primary sink fails, automatically redirect the stream to an alternative sink. This enables progressive degradation where the system degrades gracefully rather than failing completely.

---


Production systems need resilience:

- **Primary failures**: Database down, network timeout, quota exceeded
- **Progressive degradation**: Keep the system running, even at reduced capacity
- **No data loss**: Fallback ensures data is persisted somewhere
- **Operational flexibility**: Choose fallback based on failure type
- **Monitoring**: Track when fallbacks are used to alert operators

Without fallback patterns:

- System fails when primary destination fails
- Data is lost if primary is unavailable
- No clear signal that degradation occurred

With fallback sinks:

- Stream continues even when primary fails
- Data is safely persisted to alternative
- Clear audit trail of which sink was used

---

---

### Sink Pattern 6: Retry Failed Stream Operations

**Rule:** Implement retry strategies in sinks to handle transient failures and improve resilience without manual intervention.

**Good Example:**

This example demonstrates retrying database writes with exponential backoff, tracking attempts, and falling back on permanent failures.

```typescript
import { Effect, Stream, Sink, Chunk, Duration, Schedule } from "effect";

interface UserRecord {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
}

class WriteError extends Error {
  readonly isTransient: boolean;

  constructor(message: string, isTransient: boolean = true) {
    super(message);
    this.name = "WriteError";
    this.isTransient = isTransient;
  }
}

// Mock database that occasionally fails
const database = {
  failureRate: 0.3, // 30% transient failure rate
  permanentFailureRate: 0.05, // 5% permanent failure rate

  insertUser: (user: UserRecord): Effect.Effect<void, WriteError> =>
    Effect.gen(function* () {
      const rand = Math.random();

      // Permanent failure (e.g., constraint violation)
      if (rand < database.permanentFailureRate) {
        throw new WriteError(
          `Permanent: User ${user.userId} already exists`,
          false
        );
      }

      // Transient failure (e.g., connection timeout)
      if (rand < database.permanentFailureRate + database.failureRate) {
        throw new WriteError(
          `Transient: Connection timeout writing ${user.userId}`,
          true
        );
      }

      // Success
      console.log(`✓ Wrote user ${user.userId}`);
    }),
};

// Retry configuration
interface RetryConfig {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffFactor: number;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 100, // Start with 100ms
  maxDelayMs: 5000, // Cap at 5 seconds
  backoffFactor: 2, // Double each time
};

// Result tracking
interface OperationResult {
  readonly succeeded: number;
  readonly transientFailures: number;
  readonly permanentFailures: number;
  readonly detailedStats: Array<{
    readonly userId: string;
    readonly attempts: number;
    readonly status: "success" | "transient-failed" | "permanent-failed";
  }>;
}

// Create a sink with retry logic
const createRetrySink = (config: RetryConfig): Sink.Sink<OperationResult, never, UserRecord> =>
  Sink.fold(
    {
      succeeded: 0,
      transientFailures: 0,
      permanentFailures: 0,
      detailedStats: [],
    },
    (state, user) =>
      Effect.gen(function* () {
        let lastError: WriteError | null = null;
        let attempts = 0;

        // Retry loop
        for (attempts = 1; attempts <= config.maxAttempts; attempts++) {
          try {
            yield* database.insertUser(user);

            // Success!
            console.log(
              `[${user.userId}] Success on attempt ${attempts}/${config.maxAttempts}`
            );

            return {
              ...state,
              succeeded: state.succeeded + 1,
              detailedStats: [
                ...state.detailedStats,
                {
                  userId: user.userId,
                  attempts,
                  status: "success",
                },
              ],
            };
          } catch (error) {
            lastError = error as WriteError;

            if (!lastError.isTransient) {
              // Permanent failure, don't retry
              console.log(
                `[${user.userId}] Permanent failure: ${lastError.message}`
              );

              return {
                ...state,
                permanentFailures: state.permanentFailures + 1,
                detailedStats: [
                  ...state.detailedStats,
                  {
                    userId: user.userId,
                    attempts,
                    status: "permanent-failed",
                  },
                ],
              };
            }

            // Transient failure, retry if attempts remain
            if (attempts < config.maxAttempts) {
              // Calculate delay with exponential backoff
              let delayMs = config.initialDelayMs * Math.pow(config.backoffFactor, attempts - 1);
              delayMs = Math.min(delayMs, config.maxDelayMs);

              // Add jitter (±10%)
              const jitter = delayMs * 0.1;
              delayMs = delayMs + (Math.random() - 0.5) * 2 * jitter;

              console.log(
                `[${user.userId}] Transient failure (attempt ${attempts}/${config.maxAttempts}): ${lastError.message}`
              );
              console.log(`  Retrying in ${Math.round(delayMs)}ms...`);

              yield* Effect.sleep(Duration.millis(Math.round(delayMs)));
            }
          }
        }

        // All retries exhausted
        console.log(
          `[${user.userId}] Failed after ${config.maxAttempts} attempts`
        );

        return {
          ...state,
          transientFailures: state.transientFailures + 1,
          detailedStats: [
            ...state.detailedStats,
            {
              userId: user.userId,
              attempts: config.maxAttempts,
              status: "transient-failed",
            },
          ],
        };
      }),
    (state) =>
      Effect.gen(function* () {
        console.log(`\n[SUMMARY]`);
        console.log(`  Succeeded:           ${state.succeeded}`);
        console.log(`  Transient Failures:  ${state.transientFailures}`);
        console.log(`  Permanent Failures:  ${state.permanentFailures}`);
        console.log(`  Total:               ${state.detailedStats.length}`);

        // Show detailed stats
        const failed = state.detailedStats.filter((s) => s.status !== "success");
        if (failed.length > 0) {
          console.log(`\n[FAILURES]`);
          failed.forEach((stat) => {
            console.log(
              `  ${stat.userId}: ${stat.attempts} attempts (${stat.status})`
            );
          });
        }

        return state;
      })
  );

// Simulate a stream of users to insert
const userStream: Stream.Stream<UserRecord> = Stream.fromIterable([
  { userId: "user-1", name: "Alice", email: "alice@example.com" },
  { userId: "user-2", name: "Bob", email: "bob@example.com" },
  { userId: "user-3", name: "Charlie", email: "charlie@example.com" },
  { userId: "user-4", name: "Diana", email: "diana@example.com" },
  { userId: "user-5", name: "Eve", email: "eve@example.com" },
]);

// Run the stream with retry sink
const program = Effect.gen(function* () {
  const result = yield* userStream.pipe(Stream.run(createRetrySink(defaultRetryConfig)));
  console.log(`\nProcessing complete.`);
});

Effect.runPromise(program);
```

This pattern:

1. **Attempts operation** up to max retries
2. **Distinguishes transient vs. permanent failures**
3. **Uses exponential backoff** to space retries
4. **Adds jitter** to prevent thundering herd
5. **Tracks detailed stats** for monitoring
6. **Reports summary** of outcomes

---

**Rationale:**

When consuming a stream to a destination that may experience transient failures (network timeouts, rate limiting, temporary unavailability), wrap the sink operation with a retry policy. Use exponential backoff to avoid overwhelming a recovering system while still recovering quickly.

---


Transient failures are common in distributed systems:

- **Network timeouts**: Temporary connectivity issues resolve themselves
- **Rate limiting**: Service recovers once rate limit window resets
- **Temporary unavailability**: Services restart or scale up
- **Circuit breaker trips**: Service recovers after backoff period

Without retry logic:

- Every transient failure causes data loss or stream interruption
- Manual intervention required to restart
- System appears less reliable than it actually is

With intelligent retry logic:

- Automatic recovery from transient failures
- Exponential backoff prevents thundering herd
- Clear visibility into which operations failed permanently
- Data flows continuously despite temporary issues

---

---

### Sink Pattern 3: Write Stream Lines to File

**Rule:** Write streaming lines to a file efficiently using buffered output and proper resource management.

**Good Example:**

This example demonstrates streaming log entries and writing them to a file with buffering.

```typescript
import { Effect, Stream, Sink, Chunk, FileSystem } from "effect";

interface LogEntry {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly timestamp: number;
}

// Format a log entry as a line
const formatLogLine = (entry: LogEntry): string => {
  const iso = new Date(entry.timestamp).toISOString();
  return `[${iso}] ${entry.level.toUpperCase()}: ${entry.message}`;
};

// Simulate a stream of log entries
const logStream: Stream.Stream<LogEntry> = Stream.fromIterable([
  { level: "info", message: "Server starting", timestamp: Date.now() },
  { level: "debug", message: "Loading config", timestamp: Date.now() + 100 },
  { level: "info", message: "Connected to database", timestamp: Date.now() + 200 },
  { level: "warn", message: "High memory usage detected", timestamp: Date.now() + 300 },
  { level: "info", message: "Processing request", timestamp: Date.now() + 400 },
  { level: "error", message: "Connection timeout", timestamp: Date.now() + 500 },
  { level: "info", message: "Retrying connection", timestamp: Date.now() + 600 },
  { level: "info", message: "Connection restored", timestamp: Date.now() + 700 },
]);

// Create a file writer sink with buffering
const createFileWriteSink = (
  filePath: string,
  bufferSize: number = 100
): Sink.Sink<number, Error, string> =>
  Effect.scoped(
    Effect.gen(function* () {
      // Open file in append mode
      const fs = yield* FileSystem.FileSystem;
      const handle = yield* fs.open(filePath, "a");

      let buffer: string[] = [];
      let lineCount = 0;

      // Flush buffered lines to disk
      const flush = Effect.gen(function* () {
        if (buffer.length === 0) return;

        const content = buffer.join("\n") + "\n";
        yield* fs.write(handle, content);
        buffer = [];
      });

      // Return the sink
      return Sink.fold(
        0,
        (count, line: string) =>
          Effect.gen(function* () {
            buffer.push(line);
            const newCount = count + 1;

            // Flush when buffer reaches size limit
            if (buffer.length >= bufferSize) {
              yield* flush;
            }

            return newCount;
          }),
        (count) =>
          Effect.gen(function* () {
            // Flush any remaining lines before closing
            yield* flush;
            yield* fs.close(handle);
            return count;
          })
      );
    })
  ).pipe(
    Effect.flatten
  );

// Process the log stream
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const filePath = "/tmp/app.log";

  // Clear the file first
  yield* fs.writeFileString(filePath, "");

  // Stream logs, format them, and write to file
  const written = yield* logStream.pipe(
    Stream.map(formatLogLine),
    Stream.run(createFileWriteSink(filePath, 50)) // Buffer 50 lines before flush
  );

  console.log(`Wrote ${written} log lines to ${filePath}`);

  // Read back the file to verify
  const content = yield* fs.readFileString(filePath);
  console.log("\nFile contents:");
  console.log(content);
});

Effect.runPromise(program);
```

This pattern:

1. **Opens a file** for appending
2. **Buffers log lines** in memory (50 lines before flush)
3. **Flushes periodically** when buffer fills or stream ends
4. **Closes the file** safely using scopes
5. **Tracks line count** for confirmation

---

**Rationale:**

When consuming a stream of data to persist as lines in a file, use `Sink` with a file writer. Buffer the output for efficiency and ensure proper resource cleanup using Effect's scope management.

---


Writing stream data to files requires:

- **Buffering**: Writing one line at a time is slow. Buffer multiple lines before flushing to disk
- **Efficiency**: Reduce system calls and I/O overhead by batching writes
- **Resource Management**: Ensure file handles are properly closed even on errors
- **Ordering**: Maintain the order of lines as they appear in the stream

This pattern is essential for:

- Log files and audit trails
- CSV/JSON Line export
- Streaming data archival
- Data pipelines with file intermediates

---

---


