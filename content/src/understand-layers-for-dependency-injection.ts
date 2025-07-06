import { Effect } from "effect";

// Define the Logger service with a default implementation
export class Logger extends Effect.Service<Logger>()(
  "Logger",
  {
    // Provide a synchronous implementation
    sync: () => ({
      log: (msg: string) => Effect.sync(() => console.log(`LOG: ${msg}`))
    })
  }
) {}

// Define the Notifier service that depends on Logger
export class Notifier extends Effect.Service<Notifier>()(
  "Notifier",
  {
    // Provide an implementation that requires Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        notify: (msg: string) => logger.log(`Notifying: ${msg}`)
      };
    }),
    // Specify dependencies
    dependencies: [Logger.Default]
  }
) {}

// Create a program that uses both services
const program = Effect.gen(function* () {
  const notifier = yield* Notifier;
  yield* notifier.notify("Hello, World!");
});

// Run the program with the default implementations
Effect.runPromise(
  Effect.provide(
    program,
    Notifier.Default
  )
);