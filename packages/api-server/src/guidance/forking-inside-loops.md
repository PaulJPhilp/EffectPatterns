# Pattern Guidance: Use Effect.forEach instead of forking inside loops

**Goal: Bounded concurrency with structured control.**

## Use when
- You need to process a list of items concurrently.
- You want to control concurrency (e.g., max 10 parallel operations).
- You're working with dynamic lists.

## Avoid when
- You manually fork inside a loop without concurrency limits.
- You fork for each item in a large list and expect the system to handle 10,000 concurrent fibers.
- You don't track or join the fibers.

## Decision rule
If you're looping and forking:
- Use `Effect.forEach` with a `concurrencyLimit`.
- Or use `Effect.all` with `{ concurrencyLimit: N }`.
- Never fork without bounds.

**Simplifier**
Loop + fork = unbounded concurrency = crash.
Loop + forEach = bounded concurrency = safe.

## Goal
Bounded concurrency with structured control.

---

## Architecture impact
**Domain impact**
- Unbounded fiber creation: 10,000 items = 10,000 concurrent fibers = OOM.
- Resource exhaustion: database pool, thread pool, memory all saturated.
- System becomes unresponsive: GC pauses, CPU spikes.

**Boundary/runtime impact**
- Observability fails: thousands of fibers can't be traced.
- Cleanup is impossible: cancelling the parent doesn't clean up child fibers efficiently.
- Retries become disasters: retry storms can multiply fibers exponentially.

---

## Implementation prompt
"Implement the Fix Plan for this finding: Replace the loop + fork pattern with `Effect.forEach` and add a `concurrencyLimit`. Test with a large list (1000+ items) to verify throughput and memory usage."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the loop + fork pattern.
2. Replace with `Effect.forEach(items, handler, { concurrencyLimit: N })`.
3. Choose limit based on resource constraints (database pool, API rate limit, memory).
4. Test: verify memory usage is bounded and throughput is acceptable.

**What will change (summary)**
- Work is queued and processed in batches.
- Memory usage is predictable.
- System stays responsive.

**Risks / watch-outs**
- Concurrency limit that's too low reduces throughput.
- Concurrency limit that's too high brings back the problem.
- Measure and tune based on actual resource availability.

---

## Example
**Before:**
```typescript
export const processUserIds = (userIds: readonly string[]): Effect<void, Error> =>
  Effect.gen(function* () {
    // ❌ 10,000 userIds = 10,000 concurrent fibers = crash
    for (const userId of userIds) {
      yield* Effect.fork(
        Effect.gen(function* () {
          const user = yield* fetchUser(userId);
          yield* saveToCache(user);
        })
      );
    }
  });
```

**After:**
```typescript
export const processUserIds = (userIds: readonly string[]): Effect<void, Error> =>
  Effect.forEach(
    userIds,
    (userId) =>
      Effect.gen(function* () {
        const user = yield* fetchUser(userId);
        yield* saveToCache(user);
      }),
    { concurrencyLimit: 20 }  // Max 20 concurrent operations
  );

// Now: processes 10,000 items with max 20 concurrent, bounded memory
```

---

## Related patterns
See also:
- **unbounded-parallelism** — Effect.all without concurrencyLimit has the same problem
- **fire-and-forget-fork** — forked fibers must be supervised even with loops
