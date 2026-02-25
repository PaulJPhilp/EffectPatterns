# Pattern Guidance: Respect connection pool limits and avoid saturation

## Finding
**Resource Awareness Anti-Pattern:** Setting concurrency limits, timeouts, or connection parameters without understanding the shared resource pools.

## What this means (plain language)
Databases, HTTP clients, and caches all use connection pools with fixed sizes (e.g., 10 connections). If you set `concurrencyLimit: 50` but the pool only has 10 connections, 40 requests will queue or timeout. Similarly, if your timeouts don't match the pool-drain time, you'll see spikes of "timeout" errors that are really "queue backed up." Developers must understand the pools they're using.

---

## Use when
Use pool awareness when:
- using databases, caches, or external APIs (they all have pools)
- tuning concurrency limits (must not exceed pool size)
- investigating mysterious timeout spikes (might be queue depth)
- debugging "connection refused" or "too many connections" errors

---

## Avoid when
Avoid guessing pool behavior when:
- you haven't checked the driver's documentation (connection pool size is configurable)
- you assume all services have the same pool size (they don't)
- you set concurrency limits without measuring actual resource usage
- you rely on default timeouts (they're usually wrong for your workload)

---

## Decision rule
For each external resource (database, cache, service), ask:
- "What's the pool size?" (Check docs, config, or observe metrics)
- "What's the concurrency limit I set?" (Effect.all concurrencyLimit, HTTP client max connections)
- "Are they aligned?" → If concurrencyLimit > poolSize, requests will queue

**Simplifier**
Concurrency limit > pool size = queued requests look like timeouts. Tune them together.

---

## Goal
Keep work supervised, bounded, and resource-efficient.

---

## Architecture impact
**Domain impact**
- Mystery timeouts: requests fail not because the service is slow, but because the queue is full.
- Load testing becomes unreliable: scale tests with unaligned pools show artifacts (sharp cliffs).
- Refactoring is risky: changing pool size or concurrency limit can silently cause failures.

**Boundary/runtime impact**
- Observability: you see timeout errors but can't trace them to pool saturation (need queue depth metrics).
- Cascading failures: if pool is saturated, new requests immediately timeout (no recovery).
- Retry storms: timeouts trigger retries, which fill the queue more (bad feedback loop).
- Cost: pool size directly affects instance costs (larger pools = more memory, more connections).

---

## Implementation prompt
"Implement the Fix Plan for this finding: check the pool size for each resource you use. Set concurrency limits to respect the pool (or increase the pool size if needed). Add observability for queue depth and pool saturation."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify each external resource: database, cache, HTTP client, queue, etc.
2. Find the pool size (check driver config, docs, or environment variables).
3. Measure current concurrency usage (max parallel requests you expect).
4. Align: `concurrencyLimit ≤ poolSize` (or increase poolSize in config).
5. Add observability: track queue depth, pool saturation, timeout count.

**What will change (summary)**
- Concurrency limits now respect actual resource constraints.
- Timeout errors become less frequent (were really queue saturation before).
- Performance becomes predictable: no more mysterious slow-down after scale.

**Risks / watch-outs**
- Pool size changes require deployment (many drivers don't reload config at runtime).
- If pool is too small, throughput drops (increase pool size, not just concurrency limit).
- Different resources have different pools (set limits per-resource, not globally).
- Monitoring pool saturation requires instrumentation (driver-dependent).

---

## Example
**Before:**
```typescript
// Database has default pool size: 5 connections
const db = new Client({
  // pool size defaults to 5
});

export const fetchUsers = (userIds: readonly string[]): Effect<User[], Error> =>
  Effect.all(
    userIds.map((id) =>
      Effect.promise(() => db.query("SELECT * FROM users WHERE id = ?", [id]))
    ),
    { concurrencyLimit: 50 }  // Oops: 50 concurrent requests, but only 5 pool connections!
  );

// Result: 45 requests queue, wait, timeout after 30s
// Looks like the database is slow, but it's actually the queue backing up
```

**After:**
```typescript
// Database configured with adequate pool
const db = new Client({
  max: 20,  // Increase pool to 20 connections
});

export const fetchUsers = (userIds: readonly string[]): Effect<User[], Error> =>
  Effect.all(
    userIds.map((id) =>
      Effect.promise(() => db.query("SELECT * FROM users WHERE id = ?", [id]))
    ),
    { concurrencyLimit: 15 }  // Align with pool size (leave headroom for other requests)
  ).pipe(
    Effect.timeout(5000),  // Query SLA: 5s (short, because pool is not overloaded)
    Effect.retry(
      Schedule.exponential(100).pipe(
        Schedule.compose(Schedule.jittered()),
        Schedule.whileInput((n) => n < 2)
      )
    )
  );

// Result: concurrency respects pool, timeouts are real timeouts, not queue saturation
```

**Observability:**
```typescript
// Track pool saturation
const poolMetrics = {
  get poolSize() { return db.pool.length; },
  get availableConnections() { return db.pool.idleCount; },
  get queueDepth() { return db.pool.waitingCount; },
};

// Alert on saturation
if (poolMetrics.queueDepth > poolMetrics.poolSize * 2) {
  console.warn("Pool saturation: consider increasing pool size or reducing concurrency");
}
```

---

## Related patterns
See also:
- **unbounded-parallelism** — concurrency limits prevent pool saturation
- **retry-backoff-timeouts** — timeouts and retries must account for queue depth
- **leaking-scopes** — resource leaks reduce available pool connections
