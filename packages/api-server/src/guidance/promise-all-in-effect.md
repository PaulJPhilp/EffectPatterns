# Pattern Guidance: Use Effect.all instead of Promise.all in Effect flows

## Finding
**Concurrency Anti-Pattern:** `Promise.all([...])` used inside Effect code instead of Effect-native concurrency.

## What this means (plain language)
`Promise.all` is untyped and creates unbounded parallelism outside Effect's supervision. You lose:
- Structured error handling (first error doesn't cancel other promises)
- Concurrency limits (all promises run in parallel, consuming resources)
- Interruption semantics (if the parent Effect is cancelled, promises may still run)
- Type safety (errors are `unknown`)

---

## Use when
**Use `Promise.all` only:**
- at a thin HTTP/bootstrap boundary for non-Effect code
- when you're deliberately *not* using Effect yet (rare)

**Rule of thumb:** If you're in an Effect context, use `Effect.all`, `Effect.allWith`, or `Effect.forEach`.

---

## Avoid when
Avoid `Promise.all` when:
- you're inside `Effect.gen` / `Effect.flatMap` / any Effect pipeline
- you need controlled concurrency (limited parallelism)
- you want structured error semantics (one failure should stop others)
- you need to respect cancellation (parent Effect interruption)

---

## Decision rule (reduces ambiguity)
**Decision rule:**
- **`Promise.all([...])` in Effect** → untyped, unbounded parallelism, can't be interrupted
- **`Effect.all([...])` in Effect** → typed, structured, respects concurrency limits and cancellation

**Simplifier:**
- "`Promise.all` = "run everything in parallel, catch errors later"
- "`Effect.all` = "run everything in parallel with structure, respect limits and cancellation"

---

## Architecture impact
**Domain impact**
- Error handling is implicit; you can't discriminate which promise failed without additional try/catch logic
- Caller has no visibility into concurrency behavior (are all promises running? one at a time?)

**Boundary/runtime impact**
- Resource exhaustion: unbounded parallel promises can crash the process (no concurrency limit)
- Cancellation doesn't propagate: if the parent Effect is interrupted, child promises still run
- Observability: promise-level concurrency is invisible to Effect-centric tracing

---

## Implementation prompt (for your workflow)
Use this *verbatim* as the follow-up instruction to a coding assistant:

**"Implement the Fix Plan for this finding: Replace `Promise.all([...])` with `Effect.all([...])` inside this Effect context. Update the input array to contain Effects (wrap Promise-returning functions with `Effect.tryPromise` if needed). Add a concurrency limit using `Effect.allWith({ concurrency: n })` if appropriate. Update error handling to use `catchTag` or `match` instead of relying on Promise rejection."**

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the `Promise.all([...])` call and its inputs.
2. If inputs are promises, wrap each with `Effect.tryPromise` to convert to Effects.
3. Replace `Promise.all([...])` with `Effect.all([...])`.
4. If needed, add a concurrency limit: `Effect.allWith({ concurrency: 5 })` instead of unbounded parallelism.
5. Update error handling from `.catch(...)` to `Effect.match` or `Effect.catchAll`.
6. Update the function signature to reflect the Effect context.

**What will change (summary)**
- `Promise.all([...])` becomes `Effect.all([...])`.
- `.catch(...)` becomes `Effect.catchAll` or `Effect.match`.
- Concurrency can now be controlled: `Effect.allWith({ concurrency: n })`.
- Errors are typed and structured.

**Risks / watch-outs**
- If you have many promises, decide on a reasonable concurrency limit (e.g., 5–10 for HTTP calls) to avoid resource exhaustion.
- Be careful when converting promise-based code: ensure all errors are properly mapped to domain error types.
- If some promises are fire-and-forget, use `Effect.fork` or `Effect.forkDaemon` instead (but prefer `Effect.forEach` with concurrency limits for most cases).

---

## Example
**Before:**
```typescript
export const fetchUsers = (userIds: string[]): Promise<User[]> => {
  const promises = userIds.map((id) =>
    fetch(`/api/users/${id}`).then((res) => res.json())
  );
  return Promise.all(promises);
};
```

**After:**
```typescript
export const fetchUsers = (userIds: string[]): Effect<User[], Error> => {
  const effects = userIds.map((id) =>
    Effect.tryPromise(() =>
      fetch(`/api/users/${id}`).then((res) => res.json() as Promise<User>)
    )
  );
  // Limit concurrency to 5 parallel requests
  return Effect.all(effects, { concurrency: 5 });
};
```

Or, using `Effect.forEach` for even cleaner code:

```typescript
export const fetchUsers = (userIds: string[]): Effect<User[], Error> =>
  Effect.forEach(
    userIds,
    (id) =>
      Effect.tryPromise(() =>
        fetch(`/api/users/${id}`).then((res) => res.json() as Promise<User>)
      ),
    { concurrency: 5 }
  );
```

---

## Related patterns
See also:
- **unbounded-parallelism** — controlling concurrency limits prevents resource exhaustion
- **throw-in-effect-code** — errors from concurrent operations should be typed and tagged
