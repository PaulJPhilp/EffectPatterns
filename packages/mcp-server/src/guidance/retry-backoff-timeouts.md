# Pattern Guidance: Use Effect timeout and retry with backoff

## Finding
**Resilience Anti-Pattern:** Missing or misconfigured timeouts and retry logic for fallible operations.

## What this means (plain language)
When you call external services (APIs, databases, caches) without timeouts, a single hanging request can hang your entire app forever. Without retry, transient failures (network hiccup, momentary overload) become permanent failures. Effect makes both easy—but you must configure them per operation, not globally.

---

## Use when
Use timeouts and retry when:
- calling external APIs or databases (always)
- waiting for user I/O or long-running tasks (always)
- the operation is idempotent and transient failures are expected
- you can safely fail after N retries without data corruption

---

## Avoid when
Avoid retry when:
- the operation is non-idempotent (creating duplicate records, charging twice)
- you need **exponential backoff** but implement **constant backoff** (causes thundering herd)
- the failure is permanent (validation error, auth error) and retrying wastes time
- you have no jitter and all retries happen at the same time (synchronized)

---

## Decision rule
For each fallible operation, ask:
- "Is there a timeout?" → If no, add one (default to 30s for APIs, 5s for health checks)
- "Can it fail transiently?" → If yes, retry with exponential backoff + jitter
- "Is it idempotent?" → If no, don't retry (or wrap in idempotency keys)

**Simplifier**
No timeout = hangs forever. No retry = fails forever. Retry without backoff = thundering herd.

---

## Goal
Keep work supervised, bounded, and resilient to transient failure.

---

## Architecture impact
**Domain impact**
- Missing timeouts cause cascading failures (one slow service slows everything).
- Bad retry logic causes overload (all clients retry at once → stampede).
- Permanent errors (auth, validation) that retry waste time and resources.

**Boundary/runtime impact**
- Observability: you can't tell if a timeout is real or a slow network (needs instrumentation).
- Cascading failures: service A waits for B, B times out, A times out, C times out (domino effect).
- Distributed tracing becomes useless if retries aren't tracked separately.
- Cost: excess retries can cause exponential request volume (retry storms).

---

## Implementation prompt
"Implement the Fix Plan for this finding: add Effect.timeout to set a deadline. Use Effect.retry with an exponential backoff schedule and jitter. Test by simulating slow responses and transient failures."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the operation (API call, database query, etc.) and its SLA.
2. Choose a timeout: API calls (30s), DB queries (5s), health checks (3s). Adjust for your latency.
3. Wrap with `Effect.timeout(timeoutMs)`.
4. For retry: use `Effect.retry` with `Schedule.exponential` and jitter.
5. Test: inject delays and failures; verify timeout triggers and retries happen.

**What will change (summary)**
- Hanging requests become bounded (timeout kills them after deadline).
- Transient failures are automatically retried (exponential backoff prevents stampede).
- Observability improves: you see timeout counts, retry counts, and success rates.

**Risks / watch-outs**
- Timeouts that are too short cause false negatives (requests fail prematurely).
- Timeouts that are too long defeat the purpose (cascading failure still happens).
- Retry schedules that don't include jitter cause synchronized retries (thundering herd).
- Non-idempotent operations will have side effects on retry (careful with mutations).

---

## Example
**Before:**
```typescript
export const fetchUserData = (userId: string): Effect<User, Error> =>
  Effect.promise(() =>
    fetch(`/api/users/${userId}`).then(r => r.json())
    // No timeout: if service hangs, request hangs forever
    // No retry: if transient network hiccup, fails immediately
  );
```

**After:**
```typescript
import { Schedule } from "effect";

export const fetchUserData = (userId: string): Effect<User, Error> =>
  Effect.promise(() =>
    fetch(`/api/users/${userId}`).then(r => r.json())
  ).pipe(
    // Timeout after 30s (deadline for external API call)
    Effect.timeout(30_000),
    // Retry up to 3 times with exponential backoff (100ms, 200ms, 400ms) + jitter
    Effect.retry(
      Schedule.exponential(100).pipe(
        Schedule.compose(Schedule.jittered()),
        Schedule.whileInput((n) => n < 3)  // Max 3 retries
      )
    ),
    // Handle timeout as distinct error
    Effect.catchTag("TimeoutException", (e) =>
      Effect.fail(new Error(`Request timeout after 30s: ${userId}`))
    )
  );

// Now: hangs for at most 30s, retries on transient failures, fails predictably
```

---

## Related patterns
See also:
- **unbounded-parallelism** — timeouts work best with concurrency limits (prevent queue buildup)
- **leaking-scopes** — ensure cleanup runs even after timeout (don't leak resources)
- **connection pool awareness** — timeouts interact with pool exhaustion (tune together)
