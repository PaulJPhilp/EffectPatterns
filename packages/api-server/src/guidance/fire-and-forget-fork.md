# Pattern Guidance: Supervise forked fibers with join or fork strategy

**Goal: Keep forked work supervised, observable, and recoverable.**

## Use when
- You intentionally fork a fiber for independent work and don't need its result immediately.
- You implement a structured fork/join pattern with explicit lifecycle management.
- You attach a callback to observe the fiber's outcome.

## Avoid when
- You fork a fiber and never join or observe it (fire-and-forget).
- The forked fiber can fail and you ignore that failure.
- You fork without a strategy for how long the fiber should live.

## Decision rule
For every `fork`, ask:
- "Does someone need to know this fiber's result?" → Use `fiber.join()`.
- "Should this fiber be cancelled if its parent times out?" → Use a scoped fork.
- "Is this truly independent?" → Add a callback with `fiber.addObserver()` or equivalent.

**Simplifier**
Fork without join = silent failure.
Fork + join = managed work.

## Goal
Keep forked work supervised, observable, and recoverable.

---

## Architecture impact
**Domain impact**
- Silent failures: forked fiber crashes and no one knows.
- Memory leaks: fibers accumulate if never joined (never released).
- Lost errors: exceptions disappear into the void.

**Boundary/runtime impact**
- Observability: unjoined fibers don't appear in tracing/logging.
- Cleanup: resources from forked fibers leak if fiber fails and is never awaited.
- Cascading failures: parent shuts down gracefully, but children keep running.
- Debugging nightmare: "Why is my service still running after it should have stopped?"

---

## Implementation prompt
"Implement the Fix Plan for this finding: Add `fiber.join()` to wait for the forked fiber, or attach an observer callback. Ensure failures are logged and handled. Consider scoping the fork to limit its lifetime."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the fork call.
2. Determine if you need the result: `fiber.join()` to wait.
3. If fire-and-forget is truly intended: attach an observer (`fiber.addObserver()` or `fiber.fork()` inside `Effect.supervised`).
4. Log or handle any errors from the forked work.
5. Test: ensure forked work is visible in logs/tracing.

**What will change (summary)**
- Forked fibers are now observed or joined.
- Failures are tracked and logged.
- Resource cleanup is guaranteed.

**Risks / watch-outs**
- Joining blocks the parent: if you `fiber.join()`, parent waits for child.
- Observer callbacks don't block but must be fast (don't block them either).
- Scoped fibers are automatically cancelled when scope exits; ensure that's intentional.

---

## Example
**Before:**
```typescript
export const processUserEventsAsync = (userId: string): Effect<void, Error> =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      Effect.gen(function* () {
        // Heavy processing, might fail
        const result = yield* analyzeUserBehavior(userId);
        yield* sendNotification(result);
      })
    );

    // ❌ Fire-and-forget: if the fiber fails, no one knows
    return;
  });
```

**After:**
```typescript
export const processUserEventsAsync = (userId: string): Effect<void, Error> =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      Effect.gen(function* () {
        const result = yield* analyzeUserBehavior(userId);
        yield* sendNotification(result);
      }).pipe(
        Effect.catchAll((error) =>
          // Ensure failures are logged
          Effect.logError(`User event processing failed for ${userId}: ${error}`)
        )
      )
    );

    // Option 1: Wait for the result (blocks parent)
    yield* fiber.join();

    // Option 2: Don't wait, but add an observer
    // yield* fiber.addObserver((exit) => {
    //   if (Exit.isFailure(exit)) {
    //     console.error("Forked work failed", exit);
    //   }
    // });

    return;
  });

// Now: failures are logged, parent can wait if needed, resource cleanup is guaranteed
```

---

## Related patterns
See also:
- **leaking-scopes** — similar issue but with resources instead of fibers
- **unbounded-parallelism** — forking too many fibers without concurrency limits
- **hidden-effect-execution** — forking at module scope has the same problems
