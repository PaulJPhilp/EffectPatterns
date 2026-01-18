# Pattern Guidance: Use Effect.Ref for shared mutable state

**Goal: Safe, supervised concurrent access to shared state.**

## Use when
- Multiple concurrent operations need to read or update the same state.
- You need compare-and-swap (CAS) or atomic operations.
- You're building a stateful Effect service (cache, accumulator, counter).

## Avoid when
- You create mutable objects (let, var, class fields) and access them from multiple fibers.
- You rely on JavaScript closures for shared state without synchronization.
- The state doesn't change after initialization.

## Decision rule
If multiple fibers access the same mutable object:
- Use `Effect.Ref` for safe concurrent updates.
- Or use `Effect.Semaphore` for locking.
- Never use raw JavaScript mutable state.

**Simplifier**
Mutable object in Effect = race conditions.
Ref = safe concurrent access.

## Goal
Safe, supervised concurrent access to shared state.

---

## Architecture impact
**Domain impact**
- Race conditions: fiber A reads state, fiber B updates, fiber A uses stale state.
- Lost updates: fiber A and B both update, one update is lost.
- Unpredictable behavior: state corruption is intermittent and hard to reproduce.

**Boundary/runtime impact**
- Debugging nightmare: race conditions are non-deterministic.
- Testing is unreliable: tests pass locally but fail in CI under load.
- Production failures: the rarer the race, the worse it appears.
- Observability: no way to trace which fiber corrupted the state.

---

## Implementation prompt
"Implement the Fix Plan for this finding: Replace the mutable object with `Effect.Ref.make(initialValue)`. Use `ref.modify` or `ref.get`/`ref.set` for safe concurrent access. Test under concurrent load to verify no race conditions."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the mutable object shared across fibers.
2. Create an `Effect.Ref` to hold the state.
3. Replace direct mutations with `ref.modify()` or `ref.set()`.
4. If you need locking, use `Effect.Semaphore`.
5. Test: run concurrent operations and verify state consistency.

**What will change (summary)**
- State mutations are atomic (or CAS-based).
- No race conditions between concurrent fibers.
- State is fully supervised by Effect.

**Risks / watch-outs**
- `ref.modify` holds the lock for the entire closure; keep closures small.
- CAS loops may retry many times under high contention (add jitter/backoff if needed).
- If state is very large, copying on every update may be expensive.

---

## Example
**Before:**
```typescript
let counter = 0;  // ❌ Mutable shared state

const incrementCounter = (): Effect<number, never> =>
  Effect.sync(() => {
    counter++;  // Race condition: two fibers may both see counter=0, both set to 1
    return counter;
  });

// If you run 100 concurrent increments, counter might be 50 instead of 100
```

**After:**
```typescript
const CounterRef = Effect.Ref.make(0);

const incrementCounter = (): Effect<number, never> =>
  Effect.gen(function* () {
    const ref = yield* CounterRef;
    // Atomic update: only one fiber can modify at a time
    const newValue = yield* ref.modify((count) => [count + 1, count + 1]);
    return newValue;
  });

// Now: 100 concurrent increments = counter = 100 (guaranteed)
```

---

## Related patterns
See also:
- **shared-mutable-state-across-fibers** — similar issue with different patterns
- **fire-and-forget-fork** — unsupervised fibers accessing shared state are even worse
