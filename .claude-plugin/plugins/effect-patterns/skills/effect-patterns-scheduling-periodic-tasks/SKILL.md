---
name: effect-patterns-scheduling-periodic-tasks
description: Effect-TS patterns for Scheduling Periodic Tasks. Use when working with scheduling periodic tasks in Effect-TS applications.
---
# Effect-TS Patterns: Scheduling Periodic Tasks
This skill provides 3 curated Effect-TS patterns for scheduling periodic tasks.
Use this skill when working on tasks related to:
- scheduling periodic tasks
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟡 Intermediate Patterns

### Scheduling Pattern 4: Debounce and Throttle Execution

**Rule:** Use debounce to wait for silence before executing, and throttle to limit execution frequency, both critical for handling rapid events.

**Good Example:**

This example demonstrates debouncing and throttling for common scenarios.

```typescript
import { Effect, Schedule, Ref } from "effect";

interface SearchQuery {
  readonly query: string;
  readonly timestamp: Date;
}

// Simulate API search
const performSearch = (query: string): Effect.Effect<string[]> =>
  Effect.gen(function* () {
    yield* Effect.log(`[API] Searching for: "${query}"`);

    yield* Effect.sleep("100 millis"); // Simulate API delay

    return [
      `Result 1 for ${query}`,
      `Result 2 for ${query}`,
      `Result 3 for ${query}`,
    ];
  });

// Main: demonstrate debounce and throttle
const program = Effect.gen(function* () {
  console.log(`\n[DEBOUNCE/THROTTLE] Handling rapid events\n`);

  // Example 1: Debounce search input
  console.log(`[1] Debounced search (wait for silence):\n`);

  const searchQueries = ["h", "he", "hel", "hell", "hello"];

  const debouncedSearches = yield* Ref.make<Effect.Effect<string[]>[]>([]);

  for (const query of searchQueries) {
    yield* Effect.log(`[INPUT] User typed: "${query}"`);

    // In real app, this would be debounced
    yield* Effect.sleep("150 millis"); // User typing
  }

  // After user stops, execute search
  yield* Effect.log(`[DEBOUNCE] User silent for 200ms, executing search`);

  const searchResults = yield* performSearch("hello");

  yield* Effect.log(`[RESULTS] ${searchResults.length} results found\n`);

  // Example 2: Throttle scroll events
  console.log(`[2] Throttled scroll handler (max 10/sec):\n`);

  const scrollEventCount = yield* Ref.make(0);
  const updateCount = yield* Ref.make(0);

  // Simulate 100 rapid scroll events
  for (let i = 0; i < 100; i++) {
    yield* Ref.update(scrollEventCount, (c) => c + 1);

    // In real app, scroll handler would be throttled
    if (i % 10 === 0) {
      // Simulate throttled update (max 10 per second)
      yield* Ref.update(updateCount, (c) => c + 1);
    }
  }

  const events = yield* Ref.get(scrollEventCount);
  const updates = yield* Ref.get(updateCount);

  yield* Effect.log(
    `[THROTTLE] ${events} scroll events → ${updates} updates (${(updates / events * 100).toFixed(1)}% update rate)\n`
  );

  // Example 3: Deduplication
  console.log(`[3] Deduplicating rapid events:\n`);

  const userClicks = ["click", "click", "click", "dblclick", "click"];

  const lastClick = yield* Ref.make<string | null>(null);
  const clickCount = yield* Ref.make(0);

  for (const click of userClicks) {
    const prev = yield* Ref.get(lastClick);

    if (click !== prev) {
      yield* Effect.log(`[CLICK] Processing: ${click}`);
      yield* Ref.update(clickCount, (c) => c + 1);
      yield* Ref.set(lastClick, click);
    } else {
      yield* Effect.log(`[CLICK] Duplicate: ${click} (skipped)`);
    }
  }

  const processed = yield* Ref.get(clickCount);

  yield* Effect.log(
    `\n[DEDUPE] ${userClicks.length} clicks → ${processed} processed\n`
  );

  // Example 4: Exponential backoff on repeated errors
  console.log(`[4] Throttled retry on errors:\n`);

  let retryCount = 0;

  const operation = Effect.gen(function* () {
    retryCount++;

    if (retryCount < 3) {
      yield* Effect.fail(new Error("Still failing"));
    }

    yield* Effect.log(`[SUCCESS] Succeeded on attempt ${retryCount}`);

    return "done";
  }).pipe(
    Effect.retry(
      Schedule.exponential("100 millis").pipe(
        Schedule.upTo("1 second"),
        Schedule.recurs(5)
      )
    )
  );

  yield* operation;
});

Effect.runPromise(program);
```

---

**Rationale:**

Debounce and throttle manage rapid events:

- **Debounce**: Wait for silence (delay after last event), then execute once
- **Throttle**: Execute at most once per interval
- **Deduplication**: Skip duplicate events
- **Rate limiting**: Limit events per second

Pattern: `Schedule.debounce(duration)` or `Schedule.throttle(maxEvents, duration)`

---


Rapid events without debounce/throttle cause problems:

**Debounce example**: Search input
- User types "hello" character by character
- Without debounce: 5 API calls (one per character)
- With debounce: 1 API call after user stops typing

**Throttle example**: Scroll events
- Scroll fires 100+ times per second
- Without throttle: Updates lag, GC pressure
- With throttle: Update max 60 times per second

Real-world issues:
- **API overload**: Search queries hammer backend
- **Rendering lag**: Too many DOM updates
- **Resource exhaustion**: Event handlers never catch up

Debounce/throttle enable:
- **Efficiency**: Fewer operations
- **Responsiveness**: UI stays smooth
- **Resource safety**: Prevent exhaustion
- **Sanity**: Predictable execution

---

---

### Scheduling Pattern 3: Schedule Tasks with Cron Expressions

**Rule:** Use cron expressions to schedule periodic tasks at specific calendar times, enabling flexible scheduling beyond simple fixed intervals.

**Good Example:**

This example demonstrates scheduling a daily report generation using cron, with timezone support.

```typescript
import { Effect, Schedule, Console } from "effect";
import { DateTime } from "luxon"; // For timezone handling

interface ReportConfig {
  readonly cronExpression: string;
  readonly timezone?: string;
  readonly jobName: string;
}

interface ScheduledReport {
  readonly timestamp: Date;
  readonly jobName: string;
  readonly result: string;
}

// Simple cron parser (in production, use a library like cron-parser)
const parseCronExpression = (
  expression: string
): {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
} => {
  const parts = expression.split(" ");

  const parseField = (field: string, max: number): number[] => {
    if (field === "*") {
      return Array.from({ length: max + 1 }, (_, i) => i);
    }

    if (field.includes(",")) {
      return field.split(",").flatMap((part) => parseField(part, max));
    }

    if (field.includes("-")) {
      const [start, end] = field.split("-").map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    return [Number(field)];
  };

  return {
    minute: parseField(parts[0], 59),
    hour: parseField(parts[1], 23),
    dayOfMonth: parseField(parts[2], 31),
    month: parseField(parts[3], 12),
    dayOfWeek: parseField(parts[4], 6),
  };
};

// Check if current time matches cron expression
const shouldRunNow = (parsed: ReturnType<typeof parseCronExpression>): boolean => {
  const now = new Date();

  return (
    parsed.minute.includes(now.getUTCMinutes()) &&
    parsed.hour.includes(now.getUTCHours()) &&
    parsed.dayOfMonth.includes(now.getUTCDate()) &&
    parsed.month.includes(now.getUTCMonth() + 1) &&
    parsed.dayOfWeek.includes(now.getUTCDay())
  );
};

// Generate a report
const generateReport = (jobName: string): Effect.Effect<ScheduledReport> =>
  Effect.gen(function* () {
    yield* Console.log(`[REPORT] Generating ${jobName}...`);

    // Simulate report generation
    yield* Effect.sleep("100 millis");

    return {
      timestamp: new Date(),
      jobName,
      result: `Report generated at ${new Date().toISOString()}`,
    };
  });

// Schedule with cron expression
const scheduleWithCron = (config: ReportConfig) =>
  Effect.gen(function* () {
    const parsed = parseCronExpression(config.cronExpression);

    yield* Console.log(
      `[SCHEDULER] Scheduling job: ${config.jobName}`
    );
    yield* Console.log(`[SCHEDULER] Cron: ${config.cronExpression}`);
    yield* Console.log(`[SCHEDULER] Timezone: ${config.timezone || "UTC"}\n`);

    // Create schedule that checks every minute
    const schedule = Schedule.fixed("1 minute").pipe(
      Schedule.untilInputEffect((report: ScheduledReport) =>
        Effect.gen(function* () {
          const isPastTime = shouldRunNow(parsed);

          if (isPastTime) {
            yield* Console.log(
              `[SCHEDULED] ✓ Running at ${report.timestamp.toISOString()}`
            );
            return true; // Stop scheduling
          }

          return false; // Continue scheduling
        })
      )
    );

    // Generate report with cron schedule
    yield* generateReport(config.jobName).pipe(
      Effect.repeat(schedule)
    );
  });

// Demonstrate multiple cron schedules
const program = Effect.gen(function* () {
  console.log(
    `\n[START] Scheduling multiple jobs with cron expressions\n`
  );

  // Schedule examples (note: in real app, these would run at actual times)
  const jobs = [
    {
      cronExpression: "0 9 * * 1-5", // 9 AM weekdays
      jobName: "Daily Standup Report",
      timezone: "America/New_York",
    },
    {
      cronExpression: "0 0 * * *", // Midnight daily
      jobName: "Nightly Backup",
      timezone: "UTC",
    },
    {
      cronExpression: "0 0 1 * *", // Midnight on 1st of month
      jobName: "Monthly Summary",
      timezone: "Europe/London",
    },
  ];

  yield* Console.log("[JOBS] Scheduled:");
  jobs.forEach((job) => {
    console.log(
      `  - ${job.jobName}: ${job.cronExpression} (${job.timezone})`
    );
  });
});

Effect.runPromise(program);
```

---

**Rationale:**

Use cron expressions for scheduling that aligns with business calendars:

- **Hourly backups**: `0 * * * *` (at :00 every hour)
- **Daily reports**: `0 9 * * 1-5` (9 AM weekdays)
- **Monthly cleanup**: `0 0 1 * *` (midnight on 1st of month)
- **Business hours**: `0 9-17 * * 1-5` (9 AM-5 PM, Mon-Fri)

Format: `minute hour day month weekday`

---


Fixed intervals don't align with business needs:

**Fixed interval** (every 24 hours):
- If task takes 2 hours, next run is 26 hours later
- Drifts over time
- No alignment with calendar
- Fails during daylight saving time changes

**Cron expressions**:
- Specific calendar times (e.g., always 9 AM)
- Independent of execution duration
- Aligns with business hours
- Natural DST handling (clock adjusts, cron resyncs)
- Human-readable vs. milliseconds

Real-world example: Daily report at 9 AM
- **Fixed interval**: Scheduled at 9:00, takes 1 hour → next at 10:00 → drift until 5 PM
- **Cron `0 9 * * *`**: Always runs at 9:00 regardless of duration or previous delays

---

---


## 🟠 Advanced Patterns

### Scheduling Pattern 5: Advanced Retry Chains and Circuit Breakers

**Rule:** Use retry chains with circuit breakers to handle complex failure scenarios, detect cascade failures early, and prevent resource exhaustion.

**Good Example:**

This example demonstrates circuit breaker and fallback chain patterns.

```typescript
import { Effect, Schedule, Ref, Data } from "effect";

// Error classification
class RetryableError extends Data.TaggedError("RetryableError")<{
  message: string;
  code: string;
}> {}

class NonRetryableError extends Data.TaggedError("NonRetryableError")<{
  message: string;
  code: string;
}> {}

class CircuitBreakerOpenError extends Data.TaggedError("CircuitBreakerOpenError")<{
  message: string;
}> {}

// Circuit breaker state
interface CircuitBreakerState {
  status: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime: Date | null;
  successCount: number;
}

// Create circuit breaker
const createCircuitBreaker = (config: {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}) =>
  Effect.gen(function* () {
    const state = yield* Ref.make<CircuitBreakerState>({
      status: "closed",
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
    });

    const recordSuccess = Effect.gen(function* () {
      yield* Ref.modify(state, (s) => {
        if (s.status === "half-open") {
          return [
            undefined,
            {
              ...s,
              successCount: s.successCount + 1,
              status: s.successCount + 1 >= config.halfOpenRequests
                ? "closed"
                : "half-open",
              failureCount: 0,
            },
          ];
        }
        return [undefined, s];
      });
    });

    const recordFailure = Effect.gen(function* () {
      yield* Ref.modify(state, (s) => {
        const newFailureCount = s.failureCount + 1;
        const newStatus = newFailureCount >= config.failureThreshold
          ? "open"
          : s.status;

        return [
          undefined,
          {
            ...s,
            failureCount: newFailureCount,
            lastFailureTime: new Date(),
            status: newStatus,
          },
        ];
      });
    });

    const canExecute = Effect.gen(function* () {
      const current = yield* Ref.get(state);

      if (current.status === "closed") {
        return true;
      }

      if (current.status === "open") {
        const timeSinceFailure = Date.now() - (current.lastFailureTime?.getTime() ?? 0);

        if (timeSinceFailure > config.resetTimeoutMs) {
          yield* Ref.modify(state, (s) => [
            undefined,
            {
              ...s,
              status: "half-open",
              failureCount: 0,
              successCount: 0,
            },
          ]);
          return true;
        }

        return false;
      }

      // half-open: allow limited requests
      return true;
    });

    return { recordSuccess, recordFailure, canExecute, state };
  });

// Main example
const program = Effect.gen(function* () {
  console.log(`\n[ADVANCED RETRY] Circuit breaker and fallback chains\n`);

  // Create circuit breaker
  const cb = yield* createCircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 1000,
    halfOpenRequests: 2,
  });

  // Example 1: Circuit breaker in action
  console.log(`[1] Circuit breaker state transitions:\n`);

  let requestCount = 0;

  const callWithCircuitBreaker = (shouldFail: boolean) =>
    Effect.gen(function* () {
      const canExecute = yield* cb.canExecute;

      if (!canExecute) {
        yield* Effect.fail(
          new CircuitBreakerOpenError({
            message: "Circuit breaker is open",
          })
        );
      }

      requestCount++;

      if (shouldFail) {
        yield* cb.recordFailure;
        yield* Effect.log(
          `[REQUEST ${requestCount}] FAILED (Circuit: ${(yield* Ref.get(cb.state)).status})`
        );
        yield* Effect.fail(
          new RetryableError({
            message: "Service error",
            code: "500",
          })
        );
      } else {
        yield* cb.recordSuccess;
        yield* Effect.log(
          `[REQUEST ${requestCount}] SUCCESS (Circuit: ${(yield* Ref.get(cb.state)).status})`
        );
        return "success";
      }
    });

  // Simulate failures then recovery
  const failSequence = [true, true, true, false, false, false];

  for (const shouldFail of failSequence) {
    yield* callWithCircuitBreaker(shouldFail).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          if (error._tag === "CircuitBreakerOpenError") {
            yield* Effect.log(
              `[REQUEST ${requestCount + 1}] REJECTED (Circuit open)`
            );
          } else {
            yield* Effect.log(
              `[REQUEST ${requestCount + 1}] ERROR caught`
            );
          }
        })
      )
    );

    // Add delay between requests
    yield* Effect.sleep("100 millis");
  }

  // Example 2: Fallback chain
  console.log(`\n[2] Fallback chain (primary → secondary → cache):\n`);

  const endpoints = {
    primary: "https://api.primary.com/data",
    secondary: "https://api.secondary.com/data",
    cache: "cached-data",
  };

  const callEndpoint = (name: string, shouldFail: boolean) =>
    Effect.gen(function* () {
      yield* Effect.log(`[CALL] Trying ${name}`);

      if (shouldFail) {
        yield* Effect.sleep("50 millis");
        yield* Effect.fail(
          new RetryableError({
            message: `${name} failed`,
            code: "500",
          })
        );
      }

      yield* Effect.sleep("50 millis");
      return `data-from-${name}`;
    });

  const fallbackChain = callEndpoint("primary", true).pipe(
    Effect.orElse(() => callEndpoint("secondary", false)),
    Effect.orElse(() => {
      yield* Effect.log(`[FALLBACK] Using cached data`);
      return Effect.succeed(endpoints.cache);
    })
  );

  const result = yield* fallbackChain;

  yield* Effect.log(`[RESULT] Got: ${result}\n`);

  // Example 3: Error-specific retry strategy
  console.log(`[3] Error classification and adaptive retry:\n`);

  const classifyError = (code: string) => {
    if (["502", "503", "504"].includes(code)) {
      return "retryable-service-error";
    }
    if (["408", "429"].includes(code)) {
      return "retryable-rate-limit";
    }
    if (["404", "401", "403"].includes(code)) {
      return "non-retryable";
    }
    if (code === "timeout") {
      return "retryable-network";
    }
    return "unknown";
  };

  const errorCodes = ["500", "404", "429", "503", "timeout"];

  for (const code of errorCodes) {
    const classification = classifyError(code);
    const shouldRetry = !classification.startsWith("non-retryable");

    yield* Effect.log(
      `[ERROR ${code}] → ${classification} (Retry: ${shouldRetry})`
    );
  }

  // Example 4: Bulkhead pattern
  console.log(`\n[4] Bulkhead isolation (limit concurrency per endpoint):\n`);

  const bulkheads = {
    "primary-api": { maxConcurrent: 5, currentCount: 0 },
    "secondary-api": { maxConcurrent: 3, currentCount: 0 },
  };

  const acquirePermit = (endpoint: string) =>
    Effect.gen(function* () {
      const bulkhead = bulkheads[endpoint as keyof typeof bulkheads];

      if (!bulkhead) {
        return false;
      }

      if (bulkhead.currentCount < bulkhead.maxConcurrent) {
        bulkhead.currentCount++;
        return true;
      }

      yield* Effect.log(
        `[BULKHEAD] ${endpoint} at capacity (${bulkhead.currentCount}/${bulkhead.maxConcurrent})`
      );

      return false;
    });

  // Simulate requests
  for (let i = 0; i < 10; i++) {
    const endpoint = i < 6 ? "primary-api" : "secondary-api";
    const acquired = yield* acquirePermit(endpoint);

    if (acquired) {
      yield* Effect.log(
        `[REQUEST] Acquired permit for ${endpoint}`
      );
    }
  }
});

Effect.runPromise(program);
```

---

**Rationale:**

Advanced retry strategies handle multiple failure types:

- **Circuit breaker**: Stop retrying when error rate is high
- **Bulkhead**: Limit concurrency per operation
- **Fallback chain**: Try multiple approaches in order
- **Adaptive retry**: Adjust strategy based on failure pattern
- **Health checks**: Verify recovery before resuming

Pattern: Combine `Schedule.retry`, `Ref` state, and error classification

---


Simple retry fails in production:

**Scenario 1: Cascade Failure**
- Service A calls Service B (down)
- Retries pile up, consuming resources
- A gets overloaded trying to recover B
- System collapses

**Scenario 2: Mixed Failures**
- 404 (not found) - retrying won't help
- 500 (server error) - retrying might help
- Network timeout - retrying might help
- Same retry strategy for all = inefficient

**Scenario 3: Thundering Herd**
- 10,000 clients all retrying at once
- Server recovers, gets hammered again
- Needs coordinated backoff + jitter

Solutions:

**Circuit breaker**:
- Monitor error rate
- Stop requests when high
- Resume gradually
- Prevent cascade failures

**Fallback chain**:
- Try primary endpoint
- Try secondary endpoint
- Use cache
- Return degraded result

**Adaptive retry**:
- Classify error type
- Use appropriate strategy
- Skip unretryable errors
- Adjust backoff dynamically

---

---


