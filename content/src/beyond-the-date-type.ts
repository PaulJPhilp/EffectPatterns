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
  console.log("Login event:", loginEvent);

  const logoutEvent = yield* createEvent("User logged out");
  console.log("Logout event:", logoutEvent);
});

// Run the program
Effect.runPromise(program.pipe(Effect.provideService(Clock.Clock, Clock.make()))).catch(console.error);