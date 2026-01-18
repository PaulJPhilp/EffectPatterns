# Pattern Guidance: Supervise resource cleanup with Effect.scoped

## Finding
**Resource Management Anti-Pattern:** Acquiring resources without ensuring they are released in all code paths (success, failure, cancellation).

## What this means (plain language)
When you use `Effect.acquire` (or similar resource APIs), you must pair it with Effect's supervision model. If the handler is missing or incomplete, resources leak: database connections stay open, file handles aren't closed, and your app gradually becomes resource-starved. Effect's `scoped` and `Layer` APIs guarantee cleanup—but only if you use them correctly.

---

## Use when
Use Effect.scoped or Layer when:
- the resource has a finite cost (connection, file, lock, semaphore)
- cleanup is non-trivial (can't rely on garbage collection)
- you need guaranteed cleanup on success, failure, or cancellation

---

## Avoid when
Avoid acquire without proper handling when:
- you forget to use `Effect.scoped` or `Effect.withLayer` (most common mistake)
- you create a resource but don't bind it to Effect's lifecycle
- the resource is "fire and forget" with no guaranteed cleanup path

---

## Decision rule
For every `acquire`, ask:
- "What happens to this resource if the code fails?" → Must release on failure
- "What happens if the code is cancelled?" → Must release on cancellation
- "Is cleanup guaranteed by Effect's scope?" → If no, it's leaking

**Simplifier**
Acquire without scoped = resource lives forever (or until GC, which is too late).

---

## Goal
Keep work supervised, bounded, and resource-efficient.

---

## Architecture impact
**Domain impact**
- Resource leaks accumulate over time; app becomes slower and slower.
- Debugging is hard: you see memory growth but no obvious code path causing it.
- Refactoring is risky: moving cleanup code inside/outside a scope changes semantics.

**Boundary/runtime impact**
- Database connections exhaust gradually (new requests fail with "too many connections").
- File descriptors leak; `ulimit` gets hit.
- Process restarts become frequent (only reliable way to free resources).
- Observability: connection/file-handle counts grow; no way to detect the leak source.

---

## Implementation prompt
"Implement the Fix Plan for this finding: wrap the resource in Effect.scoped or pass it to Effect.withLayer. Ensure cleanup runs on success, failure, and cancellation."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the acquire call (e.g., `db.connect()`).
2. Locate where the resource is used and where it should be cleaned up.
3. Wrap the entire use in `Effect.scoped` or use `Effect.withLayer` (Effect's API for supervised resource binding).
4. Test: intentionally fail and cancel to verify cleanup is called.

**What will change (summary)**
- Resource lifecycle is bound to Effect's supervision (tied to fiber lifetime).
- Code becomes more nested (resource inside scoped block), but cleanup is guaranteed.
- No more manual `release()` calls at the boundary.

**Risks / watch-outs**
- If you forget to use scoped/withLayer, the problem persists (needs code review).
- Long-lived resources may stay alive longer than you want if the scoped block never completes.
- Some legacy APIs don't compose well with Effect.scoped (may need wrapper).

---

## Example
**Before:**
```typescript
export const getUserWithPosts = (userId: string): Effect<User & { posts: Post[] }, Error> =>
  Effect.gen(function* () {
    const conn = yield* db.connect();  // Acquire connection

    const user = yield* Effect.promise(() =>
      conn.query("SELECT * FROM users WHERE id = ?", [userId])
    );
    const posts = yield* Effect.promise(() =>
      conn.query("SELECT * FROM posts WHERE user_id = ?", [userId])
    );

    // If error happens here: conn is never released!
    // If cancellation happens: conn is never released!
    return { ...user, posts };
  });
```

**After:**
```typescript
export const getUserWithPosts = (userId: string): Effect<User & { posts: Post[] }, Error> =>
  Effect.scoped(
    Effect.gen(function* () {
      const conn = yield* db.connect();  // Acquire connection (scoped)

      const user = yield* Effect.promise(() =>
        conn.query("SELECT * FROM users WHERE id = ?", [userId])
      );
      const posts = yield* Effect.promise(() =>
        conn.query("SELECT * FROM posts WHERE user_id = ?", [userId])
      );

      // Now: on success, failure, or cancellation, connection is automatically released
      return { ...user, posts };
    })
  );

// Or use Layer + withLayer for dependency injection style:
const DbLayer = Layer.scoped(DbService)(
  Effect.gen(function* () {
    const conn = yield* db.connect();  // Supervised
    return {
      query: (...args) =>
        Effect.promise(() => conn.query(...args))
    };
  })
);
```

---

## Related patterns
See also:
- **unbounded-parallelism** — combining scoped work with unlimited concurrency still risks resource exhaustion
- **async/await** — if using async/await for cleanup, switch to Effect.scoped for guaranteed semantics
