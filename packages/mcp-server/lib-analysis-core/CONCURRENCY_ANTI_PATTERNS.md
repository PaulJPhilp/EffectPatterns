# Concurrency Anti-Patterns (Effect)

These anti-patterns indicate unsafe or unclear concurrency behavior in Effect-TS codebases. They often work in tests and fail in production, making them particularly dangerous.

## Overview

Concurrency anti-patterns are **high-impact** and often justify Pro warnings. They can lead to:
- Resource exhaustion and memory spikes
- Silent data loss and fiber leaks
- Race conditions and non-deterministic bugs
- Production failures that don't appear in tests

---

## 1. Unbounded Parallelism

**Rule ID**: `unbounded-parallelism-effect-all`  
**Severity**: High  
**Category**: concurrency  
**Fix ID**: `add-concurrency-limit-to-effect-all`

### The Problem

```typescript
// ❌ Bad - No concurrency limit
Effect.all(items.map(doWork))
```

**Why this is bad:**
- Can overwhelm services
- No backpressure
- Memory spikes

### Better Approach

```typescript
// ✅ Good - Controlled concurrency
Effect.forEach(items, doWork, { concurrency: 10 })

// Or with Effect.all
Effect.all(items.map(doWork), { concurrency: 10 })

// For more control
Effect.forEach(items, doWork, {
  concurrency: 10,
  batching: true
})
```

---

## 2. Fire-and-Forget Forks

**Rule ID**: `fire-and-forget-forks`  
**Severity**: High  
**Category**: concurrency  
**Fix ID**: `add-fiber-supervision-or-join`

### The Problem

```typescript
// ❌ Bad - Fiber leaked, errors lost
Effect.fork(effect)
```

without join, supervision, or lifetime control.

**Why this is bad:**
- Leaks fibers
- Loses errors
- Hard to reason about shutdown

### Better Approach

```typescript
// ✅ Good - Proper fiber management
Effect.gen(function* () {
  const fiber = yield* Effect.fork(backgroundWork);
  
  // Option 1: Join and wait for result
  const result = yield* Fiber.join(fiber);
  
  // Option 2: Await (join + unwrap errors)
  const result = yield* Fiber.await(fiber);
  
  // Option 3: Scoped fork (auto-cleanup)
  yield* Effect.forkScoped(backgroundWork);
  
  // Option 4: Fork in scope with supervision
  yield* Effect.forkIn(backgroundWork, scope);
});
```

---

## 3. Forking Inside Loops

**Rule ID**: `forking-inside-loops`  
**Severity**: High  
**Category**: concurrency  
**Fix ID**: `replace-loop-fork-with-foreach`

### The Problem

```typescript
// ❌ Bad - Explosive concurrency
for (const item of items) {
  yield* Effect.fork(processItem(item));
}
```

**Why this is bad:**
- Explosive concurrency
- Almost always accidental
- No control over parallelism

### Better Approach

```typescript
// ✅ Good - Controlled parallelism
Effect.forEach(items, processItem, { concurrency: 10 })

// Or if you need the fibers
Effect.gen(function* () {
  const fibers = yield* Effect.forEach(
    items,
    (item) => Effect.fork(processItem(item)),
    { concurrency: 10 }
  );
  
  // Join all fibers
  yield* Effect.all(fibers.map(Fiber.join));
});
```

---

## 4. Racing Effects Without Handling Losers

**Rule ID**: `racing-without-handling-losers`  
**Severity**: High  
**Category**: concurrency  
**Fix ID**: `handle-race-interruption`

### The Problem

```typescript
// ❌ Bad - Loser may hold resources
Effect.race(fetchFromPrimary, fetchFromBackup)
```

without understanding interruption semantics.

**Why this is bad:**
- Loser fibers may hold resources
- Side effects may still run
- Cleanup may not happen

### Better Approach

```typescript
// ✅ Good - Understand interruption
Effect.gen(function* () {
  // Race with proper cleanup
  const result = yield* Effect.race(
    fetchFromPrimary.pipe(
      Effect.ensuring(cleanupPrimary)
    ),
    fetchFromBackup.pipe(
      Effect.ensuring(cleanupBackup)
    )
  );
  
  return result;
});

// Or use raceAll for multiple effects
Effect.raceAll([
  effect1.pipe(Effect.ensuring(cleanup1)),
  effect2.pipe(Effect.ensuring(cleanup2)),
  effect3.pipe(Effect.ensuring(cleanup3)),
]);
```

---

## 5. Blocking Calls Inside Effect Logic

**Rule ID**: `blocking-calls-in-effect-logic`  
**Severity**: High  
**Category**: concurrency  
**Fix ID**: `offload-blocking-work`

### The Problem

Sync filesystem, crypto, compression, CPU-heavy work inside Effect.

**Why this is bad:**
- Blocks the fiber pool
- Starves unrelated work
- Degrades overall performance

### Better Approach

```typescript
// ❌ Bad - Blocks fiber pool
Effect.sync(() => {
  const data = fs.readFileSync("large-file.txt");
  return processData(data);
});

// ✅ Good - Offload blocking work
Effect.blocking(
  Effect.sync(() => {
    const data = fs.readFileSync("large-file.txt");
    return processData(data);
  })
);

// Or use platform services
import { FileSystem } from "@effect/platform";

Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const data = yield* fs.readFile("large-file.txt");
  return processData(data);
});
```

---

## 6. Using Promise Concurrency Instead of Effect

**Rule ID**: `promise-concurrency-in-effect`  
**Severity**: Medium  
**Category**: concurrency  
**Fix ID**: `replace-promise-all-with-effect-all`

### The Problem

```typescript
// ❌ Bad - No interruption, no supervision
Promise.all([...])
```

inside Effect logic.

**Why this is bad:**
- No interruption
- No supervision
- No structured error handling

### Better Approach

```typescript
// ❌ Bad
Effect.gen(function* () {
  const results = yield* Effect.promise(() =>
    Promise.all([
      fetchUser(1),
      fetchUser(2),
      fetchUser(3)
    ])
  );
});

// ✅ Good - Proper Effect concurrency
Effect.gen(function* () {
  const results = yield* Effect.all([
    Effect.tryPromise(() => fetchUser(1)),
    Effect.tryPromise(() => fetchUser(2)),
    Effect.tryPromise(() => fetchUser(3))
  ], { concurrency: 3 });
});
```

---

## 7. Ignoring Fiber Failures

**Rule ID**: `ignoring-fiber-failures`  
**Severity**: Medium  
**Category**: concurrency  
**Fix ID**: `observe-fiber-results`

### The Problem

Forked fiber fails, result never observed.

**Why this is bad:**
- Silent data loss
- Debugging nightmare
- Errors disappear

### Better Approach

```typescript
// ❌ Bad - Error lost
Effect.gen(function* () {
  const fiber = yield* Effect.fork(criticalWork);
  // ... fiber result never checked
});

// ✅ Good - Observe results
Effect.gen(function* () {
  const fiber = yield* Effect.fork(criticalWork);
  
  // Join to get result or error
  const result = yield* Fiber.join(fiber);
  
  // Or await (unwraps Exit)
  const result = yield* Fiber.await(fiber);
  
  // Or interrupt if needed
  yield* Fiber.interrupt(fiber);
});

// ✅ Better - Use scoped fork for auto-cleanup
Effect.scoped(
  Effect.gen(function* () {
    yield* Effect.forkScoped(criticalWork);
    // Fiber automatically joined on scope exit
  })
);
```

---

## 8. Retrying Concurrently Without Limits

**Rule ID**: `retrying-concurrently-without-limits`  
**Severity**: High  
**Category**: concurrency  
**Fix ID**: `add-retry-coordination`

### The Problem

Retrying parallel effects without coordination.

**Why this is bad:**
- Retry storms
- Thundering herd problems
- Service overload

### Better Approach

```typescript
// ❌ Bad - Retry storm
Effect.all(
  items.map(item =>
    processItem(item).pipe(
      Effect.retry(Schedule.exponential("100 millis"))
    )
  )
);

// ✅ Good - Coordinated retries
Effect.forEach(
  items,
  (item) => processItem(item).pipe(
    Effect.retry(
      Schedule.exponential("100 millis").pipe(
        Schedule.jittered,
        Schedule.intersect(Schedule.recurs(3))
      )
    )
  ),
  { concurrency: 5 } // Limit concurrent retries
);

// ✅ Better - Circuit breaker pattern
import { CircuitBreaker } from "effect";

const breaker = CircuitBreaker.make({
  maxFailures: 5,
  resetTimeout: Duration.seconds(30)
});

Effect.forEach(
  items,
  (item) => breaker.execute(processItem(item)),
  { concurrency: 5 }
);
```

---

## 9. Shared Mutable State Across Fibers

**Rule ID**: `shared-mutable-state-across-fibers`  
**Severity**: High  
**Category**: concurrency  
**Fix ID**: `use-ref-for-shared-state`

### The Problem

Using mutable objects captured by multiple fibers.

**Why this is bad:**
- Race conditions
- Non-deterministic bugs
- Data corruption

### Better Approach

```typescript
// ❌ Bad - Mutable state, race conditions
let counter = 0;

Effect.all([
  Effect.sync(() => { counter++; }),
  Effect.sync(() => { counter++; }),
  Effect.sync(() => { counter++; })
]);

// ✅ Good - Use Ref for safe concurrent state
Effect.gen(function* () {
  const counter = yield* Ref.make(0);
  
  yield* Effect.all([
    Ref.update(counter, n => n + 1),
    Ref.update(counter, n => n + 1),
    Ref.update(counter, n => n + 1)
  ]);
  
  const final = yield* Ref.get(counter);
  // Guaranteed to be 3
});

// For more complex state
Effect.gen(function* () {
  const state = yield* Ref.make({ count: 0, items: [] });
  
  yield* Ref.update(state, s => ({
    count: s.count + 1,
    items: [...s.items, newItem]
  }));
});
```

---

## 10. Timeouts Without Cancellation Awareness

**Rule ID**: `timeouts-without-cancellation-awareness`  
**Severity**: Medium  
**Category**: concurrency  
**Fix ID**: `ensure-cancellation-awareness`

### The Problem

Timeouts applied but inner effects ignore interruption.

**Why this is bad:**
- Work continues after timeout
- Resources leak
- Unexpected behavior

### Better Approach

```typescript
// ❌ Bad - Work continues after timeout
Effect.timeout(
  Effect.promise(() => longRunningPromise()),
  Duration.seconds(5)
);

// ✅ Good - Interruption-aware
Effect.gen(function* () {
  const result = yield* Effect.tryPromise({
    try: (signal) => fetch(url, { signal }),
    catch: (error) => new FetchError({ error })
  }).pipe(
    Effect.timeout(Duration.seconds(5))
  );
});

// ✅ Better - Explicit cancellation handling
const interruptibleWork = Effect.gen(function* () {
  yield* Effect.checkInterruptible((isInterruptible) =>
    isInterruptible
      ? Effect.log("Work is interruptible")
      : Effect.log("Work is uninterruptible")
  );
  
  // Do work that respects interruption
  yield* Effect.forEach(
    chunks,
    processChunk,
    { concurrency: 10 }
  );
});

Effect.timeout(interruptibleWork, Duration.seconds(30));
```

---

## Detection Strategy

### AST Patterns to Match

1. **Unbounded Effect.all**: `Effect.all(array.map(...))` without concurrency option
2. **Fire-and-forget**: `Effect.fork(...)` not assigned or joined
3. **Loop forks**: `Effect.fork` inside for/while loops
4. **Bare race**: `Effect.race` without ensuring cleanup
5. **Blocking sync**: Sync filesystem/crypto calls inside Effect
6. **Promise.all**: `Promise.all` inside Effect.gen
7. **Unused fibers**: Forked fibers never joined or awaited
8. **Parallel retries**: `Effect.retry` on parallel effects
9. **Mutable captures**: `let`/`var` modified in concurrent effects
10. **Timeout patterns**: `Effect.timeout` without interruption handling

### Heuristics

- Detect `Effect.all` without `{ concurrency: ... }` option
- Find `Effect.fork` calls where result is not used
- Identify loops containing `Effect.fork`
- Locate `Effect.race` without `Effect.ensuring`
- Find blocking Node.js APIs inside Effect contexts
- Detect `Promise.all` inside `Effect.gen`
- Track fiber variables that are never joined
- Identify retry schedules on concurrent operations
- Find mutable variables accessed by multiple effects
- Detect timeout usage without cancellation signals

---

## Implementation Status

✅ **Fully Integrated** - All 10 concurrency anti-patterns are now part of the Effect Patterns analysis system:

- Type definitions updated with rule IDs and fix IDs
- Fix definitions added for all 10 patterns
- Rule definitions with comprehensive messages
- Test coverage complete (113 expect calls)
- Available via MCP server for code analysis

## Summary Statistics

- **Total Anti-Patterns**: Now 58 (48 previous + 10 concurrency)
- **Total Fix Definitions**: Now 50 (40 previous + 10 concurrency)
- **Severity Distribution**:
  - High: 23 rules (7 new concurrency)
  - Medium: 33 rules (3 new concurrency)
  - Low: 2 rules

## Educational Value

These rules have **extremely high educational value** because they:

1. **Prevent production failures** - Catch issues that work in tests but fail in production
2. **Teach concurrency patterns** - Promote proper fiber management and supervision
3. **Improve reliability** - Prevent resource leaks and silent failures
4. **Enable safe parallelism** - Guide developers toward controlled concurrency

## Ideal Use Cases

- **Pro warnings** - High-impact issues deserve immediate attention
- **Production readiness** - Critical for production deployments
- **Code review** - Essential concurrency safety checks
- **Team education** - Learn Effect concurrency best practices

These concurrency anti-patterns are **high-impact** rules that help teams avoid dangerous concurrency bugs that often only manifest in production environments.
