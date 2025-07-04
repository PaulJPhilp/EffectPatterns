## Accessing the Current Time with Clock
**Rule:** Use the Clock service to get the current time, enabling deterministic testing with TestClock.

### Example
This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Layer } from "effect";
import { TestClock } from "effect/TestClock";
import { describe, it, expect } from "vitest";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (token: Token): Effect.Effect<boolean, never, Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
  );

// --- Testing the function ---
describe("isTokenExpired", () => {
  const token = { value: "abc", expiresAt: 1000 };

  it("should return false when the clock is before the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(false);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));

  it("should return true when the clock is after the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(1500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(true);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));
});
```

---

## Representing Time Spans with Duration
**Rule:** Use the Duration data type to represent time intervals instead of raw numbers.

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
  Effect.timeout(fiveSeconds), // This whole operation must complete within 5 seconds
);

// Durations can also be compared
const isLonger = Duration.greaterThan(fiveSeconds, oneHundredMillis); // true
```

---

## Beyond the Date Type - Real World Dates, Times, and Timezones
**Rule:** Use the Clock service for testable time-based logic and immutable primitives for timestamps.

### Example
This example shows a function that creates a timestamped event. It depends on the `Clock` service, making it fully testable.

```typescript
import { Effect, Clock, Layer } from "effect";
import { TestClock } from "effect/TestClock";
import { describe, it, expect } from "vitest";

interface Event {
  readonly message: string;
  readonly timestamp: number; // Store as a primitive number (UTC millis)
}

// This function is pure and testable because it depends on Clock
const createEvent = (message: string): Effect.Effect<Event, never, Clock> =>
  Effect.gen(function* () {
    const timestamp = yield* Clock.currentTimeMillis;
    return { message, timestamp };
  });

// --- Testing the function ---
describe("createEvent", () => {
  it("should use the time from the TestClock", () =>
    Effect.gen(function* () {
      // Manually set the virtual time
      yield* TestClock.setTime(1672531200000); // Jan 1, 2023 UTC
      const event = yield* createEvent("User logged in");

      // The timestamp is predictable and testable
      expect(event.timestamp).toBe(1672531200000);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));
});
```

---