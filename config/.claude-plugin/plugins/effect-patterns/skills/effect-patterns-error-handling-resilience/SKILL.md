---
name: effect-patterns-error-handling-resilience
description: Effect-TS patterns for Error Handling Resilience. Use when working with error handling resilience in Effect-TS applications.
---
# Effect-TS Patterns: Error Handling Resilience
This skill provides 1 curated Effect-TS patterns for error handling resilience.
Use this skill when working on tasks related to:
- error handling resilience
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟡 Intermediate Patterns

### Scheduling Pattern 2: Implement Exponential Backoff for Retries

**Rule:** Use exponential backoff with jitter for retries to prevent overwhelming failing services and improve success likelihood through smart timing.

**Good Example:**

This example demonstrates exponential backoff with jitter for retrying a flaky API call.

```typescript
import { Effect, Schedule } from "effect";

interface RetryStats {
  readonly attempt: number;
  readonly delay: number;
  readonly lastError?: Error;
}

// Simulate flaky API that fails first 3 times, succeeds on 4th
let attemptCount = 0;

const flakyApiCall = (): Effect.Effect<{ status: string }> =>
  Effect.gen(function* () {
    attemptCount++;
    yield* Effect.log(`[API] Attempt ${attemptCount}`);

    if (attemptCount < 4) {
      yield* Effect.fail(new Error("Service temporarily unavailable (503)"));
    }

    return { status: "ok" };
  });

// Calculate exponential backoff with jitter
interface BackoffConfig {
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly maxRetries: number;
}

const exponentialBackoffWithJitter = (config: BackoffConfig) => {
  let attempt = 0;

  // Calculate delay for this attempt
  const calculateDelay = (): number => {
    const exponential = config.baseDelayMs * Math.pow(2, attempt);
    const withJitter = exponential * (0.5 + Math.random() * 0.5); // ±50% jitter
    const capped = Math.min(withJitter, config.maxDelayMs);

    yield* Effect.log(
      `[BACKOFF] Attempt ${attempt + 1}: ${Math.round(capped)}ms delay`
    );

    return Math.round(capped);
  };

  return Effect.gen(function* () {
    const effect = flakyApiCall();

    let lastError: Error | undefined;

    for (attempt = 0; attempt < config.maxRetries; attempt++) {
      const result = yield* effect.pipe(Effect.either);

      if (result._tag === "Right") {
        yield* Effect.log(`[SUCCESS] Succeeded on attempt ${attempt + 1}`);
        return result.right;
      }

      lastError = result.left;

      if (attempt < config.maxRetries - 1) {
        const delay = calculateDelay();
        yield* Effect.sleep(`${delay} millis`);
      }
    }

    yield* Effect.log(
      `[FAILURE] All ${config.maxRetries} attempts exhausted`
    );
    yield* Effect.fail(lastError);
  });
};

// Run with exponential backoff
const program = exponentialBackoffWithJitter({
  baseDelayMs: 100,
  maxDelayMs: 5000,
  maxRetries: 5,
});

console.log(
  `\n[START] Retrying flaky API with exponential backoff\n`
);

Effect.runPromise(program).then(
  (result) => console.log(`\n[RESULT] ${JSON.stringify(result)}\n`),
  (error) => console.error(`\n[ERROR] ${error.message}\n`)
);
```

Output demonstrates increasing delays with jitter:
```
[START] Retrying flaky API with exponential backoff

[API] Attempt 1
[BACKOFF] Attempt 1: 78ms delay
[API] Attempt 2
[BACKOFF] Attempt 2: 192ms delay
[API] Attempt 3
[BACKOFF] Attempt 3: 356ms delay
[API] Attempt 4
[SUCCESS] Succeeded on attempt 4

[RESULT] {"status":"ok"}
```

---

**Rationale:**

When retrying failed operations, use exponential backoff with jitter: delay doubles on each retry (with random jitter), up to a maximum. This prevents:

- **Thundering herd**: All clients retrying simultaneously
- **Cascade failures**: Overwhelming a recovering service
- **Resource exhaustion**: Too many queued retry attempts

Formula: `delay = min(maxDelay, baseDelay * 2^attempt + random_jitter)`

---


Naive retry strategies fail under load:

**Immediate retry**:
- All failures retry at once
- Fails service under load (recovery takes longer)
- Leads to cascade failure

**Fixed backoff** (e.g., 1 second always):
- No pressure reduction during recovery
- Multiple clients cause thundering herd
- Predictable = synchronized retries

**Exponential backoff**:
- Gives failing service time to recover
- Each retry waits progressively longer
- Without jitter, synchronized retries still hammer service

**Exponential backoff + jitter**:
- Spreads retry attempts over time
- Failures de-correlate across clients
- Service recovery time properly utilized
- Success likelihood increases with each retry

Real-world example: 100 clients fail simultaneously
- **Immediate retry**: 100 requests in milliseconds → failure
- **Fixed backoff**: 100 requests at exactly 1s → failure
- **Exponential**: 100 requests at 100ms, 200ms, 400ms, 800ms → recovery → success

---

---


