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