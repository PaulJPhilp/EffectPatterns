# error-handling-resilience Patterns

## Scheduling Pattern 2: Implement Exponential Backoff for Retries

Use exponential backoff with jitter for retries to prevent overwhelming failing services and improve success likelihood through smart timing.

### Example

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

---

