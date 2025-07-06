import { Effect, Fiber } from "effect";

// A long-running effect that logs a message every second, forever
const tickingClock = Effect.log("tick").pipe(
  Effect.delay("1 second"),
  Effect.forever,
);

const program = Effect.gen(function* () {
  yield* Effect.log("Forking the ticking clock into the background.");
  // Start the clock, but don't wait for it.
  const clockFiber = yield* Effect.fork(tickingClock);

  yield* Effect.log("Main process is now doing other work for 5 seconds...");
  yield* Effect.sleep("5 seconds");

  yield* Effect.log("Main process is done. Interrupting the clock fiber.");
  // Stop the background process.
  yield* Fiber.interrupt(clockFiber);

  yield* Effect.log("Program finished.");
});

Effect.runPromise(program);