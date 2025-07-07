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
