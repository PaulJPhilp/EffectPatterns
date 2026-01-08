---
name: effect-patterns-scheduling
description: Effect-TS patterns for Scheduling. Use when working with scheduling in Effect-TS applications.
---
# Effect-TS Patterns: Scheduling
This skill provides 3 curated Effect-TS patterns for scheduling.
Use this skill when working on tasks related to:
- scheduling
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Retry Failed Operations

**Rule:** Use Effect.retry with a Schedule to handle transient failures gracefully.

**Good Example:**

```typescript
import { Effect, Schedule, Data } from "effect"

// ============================================
// 1. Define error types
// ============================================

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string
}> {}

class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly retryAfter: number
}> {}

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string
}> {}

// ============================================
// 2. Simulate a flaky API call
// ============================================

let callCount = 0
const fetchData = Effect.gen(function* () {
  callCount++
  yield* Effect.log(`API call attempt ${callCount}`)

  // Simulate intermittent failures
  if (callCount < 3) {
    return yield* Effect.fail(new NetworkError({ message: "Connection timeout" }))
  }

  return { data: "Success!", attempts: callCount }
})

// ============================================
// 3. Basic retry - fixed attempts
// ============================================

const withBasicRetry = fetchData.pipe(
  Effect.retry(Schedule.recurs(5))  // Retry up to 5 times
)

// ============================================
// 4. Retry with delay
// ============================================

const withDelayedRetry = fetchData.pipe(
  Effect.retry(
    Schedule.spaced("500 millis").pipe(
      Schedule.intersect(Schedule.recurs(5))
    )
  )
)

// ============================================
// 5. Retry only specific errors
// ============================================

const fetchWithErrors = (shouldFail: boolean) =>
  Effect.gen(function* () {
    if (shouldFail) {
      // Randomly fail with different errors
      const random = Math.random()
      if (random < 0.5) {
        return yield* Effect.fail(new NetworkError({ message: "Timeout" }))
      } else if (random < 0.8) {
        return yield* Effect.fail(new RateLimitError({ retryAfter: 1000 }))
      } else {
        return yield* Effect.fail(new NotFoundError({ resource: "user:123" }))
      }
    }
    return "Data fetched!"
  })

// Only retry network and rate limit errors, not NotFoundError
const retryTransientOnly = fetchWithErrors(true).pipe(
  Effect.retry({
    schedule: Schedule.recurs(3),
    while: (error) =>
      error._tag === "NetworkError" || error._tag === "RateLimitError",
  })
)

// ============================================
// 6. Retry with exponential backoff
// ============================================

const withExponentialBackoff = fetchData.pipe(
  Effect.retry(
    Schedule.exponential("100 millis", 2).pipe(  // 100ms, 200ms, 400ms...
      Schedule.intersect(Schedule.recurs(5))      // Max 5 retries
    )
  )
)

// ============================================
// 7. Run and observe
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("Starting retry demo...")
  
  // Reset counter
  callCount = 0
  
  const result = yield* withBasicRetry
  yield* Effect.log(`Final result: ${JSON.stringify(result)}`)
})

Effect.runPromise(program)
```

**Rationale:**

Use `Effect.retry` to automatically retry operations that fail due to transient errors like network timeouts.

---


Many failures are temporary:

1. **Network issues** - Connection drops, timeouts
2. **Rate limits** - Too many requests
3. **Resource contention** - Database locks
4. **Service restarts** - Brief unavailability

Automatic retries handle these without manual intervention.

---

---

### Your First Schedule

**Rule:** Use Schedule to control when and how often effects run.

**Good Example:**

```typescript
import { Effect, Schedule } from "effect"

// ============================================
// 1. Retry a failing operation
// ============================================

let attempts = 0
const flakyOperation = Effect.gen(function* () {
  attempts++
  if (attempts < 3) {
    yield* Effect.log(`Attempt ${attempts} failed`)
    return yield* Effect.fail(new Error("Temporary failure"))
  }
  return `Success on attempt ${attempts}`
})

// Retry up to 5 times
const withRetry = flakyOperation.pipe(
  Effect.retry(Schedule.recurs(5))
)

// ============================================
// 2. Repeat a successful operation
// ============================================

const logTime = Effect.gen(function* () {
  const now = new Date().toISOString()
  yield* Effect.log(`Current time: ${now}`)
  return now
})

// Repeat 3 times
const repeated = logTime.pipe(
  Effect.repeat(Schedule.recurs(3))
)

// ============================================
// 3. Add delays between operations
// ============================================

// Repeat every second, 5 times
const polling = logTime.pipe(
  Effect.repeat(
    Schedule.spaced("1 second").pipe(
      Schedule.intersect(Schedule.recurs(5))
    )
  )
)

// ============================================
// 4. Common schedule patterns
// ============================================

// Fixed delay between attempts
const fixedDelay = Schedule.spaced("500 millis")

// Increasing delay (1s, 2s, 4s, 8s...)
const exponentialBackoff = Schedule.exponential("1 second")

// Maximum number of attempts
const limitedAttempts = Schedule.recurs(3)

// Combine: exponential backoff, max 5 attempts
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.intersect(Schedule.recurs(5))
)

// ============================================
// 5. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("--- Retry Example ---")
  const result = yield* withRetry
  yield* Effect.log(`Result: ${result}`)

  yield* Effect.log("\n--- Repeat Example ---")
  yield* repeated
})

Effect.runPromise(program)
```

**Rationale:**

Use `Schedule` to control timing in Effect programs - retrying failed operations, repeating successful ones, or adding delays.

---


Schedules solve common timing problems:

1. **Retries** - Try again after failures
2. **Polling** - Check for updates periodically
3. **Rate limiting** - Control how fast things run
4. **Backoff** - Increase delays between attempts

---

---


## 🟡 Intermediate Patterns

### Scheduling Pattern 1: Repeat an Effect on a Fixed Interval

**Rule:** Repeat effects at fixed intervals using Schedule.fixed for steady-state operations and background tasks.

**Good Example:**

This example demonstrates a health check service that polls multiple service endpoints every 30 seconds and reports their status.

```typescript
import { Effect, Schedule, Duration } from "effect";

interface ServiceStatus {
  readonly service: string;
  readonly url: string;
  readonly isHealthy: boolean;
  readonly responseTime: number;
  readonly lastChecked: number;
}

// Mock health check that calls an endpoint
const checkServiceHealth = (
  url: string,
  service: string
): Effect.Effect<ServiceStatus> =>
  Effect.gen(function* () {
    const startTime = Date.now();

    // Simulate HTTP call with occasional failures
    const isHealthy = Math.random() > 0.1; // 90% success rate
    const responseTime = Math.random() * 500; // 0-500ms

    yield* Effect.sleep(Duration.millis(Math.round(responseTime)));

    if (!isHealthy) {
      yield* Effect.fail(new Error(`${service} is unhealthy`));
    }

    return {
      service,
      url,
      isHealthy: true,
      responseTime: Math.round(Date.now() - startTime),
      lastChecked: Date.now(),
    };
  });

// Health check for multiple services
interface HealthCheckConfig {
  readonly services: Array<{
    readonly name: string;
    readonly url: string;
  }>;
  readonly intervalSeconds: number;
}

// Keep track of service status
const serviceStatuses = new Map<string, ServiceStatus>();

// Check all services and report status
const checkAllServices = (
  config: HealthCheckConfig
): Effect.Effect<void> =>
  Effect.gen(function* () {
    for (const service of config.services) {
      const status = yield* checkServiceHealth(service.url, service.name).pipe(
        Effect.either
      );

      if (status._tag === "Right") {
        serviceStatuses.set(service.name, status.right);
        console.log(
          `✓ ${service.name}: OK (${status.right.responseTime}ms)`
        );
      } else {
        console.log(`✗ ${service.name}: FAILED`);
        // Keep last known status if available
      }
    }
  });

// Create the repeating health check
const createHealthCheckScheduler = (
  config: HealthCheckConfig
): Effect.Effect<void> =>
  checkAllServices(config).pipe(
    // Schedule with fixed interval (fixed = ignore execution time)
    Effect.repeat(
      Schedule.fixed(Duration.seconds(config.intervalSeconds))
    )
  );

// Report current status
const reportStatus = (): Effect.Effect<void> =>
  Effect.sync(() => {
    if (serviceStatuses.size === 0) {
      console.log("\n[STATUS] No services checked yet");
      return;
    }

    console.log("\n[STATUS REPORT]");
    for (const [service, status] of serviceStatuses) {
      const ago = Math.round((Date.now() - status.lastChecked) / 1000);
      console.log(
        `  ${service}: ${status.isHealthy ? "✓" : "✗"} (checked ${ago}s ago)`
      );
    }
  });

// Run health checker in background and check status periodically
const program = Effect.gen(function* () {
  const config: HealthCheckConfig = {
    services: [
      { name: "API", url: "https://api.example.com/health" },
      { name: "Database", url: "https://db.example.com/health" },
      { name: "Cache", url: "https://cache.example.com/health" },
    ],
    intervalSeconds: 5, // Check every 5 seconds
  };

  // Fork the health checker to run in background
  const checker = yield* createHealthCheckScheduler(config).pipe(
    Effect.fork
  );

  // Check and report status every 15 seconds for 60 seconds
  yield* reportStatus().pipe(
    Effect.repeat(
      Schedule.addDelay(
        Schedule.recurs(3), // 3 repetitions = 4 total (initial + 3)
        () => Duration.seconds(15)
      )
    )
  );

  // Interrupt the background checker
  yield* checker.interrupt();
});

Effect.runPromise(program);
```

This pattern:

1. **Defines service health checks** that may fail
2. **Uses Schedule.fixed** to repeat every 5 seconds
3. **Handles failures gracefully** (keeps last known status)
4. **Runs in background** while main logic continues
5. **Reports current status** at intervals

---

**Rationale:**

When you need to run an effect repeatedly at regular intervals (e.g., every 5 seconds, every 30 minutes), use `Schedule.fixed` to specify the interval. This creates a schedule that repeats the effect indefinitely or until a condition stops it, with precise timing between executions.

---


Many production systems need periodic operations:

- **Health checks**: Poll service availability every 30 seconds
- **Cache refresh**: Update cache every 5 minutes
- **Metrics collection**: Gather system metrics every 10 seconds
- **Data sync**: Sync data with remote service periodically
- **Cleanup tasks**: Remove stale data nightly

Without proper scheduling:

- Manual polling with `while` loops wastes CPU (busy-waiting)
- Thread.sleep blocks threads, preventing other work
- No automatic restart on failure
- Difficult to test deterministically

With `Schedule.fixed`:

- Efficient, non-blocking repetition
- Automatic failure handling and retry
- Testable with TestClock
- Clean, declarative syntax

---

---


