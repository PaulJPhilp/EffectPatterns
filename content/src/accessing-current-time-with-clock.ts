import { Effect, Clock, Duration } from "effect";
import { describe, it, expect } from "vitest";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (token: Token): Effect.Effect<boolean, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt)
  );

// Create a test clock service
const makeTestClock = (timeMs: number): Clock.Clock => ({
  currentTimeMillis: Effect.succeed(timeMs),
  currentTimeNanos: Effect.succeed(BigInt(timeMs * 1_000_000)),
  sleep: (duration: Duration.Duration) => Effect.succeed(void 0),
  unsafeCurrentTimeMillis: () => timeMs,
  unsafeCurrentTimeNanos: () => BigInt(timeMs * 1_000_000),
  [Clock.ClockTypeId]: Clock.ClockTypeId,
});

// --- Testing the function ---
describe("isTokenExpired", () => {
  const token = { value: "abc", expiresAt: 1000 };

  it("should return false when the clock is before the expiry time", async () => {
    const testClock = makeTestClock(500);
    
    const program = Effect.gen(function* () {
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(false);
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provideService(Clock.Clock, testClock)
      )
    );
  });

  it("should return true when the clock is after the expiry time", async () => {
    const testClock = makeTestClock(1500);

    const program = Effect.gen(function* () {
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(true);
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provideService(Clock.Clock, testClock)
      )
    );
  });
});