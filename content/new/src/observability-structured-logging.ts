import { Effect } from "effect";

// Log a simple message
const program = Effect.log("Starting the application");

// Log at different levels
const info = Effect.logInfo("User signed in");
const error = Effect.logError("Failed to connect to database");

// Log with dynamic values
const userId = 42;
const logUser = Effect.logInfo(`Processing user: ${userId}`);

// Use logging in a workflow
const workflow = Effect.gen(function* () {
  yield* Effect.log("Beginning workflow");
  // ... do some work
  yield* Effect.logInfo("Workflow step completed");
  // ... handle errors
  yield* Effect.logError("Something went wrong");
});