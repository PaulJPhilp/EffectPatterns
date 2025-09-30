# Modeling Time Patterns

## Accessing the Current Time with Clock

Use the Clock service to get the current time, enabling deterministic testing with TestClock.

### Example

This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Duration } from "effect";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (token: Token): Effect.Effect<boolean, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
    Effect.tap((expired) => 
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((currentTime) => 
          Effect.log(`Token expired? ${expired} (current time: ${new Date(currentTime).toISOString()})`)
        )
      )
    )
  );

// Create a test clock service that advances time
const makeTestClock = (timeMs: number): Clock.Clock => ({
  currentTimeMillis: Effect.succeed(timeMs),
  currentTimeNanos: Effect.succeed(BigInt(timeMs * 1_000_000)),
  sleep: (duration: Duration.Duration) => Effect.succeed(void 0),
  unsafeCurrentTimeMillis: () => timeMs,
  unsafeCurrentTimeNanos: () => BigInt(timeMs * 1_000_000),
  [Clock.ClockTypeId]: Clock.ClockTypeId,
});

// Create a token that expires in 1 second
const token = { value: "abc", expiresAt: Date.now() + 1000 };

// Check token expiry with different clocks
const program = Effect.gen(function* () {
  // Check with current time
  yield* Effect.log("Checking with current time...");
  yield* isTokenExpired(token);

  // Check with past time
  yield* Effect.log("\nChecking with past time (1 minute ago)...");
  const pastClock = makeTestClock(Date.now() - 60_000);
  yield* isTokenExpired(token).pipe(
    Effect.provideService(Clock.Clock, pastClock)
  );

  // Check with future time
  yield* Effect.log("\nChecking with future time (1 hour ahead)...");
  const futureClock = makeTestClock(Date.now() + 3600_000);
  yield* isTokenExpired(token).pipe(
    Effect.provideService(Clock.Clock, futureClock)
  );
});

// Run the program with default clock
Effect.runPromise(
  program.pipe(
    Effect.provideService(Clock.Clock, makeTestClock(Date.now()))
  )
);
```

---

---

## Beyond the Date Type - Real World Dates, Times, and Timezones

Use the Clock service for testable time-based logic and immutable primitives for timestamps.

### Example

This example shows a function that creates a timestamped event. It depends on the `Clock` service, making it fully testable.

```typescript
import { Effect, Clock } from "effect";
import type * as Types from "effect/Clock";

interface Event {
  readonly message: string;
  readonly timestamp: number; // Store as a primitive number (UTC millis)
}

// This function is pure and testable because it depends on Clock
const createEvent = (message: string): Effect.Effect<Event, never, Types.Clock> =>
  Effect.gen(function* () {
    const timestamp = yield* Clock.currentTimeMillis;
    return { message, timestamp };
  });

// Create and log some events
const program = Effect.gen(function* () {
  const loginEvent = yield* createEvent("User logged in");
  yield* Effect.log("Login event:", loginEvent);

  const logoutEvent = yield* createEvent("User logged out");
  yield* Effect.log("Logout event:", logoutEvent);
});

// Run the program
const programWithErrorHandling = program.pipe(
  Effect.provideService(Clock.Clock, Clock.make()),
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithErrorHandling);
```

---

---

## Representing Time Spans with Duration

Use the Duration data type to represent time intervals instead of raw numbers.

### Example

This example shows how to create and use `Duration` to make time-based operations clear and unambiguous.

```typescript
import { Effect, Duration } from "effect";

// Create durations with clear, explicit units
const fiveSeconds = Duration.seconds(5);
const oneHundredMillis = Duration.millis(100);

// Use them in Effect operators
const program = Effect.log("Starting...").pipe(
  Effect.delay(oneHundredMillis),
  Effect.flatMap(() => Effect.log("Running after 100ms")),
  Effect.timeout(fiveSeconds) // This whole operation must complete within 5 seconds
);

// Durations can also be compared
const isLonger = Duration.greaterThan(fiveSeconds, oneHundredMillis); // true

// Demonstrate the duration functionality
const demonstration = Effect.gen(function* () {
  yield* Effect.logInfo("=== Duration Demonstration ===");

  // Show duration values
  yield* Effect.logInfo(`Five seconds: ${Duration.toMillis(fiveSeconds)}ms`);
  yield* Effect.logInfo(
    `One hundred millis: ${Duration.toMillis(oneHundredMillis)}ms`
  );

  // Show comparison
  yield* Effect.logInfo(`Is 5 seconds longer than 100ms? ${isLonger}`);

  // Run the timed program
  yield* Effect.logInfo("Running timed program...");
  yield* program;

  // Show more duration operations
  const combined = Duration.sum(fiveSeconds, oneHundredMillis);
  yield* Effect.logInfo(`Combined duration: ${Duration.toMillis(combined)}ms`);

  // Show different duration units
  const oneMinute = Duration.minutes(1);
  yield* Effect.logInfo(`One minute: ${Duration.toMillis(oneMinute)}ms`);

  const isMinuteLonger = Duration.greaterThan(oneMinute, fiveSeconds);
  yield* Effect.logInfo(`Is 1 minute longer than 5 seconds? ${isMinuteLonger}`);
});

Effect.runPromise(demonstration);

```

---

---

