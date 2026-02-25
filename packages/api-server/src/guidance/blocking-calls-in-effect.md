# Pattern Guidance: Offload blocking calls from Effect fiber

**Goal: Keep the event loop responsive and fibers non-blocking.**

## Use when
- You must perform a synchronous, blocking operation (e.g., expensive CPU computation, synchronous file I/O).
- You have measured that the operation truly blocks and impacts throughput.
- You are certain the operation cannot be made async.

## Avoid when
- You are in the event loop thread and calling blocking I/O or CPU-heavy work directly.
- You are inside `Effect.gen` without wrapping the blocking operation in `Effect.blocking` or `Effect.offload`.
- The "blocking" operation is just a regular function call—use `Effect.sync` instead.

## Decision rule
If code running inside an Effect fiber will block waiting for I/O, CPU work, or locks:
- Wrap it in `Effect.blocking` (use the Effect thread pool).
- Or use `Effect.offload` (explicit separate thread pool).
- Or move the work outside the fiber entirely (precompute, cache, or defer).

**Simplifier**
Blocking call in fiber = event loop hangs. Offload = work moves to thread pool.

## Goal
Keep the event loop responsive and fibers non-blocking.

---

## Architecture impact
**Domain impact**
- Event loop blocked = all other effects stall (no fairness, no progress).
- Throughput collapses: one blocking call stops the whole system.
- Scalability hits a wall: 100 concurrent operations hang if any one blocks.

**Boundary/runtime impact**
- Observability: you see "slow" when it's really "blocked".
- Timeouts fail: interruption can't cancel a blocking operation (must finish).
- Resource starvation: thread pools fill up, new work can't start.

---

## Implementation prompt
"Implement the Fix Plan for this finding: Identify the blocking operation. Wrap it in `Effect.blocking(Effect.sync(() => blockingFn()))` to move it to the Effect thread pool. Measure throughput after refactoring."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the blocking call (synchronous I/O, CPU work, blocking locks).
2. Wrap with `Effect.blocking` or `Effect.offload`.
3. Test: verify throughput improves and event loop stays responsive.
4. Consider: can you eliminate the blocking altogether (async version, precompute, cache)?

**What will change (summary)**
- Blocking work moves off the event loop to a thread pool.
- Event loop stays responsive.
- Other concurrent effects make progress.

**Risks / watch-outs**
- Thread pool exhaustion: too many blocking calls still starve the pool (monitor queue depth).
- Shared state: blocking operations accessing mutable data need synchronization.
- Exceptions in blocking code: handle them properly or they crash the fiber.

---

## Example
**Before:**
```typescript
export const computeChecksum = (largeBuffer: Buffer): Effect<string, Error> =>
  Effect.gen(function* () {
    // ❌ This blocks the event loop for 1+ seconds
    const checksum = crypto.createHash('sha256').update(largeBuffer).digest('hex');
    return checksum;
  });

// If you call this with 100 concurrent requests, the event loop stalls.
```

**After:**
```typescript
export const computeChecksum = (largeBuffer: Buffer): Effect<string, Error> =>
  Effect.blocking(
    Effect.sync(() => {
      // Now runs on a thread pool, not the event loop
      return crypto.createHash('sha256').update(largeBuffer).digest('hex');
    })
  );

// 100 concurrent requests now run in parallel on the thread pool.
```

---

## Related patterns
See also:
- **fire-and-forget-fork** — forked fibers can block too; supervise them
- **retry-backoff-timeouts** — timeouts don't interrupt blocking calls; must use cancellation tokens
