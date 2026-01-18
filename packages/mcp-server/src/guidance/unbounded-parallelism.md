# Pattern Guidance: Bound concurrent work with concurrencyLimit

## Finding
**Concurrency Anti-Pattern:** Spawning unlimited parallel work without controlling concurrency limits.

## What this means (plain language)
When you use `Effect.all` or `Effect.race` without a `concurrencyLimit`, you can accidentally spawn hundreds (or thousands) of concurrent fibers, exhausting memory and database connections. Effect's structured concurrency is powerful, but unbounded means your app becomes a resource-eating machine—especially with large dynamic lists.

---

## Use when
Use unlimited concurrency only when:
- you know the work is bounded (e.g., 3 hardcoded `Effect.all` calls)
- the cost per operation is trivial (in-memory computation)
- you've load-tested and confirmed resource usage is safe

---

## Avoid when
Avoid unbounded concurrency when:
- parallelizing over dynamic, user-provided lists (N could be 10 or 10,000)
- making external API calls (each reserves a connection pool slot)
- touching shared resources (database, cache, file system)
- you're uncertain about the upper bound of work

---

## Decision rule
Ask: "What's the worst-case number of concurrent operations?"
- If known and small (≤10): unbounded is probably fine.
- If unknown or large: add `concurrencyLimit` or use batching.
- If external API or resource-bound: always limit.

**Simplifier**
Unbounded = every request can spawn unlimited work. Add a limit to prevent cost blowups.

---

## Goal
Keep work supervised, bounded, and resource-efficient.

---

## Architecture impact
**Domain impact**
- Unbounded work can silently exhaust resources, causing cascading failures.
- Load testing becomes unreliable (results vary wildly based on input size).
- Refactoring is risky: adding a parallelization loop can blow up costs without review catching it.

**Boundary/runtime impact**
- Database connection pools get saturated; queries timeout or hang.
- Memory usage spikes unpredictably; GC pauses increase.
- Observability becomes noise: you see spikes but can't trace them to cause.
- Retry/backoff strategies fail (can't retry if resources are exhausted).

---

## Implementation prompt
"Implement the Fix Plan for this finding: add a concurrencyLimit to the Effect.all call. Choose a limit based on your resource constraints (database pool size, API rate limit). Test under peak load to validate."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the Effect.all/race call and measure its worst-case input size.
2. Choose a concurrencyLimit: typically 10–50 for external APIs, based on your pool size.
3. Update the call: `Effect.all(items, { concurrencyLimit: N })`.
4. Monitor in production: track queue depth and adjust limit if needed.

**What will change (summary)**
- Effect.all becomes bounded: work queues if concurrency is exceeded.
- Response latency may increase slightly for large inputs (batched sequential + parallel).
- Cost is capped; resource exhaustion becomes predictable.

**Risks / watch-outs**
- If limit is too low, throughput drops (adjust based on observed latency).
- Queue depth metrics need to be visible in observability (add dashboards).
- Some requests become slower; document this in API contracts or UI.

---

## Example
**Before:**
```typescript
export const fetchUserProfiles = (userIds: readonly string[]): Effect<User[], Error> =>
  Effect.all(
    userIds.map((id) => db.query("SELECT * FROM users WHERE id = ?", [id]))
  );

// If userIds has 10,000 items: 10,000 concurrent DB queries → pool saturated
```

**After:**
```typescript
export const fetchUserProfiles = (userIds: readonly string[]): Effect<User[], Error> =>
  Effect.all(
    userIds.map((id) => db.query("SELECT * FROM users WHERE id = ?", [id])),
    { concurrencyLimit: 20 }  // Respect DB pool size
  );

// Now: at most 20 concurrent queries; remainder queue
```

---

## Related patterns
See also:
- **leaking-scopes** — bounded work still leaks resources if scopes aren't supervised
- **async/await** — if you're using unbounded Promise.all(), switch to Effect.all with concurrencyLimit
