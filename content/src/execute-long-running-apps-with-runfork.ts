import { Effect, Fiber } from "effect";

// A server that listens for requests forever
const server = Effect.log("Server received a request.").pipe(
  Effect.delay("1 second"),
  Effect.forever,
);

console.log("Starting server...");

// Launch the server as a detached, top-level fiber
const appFiber = Effect.runFork(server);

// In a real app, you would listen for OS signals.
// Here, we simulate a shutdown signal after 5 seconds.
setTimeout(() => {
  console.log("Shutdown signal received. Interrupting server fiber...");
  // This ensures all cleanup logic within the server effect would run.
  Effect.runPromise(Fiber.interrupt(appFiber));
}, 5000);