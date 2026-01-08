---
name: effect-patterns-streams
description: Effect-TS patterns for Streams. Use when working with streams in Effect-TS applications.
---
# Effect-TS Patterns: Streams
This skill provides 8 curated Effect-TS patterns for streams.
Use this skill when working on tasks related to:
- streams
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Stream Pattern 1: Transform Streams with Map and Filter

**Rule:** Use map and filter combinators to transform stream elements declaratively, creating pipelines that reshape data without materializing intermediate results.

**Good Example:**

This example demonstrates transforming a stream of raw data through multiple stages.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface RawLogEntry {
  readonly timestamp: string;
  readonly level: string;
  readonly message: string;
}

interface ProcessedLog {
  readonly date: Date;
  readonly severity: "low" | "medium" | "high";
  readonly normalizedMessage: string;
}

// Create a stream of raw log entries
const createLogStream = (): Stream.Stream<RawLogEntry> =>
  Stream.fromIterable([
    { timestamp: "2025-12-17T09:00:00Z", level: "DEBUG", message: "App starting" },
    { timestamp: "2025-12-17T09:01:00Z", level: "INFO", message: "Connected to DB" },
    { timestamp: "2025-12-17T09:02:00Z", level: "ERROR", message: "Query timeout" },
    { timestamp: "2025-12-17T09:03:00Z", level: "DEBUG", message: "Retry initiated" },
    { timestamp: "2025-12-17T09:04:00Z", level: "WARN", message: "Connection degraded" },
    { timestamp: "2025-12-17T09:05:00Z", level: "INFO", message: "Recovered" },
  ]);

// Transform: Parse timestamp
const parseTimestamp = (entry: RawLogEntry): RawLogEntry => ({
  ...entry,
  timestamp: entry.timestamp, // Already ISO, but could parse here
});

// Transform: Map log level to severity
const mapSeverity = (level: string): "low" | "medium" | "high" => {
  if (level === "DEBUG" || level === "INFO") return "low";
  if (level === "WARN") return "medium";
  return "high";
};

// Transform: Normalize message
const normalizeMessage = (message: string): string =>
  message.toLowerCase().trim();

// Filter: Keep only important logs
const isImportant = (entry: RawLogEntry): boolean => {
  return entry.level !== "DEBUG";
};

// Main pipeline
const program = Effect.gen(function* () {
  console.log(`\n[STREAM] Processing log stream with map/filter\n`);

  // Create and transform stream
  const transformedStream = createLogStream().pipe(
    // Filter: Keep only non-debug logs
    Stream.filter((entry) => {
      const important = isImportant(entry);
      console.log(
        `[FILTER] ${entry.level} → ${important ? "✓ kept" : "✗ filtered out"}`
      );
      return important;
    }),

    // Map: Extract date
    Stream.map((entry) => {
      const date = new Date(entry.timestamp);
      console.log(`[MAP-1] Parsed date: ${date.toISOString()}`);
      return { ...entry, parsedDate: date };
    }),

    // Map: Normalize and map severity
    Stream.map((entry) => {
      const processed: ProcessedLog = {
        date: entry.parsedDate,
        severity: mapSeverity(entry.level),
        normalizedMessage: normalizeMessage(entry.message),
      };
      console.log(
        `[MAP-2] Transformed: ${entry.level} → ${processed.severity}`
      );
      return processed;
    })
  );

  // Collect all transformed logs
  const results = yield* transformedStream.pipe(
    Stream.runCollect
  );

  console.log(`\n[RESULTS]`);
  console.log(`  Total logs: ${results.length}`);

  Chunk.forEach(results, (log) => {
    console.log(
      `  - [${log.severity.toUpperCase()}] ${log.date.toISOString()}: ${log.normalizedMessage}`
    );
  });
});

Effect.runPromise(program);
```

Output shows lazy evaluation and filtering:
```
[STREAM] Processing log stream with map/filter

[FILTER] DEBUG → ✗ filtered out
[FILTER] INFO → ✓ kept
[MAP-1] Parsed date: 2025-12-17T09:01:00.000Z
[MAP-2] Transformed: INFO → low
[FILTER] ERROR → ✓ kept
[MAP-1] Parsed date: 2025-12-17T09:02:00.000Z
[MAP-2] Transformed: ERROR → high
...

[RESULTS]
  Total logs: 5
  - [LOW] 2025-12-17T09:01:00.000Z: connected to db
  - [HIGH] 2025-12-17T09:02:00.000Z: query timeout
  ...
```

---

**Rationale:**

Use `Stream.map` and `Stream.filter` to transform streams:

- **map**: Transform each element (1→1)
- **filter**: Keep elements matching predicate (N→N, discards some)
- **Chain**: Compose multiple operations
- **Lazy**: Elements transformed on demand (no buffering)

Pattern: `stream.pipe(Stream.map(...), Stream.filter(...))`

---


Streaming data transformations without map/filter create problems:

- **Buffering**: Must collect all data before transforming
- **Code verbosity**: Manual loops for each transformation
- **Memory usage**: Large intermediate arrays
- **Composability**: Hard to chain operations

Map/filter enable:

- **Lazy evaluation**: Transform on-demand
- **Composable**: Chain operations naturally
- **Memory efficient**: No intermediate collections
- **Expressive**: Declare intent clearly

Real-world example: Processing logs
- **Without map/filter**: Collect logs, filter by level, map to objects, transform fields
- **With map/filter**: `logStream.pipe(Stream.filter(...), Stream.map(...))`

---

---


## 🟡 Intermediate Patterns

### Stream Pattern 2: Merge and Combine Multiple Streams

**Rule:** Use merge and concat combinators to combine multiple streams, enabling aggregation of data from multiple independent sources.

**Good Example:**

This example demonstrates merging multiple event streams into a unified stream.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface Event {
  readonly source: string;
  readonly type: string;
  readonly data: string;
  readonly timestamp: Date;
}

// Create independent event streams from different sources
const createUserEventStream = (): Stream.Stream<Event> =>
  Stream.fromIterable([
    { source: "user-service", type: "login", data: "user-123", timestamp: new Date(Date.now() + 0) },
    { source: "user-service", type: "logout", data: "user-123", timestamp: new Date(Date.now() + 500) },
  ]).pipe(
    Stream.tap(() => Effect.sleep("500 millis"))
  );

const createPaymentEventStream = (): Stream.Stream<Event> =>
  Stream.fromIterable([
    { source: "payment-service", type: "payment-started", data: "order-456", timestamp: new Date(Date.now() + 200) },
    { source: "payment-service", type: "payment-completed", data: "order-456", timestamp: new Date(Date.now() + 800) },
  ]).pipe(
    Stream.tap(() => Effect.sleep("600 millis"))
  );

const createAuditEventStream = (): Stream.Stream<Event> =>
  Stream.fromIterable([
    { source: "audit-log", type: "access-granted", data: "resource-789", timestamp: new Date(Date.now() + 100) },
    { source: "audit-log", type: "access-revoked", data: "resource-789", timestamp: new Date(Date.now() + 900) },
  ]).pipe(
    Stream.tap(() => Effect.sleep("800 millis"))
  );

// Merge streams (interleaved, unordered)
const mergedEventStream = (): Stream.Stream<Event> => {
  const userStream = createUserEventStream();
  const paymentStream = createPaymentEventStream();
  const auditStream = createAuditEventStream();

  return Stream.merge(userStream, paymentStream, auditStream);
};

// Concat streams (sequential, ordered)
const concatenatedEventStream = (): Stream.Stream<Event> => {
  return createUserEventStream().pipe(
    Stream.concat(createPaymentEventStream()),
    Stream.concat(createAuditEventStream())
  );
};

// Main: Compare merge vs concat
const program = Effect.gen(function* () {
  console.log(`\n[MERGE] Interleaved events from multiple sources:\n`);

  // Collect merged stream
  const mergedEvents = yield* mergedEventStream().pipe(
    Stream.runCollect
  );

  Chunk.forEach(mergedEvents, (event, idx) => {
    console.log(
      `  ${idx + 1}. [${event.source}] ${event.type}: ${event.data}`
    );
  });

  console.log(`\n[CONCAT] Sequential events (user → payment → audit):\n`);

  // Collect concatenated stream
  const concatEvents = yield* concatenatedEventStream().pipe(
    Stream.runCollect
  );

  Chunk.forEach(concatEvents, (event, idx) => {
    console.log(
      `  ${idx + 1}. [${event.source}] ${event.type}: ${event.data}`
    );
  });
});

Effect.runPromise(program);
```

Output shows merge interleaving vs concat ordering:
```
[MERGE] Interleaved events from multiple sources:

  1. [audit-log] access-granted: resource-789
  2. [user-service] login: user-123
  3. [payment-service] payment-started: order-456
  4. [user-service] logout: user-123
  5. [payment-service] payment-completed: order-456
  6. [audit-log] access-revoked: resource-789

[CONCAT] Sequential events (user → payment → audit):

  1. [user-service] login: user-123
  2. [user-service] logout: user-123
  3. [payment-service] payment-started: order-456
  4. [payment-service] payment-completed: order-456
  5. [audit-log] access-granted: resource-789
  6. [audit-log] access-revoked: resource-789
```

---

**Rationale:**

Combine multiple streams using:

- **merge**: Interleave elements from multiple streams (unordered)
- **concat**: Chain streams sequentially (ordered, waits for first to complete)
- **mergeAll**: Merge collection of streams
- **zip**: Combine corresponding elements from multiple streams

Pattern: `Stream.merge(stream1, stream2)` or `stream1.pipe(Stream.concat(stream2))`

---


Multi-source data processing without merge/concat creates issues:

- **Complex coordination**: Manual loop over multiple sources
- **Hard to aggregate**: Collecting from different sources is verbose
- **Ordering confusion**: Sequential vs. parallel unclear
- **Resource management**: Multiple independent consumers

Merge/concat enable:

- **Simple composition**: Combine streams naturally
- **Semantic clarity**: Merge = parallel, concat = sequential
- **Aggregation**: Single consumer for multiple sources
- **Scalability**: Add sources without refactoring

Real-world example: Aggregating user events
- **Without merge**: Poll user service, poll event log, poll notifications separately
- **With merge**: `Stream.merge(userStream, eventStream, notificationStream)`

---

---

### Stream Pattern 3: Control Backpressure in Streams

**Rule:** Use backpressure control to manage flow between fast producers and slow consumers, preventing memory exhaustion and resource overflow.

**Good Example:**

This example demonstrates managing backpressure when consuming events at different rates.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface DataPoint {
  readonly id: number;
  readonly value: number;
}

// Fast producer: generates 100 items per second
const fastProducer = (): Stream.Stream<DataPoint> =>
  Stream.fromIterable(Array.from({ length: 100 }, (_, i) => ({ id: i, value: Math.random() }))).pipe(
    Stream.tap(() => Effect.sleep("10 millis")) // 10ms per item = 100/sec
  );

// Slow consumer: processes 10 items per second
const slowConsumer = (item: DataPoint): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Effect.sleep("100 millis"); // 100ms per item = 10/sec
  });

// Without backpressure (DANGEROUS - queue grows unbounded)
const unbufferedStream = (): Stream.Stream<DataPoint> =>
  fastProducer().pipe(
    Stream.tap((item) =>
      Effect.log(`[UNBUFFERED] Produced item ${item.id}`)
    )
  );

// With bounded buffer (backpressure kicks in)
const bufferedStream = (bufferSize: number): Stream.Stream<DataPoint> =>
  fastProducer().pipe(
    // Buffer at most 10 items; if full, producer waits
    Stream.buffer(bufferSize),
    Stream.tap((item) =>
      Effect.log(`[BUFFERED] Consumed item ${item.id}`)
    )
  );

// With throttling (rate limit emission)
const throttledStream = (): Stream.Stream<DataPoint> =>
  fastProducer().pipe(
    // Emit at most 1 item per 50ms (20/sec)
    Stream.throttle(1, "50 millis"),
    Stream.tap((item) =>
      Effect.log(`[THROTTLED] Item ${item.id}`)
    )
  );

// Main: compare approaches
const program = Effect.gen(function* () {
  console.log(`\n[START] Demonstrating backpressure management\n`);

  // Test buffered approach
  console.log(`[TEST 1] Buffered stream (buffer size 5):\n`);

  const startBuffer = Date.now();

  yield* bufferedStream(5).pipe(
    Stream.take(20), // Take only 20 items
    Stream.runForEach(slowConsumer)
  );

  const bufferTime = Date.now() - startBuffer;
  console.log(`\n[RESULT] Buffered approach took ${bufferTime}ms\n`);

  // Test throttled approach
  console.log(`[TEST 2] Throttled stream (1 item per 50ms):\n`);

  const startThrottle = Date.now();

  yield* throttledStream().pipe(
    Stream.take(20),
    Stream.runForEach(slowConsumer)
  );

  const throttleTime = Date.now() - startThrottle;
  console.log(`\n[RESULT] Throttled approach took ${throttleTime}ms\n`);

  // Summary
  console.log(`[SUMMARY]`);
  console.log(`  Without backpressure control:`);
  console.log(`    - Queue would grow to 100 items (memory risk)`);
  console.log(`    - Producer/consumer operate independently`);
  console.log(`  With buffering:`);
  console.log(`    - Queue bounded to 5 items (safe)`);
  console.log(`    - Producer waits when buffer full`);
  console.log(`  With throttling:`);
  console.log(`    - Production rate limited to 20/sec`);
  console.log(`    - Smooth controlled flow`);
});

Effect.runPromise(program);
```

---

**Rationale:**

Backpressure is flow control: slow consumer tells fast producer to slow down.

Techniques:
- **Buffering**: Store items temporarily (limited queue)
- **Throttling**: Rate limit item emission
- **Chunking**: Process in fixed-size batches
- **Debouncing**: Skip rapid duplicates

Pattern: `stream.pipe(Stream.throttle(...), Stream.buffer(...))`

---


Without backpressure management, mismatched producer/consumer speeds cause:

- **Memory exhaustion**: Producer faster than consumer → queue grows unbounded
- **Garbage collection pauses**: Large buffers cause GC pressure
- **Resource leaks**: Open connections/file handles accumulate
- **Cascade failures**: One slow consumer blocks entire pipeline

Backpressure enable:

- **Memory safety**: Bounded buffers prevent overflow
- **Resource efficiency**: Consumers pace producers naturally
- **Performance**: Tuning buffer sizes improves throughput
- **Observability**: Monitor backpressure as health indicator

Real-world example: Reading large file vs. writing to database
- **No backpressure**: Read entire file into memory, write slowly → memory exhaustion
- **With backpressure**: Read 1000 lines, wait for database, read next batch

---

---

### Stream Pattern 4: Stateful Operations with Scan and Fold

**Rule:** Use scan for stateful element-by-element processing and fold for final aggregation, enabling complex stream analytics without buffering entire stream.

**Good Example:**

This example demonstrates maintaining statistics across a stream of measurements.

```typescript
import { Stream, Effect, Chunk } from "effect";

interface Measurement {
  readonly id: number;
  readonly value: number;
  readonly timestamp: Date;
}

interface RunningStats {
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  readonly average: number;
  readonly variance: number;
  readonly lastValue: number;
}

// Create stream of measurements
const createMeasurementStream = (): Stream.Stream<Measurement> =>
  Stream.fromIterable([
    { id: 1, value: 10, timestamp: new Date() },
    { id: 2, value: 20, timestamp: new Date() },
    { id: 3, value: 15, timestamp: new Date() },
    { id: 4, value: 25, timestamp: new Date() },
    { id: 5, value: 30, timestamp: new Date() },
    { id: 6, value: 22, timestamp: new Date() },
  ]);

// Initial statistics state
const initialStats: RunningStats = {
  count: 0,
  sum: 0,
  min: Infinity,
  max: -Infinity,
  average: 0,
  variance: 0,
  lastValue: 0,
};

// Reducer: update stats for each measurement
const updateStats = (
  stats: RunningStats,
  measurement: Measurement
): RunningStats => {
  const newCount = stats.count + 1;
  const newSum = stats.sum + measurement.value;
  const newAverage = newSum / newCount;

  // Calculate variance incrementally
  const delta = measurement.value - stats.average;
  const delta2 = measurement.value - newAverage;
  const newVariance = stats.variance + delta * delta2;

  return {
    count: newCount,
    sum: newSum,
    min: Math.min(stats.min, measurement.value),
    max: Math.max(stats.max, measurement.value),
    average: newAverage,
    variance: newVariance / newCount,
    lastValue: measurement.value,
  };
};

// Main: demonstrate scan with statistics
const program = Effect.gen(function* () {
  console.log(`\n[SCAN] Running statistics stream:\n`);

  // Use scan to emit intermediate statistics
  const statsStream = createMeasurementStream().pipe(
    Stream.scan(initialStats, (stats, measurement) => {
      const newStats = updateStats(stats, measurement);

      console.log(
        `[MEASUREMENT ${measurement.id}] Value: ${measurement.value}`
      );
      console.log(
        `  Count: ${newStats.count}, Avg: ${newStats.average.toFixed(2)}, ` +
        `Min: ${newStats.min}, Max: ${newStats.max}, ` +
        `Variance: ${newStats.variance.toFixed(2)}`
      );

      return newStats;
    })
  );

  // Collect all intermediate stats
  const allStats = yield* statsStream.pipe(Stream.runCollect);

  // Final statistics
  const finalStats = Chunk.last(allStats);

  if (finalStats._tag === "Some") {
    console.log(`\n[FINAL STATISTICS]`);
    console.log(`  Total measurements: ${finalStats.value.count}`);
    console.log(`  Average: ${finalStats.value.average.toFixed(2)}`);
    console.log(`  Min: ${finalStats.value.min}`);
    console.log(`  Max: ${finalStats.value.max}`);
    console.log(
      `  Std Dev: ${Math.sqrt(finalStats.value.variance).toFixed(2)}`
    );
  }

  // Compare with fold (emit only final result)
  console.log(`\n[FOLD] Final statistics only:\n`);

  const finalResult = yield* createMeasurementStream().pipe(
    Stream.fold(initialStats, updateStats),
    Stream.tap((stats) =>
      Effect.log(`Final: Count=${stats.count}, Avg=${stats.average.toFixed(2)}`)
    )
  );
});

Effect.runPromise(program);
```

---

**Rationale:**

Stateful stream operations:

- **scan**: Apply function with accumulator, emit intermediate states
- **fold**: Apply function with accumulator, emit only final result
- **reduce**: Like fold but requires non-empty stream

Pattern: `stream.pipe(Stream.scan(initialState, reducer))` or `Stream.fold(initialState, reducer)`

---


Processing streams without scan/fold creates issues:

- **Manual state tracking**: Ref or mutable variables outside stream
- **Lost context**: Hard to correlate intermediate values
- **Error-prone**: Easy to forget state updates
- **Testing difficulty**: State spread across code

Scan/fold enable:

- **Declarative state**: State threaded through stream
- **Intermediate values**: Emit state at each step (scan)
- **Type-safe**: Accumulator type guaranteed
- **Composable**: Chain stateful operations

Real-world example: Running average of metrics
- **Without scan**: Track count and sum manually, calculate average, emit
- **With scan**: `stream.pipe(Stream.scan(initialState, updateAverage))`

---

---


## 🟠 Advanced Patterns

### Stream Pattern 5: Grouping and Windowing Streams

**Rule:** Use groupBy to partition streams by key and tumbling/sliding windows to aggregate streams over time windows.

**Good Example:**

This example demonstrates windowing and grouping patterns.

```typescript
import { Effect, Stream, Ref, Duration, Schedule } from "effect";

interface Event {
  readonly timestamp: Date;
  readonly userId: string;
  readonly action: string;
  readonly duration: number; // milliseconds
}

// Simulate event stream
const generateEvents = (): Event[] => [
  { timestamp: new Date(Date.now() - 5000), userId: "user1", action: "click", duration: 100 },
  { timestamp: new Date(Date.now() - 4500), userId: "user2", action: "view", duration: 250 },
  { timestamp: new Date(Date.now() - 4000), userId: "user1", action: "scroll", duration: 150 },
  { timestamp: new Date(Date.now() - 3500), userId: "user3", action: "click", duration: 120 },
  { timestamp: new Date(Date.now() - 3000), userId: "user2", action: "click", duration: 180 },
  { timestamp: new Date(Date.now() - 2500), userId: "user1", action: "view", duration: 200 },
  { timestamp: new Date(Date.now() - 2000), userId: "user3", action: "view", duration: 300 },
  { timestamp: new Date(Date.now() - 1500), userId: "user1", action: "submit", duration: 500 },
  { timestamp: new Date(Date.now() - 1000), userId: "user2", action: "scroll", duration: 100 },
];

// Main: windowing and grouping examples
const program = Effect.gen(function* () {
  console.log(`\n[WINDOWING & GROUPING] Stream organization patterns\n`);

  const events = generateEvents();

  // Example 1: Tumbling window (fixed-size batches)
  console.log(`[1] Tumbling window (2-event batches):\n`);

  const windowSize = 2;
  let batchNumber = 1;

  for (let i = 0; i < events.length; i += windowSize) {
    const batch = events.slice(i, i + windowSize);

    yield* Effect.log(`[WINDOW ${batchNumber}] (${batch.length} events)`);

    let totalDuration = 0;

    for (const event of batch) {
      yield* Effect.log(
        `  - ${event.userId}: ${event.action} (${event.duration}ms)`
      );

      totalDuration += event.duration;
    }

    yield* Effect.log(`[WINDOW ${batchNumber}] Total duration: ${totalDuration}ms\n`);

    batchNumber++;
  }

  // Example 2: Sliding window (overlapping)
  console.log(`[2] Sliding window (last 3 events, slide by 1):\n`);

  const windowSizeSlide = 3;
  const slideBy = 1;

  for (let i = 0; i <= events.length - windowSizeSlide; i += slideBy) {
    const window = events.slice(i, i + windowSizeSlide);

    const avgDuration =
      window.reduce((sum, e) => sum + e.duration, 0) / window.length;

    yield* Effect.log(
      `[SLIDE ${i / slideBy}] ${window.length} events, avg duration: ${avgDuration.toFixed(0)}ms`
    );
  }

  // Example 3: Group by key
  console.log(`\n[3] Group by user:\n`);

  const byUser = new Map<string, Event[]>();

  for (const event of events) {
    if (!byUser.has(event.userId)) {
      byUser.set(event.userId, []);
    }

    byUser.get(event.userId)!.push(event);
  }

  for (const [userId, userEvents] of byUser) {
    const totalActions = userEvents.length;
    const totalTime = userEvents.reduce((sum, e) => sum + e.duration, 0);
    const avgTime = totalTime / totalActions;

    yield* Effect.log(
      `[USER ${userId}] ${totalActions} actions, ${totalTime}ms total, ${avgTime.toFixed(0)}ms avg`
    );
  }

  // Example 4: Group + Window combination
  console.log(`\n[4] Group by user, window by action type:\n`);

  for (const [userId, userEvents] of byUser) {
    const byAction = new Map<string, Event[]>();

    for (const event of userEvents) {
      if (!byAction.has(event.action)) {
        byAction.set(event.action, []);
      }

      byAction.get(event.action)!.push(event);
    }

    yield* Effect.log(`[USER ${userId}] Action breakdown:`);

    for (const [action, actionEvents] of byAction) {
      const count = actionEvents.length;
      const total = actionEvents.reduce((sum, e) => sum + e.duration, 0);

      yield* Effect.log(`  ${action}: ${count}x (${total}ms total)`);
    }
  }

  // Example 5: Session window (based on inactivity timeout)
  console.log(`\n[5] Session window (gap > 1000ms = new session):\n`);

  const sessionGapMs = 1000;
  const sessions: Event[][] = [];
  let currentSession: Event[] = [];
  let lastTimestamp = events[0]?.timestamp.getTime() ?? 0;

  for (const event of events) {
    const currentTime = event.timestamp.getTime();
    const timeSinceLastEvent = currentTime - lastTimestamp;

    if (timeSinceLastEvent > sessionGapMs && currentSession.length > 0) {
      sessions.push(currentSession);
      yield* Effect.log(
        `[SESSION] Closed (${currentSession.length} events, gap: ${timeSinceLastEvent}ms)`
      );

      currentSession = [];
    }

    currentSession.push(event);
    lastTimestamp = currentTime;
  }

  if (currentSession.length > 0) {
    sessions.push(currentSession);
    yield* Effect.log(`[SESSION] Final (${currentSession.length} events)`);
  }

  // Example 6: Top-K aggregation in window
  console.log(`\n[6] Top 2 actions in last window:\n`);

  const lastWindow = events.slice(-3);

  const actionCounts = new Map<string, number>();

  for (const event of lastWindow) {
    actionCounts.set(
      event.action,
      (actionCounts.get(event.action) ?? 0) + 1
    );
  }

  const topActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  yield* Effect.log(`[TOP-K] In last window of 3 events:`);

  for (const [action, count] of topActions) {
    yield* Effect.log(`  ${action}: ${count}x`);
  }
});

Effect.runPromise(program);
```

---

**Rationale:**

Windowing organizes unbounded streams into bounded chunks:

- **Tumbling window**: Fixed-size non-overlapping (e.g., 1-sec windows)
- **Sliding window**: Overlapping windows (e.g., 10-sec window, 5-sec hop)
- **Group by key**: Partition stream by field value
- **Session window**: Event-based windows (e.g., idle timeout)
- **Batch aggregation**: Process N items or wait T seconds

Pattern: `Stream.groupBy()`, custom windowing with `Ref` and `Schedule`

---


Unbounded streams need boundaries:

**Problem 1: Memory exhaustion**
- Processing 1M events with no boundary = keep all in memory
- Cumulative memory grows unbounded
- Eventually OOM error

**Problem 2: Late aggregation**
- Can't sum all events until stream ends (never)
- Need to decide: "sum events in this 1-second window"

**Problem 3: Grouping complexity**
- Stream of user events: need per-user aggregation
- Without groupBy: manual state tracking (error-prone)

**Problem 4: Temporal patterns**
- "Top 10 searches in last 5 minutes" requires windowing
- "Average response time per endpoint per minute" requires grouping + windowing

Solutions:

**Tumbling window**:
- Divide stream into 1-sec, 5-sec, or 1-min chunks
- Process each chunk independently
- Clear memory between windows
- Natural for: metrics, batching, reports

**Sliding window**:
- Keep last 5 minutes of data at all times
- Emit updated aggregation every second
- Detect patterns over overlapping periods
- Natural for: anomaly detection, trends

**Group by**:
- Separate streams by key
- Each key has independent state
- Emit grouped results
- Natural for: per-user, per-endpoint, per-tenant

---

---

### Stream Pattern 6: Resource Management in Streams

**Rule:** Use Stream.bracket or effect scoping to guarantee resource cleanup, preventing leaks even when streams fail or are interrupted.

**Good Example:**

This example demonstrates resource acquisition, use, and guaranteed cleanup.

```typescript
import { Effect, Stream, Resource, Scope, Ref } from "effect";

interface FileHandle {
  readonly path: string;
  readonly fd: number;
}

interface Connection {
  readonly id: string;
  readonly isOpen: boolean;
}

// Simulate resource management
const program = Effect.gen(function* () {
  console.log(`\n[RESOURCE MANAGEMENT] Stream resource lifecycle\n`);

  // Example 1: Bracket pattern for file streams
  console.log(`[1] Bracket pattern (acquire → use → release):\n`);

  let openHandles = 0;
  let closedHandles = 0;

  const openFile = (path: string) =>
    Effect.gen(function* () {
      openHandles++;
      yield* Effect.log(`[OPEN] File "${path}" (total open: ${openHandles})`);

      return { path, fd: 1000 + openHandles };
    });

  const closeFile = (handle: FileHandle) =>
    Effect.gen(function* () {
      closedHandles++;
      yield* Effect.log(`[CLOSE] File "${handle.path}" (total closed: ${closedHandles})`);
    });

  const readFileWithBracket = (path: string) =>
    Effect.gen(function* () {
      let handle: FileHandle | null = null;

      try {
        handle = yield* openFile(path);

        yield* Effect.log(
          `[USE] Reading from fd ${handle.fd} ("${handle.path}")`
        );

        // Simulate reading
        return "file contents";
      } finally {
        // Guaranteed to run even if error occurs above
        if (handle) {
          yield* closeFile(handle);
        }
      }
    });

  // Test with success
  yield* Effect.log(`[TEST] Success case:`);

  const content = yield* readFileWithBracket("/data/file.txt");

  yield* Effect.log(`[RESULT] Got: "${content}"\n`);

  // Test with failure (simulated)
  yield* Effect.log(`[TEST] Error case:`);

  const failCase = Effect.gen(function* () {
    let handle: FileHandle | null = null;

    try {
      handle = yield* openFile("/data/missing.txt");

      // Simulate error mid-operation
      yield* Effect.fail(new Error("Read failed"));
    } finally {
      if (handle) {
        yield* closeFile(handle);
      }
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[ERROR] Caught: ${error.message}`);
        yield* Effect.log(`[CHECK] Closed handles: ${closedHandles} (verifying cleanup)\n`);
      })
    )
  );

  yield* failCase;

  // Example 2: Connection pool management
  console.log(`[2] Connection pooling:\n`);

  interface ConnectionPool {
    acquire: () => Effect.Effect<Connection>;
    release: (conn: Connection) => Effect.Effect<void>;
  }

  const createConnectionPool = (maxSize: number): Effect.Effect<ConnectionPool> =>
    Effect.gen(function* () {
      const available = yield* Ref.make<Connection[]>([]);
      const inUse = yield* Ref.make<Set<string>>(new Set());
      let idCounter = 0;

      return {
        acquire: Effect.gen(function* () {
          const avail = yield* Ref.get(available);

          if (avail.length > 0) {
            yield* Effect.log(`[POOL] Reusing connection from pool`);

            const conn = avail.pop()!;

            yield* Ref.modify(inUse, (set) => [
              undefined,
              new Set(set).add(conn.id),
            ]);

            return conn;
          }

          const inUseCount = (yield* Ref.get(inUse)).size;

          if (inUseCount >= maxSize) {
            yield* Effect.fail(new Error("Pool exhausted"));
          }

          const connId = `conn-${++idCounter}`;

          yield* Effect.log(`[POOL] Creating new connection: ${connId}`);

          const conn = { id: connId, isOpen: true };

          yield* Ref.modify(inUse, (set) => [
            undefined,
            new Set(set).add(connId),
          ]);

          return conn;
        }),

        release: (conn: Connection) =>
          Effect.gen(function* () {
            yield* Ref.modify(inUse, (set) => {
              const updated = new Set(set);
              updated.delete(conn.id);
              return [undefined, updated];
            });

            yield* Ref.modify(available, (avail) => [
              undefined,
              [...avail, conn],
            ]);

            yield* Effect.log(`[POOL] Returned connection: ${conn.id}`);
          }),
      };
    });

  const pool = yield* createConnectionPool(3);

  // Acquire and release connections
  const conn1 = yield* pool.acquire();
  const conn2 = yield* pool.acquire();

  yield* pool.release(conn1);

  const conn3 = yield* pool.acquire(); // Reuses conn1

  yield* Effect.log(`\n`);

  // Example 3: Scope-based resource safety
  console.log(`[3] Scoped resources (hierarchical cleanup):\n`);

  let scopedCount = 0;

  const withScoped = <R,>(create: () => Effect.Effect<R>) =>
    Effect.gen(function* () {
      scopedCount++;
      const id = scopedCount;

      yield* Effect.log(`[SCOPE] Enter scope ${id}`);

      const resource = yield* create();

      yield* Effect.log(`[SCOPE] Using resource in scope ${id}`);

      yield* Effect.sync(() => {
        // Cleanup happens here when scope exits
        yield* Effect.log(`[SCOPE] Exit scope ${id}`);
      }).pipe(
        Effect.ensuring(
          Effect.log(`[SCOPE] Cleanup guaranteed for scope ${id}`)
        )
      );

      return resource;
    });

  // Nested scopes
  const result = yield* withScoped(() =>
    Effect.succeed({
      level: 1,
      data: yield* withScoped(() => Effect.succeed("inner data")),
    })
  ).pipe(
    Effect.catchAll(() => Effect.succeed({ level: 0, data: null }))
  );

  yield* Effect.log(`[SCOPES] Cleanup order: inner → outer\n`);

  // Example 4: Stream resource management
  console.log(`[4] Stream with resource cleanup:\n`);

  let streamResourceCount = 0;

  // Simulate stream that acquires resources
  const streamWithResources = Stream.empty.pipe(
    Stream.tap(() =>
      Effect.gen(function* () {
        streamResourceCount++;
        yield* Effect.log(`[STREAM-RES] Acquired resource ${streamResourceCount}`);
      })
    ),
    // Cleanup when stream ends
    Stream.ensuring(
      Effect.log(`[STREAM-RES] Cleaning up all ${streamResourceCount} resources`)
    )
  );

  yield* Stream.runDrain(streamWithResources);

  // Example 5: Error propagation with cleanup
  console.log(`\n[5] Error safety with cleanup:\n`);

  const safeRead = (retryCount: number) =>
    Effect.gen(function* () {
      let handle: FileHandle | null = null;

      try {
        handle = yield* openFile(`/data/file-${retryCount}.txt`);

        if (retryCount < 2) {
          yield* Effect.log(`[READ] Attempt ${retryCount}: failing intentionally`);
          yield* Effect.fail(new Error(`Attempt ${retryCount} failed`));
        }

        yield* Effect.log(`[READ] Success on attempt ${retryCount}`);

        return "success";
      } finally {
        if (handle) {
          yield* closeFile(handle);
        }
      }
    });

  // Retry with guaranteed cleanup
  const result2 = yield* safeRead(1).pipe(
    Effect.retry(
      Schedule.recurs(2).pipe(
        Schedule.compose(Schedule.fixed("10 millis"))
      )
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[FINAL] All retries failed: ${error.message}`);
        return "fallback";
      })
    )
  );

  yield* Effect.log(`\n[FINAL] Result: ${result2}`);
});

Effect.runPromise(program);
```

---

**Rationale:**

Streams must clean up resources deterministically:

- **Acquire/Release**: Get resource, use, return resource
- **Bracket pattern**: Ensure cleanup on success or failure
- **Scope safety**: Guarantee cleanup even on exceptions
- **Connection pooling**: Reuse connections, prevent exhaustion
- **Concurrent cleanup**: Handle cleanup under concurrency

Pattern: `Stream.bracket()`, `Resource.make()`, `Scope` for resource safety

---


Streams without resource management cause problems:

**Problem 1: Resource exhaustion**
- Open file streams without closing → file descriptor limit exceeded
- Get connections from pool, never return → connection starvation
- System becomes unresponsive

**Problem 2: Memory leaks**
- Stream emits large objects → memory grows
- Without cleanup → garbage persists
- GC can't reclaim

**Problem 3: Data corruption**
- Write to file without flush → partial writes on crash
- Read from connection while another thread writes → data race
- Results are unpredictable

**Problem 4: Silent failures**
- Resource cleanup fails → error lost
- Application proceeds as if successful
- Hidden bug becomes hard-to-trace crash later

Solutions:

**Bracket pattern**:
- Acquire resource
- Use resource (even if error)
- Always release resource
- Track errors separately

**Resource scopes**:
- Nested resource management
- Parent cleanup waits for children
- Hierarchical resource graphs
- Type-safe guarantees

**Connection pooling**:
- Reuse connections
- Track available/in-use
- Prevent exhaustion
- Support graceful shutdown

---

---

### Stream Pattern 7: Error Handling in Streams

**Rule:** Use Stream error handlers to recover from failures, retry operations, and maintain stream integrity even when individual elements fail.

**Good Example:**

This example demonstrates stream error handling patterns.

```typescript
import { Effect, Stream, Ref } from "effect";

interface DataRecord {
  id: string;
  value: number;
}

interface ProcessingResult {
  successful: DataRecord[];
  failed: Array<{ id: string; error: string }>;
  retried: number;
}

const program = Effect.gen(function* () {
  console.log(`\n[STREAM ERROR HANDLING] Resilient stream processing\n`);

  // Example 1: Continue on error (skip failed, process rest)
  console.log(`[1] Continue processing despite errors:\n`);

  const processElement = (record: DataRecord): Effect.Effect<string> =>
    Effect.gen(function* () {
      if (record.value < 0) {
        yield* Effect.fail(new Error(`Invalid value: ${record.value}`));
      }

      return `processed-${record.id}`;
    });

  const records = [
    { id: "rec1", value: 10 },
    { id: "rec2", value: -5 }, // Will fail
    { id: "rec3", value: 20 },
    { id: "rec4", value: -1 }, // Will fail
    { id: "rec5", value: 30 },
  ];

  const successfulProcessing = yield* Stream.fromIterable(records).pipe(
    Stream.mapEffect((record) =>
      processElement(record).pipe(
        Effect.map((result) => ({ success: true, result })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[ERROR] Record ${record.id} failed`);

            return { success: false, error };
          })
        )
      )
    ),
    Stream.runCollect
  );

  yield* Effect.log(
    `[RESULTS] ${successfulProcessing.filter((r) => r.success).length}/${records.length} succeeded\n`
  );

  // Example 2: Recover with fallback value
  console.log(`[2] Providing fallback on error:\n`);

  const getData = (id: string): Effect.Effect<number> =>
    id.includes("fail") ? Effect.fail(new Error("Data error")) : Effect.succeed(42);

  const recovered = yield* Stream.fromIterable(["ok1", "fail1", "ok2"]).pipe(
    Stream.mapEffect((id) =>
      getData(id).pipe(
        Effect.catchAll(() =>
          Effect.gen(function* () {
            yield* Effect.log(`[FALLBACK] Using default for ${id}`);

            return -1; // Fallback value
          })
        )
      )
    ),
    Stream.runCollect
  );

  yield* Effect.log(`[VALUES] ${recovered.join(", ")}\n`);

  // Example 3: Collect errors alongside successes
  console.log(`[3] Collecting errors and successes:\n`);

  const results = yield* Ref.make<ProcessingResult>({
    successful: [],
    failed: [],
    retried: 0,
  });

  yield* Stream.fromIterable(records).pipe(
    Stream.mapEffect((record) =>
      processElement(record).pipe(
        Effect.tap((result) =>
          Ref.modify(results, (r) => [
            undefined,
            {
              ...r,
              successful: [...r.successful, record],
            },
          ])
        ),
        Effect.catchAll((error) =>
          Ref.modify(results, (r) => [
            undefined,
            {
              ...r,
              failed: [
                ...r.failed,
                { id: record.id, error: error.message },
              ],
            },
          ])
        )
      )
    ),
    Stream.runDrain
  );

  const finalResults = yield* Ref.get(results);

  yield* Effect.log(
    `[AGGREGATE] ${finalResults.successful.length} succeeded, ${finalResults.failed.length} failed`
  );

  for (const failure of finalResults.failed) {
    yield* Effect.log(`  - ${failure.id}: ${failure.error}`);
  }

  // Example 4: Retry on error with backoff
  console.log(`\n[4] Retry with exponential backoff:\n`);

  let attemptCount = 0;

  const unreliableOperation = (id: string): Effect.Effect<string> =>
    Effect.gen(function* () {
      attemptCount++;

      if (attemptCount <= 2) {
        yield* Effect.log(`[ATTEMPT ${attemptCount}] Failing for ${id}`);

        yield* Effect.fail(new Error("Temporary failure"));
      }

      yield* Effect.log(`[SUCCESS] Succeeded on attempt ${attemptCount}`);

      return `result-${id}`;
    });

  const retried = unreliableOperation("test").pipe(
    Effect.retry(
      Schedule.exponential("10 millis").pipe(
        Schedule.upTo("100 millis"),
        Schedule.recurs(3)
      )
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[EXHAUSTED] All retries failed`);

        return "fallback";
      })
    )
  );

  yield* retried;

  // Example 5: Error context in streams
  console.log(`\n[5] Propagating error context:\n`);

  interface StreamContext {
    batchId: string;
    timestamp: Date;
  }

  const processWithContext = (context: StreamContext) =>
    Stream.fromIterable([1, 2, -3, 4]).pipe(
      Stream.mapEffect((value) =>
        Effect.gen(function* () {
          if (value < 0) {
            yield* Effect.fail(
              new Error(
                `Negative value in batch ${context.batchId} at ${context.timestamp.toISOString()}`
              )
            );
          }

          return value * 2;
        })
      ),
      Stream.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.log(`[CONTEXT ERROR] ${error.message}`);

          return Stream.empty;
        })
      )
    );

  const context: StreamContext = {
    batchId: "batch-001",
    timestamp: new Date(),
  };

  yield* processWithContext(context).pipe(Stream.runDrain);

  // Example 6: Partial recovery (keep good data, log bad)
  console.log(`\n[6] Partial recovery strategy:\n`);

  const mixedQuality = [
    { id: "1", data: "good" },
    { id: "2", data: "bad" },
    { id: "3", data: "good" },
    { id: "4", data: "bad" },
    { id: "5", data: "good" },
  ];

  const processQuality = (record: { id: string; data: string }) =>
    record.data === "good"
      ? Effect.succeed(`valid-${record.id}`)
      : Effect.fail(new Error(`Invalid data for ${record.id}`));

  const partialResults = yield* Stream.fromIterable(mixedQuality).pipe(
    Stream.mapEffect((record) =>
      processQuality(record).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[LOG] ${error.message}`);

            return null; // Skip this record
          })
        )
      )
    ),
    Stream.filter((result) => result !== null),
    Stream.runCollect
  );

  yield* Effect.log(
    `[PARTIAL] Kept ${partialResults.length}/${mixedQuality.length} valid records\n`
  );

  // Example 7: Timeout handling in streams
  console.log(`[7] Timeout handling per element:\n`);

  const slowOperation = (id: string): Effect.Effect<string> =>
    Effect.gen(function* () {
      // Simulate slow operations
      if (id === "slow") {
        yield* Effect.sleep("200 millis");
      } else {
        yield* Effect.sleep("50 millis");
      }

      return `done-${id}`;
    });

  const withTimeout = yield* Stream.fromIterable(["fast1", "slow", "fast2"]).pipe(
    Stream.mapEffect((id) =>
      slowOperation(id).pipe(
        Effect.timeout("100 millis"),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[TIMEOUT] Operation ${id} timed out`);

            return "timeout-fallback";
          })
        )
      )
    ),
    Stream.runCollect
  );

  yield* Effect.log(`[RESULTS] ${withTimeout.join(", ")}\n`);

  // Example 8: Stream termination on critical error
  console.log(`[8] Terminating stream on critical error:\n`);

  const isCritical = (error: Error): boolean =>
    error.message.includes("CRITICAL");

  const terminateOnCritical = Stream.fromIterable([1, 2, 3]).pipe(
    Stream.mapEffect((value) =>
      value === 2
        ? Effect.fail(new Error("CRITICAL: System failure"))
        : Effect.succeed(value)
    ),
    Stream.catchAll((error) =>
      Effect.gen(function* () {
        if (isCritical(error)) {
          yield* Effect.log(`[CRITICAL] Terminating stream`);

          return Stream.fail(error);
        }

        yield* Effect.log(`[WARNING] Continuing despite error`);

        return Stream.empty;
      })
    )
  );

  yield* terminateOnCritical.pipe(
    Stream.runCollect,
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.log(`[STOPPED] Stream stopped: ${error.message}`);

        return [];
      })
    )
  );
});

Effect.runPromise(program);
```

---

**Rationale:**

Stream error handling enables resilience:

- **Continue on error**: Skip failed element, process rest
- **Recover**: Provide fallback value
- **Retry**: Attempt failed element again
- **Aggregate**: Collect errors alongside successful values
- **Terminate gracefully**: Controlled shutdown
- **Propagate**: Let errors flow upstream

Pattern: `Stream.catchAll()`, `Stream.retry()`, `Stream.recover()`, `Stream.runCollect()`

---


Errors in streams cause cascading failures:

**Problem 1: Stream death**
- Process 10,000 records
- Record #5000 has bad data
- Stream crashes
- 9,000 records not processed
- Manual re-run needed

**Problem 2: Silent data loss**
- Stream encounters error
- Stops processing
- Caller doesn't notice
- Missing data goes undetected
- Reports wrong numbers

**Problem 3: No recovery visibility**
- Error happens
- Is it retried? How many times?
- Did it recover?
- Silent guessing required

**Problem 4: Downstream effects**
- Stream error affects all subscribers
- Cascading failure
- System becomes unavailable
- All downstream blocked

Solutions:

**Continue on error**:
- Skip failed element
- Process rest of stream
- Collect error for later
- Partial success acceptable

**Retry with backoff**:
- Transient error? Retry
- Exponential backoff
- Eventually give up
- Move to next element

**Error aggregation**:
- Collect all errors
- Collect all successes
- Report both
- Analytics/debugging

**Graceful termination**:
- Signal end of stream on error
- Allow cleanup
- Prevent resource leak
- Controlled shutdown

---

---

### Stream Pattern 8: Advanced Stream Transformations

**Rule:** Use advanced stream operators to build sophisticated data pipelines that compose elegantly and maintain performance at scale.

**Good Example:**

This example demonstrates advanced stream transformations.

```typescript
import { Effect, Stream, Ref, Chunk } from "effect";

interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
}

interface Metric {
  name: string;
  value: number;
  tags: Record<string, string>;
}

const program = Effect.gen(function* () {
  console.log(`\n[ADVANCED STREAM TRANSFORMATIONS] Complex data flows\n`);

  // Example 1: Custom filter operator
  console.log(`[1] Custom filter with effect-based logic:\n`);

  const filterByEffect = <A,>(
    predicate: (a: A) => Effect.Effect<boolean>
  ) =>
    (stream: Stream.Stream<A>) =>
      stream.pipe(
        Stream.mapEffect((value) =>
          predicate(value).pipe(
            Effect.map((keep) => (keep ? value : null))
          )
        ),
        Stream.filter((value) => value !== null)
      );

  const isValid = (num: number): Effect.Effect<boolean> =>
    Effect.gen(function* () {
      // Simulate validation effect (e.g., API call)
      return num > 0 && num < 100;
    });

  const numbers = [50, 150, 25, -10, 75];

  const validNumbers = yield* Stream.fromIterable(numbers).pipe(
    filterByEffect(isValid),
    Stream.runCollect
  );

  yield* Effect.log(`[VALID] ${validNumbers.join(", ")}\n`);

  // Example 2: Enrichment transformation
  console.log(`[2] Enriching records with additional data:\n`);

  interface RawRecord {
    id: string;
    value: number;
  }

  interface EnrichedRecord {
    id: string;
    value: number;
    validated: boolean;
    processed: Date;
    metadata: Record<string, unknown>;
  }

  const enrich = (record: RawRecord): Effect.Effect<EnrichedRecord> =>
    Effect.gen(function* () {
      // Simulate lookup/validation
      const validated = record.value > 0;

      return {
        id: record.id,
        value: record.value,
        validated,
        processed: new Date(),
        metadata: { source: "stream" },
      };
    });

  const rawData = [
    { id: "r1", value: 10 },
    { id: "r2", value: -5 },
    { id: "r3", value: 20 },
  ];

  const enriched = yield* Stream.fromIterable(rawData).pipe(
    Stream.mapEffect((record) => enrich(record)),
    Stream.runCollect
  );

  yield* Effect.log(`[ENRICHED] ${enriched.length} records enriched\n`);

  // Example 3: Demultiplexing (split one stream into multiple)
  console.log(`[3] Demultiplexing by category:\n`);

  interface Event {
    id: string;
    type: "click" | "view" | "purchase";
    data: unknown;
  }

  const events: Event[] = [
    { id: "e1", type: "click", data: { x: 100, y: 200 } },
    { id: "e2", type: "view", data: { url: "/" } },
    { id: "e3", type: "purchase", data: { amount: 99.99 } },
    { id: "e4", type: "click", data: { x: 50, y: 100 } },
  ];

  const clicks = yield* Stream.fromIterable(events).pipe(
    Stream.filter((e) => e.type === "click"),
    Stream.runCollect
  );

  const views = yield* Stream.fromIterable(events).pipe(
    Stream.filter((e) => e.type === "view"),
    Stream.runCollect
  );

  const purchases = yield* Stream.fromIterable(events).pipe(
    Stream.filter((e) => e.type === "purchase"),
    Stream.runCollect
  );

  yield* Effect.log(
    `[DEMUX] Clicks: ${clicks.length}, Views: ${views.length}, Purchases: ${purchases.length}\n`
  );

  // Example 4: Chunked processing (batch transformation)
  console.log(`[4] Chunked processing (batches of N):\n`);

  const processChunk = (chunk: Array<{ id: string; value: number }>) =>
    Effect.gen(function* () {
      const sum = chunk.reduce((s, r) => s + r.value, 0);
      const avg = sum / chunk.length;

      yield* Effect.log(
        `[CHUNK] ${chunk.length} items, avg: ${avg.toFixed(2)}`
      );

      return { size: chunk.length, sum, avg };
    });

  const data = Array.from({ length: 10 }, (_, i) => ({
    id: `d${i}`,
    value: i + 1,
  }));

  const chunkSize = 3;
  const chunks = [];

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);

    chunks.push(chunk);
  }

  const chunkResults = yield* Effect.all(
    chunks.map((chunk) => processChunk(chunk))
  );

  yield* Effect.log(
    `[CHUNKS] Processed ${chunkResults.length} batches\n`
  );

  // Example 5: Multi-stage transformation pipeline
  console.log(`[5] Multi-stage pipeline (parse → validate → transform):\n`);

  const rawStrings = ["10", "twenty", "30", "-5", "50"];

  // Stage 1: Parse
  const parsed = yield* Stream.fromIterable(rawStrings).pipe(
    Stream.mapEffect((s) =>
      Effect.gen(function* () {
        try {
          return parseInt(s);
        } catch (error) {
          yield* Effect.fail(
            new Error(`Failed to parse: ${s}`)
          );
        }
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.log(`[PARSE ERROR] ${error.message}`);

            return null;
          })
        )
      )
    ),
    Stream.filter((n) => n !== null),
    Stream.runCollect
  );

  yield* Effect.log(`[STAGE 1] Parsed: ${parsed.join(", ")}`);

  // Stage 2: Validate
  const validated = parsed.filter((n) => n > 0);

  yield* Effect.log(`[STAGE 2] Validated: ${validated.join(", ")}`);

  // Stage 3: Transform
  const transformed = validated.map((n) => n * 2);

  yield* Effect.log(`[STAGE 3] Transformed: ${transformed.join(", ")}\n`);

  // Example 6: Composition of custom operators
  console.log(`[6] Composable transformation pipeline:\n`);

  // Define custom operator
  const withLogging = <A,>(label: string) =>
    (stream: Stream.Stream<A>) =>
      stream.pipe(
        Stream.tap((value) =>
          Effect.log(`[${label}] Processing: ${JSON.stringify(value)}`)
        )
      );

  const filterPositive = (stream: Stream.Stream<number>) =>
    stream.pipe(
      Stream.filter((n) => n > 0),
      Stream.tap(() => Effect.log(`[FILTER] Kept positive`))
    );

  const scaleUp = (factor: number) =>
    (stream: Stream.Stream<number>) =>
      stream.pipe(
        Stream.map((n) => n * factor),
        Stream.tap((n) =>
          Effect.log(`[SCALE] Scaled to ${n}`)
        )
      );

  const testData = [10, -5, 20, -3, 30];

  const pipeline = yield* Stream.fromIterable(testData).pipe(
    withLogging("INPUT"),
    filterPositive,
    scaleUp(10),
    Stream.runCollect
  );

  yield* Effect.log(`[RESULT] Final: ${pipeline.join(", ")}\n`);

  // Example 7: Stateful transformation
  console.log(`[7] Stateful transformation (running total):\n`);

  const runningTotal = yield* Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
    Stream.scan(0, (acc, value) => acc + value),
    Stream.runCollect
  );

  yield* Effect.log(`[TOTALS] ${runningTotal.join(", ")}\n`);

  // Example 8: Conditional transformation
  console.log(`[8] Conditional transformation (different paths):\n`);

  interface Item {
    id: string;
    priority: "high" | "normal" | "low";
  }

  const transformByPriority = (item: Item): Effect.Effect<{
    id: string;
    processed: string;
  }> =>
    Effect.gen(function* () {
      switch (item.priority) {
        case "high":
          yield* Effect.log(`[HIGH] Priority processing for ${item.id}`);

          return { id: item.id, processed: "urgent" };

        case "normal":
          yield* Effect.log(
            `[NORMAL] Standard processing for ${item.id}`
          );

          return { id: item.id, processed: "standard" };

        case "low":
          yield* Effect.log(`[LOW] Deferred processing for ${item.id}`);

          return { id: item.id, processed: "deferred" };
      }
    });

  const items: Item[] = [
    { id: "i1", priority: "normal" },
    { id: "i2", priority: "high" },
    { id: "i3", priority: "low" },
  ];

  const processed = yield* Stream.fromIterable(items).pipe(
    Stream.mapEffect((item) => transformByPriority(item)),
    Stream.runCollect
  );

  yield* Effect.log(
    `[CONDITIONAL] Processed ${processed.length} items\n`
  );

  // Example 9: Performance-optimized transformation
  console.log(`[9] Optimized for performance:\n`);

  const largeDataset = Array.from({ length: 1000 }, (_, i) => i);

  const startTime = Date.now();

  // Use efficient operators
  const result = yield* Stream.fromIterable(largeDataset).pipe(
    Stream.filter((n) => n % 2 === 0), // Keep even
    Stream.take(100), // Limit to first 100
    Stream.map((n) => n * 2), // Transform
    Stream.runCollect
  );

  const elapsed = Date.now() - startTime;

  yield* Effect.log(
    `[PERF] Processed 1000 items in ${elapsed}ms, kept ${result.length} items`
  );
});

Effect.runPromise(program);
```

---

**Rationale:**

Advanced transformations enable complex data flows:

- **Custom operators**: Build reusable transformations
- **Effect-based**: Transformations with side effects
- **Lazy evaluation**: Compute only what's needed
- **Fusion**: Optimize composed operations
- **Staging**: Multiple transformation layers
- **Composition**: Combine operators cleanly

Pattern: `Stream.mapEffect()`, `Stream.map()`, pipe composition

---


Simple transformations don't scale:

**Problem 1: Performance degradation**
- Each layer creates intermediate collection
- 10 transformations = 10 allocations
- Process 1M items = 10M allocations
- GC pressure, memory exhaustion

**Problem 2: Complex logic scattered**
- Validation here, enrichment there, filtering elsewhere
- Hard to maintain
- Changes break other parts
- No clear data flow

**Problem 3: Effect handling**
- Transformations need side effects
- Network calls, database queries
- Naive approach: load all, transform sequentially
- Slow, inefficient

**Problem 4: Reusability**
- Custom transformation used once
- Next time, rewrite from scratch
- Code duplication
- Bugs replicated

Solutions:

**Custom operators**:
- Encapsulate transformation logic
- Reusable across projects
- Testable in isolation
- Composable

**Lazy evaluation**:
- Compute as elements flow
- No intermediate collections
- Constant memory
- Only compute what's used

**Fusion**:
- Combine multiple maps/filters
- Single pass through data
- No intermediate collections
- Compiler/library optimizes

**Effect composition**:
- Chain effects naturally
- Error propagation automatic
- Resource cleanup guaranteed
- Readable code

---

---


