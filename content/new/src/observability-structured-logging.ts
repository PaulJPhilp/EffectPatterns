import { Effect } from "effect";

// Log a simple message
const program = Effect.gen(function* () {
  yield* Effect.log("Starting the application");
});

// Log at different levels
const infoProgram = Effect.gen(function* () {
  yield* Effect.logInfo("User signed in");
});

const errorProgram = Effect.gen(function* () {
  yield* Effect.logError("Failed to connect to database");
});

// Log with dynamic values
const userId = 42;
const logUserProgram = Effect.gen(function* () {
  yield* Effect.logInfo(`Processing user: ${userId}`);
});

// Use logging in a workflow
const workflow = Effect.gen(function* () {
  yield* Effect.log("Beginning workflow");
  // ... do some work
  yield* Effect.logInfo("Workflow step completed");
  // ... handle errors
  yield* Effect.logError("Something went wrong");
});